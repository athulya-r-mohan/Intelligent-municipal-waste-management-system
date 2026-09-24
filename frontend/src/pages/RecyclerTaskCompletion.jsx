import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import API from "../api/api";
import { getAccessToken, performLogout } from "../utils/auth";
import NotificationBell from "../components/NotificationBell";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import "../components/Recyclerpage.css";
import {
  ArrowLeft,
  Activity,
  Recycle,
  CheckCircle2,
  AlertCircle,
  Clock,
  PackageCheck,
  FileText,
  Camera,
  Upload,
  X,
} from "lucide-react";

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function LiveCalendar() {
  const now = useLiveClock();

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div className="recycler-clock">
      <span className="recycler-clock-dot" />
      <div className="recycler-clock-text">
        <span className="recycler-clock-date">{dateStr}</span>
        <span className="recycler-clock-time">{timeStr}</span>
      </div>
    </div>
  );
}

function Logo({ onClick }) {
  return (
    <button className="recycler-logo" onClick={onClick} aria-label="Go to home page">
      <span className="recycler-logo-mark">
        <Activity size={16} strokeWidth={2.5} color="#ffffff" />
      </span>
      <span className="recycler-logo-text">
        <span className="recycler-logo-eco">Eco</span>
        <span className="recycler-logo-pulse">Pulse</span>
      </span>
    </button>
  );
}

const formatDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function RecyclerTaskCompletion() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const [task, setTask] = useState(location.state?.task || null);
  const [loading, setLoading] = useState(!location.state?.task);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [recyclableQuantity, setRecyclableQuantity] = useState("");
  const [note, setNote] = useState("");
  const [validationError, setValidationError] = useState("");

  const fileInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMsg("Please upload a valid image file (JPG, JPEG, PNG, WEBP).");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrorMsg("");
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!task && id) {
      fetchTask();
    }
  }, [id]);

  const fetchTask = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const token = getAccessToken();
      const res = await API.get("/waste/mcf/recycler/tasks/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        const foundPending = (res.data.pending_tasks || []).find(
          (t) => String(t.id) === String(id)
        );
        const foundCompleted = (res.data.completed_tasks || []).find(
          (t) => String(t.id) === String(id)
        );
        if (foundPending) {
          setTask(foundPending);
        } else if (foundCompleted) {
          setTask(foundCompleted);
          setErrorMsg("This recycling task has already been completed.");
        } else {
          setErrorMsg("Recycling task not found.");
        }
      } else {
        setErrorMsg(res.data?.error || "Failed to load task details.");
      }
    } catch (err) {
      console.error("Error fetching task details:", err);
      setErrorMsg(
        err.response?.data?.error || "Failed to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (e) => {
    const val = e.target.value;
    setRecyclableQuantity(val);

    if (val === "" || val === null) {
      setValidationError("");
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num)) {
      setValidationError("Please enter a valid number.");
    } else if (num < 0) {
      setValidationError("Recyclable quantity cannot be negative.");
    } else if (task && num > parseFloat(task.total_quantity)) {
      setValidationError(
        `Recyclable quantity cannot exceed assigned quantity of ${parseFloat(
          task.total_quantity
        ).toFixed(2)} kg.`
      );
    } else {
      setValidationError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!task) return;

    if (!recyclableQuantity || recyclableQuantity.trim() === "") {
      setValidationError("Recyclable waste quantity is required.");
      return;
    }

    const num = parseFloat(recyclableQuantity);
    if (isNaN(num)) {
      setValidationError("Please enter a valid numeric recyclable quantity.");
      return;
    }

    if (num < 0) {
      setValidationError("Recyclable quantity cannot be negative.");
      return;
    }

    if (num > parseFloat(task.total_quantity)) {
      setValidationError(
        `Recyclable quantity cannot exceed assigned quantity of ${parseFloat(
          task.total_quantity
        ).toFixed(2)} kg.`
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("assignment_id", task.id);
      formData.append("recyclable_quantity", num);
      formData.append("note", note.trim());
      if (imageFile) {
        formData.append("recycling_image", imageFile);
      }

      const res = await API.post(
        "/waste/mcf/recycler/complete-task/",
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data?.success) {
        setSuccessMsg("Recycling task completed successfully.");
        setTimeout(() => {
          navigate("/recycler");
        }, 1200);
      } else {
        setErrorMsg(res.data?.error || "Failed to complete recycling task.");
      }
    } catch (err) {
      console.error("Error completing recycling task:", err);
      setErrorMsg(
        err.response?.data?.error || "An error occurred while submitting."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="recycler-root">
      <header className="recycler-topbar">
        <div className="recycler-topbar-left">
          <button
            className="recycler-back"
            onClick={() => navigate("/recycler")}
            aria-label="Back to Recycler Dashboard"
          >
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
          <Logo onClick={() => navigate("/recycler")} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <NotificationBell />
          <LiveCalendar />
        </div>
      </header>

      <div className="recycler-layout">
        <main className="recycler-main" style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 className="recycler-main-heading">Recycler Task Completion</h1>
              <p className="recycler-main-sub">
                Record actual recyclable quantity and notes to finalize this task.
              </p>
            </div>
            <button
              className="recycler-btn-secondary"
              onClick={() => navigate("/recycler")}
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          </div>

          {loading ? (
            <div className="recycler-empty-state">
              <Clock size={32} className="recycler-empty-icon" />
              <p>Loading task details...</p>
            </div>
          ) : errorMsg && !task ? (
            <div className="recycler-completion-container">
              <div className="recycler-error-msg">
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
              <button
                className="recycler-btn-secondary"
                onClick={() => navigate("/recycler")}
              >
                Return to Dashboard
              </button>
            </div>
          ) : task ? (
            <div className="recycler-completion-container">
              {successMsg && (
                <div className="recycler-success-msg">
                  <CheckCircle2 size={20} />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="recycler-error-msg">
                  <AlertCircle size={18} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* CARD 1: RECYCLING TASK DETAILS */}
              <div className="recycler-form-card">
                <h2 className="recycler-form-card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Recycle size={18} color="var(--ep-green-dark)" />
                  Recycling Task Details
                </h2>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                  <div className="recycler-task-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                    <span className="recycler-task-label">Waste Type</span>
                    <span className="recycler-task-waste-type">{task.waste_type}</span>
                  </div>

                  <div className="recycler-task-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                    <span className="recycler-task-label">Assigned Quantity</span>
                    <span className="recycler-task-value" style={{ fontSize: 18, color: "var(--ep-green-dark)" }}>
                      {parseFloat(task.total_quantity).toFixed(2)} kg
                    </span>
                  </div>

                  <div className="recycler-task-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                    <span className="recycler-task-label">Assigned Date</span>
                    <span className="recycler-task-value">{formatDate(task.date)}</span>
                  </div>

                  <div className="recycler-task-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                    <span className="recycler-task-label">Status</span>
                    <span className={`recycler-badge ${task.status === "COMPLETED" ? "completed" : "pending"}`}>
                      {task.status === "COMPLETED" ? "Completed" : "Assigned"}
                    </span>
                  </div>

                  {task.note && task.note.trim() && (
                    <div className="recycler-task-row" style={{ flexDirection: "column", alignItems: "flex-start", gridColumn: "1 / -1" }}>
                      <span className="recycler-task-label">Recycler Note</span>
                      <span className="recycler-task-value" style={{ fontStyle: "italic", color: "var(--ep-text)" }}>
                        "{task.note.trim()}"
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 2: RECYCLING RESULT FORM */}
              {task.status !== "COMPLETED" && (
                <form onSubmit={handleSubmit} className="recycler-form-card">
                  <h2 className="recycler-form-card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PackageCheck size={18} color="var(--ep-green-dark)" />
                    Recycling Result
                  </h2>

                  <div className="recycler-form-group">
                    <label className="recycler-label" htmlFor="recyclableQuantity">
                      How Much Waste Is Able to Be Recycled?
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        id="recyclableQuantity"
                        type="number"
                        step="0.01"
                        min="0"
                        max={task.total_quantity}
                        placeholder={`e.g. 18 (Max: ${parseFloat(task.total_quantity).toFixed(2)} kg)`}
                        value={recyclableQuantity}
                        onChange={handleQuantityChange}
                        className="recycler-input"
                        disabled={submitting}
                        required
                      />
                      <span
                        style={{
                          position: "absolute",
                          right: 14,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--ep-muted)",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        kg
                      </span>
                    </div>

                    {validationError && (
                      <div className="recycler-error-msg" style={{ marginTop: 6, fontSize: 13, padding: "8px 12px" }}>
                        <AlertCircle size={15} />
                        <span>{validationError}</span>
                      </div>
                    )}
                  </div>

                  <div className="recycler-form-group" style={{ marginTop: 20 }}>
                    <label className="recycler-label" htmlFor="note" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FileText size={15} />
                      Recycler Note (Optional)
                    </label>
                    <textarea
                      id="note"
                      placeholder="Enter a note about the recycling process (e.g. 18 kg recyclable material recovered, some material was contaminated)..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="recycler-textarea"
                      disabled={submitting}
                      rows={3}
                    />
                  </div>

                  {/* RECYCLING IMAGE UPLOAD */}
                  <div className="recycler-form-group" style={{ marginTop: 20 }}>
                    <label className="recycler-label" htmlFor="recyclingImage" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Camera size={15} />
                      Recycling Image (Optional)
                    </label>
                    <div style={{ marginTop: 8 }}>
                      <input
                        id="recyclingImage"
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                        onChange={handleImageChange}
                        disabled={submitting}
                        style={{ display: "none" }}
                      />
                      <button
                        type="button"
                        className="recycler-btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={submitting}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "8px 16px" }}
                      >
                        <Upload size={14} />
                        {imageFile ? "Change Image" : "Choose Image"}
                      </button>
                      <span style={{ fontSize: 12, color: "var(--ep-muted)", marginLeft: 12 }}>
                        {imageFile ? imageFile.name : "Upload photo of recycled material or processing (JPG, PNG, WEBP)"}
                      </span>
                    </div>

                    {imagePreview && (
                      <div style={{ marginTop: 12, position: "relative", display: "inline-block" }}>
                        <img
                          src={imagePreview}
                          alt="Recycling Preview"
                          style={{
                            width: "100%",
                            maxWidth: 260,
                            maxHeight: 180,
                            objectFit: "cover",
                            borderRadius: 10,
                            border: "1.5px solid var(--ep-border)",
                            display: "block",
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          disabled={submitting}
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            background: "rgba(0, 0, 0, 0.65)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: 24,
                            height: 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                          title="Remove image"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="recycler-btn-primary"
                    style={{ marginTop: 24 }}
                    disabled={submitting || Boolean(validationError) || !recyclableQuantity}
                  >
                    <CheckCircle2 size={18} />
                    {submitting ? "Completing Task..." : "Complete Recycling"}
                  </button>
                </form>
              )}
            </div>
          ) : null}
        </main>
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => performLogout(navigate)}
      />
    </div>
  );
}
