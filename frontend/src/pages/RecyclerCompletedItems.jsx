import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { getAccessToken, performLogout } from "../utils/auth";
import "../components/Recyclerpage.css";
import NotificationBell from "../components/NotificationBell";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import RecycledReportModal from "../components/RecycledReportModal";
import {
  ArrowLeft,
  LayoutDashboard,
  User,
  Bell,
  Settings,
  LogOut,
  CheckCircle2,
  Clock3,
  Activity,
  Calendar,
  Weight,
  AlertCircle,
  Inbox,
  FileText,
  Recycle,
  ChevronRight,
  Layers,
} from "lucide-react";

// ---------------------------------------------------------------------------
// EcoPulse — Recycler Completed Items Page (Category Filtered)
// ---------------------------------------------------------------------------

const CATEGORIES = [
  "Paper",
  "Plastic",
  "Glass",
  "Metal",
  "Organic",
  "Electronics",
  "Miscellaneous",
];

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "profile", label: "My Profile", icon: User },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "settings", label: "Settings", icon: Settings },
];

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

export default function RecyclerCompletedItems() {
  const navigate = useNavigate();
  const [active, setActive] = useState("dashboard");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedReportRecord, setSelectedReportRecord] = useState(null);

  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [completedTasks, setCompletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchRecyclerTasks();
  }, []);

  const fetchRecyclerTasks = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const token = getAccessToken();
      const res = await API.get("/waste/mcf/recycler/tasks/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setCompletedTasks(res.data.completed_tasks || []);
      } else {
        setErrorMsg(res.data?.error || "Failed to load completed tasks.");
      }
    } catch (err) {
      console.error("Error fetching completed tasks:", err);
      setErrorMsg(
        err.response?.data?.error || "Failed to connect to backend server."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      navigate("/recycler");
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  // Filter tasks for the active category
  const filteredTasks = selectedCategory
    ? completedTasks.filter(
        (t) => (t.waste_type || "").toLowerCase() === selectedCategory.toLowerCase()
      )
    : [];

  return (
    <div className="recycler-root">
      <header className="recycler-topbar">
        <div className="recycler-topbar-left">
          <button className="recycler-back" onClick={handleBack} aria-label="Back">
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
        <aside className="recycler-sidebar">
          <nav className="recycler-nav">
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`recycler-nav-item${active === key ? " active" : ""}`}
                onClick={() => {
                  if (key === "dashboard") {
                    navigate("/recycler");
                  } else if (key === "notifications") {
                    navigate("/notifications");
                  } else if (key === "profile") {
                    navigate("/profile");
                  } else {
                    setActive(key);
                  }
                }}

              >
                <Icon size={17} strokeWidth={2} />
                {label}
              </button>
            ))}
          </nav>
          <button className="recycler-logout" onClick={handleLogout}>
            <LogOut size={17} strokeWidth={2} />
            Logout
          </button>
        </aside>

        <main className="recycler-main">
          {/* TOP BAR / BREADCRUMB HEADER */}
          <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ep-muted, #64748b)", marginBottom: 4 }}>
                <span
                  style={{ cursor: "pointer", color: "var(--ep-green-dark, #059669)", fontWeight: 600 }}
                  onClick={() => setSelectedCategory(null)}
                >
                  Completed Tasks
                </span>
                {selectedCategory && (
                  <>
                    <ChevronRight size={14} />
                    <span style={{ color: "var(--ep-text, #0f172a)", fontWeight: 700 }}>
                      {selectedCategory}
                    </span>
                  </>
                )}
              </div>

              <h1 className="recycler-main-heading">
                {selectedCategory ? `${selectedCategory} Completed Tasks` : "Completed Recycling Categories"}
              </h1>
              <p className="recycler-main-sub">
                {selectedCategory
                  ? `Viewing completed recycling tasks for ${selectedCategory}.`
                  : "Select a waste category card to view its completed recycling records and download reports."}
              </p>
            </div>

            <button className="recycler-btn-secondary" onClick={handleBack}>
              <ArrowLeft size={16} /> {selectedCategory ? "Back to Categories" : "Back to Dashboard"}
            </button>
          </div>

          {errorMsg && (
            <div className="recycler-error-msg" style={{ marginBottom: 20 }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* VIEW 1: 7 CATEGORY CARDS GRID */}
          {!selectedCategory && (
            loading ? (
              <div className="recycler-empty-state">
                <Clock3 size={28} className="recycler-empty-icon" />
                <p>Loading recycling categories...</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 18 }}>
                {CATEGORIES.map((catName) => {
                  const matched = completedTasks.filter(
                    (t) => (t.waste_type || "").toLowerCase() === catName.toLowerCase()
                  );
                  const totalKg = matched.reduce((acc, curr) => {
                    const qty = parseFloat(
                      curr.recyclable_quantity != null ? curr.recyclable_quantity : curr.total_quantity || 0
                    );
                    return acc + (isNaN(qty) ? 0 : qty);
                  }, 0);

                  return (
                    <div
                      key={catName}
                      className="recycler-card"
                      onClick={() => setSelectedCategory(catName)}
                      style={{
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        padding: 20,
                        gap: 16,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div className="recycler-card-icon">
                          <Recycle size={20} strokeWidth={2} />
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: matched.length > 0 ? "#065f46" : "#64748b",
                            background: matched.length > 0 ? "#d1fae5" : "#f1f5f9",
                            padding: "4px 10px",
                            borderRadius: 12,
                            border: matched.length > 0 ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
                          }}
                        >
                          {matched.length} {matched.length === 1 ? "Task" : "Tasks"}
                        </span>
                      </div>

                      <div>
                        <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--ep-text, #0f172a)" }}>
                          {catName}
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--ep-muted, #64748b)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Weight size={14} /> Total: {totalKg.toFixed(2)} kg
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* VIEW 2: FILTERED TASK LIST FOR SELECTED CATEGORY */}
          {selectedCategory && (
            loading ? (
              <div className="recycler-empty-state">
                <Clock3 size={28} className="recycler-empty-icon" />
                <p>Loading {selectedCategory} tasks...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="recycler-empty-state">
                <Inbox size={32} className="recycler-empty-icon" />
                <p style={{ fontWeight: 600, margin: 0, color: "var(--ep-text)" }}>
                  No completed tasks in this category.
                </p>
                <p style={{ fontSize: 13, margin: "4px 0 0" }}>
                  There are currently no completed {selectedCategory} recycling records for your facility.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {filteredTasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      background: "var(--ep-card-bg, #ffffff)",
                      border: "1px solid var(--ep-border, #e2e8f0)",
                      borderRadius: 16,
                      padding: 20,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ep-text, #0f172a)" }}>
                        {t.waste_type} Recycling
                      </h3>
                      <span
                        className="recycler-badge completed"
                        style={{
                          background: "#d1fae5",
                          color: "#065f46",
                          padding: "4px 12px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          border: "1px solid #a7f3d0",
                        }}
                      >
                        <CheckCircle2 size={13} /> Completed
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 14 }}>
                      <div>
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, display: "block" }}>Waste Category</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{t.waste_type}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, display: "block" }}>Assigned Quantity</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                          {parseFloat(t.total_quantity || 0).toFixed(2)} kg
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, display: "block" }}>Recycled Quantity</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#047857" }}>
                          {t.recyclable_quantity != null
                            ? `${parseFloat(t.recyclable_quantity).toFixed(2)} kg`
                            : `${parseFloat(t.total_quantity || 0).toFixed(2)} kg`}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, display: "block" }}>Completed Date</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                          {formatDate(t.completed_at || t.date)}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 10,
                        padding: "10px 14px",
                        marginBottom: 16,
                        fontSize: 13.5,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                        Recycler Note
                      </span>
                      <span style={{ color: t.note && t.note.trim() ? "#0f172a" : "#94a3b8", fontStyle: t.note && t.note.trim() ? "italic" : "normal" }}>
                        {t.note && t.note.trim() ? `"${t.note.trim()}"` : "No note provided"}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 16px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#059669",
                          background: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onClick={() => setSelectedReportRecord(t)}
                      >
                        <FileText size={15} />
                        Generate Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </main>
      </div>

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
