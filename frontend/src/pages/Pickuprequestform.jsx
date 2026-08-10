import React, { useState, useRef, useCallback } from "react";
import { ArrowLeft, ImagePlus, MapPin, X, Check } from "lucide-react";
import "../components/Pickuprequestform.css"


/**
 * Pickup Request Form
 * Light-green form card on a white page background.
 * Fields: waste image, location, submit.
 * On submit, a small truck-to-bin animation plays inside the button.
 * Styling lives in PickupRequestForm.css (import it alongside this file).
 */
export default function PickupRequestForm({ onBack, onSubmit }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [imageName, setImageName] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("idle"); // idle | animating | done
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSubmit = imagePreview && location.trim().length > 0 && status === "idle";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("animating");
    setTimeout(() => {
      setStatus("done");
      onSubmit && onSubmit({ image: imagePreview, imageName, location });
    }, 1800);
  };

  const handleReset = () => {
    setStatus("idle");
    setLocation("");
    clearImage();
  };

  return (
    <div className="pf-page">
      <div className="pf-wrap">
        {/* Top bar with back button */}
        <div className="pf-topbar">
          <div className="pf-topbar-row">
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="pf-back-btn"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="pf-title">Request pickup</h1>
          </div>
          <div className="pf-underline" />
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit} className="pf-card">
          {/* Waste image field */}
          <div>
            <label className="pf-label">Add waste image</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="pf-dropzone"
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Waste to be collected"
                    className="pf-dropzone-preview"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearImage();
                    }}
                    aria-label="Remove image"
                    className="pf-remove-btn"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <div className="pf-dropzone-empty">
                  <ImagePlus size={28} />
                  <span className="pf-dropzone-title">Tap to add a photo</span>
                  <span className="pf-dropzone-sub">JPG or PNG</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="pf-file-input"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          </div>

          {/* Location field */}
          <div>
            <label className="pf-label">Add location</label>
            <div className="pf-loc-wrap">
              <MapPin size={18} className="pf-loc-icon" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter pickup address"
                className="pf-loc-input"
              />
            </div>
          </div>

          {/* Submit */}
          {status !== "done" ? (
            <button
              type="submit"
              disabled={!canSubmit}
              className="pf-submit-btn"
            >
              {status === "animating" ? <SubmitTruckAnimation /> : "Submit"}
            </button>
          ) : (
            <div className="pf-success">
              <div className="pf-success-row">
                <span className="pf-success-check">
                  <Check size={14} />
                </span>
                Pickup requested
              </div>
              <button type="button" onClick={handleReset} className="pf-reset-btn">
                Request another pickup
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function SubmitTruckAnimation() {
  return (
    <div className="pf-anim-layer">
      <div className="pf-anim-road" />
      <div className="pf-anim-bin">
        <BinIcon filled={false} />
      </div>
      <div className="pf-anim-truck">
        <TruckIcon />
      </div>
    </div>
  );
}

function TruckIcon() {
  return (
    <svg width="32" height="20" viewBox="0 0 40 26" fill="none">
      <rect x="1" y="7" width="20" height="12" rx="1.5" fill="#4CAF50" />
      <path d="M21 11h7l5 4.5V19h-12v-8z" fill="#1B5E20" />
      <rect x="24" y="12.5" width="4" height="3.5" fill="#EAF6EC" />
      <circle cx="8" cy="20.5" r="3" fill="#1B5E20" />
      <circle cx="8" cy="20.5" r="1.2" fill="#EAF6EC" />
      <circle cx="27" cy="20.5" r="3" fill="#1B5E20" />
      <circle cx="27" cy="20.5" r="1.2" fill="#EAF6EC" />
    </svg>
  );
}

function BinIcon({ filled }) {
  return (
    <svg width="16" height="20" viewBox="0 0 20 26" fill="none">
      <rect x="1" y="1" width="18" height="4" rx="1" fill="#66BB6A" />
      <path
        d="M3 6h14l-1.3 17.5a2 2 0 0 1-2 1.5H6.3a2 2 0 0 1-2-1.5L3 6z"
        fill={filled ? "#4CAF50" : "#A5D6A7"}
      />
      <rect x="8" y="9" width="1.6" height="12" fill="#EAF6EC" />
      <rect x="12" y="9" width="1.6" height="12" fill="#EAF6EC" />
    </svg>
  );
}