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
// Route Optimization (Nearest Neighbor + 2-Opt)
// Fixed starting point: Stop 1 is always the first eligible pickup location.
// Remaining stops (2 to N) are optimized to minimize travel distance.
// ---------------------------------------------------------------------------
export function optimizeRouteStops(validTasks) {
  if (!validTasks || validTasks.length === 0) {
    return { orderedTasks: [], totalDistanceKm: 0 };
  }
  if (validTasks.length === 1) {
    return {
      orderedTasks: [{ ...validTasks[0], stopNumber: 1 }],
      totalDistanceKm: 0,
    };
  }

  const n = validTasks.length;
  // Pre-calculate distance matrix
  const dist = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        dist[i][j] = haversineDistanceKm(
          validTasks[i].lat,
          validTasks[i].lng,
          validTasks[j].lat,
          validTasks[j].lng
        );
      }
    }
  }

  // Step 1: Nearest Neighbor heuristic starting at index 0 (Stop 1)
  const visited = new Set();
  const routeIndices = [0];
  visited.add(0);

  let current = 0;
  while (visited.size < n) {
    let nearest = -1;
    let minD = Infinity;
    for (let candidate = 0; candidate < n; candidate++) {
      if (!visited.has(candidate)) {
        if (dist[current][candidate] < minD) {
          minD = dist[current][candidate];
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

  // Step 2: 2-Opt local search refinement (keeping index 0 fixed)
  let improved = true;
  let iterations = 0;
  const maxIterations = 50;

  const calculateRouteDistance = (indices) => {
    let d = 0;
    for (let i = 0; i < indices.length - 1; i++) {
      d += dist[indices[i]][indices[i + 1]];
    }
    return d;
  };

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // i starts at 1 so index 0 (starting stop) remains fixed
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const d1 = dist[routeIndices[i - 1]][routeIndices[i]];
        const d2 = k + 1 < n ? dist[routeIndices[k]][routeIndices[k + 1]] : 0;
        const d3 = dist[routeIndices[i - 1]][routeIndices[k]];
        const d4 = k + 1 < n ? dist[routeIndices[i]][routeIndices[k + 1]] : 0;

        if (d3 + d4 < d1 + d2 - 1e-6) {
          const reversedSegment = routeIndices.slice(i, k + 1).reverse();
          routeIndices.splice(i, reversedSegment.length, ...reversedSegment);
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  const orderedTasks = routeIndices.map((idx, seq) => ({
    ...validTasks[idx],
    stopNumber: seq + 1,
  }));

  const totalDistanceKm = calculateRouteDistance(routeIndices);

  return {
    orderedTasks,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
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
      // GeoJSON has [lon, lat], Leaflet polyline expects [lat, lon]
      return data.routes[0].geometry.coordinates.map(([lon, lat]) => [
        lat,
        lon,
      ]);
    }
    return null;
  } catch {
    // Non-fatal: direct polyline fallback
    return null;
  }
}

// ---------------------------------------------------------------------------
// Numbered custom map pin using Leaflet DivIcon
// ---------------------------------------------------------------------------
function createNumberedMarkerIcon(number, isFirst, isSelected) {
  const bg = isFirst ? "#15803d" : isSelected ? "#047857" : "#1e6b4e";
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
  date,
  formattedDate,
  onClose,
  onRefresh,
}) {
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [roadPolyline, setRoadPolyline] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const markerRefs = useRef({});

  // 1. Separate valid coordinates vs missing coordinates
  const { validTasks, missingTasks } = useMemo(() => {
    const valid = [];
    const missing = [];

    tasks.forEach((item) => {
      if (String(item?.status || "").toUpperCase() === "CANCELLED") {
        return;
      }
      const lat = item.latitude !== null && item.latitude !== undefined ? Number(item.latitude) : NaN;
      const lng = item.longitude !== null && item.longitude !== undefined ? Number(item.longitude) : NaN;
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        valid.push({
          ...item,
          lat,
          lng,
        });
      } else {
        missing.push(item);
      }
    });

    return { validTasks: valid, missingTasks: missing };
  }, [tasks]);

  // 2. Perform fresh route optimization
  const { orderedTasks, totalDistanceKm } = useMemo(() => {
    return optimizeRouteStops(validTasks);
  }, [validTasks]);

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
    if (orderedTasks.length > 0) {
      return [orderedTasks[0].lat, orderedTasks[0].lng];
    }
    return [9.698, 76.723]; // Default fallback to Kerala Kottayam area
  }, [orderedTasks]);

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

  // Open multi-stop or single stop in Google Maps
  const handleOpenGoogleMapsRoute = () => {
    if (orderedTasks.length === 0) return;
    if (orderedTasks.length === 1) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${orderedTasks[0].lat},${orderedTasks[0].lng}`,
        "_blank"
      );
      return;
    }

    const origin = `${orderedTasks[0].lat},${orderedTasks[0].lng}`;
    const destination = `${orderedTasks[orderedTasks.length - 1].lat},${orderedTasks[orderedTasks.length - 1].lng}`;
    const waypoints = orderedTasks
      .slice(1, -1)
      .map((t) => `${t.lat},${t.lng}`)
      .join("|");

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${waypoints}` : ""
    }&travelmode=driving`;

    window.open(url, "_blank");
  };

  const handleStopClick = (task) => {
    setSelectedStopId(task.id);
    const ref = markerRefs.current[task.id];
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
                Optimized Route
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
              Sequence of <strong>{orderedTasks.length}</strong> pickup {orderedTasks.length === 1 ? "stop" : "stops"}
              {totalDistanceKm > 0 ? ` (~${totalDistanceKm} km total trip)` : ""}
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

            {orderedTasks.length > 0 && (
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
                title="Launch Google Maps with this multi-stop route"
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

        {/* WARNING BANNER FOR MISSING COORDINATES */}
        {missingTasks.length > 0 && (
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
            <AlertTriangle size={16} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <strong>Note:</strong> {missingTasks.length} assigned task(s) could not be plotted on the route due to missing GPS coordinates:
              {" "}
              {missingTasks.map((t, idx) => (
                <span key={t.id}>
                  #{t.id} ({t.pickup || t.location_name || "N/A"}){idx < missingTasks.length - 1 ? ", " : ""}
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
            {orderedTasks.length === 0 ? (
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
                <div style={{ fontWeight: 600, fontSize: 15, color: "#374151" }}>
                  No pickup locations available to optimize for this date.
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  Ensure pickup requests have valid coordinates assigned.
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
                      dashArray: roadPolyline ? null : "6, 8", // dashed if straight-line fallback
                    }}
                  />
                )}

                {/* Numbered Stops Markers */}
                {orderedTasks.map((task) => {
                  const isFirst = task.stopNumber === 1;
                  const isSelected = selectedStopId === task.id;

                  return (
                    <Marker
                      key={task.id}
                      position={[task.lat, task.lng]}
                      icon={createNumberedMarkerIcon(task.stopNumber, isFirst, isSelected)}
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
                              background: isFirst ? "#15803d" : "#1e6b4e",
                              color: "#ffffff",
                              fontSize: 11,
                              fontWeight: 700,
                              borderRadius: 4,
                              padding: "2px 6px",
                              marginBottom: 6,
                            }}
                          >
                            {isFirst ? "🏁 STOP 1 (START)" : `STOP ${task.stopNumber}`}
                          </div>

                          <div style={{ fontWeight: 700, fontSize: 14, color: "#1f2937", marginBottom: 4 }}>
                            Pickup Request #{task.id}
                          </div>

                          <div style={{ fontSize: 12.5, color: "#374151", marginBottom: 4 }}>
                            📍 {task.pickup || task.location_name}
                          </div>

                          {task.ward && (
                            <div style={{ fontSize: 12, color: "#4c7a2e", fontWeight: 600, marginBottom: 2 }}>
                              {task.ward}
                            </div>
                          )}

                          {task.userName && (
                            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                              👤 Resident: <strong>{task.userName}</strong>
                            </div>
                          )}

                          {task.wasteType && (
                            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
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
              <div style={{ fontWeight: 700, fontSize: 13, color: "#2f4a1c", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Stop Sequence
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
              {orderedTasks.length === 0 ? (
                <div style={{ padding: "20px 0", textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                  No stops available.
                </div>
              ) : (
                orderedTasks.map((t, idx) => {
                  const isSelected = selectedStopId === t.id;
                  const isFirst = t.stopNumber === 1;
                  const isLast = t.stopNumber === orderedTasks.length;

                  return (
                    <div key={t.id} style={{ marginBottom: 8, position: "relative" }}>
                      <div
                        onClick={() => handleStopClick(t)}
                        role="button"
                        tabIndex={0}
                        style={{
                          border: isSelected ? "1.5px solid #1e6b4e" : "1px solid #e2f0d9",
                          borderRadius: 10,
                          padding: "10px 12px",
                          background: isSelected ? "#f4faf1" : "#ffffff",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          {/* STOP BADGE */}
                          <div
                            style={{
                              background: isFirst ? "#15803d" : "#1e6b4e",
                              color: "#ffffff",
                              borderRadius: "50%",
                              width: 24,
                              height: 24,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {t.stopNumber}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: 13, color: "#1f2e22" }}>
                                Pickup #{t.id}
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
                                  Start
                                </span>
                              )}
                              {isLast && orderedTasks.length > 1 && (
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
                                  End
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
                      {!isLast && (
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
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>Total Stops:</span>
                <strong style={{ color: "#1f2e22" }}>{orderedTasks.length}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Estimated Distance:</span>
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
