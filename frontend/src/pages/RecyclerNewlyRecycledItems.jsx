import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { getAccessToken, performLogout } from "../utils/auth";
import "../components/Recyclerpage.css";
import NotificationBell from "../components/NotificationBell";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import {
  ArrowLeft,
  LayoutDashboard,
  User,
  Bell,
  Settings,
  LogOut,
  Recycle,
  Clock3,
  Activity,
  Calendar,
  Weight,
  AlertCircle,
  Inbox,
  ArrowRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// EcoPulse — Recycler Newly Recycled Items Page
// ---------------------------------------------------------------------------

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

export default function RecyclerNewlyRecycledItems() {
  const navigate = useNavigate();
  const [active, setActive] = useState("dashboard");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [pendingTasks, setPendingTasks] = useState([]);
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
        setPendingTasks(res.data.pending_tasks || []);
      } else {
        setErrorMsg(res.data?.error || "Failed to load recycler tasks.");
      }
    } catch (err) {
      console.error("Error fetching recycler tasks:", err);
      setErrorMsg(
        err.response?.data?.error || "Failed to connect to backend server."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/recycler");
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  return (
    <div className="recycler-root">
      <header className="recycler-topbar">
        <div className="recycler-topbar-left">
          <button className="recycler-back" onClick={handleBack} aria-label="Back to Recycler Dashboard">
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
          <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 className="recycler-main-heading">Newly Recycled Items</h1>
              <p className="recycler-main-sub">
                All currently assigned, incomplete recycling tasks for your facility.
              </p>
            </div>
            <button className="recycler-btn-secondary" onClick={handleBack}>
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          </div>

          {errorMsg && (
            <div className="recycler-error-msg" style={{ marginBottom: 20 }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="recycler-empty-state">
              <Clock3 size={28} className="recycler-empty-icon" />
              <p>Loading assigned recycling tasks...</p>
            </div>
          ) : pendingTasks.length === 0 ? (
            <div className="recycler-empty-state">
              <Inbox size={32} className="recycler-empty-icon" />
              <p style={{ fontWeight: 600, margin: 0, color: "var(--ep-text)" }}>
                No new recycling tasks assigned.
              </p>
              <p style={{ fontSize: 13, margin: 0 }}>
                When municipal waste is assigned to you by the admin, it will appear here.
              </p>
            </div>
          ) : (
            <div className="recycler-tasks-grid">
              {pendingTasks.map((t) => (
                <div key={t.id} className="recycler-task-card">
                  <div>
                    <div className="recycler-task-card-header">
                      <h3 className="recycler-task-waste-type">{t.waste_type}</h3>
                      <span className="recycler-badge pending">Assigned</span>
                    </div>

                    <div className="recycler-task-body" style={{ marginTop: 12 }}>
                      <div className="recycler-task-row">
                        <span className="recycler-task-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Weight size={15} /> Quantity
                        </span>
                        <span className="recycler-task-value" style={{ color: "var(--ep-green-dark)", fontSize: 16 }}>
                          {parseFloat(t.total_quantity).toFixed(2)} kg
                        </span>
                      </div>

                      <div className="recycler-task-row">
                        <span className="recycler-task-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Calendar size={15} /> Assigned Date
                        </span>
                        <span className="recycler-task-value">{formatDate(t.date)}</span>
                      </div>

                      {t.assigned_by_name && (
                        <div className="recycler-task-row">
                          <span className="recycler-task-label">Assigned By</span>
                          <span className="recycler-task-value">{t.assigned_by_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    className="recycler-btn-primary"
                    onClick={() =>
                      navigate(`/recycler/task-completion/${t.id}`, {
                        state: { task: t },
                      })
                    }
                  >
                    Task Completion <ArrowRight size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => performLogout(navigate)}
      />
    </div>
  );
}
