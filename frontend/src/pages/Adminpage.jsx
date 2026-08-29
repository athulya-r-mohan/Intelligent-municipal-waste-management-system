import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import "../components/Adminpage.css";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  UserCircle2,
  Bell,
  LogOut,
  ArrowLeft,
  CalendarDays,
  Truck,
  MessageSquareWarning,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Factory,
  Recycle,
  UserPlus,
  Users,
  ShieldCheck,
  Activity,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";

/* ---------------------------------------------------------
   EcoPulse — Admin Console
   Palette:  --pulse-forest #1E6B4E, --pulse-leaf #3FA96B,
             --pulse-mint #EAF7EF, --pulse-mist #F6FBF8,
             --pulse-white #FFFFFF, --pulse-ink #1B2A22,
             --pulse-muted #6C8479
   Type: Poppins (display) + Inter (body)
   Signature: the logo's heartbeat/pulse waveform, echoed as a
   faint horizontal divider beneath the top bar.
   Styles live in EcoPulseAdmin.css (imported above).
---------------------------------------------------------- */

const DASH_CARDS = [
  { key: "pickup", title: "Waste Pickup Requests", sub: "Active resident requests", icon: Truck },
  { key: "complaints", title: "Complaints", sub: "Open citizen complaints", icon: MessageSquareWarning },
  { key: "rescheduled", title: "Rescheduled", sub: "Pending field tasks", icon: CalendarClock },
  { key: "completed", title: "Completed Tasks", sub: "Closed out this month", icon: CheckCircle2 },
  { key: "assigned", title: "Task Assigned", sub: "Currently with staff", icon: ClipboardList },
  { key: "payment", title: "Payment History", sub: "Recent transactions", icon: CreditCard },
  { key: "mcf", title: "MCF Collection", sub: "Material collection facility", icon: Factory },
  { key: "recycled", title: "Recycled Waste", sub: "Tonnage processed", icon: Recycle },
];

const MUNICIPALITY_CARDS = [
  { key: "addstaff", title: "Add Staff", sub: "Onboard a new team member", icon: UserPlus },
  { key: "addrecyclers", title: "Add Recyclers", sub: "Register a recycling partner", icon: Users },
  { key: "usermgmt", title: "User Management", sub: "Roles & access control", icon: ShieldCheck },
];

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

function Card({ title, sub, count, icon: Icon, onClick }) {
  return (
    <div
      className="admin-card"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.();
        }
      }}
      role={onClick ? "button" : undefined}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="admin-card-icon">
          <Icon size={22} strokeWidth={2} />
        </div>
        {count !== undefined && count !== null && (
          <span
            style={{
              fontSize: "17px",
              fontWeight: 700,
              fontFamily: "'Poppins', sans-serif",
              color: "var(--pulse-forest)",
              background: "var(--pulse-mint)",
              padding: "2px 10px",
              borderRadius: "10px",
              border: "1px solid var(--pulse-border)",
            }}
          >
            {count}
          </span>
        )}
      </div>

      <div className="admin-card-text">
        <h3>{title}</h3>
        <p>{sub}</p>
      </div>
    </div>
  );
}

export default function EcoPulseAdmin() {
  const [page, setPage] = useState("dashboard");
  const [stats, setStats] = useState({
    pending_count: 0,
    completed_count: 0,
    assigned_count: 0,
    total_requests: 0,
    complaints_count: 0,
  });

  const goHome = () => setPage("dashboard");
  const goBack = () => setPage("dashboard");
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/waste/dashboard-stats/`);
        if (isMounted && response.data?.stats) {
          setStats((prev) => ({ ...prev, ...response.data.stats }));
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      }

      try {
        const compRes = await axios.get(`${API_BASE_URL}/api/waste/admin/complaints/`);
        if (isMounted) {
          const compCount = compRes.data?.count ?? (Array.isArray(compRes.data) ? compRes.data.length : (compRes.data?.complaints?.length || 0));
          setStats((prev) => ({ ...prev, complaints_count: compCount }));
        }
      } catch (err) {
        console.error("Failed to fetch complaints count:", err);
      }
    };
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const heading = page === "dashboard" ? "Dashboard" : "Manage Municipality";
  const subheading =
    page === "dashboard"
      ? "Overview of today's waste management activity"
      : "Manage staff, recyclers, and platform users";

  const getCardCount = (key) => {
    if (key === "rescheduled") return stats.pending_count;
    if (key === "completed") return stats.completed_count;
    if (key === "assigned") return stats.assigned_count;
    if (key === "pickup") return stats.total_requests;
    if (key === "complaints") return stats.complaints_count;
    return null;
  };

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <Logo onClick={goHome} />
        <div className="admin-sidebar-role">Admin</div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = page === item.key;
            return (
              <button
                key={item.key}
                className={isActive ? "admin-nav-item active" : "admin-nav-item"}
                onClick={() => {
                  if (item.key === "municipality") setPage("municipality");
                  else if (item.key === "dashboard") setPage("dashboard");
                }}
              >
                <Icon size={17} strokeWidth={2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="admin-sidebar-spacer" />
        <button
          className="admin-logout"
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
        >
          <LogOut size={17} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <button className="admin-back-btn" onClick={goBack} disabled={page === "dashboard"}>
            <ArrowLeft size={15} strokeWidth={2.3} />
            Back
          </button>
          <DateBadge />
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

        <h1 className="admin-page-heading">{heading}</h1>
        <p className="admin-page-sub">{subheading}</p>

        {page === "dashboard" && (
          <div className="admin-grid">
            {DASH_CARDS.map((c) => (
              <Card
                key={c.key}
                title={c.title}
                sub={c.sub}
                count={getCardCount(c.key)}
                icon={c.icon}
                onClick={() => {
                  if (c.key === "pickup") {
                    navigate("/assign");
                  } else if (c.key === "complaints") {
                    navigate("/admincomplaints");
                  } else if (c.key === "rescheduled") {
                    navigate("/assign?status=STAFF_PENDING");
                  } else if (c.key === "completed") {
                    navigate("/assign?status=COMPLETED");
                  } else if (c.key === "assigned") {
                    navigate("/assign?status=ASSIGNED");
                  }
                }}
              />
            ))}
          </div>
        )}

        {page === "municipality" && (
          <div className="admin-grid admin-grid-3">
            {MUNICIPALITY_CARDS.map((c) => (
              <Card
                key={c.key}
                title={c.title}
                sub={c.sub}
                icon={c.icon}
                onClick={() => {
                  if (c.key === "addstaff") {
                    navigate("/addstaff");
                  }
                  if (c.key === "addrecyclers") {
                    navigate("/addrecycler");
                  }
                  if (c.key === "usermgmt") {
                    navigate("/resident");
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}