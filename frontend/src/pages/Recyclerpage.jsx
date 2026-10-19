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
  Recycle,
  CheckCircle2,
  Clock3,
  Wallet,
  Activity,
  Calendar,
  Weight,
  FileText,
  AlertCircle,
  Inbox,
  ArrowRight,
  BarChart3,
} from "lucide-react";

// ---------------------------------------------------------------------------
// EcoPulse — Recycler Dashboard
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
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

function Card({ title, value, hint, icon: Icon, onClick }) {
  return (
    <div className="recycler-card" onClick={onClick}>
      <div className="recycler-card-icon">
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="recycler-card-body">
        <p className="recycler-card-title">{title}</p>
        <p className="recycler-card-value">{value}</p>
        <p className="recycler-card-hint">{hint}</p>
      </div>
    </div>
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

export default function EcoPulseRecyclerDashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState("dashboard");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedReportRecord, setSelectedReportRecord] = useState(null);

  const [pendingTasks, setPendingTasks] = useState([]);
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
        setPendingTasks(res.data.pending_tasks || []);
        setCompletedTasks(res.data.completed_tasks || []);
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
    if (window.history.length > 1) window.history.back();
    else navigate("/");
  };

  const handleHome = () => {
    window.location.href = "/";
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const cardsData = [
    {
      key: "newly",
      title: "Newly Recycled Items",
      value: loading ? "..." : String(pendingTasks.length),
      hint: "pending recycling tasks",
      icon: Recycle,
      onClick: () => navigate("/recycler/newly-recycled-items"),
    },
    {
      key: "completed",
      title: "Completed Recycling",
      value: loading ? "..." : String(completedTasks.length),
      hint: "recycling tasks fulfilled",
      icon: CheckCircle2,
      onClick: () => navigate("/recycler/completed-items"),
    },
    {
      key: "pending",
      title: "Pending Pickups",
      value: "6",
      hint: "awaiting collection",
      icon: Clock3,
    },
    {
      key: "payment",
      title: "Payment",
      value: "₹2,450",
      hint: "credited this month",
      icon: Wallet,
    },
  ];

  return (
    <div className="recycler-root">
      <header className="recycler-topbar">
        <div className="recycler-topbar-left">
          <button className="recycler-back" onClick={handleBack} aria-label="Go back">
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
          <Logo onClick={handleHome} />
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
                  if (key === "notifications") {
                    navigate("/notifications");
                  } else if (key === "analytics") {
                    navigate("/recycler/analytics");
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
          <h1 className="recycler-main-heading">Recycler Dashboard</h1>
          <p className="recycler-main-sub">
            Here's what's happening with your assigned recycling tasks and activity.
          </p>

          <div className="recycler-grid">
            {cardsData.map(({ key, ...cardProps }) => (
              <Card key={key} {...cardProps} />
            ))}
          </div>

          {errorMsg && (
            <div className="recycler-error-msg" style={{ marginTop: 20 }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
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