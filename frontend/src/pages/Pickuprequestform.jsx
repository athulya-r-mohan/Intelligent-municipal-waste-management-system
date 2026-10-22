import React, { useState, useRef, useEffect } from "react";
import "leaflet/dist/leaflet.css";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";

import "../components/Pickuprequestform.css";
import MapLocationSearch from "../components/MapLocationSearch";

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

// ==================================================
// BACKEND URL
// ==================================================

const API_BASE_URL = "https://intelligent-municipal-waste-management.onrender.com";

// ==================================================
// GET ACCESS TOKEN
// ==================================================

const getAccessToken = () => {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    ""
  );
};

// ==================================================
// GET CURRENT USER ID FROM JWT
// ==================================================

const getCurrentUserId = () => {
  const token = getAccessToken();

  if (!token) {
    throw new Error(
      "Your login session has expired. Please login again."
    );
  }

  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      throw new Error("Invalid JWT token.");
    }

    const payload = JSON.parse(
      atob(
        parts[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/")
      )
    );

    const userId =
      payload.user_id ||
      payload.userId ||
      payload.id ||
      payload.sub;

    if (
      userId === undefined ||
      userId === null ||
      userId === ""
    ) {
      console.error(
        "JWT payload does not contain user ID:",
        payload
      );

      throw new Error(
        "User ID was not found in your login session. Please login again."
      );
    }

    console.log(
      "Current logged-in user ID:",
      userId
    );

    return userId;
  } catch (error) {
    console.error(
      "Unable to read user ID from access token:",
      error
    );

    throw new Error(
      "Invalid login session. Please login again."
    );
  }
};

// ==================================================
// AUTH HEADERS
// ==================================================

const getAuthHeaders = () => {
  const token = getAccessToken();

  if (!token) {
    throw new Error(
      "Your login session has expired. Please login again."
    );
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

// ==================================================
// REVERSE GEOCODING
// ==================================================

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

    if (!response.ok) {
      throw new Error(
        "Reverse geocoding failed"
      );
    }

    const data = await response.json();

    if (data?.display_name) {
      return data.display_name;
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error(
      "Reverse geocoding failed:",
      error
    );

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

// ==================================================
// LOCATION PICKER
// ==================================================

function LocationPicker({
  locationMode,
  setPinPosition,
  setLocationText,
}) {
  useMapEvents({
    click: async (e) => {
      if (locationMode !== "pick") {
        return;
      }

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      setPinPosition({
        lat,
        lng,
      });

      setLocationText(
        "Finding location..."
      );

      const placeName = await getPlaceName(
        lat,
        lng
      );

      setLocationText(placeName);
    },
  });

  return null;
}

// ==================================================
// MAP CONTROLLER
// ==================================================

function MapController({
  currentLocation,
  pinPosition,
}) {
  const map = useMap();

  useEffect(() => {
    const location =
      currentLocation || pinPosition;

    if (!location) {
      return;
    }

    // Only initiate flyTo if the map center is not already near the target position
    const center = map.getCenter();
    const dist = Math.hypot(center.lat - location.lat, center.lng - location.lng);
    if (dist > 0.0002) {
      map.flyTo(
        [location.lat, location.lng],
        16,
        {
          duration: 1.5,
        }
      );
    }
  }, [
    currentLocation,
    pinPosition,
    map,
  ]);

  return null;
}

// ==================================================
// MAIN COMPONENT
// ==================================================

export default function EcoPulseWastePickup({
  onBack = () => {},
}) {
  // ==================================================
  // IMAGE STATES
  // ==================================================

  const [images, setImages] = useState([]);

  const fileInputRef = useRef(null);

  // ==================================================
  // LOCATION STATES
  // ==================================================

  const [locationMode, setLocationMode] =
    useState(null);

  const [currentLocation, setCurrentLocation] =
    useState(null);

  const [pinPosition, setPinPosition] =
    useState(null);

  const [geoError, setGeoError] =
    useState("");

  const [locationText, setLocationText] =
    useState("");

  // ==================================================
  // PICKUP STATUS
  // ==================================================

  const [status, setStatus] =
    useState("idle");

  // ==================================================
  // AI STATES
  // ==================================================

  const [aiLoading, setAiLoading] =
    useState(false);

  const [aiResult, setAiResult] =
    useState(null);

  const [aiError, setAiError] =
    useState("");

  // ==================================================
  // IMAGE HANDLING
  // ==================================================

  const handleFiles = (fileList) => {
    const files = Array.from(
      fileList || []
    );

    if (files.length === 0) {
      return;
    }

    const validFiles = files.filter(
      (file) =>
        file.type.startsWith("image/")
    );

    if (validFiles.length === 0) {
      setAiError(
        "Please select valid image files."
      );

      return;
    }

    const nextImages =
      validFiles.map((file) => ({
        id:
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,

        url: URL.createObjectURL(file),

        name: file.name,

        file: file,
      }));

    setImages((prev) => [
      ...prev,
      ...nextImages,
    ]);

    setAiResult(null);
    setAiError("");
  };

  // ==================================================
  // REMOVE IMAGE
  // ==================================================

  const removeImage = (id) => {
    setImages((prev) => {
      const imageToRemove =
        prev.find(
          (img) => img.id === id
        );

      if (imageToRemove?.url) {
        URL.revokeObjectURL(
          imageToRemove.url
        );
      }

      return prev.filter(
        (img) => img.id !== id
      );
    });

    setAiResult(null);
    setAiError("");
  };

  // ==================================================
  // SHARE CURRENT LOCATION
  // ==================================================

  const handleShareLocation = () => {
    setLocationMode("current");

    setGeoError("");
    setPinPosition(null);

    if (!navigator.geolocation) {
      setGeoError(
        "Location isn't available on this device. Try pinning it on the map instead."
      );

      setCurrentLocation(null);

      return;
    }

    setLocationText(
      "Fetching your current location..."
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat =
          position.coords.latitude;

        const lng =
          position.coords.longitude;

        const newLocation = {
          lat,
          lng,
        };

        setCurrentLocation(
          newLocation
        );

        const placeName =
          await getPlaceName(
            lat,
            lng
          );

        setLocationText(
          placeName
        );
      },

      (error) => {
        console.error(
          "Geolocation error:",
          error
        );

        setCurrentLocation(null);

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

  // ==================================================
  // PICK LOCATION
  // ==================================================

  const handlePickLocation = () => {
    setLocationMode("pick");

    setCurrentLocation(null);
    setPinPosition(null);

    setGeoError("");
    setLocationText("");
  };

  const handleMapSearchSelect = ({ lat, lng, displayName }) => {
    setLocationMode("pick");
    setCurrentLocation(null);
    setPinPosition({ lat, lng });
    setGeoError("");
    setLocationText(displayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  };

  // ==================================================
  // LOCATION VALIDATION
  // ==================================================

  const hasLocation = Boolean(
    currentLocation ||
      pinPosition
  );

  // ==================================================
  // SUBMIT VALIDATION
  // ==================================================

  const canSubmit =
    images.length > 0 &&
    hasLocation &&
    locationText &&
    status === "idle" &&
    !aiLoading;

  // ==================================================
  // AI WASTE DETECTION
  // ==================================================

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (images.length === 0) {
        setAiError(
          "Please select at least one waste image."
        );
      } else if (!hasLocation) {
        setAiError(
          "Please select a pickup location."
        );
      } else if (!locationText) {
        setAiError(
          "Please wait until the location name is found."
        );
      }

      return;
    }

    const selectedLocation =
      currentLocation ||
      pinPosition;

    console.log(
      "Selected pickup location:",
      {
        locationName:
          locationText,

        latitude:
          selectedLocation?.lat,

        longitude:
          selectedLocation?.lng,
      }
    );

    setAiLoading(true);
    setAiError("");
    setAiResult(null);

    try {
      const allDetections = [];
      const imageResults = [];

      // ==================================================
      // SEND EACH IMAGE TO YOLO
      // ==================================================

      for (
        let i = 0;
        i < images.length;
        i++
      ) {
        const image = images[i];

        console.log(
          `Sending image ${
            i + 1
          }/${images.length}:`,
          image.file.name
        );

        const formData =
          new FormData();

        formData.append(
          "image",
          image.file
        );

        let response;

        try {
          response = await fetch(
            `${API_BASE_URL}/api/waste/detect-waste/`,
            {
              method: "POST",

              headers:
                getAuthHeaders(),

              body: formData,
            }
          );
        } catch (error) {
          console.error(
            "AI network request failed:",
            error
          );

          throw new Error(
            "Unable to connect to the Django AI server. Please make sure the backend server is running."
          );
        }

        const responseText =
          await response.text();

        console.log(
          `YOLO response for ${image.file.name}:`,
          responseText
        );

        let data = {};

        try {
          data = responseText
            ? JSON.parse(
                responseText
              )
            : {};
        } catch {
          throw new Error(
            `Invalid response received from AI server for "${image.file.name}".`
          );
        }

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          throw new Error(
            "Your login session has expired. Please login again."
          );
        }

        if (!response.ok || data?.success === false) {
          throw new Error(
            data?.message ||
              data?.detail ||
              `AI detection failed with status ${response.status}.`
          );
        }

        const detections = Array.isArray(data?.detections) ? data.detections : [];

        imageResults.push({
          imageName:
            image.file.name,

          imageIndex:
            i + 1,

          detections:
            detections,
        });

        detections.forEach(
          (detection) => {
            allDetections.push({
              ...detection,

              imageName:
                image.file.name,

              imageIndex:
                i + 1,
            });
          }
        );
      }

      console.log(
        "ALL IMAGE RESULTS:",
        imageResults
      );

      console.log(
        "ALL AI DETECTIONS:",
        allDetections
      );

      setAiResult({
        success: true,

        detections:
          allDetections,

        imageResults:
          imageResults,

        totalImages:
          images.length,

        totalDetections:
          allDetections.length,
      });
    } catch (error) {
      console.error(
        "AI detection error:",
        error
      );

      setAiError(
        error?.message ||
          "Unable to complete AI waste detection. Please try again."
      );
    } finally {
      setAiLoading(false);
    }
  };

  // ==================================================
  // SAVE PICKUP REQUEST
  // ==================================================

  const savePickupRequest = async () => {
    if (!aiResult) {
      throw new Error(
        "AI result is missing."
      );
    }

    const selectedLocation =
      currentLocation ||
      pinPosition;

    if (!selectedLocation) {
      throw new Error(
        "Pickup location is missing."
      );
    }

    if (!locationText) {
      throw new Error(
        "Pickup location name is missing."
      );
    }

    if (images.length === 0) {
      throw new Error(
        "No waste image selected."
      );
    }

    // ==================================================
    // GET CURRENT LOGGED-IN USER ID
    // ==================================================

    const userId =
      getCurrentUserId();

    console.log(
      "================================"
    );

    console.log(
      "LOGGED-IN USER ID:",
      userId
    );

    console.log(
      "================================"
    );

    // ==================================================
    // GET DETECTIONS
    // ==================================================

    const detections =
      Array.isArray(
        aiResult.detections
      )
        ? aiResult.detections
        : [];

    // ==================================================
    // DETECTION PAYLOAD
    // ==================================================

    const detectionPayload =
      detections.map(
        (detection) => ({
          class:
            detection.class ||
            detection.class_name ||
            detection.name ||
            "Unknown",

          confidence:
            Number(
              detection.confidence
            ),

          imageName:
            detection.imageName ||
            null,

          imageIndex:
            detection.imageIndex ||
            null,
        })
      );

    // ==================================================
    // FORM DATA
    // ==================================================

    const formData =
      new FormData();

    // ==================================================
    // USER ID
    //
    // THIS IS THE IMPORTANT FIX
    // ==================================================

    formData.append(
      "user_id",
      String(userId)
    );

    // ==================================================
    // LOCATION
    // ==================================================

    formData.append(
      "location_name",
      locationText
    );

    formData.append(
      "latitude",
      String(
        selectedLocation.lat
      )
    );

    formData.append(
      "longitude",
      String(
        selectedLocation.lng
      )
    );

    // ==================================================
    // DETECTIONS
    // ==================================================

    formData.append(
      "detections",
      JSON.stringify(
        detectionPayload
      )
    );

    // ==================================================
    // ALL IMAGES
    // ==================================================

    images.forEach(
      (image) => {
        formData.append(
          "images",
          image.file
        );
      }
    );

    // ==================================================
    // DEBUG FOR FORMDATA
    // ==================================================

    console.log(
      "================================"
    );

    console.log(
      "Saving pickup request..."
    );

    console.log(
      "User ID:",
      userId
    );

    console.log(
      "Total images:",
      images.length
    );

    console.log(
      "Location:",
      locationText
    );

    console.log(
      "Latitude:",
      selectedLocation.lat
    );

    console.log(
      "Longitude:",
      selectedLocation.lng
    );

    console.log(
      "Detections:",
      detectionPayload
    );

    console.log(
      "================================"
    );

    // ==================================================
    // SEND TO DJANGO
    // ==================================================

    let response;

    try {
      response = await fetch(
        `${API_BASE_URL}/api/waste/create-pickup/`,
        {
          method: "POST",

          headers:
            getAuthHeaders(),

          body: formData,
        }
      );
    } catch (error) {
      console.error(
        "Pickup save network error:",
        error
      );

      throw new Error(
        "Unable to connect to the Django server. Please make sure the backend server is running."
      );
    }

    const responseText =
      await response.text();

    console.log(
      "SAVE RESPONSE STATUS:",
      response.status
    );

    console.log(
      "SAVE RESPONSE:",
      responseText
    );

    let data = {};

    try {
      data = responseText
        ? JSON.parse(
            responseText
          )
        : {};
    } catch {
      throw new Error(
        `Invalid response received while saving pickup request. Server returned HTTP ${response.status}.`
      );
    }

    // ==================================================
    // AUTH ERROR
    // ==================================================

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      throw new Error(
        "Your login session has expired. Please login again."
      );
    }

    // ==================================================
    // SERVER ERROR
    // ==================================================

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.detail ||
          `Failed to save pickup request (${response.status}).`
      );
    }

    // ==================================================
    // BACKEND ERROR
    // ==================================================

    if (
      data?.success === false
    ) {
      throw new Error(
        data?.message ||
          "Pickup request could not be saved."
      );
    }

    // ==================================================
    // SUCCESS
    // ==================================================

    console.log(
      "PICKUP REQUEST SAVED SUCCESSFULLY:",
      data
    );

    return data;
  };

  // ==================================================
  // AI RESULT OK
  // ==================================================

  const handleAiOk = async () => {
    console.log(
      "AI result accepted:",
      aiResult
    );

    try {
      setAiLoading(true);
      setAiError("");

      // SAVE TO DATABASE
      const saved =
        await savePickupRequest();

      console.log(
        "DATABASE SAVE SUCCESS:",
        saved
      );

      setAiResult(null);

      setStatus(
        "submitting"
      );

      window.setTimeout(
        () => {
          setStatus(
            "success"
          );
        },
        3400
      );
    } catch (error) {
      console.error(
        "SAVE PICKUP REQUEST ERROR:",
        error
      );

      setAiError(
        error?.message ||
          "Unable to save pickup request."
      );
    } finally {
      setAiLoading(false);
    }
  };

  // ==================================================
  // RESET FORM
  // ==================================================

  const resetForm = () => {
    images.forEach(
      (img) => {
        if (img.url) {
          URL.revokeObjectURL(
            img.url
          );
        }
      }
    );

    setImages([]);

    setLocationMode(null);

    setCurrentLocation(null);

    setPinPosition(null);

    setGeoError("");

    setLocationText("");

    setStatus("idle");

    setAiLoading(false);

    setAiResult(null);

    setAiError("");

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  };

  // ==================================================
  // CLEANUP
  // ==================================================

  useEffect(() => {
    return () => {
      images.forEach(
        (img) => {
          if (img.url) {
            URL.revokeObjectURL(
              img.url
            );
          }
        }
      );
    };
  }, [images]);

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

      {/* MAIN */}

      <div className="pickup-split">

        {/* MAP */}

        <div
          className={`pickup-map-card${
            locationMode === "pick"
              ? " pickup-pick-mode"
              : ""
          }`}
        >

          <MapContainer
            center={[
              9.6852,
              76.7218,
            ]}
            zoom={13}
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

            <MapLocationSearch
              onLocationSelect={handleMapSearchSelect}
              placeholder="Search pickup location, area, landmark..."
            />

            <LocationPicker
              locationMode={
                locationMode
              }

              setPinPosition={
                setPinPosition
              }

              setLocationText={
                setLocationText
              }
            />

            <MapController
              currentLocation={
                currentLocation
              }

              pinPosition={
                pinPosition
              }
            />

            {currentLocation && (
              <Marker
                position={[
                  currentLocation.lat,
                  currentLocation.lng,
                ]}
              />
            )}

            {pinPosition && (
              <Marker
                position={[
                  pinPosition.lat,
                  pinPosition.lng,
                ]}
              />
            )}

          </MapContainer>

          {locationMode === "pick" &&
            !pinPosition && (
              <div className="pickup-map-hint">

                Click the map to select pickup
                location

              </div>
            )}

        </div>

        {/* FORM */}

        <div className="pickup-form-card">

          {/* IMAGE UPLOAD */}

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
                  onKeyDown={(e) => {

                    if (
                      e.key === "Enter"
                    ) {
                      fileInputRef.current?.click();
                    }

                  }}
                >

                  <Upload size={26} />

                  <span className="pickup-upload-title">
                    Click to add photos of
                    your waste
                  </span>

                  <span className="pickup-upload-sub">
                    You can add more than one
                    photo
                  </span>

                </div>

              ) : (

                <div className="pickup-thumb-grid">

                  {images.map(
                    (img) => (

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
                            removeImage(
                              img.id
                            )
                          }
                          aria-label={`Remove ${img.name}`}
                        >

                          <X size={12} />

                        </button>

                      </div>

                    )
                  )}

                  <div
                    className="pickup-thumb-add"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {

                      if (
                        e.key === "Enter"
                      ) {
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

                handleFiles(
                  e.target.files
                );

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

              <button
                type="button"
                className={`pickup-loc-btn${
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

              <button
                type="button"
                className={`pickup-loc-btn${
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

            {geoError && (
              <div className="pickup-loc-status pickup-error">

                {geoError}

              </div>
            )}

            {locationMode && (
              <div className="pickup-loc-shown">

                <MapPin size={14} />

                <input
                  type="text"
                  className="pickup-loc-input"
                  value={
                    locationText
                  }
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

            {!geoError &&
              locationMode === "pick" &&
              pinPosition && (
                <span className="pickup-loc-note">

                  Click the map again to
                  move the pin.

                </span>
              )}

          </div>

          <div className="pickup-spacer" />

          {/* SUBMIT */}

          {status === "idle" && (
            <button
              className="pickup-submit-btn"
              onClick={
                handleSubmit
              }
              disabled={
                !canSubmit
              }
            >

              {aiLoading
                ? "Analyzing..."
                : "Submit pickup request"}

            </button>
          )}

          {/* VAN */}

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
                We'll send someone your
                way shortly.
              </p>

              <button
                type="button"
                className="pickup-secondary-btn"
                onClick={
                  resetForm
                }
              >

                Request another pickup

              </button>

            </div>
          )}

        </div>
      </div>

      {/* AI LOADING */}

      {aiLoading && (
        <div className="pickup-ai-overlay">

          <div className="pickup-ai-modal">

            <div className="pickup-ai-spinner" />

            <h3>
              Analyzing your waste...
            </h3>

            <p>

              AI is checking{" "}

              <strong>
                {images.length}
              </strong>{" "}

              {images.length === 1
                ? "image"
                : "images"}.

            </p>

          </div>

        </div>
      )}

      {/* AI RESULT */}

      {aiResult &&
        !aiLoading && (
          <div className="pickup-ai-overlay">

            <div className="pickup-ai-modal">

              <div className="pickup-ai-icon success">

                <Activity size={24} />

              </div>

              <h3>
                Waste Detection Complete
              </h3>

              <p className="pickup-ai-summary">

                Checked{" "}

                <strong>
                  {aiResult.totalImages}
                </strong>{" "}

                {aiResult.totalImages === 1
                  ? "image"
                  : "images"}{" "}

                and detected{" "}

                <strong>
                  {aiResult.totalDetections}
                </strong>{" "}

                waste object

                {aiResult.totalDetections === 1
                  ? ""
                  : "s"}.

              </p>

              {Array.isArray(
                aiResult.imageResults
              ) &&
              aiResult.imageResults.length > 0 ? (

                <div className="pickup-ai-detections">

                  {aiResult.imageResults.map(
                    (
                      imageResult,
                      imageIndex
                    ) => (

                      <div
                        className="pickup-ai-image-result"
                        key={`${imageResult.imageName}-${imageIndex}`}
                      >

                        <div className="pickup-ai-image-name">

                          <strong>
                            Image{" "}
                            {
                              imageResult.imageIndex
                            }
                          </strong>

                          <span>
                            {
                              imageResult.imageName
                            }
                          </span>

                        </div>

                        {Array.isArray(
                          imageResult.detections
                        ) &&
                        imageResult.detections.length >
                          0 ? (

                          <div className="pickup-ai-image-detections">

                            {imageResult.detections.map(
                              (
                                detection,
                                detectionIndex
                              ) => {

                                const confidence =
                                  Number(
                                    detection.confidence
                                  ) *
                                  100;

                                const safeConfidence =
                                  Math.min(
                                    Math.max(
                                      Number.isFinite(
                                        confidence
                                      )
                                        ? confidence
                                        : 0,
                                      0
                                    ),
                                    100
                                  );

                                return (
                                  <div
                                    className="pickup-ai-detection"
                                    key={
                                      detectionIndex
                                    }
                                  >

                                    <span>

                                      {detection.class ||
                                        detection.class_name ||
                                        detection.name ||
                                        "Unknown"}

                                    </span>

                                    <span>

                                      {safeConfidence.toFixed(
                                        2
                                      )}

                                      %

                                    </span>

                                  </div>
                                );
                              }
                            )}

                          </div>

                        ) : (

                          <div className="pickup-ai-no-detection">

                            No waste detected

                          </div>

                        )}

                      </div>

                    )
                  )}

                </div>
              ) : (
                <p className="pickup-ai-message" style={{ color: "#4c7a2e", fontSize: "13.5px", marginTop: "8px" }}>
                  No specific waste category was automatically detected from the photo(s). Don't worry — you can still submit your request, and our municipal team will review and categorize it.
                </p>
              )}

              <button
                type="button"
                className="pickup-ai-button"
                onClick={handleAiOk}
                disabled={aiLoading}
              >
                Submit Pickup Request
              </button>
            </div>
          </div>
        )}

      {/* AI ERROR */}

      {aiError &&
        !aiLoading && (
          <div className="pickup-ai-overlay">

            <div className="pickup-ai-modal">

              <div className="pickup-ai-icon error">

                <X size={24} />

              </div>

              <h3>
                Detection Failed
              </h3>

              <p className="pickup-ai-message">

                {aiError}

              </p>

              <button
                type="button"
                className="pickup-ai-button"
                onClick={() =>
                  setAiError("")
                }
              >

                OK

              </button>

            </div>

          </div>
        )}

    </div>
  );
}