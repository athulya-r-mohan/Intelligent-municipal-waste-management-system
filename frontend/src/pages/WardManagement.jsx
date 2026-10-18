import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  AlertTriangle,
  CheckCircle2,
  X,
  Activity,
  CalendarDays,
  ShieldAlert,
  Building2,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  Navigation,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import MapLocationSearch from "../components/MapLocationSearch";
import NotificationBell from "../components/NotificationBell";
import "../components/WardManagement.css";

// Fix Leaflet marker icons for React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const mcfMarkerIcon = L.divIcon({
  className: "wm-mcf-map-marker",
  html: `<div style="background:#16a34a;color:white;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.35);border:2px solid white;"><span style="transform:rotate(45deg);font-size:15px;line-height:1;">📍</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -28],
});

const KERALA_DEFAULT_CENTER = [9.6852, 76.7218]; // Central Kerala (Pala/Kottayam region)

// Reverse geocoding via Nominatim
const getReverseGeocodeName = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) throw new Error("Reverse geocode failed");
    const data = await res.json();
    return data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch (e) {
    console.error("Reverse geocoding error:", e);
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
};

function McfMapEvents({ onPinSelect }) {
  useMapEvents({
    click: async (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      onPinSelect({
        lat,
        lng,
        displayName: "Locating address...",
      });
      const addr = await getReverseGeocodeName(lat, lng);
      onPinSelect({
        lat,
        lng,
        displayName: addr,
      });
    },
  });
  return null;
}

function McfMapController({ center, zoom = 14 }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      const curCenter = map.getCenter();
      const dist = Math.hypot(curCenter.lat - center[0], curCenter.lng - center[1]);
      if (dist > 0.0002) {
        map.setView(center, zoom);
      }
    }
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [center, zoom, map]);
  return null;
}

function McfManualCoordinates({
  show,
  onToggle,
  coordPaste,
  onPasteChange,
  lat,
  onLatChange,
  lng,
  onLngChange,
  facilityName,
  onFacilityNameChange,
  error,
  onApply,
}) {
  return (
    <div className="wm-mcf-manual-wrap">
      <button
        type="button"
        className="wm-mcf-manual-toggle"
        onClick={onToggle}
        aria-expanded={show}
      >
        <div className="wm-mcf-manual-toggle-left">
          <Navigation size={14} className="wm-mcf-manual-toggle-icon" />
          <span>Manual Coordinates / GPS Fallback (Google Maps)</span>
        </div>
        {show ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {show && (
        <div className="wm-mcf-manual-body">
          <div className="wm-mcf-manual-hint">
            If your facility (e.g. <strong>Mini MCF Pala</strong>) is not found in OpenStreetMap search, copy its coordinates from Google Maps and enter them below.
          </div>

          {error && (
            <div className="wm-mcf-manual-error">
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div className="wm-mcf-manual-group">
            <label className="wm-mcf-manual-label">
              Paste Coordinates from Google Maps
            </label>
            <input
              type="text"
              className="wm-form-input wm-mcf-manual-input"
              placeholder="e.g. 9.713305, 76.687421"
              value={coordPaste}
              onChange={onPasteChange}
            />
            <span className="wm-mcf-field-hint">
              Paste copied &quot;lat, lng&quot; from Google Maps to auto-fill latitude and longitude.
            </span>
          </div>

          <div className="wm-mcf-manual-row">
            <div className="wm-mcf-manual-col">
              <label className="wm-mcf-manual-label">Latitude</label>
              <input
                type="number"
                step="any"
                className="wm-form-input wm-mcf-manual-input"
                placeholder="e.g. 9.713305"
                value={lat}
                onChange={onLatChange}
              />
            </div>
            <div className="wm-mcf-manual-col">
              <label className="wm-mcf-manual-label">Longitude</label>
              <input
                type="number"
                step="any"
                className="wm-form-input wm-mcf-manual-input"
                placeholder="e.g. 76.687421"
                value={lng}
                onChange={onLngChange}
              />
            </div>
          </div>

          <div className="wm-mcf-manual-group">
            <label className="wm-mcf-manual-label">
              MCF Facility Name / Landmark (Optional)
            </label>
            <input
              type="text"
              className="wm-form-input wm-mcf-manual-input"
              placeholder="e.g. Mini MCF Pala"
              value={facilityName}
              onChange={onFacilityNameChange}
            />
            <span className="wm-mcf-field-hint">
              Name used to identify this facility in municipal records.
            </span>
          </div>

          <div className="wm-mcf-manual-actions">
            <button
              type="button"
              className="wm-mcf-manual-apply-btn"
              onClick={onApply}
            >
              <MapPin size={14} />
              Set MCF Pin
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const API_BASE_URL = "http://127.0.0.1:8000";

function EcoPulseLogo({ onClick }) {
  return (
    <button className="wm-logo" onClick={onClick} aria-label="Go to admin">
      <span className="wm-logo-mark">
        <Activity size={18} strokeWidth={2.5} />
      </span>
      <span className="wm-logo-text">
        Eco<span className="wm-logo-accent">Pulse</span>
      </span>
    </button>
  );
}

function DateBadge() {
  const today = useMemo(() => {
    const d = new Date();
    const opts = { weekday: "short", day: "2-digit", month: "short", year: "numeric" };
    return d.toLocaleDateString("en-US", opts);
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-soft)", fontWeight: 600 }}>
      <CalendarDays size={16} strokeWidth={2.2} />
      <span>{today}</span>
    </div>
  );
}

export default function WardManagement() {
  const navigate = useNavigate();

  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWard, setEditingWard] = useState(null);
  const [deleteTargetWard, setDeleteTargetWard] = useState(null);

  // Form states
  const [formNumber, setFormNumber] = useState("");
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [mcfLocationName, setMcfLocationName] = useState("");
  const [mcfLat, setMcfLat] = useState(null);
  const [mcfLng, setMcfLng] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Manual Coordinates / GPS state
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [manualCoordPaste, setManualCoordPaste] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [manualFacilityName, setManualFacilityName] = useState("");
  const [manualCoordError, setManualCoordError] = useState("");

  // Toast state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch all wards from PostgreSQL database
  const fetchWards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/wards/`, {
        headers: getAuthHeaders(),
      });
      if (Array.isArray(res.data)) {
        setWards(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch wards:", err);
      showToast("Failed to load wards from database.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWards();
  }, [fetchWards]);

  // Filtered wards for search
  const filteredWards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return wards;
    return wards.filter((w) => {
      const matchNum = String(w.ward_number).includes(q);
      const matchName = (w.ward_name || "").toLowerCase().includes(q);
      const matchLoc = (w.location || "").toLowerCase().includes(q);
      const matchMcf = (w.mcf_location_name || "").toLowerCase().includes(q);
      return matchNum || matchName || matchLoc || matchMcf;
    });
  }, [wards, searchQuery]);

  // Statistics
  const totalWards = wards.length;
  const activeWards = wards.filter((w) => (w.user_count || 0) > 0).length;
  const namedWards = wards.filter((w) => !!w.ward_name && w.ward_name.trim().length > 0).length;

  const handleMcfLocationSelect = ({ lat, lng, displayName }) => {
    const latitude = typeof lat === "number" ? lat : parseFloat(lat);
    const longitude = typeof lng === "number" ? lng : parseFloat(lng);
    setMcfLat(latitude);
    setMcfLng(longitude);
    setMcfLocationName(displayName || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    setManualLat(String(latitude));
    setManualLng(String(longitude));
    setManualFacilityName(displayName || "");
    setManualCoordPaste(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
  };

  const handleClearMcfPin = () => {
    setMcfLat(null);
    setMcfLng(null);
    setMcfLocationName("");
    setManualLat("");
    setManualLng("");
    setManualFacilityName("");
    setManualCoordPaste("");
    setManualCoordError("");
  };

  // Helper to parse combined coordinates (e.g. "9.713305, 76.687421" or "(9.713305, 76.687421)")
  const parseCombinedCoordinates = (str) => {
    if (!str || typeof str !== "string") return null;
    const cleaned = str.replace(/[()]/g, "").trim();
    const parts = cleaned.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return null;
  };

  const handleManualPasteChange = (e) => {
    const val = e.target.value;
    setManualCoordPaste(val);
    const parsed = parseCombinedCoordinates(val);
    if (parsed) {
      setManualLat(String(parsed.lat));
      setManualLng(String(parsed.lng));
      setManualCoordError("");
    }
  };

  const handleApplyManualCoords = async () => {
    setManualCoordError("");
    let parsedLat = parseFloat(manualLat);
    let parsedLng = parseFloat(manualLng);

    // If separate fields are empty, try parsing manualCoordPaste
    if ((isNaN(parsedLat) || isNaN(parsedLng)) && manualCoordPaste.trim()) {
      const parsed = parseCombinedCoordinates(manualCoordPaste);
      if (parsed) {
        parsedLat = parsed.lat;
        parsedLng = parsed.lng;
        setManualLat(String(parsedLat));
        setManualLng(String(parsedLng));
      }
    }

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setManualCoordError("Please enter valid numeric Latitude and Longitude.");
      return;
    }

    if (parsedLat < -90 || parsedLat > 90) {
      setManualCoordError("Latitude must be between -90 and 90.");
      return;
    }

    if (parsedLng < -180 || parsedLng > 180) {
      setManualCoordError("Longitude must be between -180 and 180.");
      return;
    }

    const customName = manualFacilityName.trim();
    let displayName = customName;
    if (!displayName) {
      displayName = await getReverseGeocodeName(parsedLat, parsedLng);
    }

    handleMcfLocationSelect({
      lat: parsedLat,
      lng: parsedLng,
      displayName,
    });
    setManualCoordError("");
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    // Find next available ward number
    const maxNum = wards.reduce((max, w) => Math.max(max, Number(w.ward_number) || 0), 0);
    setFormNumber(String(maxNum + 1));
    setFormName("");
    setFormLocation("");
    setMcfLocationName("");
    setMcfLat(null);
    setMcfLng(null);
    setShowManualCoords(false);
    setManualCoordPaste("");
    setManualLat("");
    setManualLng("");
    setManualFacilityName("");
    setManualCoordError("");
    setFormError("");
    setShowAddModal(true);
  };

  // Submit Add Ward
  const handleCreateWard = async (e) => {
    e.preventDefault();
    setFormError("");

    const numVal = parseInt(formNumber, 10);
    if (!numVal || numVal <= 0) {
      setFormError("Please enter a valid positive Ward Number.");
      return;
    }

    if (mcfLat === null || mcfLng === null) {
      setFormError("Please select the MCF (Material Collection Facility) location on the map.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ward_number: numVal,
        ward_name: formName.trim(),
        location: formLocation.trim(),
        mcf_location_name: mcfLocationName.trim(),
        mcf_latitude: mcfLat,
        mcf_longitude: mcfLng,
      };

      const res = await axios.post(`${API_BASE_URL}/api/wards/`, payload, {
        headers: getAuthHeaders(),
      });

      setShowAddModal(false);
      showToast(res.data.message || `Ward ${numVal} created successfully!`, "success");
      fetchWards();
    } catch (err) {
      console.error("Create ward error:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.errors?.ward_number?.[0] ||
        "Failed to create ward. Please try again.";
      setFormError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal (Preserves existing ID and relationships)
  const handleOpenEdit = (ward) => {
    setEditingWard(ward);
    setFormNumber(String(ward.ward_number));
    setFormName(ward.ward_name || "");
    setFormLocation(ward.location || "");
    setMcfLocationName(ward.mcf_location_name || "");
    const parsedLat = ward.mcf_latitude ? parseFloat(ward.mcf_latitude) : null;
    const parsedLng = ward.mcf_longitude ? parseFloat(ward.mcf_longitude) : null;
    setMcfLat(parsedLat);
    setMcfLng(parsedLng);
    setShowManualCoords(false);
    setManualCoordPaste(
      parsedLat !== null && parsedLng !== null
        ? `${parsedLat.toFixed(6)}, ${parsedLng.toFixed(6)}`
        : ""
    );
    setManualLat(parsedLat !== null ? String(parsedLat) : "");
    setManualLng(parsedLng !== null ? String(parsedLng) : "");
    setManualFacilityName(ward.mcf_location_name || "");
    setManualCoordError("");
    setFormError("");
  };

  // Submit Edit Ward
  const handleUpdateWard = async (e) => {
    e.preventDefault();
    if (!editingWard) return;
    setFormError("");

    const numVal = parseInt(formNumber, 10);
    if (!numVal || numVal <= 0) {
      setFormError("Please enter a valid positive Ward Number.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ward_number: numVal,
        ward_name: formName.trim(),
        location: formLocation.trim(),
        mcf_location_name: mcfLocationName.trim(),
        mcf_latitude: mcfLat,
        mcf_longitude: mcfLng,
      };

      const res = await axios.patch(
        `${API_BASE_URL}/api/wards/${editingWard.ward_id}/`,
        payload,
        { headers: getAuthHeaders() }
      );

      setEditingWard(null);
      showToast(res.data.message || `Ward ${numVal} updated successfully!`, "success");
      fetchWards();
    } catch (err) {
      console.error("Update ward error:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.errors?.ward_number?.[0] ||
        "Failed to update ward.";
      setFormError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Request
  const handleDeleteClick = (ward) => {
    setDeleteTargetWard(ward);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTargetWard) return;

    // Safety guard
    if (!deleteTargetWard.can_delete && (deleteTargetWard.user_count || 0) > 0) {
      showToast("Cannot delete ward: active records depend on it.", "error");
      setDeleteTargetWard(null);
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.delete(
        `${API_BASE_URL}/api/wards/${deleteTargetWard.ward_id}/`,
        { headers: getAuthHeaders() }
      );
      showToast(res.data.message || `Ward ${deleteTargetWard.ward_number} deleted.`, "success");
      setDeleteTargetWard(null);
      fetchWards();
    } catch (err) {
      console.error("Delete ward error:", err);
      const errMsg = err.response?.data?.error || "Failed to delete ward.";
      showToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ward-mgmt-root">
      {/* Topbar */}
      <header className="wm-topbar">
        <div className="wm-topbar-left">
          <button
            className="wm-back-btn"
            onClick={() => navigate("/admin")}
            aria-label="Back to Admin"
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
          </button>
          <EcoPulseLogo onClick={() => navigate("/admin")} />
          <span className="wm-page-title-badge">Municipality Administration</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <NotificationBell />
          <DateBadge />
        </div>
      </header>

      {/* Main Container */}
      <main className="wm-container">
        {/* Animated pulse line */}
        <svg className="wm-pulse-divider" viewBox="0 0 800 22" preserveAspectRatio="none">
          <polyline
            points="0,11 260,11 285,2 305,20 325,11 800,11"
            fill="none"
            stroke="#3FA96B"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Header Row */}
        <div className="wm-header-row">
          <div>
            <h1 className="wm-heading">Manage Wards</h1>
            <p className="wm-subheading">
              Add and manage municipality wards, update names, and track resident coverage.
            </p>
          </div>

          <button className="wm-add-btn" onClick={handleOpenAdd}>
            <Plus size={18} strokeWidth={2.4} />
            <span>Add Ward</span>
          </button>
        </div>

        {/* Stat Cards */}
        <div className="wm-stats-bar">
          <div className="wm-stat-card">
            <div className="wm-stat-icon-wrap">
              <MapPin size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="wm-stat-val">{totalWards}</div>
              <div className="wm-stat-label">Total Municipality Wards</div>
            </div>
          </div>

          <div className="wm-stat-card">
            <div className="wm-stat-icon-wrap" style={{ background: "#e0f2fe", color: "#0369a1" }}>
              <Users size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="wm-stat-val">{activeWards}</div>
              <div className="wm-stat-label">Wards with Active Residents</div>
            </div>
          </div>

          <div className="wm-stat-card">
            <div className="wm-stat-icon-wrap" style={{ background: "#fef3c7", color: "#b45309" }}>
              <CheckCircle2 size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="wm-stat-val">{namedWards} / {totalWards}</div>
              <div className="wm-stat-label">Named Wards Configured</div>
            </div>
          </div>
        </div>

        {/* Panel with Search & Table */}
        <div className="wm-card-panel">
          <div className="wm-panel-toolbar">
            <div className="wm-search-box">
              <Search size={16} color="#6b7280" />
              <input
                type="text"
                placeholder="Search by ward number, name, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <X size={15} color="#9ca3af" />
                </button>
              )}
            </div>

            <div className="wm-table-count">
              Showing <b>{filteredWards.length}</b> of <b>{totalWards}</b> wards
            </div>
          </div>

          {/* Table */}
          <div className="wm-table-wrap">
            {loading ? (
              <div className="wm-empty-state">
                <div style={{ fontSize: 14.5, color: "var(--ink-soft)" }}>
                  Loading municipality wards from database...
                </div>
              </div>
            ) : filteredWards.length === 0 ? (
              <div className="wm-empty-state">
                <div className="wm-empty-icon">
                  <MapPin size={24} />
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "var(--green-900)" }}>
                  No Wards Found
                </h3>
                <p style={{ margin: 0, fontSize: 13.5 }}>
                  {searchQuery
                    ? `No wards matching "${searchQuery}". Try a different search.`
                    : "No wards are currently configured in the database."}
                </p>
              </div>
            ) : (
              <table className="wm-table">
                <thead>
                  <tr>
                    <th style={{ width: "160px" }}>Ward Identifier</th>
                    <th>Ward Name</th>
                    <th>Location / Zone</th>
                    <th style={{ width: "160px" }}>Active Residents</th>
                    <th style={{ width: "160px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWards.map((w) => {
                    const hasName = Boolean(w.ward_name && w.ward_name.trim().length > 0);
                    const userCount = w.user_count || 0;
                    return (
                      <tr key={w.ward_id}>
                        <td>
                          <span className="wm-ward-num-chip">
                            <MapPin size={13} strokeWidth={2.5} />
                            Ward {w.ward_number}
                          </span>
                        </td>
                        <td>
                          {hasName ? (
                            <span className="wm-name-text">{w.ward_name}</span>
                          ) : (
                            <span className="wm-name-empty">Not assigned</span>
                          )}
                        </td>
                        <td>
                          <span className="wm-location-text">
                            {w.location && w.location.trim() ? w.location : "—"}
                          </span>
                          {w.mcf_location_name ? (
                            <div className="wm-mcf-subtext" title={`MCF Location: ${w.mcf_location_name}`}>
                              <span className="wm-mcf-tag">MCF</span>
                              <span className="wm-mcf-addr">{w.mcf_location_name}</span>
                            </div>
                          ) : (
                            <div className="wm-mcf-subtext">
                              <span className="wm-mcf-tag unassigned">MCF</span>
                              <span className="wm-mcf-addr empty">Not set</span>
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`wm-user-count-chip ${userCount > 0 ? "active" : ""}`}>
                            <Users size={12} />
                            {userCount} {userCount === 1 ? "resident" : "residents"}
                          </span>
                        </td>
                        <td>
                          <div className="wm-actions-cell" style={{ justifyContent: "flex-end" }}>
                            <button
                              className="wm-btn-edit"
                              onClick={() => handleOpenEdit(w)}
                              title={`Edit Ward ${w.ward_number}`}
                            >
                              <Pencil size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              className={`wm-btn-delete ${!w.can_delete ? "disabled" : ""}`}
                              onClick={() => handleDeleteClick(w)}
                              title={
                                !w.can_delete
                                  ? `Ward ${w.ward_number} is in use (${userCount} users) and cannot be deleted.`
                                  : `Delete Ward ${w.ward_number}`
                              }
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* ADD WARD MODAL */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="wm-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="wm-modal-box wm-modal-with-map" onClick={(e) => e.stopPropagation()}>
            <div className="wm-modal-header">
              <h2 className="wm-modal-title">Add Municipality Ward</h2>
              <button className="wm-modal-close" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="wm-modal-alert">
                <AlertTriangle size={16} flexShrink={0} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateWard}>
              <div className="wm-form-group">
                <label className="wm-form-label">
                  Ward Number <span className="req">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="wm-form-input"
                  placeholder="e.g. 3"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  required
                />
                <div className="wm-form-hint">
                  Must be a unique positive number (e.g. 1, 2, 3...)
                </div>
              </div>

              <div className="wm-form-group">
                <label className="wm-form-label">Ward Name (Optional)</label>
                <input
                  type="text"
                  className="wm-form-input"
                  placeholder="e.g. Central City / Green District"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
                <div className="wm-form-hint">
                  Can be added or updated anytime through Edit.
                </div>
              </div>

              <div className="wm-form-group">
                <label className="wm-form-label">Location / Zone (Optional)</label>
                <input
                  type="text"
                  className="wm-form-input"
                  placeholder="e.g. North Zone / Downtown / Pala"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                />
                <div className="wm-form-hint">
                  Administrative district or zone classification.
                </div>
              </div>

              {/* MCF Location with interactive map */}
              <div className="wm-form-group">
                <label className="wm-form-label">
                  MCF (Material Collection Facility) Location <span className="req">*</span>
                </label>
                <div className="wm-form-hint" style={{ marginBottom: 8 }}>
                  Search or click on the map to select the ward's designated waste collection facility (prioritized for Kerala).
                </div>

                <div className="wm-mcf-map-wrapper">
                  <MapContainer
                    center={mcfLat && mcfLng ? [mcfLat, mcfLng] : KERALA_DEFAULT_CENTER}
                    zoom={mcfLat && mcfLng ? 15 : 12}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapLocationSearch
                      onLocationSelect={handleMcfLocationSelect}
                      placeholder="Search MCF facility (e.g. Pala, Kottayam)..."
                      wardContext={formLocation || formName}
                      isMcfSearch={true}
                    />
                    <McfMapEvents onPinSelect={handleMcfLocationSelect} />
                    <McfMapController
                      center={mcfLat && mcfLng ? [mcfLat, mcfLng] : KERALA_DEFAULT_CENTER}
                      zoom={mcfLat && mcfLng ? 15 : 12}
                    />
                    {mcfLat && mcfLng && (
                      <Marker position={[mcfLat, mcfLng]} icon={mcfMarkerIcon}>
                        <Popup>
                          <strong>Ward MCF Location</strong>
                          <br />
                          {mcfLocationName || `${mcfLat.toFixed(5)}, ${mcfLng.toFixed(5)}`}
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>

                <McfManualCoordinates
                  show={showManualCoords}
                  onToggle={() => setShowManualCoords(!showManualCoords)}
                  coordPaste={manualCoordPaste}
                  onPasteChange={handleManualPasteChange}
                  lat={manualLat}
                  onLatChange={(e) => {
                    setManualLat(e.target.value);
                    setManualCoordError("");
                  }}
                  lng={manualLng}
                  onLngChange={(e) => {
                    setManualLng(e.target.value);
                    setManualCoordError("");
                  }}
                  facilityName={manualFacilityName}
                  onFacilityNameChange={(e) => setManualFacilityName(e.target.value)}
                  error={manualCoordError}
                  onApply={handleApplyManualCoords}
                />

                {mcfLat && mcfLng ? (
                  <div className="wm-mcf-selected-card">
                    <div className="wm-mcf-selected-details">
                      <div className="wm-mcf-selected-title">
                        <CheckCircle2 size={13} color="#16a34a" />
                        Selected MCF Facility
                      </div>
                      <div className="wm-mcf-selected-address">
                        {mcfLocationName || "Material Collection Facility"}
                      </div>
                      <div className="wm-mcf-selected-coords">
                        GPS: {mcfLat.toFixed(6)}, {mcfLng.toFixed(6)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="wm-mcf-clear-btn"
                      onClick={handleClearMcfPin}
                      title="Clear pinned location"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="wm-mcf-unselected-card">
                    <Info size={15} color="#64748b" style={{ flexShrink: 0 }} />
                    <span>No MCF location selected. Click anywhere on the map or search above to place the pin.</span>
                  </div>
                )}
              </div>

              <div className="wm-modal-actions">
                <button
                  type="button"
                  className="wm-btn-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wm-btn-submit"
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "Create Ward"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT WARD MODAL (Preserves existing ID and relationships) */}
      {/* ========================================================= */}
      {editingWard && (
        <div className="wm-modal-overlay" onClick={() => setEditingWard(null)}>
          <div className="wm-modal-box wm-modal-with-map" onClick={(e) => e.stopPropagation()}>
            <div className="wm-modal-header">
              <h2 className="wm-modal-title">Edit Ward {editingWard.ward_number}</h2>
              <button className="wm-modal-close" onClick={() => setEditingWard(null)}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="wm-modal-alert">
                <AlertTriangle size={16} flexShrink={0} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateWard}>
              <div className="wm-form-group">
                <label className="wm-form-label">
                  Ward Number <span className="req">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="wm-form-input"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  required
                />
                <div className="wm-form-hint">
                  Preserves Ward ID #{editingWard.ward_id} and all connected user records.
                </div>
              </div>

              <div className="wm-form-group">
                <label className="wm-form-label">Ward Name</label>
                <input
                  type="text"
                  className="wm-form-input"
                  placeholder="Enter name for this ward..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoFocus
                />
                <div className="wm-form-hint">
                  {editingWard.ward_name
                    ? "Updating this name updates the existing database record."
                    : "Enter a name to assign to this existing ward."}
                </div>
              </div>

              <div className="wm-form-group">
                <label className="wm-form-label">Location / Zone</label>
                <input
                  type="text"
                  className="wm-form-input"
                  placeholder="e.g. Erattupetta / Pala"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                />
                <div className="wm-form-hint">
                  Administrative district or zone classification.
                </div>
              </div>

              {/* MCF Location with interactive map */}
              <div className="wm-form-group">
                <label className="wm-form-label">
                  MCF (Material Collection Facility) Location
                </label>
                <div className="wm-form-hint" style={{ marginBottom: 8 }}>
                  {editingWard.mcf_location_name || editingWard.mcf_latitude
                    ? "Previously saved MCF location is displayed on the map. Click or search to change."
                    : "Pin the material collection facility where waste is sorted and stored."}
                </div>

                <div className="wm-mcf-map-wrapper">
                  <MapContainer
                    center={mcfLat && mcfLng ? [mcfLat, mcfLng] : KERALA_DEFAULT_CENTER}
                    zoom={mcfLat && mcfLng ? 15 : 12}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapLocationSearch
                      onLocationSelect={handleMcfLocationSelect}
                      placeholder="Search MCF facility (e.g. Pala, Kottayam)..."
                      wardContext={formLocation || formName}
                      isMcfSearch={true}
                    />
                    <McfMapEvents onPinSelect={handleMcfLocationSelect} />
                    <McfMapController
                      center={mcfLat && mcfLng ? [mcfLat, mcfLng] : KERALA_DEFAULT_CENTER}
                      zoom={mcfLat && mcfLng ? 15 : 12}
                    />
                    {mcfLat && mcfLng && (
                      <Marker position={[mcfLat, mcfLng]} icon={mcfMarkerIcon}>
                        <Popup>
                          <strong>Ward {editingWard.ward_number} MCF</strong>
                          <br />
                          {mcfLocationName || `${mcfLat.toFixed(5)}, ${mcfLng.toFixed(5)}`}
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>

                <McfManualCoordinates
                  show={showManualCoords}
                  onToggle={() => setShowManualCoords(!showManualCoords)}
                  coordPaste={manualCoordPaste}
                  onPasteChange={handleManualPasteChange}
                  lat={manualLat}
                  onLatChange={(e) => {
                    setManualLat(e.target.value);
                    setManualCoordError("");
                  }}
                  lng={manualLng}
                  onLngChange={(e) => {
                    setManualLng(e.target.value);
                    setManualCoordError("");
                  }}
                  facilityName={manualFacilityName}
                  onFacilityNameChange={(e) => setManualFacilityName(e.target.value)}
                  error={manualCoordError}
                  onApply={handleApplyManualCoords}
                />

                {mcfLat && mcfLng ? (
                  <div className="wm-mcf-selected-card">
                    <div className="wm-mcf-selected-details">
                      <div className="wm-mcf-selected-title">
                        <CheckCircle2 size={13} color="#16a34a" />
                        Selected MCF Facility
                      </div>
                      <div className="wm-mcf-selected-address">
                        {mcfLocationName || "Material Collection Facility"}
                      </div>
                      <div className="wm-mcf-selected-coords">
                        GPS: {mcfLat.toFixed(6)}, {mcfLng.toFixed(6)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="wm-mcf-clear-btn"
                      onClick={handleClearMcfPin}
                      title="Clear pinned location"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="wm-mcf-unselected-card">
                    <Info size={15} color="#64748b" style={{ flexShrink: 0 }} />
                    <span>No MCF location set. Click anywhere on the map or search above to pin a facility.</span>
                  </div>
                )}
              </div>

              <div className="wm-modal-actions">
                <button
                  type="button"
                  className="wm-btn-cancel"
                  onClick={() => setEditingWard(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wm-btn-submit"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE MODAL (Safe check: in-use vs. safe to delete) */}
      {/* ========================================================= */}
      {deleteTargetWard && (
        <div className="wm-modal-overlay" onClick={() => setDeleteTargetWard(null)}>
          <div className="wm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="wm-modal-header">
              <h2 className="wm-modal-title" style={{ color: "var(--red)" }}>
                Delete Ward {deleteTargetWard.ward_number}
              </h2>
              <button className="wm-modal-close" onClick={() => setDeleteTargetWard(null)}>
                <X size={18} />
              </button>
            </div>

            {/* If ward has linked users: BLOCK DELETION */}
            {!deleteTargetWard.can_delete || (deleteTargetWard.user_count || 0) > 0 ? (
              <div>
                <div className="wm-modal-warning-box">
                  <ShieldAlert size={22} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ display: "block", marginBottom: 4 }}>
                      This ward is currently in use and cannot be deleted.
                    </strong>
                    <span>
                      There are currently <b>{deleteTargetWard.user_count}</b> active user(s),
                      pickups, and municipality assignments associated with Ward {deleteTargetWard.ward_number}.
                      Deleting this ward is prohibited to safeguard system integrity and prevent data loss.
                    </span>
                  </div>
                </div>

                <div className="wm-modal-actions">
                  <button
                    type="button"
                    className="wm-btn-cancel"
                    style={{ background: "var(--green-50)", color: "var(--green-700)", borderColor: "var(--green-500)" }}
                    onClick={() => setDeleteTargetWard(null)}
                  >
                    Understood
                  </button>
                </div>
              </div>
            ) : (
              /* If ward has 0 users: SAFE TO DELETE */
              <div>
                <p style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5, margin: "0 0 16px" }}>
                  Are you sure you want to delete <b>Ward {deleteTargetWard.ward_number}</b>
                  {deleteTargetWard.ward_name ? ` (${deleteTargetWard.ward_name})` : ""}?
                </p>
                <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 20px" }}>
                  This ward has 0 linked users and no active operations. This action cannot be undone.
                </p>

                <div className="wm-modal-actions">
                  <button
                    type="button"
                    className="wm-btn-cancel"
                    onClick={() => setDeleteTargetWard(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="wm-btn-danger"
                    onClick={handleConfirmDelete}
                    disabled={submitting}
                  >
                    {submitting ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`wm-toast ${toast.type}`}>
          {toast.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
