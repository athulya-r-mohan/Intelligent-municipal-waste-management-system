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
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Compass,
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
// Calculate bearing between two lat/lng coordinates (in degrees 0-360)
// ---------------------------------------------------------------------------
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

// ---------------------------------------------------------------------------
// Interpolate position and bearing smoothly along an array of [lat, lng]
// ---------------------------------------------------------------------------
export function interpolatePositionAlongPath(coords, t) {
  if (!coords || coords.length === 0) return null;
  if (coords.length === 1 || t <= 0) {
    const bearing =
      coords.length > 1
        ? calculateBearing(coords[0][0], coords[0][1], coords[1][0], coords[1][1])
        : 0;
    return {
      lat: coords[0][0],
      lng: coords[0][1],
      bearing,
      traversedCoords: [coords[0]],
    };
  }
  if (t >= 1) {
    const last = coords[coords.length - 1];
    const prev = coords[coords.length - 2] || last;
    const bearing = calculateBearing(prev[0], prev[1], last[0], last[1]);
    return {
      lat: last[0],
      lng: last[1],
      bearing,
      traversedCoords: coords,
    };
  }

  // Pre-calculate cumulative segment distances
  let totalDist = 0;
  const segDists = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const d = haversineDistanceKm(
      coords[i][0],
      coords[i][1],
      coords[i + 1][0],
      coords[i + 1][1]
    );
    segDists.push(d);
    totalDist += d;
  }

  if (totalDist === 0) {
    return {
      lat: coords[0][0],
      lng: coords[0][1],
      bearing: 0,
      traversedCoords: [coords[0]],
    };
  }

  const targetDist = t * totalDist;
  let accum = 0;
  const traversed = [coords[0]];

  for (let i = 0; i < segDists.length; i++) {
    const nextAccum = accum + segDists[i];
    if (targetDist <= nextAccum || i === segDists.length - 1) {
      const segT = segDists[i] > 0 ? (targetDist - accum) / segDists[i] : 0;
      const lat = coords[i][0] + (coords[i + 1][0] - coords[i][0]) * segT;
      const lng = coords[i][1] + (coords[i + 1][1] - coords[i][1]) * segT;
      const bearing = calculateBearing(
        coords[i][0],
        coords[i][1],
        coords[i + 1][0],
        coords[i + 1][1]
      );
      traversed.push([lat, lng]);
      return {
        lat,
        lng,
        bearing,
        traversedCoords: traversed,
      };
    }
    accum = nextAccum;
    traversed.push(coords[i + 1]);
  }

  return {
    lat: coords[coords.length - 1][0],
    lng: coords[coords.length - 1][1],
    bearing: 0,
    traversedCoords: coords,
  };
}

// ---------------------------------------------------------------------------
// Municipal Green Waste Collection Van Marker Icon
// ---------------------------------------------------------------------------
export function createVanMarkerIcon(bearing = 0, isCollecting = false) {
  const roundedBearing = Math.round(bearing);
  return L.divIcon({
    className: "custom-demo-van-marker",
    html: `
      <div style="
        position: relative;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${
          isCollecting
            ? `<div style="
                position: absolute;
                top: -24px;
                left: 50%;
                transform: translateX(-50%);
                background: #064e3b;
                color: #ffffff;
                font-size: 10px;
                font-weight: 700;
                padding: 2px 7px;
                border-radius: 12px;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                border: 1.5px solid #34d399;
                display: flex;
                align-items: center;
                gap: 4px;
                z-index: 100;
              ">♻ Collecting...</div>`
            : ""
        }
        <div style="
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.32);
          border: 2.5px solid #15803d;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${roundedBearing}deg);
          transition: transform 0.1s linear;
        ">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5.5" y="3" width="13" height="18" rx="2.5" fill="#15803d"/>
            <rect x="7" y="5" width="10" height="3.5" rx="1" fill="#bae6fd"/>
            <rect x="6.5" y="10" width="11" height="9.5" rx="1.5" fill="#166534"/>
            <path d="M12 11.8L13.8 14.5H10.2L12 11.8Z" fill="#86efac" />
            <circle cx="12" cy="15.8" r="1.3" fill="#86efac" />
            <rect x="6" y="2" width="2.5" height="1.5" rx="0.5" fill="#fef08a"/>
            <rect x="15.5" y="2" width="2.5" height="1.5" rx="0.5" fill="#fef08a"/>
            <rect x="4" y="5" width="1.5" height="3" rx="0.5" fill="#1f2937"/>
            <rect x="18.5" y="5" width="1.5" height="3" rx="0.5" fill="#1f2937"/>
            <rect x="4" y="15.5" width="1.5" height="3" rx="0.5" fill="#1f2937"/>
            <rect x="18.5" y="15.5" width="1.5" height="3" rx="0.5" fill="#1f2937"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

// ---------------------------------------------------------------------------
// Pulsing ring marker for upcoming pickup destination
// ---------------------------------------------------------------------------
export function createTargetDestinationIcon(stopNumber, isMcf = false) {
  return L.divIcon({
    className: "custom-target-marker",
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid #10b981;
          background: rgba(16, 185, 129, 0.25);
          animation: demoPulseRing 1.4s ease-out infinite;
        "></div>
        <div style="
          position: relative;
          background: ${isMcf ? "#064e3b" : "#10b981"};
          color: #ffffff;
          width: 32px;
          height: 32px;
          border-radius: ${isMcf ? "8px" : "50%"};
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 12px;
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
        ">
          ${isMcf ? "MCF" : stopNumber}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

// ---------------------------------------------------------------------------
// Camera Auto-Pan helper for Demo Route
// ---------------------------------------------------------------------------
function DemoCameraPan({ targetPos, active }) {
  const map = useMap();
  useEffect(() => {
    if (active && targetPos) {
      const bounds = map.getBounds();
      const latLng = L.latLng(targetPos.lat, targetPos.lng);
      if (!bounds.contains(latLng)) {
        map.panTo(latLng, { animate: true, duration: 0.5 });
      }
    }
  }, [map, active, targetPos]);
  return null;
}

// ---------------------------------------------------------------------------
// Optional OSRM road geometry fetch (with 4-second timeout & safe fallback)
// ---------------------------------------------------------------------------
export async function fetchOsrmRoadGeometry(orderedTasks) {
  if (!orderedTasks || orderedTasks.length < 2) return null;
  try {
    const coordsStr = orderedTasks.map((t) => `${t.lng},${t.lat}`).join(";");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=true`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map(([lon, lat]) => [
        lat,
        lon,
      ]);

      // Parse structured legs between each sequential stop pair
      const parsedLegs = (route.legs || []).map((leg, legIdx) => {
        const legCoords = [];
        const steps = [];

        (leg.steps || []).forEach((step) => {
          const stepCoords = [];
          if (step.geometry && Array.isArray(step.geometry.coordinates)) {
            step.geometry.coordinates.forEach(([lon, lat]) => {
              stepCoords.push([lat, lon]);
              if (
                legCoords.length === 0 ||
                legCoords[legCoords.length - 1][0] !== lat ||
                legCoords[legCoords.length - 1][1] !== lon
              ) {
                legCoords.push([lat, lon]);
              }
            });
          }

          // Generate human-friendly turn maneuver description without inventing road names
          let turnDescription;
          const maneuverType = step.maneuver?.type || "";
          const modifier = step.maneuver?.modifier || "";
          const roadName = step.name?.trim() || "";

          if (maneuverType === "depart") {
            turnDescription = roadName
              ? `Depart onto ${roadName}`
              : "Depart on route";
          } else if (maneuverType === "arrive") {
            turnDescription = "Arrive at destination stop";
          } else if (maneuverType === "turn") {
            turnDescription = modifier
              ? `Turn ${modifier} onto ${roadName || "road"}`
              : `Turn onto ${roadName || "road"}`;
          } else if (maneuverType === "roundabout") {
            turnDescription = `Take roundabout onto ${roadName || "road"}`;
          } else if (maneuverType === "end of road") {
            turnDescription = modifier
              ? `At end of road, turn ${modifier} onto ${roadName || "road"}`
              : `At end of road onto ${roadName || "road"}`;
          } else if (maneuverType === "fork") {
            turnDescription = modifier
              ? `Keep ${modifier} at fork onto ${roadName || "road"}`
              : `Take fork onto ${roadName || "road"}`;
          } else {
            turnDescription = roadName
              ? `Continue on ${roadName}`
              : "Continue ahead";
          }

          steps.push({
            name: roadName || "Unnamed Road",
            isUnnamed: !roadName,
            maneuverType,
            modifier,
            turnDescription,
            distanceMeters: step.distance || 0,
            durationSeconds: step.duration || 0,
            coordinates: stepCoords,
          });
        });

        return {
          legIndex: legIdx,
          distanceMeters: leg.distance || 0,
          durationSeconds: leg.duration || 0,
          coordinates: legCoords.length > 0 ? legCoords : coordinates,
          steps,
        };
      });

      return {
        coordinates,
        legs: parsedLegs,
        waypoints: data.waypoints || [],
        hasTurnData: parsedLegs.some((l) => l.steps.length > 0),
      };
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
  const [osrmRouteData, setOsrmRouteData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const markerRefs = useRef({});

  // Demo Route States (frontend simulation only - zero backend mutations)
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoSpeed, setDemoSpeed] = useState(1); // 1x, 2x, 4x
  const [currentLegIndex, setCurrentLegIndex] = useState(0);
  const [progressInLeg, setProgressInLeg] = useState(0); // 0 to 1
  const [vanPosition, setVanPosition] = useState(null); // { lat, lng, bearing }
  const [traveledLegCoords, setTraveledLegCoords] = useState([]);
  const [isPausedAtStop, setIsPausedAtStop] = useState(false);
  const [isDemoCompleted, setIsDemoCompleted] = useState(false);
  const [visitedStopIds, setVisitedStopIds] = useState(new Set());
  const [demoWarning, setDemoWarning] = useState(null);

  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);
  const pauseTimeoutRef = useRef(null);
  const stopCardRefs = useRef({});
  const progressInLegRef = useRef(0);
  const prevRouteTaskKeyRef = useRef("");

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
      fetchOsrmRoadGeometry(orderedTasks).then((result) => {
        if (isCurrent) {
          if (result && result.coordinates) {
            setRoadPolyline(result.coordinates);
            setOsrmRouteData(result);
          } else if (Array.isArray(result)) {
            setRoadPolyline(result);
            setOsrmRouteData(null);
          } else {
            setRoadPolyline(null);
            setOsrmRouteData(null);
          }
        }
      });
    } else {
      setRoadPolyline(null);
      setOsrmRouteData(null);
    }
    return () => {
      isCurrent = false;
    };
  }, [orderedTasks]);

  // Stop animation and reset refs
  const stopAnimation = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    lastTimeRef.current = null;
  };

  const handleExitDemo = () => {
    stopAnimation();
    progressInLegRef.current = 0;
    setIsDemoActive(false);
    setIsPlaying(false);
    setCurrentLegIndex(0);
    setProgressInLeg(0);
    setVanPosition(null);
    setTraveledLegCoords([]);
    setIsPausedAtStop(false);
    setIsDemoCompleted(false);
    setVisitedStopIds(new Set());
    setDemoWarning(null);
  };

  // Safe modal close handler that cleans up demo animation before calling onClose
  const handleCloseModal = () => {
    handleExitDemo();
    onClose();
  };

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, []);

  // Unique signature of ordered stops (only changes if stops/order actually change)
  const routeTaskKey = useMemo(() => {
    return (orderedTasks || []).map((t) => t.id).join(",");
  }, [orderedTasks]);

  // Clean up demo when route stops actually change (Fix 1: not on isDemoActive toggle)
  useEffect(() => {
    if (!prevRouteTaskKeyRef.current) {
      prevRouteTaskKeyRef.current = routeTaskKey;
      return;
    }
    if (prevRouteTaskKeyRef.current !== routeTaskKey) {
      prevRouteTaskKeyRef.current = routeTaskKey;
      handleExitDemo();
    }
  }, [routeTaskKey]);

  // Current target stop in demo preview
  const currentTargetStop = useMemo(() => {
    if (!isDemoActive) return null;
    return orderedTasks[currentLegIndex + 1] || null;
  }, [isDemoActive, orderedTasks, currentLegIndex]);

  // Current road & turn information for Demo HUD (Requirements 5 & 13)
  const currentStepInfo = useMemo(() => {
    if (!isDemoActive || !osrmRouteData?.legs || !osrmRouteData.legs[currentLegIndex]) {
      return null;
    }
    const leg = osrmRouteData.legs[currentLegIndex];
    const steps = leg.steps || [];
    if (steps.length === 0) {
      return {
        name: "Verified Road Route",
        turnDescription: `Proceeding to ${orderedTasks[currentLegIndex + 1]?.pickup || "next stop"}`,
        isUnnamed: false,
      };
    }

    const currentDist = progressInLeg * (leg.distanceMeters || 1000);
    let accum = 0;
    for (let i = 0; i < steps.length; i++) {
      accum += steps[i].distanceMeters;
      if (currentDist <= accum || i === steps.length - 1) {
        return steps[i];
      }
    }
    return steps[0];
  }, [isDemoActive, osrmRouteData, currentLegIndex, progressInLeg, orderedTasks]);

  // Animation frame loop using requestAnimationFrame (Fix 2: safe ref-based animation loop)
  useEffect(() => {
    if (!isDemoActive || !isPlaying || isPausedAtStop || isDemoCompleted) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const legs = osrmRouteData?.legs || [];
    if (!legs || legs.length === 0 || currentLegIndex >= legs.length) {
      return;
    }

    const currentLeg = legs[currentLegIndex];
    const legCoords = currentLeg.coordinates || [];
    if (legCoords.length < 2) return;

    // Practical preview duration: ~2.8s to 5.5s per leg at 1x
    const legDist = currentLeg.distanceMeters || 1000;
    const baseDurationMs = Math.max(2800, Math.min(5500, legDist * 1.8));

    const step = (timestamp) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const deltaMs = (timestamp - lastTimeRef.current) * demoSpeed;
      lastTimeRef.current = timestamp;

      progressInLegRef.current += deltaMs / baseDurationMs;
      const currentProgress = progressInLegRef.current;

      if (currentProgress >= 1) {
        progressInLegRef.current = 1;
        setProgressInLeg(1);

        const destStop = orderedTasks[currentLegIndex + 1];
        const isFinalStop = currentLegIndex + 1 >= orderedTasks.length - 1;

        // Snap van to destination coordinate
        const lastCoord = legCoords[legCoords.length - 1];
        const prevCoord = legCoords[legCoords.length - 2] || lastCoord;
        const brng = calculateBearing(prevCoord[0], prevCoord[1], lastCoord[0], lastCoord[1]);
        setVanPosition({ lat: lastCoord[0], lng: lastCoord[1], bearing: brng });
        setTraveledLegCoords(legCoords);

        if (isFinalStop) {
          // Arrived at Ward MCF Return Depot
          setIsDemoCompleted(true);
          setIsPlaying(false);
          if (destStop) {
            setVisitedStopIds((prev) => new Set([...prev, destStop.id]));
          }
          return;
        }

        // Intermediate pickup arrival: brief pause for waste collection
        setIsPausedAtStop(true);
        if (destStop) {
          setVisitedStopIds((prev) => new Set([...prev, destStop.id]));
        }

        pauseTimeoutRef.current = setTimeout(() => {
          progressInLegRef.current = 0;
          setProgressInLeg(0);
          setTraveledLegCoords([]);
          setIsPausedAtStop(false);
          setCurrentLegIndex((prevIdx) => prevIdx + 1);
          lastTimeRef.current = null;
        }, 1500 / demoSpeed);

        return;
      }

      // Safe update outside setState updater
      setProgressInLeg(currentProgress);
      const interp = interpolatePositionAlongPath(legCoords, currentProgress);
      if (interp) {
        setVanPosition({ lat: interp.lat, lng: interp.lng, bearing: interp.bearing });
        setTraveledLegCoords(interp.traversedCoords);
      }

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [
    isDemoActive,
    isPlaying,
    isPausedAtStop,
    isDemoCompleted,
    currentLegIndex,
    demoSpeed,
    osrmRouteData,
    orderedTasks,
  ]);

  // Auto scroll route sequence panel to keep current upcoming destination in view
  useEffect(() => {
    if (isDemoActive && orderedTasks[currentLegIndex + 1]) {
      const targetId = orderedTasks[currentLegIndex + 1].id;
      const cardEl = stopCardRefs.current[targetId];
      if (cardEl && typeof cardEl.scrollIntoView === "function") {
        cardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [isDemoActive, currentLegIndex, orderedTasks]);

  // Demo Route toggle
  const handleToggleDemoRoute = () => {
    if (isDemoActive) {
      handleExitDemo();
      return;
    }

    // Requirement 4 & 13: Do not animate straight-line fallbacks if verified road geometry is unavailable
    if (
      !osrmRouteData ||
      !osrmRouteData.coordinates ||
      osrmRouteData.coordinates.length < 2 ||
      !osrmRouteData.legs ||
      osrmRouteData.legs.length === 0
    ) {
      setDemoWarning(
        "Verified road geometry is currently unavailable from the routing service. Real-road route preview requires verified road geometry and cannot be simulated on straight lines. The static route map remains active."
      );
      return;
    }

    setDemoWarning(null);
    progressInLegRef.current = 0;
    setCurrentLegIndex(0);
    setProgressInLeg(0);
    setIsPausedAtStop(false);
    setIsDemoCompleted(false);
    setVisitedStopIds(new Set(["mcf-start"]));

    // Position van at MCF start
    const firstLeg = osrmRouteData.legs[0];
    const firstCoord = firstLeg?.coordinates?.[0] || [mcfLat, mcfLng];
    const secondCoord = firstLeg?.coordinates?.[1] || firstCoord;
    const initialBearing = calculateBearing(
      firstCoord[0],
      firstCoord[1],
      secondCoord[0],
      secondCoord[1]
    );

    setVanPosition({
      lat: firstCoord[0],
      lng: firstCoord[1],
      bearing: initialBearing,
    });
    setTraveledLegCoords([firstCoord]);
    setIsDemoActive(true);
    setIsPlaying(true);
  };

  const handleRestartDemo = () => {
    stopAnimation();
    if (!osrmRouteData?.legs || osrmRouteData.legs.length === 0) return;
    progressInLegRef.current = 0;
    setCurrentLegIndex(0);
    setProgressInLeg(0);
    setIsPausedAtStop(false);
    setIsDemoCompleted(false);
    setVisitedStopIds(new Set(["mcf-start"]));

    const firstLeg = osrmRouteData.legs[0];
    const firstCoord = firstLeg?.coordinates?.[0] || [mcfLat, mcfLng];
    const secondCoord = firstLeg?.coordinates?.[1] || firstCoord;
    const initialBearing = calculateBearing(
      firstCoord[0],
      firstCoord[1],
      secondCoord[0],
      secondCoord[1]
    );

    setVanPosition({
      lat: firstCoord[0],
      lng: firstCoord[1],
      bearing: initialBearing,
    });
    setTraveledLegCoords([firstCoord]);
    setIsPlaying(true);
  };

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

  // Handle live re-optimization (exits demo route immediately to prevent stale animations)
  const handleLiveRecalculate = async () => {
    if (isRefreshing || !onRefresh) return;
    handleExitDemo();
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
      onClick={handleCloseModal}
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

            {/* DEMO ROUTE BUTTON: Immediately next to Recalculate Live */}
            {hasValidMcf && intermediatePickups.length > 0 && (
              <button
                type="button"
                onClick={handleToggleDemoRoute}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: isDemoActive ? "#064e3b" : "#2e7d32",
                  border: isDemoActive ? "1.5px solid #34d399" : "none",
                  color: "#ffffff",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: isDemoActive
                    ? "0 0 10px rgba(52, 211, 153, 0.45)"
                    : "0 2px 4px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.2s ease",
                }}
                title={
                  isDemoActive
                    ? "Exit Demo Route preview"
                    : "Launch animated visual preview of the calculated route"
                }
              >
                <Play
                  size={12}
                  fill={isDemoActive ? "#34d399" : "#ffffff"}
                  color={isDemoActive ? "#34d399" : "#ffffff"}
                />
                {isDemoActive ? "Demo Route (Active)" : "Demo Route"}
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
              onClick={handleCloseModal}
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

        {/* DEMO ROUTE WARNING / ROAD GEOMETRY LIMITATION BANNER (Requirement 4 & 13) */}
        {demoWarning && (
          <div
            style={{
              padding: "10px 18px",
              background: "#fffbeb",
              borderBottom: "1px solid #fde68a",
              color: "#92400e",
              fontSize: 12.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle
                size={16}
                color="#d97706"
                style={{ flexShrink: 0 }}
              />
              <span>{demoWarning}</span>
            </div>
            <button
              type="button"
              onClick={() => setDemoWarning(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#92400e",
                fontWeight: 700,
                padding: "2px 6px",
              }}
              title="Dismiss warning"
            >
              <X size={14} />
            </button>
          </div>
        )}

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
              <>
                {/* INJECT ANIMATION KEYFRAMES & LEAFLET DIVICON RESETS */}
                <style>{`
                  .custom-demo-van-marker {
                    background: transparent !important;
                    border: none !important;
                  }
                  .custom-target-marker {
                    background: transparent !important;
                    border: none !important;
                  }
                  .custom-mcf-marker {
                    background: transparent !important;
                    border: none !important;
                  }
                  .custom-route-marker {
                    background: transparent !important;
                    border: none !important;
                  }
                  @keyframes demoPulseRing {
                    0% { transform: scale(0.85); opacity: 0.95; }
                    50% { transform: scale(1.4); opacity: 0.35; }
                    100% { transform: scale(0.85); opacity: 0.95; }
                  }
                `}</style>

                {/* DEMO ROUTE CONTROL HUD & REAL-ROAD TURN DIRECTIONS (Requirements 2, 5, 6, 9, 13) */}
                {isDemoActive && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      right: 10,
                      zIndex: 999,
                      background: "rgba(255, 255, 255, 0.96)",
                      backdropFilter: "blur(6px)",
                      borderRadius: 12,
                      boxShadow: "0 6px 20px rgba(0, 0, 0, 0.16)",
                      border: "1.5px solid #a7f3d0",
                      padding: "10px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {/* ROW 1: Controls & Route Status */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            background: isDemoCompleted
                              ? "#0369a1"
                              : isPausedAtStop
                              ? "#d97706"
                              : isPlaying
                              ? "#15803d"
                              : "#4b5563",
                            color: "#ffffff",
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.03em",
                            textTransform: "uppercase",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {isDemoCompleted
                            ? "🏁 Completed"
                            : isPausedAtStop
                            ? "♻ Collecting"
                            : isPlaying
                            ? "▶ En Route"
                            : "⏸ Paused"}
                        </div>

                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1f2937" }}>
                          {isDemoCompleted ? (
                            <span>Returned to Ward MCF Depot</span>
                          ) : isPausedAtStop ? (
                            <span>
                              Stop {currentTargetStop?.stopNumber}: {currentTargetStop?.pickup || currentTargetStop?.location_name}
                            </span>
                          ) : currentTargetStop ? (
                            <span>
                              Heading to Stop {currentTargetStop.stopNumber}: {currentTargetStop.pickup || currentTargetStop.location_name}
                            </span>
                          ) : (
                            <span>Demo Route Preview</span>
                          )}
                        </div>
                      </div>

                      {/* Playback Controls */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {/* Play / Pause */}
                        <button
                          type="button"
                          onClick={() => setIsPlaying(!isPlaying)}
                          disabled={isDemoCompleted}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            background: isPlaying ? "#fef3c7" : "#dcfce7",
                            color: isPlaying ? "#92400e" : "#166534",
                            border: isPlaying ? "1px solid #fde68a" : "1px solid #86efac",
                            padding: "5px 10px",
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: isDemoCompleted ? "not-allowed" : "pointer",
                            opacity: isDemoCompleted ? 0.5 : 1,
                          }}
                          title={isPlaying ? "Pause animation" : "Resume animation"}
                        >
                          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                          {isPlaying ? "Pause" : "Play"}
                        </button>

                        {/* Restart */}
                        <button
                          type="button"
                          onClick={handleRestartDemo}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            background: "#ffffff",
                            color: "#374151",
                            border: "1px solid #d1d5db",
                            padding: "5px 9px",
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          title="Restart route preview from Ward MCF"
                        >
                          <RotateCcw size={12} />
                          Restart
                        </button>

                        {/* Speed Selector (1x, 2x, 4x) */}
                        <div
                          style={{
                            display: "inline-flex",
                            background: "#f3f4f6",
                            borderRadius: 6,
                            padding: 2,
                            gap: 2,
                          }}
                        >
                          {[1, 2, 4].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => setDemoSpeed(spd)}
                              style={{
                                background: demoSpeed === spd ? "#1e6b4e" : "transparent",
                                color: demoSpeed === spd ? "#ffffff" : "#4b5563",
                                border: "none",
                                borderRadius: 4,
                                padding: "3px 7px",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              title={`Set speed to ${spd}x`}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>

                        {/* Exit Demo */}
                        <button
                          type="button"
                          onClick={handleExitDemo}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            background: "#f3f4f6",
                            color: "#4b5563",
                            border: "1px solid #e5e7eb",
                            padding: "5px 9px",
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: "pointer",
                            marginLeft: 4,
                          }}
                          title="Exit route preview"
                        >
                          <X size={12} />
                          Exit
                        </button>
                      </div>
                    </div>

                    {/* ROW 2: Road & Turn Directions + Progress Bar (Requirements 5 & 13) */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 8,
                        paddingTop: 4,
                        borderTop: "1px solid #f0fdf4",
                        fontSize: 11.5,
                        color: "#374151",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 200 }}>
                        <Compass size={13} color="#15803d" style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: "#166534" }}>
                          {currentStepInfo?.turnDescription || "Follow road route"}
                        </span>
                        <span style={{ color: "#6b7280" }}>•</span>
                        <span style={{ color: "#1f2937", fontWeight: 500 }}>
                          {currentStepInfo?.name || "Unnamed Road"}
                          {currentStepInfo?.isUnnamed && (
                            <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 4 }}>
                              (unnamed in OpenStreetMap)
                            </span>
                          )}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
                        <span style={{ color: "#52793f", fontWeight: 600 }}>
                          Leg {Math.min(currentLegIndex + 1, osrmRouteData?.legs?.length || 1)} of {osrmRouteData?.legs?.length || 1}
                        </span>
                        <div
                          style={{
                            width: 80,
                            height: 6,
                            background: "#e5e7eb",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  ((currentLegIndex + (isPausedAtStop ? 1 : progressInLeg)) /
                                    Math.max(1, osrmRouteData?.legs?.length || 1)) *
                                    100
                                )
                              )}%`,
                              height: "100%",
                              background: "#10b981",
                              transition: "width 0.2s ease-out",
                            }}
                          />
                        </div>
                        <span style={{ color: "#9ca3af", fontSize: 10 }}>
                          Preview only (non-tracking)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

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

                  {/* Auto pan camera if van moves out of view */}
                  <DemoCameraPan targetPos={vanPosition} active={isDemoActive && isPlaying} />

                  {/* Connecting Polyline: Dimmed base line when demo is active */}
                  {activePolylineCoords && activePolylineCoords.length >= 2 && (
                    <Polyline
                      positions={activePolylineCoords}
                      pathOptions={{
                        color: isDemoActive ? "#94a3b8" : "#1e6b4e",
                        weight: isDemoActive ? 3.5 : 4,
                        opacity: isDemoActive ? 0.4 : 0.85,
                        dashArray: isDemoActive || !roadPolyline ? "6, 8" : null,
                      }}
                    />
                  )}

                  {/* Highlighted current active leg road polyline (Requirement 6) */}
                  {isDemoActive &&
                    osrmRouteData?.legs?.[currentLegIndex]?.coordinates && (
                      <Polyline
                        positions={osrmRouteData.legs[currentLegIndex].coordinates}
                        pathOptions={{
                          color: "#10b981",
                          weight: 6,
                          opacity: 0.95,
                        }}
                      />
                    )}

                  {/* Traveled portion of current active leg */}
                  {isDemoActive &&
                    traveledLegCoords &&
                    traveledLegCoords.length >= 2 && (
                      <Polyline
                        positions={traveledLegCoords}
                        pathOptions={{
                          color: "#064e3b",
                          weight: 6,
                          opacity: 1,
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

                {/* Pulsing Highlight for upcoming pickup destination (Requirement 6) */}
                {isDemoActive && currentTargetStop && (
                  <Marker
                    position={[currentTargetStop.lat, currentTargetStop.lng]}
                    icon={createTargetDestinationIcon(
                      currentTargetStop.stopNumber,
                      currentTargetStop.isMcf
                    )}
                    zIndexOffset={900}
                  />
                )}

                {/* Animated Green Municipal Waste Collection Van (Requirement 1, 2, 7) */}
                {isDemoActive && vanPosition && (
                  <Marker
                    position={[vanPosition.lat, vanPosition.lng]}
                    icon={createVanMarkerIcon(
                      vanPosition.bearing,
                      isPausedAtStop
                    )}
                    zIndexOffset={1000}
                  />
                )}
              </MapContainer>
            </>
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
                  const isCurrentTarget = isDemoActive && currentTargetStop?.id === t.id;
                  const isVisited = isDemoActive && visitedStopIds.has(t.id);

                  return (
                    <div
                      key={t.id}
                      ref={(el) => {
                        if (el) stopCardRefs.current[t.id] = el;
                      }}
                      style={{ marginBottom: 8, position: "relative" }}
                    >
                      <div
                        onClick={() => handleStopClick(t)}
                        role="button"
                        tabIndex={0}
                        style={{
                          border: isCurrentTarget
                            ? "2px solid #10b981"
                            : isSelected
                            ? "1.5px solid #1e6b4e"
                            : isFirst || isLast
                            ? "1px solid #a7f3d0"
                            : "1px solid #e2f0d9",
                          borderRadius: 10,
                          padding: "10px 12px",
                          background: isCurrentTarget
                            ? "#ecfdf5"
                            : isSelected
                            ? "#f4faf1"
                            : isFirst || isLast
                            ? "#f0fdf4"
                            : "#ffffff",
                          boxShadow: isCurrentTarget
                            ? "0 0 10px rgba(16, 185, 129, 0.25)"
                            : "none",
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
                                isCurrentTarget
                                  ? "#10b981"
                                  : isFirst || isLast
                                  ? "#064e3b"
                                  : "#1e6b4e",
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
                              {isCurrentTarget && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#065f46",
                                    background: "#a7f3d0",
                                    padding: "1px 6px",
                                    borderRadius: 10,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.02em",
                                  }}
                                >
                                  {isPausedAtStop ? "Collecting..." : "Upcoming Target"}
                                </span>
                              )}
                              {isVisited && !isCurrentTarget && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#166534",
                                    background: "#dcfce7",
                                    padding: "1px 6px",
                                    borderRadius: 10,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.02em",
                                  }}
                                >
                                  ✓ Visited
                                </span>
                              )}
                              {isFirst && !isCurrentTarget && !isVisited && (
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
                              {isLast && !isCurrentTarget && !isVisited && (
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
