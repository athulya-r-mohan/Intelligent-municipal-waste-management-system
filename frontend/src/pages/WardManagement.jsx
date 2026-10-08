import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  AlertTriangle,
  CheckCircle2,
  X,
  Activity,
  CalendarDays,
  ShieldAlert,
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import "../components/WardManagement.css";

const API_BASE_URL = "http://127.0.0.1:8000";

function EcoPulseLogo({ onClick }) {
  return (
    <button className="wm-logo" onClick={onClick} aria-label="Go to admin">
      <span className="wm-logo-mark">
        <Activity size={18} strokeWidth={2.5} />
      </span>
      <span className="wm-logo-text">
        Eco<span className="wm-logo-accent">Pulse</span>
      </span>
    </button>
  );
}

function DateBadge() {
  const today = useMemo(() => {
    const d = new Date();
    const opts = { weekday: "short", day: "2-digit", month: "short", year: "numeric" };
    return d.toLocaleDateString("en-US", opts);
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-soft)", fontWeight: 600 }}>
      <CalendarDays size={16} strokeWidth={2.2} />
      <span>{today}</span>
    </div>
  );
}

export default function WardManagement() {
  const navigate = useNavigate();

  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWard, setEditingWard] = useState(null);
  const [deleteTargetWard, setDeleteTargetWard] = useState(null);

  // Form states
  const [formNumber, setFormNumber] = useState("");
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch all wards from PostgreSQL database
  const fetchWards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/wards/`, {
        headers: getAuthHeaders(),
      });
      if (Array.isArray(res.data)) {
        setWards(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch wards:", err);
      showToast("Failed to load wards from database.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWards();
  }, [fetchWards]);

  // Filtered wards for search
  const filteredWards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return wards;
    return wards.filter((w) => {
      const matchNum = String(w.ward_number).includes(q);
      const matchName = (w.ward_name || "").toLowerCase().includes(q);
      const matchLoc = (w.location || "").toLowerCase().includes(q);
      return matchNum || matchName || matchLoc;
    });
  }, [wards, searchQuery]);

  // Statistics
  const totalWards = wards.length;
  const activeWards = wards.filter((w) => (w.user_count || 0) > 0).length;
  const namedWards = wards.filter((w) => !!w.ward_name && w.ward_name.trim().length > 0).length;

  // Open Add Modal
  const handleOpenAdd = () => {
    // Find next available ward number
    const maxNum = wards.reduce((max, w) => Math.max(max, Number(w.ward_number) || 0), 0);
    setFormNumber(String(maxNum + 1));
    setFormName("");
    setFormLocation("");
    setFormError("");
    setShowAddModal(true);
  };

  // Submit Add Ward
  const handleCreateWard = async (e) => {
    e.preventDefault();
    setFormError("");

    const numVal = parseInt(formNumber, 10);
    if (!numVal || numVal <= 0) {
      setFormError("Please enter a valid positive Ward Number.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ward_number: numVal,
        ward_name: formName.trim(),
        location: formLocation.trim(),
      };

      const res = await axios.post(`${API_BASE_URL}/api/wards/`, payload, {
        headers: getAuthHeaders(),
      });

      setShowAddModal(false);
      showToast(res.data.message || `Ward ${numVal} created successfully!`, "success");
      fetchWards();
    } catch (err) {
      console.error("Create ward error:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.errors?.ward_number?.[0] ||
        "Failed to create ward. Please try again.";
      setFormError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal (Preserves existing ID and relationships)
  const handleOpenEdit = (ward) => {
    setEditingWard(ward);
    setFormNumber(String(ward.ward_number));
    setFormName(ward.ward_name || "");
    setFormLocation(ward.location || "");
    setFormError("");
  };

  // Submit Edit Ward
  const handleUpdateWard = async (e) => {
    e.preventDefault();
    if (!editingWard) return;
    setFormError("");

    const numVal = parseInt(formNumber, 10);
    if (!numVal || numVal <= 0) {
      setFormError("Please enter a valid positive Ward Number.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ward_number: numVal,
        ward_name: formName.trim(),
        location: formLocation.trim(),
      };

      const res = await axios.patch(
        `${API_BASE_URL}/api/wards/${editingWard.ward_id}/`,
        payload,
        { headers: getAuthHeaders() }
      );

      setEditingWard(null);
      showToast(res.data.message || `Ward ${numVal} updated successfully!`, "success");
      fetchWards();
    } catch (err) {
      console.error("Update ward error:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.errors?.ward_number?.[0] ||
        "Failed to update ward.";
      setFormError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Request
  const handleDeleteClick = (ward) => {
    setDeleteTargetWard(ward);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTargetWard) return;

    // Safety guard
    if (!deleteTargetWard.can_delete && (deleteTargetWard.user_count || 0) > 0) {
      showToast("Cannot delete ward: active records depend on it.", "error");
      setDeleteTargetWard(null);
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.delete(
        `${API_BASE_URL}/api/wards/${deleteTargetWard.ward_id}/`,
        { headers: getAuthHeaders() }
      );
      showToast(res.data.message || `Ward ${deleteTargetWard.ward_number} deleted.`, "success");
      setDeleteTargetWard(null);
      fetchWards();
    } catch (err) {
      console.error("Delete ward error:", err);
      const errMsg = err.response?.data?.error || "Failed to delete ward.";
      showToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ward-mgmt-root">
      {/* Topbar */}
      <header className="wm-topbar">
        <div className="wm-topbar-left">
          <button
            className="wm-back-btn"
            onClick={() => navigate("/admin")}
            aria-label="Back to Admin"
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
          </button>
          <EcoPulseLogo onClick={() => navigate("/admin")} />
          <span className="wm-page-title-badge">Municipality Administration</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <NotificationBell />
          <DateBadge />
        </div>
      </header>

      {/* Main Container */}
      <main className="wm-container">
        {/* Animated pulse line */}
        <svg className="wm-pulse-divider" viewBox="0 0 800 22" preserveAspectRatio="none">
          <polyline
            points="0,11 260,11 285,2 305,20 325,11 800,11"
            fill="none"
            stroke="#3FA96B"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Header Row */}
        <div className="wm-header-row">
          <div>
            <h1 className="wm-heading">Manage Wards</h1>
            <p className="wm-subheading">
              Add and manage municipality wards, update names, and track resident coverage.
            </p>
          </div>

          <button className="wm-add-btn" onClick={handleOpenAdd}>
            <Plus size={18} strokeWidth={2.4} />
            <span>Add Ward</span>
          </button>
        </div>

        {/* Stat Cards */}
        <div className="wm-stats-bar">
          <div className="wm-stat-card">
            <div className="wm-stat-icon-wrap">
              <MapPin size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="wm-stat-val">{totalWards}</div>
              <div className="wm-stat-label">Total Municipality Wards</div>
            </div>
          </div>

          <div className="wm-stat-card">
            <div className="wm-stat-icon-wrap" style={{ background: "#e0f2fe", color: "#0369a1" }}>
              <Users size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="wm-stat-val">{activeWards}</div>
              <div className="wm-stat-label">Wards with Active Residents</div>
            </div>
          </div>

          <div className="wm-stat-card">
            <div className="wm-stat-icon-wrap" style={{ background: "#fef3c7", color: "#b45309" }}>
              <CheckCircle2 size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="wm-stat-val">{namedWards} / {totalWards}</div>
              <div className="wm-stat-label">Named Wards Configured</div>
            </div>
          </div>
        </div>

        {/* Panel with Search & Table */}
        <div className="wm-card-panel">
          <div className="wm-panel-toolbar">
            <div className="wm-search-box">
              <Search size={16} color="#6b7280" />
              <input
                type="text"
                placeholder="Search by ward number, name, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <X size={15} color="#9ca3af" />
                </button>
              )}
            </div>

            <div className="wm-table-count">
              Showing <b>{filteredWards.length}</b> of <b>{totalWards}</b> wards
            </div>
          </div>

          {/* Table */}
          <div className="wm-table-wrap">
            {loading ? (
              <div className="wm-empty-state">
                <div style={{ fontSize: 14.5, color: "var(--ink-soft)" }}>
                  Loading municipality wards from database...
                </div>
              </div>
            ) : filteredWards.length === 0 ? (
              <div className="wm-empty-state">
                <div className="wm-empty-icon">
                  <MapPin size={24} />
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "var(--green-900)" }}>
                  No Wards Found
                </h3>
                <p style={{ margin: 0, fontSize: 13.5 }}>
                  {searchQuery
                    ? `No wards matching "${searchQuery}". Try a different search.`
                    : "No wards are currently configured in the database."}
                </p>
              </div>
            ) : (
              <table className="wm-table">
                <thead>
                  <tr>
                    <th style={{ width: "160px" }}>Ward Identifier</th>
                    <th>Ward Name</th>
                    <th>Location / Zone</th>
                    <th style={{ width: "160px" }}>Active Residents</th>
                    <th style={{ width: "160px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWards.map((w) => {
                    const hasName = Boolean(w.ward_name && w.ward_name.trim().length > 0);
                    const userCount = w.user_count || 0;
                    return (
                      <tr key={w.ward_id}>
                        <td>
                          <span className="wm-ward-num-chip">
                            <MapPin size={13} strokeWidth={2.5} />
                            Ward {w.ward_number}
                          </span>
                        </td>
                        <td>
                          {hasName ? (
                            <span className="wm-name-text">{w.ward_name}</span>
                          ) : (
                            <span className="wm-name-empty">Not assigned</span>
                          )}
                        </td>
                        <td>
                          <span className="wm-location-text">
                            {w.location && w.location.trim() ? w.location : "—"}
                          </span>
                        </td>
                        <td>
                          <span className={`wm-user-count-chip ${userCount > 0 ? "active" : ""}`}>
                            <Users size={12} />
                            {userCount} {userCount === 1 ? "resident" : "residents"}
                          </span>
                        </td>
                        <td>
                          <div className="wm-actions-cell" style={{ justifyContent: "flex-end" }}>
                            <button
                              className="wm-btn-edit"
                              onClick={() => handleOpenEdit(w)}
                              title={`Edit Ward ${w.ward_number}`}
                            >
                              <Pencil size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              className={`wm-btn-delete ${!w.can_delete ? "disabled" : ""}`}
                              onClick={() => handleDeleteClick(w)}
                              title={
                                !w.can_delete
                                  ? `Ward ${w.ward_number} is in use (${userCount} users) and cannot be deleted.`
                                  : `Delete Ward ${w.ward_number}`
                              }
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* ADD WARD MODAL */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="wm-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="wm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="wm-modal-header">
              <h2 className="wm-modal-title">Add Municipality Ward</h2>
              <button className="wm-modal-close" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="wm-modal-alert">
                <AlertTriangle size={16} flexShrink={0} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateWard}>
              <div className="wm-form-group">
                <label className="wm-form-label">
                  Ward Number <span className="req">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="wm-form-input"
                  placeholder="e.g. 3"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  required
                />
                <div className="wm-form-hint">
                  Must be a unique positive number (e.g. 1, 2, 3...)
                </div>
              </div>

              <div className="wm-form-group">
                <label className="wm-form-label">Ward Name (Optional)</label>
                <input
                  type="text"
                  className="wm-form-input"
                  placeholder="e.g. Central City / Green District"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
                <div className="wm-form-hint">
                  Can be added or updated anytime through Edit.
                </div>
              </div>

              <div className="wm-form-group">
                <label className="wm-form-label">Location / Zone (Optional)</label>
                <input
                  type="text"
                  className="wm-form-input"
                  placeholder="e.g. North Zone / Downtown"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                />
              </div>

              <div className="wm-modal-actions">
                <button
                  type="button"
                  className="wm-btn-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wm-btn-submit"
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "Create Ward"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT WARD MODAL (Preserves existing ID and relationships) */}
      {/* ========================================================= */}
      {editingWard && (
        <div className="wm-modal-overlay" onClick={() => setEditingWard(null)}>
          <div className="wm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="wm-modal-header">
              <h2 className="wm-modal-title">Edit Ward {editingWard.ward_number}</h2>
              <button className="wm-modal-close" onClick={() => setEditingWard(null)}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="wm-modal-alert">
                <AlertTriangle size={16} flexShrink={0} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateWard}>
              <div className="wm-form-group">
                <label className="wm-form-label">
                  Ward Number <span className="req">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="wm-form-input"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  required
                />
                <div className="wm-form-hint">
                  Preserves Ward ID #{editingWard.ward_id} and all connected user records.
                </div>
              </div>

              <div className="wm-form-group">
                <label className="wm-form-label">Ward Name</label>
                <input
                  type="text"
                  className="wm-form-input"
                  placeholder="Enter name for this ward..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoFocus
                />
                <div className="wm-form-hint">
                  {editingWard.ward_name
                    ? "Updating this name updates the existing database record."
                    : "Enter a name to assign to this existing ward."}
                </div>
              </div>

              <div className="wm-form-group">
                <label className="wm-form-label">Location / Zone</label>
                <input
                  type="text"
                  className="wm-form-input"
                  placeholder="e.g. Erattupetta"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                />
              </div>

              <div className="wm-modal-actions">
                <button
                  type="button"
                  className="wm-btn-cancel"
                  onClick={() => setEditingWard(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wm-btn-submit"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE MODAL (Safe check: in-use vs. safe to delete) */}
      {/* ========================================================= */}
      {deleteTargetWard && (
        <div className="wm-modal-overlay" onClick={() => setDeleteTargetWard(null)}>
          <div className="wm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="wm-modal-header">
              <h2 className="wm-modal-title" style={{ color: "var(--red)" }}>
                Delete Ward {deleteTargetWard.ward_number}
              </h2>
              <button className="wm-modal-close" onClick={() => setDeleteTargetWard(null)}>
                <X size={18} />
              </button>
            </div>

            {/* If ward has linked users: BLOCK DELETION */}
            {!deleteTargetWard.can_delete || (deleteTargetWard.user_count || 0) > 0 ? (
              <div>
                <div className="wm-modal-warning-box">
                  <ShieldAlert size={22} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ display: "block", marginBottom: 4 }}>
                      This ward is currently in use and cannot be deleted.
                    </strong>
                    <span>
                      There are currently <b>{deleteTargetWard.user_count}</b> active user(s),
                      pickups, and municipality assignments associated with Ward {deleteTargetWard.ward_number}.
                      Deleting this ward is prohibited to safeguard system integrity and prevent data loss.
                    </span>
                  </div>
                </div>

                <div className="wm-modal-actions">
                  <button
                    type="button"
                    className="wm-btn-cancel"
                    style={{ background: "var(--green-50)", color: "var(--green-700)", borderColor: "var(--green-500)" }}
                    onClick={() => setDeleteTargetWard(null)}
                  >
                    Understood
                  </button>
                </div>
              </div>
            ) : (
              /* If ward has 0 users: SAFE TO DELETE */
              <div>
                <p style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5, margin: "0 0 16px" }}>
                  Are you sure you want to delete <b>Ward {deleteTargetWard.ward_number}</b>
                  {deleteTargetWard.ward_name ? ` (${deleteTargetWard.ward_name})` : ""}?
                </p>
                <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 20px" }}>
                  This ward has 0 linked users and no active operations. This action cannot be undone.
                </p>

                <div className="wm-modal-actions">
                  <button
                    type="button"
                    className="wm-btn-cancel"
                    onClick={() => setDeleteTargetWard(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="wm-btn-danger"
                    onClick={handleConfirmDelete}
                    disabled={submitting}
                  >
                    {submitting ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`wm-toast ${toast.type}`}>
          {toast.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
