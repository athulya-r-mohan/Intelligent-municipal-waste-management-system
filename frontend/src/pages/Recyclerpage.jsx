import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../components/Recyclerpage.css";
import NotificationBell from "../components/NotificationBell";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import { performLogout } from "../utils/auth";
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
} from "lucide-react";


// ---------------------------------------------------------------------------
// EcoPulse — Recycler Dashboard
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "profile", label: "My Profile", icon: User },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "settings", label: "Settings", icon: Settings },
];

const CARDS = [
  {
    key: "newly",
    title: "Newly Recycled Items",
    value: "128",
    hint: "items logged this week",
    icon: Recycle,
  },
  {
    key: "completed",
    title: "Completed Recycling",
    value: "342",
    hint: "pickups fulfilled",
    icon: CheckCircle2,
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

function Card({ title, value, hint, icon: Icon }) {
  return (
    <div className="recycler-card">
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

export default function EcoPulseRecyclerDashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState("dashboard");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
          <p className="recycler-main-sub">Here's what's happening with your recycling activity.</p>
          <div className="recycler-grid">
            {CARDS.map((c) => (
              <Card key={c.key} {...c} />
            ))}
          </div>
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