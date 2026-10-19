import React, { useState, useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import {
  Navigation,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  ExternalLink,
  Calendar,
  Phone,
  User,
  Recycle,
  Clock,
  ArrowRight,
  Building2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Fix Leaflet marker icon paths for React-Leaflet
// ---------------------------------------------------------------------------
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ---------------------------------------------------------------------------
// Haversine distance in kilometers
// ---------------------------------------------------------------------------
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------------------------------------------------------------------
// Route Optimization (Ward MCF Origin -> Pickups -> Same Ward MCF Return)
// Nearest Neighbor + 2-Opt local search on intermediate pickup stops.
// ---------------------------------------------------------------------------
export function optimizeRouteStops(validPickups, staffWard) {
  // Validate MCF coordinates
  const mcfLat =
    staffWard?.mcf_latitude !== null && staffWard?.mcf_latitude !== undefined
      ? Number(staffWard.mcf_latitude)
      : NaN;
  const mcfLng =
    staffWard?.mcf_longitude !== null && staffWard?.mcf_longitude !== undefined
      ? Number(staffWard.mcf_longitude)
      : NaN;

  const hasValidMcf =
    !isNaN(mcfLat) &&
    !isNaN(mcfLng) &&
    (mcfLat !== 0 || mcfLng !== 0) &&
    mcfLat >= -90 &&
    mcfLat <= 90 &&
    mcfLng >= -180 &&
    mcfLng <= 180;

  if (!hasValidMcf) {
    return {
      hasValidMcf: false,
      orderedTasks: [],
      intermediatePickups: [],
      totalDistanceKm: 0,
    };
  }

  const mcfLocationName = staffWard?.mcf_location_name?.trim() || "Ward MCF";
  const wardLabel = staffWard?.ward_name
    ? `Ward ${staffWard.ward_number || staffWard.ward_id}: ${staffWard.ward_name}`
    : staffWard?.ward_id
    ? `Ward ${staffWard.ward_id}`
    : "Ward";

  const mcfStartStop = {
    id: "mcf-start",
    isMcfStart: true,
    isMcf: true,
    pickup: `Ward MCF (${mcfLocationName})`,
    location_name: mcfLocationName,
    lat: mcfLat,
    lng: mcfLng,
    stopNumber: 1,
    ward: wardLabel,
  };

  if (!validPickups || validPickups.length === 0) {
    return {
      hasValidMcf: true,
      orderedTasks: [],
      intermediatePickups: [],
      totalDistanceKm: 0,
    };
  }

  // If 1 pickup: MCF -> Pickup 1 -> MCF
  if (validPickups.length === 1) {
    const p = validPickups[0];
    const pickupStop = {
      ...p,
      stopNumber: 2,
    };
    const mcfEndStop = {
      id: "mcf-end",
      isMcfEnd: true,
      isMcf: true,
      pickup: `Return to Ward MCF (${mcfLocationName})`,
      location_name: mcfLocationName,
      lat: mcfLat,
      lng: mcfLng,
      stopNumber: 3,
      ward: wardLabel,
    };

    const distToPickup = haversineDistanceKm(mcfLat, mcfLng, p.lat, p.lng);
    const distReturn = haversineDistanceKm(p.lat, p.lng, mcfLat, mcfLng);
    const totalDist = Number((distToPickup + distReturn).toFixed(2));

    return {
      hasValidMcf: true,
      orderedTasks: [mcfStartStop, pickupStop, mcfEndStop],
      intermediatePickups: [pickupStop],
      totalDistanceKm: totalDist,
    };
  }

  // If >= 2 pickups: Closed-loop TSP Nearest Neighbor + 2-Opt
  const n = validPickups.length;

  // Pre-calculate distance matrix between pickups
  const distBetweenPickups = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        distBetweenPickups[i][j] = haversineDistanceKm(
          validPickups[i].lat,
          validPickups[i].lng,
          validPickups[j].lat,
          validPickups[j].lng
        );
      }
    }
  }

  // Distance from MCF to each pickup
  const distFromMcf = validPickups.map((p) =>
    haversineDistanceKm(mcfLat, mcfLng, p.lat, p.lng)
  );

  // Step 1: Nearest Neighbor heuristic starting at MCF
  const visited = new Set();
  const routeIndices = [];

  let firstIdx = 0;
  let minFirstDist = Infinity;
  for (let i = 0; i < n; i++) {
    if (distFromMcf[i] < minFirstDist) {
      minFirstDist = distFromMcf[i];
      firstIdx = i;
    }
  }

  routeIndices.push(firstIdx);
  visited.add(firstIdx);

  let current = firstIdx;
  while (visited.size < n) {
    let nearest = -1;
    let minD = Infinity;
    for (let candidate = 0; candidate < n; candidate++) {
      if (!visited.has(candidate)) {
        const d = distBetweenPickups[current][candidate];
        if (d < minD) {
          minD = d;
          nearest = candidate;
        }
      }
    }
    if (nearest !== -1) {
      visited.add(nearest);
      routeIndices.push(nearest);
      current = nearest;
    } else {
      break;
    }
  }

  // Step 2: 2-Opt local search refinement for MCF -> Pickups -> MCF closed loop
  let improved = true;
  let iterations = 0;
  const maxIterations = 50;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const prevLat = i === 0 ? mcfLat : validPickups[routeIndices[i - 1]].lat;
        const prevLng = i === 0 ? mcfLng : validPickups[routeIndices[i - 1]].lng;
        const nextLat = k === n - 1 ? mcfLat : validPickups[routeIndices[k + 1]].lat;
        const nextLng = k === n - 1 ? mcfLng : validPickups[routeIndices[k + 1]].lng;

        const currentI = validPickups[routeIndices[i]];
        const currentK = validPickups[routeIndices[k]];

        const dOld =
          haversineDistanceKm(prevLat, prevLng, currentI.lat, currentI.lng) +
          haversineDistanceKm(currentK.lat, currentK.lng, nextLat, nextLng);

        const dNew =
          haversineDistanceKm(prevLat, prevLng, currentK.lat, currentK.lng) +
          haversineDistanceKm(currentI.lat, currentI.lng, nextLat, nextLng);

        if (dNew < dOld - 1e-6) {
          const reversedSegment = routeIndices.slice(i, k + 1).reverse();
          routeIndices.splice(i, reversedSegment.length, ...reversedSegment);
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  // Construct intermediate pickups with 2-based numbering (Stop 2..N+1)
  const intermediatePickups = routeIndices.map((idx, seq) => ({
    ...validPickups[idx],
    stopNumber: seq + 2,
  }));

  const mcfEndStop = {
    id: "mcf-end",
    isMcfEnd: true,
    isMcf: true,
    pickup: `Return to Ward MCF (${mcfLocationName})`,
    location_name: mcfLocationName,
    lat: mcfLat,
    lng: mcfLng,
    stopNumber: n + 2,
    ward: wardLabel,
  };

  const orderedTasks = [mcfStartStop, ...intermediatePickups, mcfEndStop];

  // Calculate closed-loop tour distance (MCF -> Pickups -> MCF)
  let totalDist = haversineDistanceKm(
    mcfLat,
    mcfLng,
    intermediatePickups[0].lat,
    intermediatePickups[0].lng
  );
  for (let i = 0; i < intermediatePickups.length - 1; i++) {
    totalDist += haversineDistanceKm(
      intermediatePickups[i].lat,
      intermediatePickups[i].lng,
      intermediatePickups[i + 1].lat,
      intermediatePickups[i + 1].lng
    );
  }
  totalDist += haversineDistanceKm(
    intermediatePickups[intermediatePickups.length - 1].lat,
    intermediatePickups[intermediatePickups.length - 1].lng,
    mcfLat,
    mcfLng
  );

  return {
    hasValidMcf: true,
    orderedTasks,
    intermediatePickups,
    totalDistanceKm: Number(totalDist.toFixed(2)),
  };
}

// ---------------------------------------------------------------------------
// Optional OSRM road geometry fetch (with 3-second timeout & safe fallback)
// ---------------------------------------------------------------------------
export async function fetchOsrmRoadGeometry(orderedTasks) {
  if (!orderedTasks || orderedTasks.length < 2) return null;
  try {
    const coordsStr = orderedTasks.map((t) => `${t.lng},${t.lat}`).join(";");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates.map(([lon, lat]) => [
        lat,
        lon,
      ]);
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Distinct MCF Depot Pin Marker Icon
// ---------------------------------------------------------------------------
function createMcfMarkerIcon(isSelected) {
  const bg = isSelected ? "#064e3b" : "#1e6b4e";
  return L.divIcon({
    className: "custom-mcf-marker",
    html: `
      <div style="
        background: ${bg};
        color: #ffffff;
        min-width: 50px;
        height: 32px;
        padding: 0 8px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        font-weight: 800;
        font-size: 11.5px;
        letter-spacing: 0.04em;
        border: 2.5px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
        cursor: pointer;
        transition: transform 0.15s ease;
      ">
        🏁 MCF
      </div>
    `,
    iconSize: [50, 32],
    iconAnchor: [25, 16],
    popupAnchor: [0, -16],
  });
}

// ---------------------------------------------------------------------------
// Numbered custom map pin using Leaflet DivIcon
// ---------------------------------------------------------------------------
function createNumberedMarkerIcon(number, isSelected) {
  const bg = isSelected ? "#047857" : "#1e6b4e";
  return L.divIcon({
    className: "custom-route-marker",
    html: `
      <div style="
        background: ${bg};
        color: #ffffff;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13.5px;
        border: 2.5px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
        cursor: pointer;
        transition: transform 0.15s ease;
      ">
        ${number}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

// ---------------------------------------------------------------------------
// Auto fit map bounds helper
// ---------------------------------------------------------------------------
function MapFitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      try {
        const bounds = L.latLngBounds(positions);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (err) {
        console.error("Map fitBounds error:", err);
      }
    }
  }, [map, positions]);
  return null;
}

// ---------------------------------------------------------------------------
// Fly to selected marker helper
// ---------------------------------------------------------------------------
function MapFlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 14), {
        duration: 0.6,
      });
    }
  }, [map, target]);
  return null;
}

// ===========================================================================
// MAIN COMPONENT: StaffOptimizedRouteModal
// ===========================================================================
export default function StaffOptimizedRouteModal({
  tasks = [],
  staffWard = null,
  date,
  formattedDate,
  onClose,
  onRefresh,
}) {
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [roadPolyline, setRoadPolyline] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const markerRefs = useRef({});

  // 1. Separate valid coordinates vs missing coordinates & verify ward matching by ward ID
  const { validTasks, missingTasks, otherWardCount } = useMemo(() => {
    const valid = [];
    const missing = [];
    let otherWard = 0;

    const staffWardId =
      staffWard?.ward_id !== null && staffWard?.ward_id !== undefined
        ? Number(staffWard.ward_id)
        : null;

    tasks.forEach((item) => {
      // Exclude cancelled requests
      if (String(item?.status || "").toUpperCase() === "CANCELLED") {
        return;
      }

      // Safeguard: verify that pickup requests belong to the same ward using ward IDs
      if (staffWardId !== null) {
        const itemWardId =
          item?.ward_id !== null && item?.ward_id !== undefined
            ? Number(item.ward_id)
            : null;
        if (itemWardId !== null && itemWardId !== staffWardId) {
          otherWard++;
          return;
        }
      }

      const lat =
        item.latitude !== null && item.latitude !== undefined
          ? Number(item.latitude)
          : NaN;
      const lng =
        item.longitude !== null && item.longitude !== undefined
          ? Number(item.longitude)
          : NaN;

      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        (lat !== 0 || lng !== 0) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        valid.push({
          ...item,
          lat,
          lng,
        });
      } else {
        missing.push(item);
      }
    });

    return {
      validTasks: valid,
      missingTasks: missing,
      otherWardCount: otherWard,
    };
  }, [tasks, staffWard]);

  // 2. Perform closed-loop route optimization starting and ending at staff ward MCF
  const {
    hasValidMcf,
    orderedTasks,
    intermediatePickups,
    totalDistanceKm,
  } = useMemo(() => {
    return optimizeRouteStops(validTasks, staffWard);
  }, [validTasks, staffWard]);

  // MCF coordinates for quick access
  const mcfLat =
    staffWard?.mcf_latitude !== null && staffWard?.mcf_latitude !== undefined
      ? Number(staffWard.mcf_latitude)
      : NaN;
  const mcfLng =
    staffWard?.mcf_longitude !== null && staffWard?.mcf_longitude !== undefined
      ? Number(staffWard.mcf_longitude)
      : NaN;
  const mcfName = staffWard?.mcf_location_name?.trim() || "Ward MCF";
  const wardTitle = staffWard?.ward_name
    ? `Ward ${staffWard.ward_number || staffWard.ward_id}: ${staffWard.ward_name}`
    : staffWard?.ward_id
    ? `Ward ${staffWard.ward_id}`
    : "Assigned Ward";

  // 3. Attempt optional road geometry from OSRM with instant fallback
  useEffect(() => {
    let isCurrent = true;
    if (orderedTasks.length >= 2) {
      fetchOsrmRoadGeometry(orderedTasks).then((coords) => {
        if (isCurrent) {
          setRoadPolyline(coords);
        }
      });
    } else {
      setRoadPolyline(null);
    }
    return () => {
      isCurrent = false;
    };
  }, [orderedTasks]);

  // Map coordinates list for bounds & fallback polyline
  const directPolylineCoords = useMemo(() => {
    return orderedTasks.map((t) => [t.lat, t.lng]);
  }, [orderedTasks]);

  const activePolylineCoords = roadPolyline || directPolylineCoords;

  const defaultCenter = useMemo(() => {
    if (hasValidMcf) {
      return [mcfLat, mcfLng];
    }
    if (orderedTasks.length > 0) {
      return [orderedTasks[0].lat, orderedTasks[0].lng];
    }
    return [9.698, 76.723];
  }, [hasValidMcf, mcfLat, mcfLng, orderedTasks]);

  const selectedTask = useMemo(() => {
    return orderedTasks.find((t) => t.id === selectedStopId) || null;
  }, [orderedTasks, selectedStopId]);

  // Handle live re-optimization
  const handleLiveRecalculate = async () => {
    if (isRefreshing || !onRefresh) return;
    try {
      setIsRefreshing(true);
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Open multi-stop closed loop in Google Maps: MCF origin -> pickups waypoints -> MCF destination
  const handleOpenGoogleMapsRoute = () => {
    if (!hasValidMcf || intermediatePickups.length === 0) return;

    const origin = `${mcfLat},${mcfLng}`;
    const destination = `${mcfLat},${mcfLng}`;
    const waypoints = intermediatePickups
      .map((t) => `${t.lat},${t.lng}`)
      .join("|");

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
    window.open(url, "_blank");
  };

  const handleStopClick = (task) => {
    setSelectedStopId(task.id);
    const refKey = task.isMcf ? "mcf-depot" : task.id;
    const ref = markerRefs.current[refKey];
    if (ref) {
      ref.openPopup();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 36, 26, 0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 1100,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 45px rgba(0, 0, 0, 0.22)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid #cfe7bb",
            background: "#f4faf1",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  background: "#1e6b4e",
                  color: "#ffffff",
                  padding: "4px 8px",
                  borderRadius: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                <Navigation size={13} />
                Ward MCF Route
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#1e331b",
                }}
              >
                Today's Pickup Route — {formattedDate || date}
              </h2>
            </div>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12.5,
                color: "#52793f",
              }}
            >
              {!hasValidMcf ? (
                <span style={{ color: "#dc2626", fontWeight: 600 }}>
                  Route unavailable: No valid MCF coordinates registered for {wardTitle}
                </span>
              ) : intermediatePickups.length === 0 ? (
                <span>
                  <strong>{wardTitle}</strong> • MCF: {mcfName} • No eligible pickups to optimize
                </span>
              ) : (
                <span>
                  <strong>{wardTitle} MCF</strong> → <strong>{intermediatePickups.length}</strong> intermediate {intermediatePickups.length === 1 ? "pickup" : "pickups"} → <strong>Same MCF Return</strong>
                  {totalDistanceKm > 0 ? ` (~${totalDistanceKm} km round trip)` : ""}
                </span>
              )}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {onRefresh && (
              <button
                type="button"
                onClick={handleLiveRecalculate}
                disabled={isRefreshing}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#ffffff",
                  border: "1px solid #cfe7bb",
                  color: "#2f4a1c",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: isRefreshing ? "wait" : "pointer",
                  opacity: isRefreshing ? 0.7 : 1,
                }}
                title="Re-query latest assignments and recalculate complete route"
              >
                <RefreshCw
                  size={12}
                  className={isRefreshing ? "spin-animation" : ""}
                />
                {isRefreshing ? "Recalculating..." : "Recalculate Live"}
              </button>
            )}

            {hasValidMcf && intermediatePickups.length > 0 && (
              <button
                type="button"
                onClick={handleOpenGoogleMapsRoute}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#1e6b4e",
                  border: "none",
                  color: "#ffffff",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Launch Google Maps with complete Ward MCF closed-loop route"
              >
                <ExternalLink size={13} /> Open in Google Maps
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: 24,
                lineHeight: 1,
                color: "#52793f",
                cursor: "pointer",
                padding: "4px 8px",
              }}
              title="Close Route Modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ERROR BANNER FOR MISSING MCF COORDINATES */}
        {!hasValidMcf && (
          <div
            style={{
              padding: "12px 20px",
              background: "#fef2f2",
              borderBottom: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: 13,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <AlertTriangle
              size={18}
              color="#dc2626"
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <div>
              <strong style={{ display: "block", marginBottom: 2 }}>
                Missing Ward MCF Coordinates
              </strong>
              No valid Material Collection Facility (MCF) or Mini MCF coordinates are registered for your assigned ward ({wardTitle}).
              Route optimization cannot be generated without verified MCF origin and return coordinates. Please contact your municipality administrator.
            </div>
          </div>
        )}

        {/* WARNING BANNER FOR MISSING COORDINATES */}
        {hasValidMcf && missingTasks.length > 0 && (
          <div
            style={{
              padding: "10px 18px",
              background: "#fffbeb",
              borderBottom: "1px solid #fef3c7",
              color: "#92400e",
              fontSize: 12.5,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <AlertTriangle
              size={16}
              color="#d97706"
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <div>
              <strong>Note:</strong> {missingTasks.length} assigned task(s) in your ward could not be plotted on the route due to missing GPS coordinates:{" "}
              {missingTasks.map((t, idx) => (
                <span key={t.id}>
                  #{t.id} ({t.pickup || t.location_name || "N/A"})
                  {idx < missingTasks.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* MODAL BODY */}
        <div
          style={{
            display: "flex",
            flex: 1,
            overflow: "hidden",
            flexDirection: "row",
          }}
        >
          {/* LEFT: LEAFLET INTERACTIVE MAP */}
          <div
            style={{
              flex: "1 1 65%",
              minHeight: 460,
              position: "relative",
              background: "#eef2ea",
            }}
          >
            {!hasValidMcf ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 32,
                  textAlign: "center",
                  color: "#991b1b",
                  background: "#fef8f8",
                }}
              >
                <AlertTriangle
                  size={46}
                  color="#dc2626"
                  style={{ marginBottom: 12 }}
                />
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#7f1d1d",
                    marginBottom: 6,
                  }}
                >
                  Route Optimization Unavailable
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: "#991b1b",
                    maxWidth: 460,
                    lineHeight: 1.5,
                  }}
                >
                  Your assigned ward (<strong>{wardTitle}</strong>) has no saved MCF latitude and longitude coordinates. A registered Ward MCF is required as both the starting depot and returning destination.
                </div>
              </div>
            ) : intermediatePickups.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 24,
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                <MapPin size={38} color="#9ca3af" style={{ marginBottom: 10 }} />
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    color: "#374151",
                  }}
                >
                  No pickup locations available to optimize for this date.
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  Assigned pickups for {wardTitle} must have valid coordinates.
                </div>
              </div>
            ) : (
              <MapContainer
                center={defaultCenter}
                zoom={13}
                scrollWheelZoom={true}
                style={{ width: "100%", height: "100%", minHeight: 460 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Auto zoom & pan to encompass all stops */}
                <MapFitBounds positions={directPolylineCoords} />

                {/* Fly to single stop when selected */}
                <MapFlyTo target={selectedTask} />

                {/* Connecting Polyline */}
                {activePolylineCoords && activePolylineCoords.length >= 2 && (
                  <Polyline
                    positions={activePolylineCoords}
                    pathOptions={{
                      color: "#1e6b4e",
                      weight: 4,
                      opacity: 0.85,
                      dashArray: roadPolyline ? null : "6, 8",
                    }}
                  />
                )}

                {/* 1. Ward MCF Depot Marker (Serves as both Stop 1 & Return Destination) */}
                <Marker
                  position={[mcfLat, mcfLng]}
                  icon={createMcfMarkerIcon(
                    selectedStopId === "mcf-start" || selectedStopId === "mcf-end"
                  )}
                  ref={(el) => {
                    if (el) markerRefs.current["mcf-depot"] = el;
                  }}
                  eventHandlers={{
                    click: () => setSelectedStopId("mcf-start"),
                  }}
                >
                  <Popup>
                    <div style={{ padding: "4px 2px", minWidth: 220 }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          background: "#064e3b",
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 4,
                          padding: "2px 6px",
                          marginBottom: 6,
                        }}
                      >
                        🏁 WARD MCF (START & RETURN DEPOT)
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#1f2937",
                          marginBottom: 4,
                        }}
                      >
                        {mcfName}
                      </div>

                      <div
                        style={{
                          fontSize: 12.5,
                          color: "#374151",
                          marginBottom: 4,
                        }}
                      >
                        🏢 {wardTitle}
                      </div>

                      <div
                        style={{
                          fontSize: 11.5,
                          color: "#15803d",
                          fontWeight: 600,
                          background: "#f0fdf4",
                          padding: "4px 6px",
                          borderRadius: 4,
                          marginTop: 4,
                        }}
                      >
                        • Stop 1: Departure Origin<br />
                        • Stop {orderedTasks.length}: Final Return Destination
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${mcfLat},${mcfLng}`,
                            "_blank"
                          )
                        }
                        style={{
                          marginTop: 10,
                          width: "100%",
                          background: "#1e6b4e",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 6,
                          padding: "5px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        <Navigation size={11} /> Navigate to Ward MCF
                      </button>
                    </div>
                  </Popup>
                </Marker>

                {/* 2. Intermediate Pickups Markers */}
                {intermediatePickups.map((task) => {
                  const isSelected = selectedStopId === task.id;

                  return (
                    <Marker
                      key={task.id}
                      position={[task.lat, task.lng]}
                      icon={createNumberedMarkerIcon(task.stopNumber, isSelected)}
                      ref={(el) => {
                        if (el) markerRefs.current[task.id] = el;
                      }}
                      eventHandlers={{
                        click: () => setSelectedStopId(task.id),
                      }}
                    >
                      <Popup>
                        <div style={{ padding: "4px 2px", minWidth: 200 }}>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              background: "#1e6b4e",
                              color: "#ffffff",
                              fontSize: 11,
                              fontWeight: 700,
                              borderRadius: 4,
                              padding: "2px 6px",
                              marginBottom: 6,
                            }}
                          >
                            STOP {task.stopNumber}
                          </div>

                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                              color: "#1f2937",
                              marginBottom: 4,
                            }}
                          >
                            Pickup Request #{task.id}
                          </div>

                          <div
                            style={{
                              fontSize: 12.5,
                              color: "#374151",
                              marginBottom: 4,
                            }}
                          >
                            📍 {task.pickup || task.location_name}
                          </div>

                          {task.address && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#4b5563",
                                marginBottom: 4,
                              }}
                            >
                              🏠 {task.address}
                            </div>
                          )}

                          {task.ward && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#4c7a2e",
                                fontWeight: 600,
                                marginBottom: 2,
                              }}
                            >
                              {task.ward}
                            </div>
                          )}

                          {task.userName && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#6b7280",
                                marginTop: 2,
                              }}
                            >
                              👤 Resident: <strong>{task.userName}</strong>
                            </div>
                          )}

                          {task.wasteType && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#6b7280",
                                marginTop: 2,
                              }}
                            >
                              ♻️ Waste Type: <strong>{task.wasteType}</strong>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              window.open(
                                `https://www.google.com/maps/dir/?api=1&destination=${task.lat},${task.lng}`,
                                "_blank"
                              )
                            }
                            style={{
                              marginTop: 10,
                              width: "100%",
                              background: "#1e6b4e",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 6,
                              padding: "5px 10px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 4,
                            }}
                          >
                            <Navigation size={11} /> Navigate to Stop
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            )}
          </div>

          {/* RIGHT: SEQUENTIAL STOPS LIST & ITINERARY */}
          <div
            style={{
              flex: "1 1 35%",
              borderLeft: "1px solid #cfe7bb",
              display: "flex",
              flexDirection: "column",
              background: "#ffffff",
              maxWidth: 380,
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #eef6e9",
                background: "#f9fcf7",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#2f4a1c",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Route Sequence
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#52793f" }}>
                {orderedTasks.length} Stops Total
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "10px 14px",
              }}
            >
              {!hasValidMcf ? (
                <div
                  style={{
                    padding: "30px 16px",
                    textAlign: "center",
                    color: "#dc2626",
                    fontSize: 13,
                  }}
                >
                  <AlertTriangle
                    size={28}
                    color="#dc2626"
                    style={{ margin: "0 auto 8px" }}
                  />
                  <div style={{ fontWeight: 700 }}>Route Unavailable</div>
                  <div
                    style={{ fontSize: 12, color: "#7f1d1d", marginTop: 4 }}
                  >
                    Please register MCF coordinates for {wardTitle}.
                  </div>
                </div>
              ) : orderedTasks.length === 0 ? (
                <div
                  style={{
                    padding: "20px 0",
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: 13,
                  }}
                >
                  No stops available.
                </div>
              ) : (
                orderedTasks.map((t, idx) => {
                  const isSelected = selectedStopId === t.id;
                  const isFirst = t.isMcfStart;
                  const isLast = t.isMcfEnd;

                  return (
                    <div
                      key={t.id}
                      style={{ marginBottom: 8, position: "relative" }}
                    >
                      <div
                        onClick={() => handleStopClick(t)}
                        role="button"
                        tabIndex={0}
                        style={{
                          border: isSelected
                            ? "1.5px solid #1e6b4e"
                            : isFirst || isLast
                            ? "1px solid #a7f3d0"
                            : "1px solid #e2f0d9",
                          borderRadius: 10,
                          padding: "10px 12px",
                          background: isSelected
                            ? "#f4faf1"
                            : isFirst || isLast
                            ? "#f0fdf4"
                            : "#ffffff",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                          }}
                        >
                          {/* STOP BADGE */}
                          <div
                            style={{
                              background:
                                isFirst || isLast ? "#064e3b" : "#1e6b4e",
                              color: "#ffffff",
                              borderRadius: isFirst || isLast ? "6px" : "50%",
                              width: isFirst || isLast ? 34 : 24,
                              height: 24,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: isFirst || isLast ? 10.5 : 12,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {isFirst ? "MCF" : isLast ? "MCF" : t.stopNumber}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: 13,
                                  color: isFirst || isLast ? "#064e3b" : "#1f2e22",
                                }}
                              >
                                {isFirst
                                  ? "Stop 1: Ward MCF (Start)"
                                  : isLast
                                  ? `Stop ${t.stopNumber}: Ward MCF (Return)`
                                  : `Pickup #${t.id}`}
                              </span>
                              {isFirst && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#15803d",
                                    background: "#dcfce7",
                                    padding: "1px 6px",
                                    borderRadius: 10,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Origin
                                </span>
                              )}
                              {isLast && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#0369a1",
                                    background: "#e0f2fe",
                                    padding: "1px 6px",
                                    borderRadius: 10,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Return Depot
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                fontSize: 12,
                                color: "#374151",
                                marginTop: 3,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={t.pickup || t.location_name}
                            >
                              📍 {t.pickup || t.location_name}
                            </div>

                            {t.address && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#6b7280",
                                  marginTop: 2,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={t.address}
                              >
                                🏠 {t.address}
                              </div>
                            )}

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                fontSize: 11,
                                color: "#6b7280",
                                marginTop: 4,
                              }}
                            >
                              {t.ward && <span>{t.ward}</span>}
                              {t.wasteType && <span>• {t.wasteType}</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CONNECTOR LINE BETWEEN STOPS */}
                      {idx < orderedTasks.length - 1 && (
                        <div
                          style={{
                            width: 2,
                            height: 8,
                            background: "#cfe7bb",
                            marginLeft: 23,
                            marginTop: 1,
                            marginBottom: 1,
                          }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ROUTE SUMMARY FOOTER */}
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid #eef6e9",
                background: "#f9fcf7",
                fontSize: 12,
                color: "#4b5563",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span>Total Route Stops:</span>
                <strong style={{ color: "#1f2e22" }}>
                  {orderedTasks.length}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span>Intermediate Pickups:</span>
                <strong style={{ color: "#1f2e22" }}>
                  {intermediatePickups.length}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Total Round Trip:</span>
                <strong style={{ color: "#1e6b4e" }}>
                  {totalDistanceKm > 0 ? `~${totalDistanceKm} km` : "N/A"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
