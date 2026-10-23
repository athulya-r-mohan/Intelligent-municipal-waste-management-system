import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { BASE_URL as API_BASE_URL } from "../api/api";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../components/NotificationBell";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import RecycledReportModal from "../components/RecycledReportModal";
import { performLogout } from "../utils/auth";
import { getFullImageUrl } from "../utils/imageUrl";
import "../components/Adminpage.css";
import {
  LayoutDashboard,
  Building2,
  UserCircle2,
  Bell,
  LogOut,
  ArrowLeft,
  CalendarDays,
  Recycle,
  Calendar,
  Layers,
  ChevronRight,
  Clock,
  Inbox,
  AlertCircle,
  Weight,
  FileText,
  Activity,
  CheckCircle2,
} from "lucide-react";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "municipality", label: "Manage Municipality", icon: Building2 },
  { key: "profile", label: "My Profile", icon: UserCircle2 },
  { key: "notifications", label: "Notifications", icon: Bell },
];

function Logo({ onClick }) {
  return (
    <button className="admin-logo" onClick={onClick} aria-label="Go to home">
      <span className="admin-logo-mark">
        <Activity size={18} strokeWidth={2.5} />
      </span>
      <span className="admin-logo-text">
        Eco<span className="admin-logo-accent">Pulse</span>
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
    <div className="admin-date-badge">
      <CalendarDays size={16} strokeWidth={2.2} />
      <span>{today}</span>
    </div>
  );
}

const formatDate = (dateString, withTime = false) => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "N/A";
  
  if (withTime) {
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function AdminRecycledHistory() {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedReportRecord, setSelectedReportRecord] = useState(null);

  // Drill-down navigation states
  const [selectedMonth, setSelectedMonth] = useState(null); // { year, month, label }
  const [selectedCategory, setSelectedCategory] = useState(null); // "Plastic", etc.

  // Data states
  const [months, setMonths] = useState([]);
  const [categories, setCategories] = useState([]);
  const [records, setRecords] = useState([]);

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // 1. Fetch available months on mount
  useEffect(() => {
    fetchMonths();
  }, []);

  // 2. Fetch categories when selectedMonth changes
  useEffect(() => {
    if (selectedMonth) {
      fetchCategories(selectedMonth.year, selectedMonth.month);
    } else {
      setCategories([]);
    }
  }, [selectedMonth]);

  // 3. Fetch detailed records when selectedMonth & selectedCategory change
  useEffect(() => {
    if (selectedMonth && selectedCategory) {
      fetchRecords(selectedMonth.year, selectedMonth.month, selectedCategory);
    } else {
      setRecords([]);
    }
  }, [selectedMonth, selectedCategory]);

  const fetchMonths = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await axios.get(`${API_BASE_URL}/api/waste/admin/recycling-history/months/`);
      if (res.data?.success) {
        setMonths(res.data.months || []);
      } else {
        setErrorMsg(res.data?.error || "Failed to load recycling months.");
      }
    } catch (err) {
      console.error("Error fetching recycling months:", err);
      setErrorMsg("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (year, month) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/waste/admin/recycling-history/categories/?year=${year}&month=${month}`
      );
      if (res.data?.success) {
        setCategories(res.data.categories || []);
      } else {
        setErrorMsg(res.data?.error || "Failed to load category breakdown.");
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      setErrorMsg("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (year, month, category) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/waste/admin/recycling-history/records/?year=${year}&month=${month}&category=${encodeURIComponent(category)}`
      );
      if (res.data?.success) {
        setRecords(res.data.records || []);
      } else {
        setErrorMsg(res.data?.error || "Failed to load recycling records.");
      }
    } catch (err) {
      console.error("Error fetching recycling records:", err);
      setErrorMsg("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackNav = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else if (selectedMonth) {
      setSelectedMonth(null);
    } else {
      navigate("/admin");
    }
  };

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <Logo onClick={() => navigate("/admin")} />
        <div className="admin-sidebar-role">Admin</div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === "dashboard";
            return (
              <button
                key={item.key}
                className={isActive ? "admin-nav-item active" : "admin-nav-item"}
                onClick={() => {
                  if (item.key === "dashboard") navigate("/admin");
                  else if (item.key === "notifications") navigate("/notifications");
                  else if (item.key === "profile") navigate("/profile");
                  else navigate("/admin");
                }}

              >
                <Icon size={17} strokeWidth={2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="admin-sidebar-spacer" />
        <button className="admin-logout" onClick={() => setShowLogoutModal(true)}>
          <LogOut size={17} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <button className="admin-back-btn" onClick={handleBackNav}>
            <ArrowLeft size={15} strokeWidth={2.3} />
            {selectedCategory
              ? `Back to ${selectedMonth?.label}`
              : selectedMonth
              ? "Back to Months"
              : "Back to Dashboard"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NotificationBell />
            <DateBadge />
          </div>
        </div>

        <svg className="admin-pulse-divider" viewBox="0 0 800 22" preserveAspectRatio="none">
          <polyline
            points="0,11 260,11 285,2 305,20 325,11 800,11"
            fill="none"
            stroke="#3FA96B"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* BREADCRUMB & HEADING */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--pulse-muted)", marginBottom: 6 }}>
            <span style={{ cursor: "pointer", color: "var(--pulse-forest)", fontWeight: 500 }} onClick={() => { setSelectedMonth(null); setSelectedCategory(null); }}>
              Recycled Waste History
            </span>
            {selectedMonth && (
              <>
                <ChevronRight size={14} />
                <span style={{ cursor: "pointer", color: selectedCategory ? "var(--pulse-forest)" : "var(--pulse-ink)", fontWeight: selectedCategory ? 500 : 600 }} onClick={() => setSelectedCategory(null)}>
                  {selectedMonth.label}
                </span>
              </>
            )}
            {selectedCategory && (
              <>
                <ChevronRight size={14} />
                <span style={{ color: "var(--pulse-ink)", fontWeight: 600 }}>{selectedCategory}</span>
              </>
            )}
          </div>

          <h1 className="admin-page-heading">
            {selectedCategory
              ? `${selectedCategory} Recycling History`
              : selectedMonth
              ? `${selectedMonth.label} Categories`
              : "Recycled Waste History"}
          </h1>
          <p className="admin-page-sub">
            {selectedCategory
              ? `All completed ${selectedCategory} recycling records for ${selectedMonth?.label}.`
              : selectedMonth
              ? `Select a waste category to view detailed recycling logs for ${selectedMonth?.label}.`
              : "Select a month and year to view completed waste recycling records."}
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              background: "#FEE2E2",
              border: "1px solid #FCA5A5",
              color: "#991B1B",
              padding: "12px 16px",
              borderRadius: 12,
              marginBottom: 20,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* -------------------------------------------------------------
           LEVEL 1: MONTH SELECTION
        ------------------------------------------------------------- */}
        {!selectedMonth && (
          loading ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--pulse-muted)" }}>
              <Clock size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
              <p>Loading available recycling records...</p>
            </div>
          ) : months.length === 0 ? (
            <div
              style={{
                background: "var(--pulse-white)",
                border: "1px dashed var(--pulse-border)",
                borderRadius: 16,
                padding: "40px 24px",
                textAlign: "center",
                color: "var(--pulse-muted)",
              }}
            >
              <Inbox size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
              <p style={{ fontWeight: 600, color: "var(--pulse-ink)", margin: 0 }}>
                No recycled waste records found.
              </p>
              <p style={{ fontSize: 13, margin: "4px 0 0" }}>
                Completed recycling assignments from facilities will appear here grouped by month and year.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
              {months.map((m) => (
                <div
                  key={`${m.year}-${m.month}`}
                  className="admin-card"
                  onClick={() => setSelectedMonth(m)}
                  style={{ cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 14 }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div className="admin-card-icon">
                      <Calendar size={20} strokeWidth={2} />
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--pulse-forest)",
                        background: "var(--pulse-mint)",
                        padding: "4px 10px",
                        borderRadius: 10,
                        border: "1px solid var(--pulse-border)",
                      }}
                    >
                      {m.total_records} {m.total_records === 1 ? "Record" : "Records"}
                    </span>
                  </div>

                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 600, color: "var(--pulse-ink)" }}>
                      {m.label}
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--pulse-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Weight size={14} /> Total: {m.total_kg.toFixed(2)} kg
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* -------------------------------------------------------------
           LEVEL 2: CATEGORY SELECTION FOR SELECTED MONTH
        ------------------------------------------------------------- */}
        {selectedMonth && !selectedCategory && (
          loading ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--pulse-muted)" }}>
              <Clock size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
              <p>Loading category totals for {selectedMonth.label}...</p>
            </div>
          ) : categories.every((c) => c.count === 0) ? (
            <div
              style={{
                background: "var(--pulse-white)",
                border: "1px dashed var(--pulse-border)",
                borderRadius: 16,
                padding: "40px 24px",
                textAlign: "center",
                color: "var(--pulse-muted)",
              }}
            >
              <Inbox size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
              <p style={{ fontWeight: 600, color: "var(--pulse-ink)", margin: 0 }}>
                No recycled waste records found for {selectedMonth.label}.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
              {categories.map((cat) => (
                <div
                  key={cat.name}
                  className="admin-card"
                  onClick={() => setSelectedCategory(cat.name)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 14,
                    opacity: cat.count === 0 ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div className="admin-card-icon">
                      <Recycle size={20} strokeWidth={2} />
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: cat.count > 0 ? "var(--pulse-forest)" : "var(--pulse-muted)",
                        background: cat.count > 0 ? "var(--pulse-mint)" : "#F3F4F6",
                        padding: "3px 8px",
                        borderRadius: 8,
                      }}
                    >
                      {cat.count} {cat.count === 1 ? "task" : "tasks"}
                    </span>
                  </div>

                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "var(--pulse-ink)" }}>
                      {cat.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--pulse-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Weight size={14} /> {cat.total_kg.toFixed(2)} kg
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* -------------------------------------------------------------
           LEVEL 3: RECORDS TABLE FOR SELECTED MONTH & CATEGORY
        ------------------------------------------------------------- */}
        {selectedMonth && selectedCategory && (
          loading ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--pulse-muted)" }}>
              <Clock size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
              <p>Loading {selectedCategory} records for {selectedMonth.label}...</p>
            </div>
          ) : records.length === 0 ? (
            <div
              style={{
                background: "var(--pulse-white)",
                border: "1px dashed var(--pulse-border)",
                borderRadius: 16,
                padding: "40px 24px",
                textAlign: "center",
                color: "var(--pulse-muted)",
              }}
            >
              <Inbox size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
              <p style={{ fontWeight: 600, color: "var(--pulse-ink)", margin: 0 }}>
                No {selectedCategory} recycling records found for {selectedMonth.label}.
              </p>
            </div>
          ) : (
            <div
              style={{
                background: "var(--pulse-white)",
                border: "1px solid var(--pulse-border)",
                borderRadius: 16,
                padding: 24,
                boxShadow: "0 4px 14px rgba(30, 107, 78, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "var(--pulse-forest)" }}>
                  {selectedCategory} Records — {selectedMonth.label}
                </h2>
                <span style={{ fontSize: 13, color: "var(--pulse-muted)", fontWeight: 500 }}>
                  Showing {records.length} completed {records.length === 1 ? "entry" : "entries"}
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "1.5px solid var(--pulse-border)", textAlign: "left" }}>
                      <th style={{ padding: "12px 14px", color: "var(--pulse-muted)", fontWeight: 600 }}>Date</th>
                      <th style={{ padding: "12px 14px", color: "var(--pulse-muted)", fontWeight: 600 }}>Category</th>
                      <th style={{ padding: "12px 14px", color: "var(--pulse-muted)", fontWeight: 600 }}>Quantity</th>
                      <th style={{ padding: "12px 14px", color: "var(--pulse-muted)", fontWeight: 600 }}>Recycler</th>
                      <th style={{ padding: "12px 14px", color: "var(--pulse-muted)", fontWeight: 600 }}>Assigned By</th>
                      <th style={{ padding: "12px 14px", color: "var(--pulse-muted)", fontWeight: 600 }}>Recycler Note</th>
                      <th style={{ padding: "12px 14px", color: "var(--pulse-muted)", fontWeight: 600 }}>Recycling Image</th>
                      <th style={{ padding: "12px 14px", color: "var(--pulse-muted)", fontWeight: 600 }}>Status</th>
                      <th style={{ padding: "12px 14px", color: "var(--pulse-muted)", fontWeight: 600, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid var(--pulse-border)" }}>
                        <td style={{ padding: "14px", fontWeight: 500 }}>
                          {formatDate(r.completed_at || r.date, Boolean(r.completed_at))}
                        </td>
                        <td style={{ padding: "14px", fontWeight: 600, color: "var(--pulse-forest)" }}>
                          {r.waste_type}
                        </td>
                        <td style={{ padding: "14px" }}>
                          <span style={{ fontWeight: 600, color: "var(--pulse-ink)" }}>
                            {r.recyclable_quantity != null
                              ? `${parseFloat(r.recyclable_quantity).toFixed(2)} kg`
                              : `${parseFloat(r.total_quantity).toFixed(2)} kg`}
                          </span>
                          {r.total_quantity && (
                            <span style={{ fontSize: 12, color: "var(--pulse-muted)", display: "block" }}>
                              Assigned: {parseFloat(r.total_quantity).toFixed(2)} kg
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px" }}>
                          <span style={{ fontWeight: 600 }}>{r.recycler_organization || "N/A"}</span>
                          {r.recycler_email && (
                            <span style={{ fontSize: 12, color: "var(--pulse-muted)", display: "block" }}>
                              {r.recycler_email}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px", color: "var(--pulse-muted)" }}>
                          {r.assigned_by_name || "Admin"}
                        </td>
                        <td style={{ padding: "14px", maxWidth: 200 }}>
                          {r.note && r.note.trim() ? (
                            <span style={{ fontSize: 13, fontStyle: "italic", color: "var(--pulse-ink)" }}>
                              "{r.note.trim()}"
                            </span>
                          ) : (
                            <span style={{ color: "var(--pulse-muted)", fontWeight: 500 }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: "14px" }}>
                          {r.recycling_image_url || r.recycling_image ? (
                            <a
                              href={getFullImageUrl(r.recycling_image_url || r.recycling_image)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View full recycling proof"
                              style={{ display: "inline-block", textDecoration: "none" }}
                            >
                              <img
                                src={getFullImageUrl(r.recycling_image_url || r.recycling_image)}
                                alt="Recycling Proof"
                                style={{
                                  width: 44,
                                  height: 44,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                  border: "1px solid var(--pulse-border)",
                                  display: "block",
                                }}
                              />
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--pulse-muted)", fontStyle: "italic" }}>
                              No image
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: 999,
                              background: "#D1FAE5",
                              color: "#065F46",
                              border: "1px solid #A7F3D0",
                            }}
                          >
                            <CheckCircle2 size={13} /> Completed
                          </span>
                        </td>
                        <td style={{ padding: "14px", textAlign: "right" }}>
                          <button
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                              color: "var(--pulse-forest)",
                              background: "var(--pulse-mint)",
                              border: "1px solid var(--pulse-border)",
                              borderRadius: 8,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                            onClick={() => setSelectedReportRecord(r)}
                          >
                            <FileText size={14} />
                            Generate Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </main>

      <RecycledReportModal
        record={selectedReportRecord}
        onClose={() => setSelectedReportRecord(null)}
      />

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => performLogout(navigate)}
      />
    </div>
  );
}
