import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { getFullImageUrl } from "../utils/imageUrl";
import {
  ChevronDown,
  Upload,
  ImageIcon,
  CheckCircle2,
  Clock3,
  Scale,
  ArrowLeft,
  QrCode,
  IndianRupee,
  MapPin,
  User,
  AlertCircle,
  Truck,
  Sparkles,
  Recycle,
} from "lucide-react";

// ============================================================
// API BASE URL & AUTH HELPER
// ============================================================
const API_BASE_URL = "https://intelligent-municipal-waste-management.onrender.com";

const getAccessToken = () => {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
};

export default function TaskStatusUpdate() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [status, setStatus] = useState("Completed");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [weight, setWeight] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [paymentQr, setPaymentQr] = useState(null);
  const [pendingReason, setPendingReason] = useState("");

  const fileInputRef = useRef(null);

  const statusOptions = [
    { value: "Completed", icon: CheckCircle2 },
    { value: "In Progress", icon: Truck },
    { value: "Pending", icon: Clock3 },
  ];

  // ============================================================
  // LOAD TASK DETAILS ON MOUNT
  // ============================================================
  useEffect(() => {
    let mounted = true;

    const fetchTask = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setFetchError("");

        const token = getAccessToken();
        const config = token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : {};

        const response = await axios.get(
          `${API_BASE_URL}/api/waste/staff/tasks/${id}/`,
          config
        );

        const data = response.data?.task || response.data;
        setTask(data);

        // Pre-fill existing status & collection details if already completed
        if (data.status === "COMPLETED") {
          setStatus("Completed");
          if (data.completion_image) {
            setImage(data.completion_image);
          }
          if (data.estimated_weight) {
            setWeight(String(data.estimated_weight));
          }
          if (data.payment_qr_data) {
            setPaymentQr(data.payment_qr_data);
          }
        } else if (data.status === "IN_PROGRESS") {
          setStatus("In Progress");
        } else if (data.status === "PENDING") {
          setStatus("Pending");
          if (data.pending_reason) {
            setPendingReason(data.pending_reason);
          }
        } else {
          setStatus("In Progress");
        }
        if (data.pending_reason && !pendingReason) {
          setPendingReason(data.pending_reason);
        }
      } catch (err) {
        console.error("Failed to load task details:", err);
        if (!mounted) return;

        if (err.response?.status === 401) {
          setFetchError("Please log in to view this task.");
        } else if (err.response?.status === 403) {
          setFetchError("You are not authorized to update this task.");
        } else if (err.response?.status === 404) {
          setFetchError(`Task #${id} was not found.`);
        } else {
          setFetchError("Failed to load task details. Please check the backend server.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchTask();

    return () => {
      mounted = false;
    };
  }, [id]);

  // ============================================================
  // HANDLE IMAGE UPLOAD
  // ============================================================
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate image format
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        setFormError("Please upload a valid image file (JPG, PNG, WEBP, or GIF).");
        return;
      }
      setFormError("");
      setRawFile(file);

      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  // ============================================================
  // HANDLE UPDATE TASK (PENDING OR COMPLETED)
  // ============================================================
  const handleUpdate = async () => {
    setFormError("");
    setSuccessMessage("");

    const token = getAccessToken();
    if (!token) {
      setFormError("You must be logged in as staff to perform this action.");
      return;
    }

    const isTaskAlreadyCompleted = String(task?.status || "").toUpperCase() === "COMPLETED";
    if (isTaskAlreadyCompleted) {
      setFormError("This pickup task is already completed and cannot be modified.");
      return;
    }

    const isCompleted = status.toUpperCase() === "COMPLETED";
    const isInProgress =
      status.toLowerCase() === "in progress" ||
      status.toUpperCase() === "IN_PROGRESS";
    const isPending = status.toUpperCase() === "PENDING";

    // 1. Validation for PENDING status
    if (isPending) {
      if (!pendingReason || pendingReason.trim() === "") {
        setFormError("Reason for marking task as Pending is required.");
        return;
      }
    }

    // 2. Validation for COMPLETED status
    if (isCompleted) {
      if (!rawFile && !image) {
        setFormError("Completion photo is required when completing a task.");
        return;
      }

      if (!weight || weight.trim() === "") {
        setFormError("Estimated waste weight is required.");
        return;
      }

      const numWeight = parseFloat(weight);
      if (isNaN(numWeight) || numWeight <= 0) {
        setFormError("Please enter a valid positive weight in kilograms.");
        return;
      }
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      let statusToSend = "COMPLETED";
      if (isInProgress) {
        statusToSend = "IN_PROGRESS";
      } else if (isPending) {
        statusToSend = "PENDING";
      }
      formData.append("status", statusToSend);

      if (isPending) {
        formData.append("pending_reason", pendingReason.trim());
      }

      if (isCompleted) {
        if (rawFile) {
          formData.append("completion_image", rawFile);
        }
        formData.append("estimated_weight", weight.trim());
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/waste/staff/task-update/${id}/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Task update API response:", response.data);

      setSubmitted(true);
      setSuccessMessage(
        isCompleted
          ? `Task #${id} marked as COMPLETED! Collection record saved.`
          : isInProgress
          ? `Task #${id} marked as IN PROGRESS. Citizen has been notified!`
          : `Task #${id} status updated to PENDING.`
      );

      if (response.data?.task) {
        setTask(response.data.task);
      }

      if (isCompleted && response.data?.payment_qr) {
        setPaymentQr(response.data.payment_qr);
      } else {
        setPaymentQr(null);
      }

      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      console.error("Task update failed:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to update task. Please try again.";
      setFormError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const StatusIcon = statusOptions.find((s) => s.value === status)?.icon ?? CheckCircle2;
  const isTaskCompleted = String(task?.status || "").toUpperCase() === "COMPLETED";

  // Build QR Code Image URL
  const qrDataString = paymentQr?.qr_string || `upi://pay?pa=ecopulse@upi&pn=EcoPulse%20Waste&am=${paymentQr?.amount || 50}&cu=INR`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrDataString)}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(180deg, #eef7ef 0%, #ffffff 55%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Header navigation & title */}
        <div style={{ marginBottom: 20, paddingLeft: 4 }}>
          <button
            onClick={() => navigate("/stafftask")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              color: "#4c9a5f",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              padding: 0,
              marginBottom: 10,
            }}
          >
            <ArrowLeft size={15} /> Back to My Tasks
          </button>

          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "#4c9a5f",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Field Update
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 700,
              color: "#1f2e22",
              letterSpacing: "-0.01em",
            }}
          >
            Task Status {id ? `· #${id}` : ""}
          </h1>
        </div>

        {/* Task Info Summary */}
        {task && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #dcede0",
              borderRadius: 14,
              padding: "14px 16px",
              marginBottom: 16,
              boxShadow: "0 2px 8px -2px rgba(44, 110, 66, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <User size={14} color="#4c9a5f" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1f2e22" }}>
                {task.user_name || "Citizen"}
              </span>
              <span style={{ fontSize: 12, color: "#8fa896" }}>
                ({task.ward || (task.ward_id ? `Ward ${task.ward_id}` : "Ward")})
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#5f8268" }}>
                <MapPin size={14} color="#4c9a5f" />
                <span>{task.pickup_location || task.location_name || "Location not specified"}</span>
              </div>
              {(task.latitude || task.longitude || task.pickup_location || task.location_name) && (
                <button
                  type="button"
                  onClick={() => {
                    const lat = task.latitude;
                    const lng = task.longitude;
                    const hasCoords =
                      lat !== null &&
                      lng !== null &&
                      lat !== undefined &&
                      lng !== undefined &&
                      !isNaN(Number(lat)) &&
                      !isNaN(Number(lng));

                    if (hasCoords) {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                        "_blank"
                      );
                    } else {
                      const loc = task.pickup_location || task.location_name || "";
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`,
                        "_blank"
                      );
                    }
                  }}
                  style={{
                    background: "#eaf5e0",
                    border: "1px solid #cfe7bb",
                    color: "#2f4a1c",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  title="Open live route in Google Maps"
                >
                  🗺️ View Route
                </button>
              )}
            </div>
          </div>
        )}

        {/* AI-Detected Waste Objects */}
        {task && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #dcede0",
              borderRadius: 14,
              padding: "14px 16px",
              marginBottom: 16,
              boxShadow: "0 2px 8px -2px rgba(44, 110, 66, 0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
                borderBottom: "1px solid #f0f7f1",
                paddingBottom: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Sparkles size={15} color="#16a34a" />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#166534",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  AI-Detected Waste Objects
                </span>
              </div>
              {task.images && task.images.length > 0 && (
                <span style={{ fontSize: 11.5, color: "#6b8a53", fontWeight: 600 }}>
                  {task.images.length} {task.images.length === 1 ? "Image" : "Images"} Uploaded
                </span>
              )}
            </div>

            {Array.isArray(task.images) && task.images.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {task.images.map((img, imgIdx) => {
                  const imageDetections =
                    Array.isArray(img?.detections) && img.detections.length > 0
                      ? img.detections
                      : img?.waste_type && img.waste_type !== "Unknown"
                      ? [{ class: img.waste_type, confidence: img.confidence }]
                      : [];

                  const imgUrl = getFullImageUrl(img.image);

                  return (
                    <div
                      key={img.id || imgIdx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 14,
                        padding: "10px 12px",
                        background: "#f7fbf8",
                        border: "1px solid #e1efe4",
                        borderRadius: 10,
                      }}
                    >
                      {/* Image Thumbnail */}
                      {imgUrl ? (
                        <a
                          href={imgUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Click to view full photo"
                          style={{ display: "block", flexShrink: 0 }}
                        >
                          <img
                            src={imgUrl}
                            alt={img.image_name || `Waste ${imgIdx + 1}`}
                            style={{
                              width: 72,
                              height: 72,
                              objectFit: "cover",
                              borderRadius: 8,
                              border: "1.5px solid #bde5c6",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                              cursor: "pointer",
                            }}
                          />
                        </a>
                      ) : (
                        <div
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: 8,
                            background: "#eaf5ec",
                            border: "1.5px dashed #bde5c6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <ImageIcon size={22} color="#8fa896" />
                        </div>
                      )}

                      {/* Detections Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#166534",
                            marginBottom: 4,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>Image {imgIdx + 1}</span>
                          {img.image_name && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "#8fa896",
                                fontWeight: 400,
                                maxWidth: 160,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {img.image_name}
                            </span>
                          )}
                        </div>

                        {imageDetections.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {imageDetections.map((det, detIdx) => {
                              const conf = Number(det?.confidence || 0);
                              const className = det?.class || det?.class_name || det?.name || "Unknown";
                              const confPercent = conf <= 1.0 ? conf * 100 : conf;

                              return (
                                <div
                                  key={detIdx}
                                  style={{
                                    fontSize: 13,
                                    color: "#1f2e22",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  <span style={{ color: "#16a34a", fontWeight: 700 }}>•</span>
                                  <span style={{ fontWeight: 600, color: "#166534" }}>{className}</span>
                                  {conf > 0 && (
                                    <span style={{ fontSize: 12, color: "#5f8a45", fontWeight: 500 }}>
                                      ({confPercent.toFixed(2)}%)
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12.5, color: "#8fa896", fontStyle: "italic" }}>
                            No specific waste category detected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : task.waste_type && task.waste_type !== "Unknown" ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#f2f8ec",
                  color: "#4c7a2e",
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Recycle size={14} />
                <span>{task.waste_type}</span>
                {task.ai_confidence && (
                  <span style={{ fontSize: 12, color: "#5f8a45" }}>
                    ({Number(task.ai_confidence).toFixed(1)}%)
                  </span>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: "#8fa896", fontStyle: "italic" }}>
                No detection data recorded for this pickup request.
              </div>
            )}
          </div>
        )}

        {/* Loading / Error States */}
        {loading && (
          <div
            style={{
              background: "#ffffff",
              padding: "30px",
              borderRadius: 16,
              textAlign: "center",
              color: "#4c9a5f",
              fontWeight: 600,
            }}
          >
            Loading task details...
          </div>
        )}

        {!loading && fetchError && (
          <div
            style={{
              background: "#fff0f0",
              border: "1px solid #f5c2c2",
              color: "#b64a4a",
              padding: "16px",
              borderRadius: 14,
              textAlign: "center",
              fontWeight: 500,
              fontSize: 13.5,
              marginBottom: 16,
            }}
          >
            {fetchError}
          </div>
        )}

        {/* Card */}
        {!loading && !fetchError && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #dcede0",
              borderRadius: 20,
              boxShadow: "0 12px 32px -16px rgba(44, 110, 66, 0.25)",
              overflow: "visible",
            }}
          >
            {/* Status Messages */}
            {formError && (
              <div
                style={{
                  margin: "16px 20px 0",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "#fff2f0",
                  border: "1px solid #ffccc7",
                  color: "#cf1322",
                  fontSize: 12.5,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={15} />
                {formError}
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  margin: "16px 20px 0",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "#f6ffed",
                  border: "1px solid #b7eb8f",
                  color: "#389e0d",
                  fontSize: 12.5,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={15} />
                {successMessage}
              </div>
            )}

            {/* Completed Task Read-Only Notice */}
            {isTaskCompleted && (
              <div
                style={{
                  margin: "16px 20px 0 20px",
                  padding: "11px 16px",
                  background: "#eef8f0",
                  border: "1px solid #bde5c6",
                  borderRadius: 10,
                  color: "#276b3c",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} />
                <span>This pickup task has been completed and is read-only.</span>
              </div>
            )}

            {/* Status — single column */}
            <div
              style={{
                padding: "20px 20px 0 20px",
              }}
            >
              <div style={{ position: "relative" }}>
                <label style={labelStyle}>Status</label>
                <button
                  type="button"
                  disabled={isTaskCompleted}
                  onClick={() => !isTaskCompleted && setDropdownOpen((o) => !o)}
                  style={{
                    ...fieldStyle,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: isTaskCompleted ? "default" : "pointer",
                    background:
                      status === "Completed"
                        ? "#e4f5e7"
                        : status === "In Progress"
                        ? "#e0f2fe"
                        : "#fdf3e3",
                    color:
                      status === "Completed"
                        ? "#276b3c"
                        : status === "In Progress"
                        ? "#0369a1"
                        : "#8a5a12",
                    fontWeight: 700,
                    border:
                      status === "Completed"
                        ? "1px solid #bde5c6"
                        : status === "In Progress"
                        ? "1px solid #bae6fd"
                        : "1px solid #f0dcb0",
                    opacity: isTaskCompleted ? 0.95 : 1,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <StatusIcon size={15} />
                    {status}
                  </span>
                  {!isTaskCompleted && (
                    <ChevronDown
                      size={15}
                      style={{
                        transform: dropdownOpen ? "rotate(180deg)" : "none",
                        transition: "transform 0.15s ease",
                      }}
                    />
                  )}
                </button>

                {dropdownOpen && !isTaskCompleted && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      right: 0,
                      background: "#ffffff",
                      border: "1px solid #dcede0",
                      borderRadius: 12,
                      boxShadow: "0 10px 28px -10px rgba(30, 80, 50, 0.28)",
                      overflow: "hidden",
                      zIndex: 10,
                    }}
                  >
                    {statusOptions.map((opt) => {
                      const Icon = opt.icon;
                      const active = opt.value === status;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => {
                            setStatus(opt.value);
                            setDropdownOpen(false);
                            setFormError("");
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 12px",
                            fontSize: 13.5,
                            fontWeight: 600,
                            cursor: "pointer",
                            color: active ? "#276b3c" : "#3a4a3e",
                            background: active ? "#eef8f0" : "#ffffff",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#f2f9f3")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = active
                              ? "#eef8f0"
                              : "#ffffff")
                          }
                        >
                          <Icon size={15} />
                          {opt.value}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Reason for Pending (Mandatory when Pending) */}
            {status === "Pending" && (
              <div style={{ padding: "18px 20px 0 20px" }}>
                <label style={labelStyle}>
                  Reason for Pending <span style={{ color: "#d9534f" }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={pendingReason}
                  onChange={(e) => {
                    if (!isTaskCompleted) {
                      setPendingReason(e.target.value);
                      if (formError) setFormError("");
                    }
                  }}
                  disabled={isTaskCompleted}
                  placeholder="Explain why this pickup could not be completed (e.g., Gate locked, Citizen not available, Severe weather, Road blocked)..."
                  style={{
                    ...fieldStyle,
                    width: "100%",
                    boxSizing: "border-box",
                    minHeight: 84,
                    resize: "vertical",
                    fontFamily: "inherit",
                    fontSize: 13.5,
                    lineHeight: 1.5,
                    padding: "10px 12px",
                    background: isTaskCompleted ? "#f9fcf9" : "#ffffff",
                    border: formError && (!pendingReason || !pendingReason.trim()) ? "1px solid #cf1322" : "1px solid #cfe7bb",
                  }}
                />
              </div>
            )}

            {/* Completion image (Required for Completed, hidden for Pending and In Progress) */}
            {status === "Completed" && (
              <div style={{ padding: "18px 20px 0 20px" }}>
                <label style={labelStyle}>
                  Completion Image <span style={{ color: "#d9534f" }}>*</span>
                </label>
                {!isTaskCompleted && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                  />
                )}
                <div
                  onClick={() => !isTaskCompleted && fileInputRef.current?.click()}
                  style={{
                    border: image ? "1px solid #bde5c6" : "1.5px dashed #b7dcc0",
                    borderRadius: 14,
                    height: 150,
                    background: image
                      ? `#f4faf5 url(${image}) center/cover no-repeat`
                      : "#f7fbf8",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: isTaskCompleted ? "default" : "pointer",
                    gap: 6,
                    transition: "border-color 0.15s ease",
                  }}
                >
                  {!image && (
                    <>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          background: "#e4f5e7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Upload size={17} color="#4c9a5f" />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#4c6b53" }}>
                        Tap to upload photo
                      </div>
                      <div style={{ fontSize: 11.5, color: "#8fa896" }}>
                        PNG or JPG, up to 10MB
                      </div>
                    </>
                  )}
                </div>
                {!isTaskCompleted && image && (
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setRawFile(null);
                    }}
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#c25b4a",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <ImageIcon size={13} /> Remove photo
                  </button>
                )}
              </div>
            )}

            {/* Estimated weight (Required for Completed, hidden for Pending and In Progress) */}
            {status === "Completed" && (
              <div style={{ padding: "18px 20px 0 20px" }}>
                <label style={labelStyle}>
                  Estimated Weight <span style={{ color: "#d9534f" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <Scale
                    size={16}
                    color="#7fae87"
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                  <input
                    value={weight}
                    onChange={(e) => !isTaskCompleted && setWeight(e.target.value)}
                    placeholder="0.0"
                    inputMode="decimal"
                    type="number"
                    step="0.1"
                    min="0"
                    readOnly={isTaskCompleted}
                    disabled={isTaskCompleted}
                    style={{
                      ...fieldStyle,
                      width: "100%",
                      paddingLeft: 34,
                      boxSizing: "border-box",
                      background: isTaskCompleted ? "#f9fcf9" : "#ffffff",
                      cursor: isTaskCompleted ? "default" : "text",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 12,
                      color: "#8fa896",
                      fontWeight: 600,
                    }}
                  >
                    kg
                  </span>
                </div>
              </div>
            )}

            {/* Update button / Read-only notice */}
            <div style={{ padding: "22px 20px 20px 20px" }}>
              {isTaskCompleted ? (
                <div
                  style={{
                    width: "100%",
                    padding: "13px 0",
                    borderRadius: 12,
                    background: "#e4f5e7",
                    color: "#276b3c",
                    border: "1px solid #bde5c6",
                    fontSize: 14.5,
                    fontWeight: 700,
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxSizing: "border-box",
                  }}
                >
                  <CheckCircle2 size={17} color="#276b3c" />
                  Task Completed (Read-Only)
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleUpdate}
                  style={{
                    width: "100%",
                    padding: "13px 0",
                    borderRadius: 12,
                    border: "none",
                    background: submitted
                      ? "#3f8a55"
                      : submitting
                      ? "#92c99f"
                      : "linear-gradient(180deg, #5cb571 0%, #479a5c 100%)",
                    color: "#ffffff",
                    fontSize: 14.5,
                    fontWeight: 700,
                    letterSpacing: "0.01em",
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: "0 8px 20px -8px rgba(58, 138, 82, 0.55)",
                    transition: "background 0.2s ease",
                  }}
                >
                  {submitting
                    ? "Updating..."
                    : submitted
                    ? "Updated ✓"
                    : "Update Task"}
                </button>
              )}
            </div>

            {/* ========================================================
                PAYMENT QR CODE SECTION (Only Available After Completion)
                ======================================================== */}
            {paymentQr && (
              <div
                style={{
                  borderTop: "1.5px dashed #bde5c6",
                  padding: "22px 20px",
                  background: "#f7fcf8",
                  borderBottomLeftRadius: 20,
                  borderBottomRightRadius: 20,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#276b3c",
                    fontWeight: 700,
                    fontSize: 14,
                    marginBottom: 10,
                  }}
                >
                  <QrCode size={18} />
                  <span>Scan QR for Payment</span>
                </div>

                <p
                  style={{
                    fontSize: 12,
                    color: "#5f8268",
                    margin: "0 0 14px",
                  }}
                >
                  Present this QR code to the citizen to complete the collection fee payment.
                </p>

                <div
                  style={{
                    display: "inline-block",
                    padding: "10px",
                    background: "#ffffff",
                    borderRadius: 14,
                    border: "1px solid #dcede0",
                    boxShadow: "0 4px 12px rgba(44, 110, 66, 0.12)",
                    marginBottom: 12,
                  }}
                >
                  <img
                    src={qrImageUrl}
                    alt="Payment QR Code"
                    style={{
                      width: 180,
                      height: 180,
                      display: "block",
                      borderRadius: 8,
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 16,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1f2e22",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                    <IndianRupee size={14} color="#276b3c" />
                    Amount: ₹{paymentQr.amount || 50}
                  </span>
                  <span>·</span>
                  <span>Weight: {paymentQr.weight_kg || weight} kg</span>
                </div>

                <div style={{ fontSize: 11.5, color: "#8fa896" }}>
                  UPI ID: <strong style={{ color: "#276b3c" }}>{paymentQr.upi_id || "ecopulse@upi"}</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 700,
  color: "#5f8268",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 6,
};

const fieldStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #dcede0",
  fontSize: 13.5,
  outline: "none",
};

 