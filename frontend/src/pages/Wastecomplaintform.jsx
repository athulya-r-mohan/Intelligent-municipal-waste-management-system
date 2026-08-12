import React, { useState, useRef, useCallback } from "react";
import "../components/wastecomplaintform.css"
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
} from 'lucide-react';

export default function ComplaintForm({ onBack = () => {} }) {
  const [complaintText, setComplaintText] = useState('');
  const [images, setImages] = useState([]);
  const [locationMode, setLocationMode] = useState(null); // 'current' | 'pick'
  const [currentLocation, setCurrentLocation] = useState(null);
  const [pinPosition, setPinPosition] = useState(null); // {x, y} in %
  const [geoError, setGeoError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success
  const [locationText, setLocationText] = useState('');

  const fileInputRef = useRef(null);
  const mapRef = useRef(null);

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const next = files.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(f),
      name: f.name,
    }));
    setImages((prev) => [...prev, ...next]);
  };

  const removeImage = (id) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleShareLocation = () => {
    setLocationMode('current');
    setGeoError('');
    setPinPosition(null);
    if (!navigator.geolocation) {
      setGeoError('Location isn\u2019t available on this device. Try pinning it on the map instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude.toFixed(4),
          lng: pos.coords.longitude.toFixed(4),
        };
        setCurrentLocation(loc);
        setLocationText(`${loc.lat}, ${loc.lng}`);
      },
      () => {
        setGeoError('Couldn\u2019t get your location. Try pinning it on the map instead.');
        setLocationText('');
      }
    );
  };

  const handlePickLocation = () => {
    setLocationMode('pick');
    setCurrentLocation(null);
    setGeoError('');
    setLocationText('');
  };

  const handleMapClick = (e) => {
    if (locationMode !== 'pick' || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clamped = { x: Math.min(96, Math.max(4, x)), y: Math.min(92, Math.max(8, y)) };
    setPinPosition(clamped);
    setLocationText(`Pinned at ${clamped.x.toFixed(1)}%, ${clamped.y.toFixed(1)}% on map`);
  };

  const hasLocation = Boolean(currentLocation || pinPosition);
  const canSubmit = complaintText.trim().length > 0 && hasLocation && status === 'idle';

  const handleSubmit = () => {
    if (!canSubmit) return;
    setStatus('submitting');
    window.setTimeout(() => setStatus('success'), 3400);
  };

  const resetForm = () => {
    setComplaintText('');
    setImages([]);
    setLocationMode(null);
    setCurrentLocation(null);
    setPinPosition(null);
    setGeoError('');
    setLocationText('');
    setStatus('idle');
  };

  return (
    <div className="cf-root">
      <div className="cf-header">
        <div className="cf-logo">
          <div className="cf-logo-badge">
            <Activity size={17} strokeWidth={2.5} color="#ffffff" />
          </div>
          <span className="cf-logo-text">Eco<span>Pulse</span></span>
        </div>
        <button className="cf-back-btn" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={15} />
          Back
        </button>
      </div>

      <div className="cf-heading-wrap">
        <div className="cf-heading-pill">
          Register your complaint here<span className="cf-heading-bang">!!</span>
        </div>
      </div>

      <div className="cf-split">
        {/* MAP */}
        <div
          ref={mapRef}
          className={`cf-map-card${locationMode === 'pick' ? ' cf-pick-mode' : ''}`}
          onClick={handleMapClick}
          role="img"
          aria-label="Map area to pick a complaint location"
        >
          <div className="cf-map-road" style={{ top: '30%', left: 0, right: 0, height: '10px' }} />
          <div className="cf-map-road" style={{ top: 0, bottom: 0, left: '62%', width: '10px' }} />
          <div className="cf-map-label">Map</div>
          {locationMode === 'pick' && !pinPosition && (
            <div className="cf-map-hint">Tap the map to drop a pin</div>
          )}
          {pinPosition && (
            <div className="cf-map-pin" style={{ left: `${pinPosition.x}%`, top: `${pinPosition.y}%` }}>
              <MapPin size={30} fill="var(--cf-mint-2)" />
            </div>
          )}
        </div>

        {/* FORM */}
        <div className="cf-form-card">
          <div>
            <span className="cf-field-label">Describe your complaint</span>
            <textarea
              className="cf-textarea"
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              placeholder="Tell us what happened \u2014 missed pickup, overflowing bin, damaged property, etc."
            />
          </div>

          <div>
            <span className="cf-field-label">
              Add photo <span className="cf-field-optional">(optional)</span>
            </span>
            <div className="cf-upload-box">
              {images.length === 0 ? (
                <div
                  className="cf-upload-empty"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                >
                  <Upload size={26} />
                  <span className="cf-upload-title">Click to add photo evidence</span>
                  <span className="cf-upload-sub">You can add more than one photo</span>
                </div>
              ) : (
                <div className="cf-thumb-grid">
                  {images.map((img) => (
                    <div className="cf-thumb" key={img.id}>
                      <img src={img.url} alt={img.name} />
                      <button
                        className="cf-thumb-remove"
                        onClick={() => removeImage(img.id)}
                        aria-label={`Remove ${img.name}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <div
                    className="cf-thumb-add"
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
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
                e.target.value = '';
              }}
            />
          </div>

          <div>
            <span className="cf-field-label">Select location</span>
            <div className="cf-location-buttons">
              <button
                className={`cf-loc-btn${locationMode === 'current' ? ' active' : ''}`}
                onClick={handleShareLocation}
              >
                <Navigation size={15} />
                Share current location
              </button>
              <button
                className={`cf-loc-btn${locationMode === 'pick' ? ' active' : ''}`}
                onClick={handlePickLocation}
              >
                <MapPin size={15} />
                Pick a location
              </button>
            </div>

            {geoError && <div className="cf-loc-status cf-error">{geoError}</div>}

            {locationMode && (
              <div className="cf-loc-shown">
                <MapPin size={14} />
                <input
                  type="text"
                  className="cf-loc-input"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder={
                    locationMode === 'current'
                      ? 'Fetching your current location\u2026'
                      : 'Tap the map to drop a pin'
                  }
                  aria-label="Selected complaint location"
                />
              </div>
            )}

            {!geoError && locationMode === 'pick' && pinPosition && (
              <span className="cf-loc-note">Tap the map again to move the pin.</span>
            )}
          </div>

          <div className="cf-spacer" />

          <button className="cf-submit-btn" onClick={handleSubmit} disabled={!canSubmit}>
            Submit complaint
          </button>

          {status === 'submitting' && (
            <div className="cf-send-stage">
              <div className="cf-send-track">
                <div className="cf-send-path" />
                <div className="cf-send-trail t1" />
                <div className="cf-send-trail t2" />
                <div className="cf-send-trail t3" />
                <Send className="cf-send-icon" size={34} />
                <div className="cf-inbox">
                  <Inbox size={30} />
                </div>
              </div>
              <p className="cf-send-caption">Sending your complaint\u2026</p>
            </div>
          )}

          {status === 'success' && (
            <div className="cf-success">
              <CheckCircle2 size={46} color="var(--cf-primary)" />
              <h3>Complaint registered!</h3>
              <p>Our team will look into it shortly.</p>
              <button className="cf-secondary-btn" onClick={resetForm}>
                Register another complaint
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}