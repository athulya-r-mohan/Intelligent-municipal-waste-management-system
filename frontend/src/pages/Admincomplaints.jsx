import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Flame,
  Clock,
  CheckCircle2,
  UserCheck,
  MapPin,
  ImageIcon,
  User,
  Calendar,
  Eye,
  X,
  Filter,
} from "lucide-react";
import "../components/admincomplaints.css";
import NotificationBell from "../components/NotificationBell";
import SortableTh from "../components/SortableTh";
import { sortTableData, getNextSortDirection } from "../utils/tableSort";

const API_BASE_URL = "http://127.0.0.1:8000";

// ============================================================
// LOGO COMPONENT
// ============================================================
function AdminLogo({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px 6px",
        borderRadius: 10,
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          background: "linear-gradient(135deg, #1E6B4E, #3FA96B)",
        }}
      >
        <Activity size={18} strokeWidth={2.5} />
      </span>
      <span
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: 18,
          color: "#1B2A22",
        }}
      >
        Eco<span style={{ color: "#3FA96B" }}>Pulse</span>
      </span>
    </button>
  );
}

// ============================================================
// ASSIGN STAFF MODAL
// ============================================================
function AssignStaffModal({ complaint, onClose, onAssignSuccess }) {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchStaff = async () => {
      try {
        setLoadingStaff(true);
        // Load all staff from any ward for complaints
        let res;
        try {
          res = await axios.get(`${API_BASE_URL}/api/waste/staff/all/`);
        } catch (e) {
          // Fallback to ward endpoint if /staff/all/ is unavailable
          res = await axios.get(`${API_BASE_URL}/api/waste/staff/by-ward/0/`).catch(() => ({ data: [] }));
        }

        if (!mounted) return;
        const data = Array.isArray(res.data) ? res.data : [];
        setStaffList(data);
        if (data.length > 0) {
          setSelectedStaffId(String(data[0].staff_id || data[0].id));
        }
      } catch (err) {
        console.error("Failed to load staff list:", err);
      } finally {
        if (mounted) setLoadingStaff(false);
      }
    };
    fetchStaff();
    return () => {
      mounted = false;
    };
  }, []);

  const handleConfirm = async () => {
    if (!selectedStaffId) {
      setErrorMsg("Please select a staff member.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const response = await axios.post(
        `${API_BASE_URL}/api/waste/admin/complaints/assign/`,
        {
          complaint_id: complaint.id || complaint.complaint_id,
          staff_id: selectedStaffId,
        }
      );

      onAssignSuccess(response.data?.complaint || null, complaint.id);
      onClose();
    } catch (err) {
      console.error("Failed to assign staff:", err);
      setErrorMsg(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to assign staff member. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ac-modal-overlay" onClick={onClose}>
      <div className="ac-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ac-modal-header">
          <h2>Assign Staff — Complaint #{complaint?.id}</h2>
          <button className="ac-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ac-modal-body">
          <div className="ac-modal-field">
            <label>Location & Priority</label>
            <div className="value-box">
              <strong>{complaint?.location_name}</strong>
              <div style={{ marginTop: 4 }}>
                Priority: <strong style={{ color: complaint?.priority === "HIGH" ? "#dc2626" : complaint?.priority === "MEDIUM" ? "#d97706" : "#16a34a" }}>{complaint?.priority}</strong>
              </div>
            </div>
          </div>

          <div className="ac-modal-field">
            <label>Description</label>
            <div className="value-box" style={{ fontSize: 12.5, color: "#446152" }}>
              {complaint?.description}
            </div>
          </div>

          <div className="ac-modal-field">
            <label>Select Field Staff (Any Ward)</label>
            {loadingStaff ? (
              <div style={{ fontSize: 13, color: "#6c8479", padding: "8px 0" }}>Loading available staff...</div>
            ) : staffList.length === 0 ? (
              <div>
                <input
                  type="text"
                  className="ac-select"
                  placeholder="Enter Staff ID or Username..."
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                />
                <div style={{ fontSize: 11.5, color: "#6c8479", marginTop: 4 }}>
                  No staff automatically loaded. Enter staff ID directly.
                </div>
              </div>
            ) : (
              <select
                className="ac-select"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                {staffList.map((s) => (
                  <option key={s.staff_id || s.id} value={s.staff_id || s.id}>
                    {s.name || s.username} ({s.ward || "General"} · {s.designation || "Staff"} · ID #{s.staff_id || s.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          {errorMsg && (
            <div style={{ color: "#dc2626", fontSize: 12.5, marginTop: 8 }}>
              {errorMsg}
            </div>
          )}
        </div>

        <div className="ac-modal-footer">
          <button className="ac-btn-cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="ac-btn-primary" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Assigning..." : "Confirm Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// IMAGE PREVIEW MODAL
// ============================================================
function ImagePreviewModal({ imageUrl, title, onClose }) {
  if (!imageUrl) return null;
  return (
    <div className="ac-modal-overlay" onClick={onClose}>
      <div
        className="ac-modal"
        style={{ maxWidth: 640, background: "#1b2a22", color: "#fff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>{title || "Complaint Photo Proof"}</span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 16, display: "flex", justifyContent: "center", background: "#0f1c16" }}>
          <img
            src={imageUrl}
            alt="Complaint Preview"
            style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 8 }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN ADMIN COMPLAINTS COMPONENT
// ============================================================
export default function Admincomplaints() {
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [sortConfig, setSortConfig] = useState({ key: null, dir: null });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      dir: getNextSortDirection(prev.key, key, prev.dir),
    }));
  };

  const [activeModalComplaint, setActiveModalComplaint] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3500);
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_BASE_URL}/api/waste/admin/complaints/`);
      const data = response.data?.complaints || response.data || [];
      setComplaints(data);
    } catch (err) {
      console.error("Failed to fetch complaints:", err);
      setError("Failed to load complaints from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleAssignSuccess = (updatedComplaint, complaintId) => {
    if (updatedComplaint) {
      setComplaints((prev) =>
        prev.map((c) => (c.id === updatedComplaint.id ? updatedComplaint : c))
      );
      showToast(`Complaint #${updatedComplaint.id} successfully assigned to ${updatedComplaint.assigned_staff_name || "staff member"}!`);
    } else {
      fetchComplaints();
      showToast(`Complaint #${complaintId} assigned successfully!`);
    }
  };

  // Filter complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (filterPriority && c.priority !== filterPriority) {
        return false;
      }
      if (filterStatus && c.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [complaints, filterPriority, filterStatus]);

  const sortedComplaints = useMemo(() => {
    return sortTableData(filteredComplaints, sortConfig.key, sortConfig.dir, {
      citizen_name: (c) => c.citizen_name || c.user_name || "",
      assigned_staff_name: (c) => c.assigned_staff_name || c.staff_name || "",
    });
  }, [filteredComplaints, sortConfig]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: complaints.length,
      high: complaints.filter((c) => c.priority === "HIGH").length,
      medium: complaints.filter((c) => c.priority === "MEDIUM").length,
      low: complaints.filter((c) => c.priority === "LOW").length,
      new: complaints.filter((c) => c.status === "NEW").length,
      resolved: complaints.filter((c) => c.status === "RESOLVED").length,
    };
  }, [complaints]);

  return (
    <div className="ac-page">
      {/* HEADER */}
      <header className="ac-header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            className="ac-back-btn"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft size={15} /> Dashboard
          </button>
          <AdminLogo onClick={() => navigate("/admin")} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <NotificationBell />
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e6b4e", fontFamily: "'Poppins', sans-serif" }}>
            Public Waste Complaints
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="ac-main">
        <div className="ac-heading-wrap">
          <div>
            <h1>Public Waste Complaints</h1>
            <p>
              Automatic location-based priority system · Sorted: <strong>HIGH → MEDIUM → LOW</strong>
            </p>

            {/* FILTER TABS */}
            <div className="ac-tabs">
              {[
                { label: `All (${counts.all})`, priority: "", status: "" },
                { label: `🔴 High Priority (${counts.high})`, priority: "HIGH", status: "" },
                { label: `🟡 Medium Priority (${counts.medium})`, priority: "MEDIUM", status: "" },
                { label: `🟢 Low Priority (${counts.low})`, priority: "LOW", status: "" },
                { label: `New Unassigned (${counts.new})`, priority: "", status: "NEW" },
                { label: `✅ Resolved (${counts.resolved})`, priority: "", status: "RESOLVED" },
              ].map((tab, idx) => {
                const isActive = filterPriority === tab.priority && filterStatus === tab.status;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`ac-tab ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setFilterPriority(tab.priority);
                      setFilterStatus(tab.status);
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="ac-table-card">
          <table className="ac-table">
            <thead>
              <tr>
                <SortableTh columnKey="id" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  ID
                </SortableTh>
                <SortableTh disabled>
                  Original Waste Photo
                </SortableTh>
                <SortableTh disabled>
                  Cleared Proof
                </SortableTh>
                <SortableTh columnKey="location_name" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  Location & Coordinates
                </SortableTh>
                <SortableTh columnKey="priority" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  Priority
                </SortableTh>
                <SortableTh columnKey="citizen_name" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  Citizen Details
                </SortableTh>
                <SortableTh columnKey="description" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  Complaint Description
                </SortableTh>
                <SortableTh columnKey="status" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  Status
                </SortableTh>
                <SortableTh columnKey="assigned_staff_name" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  Assigned Staff
                </SortableTh>
                <SortableTh columnKey="created_at" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  Timeline / Dates
                </SortableTh>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "36px", color: "#6c8479" }}>
                    Loading complaints...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "36px", color: "#dc2626" }}>
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && filteredComplaints.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "36px", color: "#6c8479" }}>
                    No public waste complaints found.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                sortedComplaints.map((c) => (
                  <tr key={c.id || c.complaint_id}>
                    {/* ID */}
                    <td style={{ fontWeight: 700, color: "#1e6b4e" }}>
                      #{c.id || c.complaint_id}
                    </td>

                    {/* ORIGINAL PHOTO */}
                    <td>
                      {c.image_url || c.image ? (
                        <div
                          className="ac-thumb-box"
                          onClick={() =>
                            setPreviewImage({
                              url: c.image_url || c.image,
                              title: `Complaint #${c.id} Original Waste Photo`,
                            })
                          }
                          title="Click to zoom original waste photo"
                        >
                          <img src={c.image_url || c.image} alt="Original Evidence" />
                        </div>
                      ) : (
                        <div
                          className="ac-thumb-box"
                          style={{ cursor: "default", color: "#9ca3af" }}
                        >
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </td>

                    {/* CLEARED PROOF PHOTO */}
                    <td>
                      {c.proof_image_url || c.proof_image ? (
                        <div
                          className="ac-thumb-box"
                          style={{ borderColor: "#86efac", background: "#f0fdf4" }}
                          onClick={() =>
                            setPreviewImage({
                              url: c.proof_image_url || c.proof_image,
                              title: `Complaint #${c.id} Waste Cleared Proof Photo`,
                            })
                          }
                          title="Click to zoom staff clearance proof"
                        >
                          <img src={c.proof_image_url || c.proof_image} alt="Cleared Proof" />
                        </div>
                      ) : c.status === "RESOLVED" ? (
                        <span style={{ fontSize: 11.5, color: "#16a34a", fontWeight: 600 }}>Resolved</span>
                      ) : (
                        <span style={{ fontSize: 11.5, color: "#9ca3af" }}>Pending</span>
                      )}
                    </td>

                    {/* LOCATION */}
                    <td>
                      <div style={{ fontWeight: 600, color: "#1b2a22", maxWidth: 200 }}>
                        {c.location_name}
                      </div>
                      {c.latitude && c.longitude && (
                        <div style={{ fontSize: 11, color: "#6c8479", marginTop: 2 }}>
                          {Number(c.latitude).toFixed(4)}, {Number(c.longitude).toFixed(4)}
                        </div>
                      )}
                    </td>

                    {/* PRIORITY */}
                    <td>
                      {c.priority === "HIGH" && (
                        <span className="ac-badge-priority-high">
                          <Flame size={12} /> HIGH
                        </span>
                      )}
                      {c.priority === "MEDIUM" && (
                        <span className="ac-badge-priority-medium">
                          <AlertTriangle size={12} /> MEDIUM
                        </span>
                      )}
                      {c.priority === "LOW" && (
                        <span className="ac-badge-priority-low">
                          <CheckCircle2 size={12} /> LOW
                        </span>
                      )}
                    </td>

                    {/* CITIZEN */}
                    <td>
                      <div style={{ fontWeight: 600, color: "#1b2a22" }}>
                        {c.user_name || "Citizen"}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#6c8479" }}>
                        {c.phone || c.email}
                      </div>
                      {c.ward && (
                        <div style={{ fontSize: 11, color: "#3fa96b", marginTop: 2 }}>
                          {c.ward}
                        </div>
                      )}
                    </td>

                    {/* DESCRIPTION */}
                    <td style={{ maxWidth: 220 }}>
                      <div style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.4 }}>
                        {c.description}
                      </div>
                    </td>

                    {/* STATUS */}
                    <td>
                      <span className={`ac-badge-status-${String(c.status).toLowerCase()}`}>
                        {c.status}
                      </span>
                    </td>

                    {/* ASSIGNED STAFF */}
                    <td>
                      {c.assigned_staff_name ? (
                        <div>
                          <span className="ac-assigned-info">
                            {c.assigned_staff_name}
                          </span>
                          <div style={{ marginTop: 4 }}>
                            <button
                              type="button"
                              onClick={() => setActiveModalComplaint(c)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#1e6b4e",
                                fontSize: 11,
                                cursor: "pointer",
                                textDecoration: "underline",
                                padding: 0,
                              }}
                            >
                              Reassign
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="ac-assign-btn"
                          onClick={() => setActiveModalComplaint(c)}
                        >
                          <UserCheck size={13} /> Assign Staff
                        </button>
                      )}
                    </td>

                    {/* DATES */}
                    <td style={{ fontSize: 12, color: "#6c8479", whiteSpace: "nowrap" }}>
                      <div>
                        <strong>Submitted:</strong><br />
                        {c.created_at_formatted || (c.created_at ? new Date(c.created_at).toLocaleDateString() : "-")}
                      </div>
                      {(c.resolved_at_formatted || c.resolved_at) && (
                        <div style={{ marginTop: 6, color: "#16a34a" }}>
                          <strong>Resolved:</strong><br />
                          {c.resolved_at_formatted || new Date(c.resolved_at).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

      </main>

      {/* ASSIGN MODAL */}
      {activeModalComplaint && (
        <AssignStaffModal
          complaint={activeModalComplaint}
          onClose={() => setActiveModalComplaint(null)}
          onAssignSuccess={handleAssignSuccess}
        />
      )}

      {/* IMAGE PREVIEW MODAL */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage.url}
          title={previewImage.title}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* TOAST */}
      {toastMessage && (
        <div className="ac-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
