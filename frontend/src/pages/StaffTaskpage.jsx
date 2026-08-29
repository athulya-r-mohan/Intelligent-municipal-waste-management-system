import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Recycle,
  Truck,
} from "lucide-react";

// ============================================================
// API BASE URL
// ============================================================
const API_BASE_URL = "http://127.0.0.1:8000";

const getAccessToken = () => {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    ""
  );
};

// ---------------------------------------------------------------------------
// Calendar widget — compact, shows the real current month, today highlighted
// ---------------------------------------------------------------------------
function MiniCalendar() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
 
  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
 
  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    return cells;
  }, [viewDate]);
 
  const isToday = (d) =>
    d === today.getDate() &&
    viewDate.getMonth() === today.getMonth() &&
    viewDate.getFullYear() === today.getFullYear();
 
  const changeMonth = (delta) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  };
 
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #cfe7bb",
        borderRadius: 12,
        padding: "10px 12px",
        width: 200,
        boxShadow: "0 1px 3px rgba(76,122,46,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <CalendarIcon size={14} color="#4c7a2e" />
        <span style={{ fontWeight: 600, fontSize: 12.5, color: "#2f4a1c" }}>Calendar</span>
      </div>
 
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <button
          onClick={() => changeMonth(-1)}
          style={{
            border: "none",
            background: "#eef7e9",
            borderRadius: 6,
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="Previous month"
        >
          <ChevronLeft size={12} color="#4c7a2e" />
        </button>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#2f4a1c" }}>{monthLabel}</span>
        <button
          onClick={() => changeMonth(1)}
          style={{
            border: "none",
            background: "#eef7e9",
            borderRadius: 6,
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="Next month"
        >
          <ChevronRight size={12} color="#4c7a2e" />
        </button>
      </div>
 
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          marginBottom: 2,
        }}
      >
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              fontSize: 9,
              fontWeight: 600,
              color: "#7fa363",
              padding: "1px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>
 
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {days.map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              fontSize: 10.5,
              padding: "4px 0",
              borderRadius: 6,
              color: d ? (isToday(d) ? "#ffffff" : "#39511f") : "transparent",
              background: d && isToday(d) ? "#6faa3c" : "transparent",
              fontWeight: d && isToday(d) ? 700 : 400,
            }}
          >
            {d || ""}
          </div>
        ))}
      </div>
    </div>
  );
}
 
// ---------------------------------------------------------------------------
// Task table
// ---------------------------------------------------------------------------
function TaskTable({ tasks, loading, error, onStatusClick }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #cfe7bb",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(76,122,46,0.08)",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ background: "#eaf5e0" }}>
            {["S.No", "Today's Pickup", "Ward", "Waste Type", "Task Status"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  color: "#2f4a1c",
                  fontWeight: 600,
                  borderBottom: "1px solid #cfe7bb",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td
                colSpan="5"
                style={{
                  textAlign: "center",
                  padding: "28px",
                  color: "#5f8a45",
                  fontWeight: 500,
                }}
              >
                Loading assigned tasks...
              </td>
            </tr>
          )}

          {!loading && error && (
            <tr>
              <td
                colSpan="5"
                style={{
                  textAlign: "center",
                  padding: "28px",
                  color: "#b64a4a",
                  fontWeight: 500,
                }}
              >
                {error}
              </td>
            </tr>
          )}

          {!loading && !error && tasks.length === 0 && (
            <tr>
              <td
                colSpan="5"
                style={{
                  textAlign: "center",
                  padding: "28px",
                  color: "#5f8a45",
                  fontWeight: 500,
                }}
              >
                No pickup tasks assigned to you yet.
              </td>
            </tr>
          )}

          {!loading && !error && tasks.map((t, idx) => (
            <tr
              key={t.id}
              style={{
                borderBottom: idx === tasks.length - 1 ? "none" : "1px solid #eef3e8",
              }}
            >
              <td style={{ padding: "14px 16px", color: "#39511f" }}>{idx + 1}</td>
              <td style={{ padding: "14px 16px", color: "#243515", fontWeight: 500 }}>
                {t.pickup}
              </td>
              <td style={{ padding: "14px 16px", color: "#39511f" }}>{t.ward}</td>
              <td style={{ padding: "14px 16px", color: "#39511f" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#f2f8ec",
                    color: "#4c7a2e",
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 12.5,
                  }}
                >
                  <Recycle size={13} /> {t.wasteType}
                </span>
              </td>
              <td style={{ padding: "14px 16px" }}>
                <button
                  onClick={() => onStatusClick(t)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#6faa3c",
                    color: "#ffffff",
                    border: "none",
                    padding: "7px 14px",
                    borderRadius: 20,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Truck size={13} />
                  {t.status || "Status"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
 
// ---------------------------------------------------------------------------
// Complaint Route Modal
// ---------------------------------------------------------------------------
function ComplaintRouteModal({ complaint, onClose }) {
  if (!complaint) return null;

  const lat = complaint.latitude;
  const lng = complaint.longitude;
  const hasCoords = lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng));

  const handleOpenGoogleMaps = () => {
    if (hasCoords) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        "_blank"
      );
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(complaint.location_name)}`,
        "_blank"
      );
    }
  };

  const handleOpenOSM = () => {
    if (hasCoords) {
      window.open(
        `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%2C;${lat}%2C${lng}`,
        "_blank"
      );
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 36, 26, 0.48)",
        backdropFilter: "blur(2px)",
        zIndex: 999,
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
          maxWidth: 480,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #cfe7bb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f5faf0",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, color: "#2f4a1c" }}>
            Route to Complaint #{complaint.id || complaint.complaint_id}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: "#5f8a45",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#5f8a45", textTransform: "uppercase" }}>
              Destination Location
            </span>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#243515", marginTop: 4 }}>
              {complaint.location_name}
            </div>
            {hasCoords && (
              <div style={{ fontSize: 12, color: "#6c8479", marginTop: 2 }}>
                Coordinates: {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
              </div>
            )}
          </div>

          <div
            style={{
              background: "#eaf5e0",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 20,
              fontSize: 12.5,
              color: "#2f4a1c",
            }}
          >
            🗺️ Click below to launch GPS turn-by-turn navigation from your current live location directly to this waste spot.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={handleOpenGoogleMaps}
              style={{
                background: "#1e6b4e",
                color: "#ffffff",
                border: "none",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              📍 Open Google Maps Live Navigation
            </button>

            {hasCoords && (
              <button
                type="button"
                onClick={handleOpenOSM}
                style={{
                  background: "#ffffff",
                  color: "#2f4a1c",
                  border: "1px solid #cfe7bb",
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                OpenStreetMap Route Directions
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #cfe7bb",
            background: "#f5faf0",
            textAlign: "right",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "#ffffff",
              border: "1px solid #cfe7bb",
              color: "#5f8a45",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resolve Complaint & Proof Upload Modal
// ---------------------------------------------------------------------------
function ResolveComplaintModal({ complaint, onClose, onResolveSuccess }) {
  const [proofFile, setProofFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg("");
    }
  };

  const handleConfirmResolve = async () => {
    if (!proofFile) {
      setErrorMsg("Please upload a proof image showing that the waste has been cleared.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const token = getAccessToken();
      const formData = new FormData();
      formData.append("status", "RESOLVED");
      formData.append("proof_image", proofFile);

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/waste/staff/complaints/${complaint.id || complaint.complaint_id}/update/`,
        formData,
        config
      );

      onResolveSuccess(response.data?.complaint || null, complaint.id);
      onClose();
    } catch (err) {
      console.error("Failed to resolve complaint:", err);
      setErrorMsg(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to mark complaint as resolved. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 36, 26, 0.48)",
        backdropFilter: "blur(2px)",
        zIndex: 999,
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
          maxWidth: 480,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #cfe7bb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f5faf0",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, color: "#2f4a1c" }}>
            Resolve Complaint #{complaint.id || complaint.complaint_id}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: "#5f8a45",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#5f8a45", textTransform: "uppercase" }}>
              Location
            </span>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#243515", marginTop: 3 }}>
              {complaint.location_name}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 12.5,
                fontWeight: 700,
                color: "#2f4a1c",
                marginBottom: 6,
              }}
            >
              Upload Proof of Waste Cleared *
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px dashed #4c7a2e",
                borderRadius: 8,
                background: "#f9fcf8",
                fontSize: 12.5,
              }}
            />
          </div>

          {previewUrl && (
            <div style={{ marginBottom: 16, textAlign: "center" }}>
              <img
                src={previewUrl}
                alt="Proof Preview"
                style={{
                  maxHeight: 180,
                  maxWidth: "100%",
                  borderRadius: 8,
                  border: "1px solid #cfe7bb",
                  objectFit: "cover",
                }}
              />
              <div style={{ fontSize: 11.5, color: "#5f8a45", marginTop: 4 }}>
                Proof photo ready for submission
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                color: "#b91c1c",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              {errorMsg}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #cfe7bb",
            background: "#f5faf0",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: "#ffffff",
              border: "1px solid #cfe7bb",
              color: "#5f8a45",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmResolve}
            disabled={submitting}
            style={{
              background: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "7px 16px",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {submitting ? "Uploading Proof..." : "Confirm Waste Cleared"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Complaint Tasks Table (Assigned Public Complaints)
// ---------------------------------------------------------------------------
function ComplaintTaskTable({
  complaints,
  loading,
  error,
  onStatusUpdate,
  onOpenRoute,
  onOpenResolveModal,
  onPreviewImage,
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #cfe7bb",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(76,122,46,0.08)",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ background: "#eaf5e0" }}>
            {[
              "ID",
              "Waste Photo",
              "Dumped Location",
              "Priority",
              "Citizen Info",
              "Description",
              "Status",
              "Route / Nav",
              "Action",
            ].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  color: "#2f4a1c",
                  fontWeight: 600,
                  borderBottom: "1px solid #cfe7bb",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td
                colSpan="9"
                style={{
                  textAlign: "center",
                  padding: "28px",
                  color: "#5f8a45",
                  fontWeight: 500,
                }}
              >
                Loading assigned complaints...
              </td>
            </tr>
          )}

          {!loading && error && (
            <tr>
              <td
                colSpan="9"
                style={{
                  textAlign: "center",
                  padding: "28px",
                  color: "#b64a4a",
                  fontWeight: 500,
                }}
              >
                {error}
              </td>
            </tr>
          )}

          {!loading && !error && complaints.length === 0 && (
            <tr>
              <td
                colSpan="9"
                style={{
                  textAlign: "center",
                  padding: "28px",
                  color: "#5f8a45",
                  fontWeight: 500,
                }}
              >
                No public waste complaints assigned to you.
              </td>
            </tr>
          )}

          {!loading && !error && complaints.map((c, idx) => (
            <tr
              key={c.id || c.complaint_id}
              style={{
                borderBottom: idx === complaints.length - 1 ? "none" : "1px solid #eef3e8",
              }}
            >
              {/* ID */}
              <td style={{ padding: "14px 16px", fontWeight: 700, color: "#1e6b4e" }}>
                #{c.id || c.complaint_id}
              </td>

              {/* PHOTO */}
              <td style={{ padding: "14px 16px" }}>
                {c.image_url || c.image ? (
                  <img
                    src={c.image_url || c.image}
                    alt="Waste"
                    onClick={() => onPreviewImage(c.image_url || c.image)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      objectFit: "cover",
                      cursor: "pointer",
                      border: "1px solid #cfe7bb",
                    }}
                    title="Click to zoom"
                  />
                ) : (
                  <span style={{ color: "#9ca3af", fontSize: 11 }}>No photo</span>
                )}
              </td>

              {/* LOCATION */}
              <td style={{ padding: "14px 16px", color: "#243515", fontWeight: 500, maxWidth: 180 }}>
                {c.location_name || "N/A"}
              </td>

              {/* PRIORITY */}
              <td style={{ padding: "14px 16px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 10px",
                    borderRadius: 14,
                    fontSize: 11.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    background:
                      c.priority === "HIGH"
                        ? "#fee2e2"
                        : c.priority === "MEDIUM"
                        ? "#fef3c7"
                        : "#dcfce7",
                    color:
                      c.priority === "HIGH"
                        ? "#dc2626"
                        : c.priority === "MEDIUM"
                        ? "#d97706"
                        : "#16a34a",
                    border: `1px solid ${
                      c.priority === "HIGH"
                        ? "#fca5a5"
                        : c.priority === "MEDIUM"
                        ? "#fcd34d"
                        : "#86efac"
                    }`,
                  }}
                >
                  {c.priority}
                </span>
              </td>

              {/* CITIZEN */}
              <td style={{ padding: "14px 16px", color: "#39511f", fontSize: 12.5 }}>
                <strong>{c.user_name || "Citizen"}</strong>
                <div style={{ color: "#6c8479", fontSize: 11.5 }}>{c.phone || c.email}</div>
              </td>

              {/* DESCRIPTION */}
              <td style={{ padding: "14px 16px", color: "#446152", fontSize: 12.5, maxWidth: 200 }}>
                {c.description}
              </td>

              {/* STATUS */}
              <td style={{ padding: "14px 16px" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 9px",
                    borderRadius: 12,
                    fontSize: 11.5,
                    fontWeight: 600,
                    background:
                      c.status === "RESOLVED"
                        ? "#dcfce7"
                        : c.status === "IN_PROGRESS"
                        ? "#fef3c7"
                        : "#eff6ff",
                    color:
                      c.status === "RESOLVED"
                        ? "#15803d"
                        : c.status === "IN_PROGRESS"
                        ? "#b45309"
                        : "#1d4ed8",
                  }}
                >
                  {c.status}
                </span>
              </td>

              {/* ROUTE BUTTON */}
              <td style={{ padding: "14px 16px" }}>
                <button
                  type="button"
                  onClick={() => onOpenRoute(c)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #4c7a2e",
                    color: "#2f4a1c",
                    padding: "5px 10px",
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  🗺️ Route
                </button>
              </td>

              {/* ACTION */}
              <td style={{ padding: "14px 16px" }}>
                {c.status !== "RESOLVED" ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    {c.status === "ASSIGNED" && (
                      <button
                        onClick={() => onStatusUpdate(c.id, "IN_PROGRESS")}
                        style={{
                          background: "#eab308",
                          color: "#ffffff",
                          border: "none",
                          padding: "5px 10px",
                          borderRadius: 8,
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Start
                      </button>
                    )}
                    <button
                      onClick={() => onOpenResolveModal(c)}
                      style={{
                        background: "#16a34a",
                        color: "#ffffff",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Resolve
                    </button>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: 11.5, color: "#16a34a", fontWeight: 700, display: "block" }}>
                      ✓ Cleared
                    </span>
                    {c.proof_image_url || c.proof_image ? (
                      <button
                        type="button"
                        onClick={() => onPreviewImage(c.proof_image_url || c.proof_image)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#1e6b4e",
                          fontSize: 11,
                          cursor: "pointer",
                          textDecoration: "underline",
                          padding: 0,
                          marginTop: 2,
                        }}
                      >
                        View Proof
                      </button>
                    ) : null}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------
export default function MyTaskDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pickups"); // "pickups" | "complaints"

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintError, setComplaintError] = useState("");

  const [activeRouteComplaint, setActiveRouteComplaint] = useState(null);
  const [activeResolveComplaint, setActiveResolveComplaint] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);


  // Fetch Pickup Tasks
  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getAccessToken();
      const config = token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : {};

      const response = await axios.get(
        `${API_BASE_URL}/api/waste/staff/my-tasks/`,
        config
      );

      const raw = response.data;
      const data = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.tasks)
        ? raw.tasks
        : Array.isArray(raw?.results)
        ? raw.results
        : Array.isArray(raw?.data)
        ? raw.data
        : [];

      const formatted = data.map((item) => ({
        id: item.request_id || item.id,
        pickup: item.pickup_location || item.location_name || "N/A",
        ward: item.ward || (item.ward_id ? `Ward ${item.ward_id}` : "N/A"),
        wasteType: item.waste_type || "Waste",
        status: item.status || "ASSIGNED",
        date: item.date || "",
        userName: item.user_name || "",
        phone: item.phone || "",
      }));

      setTasks(formatted);
    } catch (err) {
      console.error("Failed to load staff tasks:", err);
      if (err.response?.status === 401) {
        setError("Please login to view your assigned tasks.");
      } else if (err.response?.status === 403) {
        setError("Access restricted to staff members only.");
      } else {
        setError("Failed to load assigned tasks. Please check backend server.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch Complaint Tasks
  const fetchMyComplaints = async () => {
    try {
      setLoadingComplaints(true);
      setComplaintError("");

      const token = getAccessToken();
      const config = token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : {};

      const response = await axios.get(
        `${API_BASE_URL}/api/waste/staff/my-complaints/`,
        config
      );

      const data = response.data?.complaints || response.data || [];
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load assigned complaints:", err);
      if (err.response?.status === 401) {
        setComplaintError("Please login to view your assigned complaints.");
      } else if (err.response?.status === 403) {
        setComplaintError("Access restricted to staff members only.");
      } else {
        setComplaintError("Failed to load assigned complaints.");
      }
    } finally {
      setLoadingComplaints(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
    fetchMyComplaints();
  }, []);

  const handleStatusClick = (task) => {
    navigate(`/taskupdate/${task.id}`);
  };

  const handleComplaintStatusUpdate = async (complaintId, newStatus) => {
    try {
      const token = getAccessToken();
      const config = token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : {};

      await axios.post(
        `${API_BASE_URL}/api/waste/staff/complaints/${complaintId}/update/`,
        { status: newStatus },
        config
      );

      fetchMyComplaints();
    } catch (err) {
      console.error("Failed to update complaint status:", err);
      alert("Failed to update complaint status.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5faf0",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "28px 32px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 20,
          marginBottom: 26,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={() => navigate("/staff")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#ffffff",
                border: "1px solid #cfe7bb",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12.5,
                fontWeight: 600,
                color: "#2f4a1c",
                cursor: "pointer",
              }}
            >
              Dashboard
            </button>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#ffffff",
                border: "1px solid #cfe7bb",
                borderRadius: 10,
                padding: "8px 16px",
              }}
            >
              <Trash2 size={16} color="#4c7a2e" />
              <span style={{ fontWeight: 700, fontSize: 15, color: "#2f4a1c" }}>My Assigned Tasks</span>
            </div>
          </div>

          <p style={{ margin: "10px 0 14px", fontSize: 13, color: "#5f8a45" }}>
            View and manage pickup requests and public complaints assigned to you
          </p>

          {/* TASK TYPE TABS */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setActiveTab("pickups")}
              style={{
                padding: "7px 16px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid",
                borderColor: activeTab === "pickups" ? "#4c7a2e" : "#cfe7bb",
                background: activeTab === "pickups" ? "#4c7a2e" : "#ffffff",
                color: activeTab === "pickups" ? "#ffffff" : "#2f4a1c",
              }}
            >
              Pickup Tasks ({tasks.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("complaints")}
              style={{
                padding: "7px 16px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid",
                borderColor: activeTab === "complaints" ? "#4c7a2e" : "#cfe7bb",
                background: activeTab === "complaints" ? "#4c7a2e" : "#ffffff",
                color: activeTab === "complaints" ? "#ffffff" : "#2f4a1c",
              }}
            >
              Complaint Tasks ({complaints.length})
            </button>
          </div>
        </div>
        <MiniCalendar />
      </div>

      {activeTab === "pickups" ? (
        <TaskTable
          tasks={tasks}
          loading={loading}
          error={error}
          onStatusClick={handleStatusClick}
        />
      ) : (
        <ComplaintTaskTable
          complaints={complaints}
          loading={loadingComplaints}
          error={complaintError}
          onStatusUpdate={handleComplaintStatusUpdate}
          onOpenRoute={(c) => setActiveRouteComplaint(c)}
          onOpenResolveModal={(c) => setActiveResolveComplaint(c)}
          onPreviewImage={(url) => setPreviewImageUrl(url)}
        />
      )}

      {/* ROUTE MODAL */}
      {activeRouteComplaint && (
        <ComplaintRouteModal
          complaint={activeRouteComplaint}
          onClose={() => setActiveRouteComplaint(null)}
        />
      )}

      {/* RESOLVE & PROOF MODAL */}
      {activeResolveComplaint && (
        <ResolveComplaintModal
          complaint={activeResolveComplaint}
          onClose={() => setActiveResolveComplaint(null)}
          onResolveSuccess={() => {
            fetchMyComplaints();
          }}
        />
      )}

      {/* PREVIEW IMAGE LIGHTBOX */}
      {previewImageUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setPreviewImageUrl(null)}
        >
          <div style={{ maxWidth: 640, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImageUrl}
              alt="Full Preview"
              style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 8 }}
            />
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                style={{
                  background: "#ffffff",
                  color: "#2f4a1c",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

 