import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Calendar,
  Layers,
  Scale,
  Users,
  CheckCircle2,
  AlertCircle,
  Recycle,
  Building2,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import SortableTh from "../components/SortableTh";
import { sortTableData, getNextSortDirection } from "../utils/tableSort";
import "../components/AdminMCFDetails.css";

const API_BASE_URL = "https://intelligent-municipal-waste-management.onrender.com";

const CATEGORY_ICONS = {
  Paper: "📄",
  Plastic: "🧴",
  Glass: "🍾",
  Metal: "🥫",
  Organic: "🍎",
  Electronics: "💻",
  Miscellaneous: "📦",
};

export default function AdminMCFDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedDate = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const [dateData, setDateData] = useState(null);
  const [recyclers, setRecyclers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [catSortConfig, setCatSortConfig] = useState({ key: null, dir: null });
  const [staffSortConfig, setStaffSortConfig] = useState({ key: null, dir: null });

  const handleCatSort = (key) => {
    setCatSortConfig((prev) => ({
      key,
      dir: getNextSortDirection(prev.key, key, prev.dir),
    }));
  };

  const handleStaffSort = (key) => {
    setStaffSortConfig((prev) => ({
      key,
      dir: getNextSortDirection(prev.key, key, prev.dir),
    }));
  };
  const [successToast, setSuccessToast] = useState("");

  // Assign Modal State
  const [modalCategory, setModalCategory] = useState(null); // { waste_type, total_quantity, current_recycler_id }
  const [selectedRecyclerId, setSelectedRecyclerId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const [detailsRes, recyclersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/waste/mcf/admin/daily-details/?date=${selectedDate}`),
        axios.get(`${API_BASE_URL}/api/waste/mcf/recyclers/`),
      ]);

      if (detailsRes.data?.success) {
        setDateData(detailsRes.data);
      }
      if (recyclersRes.data?.recyclers) {
        setRecyclers(recyclersRes.data.recyclers);
      }
    } catch (err) {
      console.error("Failed to load MCF date details:", err);
      setError("Failed to load MCF details for the selected date.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [selectedDate]);

  const openAssignModal = (category) => {
    setModalCategory(category);
    setSelectedRecyclerId(category.assignment?.recycler_id || "");
    setModalError("");
  };

  const closeAssignModal = () => {
    setModalCategory(null);
    setSelectedRecyclerId("");
    setModalError("");
  };

  const handleConfirmAssignment = async () => {
    if (!selectedRecyclerId) {
      setModalError("Please select a recycler to assign.");
      return;
    }

    try {
      setAssigning(true);
      setModalError("");

      const payload = {
        date: selectedDate,
        waste_type: modalCategory.waste_type,
        recycler_id: selectedRecyclerId,
      };

      const res = await axios.post(
        `${API_BASE_URL}/api/waste/mcf/admin/assign-recycler/`,
        payload
      );

      if (res.data?.success) {
        const assignedRecycler = recyclers.find(
          (r) => String(r.recycler_id) === String(selectedRecyclerId)
        );
        const orgName = assignedRecycler ? assignedRecycler.organization : "Recycler";

        // Update local state immediately
        setDateData((prev) => {
          if (!prev) return prev;
          const updatedCategories = prev.categories.map((c) => {
            if (c.waste_type === modalCategory.waste_type) {
              return {
                ...c,
                is_assigned: true,
                assignment: res.data.assignment,
              };
            }
            return c;
          });
          return {
            ...prev,
            categories: updatedCategories,
          };
        });

        setSuccessToast(`Successfully assigned ${orgName} to ${modalCategory.waste_type}!`);
        setTimeout(() => setSuccessToast(""), 4000);
        closeAssignModal();
      }
    } catch (err) {
      console.error("Failed to assign recycler:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to assign recycler. Please try again.";
      setModalError(errMsg);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="mcf-details-page">
      {/* TOPBAR */}
      <header className="mcf-details-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            className="mcf-back-btn"
            onClick={() => navigate("/admin/mcf")}
          >
            <ArrowLeft size={16} />
            MCF Daily List
          </button>
          <div className="mcf-brand-logo">
            Eco <span>Pulse</span> · MCF Date Details
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <NotificationBell />
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="mcf-details-container">
        {/* HEADER HERO */}
        <div className="mcf-details-header-card">
          <div className="mcf-date-hero">
            <div className="mcf-date-hero-icon">
              <Calendar size={26} />
            </div>
            <div className="mcf-date-hero-title">
              <h1>{dateData?.date_formatted || selectedDate}</h1>
              <p>
                Aggregated daily collection summary and recycler assignment breakdown for {selectedDate}
              </p>
            </div>
          </div>

          <div className="mcf-grand-total-badge">
            <div className="mcf-grand-total-label">Grand Total Collected</div>
            <div className="mcf-grand-total-value">
              {dateData ? parseFloat(dateData.grand_total).toFixed(2) : "0.00"} kg
            </div>
          </div>
        </div>

        {/* TOASTS & ALERTS */}
        {successToast && (
          <div className="mcf-alert-banner mcf-alert-success" style={{ marginBottom: 20 }}>
            <CheckCircle2 size={18} />
            <div>{successToast}</div>
          </div>
        )}

        {error && (
          <div className="mcf-alert-banner mcf-alert-error" style={{ marginBottom: 20 }}>
            <AlertCircle size={18} />
            <div>{error}</div>
          </div>
        )}

        {/* WASTE CATEGORIES & RECYCLER ASSIGNMENT TABLE */}
        <div className="mcf-card-section">
          <div className="mcf-section-header">
            <div>
              <h2>Waste Categories & Recycler Assignment</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5c7c6d" }}>
                Total collection for each waste category on {selectedDate} and assigned recycler
              </p>
            </div>
            <button
              type="button"
              className="mcf-back-btn"
              onClick={fetchDetails}
              title="Refresh"
              style={{ padding: "6px 12px" }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "#5c7c6d" }}>
              <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px", display: "block" }} />
              Loading category totals...
            </div>
          ) : (
            <table className="mcf-category-table">
              <thead>
                <tr>
                  <SortableTh columnKey="waste_type" currentSortKey={catSortConfig.key} currentSortDir={catSortConfig.dir} onSort={handleCatSort}>
                    Waste Type
                  </SortableTh>
                  <SortableTh columnKey="total_quantity" currentSortKey={catSortConfig.key} currentSortDir={catSortConfig.dir} onSort={handleCatSort}>
                    Total Quantity
                  </SortableTh>
                  <SortableTh columnKey="assigned_recycler" currentSortKey={catSortConfig.key} currentSortDir={catSortConfig.dir} onSort={handleCatSort}>
                    Assigned Recycler
                  </SortableTh>
                  <SortableTh disabled align="right">
                    Action
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {sortTableData(dateData?.categories || [], catSortConfig.key, catSortConfig.dir, {
                  total_quantity: (c) => Number(c.total_quantity) || 0,
                  assigned_recycler: (c) => c.assignment?.recycler_organization || "ZZZ",
                }).map((cat) => {
                  const icon = CATEGORY_ICONS[cat.waste_type] || "📦";
                  const isAssigned = cat.is_assigned && cat.assignment;
                  const assign = cat.assignment;

                  return (
                    <tr key={cat.waste_type}>
                      <td>
                        <div className="mcf-cat-tag">
                          <span className="mcf-cat-tag-icon">{icon}</span>
                          <span>{cat.waste_type}</span>
                        </div>
                      </td>

                      <td>
                        <span className="mcf-qty-val">{parseFloat(cat.total_quantity).toFixed(2)} kg</span>
                      </td>

                      <td>
                        {isAssigned ? (
                          <div className="mcf-recycler-assigned-card">
                            <Building2 size={16} color="#137a41" />
                            <div>
                              <div className="mcf-recycler-org">{assign.recycler_organization}</div>
                              <div className="mcf-recycler-meta">
                                {assign.recycler_waste_type} · {assign.recycler_phone || assign.recycler_email}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mcf-unassigned-tag">
                            <span>Not Assigned</span>
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        {isAssigned ? (
                          <button
                            type="button"
                            className="mcf-reassign-action-btn"
                            onClick={() => openAssignModal(cat)}
                          >
                            <RefreshCw size={13} />
                            Change Recycler
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="mcf-assign-action-btn"
                            onClick={() => openAssignModal(cat)}
                          >
                            <Recycle size={14} />
                            Assign Recycler
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* STAFF CONTRIBUTIONS BREAKDOWN */}
        <div className="mcf-card-section">
          <div className="mcf-section-header">
            <div>
              <h2>Field Staff Submissions ({dateData?.staff_count || 0})</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5c7c6d" }}>
                Individual waste quantities collected and recorded by field staff on this date
              </p>
            </div>
          </div>

          {dateData?.staff_submissions?.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#8fa79b" }}>
              No staff submissions recorded for this date yet.
            </div>
          ) : (
            <table className="mcf-category-table">
              <thead>
                <tr>
                  <SortableTh columnKey="staff_name" currentSortKey={staffSortConfig.key} currentSortDir={staffSortConfig.dir} onSort={handleStaffSort}>
                    Staff Member
                  </SortableTh>
                  <SortableTh columnKey="paper" currentSortKey={staffSortConfig.key} currentSortDir={staffSortConfig.dir} onSort={handleStaffSort}>
                    Paper
                  </SortableTh>
                  <SortableTh columnKey="plastic" currentSortKey={staffSortConfig.key} currentSortDir={staffSortConfig.dir} onSort={handleStaffSort}>
                    Plastic
                  </SortableTh>
                  <SortableTh columnKey="glass" currentSortKey={staffSortConfig.key} currentSortDir={staffSortConfig.dir} onSort={handleStaffSort}>
                    Glass
                  </SortableTh>
                  <SortableTh columnKey="metal" currentSortKey={staffSortConfig.key} currentSortDir={staffSortConfig.dir} onSort={handleStaffSort}>
                    Metal
                  </SortableTh>
                  <SortableTh columnKey="organic" currentSortKey={staffSortConfig.key} currentSortDir={staffSortConfig.dir} onSort={handleStaffSort}>
                    Organic
                  </SortableTh>
                  <SortableTh columnKey="electronics" currentSortKey={staffSortConfig.key} currentSortDir={staffSortConfig.dir} onSort={handleStaffSort}>
                    Electronics
                  </SortableTh>
                  <SortableTh columnKey="miscellaneous" currentSortKey={staffSortConfig.key} currentSortDir={staffSortConfig.dir} onSort={handleStaffSort}>
                    Misc
                  </SortableTh>
                  <SortableTh columnKey="total_quantity" currentSortKey={staffSortConfig.key} currentSortDir={staffSortConfig.dir} onSort={handleStaffSort} align="right">
                    Staff Total
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {sortTableData(dateData?.staff_submissions || [], staffSortConfig.key, staffSortConfig.dir, {
                  staff_name: (s) => s.staff_name || `Staff #${s.staff_id}`,
                  paper: (s) => Number(s.paper) || 0,
                  plastic: (s) => Number(s.plastic) || 0,
                  glass: (s) => Number(s.glass) || 0,
                  metal: (s) => Number(s.metal) || 0,
                  organic: (s) => Number(s.organic) || 0,
                  electronics: (s) => Number(s.electronics) || 0,
                  miscellaneous: (s) => Number(s.miscellaneous) || 0,
                  total_quantity: (s) => Number(s.total_quantity) || 0,
                }).map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                        <Users size={15} color="#1fa35a" />
                        <span>{sub.staff_name || `Staff #${sub.staff_id}`}</span>
                      </div>
                    </td>
                    <td>{parseFloat(sub.paper).toFixed(1)} kg</td>
                    <td>{parseFloat(sub.plastic).toFixed(1)} kg</td>
                    <td>{parseFloat(sub.glass).toFixed(1)} kg</td>
                    <td>{parseFloat(sub.metal).toFixed(1)} kg</td>
                    <td>{parseFloat(sub.organic).toFixed(1)} kg</td>
                    <td>{parseFloat(sub.electronics).toFixed(1)} kg</td>
                    <td>{parseFloat(sub.miscellaneous).toFixed(1)} kg</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#137a41" }}>
                      {parseFloat(sub.total_quantity).toFixed(2)} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ASSIGN RECYCLER MODAL */}
      {modalCategory && (
        <div className="mcf-modal-backdrop" onClick={closeAssignModal}>
          <div className="mcf-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mcf-modal-header">
              <h3>Assign Recycler for {modalCategory.waste_type}</h3>
              <button className="mcf-modal-close" onClick={closeAssignModal}>
                ×
              </button>
            </div>

            <div className="mcf-modal-body">
              <div className="mcf-modal-summary">
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#137a41", textTransform: "uppercase" }}>
                    Category & Tonnage
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f241a" }}>
                    {modalCategory.waste_type} Waste
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#5c7c6d" }}>Collected Total</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#137a41" }}>
                    {parseFloat(modalCategory.total_quantity).toFixed(2)} kg
                  </div>
                </div>
              </div>

              {modalError && (
                <div className="mcf-alert-banner mcf-alert-error" style={{ marginBottom: 16 }}>
                  <AlertCircle size={16} />
                  <div>{modalError}</div>
                </div>
              )}

              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f241a", marginBottom: 8 }}>
                Select Recycler from Registered Partners:
              </div>

              {recyclers.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#5c7c6d", fontSize: 13 }}>
                  No registered recyclers found in database. Please register recyclers from the Admin Municipality page.
                </div>
              ) : (
                <div className="mcf-recycler-list">
                  {recyclers.map((r) => {
                    const isSelected = String(selectedRecyclerId) === String(r.recycler_id);
                    return (
                      <div
                        key={r.recycler_id}
                        className={`mcf-recycler-option ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedRecyclerId(r.recycler_id)}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#0f241a" }}>
                            {r.organization}
                          </div>
                          <div style={{ fontSize: 12, color: "#5c7c6d", marginTop: 2 }}>
                            Specialty: <strong>{r.waste_type}</strong> · {r.email}
                          </div>
                          {r.address && (
                            <div style={{ fontSize: 11.5, color: "#8fa79b", marginTop: 2 }}>
                              📍 {r.address}
                            </div>
                          )}
                        </div>
                        {isSelected && <CheckCircle2 size={20} color="#1fa35a" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mcf-modal-footer">
              <button
                type="button"
                className="mcf-btn-cancel"
                onClick={closeAssignModal}
                disabled={assigning}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mcf-btn-confirm"
                onClick={handleConfirmAssignment}
                disabled={assigning || recyclers.length === 0}
              >
                {assigning ? (
                  <>
                    <RefreshCw size={15} className="spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    Confirm Assignment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
