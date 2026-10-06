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
import "../components/pickupassign.css";
import NotificationBell from "../components/NotificationBell";
import SortableTh from "../components/SortableTh";
import { sortTableData, getNextSortDirection } from "../utils/tableSort";

// ============================================================
// API BASE URL
// ============================================================
const API_BASE_URL = "http://127.0.0.1:8000";

// ============================================================
// LOGO
// ============================================================
function EcoPulseLogo() {
  return (
    <div className="ecopulse-logo">
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

  PENDING: "status pending",
  ASSIGNED: "status assigned",
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
    (image) =>
      image?.waste_type &&
      image.waste_type !== "Unknown" &&
      image.waste_type !== "No detection" &&
      image.waste_type !== "Not Detected" &&
      String(image.waste_type).trim() !== ""
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
        </div>

        {/* BODY */}
        <div className="modal-body">

          {/* LOCATION */}
          <div className="modal-field">
            <label>
              Pickup Location
            </label>

            <div className="modal-value">
              {request.pickupLocation ||
                "Not available"}
            </div>
          </div>

          {/* WASTE TYPE: AI SUCCESS VS AI FAILURE FALLBACK */}
          {hasValidAiDetection ? (
            <div className="modal-field">
              <label>
                AI Detected Waste Type
              </label>

              <div className="modal-value">
                {request.imageResults?.length > 0 ? (
                  request.imageResults.map(
                    (image, index) => (
                      <div
                        key={
                          image.id ||
                          image.image_index ||
                          index
                        }
                        style={{
                          marginBottom:
                            "8px",
                        }}
                      >
                        {request.imageResults.length > 1 && (
                          <strong>
                            Image {index + 1}:{" "}
                          </strong>
                        )}

                        {image.waste_type &&
                        image.waste_type !==
                          "Unknown" ? (
                          <span style={{ fontWeight: 600, color: "#1f6b4e" }}>
                            {image.waste_type}

                            {Number(
                              image.confidence
                            ) > 0 && (
                              <span style={{ fontSize: "12.5px", color: "#5f8a45", fontWeight: 500 }}>
                                {" "}
                                ({(
                                  Number(
                                    image.confidence
                                  ) * 100
                                ).toFixed(2)}%)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span>
                            {request.wasteType || "Detected"}
                          </span>
                        )}
                      </div>
                    )
                  )
                ) : (
                  <span style={{ fontWeight: 600, color: "#1f6b4e" }}>
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
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: "12px",
                  color: "#cf1322",
                  fontSize: "12.5px",
                  lineHeight: "1.4",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  ⚠️ AI Detection Failed
                </div>
                <div>
                  No waste type was automatically detected. Please enter or select the waste type manually before assigning staff.
                </div>
              </div>

              <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
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
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: wasteTypeError ? "1.5px solid #cf1322" : "1px solid #cfe7bb",
                  background: "#ffffff",
                  color: manualWasteType ? "#243515" : "#6c8479",
                  fontSize: "13.5px",
                  fontWeight: 500,
                  outline: "none",
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
                    fontSize: "12px",
                    marginTop: 5,
                    fontWeight: 600,
                  }}
                >
                  {wasteTypeError}
                </div>
              )}
            </div>
          )}

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
              <div className="modal-value">
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
                  <div className="modal-value">
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
                padding: "10px 12px",
                borderRadius: "8px",
                border: scheduledDateError ? "1px solid #e11d48" : "1px solid #dcede0",
                fontSize: "14px",
                color: "#1e293b",
                outline: "none",
                background: "#f7fbf8",
                boxSizing: "border-box",
              }}
              required
            />
            {scheduledDateError && (
              <div style={{ color: "#e11d48", fontSize: "12px", marginTop: "4px" }}>
                {scheduledDateError}
              </div>
            )}
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
            const imageResults =
              images.map(
                (image, index) => ({
                  ...image,

                  image_index:
                    image?.image_index ??
                    index + 1,

                  waste_type:
                    image?.waste_type ||
                    image?.wasteType ||
                    image?.predicted_class ||
                    image?.predictedClass ||
                    "Unknown",

                  confidence:
                    Number(
                      image?.confidence ?? 0
                    ),
                })
              );

            // =================================================
            // WASTE TYPES FROM DETECTED IMAGES
            // =================================================
            let wasteTypes =
              imageResults
                .map(
                  (image) =>
                    image.waste_type
                )
                .filter(
                  (type) =>
                    type &&
                    type !== "Unknown"
                );

            // Remove duplicates
            wasteTypes = [
              ...new Set(wasteTypes),
            ];

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
              !wasteTypes.includes(
                mainWasteType
              )
            ) {
              wasteTypes.unshift(
                mainWasteType
              );
            }

            // =================================================
            // DISPLAY WASTE TYPE
            // =================================================
            const wasteType =
              wasteTypes.length > 0
                ? wasteTypes.join(", ")
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
            onClick={() => navigate("/admin")}
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

          <EcoPulseLogo />
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

                                const detected =
                                  image?.waste_type &&
                                  image.waste_type !==
                                    "Unknown";

                                const confidence =
                                  Number(
                                    image?.confidence ||
                                      0
                                  );

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
                                      }}
                                    >
                                      Image{" "}
                                      {index + 1}
                                    </div>

                                    {detected ? (
                                      <div>
                                        <strong>
                                          {
                                            image.waste_type
                                          }
                                        </strong>

                                        {confidence >
                                          0 && (
                                          <span>
                                            {" "}
                                            (
                                            {(
                                              confidence *
                                              100
                                            ).toFixed(
                                              2
                                            )}
                                            %)
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div
                                        style={{
                                          color:
                                            "#888",
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
                        >
                          {
                            request.status
                          }
                        </span>

                        {request.assignedStaff && (
                          <div style={{ fontSize: "11px", color: "#5f8268", marginTop: "3px" }}>
                            Staff: {request.assignedStaff}
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