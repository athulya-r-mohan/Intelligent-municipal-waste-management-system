import React, { useState, useRef } from "react";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "../components/Pickuprequestform.css";

import {
  ArrowLeft,
  Activity,
  Upload,
  X,
  Plus,
  Navigation,
  MapPin,
  Truck,
  Trash2,
  CheckCircle2,
} from "lucide-react";

// --------------------------------------------------
// REVERSE GEOCODING
// --------------------------------------------------
const getPlaceName = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    );

    const data = await response.json();

    if (data.display_name) {
      return data.display_name;
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

// --------------------------------------------------
// MAP CLICK HANDLER
// --------------------------------------------------
function LocationPicker({
  locationMode,
  setPinPosition,
  setLocationText,
}) {
  useMapEvents({
    click: async (e) => {
      if (locationMode !== "pick") return;

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      setPinPosition({
        lat,
        lng,
      });

      setLocationText("Finding location...");

      const placeName = await getPlaceName(lat, lng);

      setLocationText(placeName);
    },
  });

  return null;
}

// --------------------------------------------------
// MAP CONTROLLER
// --------------------------------------------------
function MapController({ currentLocation }) {
  const map = useMap();

  React.useEffect(() => {
    if (currentLocation) {
      map.flyTo(
        [currentLocation.lat, currentLocation.lng],
        16,
        {
          duration: 1.5,
        }
      );
    }
  }, [currentLocation, map]);

  return null;
}

// ==================================================
// MAIN COMPONENT
// ==================================================
export default function EcoPulseWastePickup({
  onBack = () => {},
}) {
  // ------------------------------------------------
  // STATES
  // ------------------------------------------------

  const [images, setImages] = useState([]);

  // 'current' | 'pick' | null
  const [locationMode, setLocationMode] = useState(null);

  // Current GPS location
  const [currentLocation, setCurrentLocation] = useState(null);

  // Manually selected location
  const [pinPosition, setPinPosition] = useState(null);

  const [geoError, setGeoError] = useState("");

  // idle | submitting | success
  const [status, setStatus] = useState("idle");

  // Human-readable location
  const [locationText, setLocationText] = useState("");

  const fileInputRef = useRef(null);

  // ------------------------------------------------
  // IMAGE HANDLING
  // ------------------------------------------------

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);

    if (!files.length) return;

    const next = files.map((file) => ({
      id: `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    setImages((prev) => [...prev, ...next]);
  };

  const removeImage = (id) => {
    setImages((prev) =>
      prev.filter((img) => img.id !== id)
    );
  };

  // ------------------------------------------------
  // SHARE CURRENT LOCATION
  // ------------------------------------------------

  const handleShareLocation = () => {
    setLocationMode("current");

    setGeoError("");

    // Remove manually picked location
    setPinPosition(null);

    if (!navigator.geolocation) {
      setGeoError(
        "Location isn't available on this device. Try pinning it on the map instead."
      );

      return;
    }

    setLocationText(
      "Fetching your current location..."
    );

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setCurrentLocation({
          lat,
          lng,
        });

        const placeName = await getPlaceName(
          lat,
          lng
        );

        setLocationText(placeName);
      },

      () => {
        setGeoError(
          "Couldn't get your location. Try pinning it on the map instead."
        );

        setLocationText("");
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // ------------------------------------------------
  // PICK LOCATION MODE
  // ------------------------------------------------

  const handlePickLocation = () => {
    setLocationMode("pick");

    // Remove current GPS location
    setCurrentLocation(null);

    setGeoError("");

    // Remove previous selected location
    setPinPosition(null);

    setLocationText("");
  };

  // ------------------------------------------------
  // CHECK LOCATION
  // ------------------------------------------------

  const hasLocation = Boolean(
    currentLocation || pinPosition
  );

  // ------------------------------------------------
  // SUBMIT VALIDATION
  // ------------------------------------------------

  const canSubmit =
    images.length > 0 &&
    hasLocation &&
    status === "idle";

  // ------------------------------------------------
  // SUBMIT
  // ------------------------------------------------

  const handleSubmit = () => {
    if (!canSubmit) return;

    const selectedLocation =
      currentLocation || pinPosition;

    console.log("Pickup Request Data:");

    console.log({
      images,
      locationName: locationText,
      latitude: selectedLocation?.lat,
      longitude: selectedLocation?.lng,
    });

    setStatus("submitting");

    // Temporary animation
    window.setTimeout(() => {
      setStatus("success");
    }, 3400);
  };

  // ------------------------------------------------
  // RESET FORM
  // ------------------------------------------------

  const resetForm = () => {
    setImages([]);

    setLocationMode(null);

    setCurrentLocation(null);

    setPinPosition(null);

    setGeoError("");

    setLocationText("");

    setStatus("idle");
  };

  // ==================================================
  // JSX
  // ==================================================

  return (
    <div className="pickup-root">

      {/* HEADER */}

      <div className="pickup-header">

        <div className="pickup-logo">

          <div className="pickup-logo-badge">
            <Activity
              size={17}
              strokeWidth={2.5}
              color="#ffffff"
            />
          </div>

          <span className="pickup-logo-text">
            Eco<span>Pulse</span>
          </span>

        </div>

        <button
          className="pickup-back-btn"
          onClick={onBack}
          aria-label="Go back"
        >
          <ArrowLeft size={15} />
          Back
        </button>

      </div>

      {/* HEADING */}

      <div className="pickup-heading-wrap">

        <div className="pickup-heading-pill">
          Request your waste pickup here
          <span className="pickup-heading-bang">
            !!
          </span>
        </div>

      </div>

      {/* MAIN SPLIT */}

      <div className="pickup-split">

        {/* REAL LEAFLET MAP */}

        <div
          className={`pickup-map-card${
            locationMode === "pick"
              ? " pickup-pick-mode"
              : ""
          }`}
        >

          <MapContainer
            center={[9.6852, 76.7218]}
            zoom={13}

            /* IMPORTANT:
               Leaflet dragging is explicitly enabled */
            dragging={true}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            touchZoom={true}
            keyboard={true}
            zoomControl={true}

            style={{
              height: "100%",
              width: "100%",
            }}
          >

            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* MAP CLICK HANDLER */}

            <LocationPicker
              locationMode={locationMode}
              setPinPosition={setPinPosition}
              setLocationText={setLocationText}
            />

            {/* CURRENT LOCATION CONTROLLER */}

            <MapController
              currentLocation={currentLocation}
            />

            {/* CURRENT LOCATION MARKER */}

            {currentLocation && (
              <Marker
                position={[
                  currentLocation.lat,
                  currentLocation.lng,
                ]}
              />
            )}

            {/* PICKED LOCATION MARKER */}

            {pinPosition && (
              <Marker
                position={[
                  pinPosition.lat,
                  pinPosition.lng,
                ]}
              />
            )}

          </MapContainer>

          {/* MAP INSTRUCTION */}

          {locationMode === "pick" &&
            !pinPosition && (
              <div className="pickup-map-hint">
                Click the map to select pickup location
              </div>
            )}

        </div>

        {/* FORM */}

        <div className="pickup-form-card">

          {/* WASTE IMAGE */}

          <div>

            <span className="pickup-field-label">
              Add waste image
            </span>

            <div className="pickup-upload-box">

              {images.length === 0 ? (

                <div
                  className="pickup-upload-empty"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    fileInputRef.current?.click()
                  }
                >

                  <Upload size={26} />

                  <span className="pickup-upload-title">
                    Click to add photos of your waste
                  </span>

                  <span className="pickup-upload-sub">
                    You can add more than one photo
                  </span>

                </div>

              ) : (

                <div className="pickup-thumb-grid">

                  {images.map((img) => (

                    <div
                      className="pickup-thumb"
                      key={img.id}
                    >

                      <img
                        src={img.url}
                        alt={img.name}
                      />

                      <button
                        type="button"
                        className="pickup-thumb-remove"
                        onClick={() =>
                          removeImage(img.id)
                        }
                        aria-label={`Remove ${img.name}`}
                      >
                        <X size={12} />
                      </button>

                    </div>

                  ))}

                  <div
                    className="pickup-thumb-add"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      fileInputRef.current?.click()
                    }
                    aria-label="Add more photos"
                  >
                    <Plus size={22} />
                  </div>

                </div>

              )}

            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />

          </div>

          {/* LOCATION */}

          <div>

            <span className="pickup-field-label">
              Select location
            </span>

            <div className="pickup-location-buttons">

              {/* CURRENT LOCATION */}

              <button
                type="button"
                className={`pickup-loc-btn${
                  locationMode === "current"
                    ? " active"
                    : ""
                }`}
                onClick={handleShareLocation}
              >

                <Navigation size={15} />

                Share current location

              </button>

              {/* PICK LOCATION */}

              <button
                type="button"
                className={`pickup-loc-btn${
                  locationMode === "pick"
                    ? " active"
                    : ""
                }`}
                onClick={handlePickLocation}
              >

                <MapPin size={15} />

                Pick a location

              </button>

            </div>

            {/* LOCATION ERROR */}

            {geoError && (
              <div className="pickup-loc-status pickup-error">
                {geoError}
              </div>
            )}

            {/* LOCATION NAME */}

            {locationMode && (

              <div className="pickup-loc-shown">

                <MapPin size={14} />

                <input
                  type="text"
                  className="pickup-loc-input"
                  value={locationText}
                  readOnly
                  placeholder={
                    locationMode === "current"
                      ? "Fetching your current location..."
                      : "Click the map to select a location"
                  }
                  aria-label="Selected pickup location"
                />

              </div>

            )}

            {/* PICK LOCATION NOTE */}

            {!geoError &&
              locationMode === "pick" &&
              pinPosition && (

                <span className="pickup-loc-note">
                  Click the map again to move the pin.
                </span>

              )}

          </div>

          {/* SPACER */}

          <div className="pickup-spacer" />

          {/* SUBMIT */}

          <button
            className="pickup-submit-btn"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Submit pickup request
          </button>

          {/* SUBMITTING ANIMATION */}

          {status === "submitting" && (

            <div className="pickup-van-stage">

              <div className="pickup-van-track">

                <div className="pickup-van-road" />

                <div className="pickup-van-puff p1" />

                <div className="pickup-van-puff p2" />

                <div className="pickup-van-puff p3" />

                <Truck
                  className="pickup-van-icon"
                  size={38}
                />

                <div className="pickup-bin">
                  <Trash2 size={30} />
                </div>

              </div>

              <p className="pickup-van-caption">
                Sending your pickup request...
              </p>

            </div>

          )}

          {/* SUCCESS */}

          {status === "success" && (

            <div className="pickup-success">

              <CheckCircle2
                size={46}
                color="var(--ep-primary)"
              />

              <h3>
                Pickup requested!
              </h3>

              <p>
                We'll send someone your way shortly.
              </p>

              <button
                type="button"
                className="pickup-secondary-btn"
                onClick={resetForm}
              >
                Request another pickup
              </button>

            </div>

          )}

        </div>

      </div>

    </div>
  );
}