import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Scale,
  Calendar,
  User,
  MapPin,
  ImageIcon,
  Eye,
} from "lucide-react";
import "../components/Pickupassign.css";
import NotificationBell from "../components/NotificationBell";
import SortableTh from "../components/SortableTh";
import { sortTableData, getNextSortDirection } from "../utils/tableSort";
import { safeNavigateBack } from "../utils/navigation";
import { BASE_URL as API_BASE_URL } from "../api/api";
import { getFullImageUrl } from "../utils/imageUrl";

// ============================================================
// LOGO
// ============================================================
function EcoPulseLogo({ onClick }) {
  return (
    <div
      className="ecopulse-logo"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
      title={onClick ? "EcoPulse Admin Dashboard" : undefined}
    >
      <div className="logo-circle">
        <svg
          width="27"
          height="27"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M2 12h4l2-7 4 14 2-7h8"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="logo-text">
        <span>Eco</span>
        <span>Pulse</span>
      </div>
    </div>
  );
}

// ============================================================
// STATUS STYLES
// ============================================================
const statusClass = {
  Pending: "status pending",
  Assigned: "status assigned",
  Collected: "status collected",
  Completed: "status completed",
  Cancelled: "status cancelled",
  "In Progress": "status assigned",

  PENDING: "status pending",
  ASSIGNED: "status assigned",
  IN_PROGRESS: "status assigned",
  COLLECTED: "status collected",
  COMPLETED: "status completed",
  CANCELLED: "status cancelled",
};

// ============================================================
// COMPLETED DETAILS MODAL (Admin Completed Task Proof)
// ============================================================
function CompletedDetailsModal({
  request,
  onClose,
}) {
  if (!request) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="assign-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 540 }}
      >
        {/* HEADER */}
        <div className="modal-header">
          <div>
            <div className="modal-request">
              Request #{request.requestId} · Completed Task
            </div>
            <h2>
              Collection Details & Proof
            </h2>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          {/* COMPLETION IMAGE */}
          <div className="modal-field">
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ImageIcon size={14} color="#1f8a5f" />
              Completion Photo Proof
            </label>

            {request.completionImage ? (
              <div
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid #dcede0",
                  background: "#f7fbf8",
                  maxHeight: 260,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={request.completionImage}
                  alt={`Completion Proof #${request.requestId}`}
                  style={{
                    width: "100%",
                    maxHeight: 260,
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
            ) : (
              <div className="modal-value" style={{ color: "#8fa896" }}>
                No completion photo recorded.
              </div>
            )}
          </div>

          {/* WEIGHT & COMPLETION TIME */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="modal-field">
              <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Scale size={13} color="#1f8a5f" />
                Estimated Weight
              </label>
              <div
                className="modal-value"
                style={{
                  fontWeight: 700,
                  color: "#1f2e22",
                  fontSize: 15,
                }}
              >
                {request.estimatedWeight !== null && request.estimatedWeight !== undefined
                  ? `${request.estimatedWeight} kg`
                  : "N/A"}
              </div>
            </div>

            <div className="modal-field">
              <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Clock3 size={13} color="#1f8a5f" />
                Completed Date / Time
              </label>
              <div
                className="modal-value"
                style={{
                  fontWeight: 600,
                  color: "#1f2e22",
                  fontSize: 13.5,
                }}
              >
                {request.completedAt || request.date || "N/A"}
              </div>
            </div>
          </div>

          {/* STAFF */}
          <div className="modal-field">
            <label>Assigned Staff Member</label>
            <div className="modal-value">
              {request.assignedStaff || "Staff Member"}
            </div>
          </div>

          {/* CITIZEN & LOCATION */}
          <div className="modal-field">
            <label>Citizen & Location</label>
            <div className="modal-value">
              <strong>{request.userName || "Citizen"}</strong> ({request.ward || "Ward"})
              <br />
              <span style={{ color: "#5f8268", fontSize: 12.5 }}>
                {request.pickupLocation || "N/A"}
              </span>
            </div>
          </div>

          {/* WASTE TYPE */}
          <div className="modal-field">
            <label>Waste Type</label>
            <div className="modal-value">
              {request.wasteType || "Waste"}
            </div>
          </div>

          {/* PREVIOUS PENDING REASON */}
          {request.pendingReason && (
            <div className="modal-field">
              <label>Previous Pending Reason</label>
              <div
                className="modal-value"
                style={{
                  color: "#475569",
                  fontSize: 13,
                  background: "#f8fafc",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                }}
              >
                {request.pendingReason}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button
            type="button"
            className="confirm-button"
            onClick={onClose}
            style={{ width: "100%" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// YOLO WASTE CATEGORIES (Matches backend AI model)
// ============================================================
const WASTE_CATEGORIES = [
  "Plastic",
  "Paper",
  "Organic",
  "Glass",
  "Metal",
  "Electronics",
  "Miscellaneous",
];

// ============================================================
// ASSIGN MODAL
// ============================================================
function AssignModal({
  request,
  onClose,
  onConfirm,
}) {
  const [staff, setStaff] = useState(
    request?.assignedStaffId
      ? String(request.assignedStaffId)
      : ""
  );

  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");

  // Minimum valid date = max(today, request.date)
  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const requestDateStr = useMemo(() => {
    if (!request?.date) return todayStr;
    const dStr = String(request.date).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
    const parsed = new Date(request.date);
    if (!isNaN(parsed.getTime())) {
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, "0");
      const dd = String(parsed.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return todayStr;
  }, [request?.date, todayStr]);

  const minScheduledDate = useMemo(() => {
    return requestDateStr > todayStr ? requestDateStr : todayStr;
  }, [requestDateStr, todayStr]);

  const [scheduledDate, setScheduledDate] = useState(
    request?.scheduledPickupDate
      ? String(request.scheduledPickupDate).slice(0, 10)
      : minScheduledDate
  );
  const [scheduledDateError, setScheduledDateError] = useState("");

  // Determine if AI successfully detected a valid waste type
  const validDetectedImages = (request?.imageResults || []).filter(
    (image) => {
      if (Array.isArray(image?.detections) && image.detections.length > 0) {
        return image.detections.some((d) => {
          const c = d?.class || d?.class_name || d?.name;
          return c && c !== "Unknown" && c !== "No detection" && String(c).trim() !== "";
        });
      }
      return (
        image?.waste_type &&
        image.waste_type !== "Unknown" &&
        image.waste_type !== "No detection" &&
        image.waste_type !== "Not Detected" &&
        String(image.waste_type).trim() !== ""
      );
    }
  );

  const hasValidAiDetection =
    validDetectedImages.length > 0 ||
    (request?.wasteType &&
      request.wasteType !== "No detection" &&
      request.wasteType !== "Unknown" &&
      request.wasteType !== "Not Detected" &&
      String(request.wasteType).trim() !== "");

  const [manualWasteType, setManualWasteType] = useState("");
  const [wasteTypeError, setWasteTypeError] = useState("");
  const [modalPreviewImage, setModalPreviewImage] = useState(null);
  const [brokenImages, setBrokenImages] = useState({});

  // Citizen-uploaded photos extraction
  const uploadedPhotos = useMemo(() => {
    const rawList =
      (Array.isArray(request?.images) && request.images.length > 0)
        ? request.images
        : (Array.isArray(request?.imageResults) && request.imageResults.length > 0)
        ? request.imageResults
        : [];

    return rawList
      .map((img, idx) => {
        const rawPath =
          img?.image ||
          img?.photo ||
          img?.file ||
          (typeof img === "string" ? img : "");
        const url = getFullImageUrl(rawPath);
        const name =
          img?.image_name ||
          img?.file_name ||
          img?.name ||
          `Photo ${idx + 1}`;
        return {
          id: img?.id || idx,
          url,
          name,
          rawPath,
        };
      })
      .filter((item) => Boolean(item.url));
  }, [request]);

  const handleImageError = (imgKey) => {
    setBrokenImages((prev) => ({ ...prev, [imgKey]: true }));
  };

  // ==========================================================
  // FETCH STAFF BY WARD
  // ==========================================================
  useEffect(() => {
    let mounted = true;

    const fetchStaff = async () => {
      try {
        setStaffLoading(true);
        setStaffError("");
        setStaffList([]);

        const wardId = request?.wardId;

        console.log(
          "Selected pickup request:",
          request?.requestId
        );

        console.log(
          "Selected ward ID:",
          wardId
        );

        if (
          wardId === null ||
          wardId === undefined ||
          wardId === "" ||
          wardId === "null" ||
          wardId === "undefined"
        ) {
          if (mounted) {
            setStaffError(
              "Ward information is not available for this pickup request."
            );
          }

          return;
        }

        const staffUrl =
          `${API_BASE_URL}/api/waste/staff/by-ward/${wardId}/`;

        console.log(
          "Fetching staff from:",
          staffUrl
        );

        const response = await axios.get(
          staffUrl,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        console.log(
          "Staff API response:",
          response.data
        );

        if (!mounted) return;

        const data = response.data;

        let staffData = [];

        if (Array.isArray(data)) {
          staffData = data;
        } else if (
          Array.isArray(data?.results)
        ) {
          staffData = data.results;
        } else if (
          Array.isArray(data?.staff)
        ) {
          staffData = data.staff;
        } else if (
          Array.isArray(data?.data)
        ) {
          staffData = data.data;
        }

        console.log(
          "Staff list:",
          staffData
        );

        setStaffList(staffData);

        // If request already has an assigned staff name or ID, preselect matching staff
        if (request?.assignedStaffId) {
          setStaff(String(request.assignedStaffId));
        } else if (request?.assignedStaff && staffData.length > 0) {
          const match = staffData.find(
            (p) =>
              String(p?.name).toLowerCase() === String(request.assignedStaff).toLowerCase() ||
              String(p?.username).toLowerCase() === String(request.assignedStaff).toLowerCase()
          );
          if (match) {
            setStaff(String(match.staff_id ?? match.id ?? ""));
          }
        }

      } catch (error) {
        console.error(
          "Failed to fetch staff:",
          error
        );

        if (!mounted) return;

        if (error.response) {
          console.error(
            "Staff API status:",
            error.response.status
          );

          console.error(
            "Backend error response:",
            error.response.data
          );

          if (
            error.response.status === 401
          ) {
            setStaffError(
              "Authentication is required to view staff."
            );
          } else if (
            error.response.status === 403
          ) {
            setStaffError(
              "You do not have permission to view staff."
            );
          } else if (
            error.response.status === 404
          ) {
            setStaffError(
              "No staff found for this ward."
            );
          } else {
            setStaffError(
              "Failed to load staff."
            );
          }

        } else if (error.request) {
          setStaffError(
            "Cannot connect to Django server."
          );
        } else {
          setStaffError(
            "Failed to load staff."
          );
        }

      } finally {
        if (mounted) {
          setStaffLoading(false);
        }
      }
    };

    fetchStaff();

    return () => {
      mounted = false;
    };

  }, [request?.requestId, request?.wardId]);

  // ==========================================================
  // STAFF NAME
  // ==========================================================
  const getStaffName = (person) => {
    if (!person) return "";
    if (typeof person === "string") {
      return person;
    }

    return (
      person?.name ||
      person?.full_name ||
      person?.fullName ||
      person?.username ||
      person?.email ||
      `Staff #${person?.staff_id || person?.id || ""}`
    );
  };

  // ==========================================================
  // STAFF VALUE (Returns database staff_id as string)
  // ==========================================================
  const getStaffValue = (person) => {
    if (!person) return "";
    if (typeof person === "string" || typeof person === "number") {
      return String(person);
    }

    return String(
      person?.staff_id ??
      person?.id ??
      person?.staffId ??
      person?.username ??
      ""
    );
  };

  // ==========================================================
  // CONFIRM ASSIGN
  // ==========================================================
  const handleConfirm = () => {
    if (!hasValidAiDetection && !manualWasteType) {
      setWasteTypeError("Please select the waste type before assigning staff.");
      return;
    }

    if (!staff) {
      return;
    }

    const selectedStaff = staffList.find(
      (person) =>
        String(person?.staff_id) === String(staff) ||
        String(person?.id) === String(staff) ||
        String(person?.staffId) === String(staff) ||
        String(person?.username).toLowerCase() === String(staff).toLowerCase() ||
        String(person?.name).toLowerCase() === String(staff).toLowerCase()
    );

    const staffName = selectedStaff
      ? getStaffName(selectedStaff)
      : staff;

    const staffId =
      selectedStaff?.staff_id ??
      selectedStaff?.id ??
      selectedStaff?.staffId ??
      staff;

    if (!scheduledDate) {
      setScheduledDateError("Please select a scheduled pickup date.");
      return;
    }

    if (scheduledDate < minScheduledDate) {
      setScheduledDateError(`Scheduled date cannot be earlier than ${minScheduledDate}.`);
      return;
    }

    onConfirm(
      request.requestId,
      staffName,
      staffId,
      hasValidAiDetection ? null : manualWasteType,
      scheduledDate
    );
  };

  // ==========================================================
  // MODAL
  // ==========================================================
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="assign-modal"
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}
        <div className="modal-header">
          <div>
            <div className="modal-request">
              Request #{request.requestId}
            </div>

            <h2>
              Assign Pickup Request
            </h2>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>        {/* BODY */}
        <div className="modal-body">

          {/* PENDING REASON DISPLAY */}
          {request.pendingReason && (
            <div
              style={{
                background: request.status === "PENDING" ? "#fff7ed" : "#f8fafc",
                border: request.status === "PENDING" ? "1px solid #fed7aa" : "1px solid #e2e8f0",
                color: request.status === "PENDING" ? "#9a3412" : "#475569",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: "12px",
                lineHeight: 1.35,
              }}
            >
              <strong style={{ display: "inline-block", marginRight: 4 }}>
                ⚠️ {request.status === "PENDING" ? "Staff Pending Reason:" : "Previous Pending Reason:"}
              </strong>
              <span>{request.pendingReason}</span>
            </div>
          )}

          {/* ROW 1: PHOTO & AI DETECTED WASTE TYPE */}
          <div className="modal-grid-row">
            {/* CITIZEN UPLOADED PHOTO */}
            <div className="modal-field">
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Citizen-Uploaded Photo {uploadedPhotos.length > 1 ? `(${uploadedPhotos.length})` : ""}</span>
                {uploadedPhotos.length > 0 && (
                  <span style={{ fontSize: "11px", color: "#2fa66d", fontWeight: 500 }}>
                    Click to enlarge
                  </span>
                )}
              </label>

              {uploadedPhotos.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: uploadedPhotos.length === 1 ? "1fr" : "repeat(auto-fill, minmax(70px, 1fr))",
                    gap: "8px",
                  }}
                >
                  {uploadedPhotos.map((item, idx) => {
                    const isBroken = brokenImages[item.id || idx];
                    return (
                      <div
                        key={item.id || idx}
                        style={{
                          position: "relative",
                          borderRadius: "8px",
                          overflow: "hidden",
                          border: "1px solid #dce9e2",
                          background: "#f4f8f6",
                          height: "92px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: isBroken ? "default" : "pointer",
                          transition: "transform 0.15s ease, box-shadow 0.15s ease",
                        }}
                        onClick={() => {
                          if (!isBroken) {
                            setModalPreviewImage({
                              url: item.url,
                              title: `Request #${request.requestId} — ${item.name}`,
                            });
                          }
                        }}
                        title={isBroken ? "Image unavailable" : "Click to view full image"}
                      >
                        {isBroken ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "4px",
                              color: "#9ca3af",
                              fontSize: "11px",
                              padding: "6px",
                              textAlign: "center",
                            }}
                          >
                            <ImageIcon size={20} />
                            <span>Image unavailable</span>
                          </div>
                        ) : (
                          <>
                            <img
                              src={item.url}
                              alt={item.name}
                              onError={() => handleImageError(item.id || idx)}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(0, 0, 0, 0.25)",
                                opacity: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#ffffff",
                                gap: "4px",
                                fontSize: "11px",
                                fontWeight: 600,
                                transition: "opacity 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = 1;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = 0;
                              }}
                            >
                              <Eye size={16} />
                              <span>Enlarge</span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="modal-value"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#9ca3af",
                    fontStyle: "italic",
                    fontSize: "12px",
                    height: "92px",
                    boxSizing: "border-box",
                  }}
                >
                  <ImageIcon size={18} />
                  <span>No image uploaded for this request</span>
                </div>
              )}
            </div>

            {/* WASTE TYPE: AI SUCCESS VS AI FAILURE FALLBACK */}
            {hasValidAiDetection ? (
              <div className="modal-field">
                <label>
                  AI Detected Waste Type
                </label>

                <div
                  className="modal-value"
                  style={{
                    minHeight: "92px",
                    padding: "6px 8px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    boxSizing: "border-box",
                  }}
                >
                  {request.imageResults?.length > 0 ? (
                    request.imageResults.map((image, index) => {
                      const imageDetections =
                        Array.isArray(image?.detections) && image.detections.length > 0
                          ? image.detections
                          : image?.waste_type && image.waste_type !== "Unknown"
                          ? [{ class: image.waste_type, confidence: image.confidence }]
                          : [];

                      return (
                        <div
                          key={image.id || image.image_index || index}
                          style={{
                            width: "100%",
                            marginBottom: index < request.imageResults.length - 1 ? "4px" : "0",
                            padding: "4px 6px",
                            borderRadius: "6px",
                            background: "#f0fdf4",
                            border: "1px solid #dcfce7",
                            boxSizing: "border-box",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "11px",
                              color: "#166534",
                              marginBottom: "2px",
                            }}
                          >
                            Image {index + 1}
                            {image.image_name ? ` (${image.image_name})` : ""}:
                          </div>

                          {imageDetections.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px", paddingLeft: "4px" }}>
                              {imageDetections.map((det, detIdx) => {
                                const conf = Number(det?.confidence || 0);
                                const className = det?.class || det?.class_name || det?.name || "Unknown";
                                const confPercent = conf <= 1.0 ? conf * 100 : conf;

                                return (
                                  <div key={detIdx} style={{ fontSize: "12px", color: "#1f2937" }}>
                                    • <span style={{ fontWeight: 600, color: "#1f6b4e" }}>{className}</span>
                                    {conf > 0 && (
                                      <span style={{ fontSize: "11px", color: "#5f8a45", fontWeight: 500 }}>
                                        {" "}({confPercent.toFixed(2)}%)
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span style={{ fontSize: "11.5px", color: "#6b7280", fontStyle: "italic" }}>
                              {request.wasteType || "Detected"}
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <span style={{ fontWeight: 600, color: "#1f6b4e", fontSize: "13px" }}>
                      {request.wasteType || "Plastic"}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="modal-field">
                <div
                  style={{
                    background: "#fff2f0",
                    border: "1px solid #ffccc7",
                    borderRadius: 8,
                    padding: "6px 8px",
                    marginBottom: "6px",
                    color: "#cf1322",
                    fontSize: "11px",
                    lineHeight: "1.3",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 1 }}>
                    ⚠️ AI Detection Unavailable
                  </div>
                  <div>
                    AI detection unavailable — please review the uploaded image manually.
                  </div>
                </div>

                <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: "11.5px" }}>
                  Waste Type <span style={{ color: "#cf1322" }}>*</span>
                </label>

                <select
                  value={manualWasteType}
                  onChange={(e) => {
                    setManualWasteType(e.target.value);
                    if (wasteTypeError) setWasteTypeError("");
                  }}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 8px",
                    borderRadius: 8,
                    border: wasteTypeError ? "1.5px solid #cf1322" : "1px solid #cfe7bb",
                    background: "#ffffff",
                    color: manualWasteType ? "#243515" : "#6c8479",
                    fontSize: "12.5px",
                    fontWeight: 500,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="" disabled>
                    -- Select Waste Type ▼ --
                  </option>
                  {WASTE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {wasteTypeError && (
                  <div
                    style={{
                      color: "#cf1322",
                      fontSize: "11px",
                      marginTop: 3,
                      fontWeight: 600,
                    }}
                  >
                    {wasteTypeError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ROW 2: LOCATION & WARD */}
          <div className="modal-grid-row">
            {/* LOCATION */}
            <div className="modal-field">
              <label>
                Pickup Location
              </label>

              <div
                className="modal-value"
                title={request.pickupLocation || "Not available"}
              >
                {request.pickupLocation ||
                  "Not available"}
              </div>
            </div>

            {/* WARD */}
            <div className="modal-field">
              <label>
                Ward
              </label>

              <div className="modal-value">
                {request.ward ||
                  "Not available"}
              </div>
            </div>
          </div>

          {/* ROW 3: STAFF & PICKUP SCHEDULED DATE */}
          <div className="modal-grid-row">
            {/* STAFF */}
            <div className="modal-field">
              <label>
                Assign Staff
              </label>

              {staffLoading ? (
                <div className="modal-value">
                  Loading staff...
                </div>

              ) : staffError ? (
                <div className="modal-value" style={{ color: "#e11d48", fontSize: "12px" }}>
                  {staffError}
                </div>

              ) : (
                <>
                  <select
                    value={staff}
                    onChange={(e) =>
                      setStaff(e.target.value)
                    }
                  >
                    <option
                      value=""
                      disabled
                    >
                      Select staff
                    </option>

                    {staffList.map(
                      (person, index) => {
                        const value =
                          getStaffValue(person);

                        const name =
                          getStaffName(person);

                        return (
                          <option
                            key={
                              person?.id ||
                              person?.staff_id ||
                              person?.staffId ||
                              index
                            }
                            value={value}
                          >
                            {name}
                          </option>
                        );
                      }
                    )}
                  </select>

                  {staffList.length === 0 && (
                    <div className="modal-value" style={{ fontSize: "12px", color: "#6b7280" }}>
                      No staff found.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* PICKUP SCHEDULED DATE */}
            <div className="modal-field">
              <label>
                Pickup Scheduled Date <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                min={minScheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  setScheduledDateError("");
                }}
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "0 10px",
                  borderRadius: "8px",
                  border: scheduledDateError ? "1px solid #e11d48" : "1px solid #cfe1d8",
                  fontSize: "13px",
                  color: "#1e293b",
                  outline: "none",
                  background: "#ffffff",
                  boxSizing: "border-box",
                }}
                required
              />
              {scheduledDateError && (
                <div style={{ color: "#e11d48", fontSize: "11px", marginTop: "2px" }}>
                  {scheduledDateError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button
            type="button"
            className="cancel-button"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="confirm-button"
            disabled={
              !staff ||
              !scheduledDate ||
              staffLoading ||
              staffList.length === 0 ||
              (!hasValidAiDetection && !manualWasteType)
            }
            onClick={handleConfirm}
          >
            Confirm Assign
          </button>
        </div>

      </div>

      {/* ENLARGED IMAGE LIGHTBOX MODAL */}
      {modalPreviewImage && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1100, background: "rgba(10, 25, 18, 0.75)" }}
          onClick={(e) => {
            e.stopPropagation();
            setModalPreviewImage(null);
          }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "680px",
              width: "90%",
              background: "#12251c",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 600 }}>
                {modalPreviewImage.title || "Citizen-Uploaded Photo"}
              </div>
              <button
                type="button"
                onClick={() => setModalPreviewImage(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "22px",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                padding: "16px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "#0a1711",
              }}
            >
              <img
                src={modalPreviewImage.url}
                alt={modalPreviewImage.title || "Enlarged view"}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  borderRadius: "8px",
                  display: "block",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function PickupRequests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);

  const [searchDate, setSearchDate] = useState("");
  const [selectedWard, setSelectedWard] = useState("");

  const urlStatus = searchParams.get("status");
  const [selectedStatus, setSelectedStatus] = useState(
    urlStatus ? urlStatus.toUpperCase() : ""
  );

  useEffect(() => {
    if (urlStatus) {
      setSelectedStatus(urlStatus.toUpperCase());
    }
  }, [urlStatus]);

  const [modalRequest, setModalRequest] = useState(null);
  const [detailsModalRequest, setDetailsModalRequest] = useState(null);

  const [toast, setToast] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortConfig, setSortConfig] = useState({ key: null, dir: null });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      dir: getNextSortDirection(prev.key, key, prev.dir),
    }));
  };

  // ==========================================================
  // FETCH PICKUP REQUESTS
  // ==========================================================
  useEffect(() => {
    let mounted = true;

    const fetchPickupRequests = async () => {
      try {
        setLoading(true);
        setError("");

        console.log(
          "Fetching pickup requests..."
        );

        const response = await axios.get(
          `${API_BASE_URL}/api/waste/pickup-requests/`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        console.log(
          "Pickup requests API response:",
          response.data
        );

        if (!mounted) return;

        const data = response.data;

        let requestList = [];

        if (Array.isArray(data)) {
          requestList = data;
        } else if (
          Array.isArray(data?.results)
        ) {
          requestList = data.results;
        } else if (
          Array.isArray(data?.requests)
        ) {
          requestList = data.requests;
        } else if (
          Array.isArray(data?.data)
        ) {
          requestList = data.data;
        }

        console.log(
          "Pickup request list:",
          requestList
        );

        // ====================================================
        // FORMAT DATA
        // ====================================================
        const formattedRequests =
          requestList.map((request) => {

            // =================================================
            // USER
            // =================================================
            const user =
              request?.user || {};

            const profile =
              request?.user_profile ||
              request?.userProfile ||
              user?.userprofile ||
              user?.profile ||
              {};

            // =================================================
            // IMAGES
            // =================================================
            const images =
              Array.isArray(
                request?.images
              )
                ? request.images
                : [];

            // =================================================
            // IMAGE RESULTS
            // =================================================
            const imageResults = images.map((image, index) => {
              let imageDetections = Array.isArray(image?.detections)
                ? image.detections
                : [];

              if (imageDetections.length === 0) {
                const wt =
                  image?.waste_type ||
                  image?.wasteType ||
                  image?.predicted_class ||
                  image?.predictedClass;
                if (
                  wt &&
                  wt !== "Unknown" &&
                  wt !== "No detection" &&
                  wt !== "None" &&
                  String(wt).trim() !== ""
                ) {
                  imageDetections = [
                    {
                      class: wt,
                      confidence: Number(image?.confidence ?? 0),
                    },
                  ];
                }
              }

              return {
                ...image,
                image_index: image?.image_index ?? index + 1,
                waste_type:
                  image?.waste_type ||
                  image?.wasteType ||
                  image?.predicted_class ||
                  image?.predictedClass ||
                  "Unknown",
                confidence: Number(image?.confidence ?? 0),
                detections: imageDetections,
              };
            });

            // =================================================
            // WASTE TYPES FROM DETECTED IMAGES (FOR FILTER / SUMMARY)
            // =================================================
            let allDetectedClasses = [];
            imageResults.forEach((img) => {
              if (Array.isArray(img.detections) && img.detections.length > 0) {
                img.detections.forEach((d) => {
                  const cName = d?.class || d?.class_name || d?.name;
                  if (cName && cName !== "Unknown") {
                    allDetectedClasses.push(cName);
                  }
                });
              } else if (img.waste_type && img.waste_type !== "Unknown") {
                allDetectedClasses.push(img.waste_type);
              }
            });

            // Unique categories for filtering / summary text
            let uniqueWasteTypes = [...new Set(allDetectedClasses)];

            // =================================================
            // MAIN BACKEND WASTE TYPE
            // =================================================
            const mainWasteType =
              request?.waste_type ||
              request?.wasteType ||
              request?.predicted_class ||
              request?.predictedClass ||
              "";

            if (
              mainWasteType &&
              mainWasteType !== "Unknown" &&
              !uniqueWasteTypes.includes(mainWasteType)
            ) {
              uniqueWasteTypes.unshift(mainWasteType);
            }

            // =================================================
            // DISPLAY WASTE TYPE (SUMMARY STRING)
            // =================================================
            const wasteType =
              uniqueWasteTypes.length > 0
                ? uniqueWasteTypes.join(", ")
                : "No detection";

            // =================================================
            // DATE
            // =================================================
            let requestDate = "";

            if (request?.date) {
              requestDate = request.date;

            } else if (
              request?.preferred_date
            ) {
              requestDate =
                request.preferred_date;

            } else if (
              request?.pickup_date
            ) {
              requestDate =
                request.pickup_date;

            } else if (
              request?.created_at
            ) {
              requestDate =
                request.created_at.split("T")[0];
            }

            // =================================================
            // WARD
            // =================================================
            let ward = "";

            if (
              request?.ward &&
              typeof request.ward ===
                "object"
            ) {
              ward =
                request.ward?.ward_name ||
                request.ward?.name ||
                request.ward?.id ||
                "";

            } else {
              ward =
                request?.ward ||
                request?.ward_name ||
                request?.ward_id ||
                profile?.ward ||
                "";
            }

            // =================================================
            // WARD ID
            // =================================================
            let wardId = "";

            if (
              request?.ward &&
              typeof request.ward ===
                "object"
            ) {
              wardId =
                request.ward?.id ||
                request.ward?.ward_id ||
                "";

            } else {
              wardId =
                request?.ward_id ||
                profile?.ward_id ||
                "";
            }

            // =================================================
            // USER PROFILE WARD OBJECT
            // =================================================
            if (
              !wardId &&
              profile?.ward &&
              typeof profile.ward ===
                "object"
            ) {
              wardId =
                profile.ward?.id ||
                profile.ward?.ward_id ||
                "";
            }

            // =================================================
            // RETURN FORMATTED REQUEST
            // =================================================
            return {
              requestId:
                request?.request_id ??
                request?.id ??
                "",

              userId:
                request?.user_id ??
                user?.id ??
                "",

              userName:
                request?.user_name ??
                request?.name ??
                profile?.name ??
                user?.username ??
                "",

              phone:
                request?.phone ??
                profile?.phone ??
                user?.phone ??
                "",

              mail:
                request?.email ??
                request?.mail ??
                user?.email ??
                "",

              ward,

              wardId,

              pickupLocation:
                request?.location_name ??
                request?.pickup_location ??
                request?.pickupLocation ??
                "",

              wasteType,

              imageResults,

              images,

              status:
                request?.status ??
                "PENDING",

              date:
                requestDate,

              assignedStaff:
                request?.assigned_staff ??
                request?.assignedStaff ??
                null,

              assignedStaffId:
                request?.assigned_staff_id ??
                request?.assignedStaffId ??
                null,

              scheduledPickupDate:
                request?.scheduled_pickup_date ??
                request?.scheduledPickupDate ??
                null,

              staffMarkedPending:
                Boolean(
                  request?.staff_marked_pending ||
                  request?.staffMarkedPending
                ),

              pendingReason:
                request?.pending_reason ||
                request?.pendingReason ||
                "",

              completionImage:
                request?.completion_image ||
                request?.collection?.completion_image_url ||
                request?.collection?.completion_image ||
                null,

              estimatedWeight:
                request?.estimated_weight ??
                request?.collection?.estimated_weight ??
                null,

              completedAt:
                request?.completed_at ||
                request?.collection?.completed_at_formatted ||
                request?.collection?.completed_at ||
                null,

              latitude:
                request?.latitude ??
                null,

              longitude:
                request?.longitude ??
                null,
            };
          });

        console.log(
          "Formatted pickup requests:",
          formattedRequests
        );

        setRequests(
          formattedRequests
        );

      } catch (err) {
        console.error(
          "Failed to fetch pickup requests:",
          err
        );

        if (!mounted) return;

        if (err.response) {
          console.error(
            "Backend status:",
            err.response.status
          );

          console.error(
            "Backend response:",
            err.response.data
          );

          if (
            err.response.status === 401
          ) {
            setRequests([]);

            setError(
              "Authentication is required to view pickup requests."
            );

          } else if (
            err.response.status === 403
          ) {
            setError(
              "You do not have permission to view pickup requests."
            );

          } else if (
            err.response.status === 404
          ) {
            setError(
              "Pickup request API not found. Check Django URL configuration."
            );

          } else {
            setError(
              "Failed to fetch pickup requests from backend."
            );
          }

        } else if (err.request) {
          console.error(
            "No backend response received:",
            err.request
          );

          setError(
            "Cannot connect to backend server at " +
              API_BASE_URL
          );

        } else {
          setError(
            "An error occurred while loading pickup requests: " +
              err.message
          );
        }

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchPickupRequests();

    return () => {
      mounted = false;
    };

  }, []);

  // ==========================================================
  // AVAILABLE WARDS
  // ==========================================================
  const availableWards = useMemo(() => {
    const map = new Map();

    requests.forEach((r) => {
      const wardName = String(r.ward || "").trim();
      const wardId = r.wardId;

      if (wardName && !map.has(wardName)) {
        map.set(wardName, {
          name: wardName,
          id: wardId,
        });
      }
    });

    return Array.from(map.values());
  }, [requests]);

  // ==========================================================
  // COMBINED FILTERING (DATE + WARD + STATUS)
  // ==========================================================
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      // 1. Date Filter
      if (searchDate) {
        const reqDate = String(request.date || "").split("T")[0];
        if (reqDate !== searchDate) {
          return false;
        }
      }

      // 2. Ward Filter
      if (selectedWard) {
        const reqWard = String(request.ward || "").trim().toLowerCase();
        const targetWard = selectedWard.trim().toLowerCase();
        const matchesName = reqWard === targetWard;
        const matchesId = String(request.wardId || "") === String(selectedWard);
        if (!matchesName && !matchesId) {
          return false;
        }
      }

      // 3. Status Filter
      if (selectedStatus) {
        const targetStatus = selectedStatus.trim().toUpperCase();
        const reqStatus = String(request.status || "").trim().toUpperCase();

        if (targetStatus === "STAFF_PENDING" || targetStatus === "RESCHEDULED") {
          // ONLY tasks assigned to staff AND explicitly marked PENDING by staff
          if (!(request.staffMarkedPending && reqStatus === "PENDING")) {
            return false;
          }
        } else if (reqStatus !== targetStatus) {
          return false;
        }
      }

      return true;
    });
  }, [
    requests,
    searchDate,
    selectedWard,
    selectedStatus,
  ]);

  const sortedRequests = useMemo(() => {
    return sortTableData(filteredRequests, sortConfig.key, sortConfig.dir);
  }, [filteredRequests, sortConfig]);

  // ==========================================================
  // CLEAR ALL FILTERS
  // ==========================================================
  const handleClearFilters = () => {
    setSearchDate("");
    setSelectedWard("");
    setSelectedStatus("");
  };

  // ==========================================================
  // ASSIGN STAFF (API Integration)
  // ==========================================================
  const handleAssign = async (
    requestId,
    staffName,
    staffId,
    manualWasteType,
    scheduledDate
  ) => {
    try {
      const payload = {
        request_id: requestId,
        staff_id: staffId,
        scheduled_pickup_date: scheduledDate,
      };

      if (manualWasteType) {
        payload.waste_type = manualWasteType;
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/waste/assign-pickup/`,
        payload
      );

      console.log("Assignment API success:", response.data);

      setRequests((previous) =>
        previous.map((request) =>
          request.requestId === requestId
            ? {
                ...request,
                assignedStaff: staffName,
                assignedStaffId: staffId,
                scheduledPickupDate: scheduledDate,
                status: "ASSIGNED",
                ...(manualWasteType
                  ? {
                      wasteType: manualWasteType,
                      imageResults: (request.imageResults || []).map((img) => ({
                        ...img,
                        waste_type: manualWasteType,
                        detections: [
                          {
                            class: manualWasteType,
                            confidence: img.confidence || 0,
                          },
                        ],
                      })),
                    }
                  : {}),
              }
            : request
        )
      );

      setModalRequest(null);

      setToast(
        `Request #${requestId} successfully assigned to ${staffName}` +
          (scheduledDate ? ` for ${scheduledDate}` : "") +
          (manualWasteType ? ` (Waste Type: ${manualWasteType})` : "")
      );

      setTimeout(() => {
        setToast("");
      }, 3000);

    } catch (err) {
      console.error("Failed to assign staff:", err);

      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to assign staff. Please try again.";

      setToast(`Error: ${errorMsg}`);

      setTimeout(() => {
        setToast("");
      }, 4000);
    }
  };

  // ==========================================================
  // UI
  // ==========================================================
  return (
    <div className="pickup-page">

      {/* HEADER */}
      <header className="top-header">

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            onClick={() => safeNavigateBack(navigate, "/admin")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#f0f7f2",
              border: "1px solid #cfe7bb",
              color: "#1f6b4e",
              borderRadius: 8,
              padding: "7px 12px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={15} /> Dashboard
          </button>

          <EcoPulseLogo onClick={() => navigate("/admin")} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <NotificationBell />
          <div className="header-title">
            Pickup Requests
          </div>
        </div>

      </header>

      {/* MAIN */}
      <main className="main-content">

        {/* PAGE HEADING */}
        <div className="page-heading">

          <div className="heading-left">

            <h1>
              Pickup Requests
            </h1>

            <p>
              Showing {filteredRequests.length} {filteredRequests.length === 1 ? "pickup request" : "pickup requests"}
              {requests.length !== filteredRequests.length ? ` (filtered from ${requests.length} total)` : ""}
            </p>

            {/* QUICK STATUS TABS */}
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {[
                { label: "All Requests", value: "" },
                { label: "Rescheduled Tasks", value: "STAFF_PENDING" },
                { label: "Assigned Tasks", value: "ASSIGNED" },
                { label: "Completed Tasks", value: "COMPLETED" },
              ].map((tab) => {
                const isActive = (selectedStatus || "").toUpperCase() === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(tab.value);
                      if (tab.value) {
                        setSearchParams({ status: tab.value });
                      } else {
                        setSearchParams({});
                      }
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      border: isActive ? "1.5px solid #1f8a5f" : "1px solid #dcede0",
                      background: isActive ? "#1f8a5f" : "#ffffff",
                      color: isActive ? "#ffffff" : "#2f4a1c",
                      fontWeight: 600,
                      fontSize: 12.5,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

          </div>

          {/* FILTERS BAR */}
          <div className="filters-bar">

            {/* DATE */}
            <div className="filter-group">
              <label htmlFor="filter-date">
                Date:
              </label>
              <input
                id="filter-date"
                type="date"
                value={searchDate}
                onChange={(e) =>
                  setSearchDate(
                    e.target.value
                  )
                }
                className="filter-input"
              />
            </div>

            {/* WARD */}
            <div className="filter-group">
              <label htmlFor="filter-ward">
                Ward:
              </label>
              <select
                id="filter-ward"
                value={selectedWard}
                onChange={(e) =>
                  setSelectedWard(
                    e.target.value
                  )
                }
                className="filter-select"
              >
                <option value="">All Wards</option>
                {availableWards.map((w) => (
                  <option
                    key={w.id || w.name}
                    value={w.name}
                  >
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* STATUS */}
            <div className="filter-group">
              <label htmlFor="filter-status">
                Status:
              </label>
              <select
                id="filter-status"
                value={selectedStatus}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedStatus(val);
                  if (val) {
                    setSearchParams({ status: val });
                  } else {
                    setSearchParams({});
                  }
                }}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="STAFF_PENDING">Rescheduled (Staff Pending)</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">All Pending (including Unassigned)</option>
                <option value="COLLECTED">Collected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* CLEAR FILTERS */}
            <button
              type="button"
              className="clear-filters-button"
              onClick={handleClearFilters}
              disabled={!searchDate && !selectedWard && !selectedStatus}
              title="Reset all filters"
            >
              Clear Filters
            </button>

          </div>

        </div>

        {/* TABLE */}
        <div className="table-container">

          <table className="pickup-table">

            <colgroup>
              <col className="col-request" />
              <col className="col-userid" />
              <col className="col-name" />
              <col className="col-phone" />
              <col className="col-mail" />
              <col className="col-ward" />
              <col className="col-location" />
              <col className="col-waste" />
              <col className="col-status" />
              <col className="col-date" />
              <col className="col-action" />
            </colgroup>

            {/* TABLE HEADER */}
            <thead>
              <tr>
                <SortableTh columnKey="requestId" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  REQUEST<br />ID
                </SortableTh>

                <SortableTh columnKey="userId" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  USER<br />ID
                </SortableTh>

                <SortableTh columnKey="userName" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  USER<br />NAME
                </SortableTh>

                <SortableTh columnKey="phone" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  PHONE
                </SortableTh>

                <SortableTh columnKey="email" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  MAIL
                </SortableTh>

                <SortableTh columnKey="ward" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  WARD
                </SortableTh>

                <SortableTh columnKey="pickupLocation" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  PICKUP LOCATION
                </SortableTh>

                <SortableTh columnKey="wasteType" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  WASTE<br />TYPE
                </SortableTh>

                <SortableTh columnKey="status" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  STATUS
                </SortableTh>

                <SortableTh columnKey="date" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  {selectedStatus === "COMPLETED" ? "COMPLETED AT" : "DATE"}
                </SortableTh>

                <SortableTh disabled>
                  ACTION
                </SortableTh>
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody>

              {/* LOADING */}
              {loading && (
                <tr>
                  <td
                    colSpan="11"
                    className="no-results"
                  >
                    Loading pickup
                    requests...
                  </td>
                </tr>
              )}

              {/* ERROR */}
              {!loading &&
                error && (
                  <tr>
                    <td
                      colSpan="11"
                      className="no-results"
                    >
                      {error}
                    </td>
                  </tr>
                )}

              {/* DATA */}
              {!loading &&
                !error &&
                sortedRequests.map(
                  (request) => (
                    <tr
                      key={
                        request.requestId
                      }
                    >

                      {/* REQUEST ID */}
                      <td>
                        {
                          request.requestId
                        }
                      </td>

                      {/* USER ID */}
                      <td>
                        {
                          request.userId
                        }
                      </td>

                      {/* NAME */}
                      <td className="user-name">
                        {
                          request.userName ||
                          "N/A"
                        }
                      </td>

                      {/* PHONE */}
                      <td>
                        {
                          request.phone ||
                          "N/A"
                        }
                      </td>

                      {/* EMAIL */}
                      <td>
                        {
                          request.mail ||
                          "N/A"
                        }
                      </td>

                      {/* WARD */}
                      <td>
                        {
                          request.ward ||
                          "N/A"
                        }
                      </td>

                      {/* LOCATION */}
                      <td className="location">
                        {
                          request.pickupLocation ||
                          "N/A"
                        }
                      </td>

                      {/* WASTE */}
                      <td>
                        {request.imageResults?.length >
                        0 ? (

                          <div
                            style={{
                              display: "flex",
                              flexDirection:
                                "column",
                              gap: "6px",
                            }}
                          >

                            {request.imageResults.map(
                              (
                                image,
                                index
                              ) => {
                                const imageDetections =
                                  Array.isArray(image?.detections) &&
                                  image.detections.length > 0
                                    ? image.detections
                                    : image?.waste_type &&
                                      image.waste_type !== "Unknown"
                                    ? [
                                        {
                                          class: image.waste_type,
                                          confidence: image.confidence,
                                        },
                                      ]
                                    : [];

                                return (
                                  <div
                                    key={
                                      image?.id ||
                                      image?.image_index ||
                                      index
                                    }
                                    style={{
                                      padding:
                                        "5px 7px",
                                      borderRadius:
                                        "5px",
                                      background:
                                        "#f5f7f8",
                                    }}
                                  >

                                    <div
                                      style={{
                                        fontSize:
                                          "11px",
                                        color:
                                          "#666",
                                        fontWeight: 600,
                                        marginBottom: "2px",
                                      }}
                                    >
                                      Image{" "}
                                      {index + 1}
                                    </div>

                                    {imageDetections.length > 0 ? (
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "2px",
                                        }}
                                      >
                                        {imageDetections.map((det, detIdx) => {
                                          const conf = Number(
                                            det?.confidence || 0
                                          );
                                          const className =
                                            det?.class ||
                                            det?.class_name ||
                                            det?.name ||
                                            "Unknown";
                                          const confPercent =
                                            conf <= 1.0 ? conf * 100 : conf;

                                          return (
                                            <div
                                              key={detIdx}
                                              style={{
                                                fontSize: "12.5px",
                                              }}
                                            >
                                              • <strong>{className}</strong>
                                              {conf > 0 && (
                                                <span
                                                  style={{
                                                    color: "#374151",
                                                  }}
                                                >
                                                  {" "}(
                                                  {confPercent.toFixed(2)}%)
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div
                                        style={{
                                          color:
                                            "#888",
                                          fontSize: "12px",
                                        }}
                                      >
                                        No detection
                                      </div>
                                    )}

                                  </div>
                                );
                              }
                            )}

                          </div>

                        ) : (
                          <span>
                            {request.wasteType || "No detection"}
                          </span>
                        )}

                        {request.status === "COMPLETED" && request.estimatedWeight !== null && request.estimatedWeight !== undefined && (
                          <div
                            style={{
                              marginTop: "5px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              color: "#1e6b4e",
                              background: "#eaf7ef",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            <Scale size={11} /> {request.estimatedWeight} kg
                          </div>
                        )}
                      </td>

                      {/* STATUS */}
                      <td>

                        <span
                          className={
                            statusClass[
                              request.status
                            ] ||
                            "status"
                          }
                          style={
                            request.status === "CANCELLED"
                              ? { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", fontWeight: 700 }
                              : request.status === "IN_PROGRESS"
                              ? { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", fontWeight: 700 }
                              : {}
                          }
                        >
                          {
                            request.status === "CANCELLED"
                              ? "Cancelled by User"
                              : request.status === "IN_PROGRESS"
                              ? "In Progress"
                              : request.status
                          }
                        </span>

                        {request.assignedStaff && (
                          <div style={{ fontSize: "11px", color: "#5f8268", marginTop: "3px" }}>
                            Staff: {request.assignedStaff}
                          </div>
                        )}

                        {request.pendingReason && request.status === "PENDING" && (
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: "11px",
                              background: "#fff7ed",
                              border: "1px solid #fed7aa",
                              color: "#9a3412",
                              borderRadius: 6,
                              padding: "3px 6px",
                              lineHeight: 1.3,
                              maxWidth: 190,
                              wordBreak: "break-word",
                            }}
                          >
                            <span style={{ fontWeight: 700 }}>⚠️ Reason: </span>
                            <span>{request.pendingReason}</span>
                          </div>
                        )}

                        {request.pendingReason && request.status !== "PENDING" && (
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: "10.5px",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              color: "#64748b",
                              borderRadius: 6,
                              padding: "2px 5px",
                              lineHeight: 1.25,
                              maxWidth: 190,
                              wordBreak: "break-word",
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>Previous Reason: </span>
                            <span>{request.pendingReason}</span>
                          </div>
                        )}

                      </td>

                      {/* DATE */}
                      <td className="date-cell">
                        {
                          request.status === "COMPLETED" && request.completedAt ? (
                            request.completedAt
                          ) : (
                            <div>
                              <div>{request.date || "N/A"}</div>
                              {request.scheduledPickupDate && (
                                <div style={{ fontSize: "11px", color: "#1e6b4e", fontWeight: 600, marginTop: "2px" }}>
                                  📅 Sched: {request.scheduledPickupDate}
                                </div>
                              )}
                            </div>
                          )
                        }
                      </td>

                      {/* ACTION */}
                      <td className="action-cell">

                        {request.status === "COMPLETED" ? (
                          <button
                            type="button"
                            className="assign-button"
                            style={{
                              background: "#2e7d32",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                            onClick={() =>
                              setDetailsModalRequest(
                                request
                              )
                            }
                          >
                            <Eye size={13} /> View Proof
                          </button>
                        ) : request.status === "CANCELLED" ? (
                          <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600 }}>—</span>
                        ) : request.status === "IN_PROGRESS" ? (
                          <span style={{ fontSize: "11.5px", color: "#b45309", fontWeight: 600, background: "#fef3c7", padding: "3px 8px", borderRadius: "6px" }}>In Progress</span>
                        ) : request.status === "ASSIGNED" ? (
                          <button
                            type="button"
                            className="assign-button"
                            style={{ background: "#397358" }}
                            onClick={() =>
                              setModalRequest(
                                request
                              )
                            }
                          >
                            Reassign
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="assign-button"
                            onClick={() =>
                              setModalRequest(
                                request
                              )
                            }
                          >
                            Assign
                          </button>
                        )}

                      </td>

                    </tr>
                  )
                )}

              {/* NO RESULTS */}
              {!loading &&
                !error &&
                filteredRequests.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan="11"
                      className="no-results"
                    >
                      No pickup requests
                      found.
                    </td>
                  </tr>
                )}

            </tbody>

          </table>

        </div>

      </main>

      {/* ASSIGN MODAL */}
      {modalRequest && (
        <AssignModal
          request={modalRequest}
          onClose={() =>
            setModalRequest(null)
          }
          onConfirm={handleAssign}
        />
      )}

      {/* COMPLETED DETAILS MODAL */}
      {detailsModalRequest && (
        <CompletedDetailsModal
          request={detailsModalRequest}
          onClose={() =>
            setDetailsModalRequest(null)
          }
        />
      )}

      {/* TOAST */}
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

    </div>
  );
}