import React, { useState, useRef } from "react";
import "../components/wastecomplaintform.css";

import {
  ArrowLeft,
  Activity,
  Upload,
  X,
  Plus,
  Navigation,
  MapPin,
  Send,
  Inbox,
  CheckCircle2,
} from "lucide-react";

import "leaflet/dist/leaflet.css";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";


// ---------------------------------------------------------
// Fix Leaflet marker icon
// ---------------------------------------------------------

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});


// ---------------------------------------------------------
// Map click handler
// ---------------------------------------------------------

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}


// ---------------------------------------------------------
// Complaint Form
// ---------------------------------------------------------

export default function ComplaintForm({ onBack = () => {} }) {

  const [complaintText, setComplaintText] = useState("");

  const [images, setImages] = useState([]);

  const [locationMode, setLocationMode] = useState(null);
  // null | current | pick

  const [selectedPosition, setSelectedPosition] = useState(null);
  // { lat, lng }

  const [locationText, setLocationText] = useState("");

  const [geoError, setGeoError] = useState("");

  const [status, setStatus] = useState("idle");
  // idle | submitting | success

  const fileInputRef = useRef(null);


  // -------------------------------------------------------
  // Reverse geocoding
  // Converts coordinates into readable address
  // -------------------------------------------------------

  const getLocationName = async (lat, lng) => {

    try {

      setLocationText("Finding location...");

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Unable to find location");
      }

      const data = await response.json();

      const address = data.address || {};

      const parts = [
        address.road,
        address.neighbourhood,
        address.suburb,
        address.village,
        address.town,
        address.city,
        address.district,
        address.state,
        address.country,
      ].filter(Boolean);

      const uniqueParts = [...new Set(parts)];

      const readableLocation =
        uniqueParts.length > 0
          ? uniqueParts.slice(0, 4).join(", ")
          : data.display_name || "Selected location";

      setLocationText(readableLocation);

    } catch (error) {

      console.error("Reverse geocoding error:", error);

      setLocationText("Selected location");

    }
  };


  // -------------------------------------------------------
  // Location selected from map
  // -------------------------------------------------------

  const handleMapLocationSelect = async (lat, lng) => {

    const position = {
      lat,
      lng,
    };

    setSelectedPosition(position);

    setGeoError("");

    await getLocationName(lat, lng);
  };


  // -------------------------------------------------------
  // Marker dragged
  // -------------------------------------------------------

  const handleMarkerDragEnd = (event) => {

    const marker = event.target;

    const position = marker.getLatLng();

    handleMapLocationSelect(
      position.lat,
      position.lng
    );
  };


  // -------------------------------------------------------
  // Current location
  // -------------------------------------------------------

  const handleShareLocation = () => {

    setLocationMode("current");

    setGeoError("");

    if (!navigator.geolocation) {

      setGeoError(
        "Location isn't available on this device. Try picking it on the map instead."
      );

      return;
    }

    setLocationText("Finding your current location...");

    navigator.geolocation.getCurrentPosition(

      async (position) => {

        const lat = position.coords.latitude;

        const lng = position.coords.longitude;

        setSelectedPosition({
          lat,
          lng,
        });

        await getLocationName(lat, lng);
      },

      () => {

        setGeoError(
          "Couldn't get your location. Try picking it on the map instead."
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


  // -------------------------------------------------------
  // Pick location
  // -------------------------------------------------------

  const handlePickLocation = () => {

    setLocationMode("pick");

    setGeoError("");

    setLocationText("");

    setSelectedPosition(null);
  };


  // -------------------------------------------------------
  // File upload
  // -------------------------------------------------------

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

    setImages((prev) => [
      ...prev,
      ...next,
    ]);
  };


  // -------------------------------------------------------
  // Remove image
  // -------------------------------------------------------

  const removeImage = (id) => {

    setImages((prev) =>
      prev.filter((img) => img.id !== id)
    );
  };


  // -------------------------------------------------------
  // Submit
  // -------------------------------------------------------

  const hasLocation = Boolean(selectedPosition);

  const canSubmit =
    complaintText.trim().length > 0 &&
    hasLocation &&
    status === "idle";


  const handleSubmit = () => {

    if (!canSubmit) return;

    setStatus("submitting");

    window.setTimeout(() => {

      setStatus("success");

    }, 3400);
  };


  // -------------------------------------------------------
  // Reset
  // -------------------------------------------------------

  const resetForm = () => {

    setComplaintText("");

    setImages([]);

    setLocationMode(null);

    setSelectedPosition(null);

    setGeoError("");

    setLocationText("");

    setStatus("idle");
  };


  // -------------------------------------------------------
  // Default map center
  // -------------------------------------------------------

  const defaultCenter = [
    9.5916,
    76.5222,
  ];


  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------

  return (

    <div className="cf-root">

      {/* HEADER */}

      <div className="cf-header">

        <div className="cf-logo">

          <div className="cf-logo-badge">

            <Activity
              size={17}
              strokeWidth={2.5}
              color="#ffffff"
            />

          </div>

          <span className="cf-logo-text">
            Eco<span>Pulse</span>
          </span>

        </div>


        <button
          className="cf-back-btn"
          onClick={onBack}
          aria-label="Go back"
        >

          <ArrowLeft size={15} />

          Back

        </button>

      </div>


      {/* HEADING */}

      <div className="cf-heading-wrap">

        <div className="cf-heading-pill">

          Register your complaint here

          <span className="cf-heading-bang">
            !!
          </span>

        </div>

      </div>


      {/* SPLIT */}

      <div className="cf-split">


        {/* -------------------------------------------------
            REAL MAP
        ------------------------------------------------- */}

        <div className="cf-map-card">

          <MapContainer
            center={defaultCenter}
            zoom={13}
            scrollWheelZoom={true}
            className="cf-leaflet-map"
          >

            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />


            <MapClickHandler
              onLocationSelect={
                handleMapLocationSelect
              }
            />


            {selectedPosition && (

              <Marker
                position={[
                  selectedPosition.lat,
                  selectedPosition.lng,
                ]}
                draggable={true}
                eventHandlers={{
                  dragend:
                    handleMarkerDragEnd,
                }}
              />

            )}

          </MapContainer>


          <div className="cf-map-label">
            Map
          </div>


          {locationMode === "pick" &&
            !selectedPosition && (

              <div className="cf-map-hint">

                Tap the map to drop a pin

              </div>

            )}

        </div>


        {/* -------------------------------------------------
            FORM
        ------------------------------------------------- */}

        <div className="cf-form-card">


          {/* COMPLAINT */}

          <div>

            <span className="cf-field-label">
              Describe your complaint
            </span>

            <textarea
              className="cf-textarea"
              value={complaintText}
              onChange={(e) =>
                setComplaintText(e.target.value)
              }
              placeholder="Tell us what happened — missed pickup, overflowing bin, damaged property, etc."
            />

          </div>


          {/* IMAGE */}

          <div>

            <span className="cf-field-label">

              Add photo{" "}

              <span className="cf-field-optional">
                (optional)
              </span>

            </span>


            <div className="cf-upload-box">

              {images.length === 0 ? (

                <div
                  className="cf-upload-empty"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {

                    if (e.key === "Enter") {

                      fileInputRef.current?.click();

                    }

                  }}
                >

                  <Upload size={26} />

                  <span className="cf-upload-title">

                    Click to add photo evidence

                  </span>

                  <span className="cf-upload-sub">

                    You can add more than one photo

                  </span>

                </div>

              ) : (

                <div className="cf-thumb-grid">

                  {images.map((img) => (

                    <div
                      className="cf-thumb"
                      key={img.id}
                    >

                      <img
                        src={img.url}
                        alt={img.name}
                      />


                      <button
                        className="cf-thumb-remove"
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
                    className="cf-thumb-add"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {

                      if (e.key === "Enter") {

                        fileInputRef.current?.click();

                      }

                    }}
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

            <span className="cf-field-label">
              Select location
            </span>


            <div className="cf-location-buttons">


              {/* CURRENT LOCATION */}

              <button
                type="button"
                className={`cf-loc-btn${
                  locationMode === "current"
                    ? " active"
                    : ""
                }`}
                onClick={
                  handleShareLocation
                }
              >

                <Navigation size={15} />

                Share current location

              </button>


              {/* PICK LOCATION */}

              <button
                type="button"
                className={`cf-loc-btn${
                  locationMode === "pick"
                    ? " active"
                    : ""
                }`}
                onClick={
                  handlePickLocation
                }
              >

                <MapPin size={15} />

                Pick a location

              </button>

            </div>


            {/* ERROR */}

            {geoError && (

              <div className="cf-loc-status cf-error">

                {geoError}

              </div>

            )}


            {/* LOCATION NAME */}

            {locationMode && (

              <div className="cf-loc-shown">

                <MapPin size={14} />

                <input
                  type="text"
                  className="cf-loc-input"
                  value={locationText}
                  onChange={(e) =>
                    setLocationText(
                      e.target.value
                    )
                  }
                  placeholder={
                    locationMode === "current"
                      ? "Finding your location..."
                      : "Tap the map to select a location"
                  }
                  aria-label="Selected complaint location"
                />

              </div>

            )}


            {locationMode === "pick" &&
              selectedPosition && (

                <span className="cf-loc-note">

                  Drag the marker to change the location.

                </span>

              )}

          </div>


          <div className="cf-spacer" />


          {/* SUBMIT */}

          <button
            className="cf-submit-btn"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >

            Submit complaint

          </button>


          {/* SENDING ANIMATION */}

          {status === "submitting" && (

            <div className="cf-send-stage">

              <div className="cf-send-track">

                <div className="cf-send-path" />

                <div className="cf-send-trail t1" />

                <div className="cf-send-trail t2" />

                <div className="cf-send-trail t3" />


                <Send
                  className="cf-send-icon"
                  size={34}
                />


                <div className="cf-inbox">

                  <Inbox size={30} />

                </div>

              </div>


              <p className="cf-send-caption">

                Sending your complaint…

              </p>

            </div>

          )}


          {/* SUCCESS */}

          {status === "success" && (

            <div className="cf-success">

              <CheckCircle2
                size={46}
                color="var(--cf-primary)"
              />

              <h3>
                Complaint registered!
              </h3>

              <p>
                Our team will look into it shortly.
              </p>


              <button
                className="cf-secondary-btn"
                onClick={resetForm}
              >

                Register another complaint

              </button>

            </div>

          )}

        </div>

      </div>

    </div>
  );
}