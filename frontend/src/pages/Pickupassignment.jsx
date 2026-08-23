import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import "../components/pickupassign.css";

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
// ASSIGN MODAL
// ============================================================
function AssignModal({
  request,
  onClose,
  onConfirm,
}) {
  const [staff, setStaff] = useState(
    request?.assignedStaff || ""
  );

  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");

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
            "Staff API response:",
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
    if (typeof person === "string") {
      return person;
    }

    return (
      person?.name ||
      person?.full_name ||
      person?.fullName ||
      person?.username ||
      person?.email ||
      `Staff #${person?.id || person?.staff_id || ""}`
    );
  };

  // ==========================================================
  // STAFF VALUE
  // ==========================================================
  const getStaffValue = (person) => {
    if (typeof person === "string") {
      return person;
    }

    return String(
      person?.id ||
      person?.staff_id ||
      person?.staffId ||
      person?.username ||
      person?.email ||
      person?.name ||
      ""
    );
  };

  // ==========================================================
  // CONFIRM ASSIGN
  // ==========================================================
  const handleConfirm = () => {
    if (!staff) {
      return;
    }

    const selectedStaff = staffList.find(
      (person) =>
        getStaffValue(person) === String(staff)
    );

    const staffName = selectedStaff
      ? getStaffName(selectedStaff)
      : staff;

    const staffId =
      selectedStaff?.staff_id ||
      selectedStaff?.id ||
      selectedStaff?.staffId ||
      staff;

    onConfirm(
      request.requestId,
      staffName,
      staffId
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

          {/* WASTE */}
          <div className="modal-field">
            <label>
              Waste Type
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
                      <strong>
                        Image {index + 1}
                      </strong>

                      <br />

                      {image.waste_type &&
                      image.waste_type !==
                        "Unknown" ? (
                        <>
                          {image.waste_type}

                          {Number(
                            image.confidence
                          ) > 0 && (
                            <>
                              {" "}
                              -
                              {" "}
                              {(
                                Number(
                                  image.confidence
                                ) * 100
                              ).toFixed(2)}
                              %
                            </>
                          )}
                        </>
                      ) : (
                        <span>
                          No detection
                        </span>
                      )}
                    </div>
                  )
                )
              ) : (
                request.wasteType ||
                "Unknown"
              )}
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
              staffLoading ||
              staffList.length === 0
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
  const [requests, setRequests] = useState([]);

  const [searchDate, setSearchDate] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [modalRequest, setModalRequest] =
    useState(null);

  const [toast, setToast] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

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
            // IMPORTANT:
            // Keep EVERY uploaded image and its AI result.
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
            // Only actual detections are included here.
            // "Unknown" is NOT considered a detection.
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

              // Main detected waste types
              wasteType,

              // IMPORTANT:
              // Every image and its result
              imageResults,

              // Keep original images too
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
              "Failed to load pickup requests."
            );
          }

        } else if (err.request) {
          setError(
            "Cannot connect to Django server. Please start the backend server."
          );

        } else {
          setError(
            "Failed to load pickup requests."
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
  // AVAILABLE WARDS FROM LOADED REQUESTS
  // ==========================================================
  const availableWards = useMemo(() => {
    const wardMap = new Map();
    requests.forEach((req) => {
      if (req.ward && req.ward !== "N/A" && req.ward !== "") {
        const key = String(req.ward).trim();
        if (!wardMap.has(key)) {
          wardMap.set(key, {
            id: req.wardId,
            name: req.ward,
          });
        }
      }
    });

    return Array.from(wardMap.values()).sort((a, b) => {
      if (a.id && b.id) return a.id - b.id;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
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
        const reqStatus = String(request.status || "").trim().toUpperCase();
        const targetStatus = selectedStatus.trim().toUpperCase();
        if (reqStatus !== targetStatus) {
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
    staffId
  ) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/waste/assign-pickup/`,
        {
          request_id: requestId,
          staff_id: staffId,
        }
      );

      console.log("Assignment API success:", response.data);

      setRequests((previous) =>
        previous.map((request) =>
          request.requestId === requestId
            ? {
                ...request,
                assignedStaff: staffName,
                assignedStaffId: staffId,
                status: "ASSIGNED",
              }
            : request
        )
      );

      setModalRequest(null);

      setToast(
        `Request #${requestId} successfully assigned to ${staffName}`
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

        <EcoPulseLogo />

        <div className="header-title">
          Pickup Requests
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
                onChange={(e) =>
                  setSelectedStatus(
                    e.target.value
                  )
                }
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="COLLECTED">Collected</option>
                <option value="COMPLETED">Completed</option>
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

                <th>
                  REQUEST
                  <br />
                  ID
                </th>

                <th>
                  USER
                  <br />
                  ID
                </th>

                <th>
                  USER
                  <br />
                  NAME
                </th>

                <th>
                  PHONE
                </th>

                <th>
                  MAIL
                </th>

                <th>
                  WARD
                </th>

                <th>
                  PICKUP LOCATION
                </th>

                <th>
                  WASTE
                  <br />
                  TYPE
                </th>

                <th>
                  STATUS
                </th>

                <th>
                  DATE
                </th>

                <th>
                  ACTION
                </th>

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
                filteredRequests.map(
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

                      {/* =================================================
                          WASTE
                          SHOW EVERY IMAGE RESULT
                          ================================================= */}
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
                            No detection
                          </span>
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

                      </td>

                      {/* DATE */}
                      <td className="date-cell">
                        {
                          request.date ||
                          "N/A"
                        }
                      </td>

                      {/* ACTION */}
                      <td className="action-cell">

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

      {/* TOAST */}
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

    </div>
  );
}