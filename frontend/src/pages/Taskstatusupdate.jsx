import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
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
} from "lucide-react";

// ============================================================
// API BASE URL & AUTH HELPER
// ============================================================
const API_BASE_URL = "http://127.0.0.1:8000";

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

  const fileInputRef = useRef(null);

  const statusOptions = [
    { value: "Completed", icon: CheckCircle2 },
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

        if (!mounted) return;

        const data = response.data;
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
        } else if (data.status === "PENDING") {
          setStatus("Pending");
        } else {
          setStatus("Completed");
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

    const isCompleted = status.toUpperCase() === "COMPLETED";

    // 1. Validation for COMPLETED status
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
      formData.append("status", isCompleted ? "COMPLETED" : "PENDING");

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
          : `Task #${id} status updated to PENDING.`
      );

      if (response.data?.task) {
        setTask(response.data.task);
      }

      if (isCompleted && response.data?.payment_qr) {
        setPaymentQr(response.data.payment_qr);
      } else if (!isCompleted) {
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#5f8268" }}>
              <MapPin size={14} color="#4c9a5f" />
              <span>{task.pickup_location || "Location not specified"}</span>
            </div>
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
                  onClick={() => setDropdownOpen((o) => !o)}
                  style={{
                    ...fieldStyle,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    background:
                      status === "Completed" ? "#e4f5e7" : "#fdf3e3",
                    color: status === "Completed" ? "#276b3c" : "#8a5a12",
                    fontWeight: 700,
                    border:
                      status === "Completed"
                        ? "1px solid #bde5c6"
                        : "1px solid #f0dcb0",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <StatusIcon size={15} />
                    {status}
                  </span>
                  <ChevronDown
                    size={15}
                    style={{
                      transform: dropdownOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.15s ease",
                    }}
                  />
                </button>

                {dropdownOpen && (
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

            {/* Completion image (Required for Completed, optional info for Pending) */}
            <div style={{ padding: "18px 20px 0 20px" }}>
              <label style={labelStyle}>
                Completion Image {status === "Completed" ? <span style={{ color: "#d9534f" }}>*</span> : "(Optional)"}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
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
                  cursor: "pointer",
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
              {image && (
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

            {/* Estimated weight (Required for Completed) */}
            <div style={{ padding: "18px 20px 0 20px" }}>
              <label style={labelStyle}>
                Estimated Weight {status === "Completed" ? <span style={{ color: "#d9534f" }}>*</span> : "(Optional)"}
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
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="0.0"
                  inputMode="decimal"
                  type="number"
                  step="0.1"
                  min="0"
                  style={{
                    ...fieldStyle,
                    width: "100%",
                    paddingLeft: 34,
                    boxSizing: "border-box",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "#8fa896",
                  }}
                >
                  kg
                </span>
              </div>
            </div>

            {/* Update button */}
            <div style={{ padding: "22px 20px 20px 20px" }}>
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

 