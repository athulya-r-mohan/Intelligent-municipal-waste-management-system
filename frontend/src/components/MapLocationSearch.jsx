import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { Search, MapPin, X, Loader2, AlertCircle, AlertTriangle, WifiOff } from "lucide-react";
import "./MapLocationSearch.css";

// Bounded in-memory cache for search responses (max 50 normalized queries)
const SEARCH_CACHE_LIMIT = 50;
const searchCache = new Map();

// 14 Kerala Districts for canonical matching
const KERALA_DISTRICTS = new Set([
  "thiruvananthapuram",
  "kollam",
  "pathanamthitta",
  "alappuzha",
  "kottayam",
  "idukki",
  "ernakulam",
  "thrissur",
  "palakkad",
  "malappuram",
  "kozhikode",
  "wayanad",
  "kannur",
  "kasaragod",
]);

// Other Indian states to prevent border coordinate misclassification
const OTHER_INDIAN_STATES = new Set([
  "tamil nadu",
  "karnataka",
  "andhra pradesh",
  "telangana",
  "maharashtra",
  "goa",
  "odisha",
  "west bengal",
  "bihar",
  "uttar pradesh",
  "madhya pradesh",
  "gujarat",
  "rajasthan",
  "punjab",
  "haryana",
  "delhi",
  "jammu and kashmir",
  "himachal pradesh",
  "uttarakhand",
  "assam",
  "tripura",
  "meghalaya",
  "manipur",
  "nagaland",
  "mizoram",
  "arunachal pradesh",
  "sikkim",
  "jharkhand",
  "chhattisgarh",
  "chandigarh",
  "puducherry",
  "lakshadweep",
  "andaman and nicobar islands",
  "ladakh",
  "dadra and nagar haveli and daman and diu",
]);

/**
 * Computes geographic priority for location ranking:
 * Priority 0: Relevant to Ward/Zone within Kerala
 * Priority 1: Other Kerala, India locations
 * Priority 2: Other locations in India
 * Priority 3: Locations outside India
 *
 * Uses Nominatim address metadata as primary authority and coordinate bounds as a ranking hint.
 */
function getLocationPriority(item, contextStr = "") {
  const address = item?.address || {};
  const state = (address.state || "").toLowerCase().trim();
  const stateDistrict = (address.state_district || "").toLowerCase().trim();
  const county = (address.county || "").toLowerCase().trim();
  const countryCode = (address.country_code || "").toLowerCase().trim();
  const country = (address.country || "").toLowerCase().trim();
  const displayName = (item?.display_name || "").toLowerCase();

  const isIndia =
    countryCode === "in" ||
    country === "india" ||
    displayName.includes("india");

  if (!isIndia) {
    return 3; // Priority 3: Locations outside India
  }

  // Check if explicitly belonging to another Indian state
  const isExplicitOtherState = OTHER_INDIAN_STATES.has(state);

  // Kerala verification:
  // 1. Explicit state match
  const isExplicitKeralaState = state === "kerala" || displayName.includes("kerala");

  // 2. District match
  const isKeralaDistrict =
    KERALA_DISTRICTS.has(stateDistrict) ||
    KERALA_DISTRICTS.has(county) ||
    Array.from(KERALA_DISTRICTS).some((d) => displayName.includes(d));

  // 3. Coordinate bounds as a ranking hint (Lat: 8.18 - 12.85, Lon: 74.85 - 77.60)
  const lat = parseFloat(item.lat);
  const lon = parseFloat(item.lon);
  const isInKeralaBounds =
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= 8.18 &&
    lat <= 12.85 &&
    lon >= 74.85 &&
    lon <= 77.60;

  // Prioritize Kerala if explicitly stated, district matches, or within bounds without a competing state
  const isKerala =
    !isExplicitOtherState &&
    (isExplicitKeralaState || isKeralaDistrict || (isInKeralaBounds && !state));

  if (isKerala) {
    if (contextStr && typeof contextStr === "string" && contextStr.trim().length > 1) {
      const c = contextStr.trim().toLowerCase();
      if (displayName.includes(c)) {
        return 0; // Priority 0: Kerala and specifically matches selected ward/zone
      }
    }
    return 1; // Priority 1: Kerala, India
  }

  return 2; // Priority 2: Other locations in India
}

/**
 * Sorts location results by 4-tier geographic priority,
 * then by Nominatim's relevance importance score.
 */
function rankLocationResults(rawList, contextStr = "") {
  if (!Array.isArray(rawList)) return [];

  return [...rawList].sort((a, b) => {
    const prioA = getLocationPriority(a, contextStr);
    const prioB = getLocationPriority(b, contextStr);

    if (prioA !== prioB) {
      return prioA - prioB;
    }

    const impA = typeof a.importance === "number" ? a.importance : 0;
    const impB = typeof b.importance === "number" ? b.importance : 0;
    return impB - impA;
  });
}

/**
 * Strips common facility, municipal waste, and administrative prefixes/suffixes
 * so users searching for "Mini MCF pala", "MCF Cherthala", "Ward 1 Pala"
 * can gracefully match geocoded places in OpenStreetMap.
 */
function cleanFacilityKeywords(str) {
  if (!str) return "";
  return str
    .replace(
      /\b(mini[- ]?mcf|mcf|rrf|ckc|material collection facility|collection facility|collection center|collection centre|waste facility|waste center|waste collection|sorting facility|sorting center|dump yard|dumping yard|waste depot|depot|ward\s*\d+|ward)\b/gi,
      " "
    )
    .replace(/[,;:\-\/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Reusable Location Search component for Leaflet maps in EcoPulse.
 * Renders an accessible floating search bar inside the Leaflet MapContainer,
 * performs rate-limited, cached forward geocoding using OpenStreetMap Nominatim,
 * flies the map to the chosen location, and invokes `onLocationSelect`.
 *
 * @param {Object} props
 * @param {Function} props.onLocationSelect - Callback receiving { lat, lng, displayName, rawData }
 * @param {string} [props.placeholder] - Custom placeholder text
 * @param {number} [props.flyZoom=16] - Zoom level applied when flying to location
 * @param {string} [props.wardContext] - Optional ward or zone name to prioritize in ranking
 */
export default function MapLocationSearch({
  onLocationSelect,
  placeholder = "Search location, area, street, landmark...",
  flyZoom = 16,
  wardContext = "",
  isMcfSearch = false,
}) {
  const map = useMap();
  const containerRef = useRef(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { type, message } or null
  const [fallbackInfo, setFallbackInfo] = useState(null); // { original, simplified } or null
  const [isOpen, setIsOpen] = useState(false);

  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastRequestTimeRef = useRef(0);
  const activeRequestIdRef = useRef(0);

  const wardContextRef = useRef(wardContext);
  useEffect(() => {
    wardContextRef.current = wardContext;
  }, [wardContext]);

  // Prevent Leaflet map from capturing clicks, double clicks, scrolls, or drags on this search control
  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Perform geocoding search via Nominatim with caching, throttling, and error triage
  const performSearch = useCallback(async (searchQuery) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      setFallbackInfo(null);
      setIsOpen(false);
      return;
    }

    const normalizedKey = trimmed.toLowerCase();

    // 1. Check in-memory bounded cache
    if (searchCache.has(normalizedKey)) {
      const cached = searchCache.get(normalizedKey);
      setResults(cached.results);
      setFallbackInfo(cached.fallbackInfo || null);
      setError(null);
      setLoading(false);
      setIsOpen(true);
      return;
    }

    // Abort previous in-flight request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const currentSig = abortControllerRef.current.signal;
    const currentReqId = ++activeRequestIdRef.current;

    setLoading(true);
    setError(null);
    setFallbackInfo(null);

    // Throttled fetch complying with Nominatim 1 request per second policy
    const fetchNominatim = async (q, sig) => {
      const now = Date.now();
      const elapsed = now - lastRequestTimeRef.current;
      if (elapsed < 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
      }
      if (sig.aborted) throw new DOMException("Aborted", "AbortError");
      lastRequestTimeRef.current = Date.now();

      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        q
      )}&addressdetails=1&limit=10&viewbox=74.85,12.85,77.58,8.18&bounded=0`;

      let res;
      try {
        res = await fetch(url, {
          signal: sig,
          headers: {
            "Accept-Language": "en",
          },
        });
      } catch (netErr) {
        if (netErr.name === "AbortError") throw netErr;
        throw {
          type: "network",
          message: "Network connection error. Please check your internet connection.",
        };
      }

      if (res.status === 429) {
        throw {
          type: "rate_limit",
          message: "Search service is busy (rate limit reached). Please wait a moment or click directly on the map to pin the location.",
        };
      }
      if (res.status === 403) {
        throw {
          type: "forbidden",
          message: "Search request was restricted. Please try again later or click directly on the map.",
        };
      }
      if (!res.ok) {
        throw {
          type: "server",
          message: `Search service error (${res.status}). Please try again or pin directly on the map.`,
        };
      }

      const json = await res.json();
      return Array.isArray(json) ? json : [];
    };

    try {
      // Step A: Search with raw query
      let items = await fetchNominatim(trimmed, currentSig);
      let usedFallback = null;

      const cleaned = cleanFacilityKeywords(trimmed);
      const hasFacilityKeyword =
        cleaned &&
        cleaned.toLowerCase() !== trimmed.toLowerCase() &&
        cleaned.length >= 2;

      // In MCF search mode, if the user searched for a specific locality (e.g. "Pala" in "Mini MCF Pala"),
      // filter out raw matches that do not match that locality (preventing unrelated nodes like Cherthala).
      if (isMcfSearch && hasFacilityKeyword) {
        const localityWord = cleaned.toLowerCase().trim();
        items = items.filter((item) => {
          const dn = (item.display_name || "").toLowerCase();
          const nm = (item.name || "").toLowerCase();
          return dn.includes(localityWord) || nm.includes(localityWord);
        });
      }

      // Step B: If no results found and query contained facility keywords, try simplified locality query
      if (
        items.length === 0 &&
        hasFacilityKeyword
      ) {
        const fallbackItems = await fetchNominatim(cleaned, currentSig);
        if (fallbackItems.length > 0) {
          items = fallbackItems;
          usedFallback = { original: trimmed, simplified: cleaned };
        }
      }

      // Check if this request is still the active one
      if (currentReqId !== activeRequestIdRef.current) return;

      // Deduplicate by place_id / coordinates
      const seen = new Set();
      const uniqueList = items.filter((item) => {
        const key = item.place_id || `${item.lat}_${item.lon}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const rankedData = rankLocationResults(
        uniqueList,
        wardContextRef.current
      );
      const topResults = rankedData.slice(0, 6);

      // Save to bounded in-memory cache
      if (searchCache.size >= SEARCH_CACHE_LIMIT) {
        const oldestKey = searchCache.keys().next().value;
        searchCache.delete(oldestKey);
      }
      searchCache.set(normalizedKey, {
        results: topResults,
        fallbackInfo: usedFallback,
      });

      setResults(topResults);
      setFallbackInfo(usedFallback);
      setError(null);
      setIsOpen(true);
    } catch (err) {
      if (err.name === "AbortError" || currentReqId !== activeRequestIdRef.current) {
        return; // Ignore aborted or superseded requests
      }
      console.error("Location search error:", err);
      setError(err);
      setResults([]);
      setFallbackInfo(null);
      setIsOpen(true);
    } finally {
      if (currentReqId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Debounced input change (500ms debounce to comply with rate limits)
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setResults([]);
      setIsOpen(false);
      setError(null);
      setFallbackInfo(null);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(val);
    }, 500);
  };

  // Clear query
  const handleClear = () => {
    setQuery("");
    setResults([]);
    setError(null);
    setFallbackInfo(null);
    setIsOpen(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Select a result from dropdown
  const handleSelectResult = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    if (isNaN(lat) || isNaN(lng)) return;

    // Fly and center Leaflet map to selected location
    map.flyTo([lat, lng], flyZoom, {
      duration: 1.2,
    });

    // Notify parent component to update pin/marker and address states
    if (onLocationSelect) {
      onLocationSelect({
        lat,
        lng,
        displayName: item.display_name,
        rawData: item,
      });
    }

    // Set input to display primary name (in default mode; preserve original user query in MCF mode)
    if (!isMcfSearch) {
      const primaryName = item.name || item.display_name.split(",")[0] || item.display_name;
      setQuery(primaryName);
    }
    setIsOpen(false);
  };

  return (
    <div className="map-search-control" ref={containerRef}>
      <div className="map-search-bar">
        <Search size={16} className="map-search-icon" />

        <input
          type="text"
          className="map-search-input"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (results.length > 0 || error) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            // Prevent submitting any enclosing form on Enter key
            if (e.key === "Enter") {
              e.preventDefault();
              // In default mode, Enter selects top result. In MCF mode, require explicit selection so map doesn't auto-jump
              if (!isMcfSearch && results.length > 0) {
                handleSelectResult(results[0]);
              }
            }
            if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          aria-label="Search map location"
        />

        {loading && <Loader2 size={16} className="map-search-spinner" />}

        {query && !loading && (
          <button
            type="button"
            className="map-search-clear"
            onClick={handleClear}
            title="Clear search"
            aria-label="Clear location search"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="map-search-dropdown">
          {error ? (
            <div className={`map-search-status error ${error.type || ""}`}>
              {error.type === "rate_limit" ? (
                <AlertTriangle size={16} className="map-search-status-icon alert" />
              ) : error.type === "network" ? (
                <WifiOff size={16} className="map-search-status-icon network" />
              ) : (
                <AlertCircle size={16} className="map-search-status-icon error" />
              )}
              <div className="map-search-status-body">
                <div className="map-search-status-title">
                  {error.type === "rate_limit"
                    ? "Service Busy (Rate Limit)"
                    : error.type === "network"
                    ? "Network Connection Error"
                    : error.type === "forbidden"
                    ? "Search Service Restricted"
                    : "Search Error"}
                </div>
                <div className="map-search-status-desc">{error.message}</div>
              </div>
            </div>
          ) : loading && results.length === 0 ? (
            <div className="map-search-status loading">
              <Loader2 size={14} className="map-search-spinner" />
              <span>Searching locations...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="map-search-empty-box">
              <div className="map-search-empty-header">
                <MapPin size={15} className="map-search-empty-icon" />
                <span className="map-search-empty-title">
                  No locations found for &quot;{query}&quot;
                </span>
              </div>
              <div className="map-search-empty-hint">
                Search by town, city, or landmark name (e.g. <strong>Pala</strong>, <strong>Cherthala</strong>), or click anywhere on the map to pin the location directly.
              </div>
            </div>
          ) : (
            <>
              {fallbackInfo && (
                <div className="map-search-fallback-banner">
                  {isMcfSearch ? (
                    <>
                      Exact facility not indexed in OpenStreetMap. Suggested area:{" "}
                      <strong>&quot;{fallbackInfo.simplified}, Kerala&quot;</strong>. Select below to place the MCF pin:
                    </>
                  ) : (
                    <>
                      Facility name not indexed in OpenStreetMap. Showing area matches for{" "}
                      <strong>&quot;{fallbackInfo.simplified}&quot;</strong>:
                    </>
                  )}
                </div>
              )}
              {results.map((item, idx) => {
                const primary = item.name || item.display_name.split(",")[0] || "Location";
                const secondary = item.display_name
                  .split(",")
                  .slice(1)
                  .join(",")
                  .trim();

                return (
                  <button
                    key={item.place_id || idx}
                    type="button"
                    className="map-search-item"
                    onClick={() => handleSelectResult(item)}
                  >
                    <MapPin size={16} className="map-search-item-icon" />
                    <div className="map-search-item-content">
                      <div className="map-search-item-title">{primary}</div>
                      {secondary && (
                        <div className="map-search-item-subtitle">{secondary}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
