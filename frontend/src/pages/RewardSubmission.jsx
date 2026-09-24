import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { getAccessToken } from "../utils/auth";
import NotificationBell from "../components/NotificationBell";

export default function RewardSubmission() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [date, setDate] = useState("");
  const [binLocation, setBinLocation] = useState("");
  const [customBinLocation, setCustomBinLocation] = useState("");
  const [wasteType, setWasteType] = useState("");
  const [estimatedQuantity, setEstimatedQuantity] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setErrorMessage("");
    setSuccessMessage("");

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage("Please upload a valid image file (JPG, JPEG, PNG, WEBP).");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (!validTypes.includes(file.type.toLowerCase())) {
        setErrorMessage("Please upload a valid image file (JPG, JPEG, PNG, WEBP).");
        setSelectedFile(null);
        setPreviewUrl(null);
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMessage("");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!date) {
      setErrorMessage("Please select the date.");
      return;
    }

    if (!binLocation) {
      setErrorMessage("Please select the bin location.");
      return;
    }

    if (binLocation === "Other" && !customBinLocation.trim()) {
      setErrorMessage("Please specify the bin location.");
      return;
    }

    if (!wasteType) {
      setErrorMessage("Please select the type of waste.");
      return;
    }

    if (!estimatedQuantity || isNaN(parseFloat(estimatedQuantity)) || parseFloat(estimatedQuantity) <= 0) {
      setErrorMessage("Please enter a valid estimated quantity greater than 0 kg.");
      return;
    }

    if (!selectedFile) {
      setErrorMessage("Please upload a photo before submitting.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setErrorMessage("Authentication required. Please log in again.");
      return;
    }

    setSubmitting(true);
    try {
      const finalLocation = binLocation === "Other" ? customBinLocation.trim() : binLocation;
      const formData = new FormData();
      formData.append("date", date);
      formData.append("bin_location", finalLocation);
      formData.append("waste_type", wasteType);
      formData.append("estimated_quantity", estimatedQuantity);
      formData.append("photo", selectedFile);

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const response = await API.post("/waste/reward-submissions/submit/", formData, {
        headers,
      });

      if (response.data && response.data.success) {
        setSuccessMessage("Reward submission sent successfully.");
        setDate("");
        setBinLocation("");
        setCustomBinLocation("");
        setWasteType("");
        setEstimatedQuantity("");
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setErrorMessage(response.data?.error || "Failed to submit reward. Please try again.");
      }
    } catch (err) {
      console.error("Reward submission error:", err);
      let serverErr = "An error occurred while sending your submission. Please try again.";
      const data = err.response?.data;
      if (data) {
        if (typeof data === "string") {
          serverErr = data;
        } else if (data.error) {
          serverErr = data.error;
        } else if (data.detail) {
          serverErr = data.detail;
        } else if (data.message) {
          serverErr = data.message;
        } else if (typeof data === "object") {
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
            const val = data[firstKey];
            serverErr = Array.isArray(val) ? `${firstKey}: ${val[0]}` : `${firstKey}: ${val}`;
          }
        }
      }
      setErrorMessage(serverErr);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reward-page-root">
      <style>{`
        .reward-page-root {
          --bg: #f3faf6;
          --white: #ffffff;
          --mint: #e3f5eb;
          --mint-2: #d3eee0;
          --mint-3: #c5e8d7;
          --green: #18a862;
          --green-deep: #0f8a4f;
          --green-bright: #2ecb84;
          --ink: #0e2419;
          --muted: #5b7268;
          --panel: #eafcf1;
          --line: #d7ecdf;
          --shadow: 0 1px 2px rgba(14,36,25,.04), 0 12px 28px -12px rgba(14,36,25,.14);
          font-family: 'Inter', system-ui, sans-serif;
          background: var(--bg);
          color: var(--ink);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .reward-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 40px;
          background: var(--white);
          border-bottom: 1px solid var(--line);
          position: sticky;
          top: 0;
          z-index: 40;
        }
        .reward-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .reward-back-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid var(--mint-3);
          background: var(--mint);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--green);
          cursor: pointer;
          transition: transform .18s ease, background .18s ease;
        }
        .reward-back-btn:hover {
          background: var(--mint-2);
          transform: translateX(-2px);
        }
        .reward-logo-mark {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: var(--green);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 14px -6px rgba(12,107,69,.55);
        }
        .reward-brand {
          font-family: 'Space Grotesk', 'Inter', sans-serif;
          font-size: 19px;
          font-weight: 700;
          color: var(--ink);
          letter-spacing: -.01em;
          display: flex;
          gap: 5px;
        }
        .reward-brand .accent {
          color: var(--green);
        }
        .reward-container {
          max-width: 680px;
          width: 100%;
          margin: 40px auto;
          padding: 0 20px;
          flex: 1;
        }
        .reward-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 24px;
          padding: 36px 32px;
          box-shadow: var(--shadow);
        }
        .reward-card-title {
          font-family: 'Space Grotesk', 'Inter', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: var(--ink);
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .reward-card-desc {
          color: var(--muted);
          font-size: 14.5px;
          margin: 0 0 28px 0;
          line-height: 1.5;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .field-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 8px;
        }
        .field-sublabel {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--muted);
          margin-bottom: 6px;
        }
        .field-required {
          color: #dc2626;
          margin-left: 3px;
        }
        .field-input, .field-select {
          width: 100%;
          box-sizing: border-box;
          background: var(--white);
          border: 1.5px solid var(--mint-3);
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 14px;
          color: var(--ink);
          outline: none;
          transition: border-color .18s ease, box-shadow .18s ease;
          font-family: inherit;
        }
        .field-input:focus, .field-select:focus {
          border-color: var(--green);
          box-shadow: 0 0 0 3px rgba(24, 168, 98, 0.14);
        }
        .field-select {
          cursor: pointer;
        }
        .input-unit-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .field-input.with-unit {
          padding-right: 54px;
        }
        .unit-badge {
          position: absolute;
          right: 12px;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--green-deep);
          background: var(--mint);
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid var(--mint-3);
          pointer-events: none;
        }
        .upload-section {
          margin-bottom: 24px;
        }
        .upload-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 10px;
        }
        .upload-dropzone {
          border: 2px dashed var(--mint-3);
          background: var(--panel);
          border-radius: 16px;
          padding: 32px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .upload-dropzone:hover {
          border-color: var(--green);
          background: var(--mint);
        }
        .upload-icon-circle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--green);
          box-shadow: 0 4px 10px rgba(12,107,69,.08);
        }
        .upload-prompt {
          font-size: 14.5px;
          font-weight: 600;
          color: var(--ink);
          margin: 0;
        }
        .upload-hint {
          font-size: 12.5px;
          color: var(--muted);
          margin: 0;
        }
        .preview-container {
          margin-top: 20px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid var(--mint-3);
          background: #f8fcfa;
          position: relative;
        }
        .preview-img {
          width: 100%;
          max-height: 320px;
          object-fit: contain;
          display: block;
          background: #00000008;
        }
        .preview-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: var(--white);
          border-top: 1px solid var(--line);
        }
        .preview-filename {
          font-size: 13px;
          color: var(--ink);
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 380px;
        }
        .preview-remove-btn {
          background: none;
          border: none;
          color: #dc2626;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.18s ease;
        }
        .preview-remove-btn:hover {
          background: #fee2e2;
        }
        .reward-alert-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13.5px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .reward-alert-success {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13.5px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .submit-btn {
          width: 100%;
          background: var(--green);
          color: #fff;
          border: none;
          border-radius: 14px;
          padding: 14px 24px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 8px 18px -8px rgba(12,107,69,.6);
          transition: all 0.2s ease;
        }
        .submit-btn:hover:not(:disabled) {
          background: var(--green-deep);
          transform: translateY(-1px);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 600px) {
          .reward-header {
            padding: 14px 18px;
          }
          .reward-card {
            padding: 24px 18px;
          }
          .form-row {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }
        }
      `}</style>

      {/* Header */}
      <header className="reward-header">
        <div className="reward-header-left">
          <button
            className="reward-back-btn"
            onClick={() => navigate("/user")}
            aria-label="Back to User Page"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="reward-logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M2 12h5l2-6 4 12 2-6h7"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="reward-brand">
            Eco <span className="accent">Pulse</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <NotificationBell />
        </div>
      </header>

      {/* Main Container */}
      <main className="reward-container">
        <div className="reward-card">
          <h1 className="reward-card-title">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--green)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="7" />
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            </svg>
            Reward Submission
          </h1>
          <p className="reward-card-desc">
            Submit your waste management or community cleanup activity details and photo to earn
            rewards upon verification by our municipal administration.
          </p>

          {/* Feedback alerts */}
          {errorMessage && (
            <div className="reward-alert-error" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="16" x2="12" y2="16.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="reward-alert-success" role="status">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Row 1: Date & Bin Location */}
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor="reward-date">
                  Date <span className="field-required">*</span>
                </label>
                <input
                  id="reward-date"
                  type="date"
                  className="field-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor="bin-location">
                  Bin Location <span className="field-required">*</span>
                </label>
                <select
                  id="bin-location"
                  className="field-select"
                  value={binLocation}
                  onChange={(e) => {
                    setBinLocation(e.target.value);
                    if (e.target.value !== "Other") {
                      setCustomBinLocation("");
                    }
                  }}
                  required
                >
                  <option value="">Select Bin Location</option>
                  <option value="Bus Stand">Bus Stand</option>
                  <option value="School">School</option>
                  <option value="Hospital">Hospital</option>
                  <option value="Railway Station">Railway Station</option>
                  <option value="Market">Market</option>
                  <option value="Residential Area">Residential Area</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* If "Other" selected for Bin Location, show custom input */}
            {binLocation === "Other" && (
              <div className="form-group">
                <label className="field-sublabel" htmlFor="custom-bin-location">
                  Specify Location <span className="field-required">*</span>
                </label>
                <input
                  id="custom-bin-location"
                  type="text"
                  className="field-input"
                  placeholder="e.g. Near Community Center, Park Road"
                  value={customBinLocation}
                  onChange={(e) => setCustomBinLocation(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Row 2: Type of Waste & Estimated Quantity */}
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor="waste-type">
                  Type of Waste <span className="field-required">*</span>
                </label>
                <select
                  id="waste-type"
                  className="field-select"
                  value={wasteType}
                  onChange={(e) => setWasteType(e.target.value)}
                  required
                >
                  <option value="">Select Waste Type</option>
                  <option value="Paper">Paper</option>
                  <option value="Plastic">Plastic</option>
                  <option value="Glass">Glass</option>
                  <option value="Metal">Metal</option>
                  <option value="Organic">Organic</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor="estimated-quantity">
                  Estimated Quantity <span className="field-required">*</span>
                </label>
                <div className="input-unit-wrap">
                  <input
                    id="estimated-quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 5"
                    className="field-input with-unit"
                    value={estimatedQuantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || parseFloat(val) >= 0) {
                        setEstimatedQuantity(val);
                      }
                    }}
                    required
                  />
                  <span className="unit-badge">kg</span>
                </div>
              </div>
            </div>

            {/* Photo Upload Section */}
            <div className="upload-section">
              <label className="upload-label" htmlFor="photo-upload">
                Upload Photo <span className="field-required">*</span>
              </label>

              <input
                id="photo-upload"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              <div
                className="upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className="upload-icon-circle">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="17 8 12 3 7 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="12"
                      y1="3"
                      x2="12"
                      y2="15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="upload-prompt">
                  {selectedFile ? "Click or drop to replace photo" : "Click to select or drag and drop photo"}
                </p>
                <p className="upload-hint">Supported formats: JPG, JPEG, PNG, WEBP (Image files only)</p>
              </div>

              {/* Image Preview */}
              {previewUrl && (
                <div className="preview-container">
                  <img src={previewUrl} alt="Reward preview" className="preview-img" />
                  <div className="preview-bar">
                    <span className="preview-filename">{selectedFile?.name}</span>
                    <button
                      type="button"
                      className="preview-remove-btn"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? (
                <>
                  <svg
                    className="spin"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ animation: "spin 1s linear infinite" }}
                  >
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path
                      d="M12 2a10 10 0 0 1 10 10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Submit</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
