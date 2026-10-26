import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import { performLogout, getUserName } from "../utils/auth";
import { BASE_URL as API_BASE_URL } from "../api/api";
import {
  LayoutDashboard,
  ClipboardList,
  Bell,
  UserCircle2,
  Building2,
  LogOut,
  CalendarDays,
  Truck,
  Trash2,
  CalendarClock,
  Recycle,
  CheckCircle2,
  ChevronRight,
  Activity,
  BarChart3,
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";
 
// Fill these in with the real URL / route for each page you've already
// designed. Anything left as "#" will just do nothing when clicked.
const LINKS = {
  dashboard: "/staff",
  myTasks: "/StaffTask",
  notifications: "/notifications",
  profile: "/profile",
  municipal: "#",
  logout: "#",
  calendar: "#",
  scheduled: "/StaffTask?tab=scheduled",
  mcf: "/staff/mcf",
  completed: "/StaffTask?tab=completed",
  analytics: "/staff/analytics",
};
 
const FONT_IMPORT_ID = "ecopulse-font-import";
 
function ensureFonts() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_IMPORT_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_IMPORT_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Inter:wght@400;500;600&display=swap";
  document.head.appendChild(link);
}
 
const COLORS = {
  bg: "#F2FBF5",
  surface: "#FFFFFF",
  border: "#DCEFE2",
  primary: "#1FA35A",
  primaryDark: "#137A41",
  primaryLight: "#E4F7EA",
  primarySoft: "#EFFBF2",
  teal: "#0E9488",
  text: "#0F241A",
  textMuted: "#5C7C6D",
  textFaint: "#8FA79B",
};
 
const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "myTasks", label: "My tasks", icon: ClipboardList },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "profile", label: "My profile", icon: UserCircle2 },
  { key: "municipal", label: "View municipal", icon: Building2 },
];
 
const getAccessToken = () => {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    ""
  );
};
 
function Sidebar({ onLogout }) {
  const navigate = useNavigate();
  const staffName = getUserName() || "Staff Member";
  const initial = staffName.charAt(0).toUpperCase() || "S";
  return (
    <aside
      style={{
        width: 236,
        minWidth: 236,
        background: COLORS.surface,
        borderRight: `1px solid ${COLORS.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); navigate("/staff"); }}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 24px", cursor: "pointer" }}
        title="EcoPulse Staff Dashboard"
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.teal})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Activity size={18} color="#fff" strokeWidth={2.5} />
        </div>
        <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 18, lineHeight: 1 }}>
          <span style={{ fontWeight: 700, color: COLORS.text }}>Eco</span>
          <span style={{ fontWeight: 600, color: COLORS.primary }}> Pulse</span>
        </div>
      </div>
 
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 8px",
          marginBottom: 20,
          borderTop: `1px solid ${COLORS.border}`,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: COLORS.primaryLight,
            color: COLORS.primaryDark,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {initial}
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: 13.5,
              color: COLORS.text,
            }}
          >
            {staffName}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: COLORS.textMuted }}>
            Field staff
          </div>
        </div>
      </div>
 
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.key}
              href={LINKS[item.key]}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "10px 12px",
                borderRadius: 9,
                background: "transparent",
                color: COLORS.textMuted,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: 13.5,
                cursor: "pointer",
                textDecoration: "none",
                transition: "background 0.15s ease, color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.primaryLight;
                e.currentTarget.style.color = COLORS.primaryDark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = COLORS.textMuted;
              }}
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </a>
          );
        })}
      </nav>
 
      <button
        type="button"
        onClick={onLogout}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "10px 12px",
          borderRadius: 9,
          background: "transparent",
          border: "none",
          width: "100%",
          textAlign: "left",
          color: "#C0524A",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          fontSize: 13.5,
          cursor: "pointer",
          textDecoration: "none",
          transition: "background 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#FCEEEC";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <LogOut size={17} strokeWidth={2} />
        Log out
      </button>
    </aside>
  );
}
 
function TopBar() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 22,
      }}
    >
      <h1
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 600,
          fontSize: 21,
          color: COLORS.text,
          margin: 0,
        }}
      >
        Dashboard
      </h1>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <NotificationBell />
        <a
          href={LINKS.calendar}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: 10,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.surface,
            color: COLORS.text,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: 13.5,
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          <CalendarDays size={16} />
          Calendar
        </a>
      </div>
    </div>
  );
}
 
function DashboardCard({ card }) {
  const Icon = card.icon;
  return (
    <a
      href={LINKS[card.key]}
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: "20px 20px",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        textDecoration: "none",
        transition: "border-color 0.15s ease, transform 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.primary)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.border)}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: COLORS.primarySoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={19} color={COLORS.primaryDark} strokeWidth={2} />
        </div>
        <ChevronRight size={17} color={COLORS.textFaint} />
      </div>
      <div>
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
            fontSize: 15.5,
            color: COLORS.text,
            marginBottom: 3,
          }}
        >
          {card.title}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: COLORS.textMuted }}>
          {card.subtitle}
        </div>
      </div>
      <div
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: 26,
          color: COLORS.primaryDark,
          minHeight: 32,
        }}
      >
        {card.count !== null && card.count !== undefined ? card.count : ""}
      </div>
    </a>
  );
}
 
function CollectionRouteBanner() {
  return (
    <div
      style={{
        marginTop: 24,
        background: `linear-gradient(90deg, ${COLORS.primarySoft}, ${COLORS.surface})`,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: "22px 28px 26px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 600,
          fontSize: 14,
          color: COLORS.text,
          marginBottom: 18,
        }}
      >
        Today's collection route
      </div>
 
      <div style={{ position: "relative", height: 64 }}>
        <svg width="100%" height="64" viewBox="0 0 900 64" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }}>
          <line
            x1="24"
            y1="46"
            x2="876"
            y2="46"
            stroke={COLORS.border}
            strokeWidth="3"
            strokeDasharray="2 10"
            strokeLinecap="round"
          />
        </svg>
 
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 20,
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: COLORS.primaryLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Building2 size={15} color={COLORS.primaryDark} />
        </div>
 
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 16,
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: COLORS.teal,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Trash2 size={18} color="#fff" />
        </div>
 
        <div className="ecopulse-van" style={{ position: "absolute", top: 8, left: 40 }}>
          <Truck size={30} color={COLORS.primary} strokeWidth={2} />
        </div>
      </div>
 
      <style>{`
        @keyframes ecopulse-drive {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(100% + 40px)); }
        }
        .ecopulse-van {
          animation: ecopulse-drive 7s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .ecopulse-van { animation: none; left: 50% !important; }
        }
      `}</style>
    </div>
  );
}
 
function DashboardPage({ counts }) {
  const cards = [
    {
      key: "myTasks",
      title: "My tasks",
      subtitle: "Assigned to you today",
      count: counts.myTasks,
      icon: ClipboardList,
    },
    {
      key: "scheduled",
      title: "Scheduled tasks",
      subtitle: "Upcoming collection rounds",
      count: counts.scheduled,
      icon: CalendarClock,
    },
    {
      key: "mcf",
      title: "MCF collection",
      subtitle: "Material collection facility",
      count: null, // No count or demo number displayed
      icon: Recycle,
    },
    {
      key: "completed",
      title: "Completed tasks",
      subtitle: "Closed out this week",
      count: counts.completed,
      icon: CheckCircle2,
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        {cards.map((card) => (
          <DashboardCard key={card.key} card={card} />
        ))}
      </div>
      <CollectionRouteBanner />
    </div>
  );
}
 
export default function EcoPulseDashboard() {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [counts, setCounts] = useState({
    myTasks: 0,
    scheduled: 0,
    completed: 0,
  });

  useEffect(() => {
    ensureFonts();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchStaffCounts = async () => {
      try {
        const token = getAccessToken();
        const config = token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : {};

        const res = await axios.get(
          `${API_BASE_URL}/api/waste/staff/my-tasks/`,
          config
        );

        const raw = res.data;
        const data = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.tasks)
          ? raw.tasks
          : Array.isArray(raw?.results)
          ? raw.results
          : Array.isArray(raw?.data)
          ? raw.data
          : [];

        // 1. My Tasks: Active tasks assigned to logged-in staff, excluding completed and cancelled
        const activeCount = data.filter((t) => {
          const s = String(t.status || "").trim().toUpperCase();
          return s !== "COMPLETED" && s !== "CANCELLED";
        }).length;

        // 2. Scheduled Tasks: Active scheduled tasks assigned to logged-in staff
        const scheduledCount = data.filter((t) => {
          const s = String(t.status || "").trim().toUpperCase();
          const hasScheduledDate = Boolean(
            t.scheduled_pickup_date || t.scheduledPickupDate
          );
          return hasScheduledDate && s !== "COMPLETED" && s !== "CANCELLED";
        }).length;

        // 4. Completed Tasks: Completed tasks assigned to logged-in staff
        const completedCount = data.filter((t) => {
          const s = String(t.status || "").trim().toUpperCase();
          return s === "COMPLETED";
        }).length;

        if (isMounted) {
          setCounts({
            myTasks: activeCount,
            scheduled: scheduledCount,
            completed: completedCount,
          });
        }
      } catch (err) {
        console.error("Failed to load staff dashboard counts:", err);
      }
    };

    fetchStaffCounts();
    return () => {
      isMounted = false;
    };
  }, []);
 
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: COLORS.bg,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Sidebar onLogout={() => setShowLogoutModal(true)} />
      <main style={{ flex: 1, padding: "26px 32px", boxSizing: "border-box" }}>
        <TopBar />
        <DashboardPage counts={counts} />
      </main>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => performLogout(navigate)}
      />
    </div>
  );
}