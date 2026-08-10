import React, { useState, useRef, useCallback } from "react";
import { ArrowLeft, ImagePlus, MapPin, X, Check } from "lucide-react";
import "../components/wastecomplaintform.css"

/**
 * Waste Complaint Form
 * Light-green form card on a white page background — same design system
 * as PickupRequestForm.
 * Fields: complaint image, location, submit.
 * On submit, a small report-flying-to-inbox animation plays inside the button.
 * Styling lives in WasteComplaintForm.css (import it alongside this file).
 */
export default function WasteComplaintForm({ onBack, onSubmit }) {
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
    <div className="wc-page">
      <div className="wc-wrap">
        {/* Top bar with back button */}
        <div className="wc-topbar">
          <div className="wc-topbar-row">
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="wc-back-btn"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="wc-title">Waste complaint</h1>
          </div>
          <div className="wc-underline" />
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit} className="wc-card">
          {/* Complaint image field */}
          <div>
            <label className="wc-label">Add image</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="wc-dropzone"
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Complaint evidence"
                    className="wc-dropzone-preview"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearImage();
                    }}
                    aria-label="Remove image"
                    className="wc-remove-btn"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <div className="wc-dropzone-empty">
                  <ImagePlus size={28} />
                  <span className="wc-dropzone-title">Tap to add a photo</span>
                  <span className="wc-dropzone-sub">JPG or PNG</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="wc-file-input"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          </div>

          {/* Location field */}
          <div>
            <label className="wc-label">Add location</label>
            <div className="wc-loc-wrap">
              <MapPin size={18} className="wc-loc-icon" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter issue location"
                className="wc-loc-input"
              />
            </div>
          </div>

          {/* Submit */}
          {status !== "done" ? (
            <button type="submit" disabled={!canSubmit} className="wc-submit-btn">
              {status === "animating" ? <SubmitReportAnimation /> : "Submit"}
            </button>
          ) : (
            <div className="wc-success">
              <div className="wc-success-row">
                <span className="wc-success-check">
                  <Check size={14} />
                </span>
                Complaint submitted
              </div>
              <button type="button" onClick={handleReset} className="wc-reset-btn">
                Report another issue
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function SubmitReportAnimation() {
  return (
    <div className="wc-anim-layer">
      <div className="wc-anim-path" />
      <div className="wc-anim-inbox">
        <InboxIcon />
      </div>
      <div className="wc-anim-report">
        <ReportIcon />
      </div>
    </div>
  );
}

function ReportIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
        fill="#FFFFFF"
        stroke="#1B5E20"
        strokeWidth="1.4"
      />
      <path d="M15 2v5h5" fill="none" stroke="#1B5E20" strokeWidth="1.4" />
      <circle cx="12" cy="15" r="3.4" fill="#EF5350" />
      <rect x="11.3" y="12.6" width="1.4" height="2.6" fill="#FFFFFF" />
      <circle cx="12" cy="16.6" r="0.7" fill="#FFFFFF" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg width="22" height="20" viewBox="0 0 24 22" fill="none">
      <path
        d="M2 10 6 2h12l4 8v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8z"
        fill="#E8F5E9"
        stroke="#1B5E20"
        strokeWidth="1.4"
      />
      <path
        d="M2 10h6l1.6 2.4h4.8L16 10h6"
        fill="none"
        stroke="#1B5E20"
        strokeWidth="1.4"
      />
    </svg>
  );
}