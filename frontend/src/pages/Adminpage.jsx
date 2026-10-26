import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { BASE_URL as API_BASE_URL } from "../api/api";
import "../components/Adminpage.css";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../components/NotificationBell";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import { performLogout } from "../utils/auth";
import { getFullImageUrl } from "../utils/imageUrl";
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
  Award,
  BarChart3,
  MapPin,
} from "lucide-react";

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
  { key: "payment", title: "Collection Payment", sub: "Fixed ₹50 fee management", icon: CreditCard },
  { key: "mcf", title: "MCF Collection", sub: "Material collection facility", icon: Factory },
  { key: "recycled", title: "Recycled Waste", sub: "Tonnage processed", icon: Recycle },
  { key: "rewards", title: "Reward Submissions", sub: "User reward submissions", icon: Award },
];

const MUNICIPALITY_CARDS = [
  { key: "addstaff", title: "Add Staff", sub: "Onboard a new team member", icon: UserPlus },
  { key: "addrecyclers", title: "Add Recyclers", sub: "Register a recycling partner", icon: Users },
  { key: "usermgmt", title: "User Management", sub: "Roles & access control", icon: ShieldCheck },
  { key: "managewards", title: "Manage Wards", sub: "Add and manage municipality wards", icon: MapPin },
];

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "municipality", label: "Manage Municipality", icon: Building2 },
  { key: "profile", label: "My Profile", icon: UserCircle2 },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
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

function Card({ title, sub, count, icon: Icon, onClick, children }) {
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
        {children}
      </div>
    </div>
  );
}

export default function EcoPulseAdmin() {
  const [page, setPage] = useState("dashboard");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [rewardSubmissions, setRewardSubmissions] = useState([]);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [selectedRewardPhoto, setSelectedRewardPhoto] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardFilter, setRewardFilter] = useState("All");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [showConfirmAssign, setShowConfirmAssign] = useState(false);

  const [stats, setStats] = useState({
    pending_count: 0,
    completed_count: 0,
    assigned_count: 0,
    total_requests: 0,
    complaints_count: 0,
    recycled_count: 0,
  });

  const goHome = () => setPage("dashboard");
  const goBack = () => setPage("dashboard");
  const navigate = useNavigate();

  const handleAssignReward = async () => {
    if (!selectedSubmission) return;
    setAssignError("");
    setAssignSuccess("");

    const valStr = String(rewardAmount).trim();
    if (!valStr) {
      setAssignError("Please enter reward points.");
      return;
    }
    if (valStr.includes(".")) {
      setAssignError("Reward points must be a whole number, not a decimal.");
      return;
    }
    const parsedPoints = parseInt(valStr, 10);
    if (isNaN(parsedPoints) || parsedPoints <= 0) {
      setAssignError("Please enter a valid reward points number greater than 0.");
      return;
    }
    if (parsedPoints % 5 !== 0) {
      setAssignError("Reward points must be a multiple of 5 (1 bottle = 5 points). E.g. 5, 10, 15, 20.");
      return;
    }

    setAssigning(true);
    try {
      const token = localStorage.getItem("access") || localStorage.getItem("access_token") || localStorage.getItem("token") || "";
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${API_BASE_URL}/api/waste/reward-submissions/${selectedSubmission.id}/assign-reward/`,
        { points: parsedPoints },
        { headers }
      );

      if (res.data && res.data.success && res.data.submission) {
        const updated = res.data.submission;
        setAssignSuccess(`Assigned ${parsedPoints} points (${Math.floor(parsedPoints / 5)} bottles, valid for 30 days) successfully!`);
        setSelectedSubmission(updated);
        setRewardSubmissions((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        setShowConfirmAssign(false);
        setRewardAmount("");
      } else {
        setAssignError(res.data?.error || "Failed to assign reward.");
      }
    } catch (err) {
      console.error("Assign reward error:", err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to assign reward. Please try again.";
      setAssignError(msg);
    } finally {
      setAssigning(false);
    }
  };

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

      try {
        const token = localStorage.getItem("access") || localStorage.getItem("access_token") || localStorage.getItem("token") || "";
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const rewRes = await axios.get(`${API_BASE_URL}/api/waste/reward-submissions/admin/`, { headers });
        if (isMounted && rewRes.data?.submissions) {
          setRewardSubmissions(rewRes.data.submissions);
        }
      } catch (err) {
        console.error("Failed to fetch reward submissions:", err);
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
    if (key === "recycled") return stats.recycled_count;
    if (key === "rewards") return rewardSubmissions.length;
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
                  else if (item.key === "notifications") navigate("/notifications");
                  else if (item.key === "analytics") navigate("/admin/analytics");
                  else if (item.key === "profile") navigate("/profile");
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
          onClick={() => setShowLogoutModal(true)}
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
                  } else if (c.key === "mcf") {
                    navigate("/admin/mcf");
                  } else if (c.key === "payment") {
                    navigate("/admin/payments");
                  } else if (c.key === "recycled") {
                    navigate("/admin/recycled-history");
                  } else if (c.key === "rewards") {
                    setShowRewardModal(true);
                  }
                }}
              >
                {c.key === "rewards" && (
                  <div
                    style={{ marginTop: "10px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRewardModal(true);
                    }}
                  >
                    {rewardSubmissions.length === 0 ? (
                      <div style={{ fontSize: "12.5px", color: "var(--pulse-muted)", fontStyle: "italic" }}>
                        No reward submissions yet.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {rewardSubmissions.slice(0, 3).map((sub, idx) => (
                            <img
                              key={sub.id || idx}
                              src={getFullImageUrl(sub.photo_url || sub.photo)}
                              alt={sub.user_name || "Submission"}
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "6px",
                                objectFit: "cover",
                                border: "1px solid var(--pulse-border)"
                              }}
                            />
                          ))}
                          <span style={{ fontSize: "11.5px", color: "var(--pulse-forest)", fontWeight: 600 }}>
                            View details &rarr;
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {page === "municipality" && (
          <div className="admin-grid">
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
                  if (c.key === "managewards") {
                    navigate("/admin/wards");
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => performLogout(navigate)}
      />

      {/* Reward Submissions Review Modal */}
      {showRewardModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(9, 26, 18, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => {
            setShowRewardModal(false);
            setSelectedSubmission(null);
            setAssignError("");
            setAssignSuccess("");
            setShowConfirmAssign(false);
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: selectedSubmission ? "900px" : "860px",
              maxHeight: "90vh",
              borderRadius: "20px",
              border: "1px solid var(--pulse-border)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              transition: "max-width 0.2s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--pulse-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(135deg, var(--pulse-mint) 0%, #fff 80%)",
              }}
            >
              {selectedSubmission ? (
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <button
                    onClick={() => {
                      setSelectedSubmission(null);
                      setAssignError("");
                      setAssignSuccess("");
                      setShowConfirmAssign(false);
                    }}
                    style={{
                      background: "#fff",
                      border: "1px solid var(--pulse-border)",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--pulse-ink)",
                      cursor: "pointer",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    }}
                  >
                    <ArrowLeft size={16} /> Back to Submissions
                  </button>
                  <div>
                    <h2 style={{ margin: "0 0 2px", fontSize: "18px", fontWeight: 700, color: "var(--pulse-ink)" }}>
                      Reward Submission #{selectedSubmission.id}
                    </h2>
                    <p style={{ margin: 0, fontSize: "12.5px", color: "var(--pulse-muted)" }}>
                      Review citizen activity and assign reward
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 700, color: "var(--pulse-ink)" }}>
                    Reward Submissions ({rewardSubmissions.length})
                  </h2>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--pulse-muted)" }}>
                    Review submitted citizen photos and verify reward eligibility
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setShowRewardModal(false);
                  setSelectedSubmission(null);
                  setAssignError("");
                  setAssignSuccess("");
                  setShowConfirmAssign(false);
                }}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "1px solid var(--pulse-border)",
                  background: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--pulse-muted)",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              {selectedSubmission ? (
                /* ============================================================
                   REWARD SUBMISSION DETAILS VIEW
                   ============================================================ */
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
                  {/* Left Column: Uploaded Photo Verification */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--pulse-ink)" }}>
                        Uploaded Verification Photo
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--pulse-muted)" }}>
                        Click image to inspect full size
                      </span>
                    </div>

                    <div
                      style={{
                        borderRadius: "14px",
                        overflow: "hidden",
                        border: "1px solid var(--pulse-border)",
                        background: "#f8fafc",
                        height: "340px",
                        cursor: "pointer",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                      }}
                      onClick={() => {
                        const fullImg = getFullImageUrl(selectedSubmission.photo_url || selectedSubmission.photo);
                        if (fullImg) setSelectedRewardPhoto(fullImg);
                      }}
                    >
                      {selectedSubmission.photo_url || selectedSubmission.photo ? (
                        <img
                          src={getFullImageUrl(selectedSubmission.photo_url || selectedSubmission.photo)}
                          alt={`Submission proof by ${selectedSubmission.user_name}`}
                          style={{ width: "100%", height: "100%", objectFit: "contain", background: "#f8fafc" }}
                        />
                      ) : (
                        <span style={{ color: "var(--pulse-muted)", fontSize: "13px" }}>No photo uploaded</span>
                      )}
                      <div
                        style={{
                          position: "absolute",
                          bottom: "12px",
                          right: "12px",
                          background: "rgba(14, 36, 25, 0.75)",
                          color: "#fff",
                          padding: "5px 12px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: 600,
                          pointerEvents: "none",
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        🔍 Click to enlarge
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Complete Submission Info & Reward Assignment */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    {/* Submission Information Card */}
                    <div
                      style={{
                        background: "#fcfdfc",
                        border: "1px solid var(--pulse-border)",
                        borderRadius: "14px",
                        padding: "18px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <h3 style={{ margin: "0 0 2px", fontSize: "16px", fontWeight: 700, color: "var(--pulse-ink)" }}>
                            {selectedSubmission.user_name || "Citizen"}
                          </h3>
                          <span style={{ fontSize: "13px", color: "var(--pulse-muted)" }}>
                            {selectedSubmission.user_email || "No email available"}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            padding: "4px 10px",
                            borderRadius: "999px",
                            background: selectedSubmission.status === "Reward Assigned" ? "var(--pulse-mint)" : "#fef3c7",
                            color: selectedSubmission.status === "Reward Assigned" ? "var(--pulse-forest)" : "#92400e",
                            border: `1px solid ${selectedSubmission.status === "Reward Assigned" ? "var(--pulse-border)" : "#fde68a"}`,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {selectedSubmission.status === "Reward Assigned" && <CheckCircle2 size={13} />}
                          {selectedSubmission.status || "Pending"}
                        </span>
                      </div>

                      <div
                        style={{
                          borderTop: "1px solid var(--pulse-border)",
                          paddingTop: "12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          fontSize: "13px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--pulse-muted)", fontWeight: 500 }}>Activity Date:</span>
                          <span style={{ fontWeight: 600, color: "var(--pulse-ink)" }}>
                            {selectedSubmission.date || "N/A"}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                          <span style={{ color: "var(--pulse-muted)", fontWeight: 500 }}>Bin Location:</span>
                          <span style={{ fontWeight: 600, textAlign: "right", color: "var(--pulse-ink)" }}>
                            {selectedSubmission.bin_location || "N/A"}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--pulse-muted)", fontWeight: 500 }}>Type of Waste:</span>
                          <span style={{ fontWeight: 600, color: "var(--pulse-forest)" }}>
                            {selectedSubmission.waste_type || "N/A"}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--pulse-muted)", fontWeight: 500 }}>
                            {selectedSubmission.waste_type === "Plastic Bottles" ? "Bottle Count:" : "Estimated Quantity:"}
                          </span>
                          <span style={{ fontWeight: 700, color: "var(--pulse-ink)" }}>
                            {selectedSubmission.estimated_quantity !== null && selectedSubmission.estimated_quantity !== undefined
                              ? selectedSubmission.waste_type === "Plastic Bottles"
                                ? `${Math.floor(Number(selectedSubmission.estimated_quantity))} bottles`
                                : `${selectedSubmission.estimated_quantity} kg`
                              : "N/A"}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--pulse-muted)", fontWeight: 500 }}>Submitted At:</span>
                          <span style={{ fontSize: "12px", color: "var(--pulse-muted)" }}>
                            {selectedSubmission.created_at_formatted || (selectedSubmission.created_at ? new Date(selectedSubmission.created_at).toLocaleString() : "N/A")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reward Assignment Section */}
                    {Boolean(
                      selectedSubmission.points ||
                      selectedSubmission.status === "Active" ||
                      selectedSubmission.status === "Reward Assigned" ||
                      selectedSubmission.status === "Claimed" ||
                      selectedSubmission.status === "Expired"
                    ) ? (
                      /* Reward Already Assigned */
                      <div
                        style={{
                          background: selectedSubmission.computed_status === "Claimed" || selectedSubmission.status === "Claimed"
                            ? "linear-gradient(135deg, #ecfdf5 0%, #fff 100%)"
                            : selectedSubmission.computed_status === "Expired" || selectedSubmission.status === "Expired"
                            ? "linear-gradient(135deg, #fef2f2 0%, #fff 100%)"
                            : "linear-gradient(135deg, var(--pulse-mint) 0%, #fff 100%)",
                          border: `1.5px solid ${
                            selectedSubmission.computed_status === "Claimed" || selectedSubmission.status === "Claimed"
                              ? "#a7f3d0"
                              : selectedSubmission.computed_status === "Expired" || selectedSubmission.status === "Expired"
                              ? "#fecaca"
                              : "var(--pulse-border)"
                          }`,
                          borderRadius: "14px",
                          padding: "18px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: selectedSubmission.computed_status === "Claimed" || selectedSubmission.status === "Claimed"
                                  ? "#059669"
                                  : "var(--pulse-forest)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                              }}
                            >
                              <Award size={18} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--pulse-ink)" }}>
                                Reward Assigned
                              </div>
                              <div style={{ fontSize: "12px", color: "var(--pulse-muted)" }}>
                                {selectedSubmission.points || selectedSubmission.reward_amount} Points ({selectedSubmission.bottle_count || Math.floor((selectedSubmission.points || selectedSubmission.reward_amount || 0) / 5)} Bottles)
                              </div>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "3px 10px",
                              borderRadius: "999px",
                              background: (selectedSubmission.computed_status === "Claimed" || selectedSubmission.status === "Claimed")
                                ? "#ecfdf5"
                                : (selectedSubmission.computed_status === "Expired" || selectedSubmission.status === "Expired")
                                ? "#fef2f2"
                                : "var(--pulse-mint)",
                              color: (selectedSubmission.computed_status === "Claimed" || selectedSubmission.status === "Claimed")
                                ? "#065f46"
                                : (selectedSubmission.computed_status === "Expired" || selectedSubmission.status === "Expired")
                                ? "#991b1b"
                                : "var(--pulse-forest)",
                              border: `1px solid ${
                                (selectedSubmission.computed_status === "Claimed" || selectedSubmission.status === "Claimed")
                                  ? "#a7f3d0"
                                  : (selectedSubmission.computed_status === "Expired" || selectedSubmission.status === "Expired")
                                  ? "#fecaca"
                                  : "var(--pulse-border)"
                              }`,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {(selectedSubmission.computed_status === "Claimed" || selectedSubmission.status === "Claimed") && <CheckCircle2 size={11} />}
                            {selectedSubmission.computed_status || selectedSubmission.status}
                          </span>
                        </div>

                        <div
                          style={{
                            background: "#fff",
                            border: "1px solid var(--pulse-border)",
                            borderRadius: "10px",
                            padding: "12px 14px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            fontSize: "13px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--pulse-muted)" }}>Reward Points:</span>
                            <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--pulse-forest)" }}>
                              {selectedSubmission.points || selectedSubmission.reward_amount} Points
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--pulse-muted)" }}>Bottles Equivalent:</span>
                            <span style={{ fontWeight: 700, color: "var(--pulse-ink)" }}>
                              🍼 {selectedSubmission.bottle_count || Math.floor((selectedSubmission.points || selectedSubmission.reward_amount || 0) / 5)} Bottles
                            </span>
                          </div>
                          {selectedSubmission.valid_from_formatted && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--pulse-muted)" }}>Valid From:</span>
                              <span style={{ fontWeight: 500, color: "var(--pulse-ink)", fontSize: "12px" }}>
                                {selectedSubmission.valid_from_formatted}
                              </span>
                            </div>
                          )}
                          {selectedSubmission.valid_till_formatted && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--pulse-muted)" }}>Valid Till (30 Days):</span>
                              <span style={{ fontWeight: 600, color: "var(--pulse-ink)", fontSize: "12px" }}>
                                {selectedSubmission.valid_till_formatted}
                              </span>
                            </div>
                          )}
                          {(selectedSubmission.claimed_at_formatted || selectedSubmission.claimed_at) && (
                            <div style={{ display: "flex", justifyContent: "space-between", background: "#ecfdf5", padding: "6px 8px", borderRadius: "6px" }}>
                              <span style={{ color: "#065f46", fontWeight: 600 }}>Claimed On:</span>
                              <span style={{ fontWeight: 700, color: "#065f46", fontSize: "12.5px" }}>
                                {selectedSubmission.claimed_at_formatted || new Date(selectedSubmission.claimed_at).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {selectedSubmission.reward_assigned_by_name && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--pulse-muted)" }}>Assigned By:</span>
                              <span style={{ fontWeight: 600, color: "var(--pulse-ink)", fontSize: "12px" }}>
                                {selectedSubmission.reward_assigned_by_name}
                              </span>
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: "11.5px", color: "var(--pulse-muted)", fontStyle: "italic" }}>
                          Reward assignment is locked and cannot be assigned multiple times.
                        </span>
                      </div>
                    ) : (
                      /* Assign Reward Form */
                      <div
                        style={{
                          background: "#fff",
                          border: "1.5px solid var(--pulse-border)",
                          borderRadius: "14px",
                          padding: "18px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                        }}
                      >
                        <div>
                          <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "var(--pulse-ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                            <Award size={18} color="var(--pulse-forest)" />
                            Assign Reward Points
                          </h4>
                          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--pulse-muted)" }}>
                            Assign reward points to this citizen (1 bottle = 5 points). Valid for 30 days.
                          </p>
                        </div>

                        {assignError && (
                          <div
                            style={{
                              background: "#fef2f2",
                              border: "1px solid #fecaca",
                              color: "#991b1b",
                              borderRadius: "10px",
                              padding: "10px 14px",
                              fontSize: "12.5px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span>⚠️ {assignError}</span>
                          </div>
                        )}

                        {assignSuccess && (
                          <div
                            style={{
                              background: "#ecfdf5",
                              border: "1px solid #a7f3d0",
                              color: "#065f46",
                              borderRadius: "10px",
                              padding: "10px 14px",
                              fontSize: "12.5px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span>✓ {assignSuccess}</span>
                          </div>
                        )}

                        <div>
                          <label
                            htmlFor="admin-reward-input"
                            style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--pulse-ink)", marginBottom: "6px" }}
                          >
                            Reward Points (1 bottle = 5 points) <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                            <input
                              id="admin-reward-input"
                              type="number"
                              min="5"
                              step="5"
                              placeholder="e.g. 10"
                              value={rewardAmount}
                              onChange={(e) => {
                                setRewardAmount(e.target.value);
                                setAssignError("");
                              }}
                              disabled={assigning}
                              style={{
                                width: "100%",
                                padding: "10px 14px",
                                borderRadius: "10px",
                                border: "1.5px solid var(--pulse-border)",
                                fontSize: "14px",
                                outline: "none",
                                boxSizing: "border-box",
                              }}
                            />
                          </div>

                          {/* Live Bottle Calculation Preview */}
                          {rewardAmount && !isNaN(parseInt(rewardAmount, 10)) && parseInt(rewardAmount, 10) > 0 && (
                            <div
                              style={{
                                marginTop: "8px",
                                padding: "8px 12px",
                                background: "var(--pulse-mint)",
                                border: "1px solid var(--pulse-border)",
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                fontSize: "12.5px",
                              }}
                            >
                              <span style={{ fontWeight: 600, color: "var(--pulse-forest)" }}>
                                🍼 {Math.floor(parseInt(rewardAmount, 10) / 5)} Bottle{Math.floor(parseInt(rewardAmount, 10) / 5) === 1 ? "" : "s"}
                              </span>
                              <span style={{ fontSize: "11.5px", color: parseInt(rewardAmount, 10) % 5 === 0 ? "var(--pulse-forest)" : "#dc2626", fontWeight: 600 }}>
                                {parseInt(rewardAmount, 10) % 5 === 0 ? "✓ 5-pt rule met" : "⚠️ Must be multiple of 5"}
                              </span>
                            </div>
                          )}

                          <div style={{ fontSize: "11.5px", color: "var(--pulse-muted)", marginTop: "6px" }}>
                            Rule: 1 bottle = 5 points (e.g. 5, 10, 15, 20) · Automatically valid for 30 days.
                          </div>
                        </div>

                        {showConfirmAssign ? (
                          /* Confirmation Box */
                          <div
                            style={{
                              background: "var(--pulse-mint)",
                              border: "1px solid var(--pulse-border)",
                              borderRadius: "10px",
                              padding: "14px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                            }}
                          >
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--pulse-ink)" }}>
                              Are you sure you want to assign {rewardAmount} points ({Math.floor(parseInt(rewardAmount, 10) / 5)} bottles, valid for 30 days) to {selectedSubmission.user_name}?
                            </span>
                            <div style={{ display: "flex", gap: "10px" }}>
                              <button
                                type="button"
                                onClick={() => setShowConfirmAssign(false)}
                                disabled={assigning}
                                style={{
                                  flex: 1,
                                  padding: "9px 14px",
                                  background: "#fff",
                                  border: "1px solid var(--pulse-border)",
                                  borderRadius: "8px",
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: "var(--pulse-ink)",
                                  cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleAssignReward}
                                disabled={assigning}
                                style={{
                                  flex: 1,
                                  padding: "9px 14px",
                                  background: "var(--pulse-forest)",
                                  border: "none",
                                  borderRadius: "8px",
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: "#fff",
                                  cursor: assigning ? "not-allowed" : "pointer",
                                  opacity: assigning ? 0.7 : 1,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "6px",
                                }}
                              >
                                {assigning ? "Assigning..." : "Confirm Assignment"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAssignError("");
                              const parsedPoints = parseInt(rewardAmount, 10);
                              if (!rewardAmount || isNaN(parsedPoints) || parsedPoints <= 0) {
                                setAssignError("Please enter a valid reward points value greater than 0.");
                                return;
                              }
                              if (String(rewardAmount).includes(".")) {
                                setAssignError("Reward points must be an integer, not a decimal value.");
                                return;
                              }
                              if (parsedPoints % 5 !== 0) {
                                setAssignError("Reward points must be a multiple of 5 (1 bottle = 5 points).");
                                return;
                              }
                              setShowConfirmAssign(true);
                            }}
                            disabled={assigning}
                            style={{
                              width: "100%",
                              padding: "11px 18px",
                              background: "var(--pulse-forest)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "10px",
                              fontSize: "14px",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              boxShadow: "0 4px 12px rgba(30,107,78,0.25)",
                              transition: "background 0.15s ease",
                            }}
                          >
                            <Award size={16} />
                            Assign Reward
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ============================================================
                   REWARD SUBMISSIONS LIST VIEW
                   ============================================================ */
                <div>
                  {/* Status Filter Tabs */}
                  <div style={{ display: "flex", gap: "8px", marginBottom: "18px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--pulse-muted)", marginRight: "4px" }}>
                      Filter:
                    </span>
                    {["All", "Pending", "Active", "Claimed", "Expired"].map((tab) => {
                      const count = rewardSubmissions.filter((s) => {
                        const st = s.computed_status || s.status || "Pending";
                        if (tab === "All") return true;
                        if (tab === "Pending") return st === "Pending";
                        if (tab === "Active") return st === "Active" || st === "Reward Assigned";
                        if (tab === "Claimed") return st === "Claimed";
                        if (tab === "Expired") return st === "Expired";
                        return true;
                      }).length;

                      const isSel = rewardFilter === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setRewardFilter(tab)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: 600,
                            border: `1px solid ${isSel ? "var(--pulse-forest)" : "var(--pulse-border)"}`,
                            background: isSel ? "var(--pulse-forest)" : "#fff",
                            color: isSel ? "#fff" : "var(--pulse-ink)",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            boxShadow: isSel ? "0 2px 6px rgba(30,107,78,0.2)" : "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {tab}
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "1px 6px",
                              borderRadius: "10px",
                              background: isSel ? "rgba(255,255,255,0.25)" : "var(--pulse-mint)",
                              color: isSel ? "#fff" : "var(--pulse-forest)",
                              fontWeight: 700,
                            }}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {rewardSubmissions.filter((item) => {
                    const st = item.computed_status || item.status || "Pending";
                    if (rewardFilter === "All") return true;
                    if (rewardFilter === "Pending") return st === "Pending";
                    if (rewardFilter === "Active") return st === "Active" || st === "Reward Assigned";
                    if (rewardFilter === "Claimed") return st === "Claimed";
                    if (rewardFilter === "Expired") return st === "Expired";
                    return true;
                  }).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--pulse-muted)" }}>
                      <Award size={48} style={{ opacity: 0.35, marginBottom: "12px" }} />
                      <p style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
                        No {rewardFilter !== "All" ? rewardFilter.toLowerCase() : ""} reward submissions found.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "18px" }}>
                      {rewardSubmissions
                        .filter((item) => {
                          const st = item.computed_status || item.status || "Pending";
                          if (rewardFilter === "All") return true;
                          if (rewardFilter === "Pending") return st === "Pending";
                          if (rewardFilter === "Active") return st === "Active" || st === "Reward Assigned";
                          if (rewardFilter === "Claimed") return st === "Claimed";
                          if (rewardFilter === "Expired") return st === "Expired";
                          return true;
                        })
                        .map((item) => {
                          const imgUrl = getFullImageUrl(item.photo_url || item.photo);
                          const currentStatus = item.computed_status || item.status || "Pending";
                          const isAssigned = Boolean(item.points || currentStatus === "Active" || currentStatus === "Reward Assigned" || currentStatus === "Claimed" || currentStatus === "Expired");
                          const isClaimed = currentStatus === "Claimed";
                          const isExpired = currentStatus === "Expired";
                          const isActive = currentStatus === "Active" || currentStatus === "Reward Assigned";

                          return (
                            <div
                              key={item.id}
                              style={{
                                background: "#fff",
                                border: "1px solid var(--pulse-border)",
                                borderRadius: "14px",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                                transition: "transform 0.18s ease, box-shadow 0.18s ease",
                              }}
                            >
                              <div
                                style={{
                                  height: "170px",
                                  background: "#f0fdf4",
                                  cursor: "pointer",
                                  overflow: "hidden",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  position: "relative",
                                }}
                                onClick={() => setSelectedRewardPhoto(imgUrl)}
                              >
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt={`Submission by ${item.user_name}`}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  />
                                ) : (
                                  <span style={{ color: "var(--pulse-muted)", fontSize: "12px" }}>No photo</span>
                                )}
                                <div
                                  style={{
                                    position: "absolute",
                                    bottom: "8px",
                                    right: "8px",
                                    background: "rgba(0,0,0,0.6)",
                                    color: "#fff",
                                    padding: "3px 8px",
                                    borderRadius: "6px",
                                    fontSize: "11px",
                                    fontWeight: 500,
                                  }}
                                >
                                  🔍 Enlarge
                                </div>
                              </div>

                              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--pulse-ink)" }}>
                                    {item.user_name || "Citizen"}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      padding: "2px 8px",
                                      borderRadius: "999px",
                                      background: isClaimed
                                        ? "#ecfdf5"
                                        : isExpired
                                        ? "#fef2f2"
                                        : isActive
                                        ? "var(--pulse-mint)"
                                        : "#fef3c7",
                                      color: isClaimed
                                        ? "#065f46"
                                        : isExpired
                                        ? "#991b1b"
                                        : isActive
                                        ? "var(--pulse-forest)"
                                        : "#92400e",
                                      border: `1px solid ${
                                        isClaimed
                                          ? "#a7f3d0"
                                          : isExpired
                                          ? "#fecaca"
                                          : isActive
                                          ? "var(--pulse-border)"
                                          : "#fde68a"
                                      }`,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "3px",
                                    }}
                                  >
                                    {isClaimed && <CheckCircle2 size={11} />}
                                    {currentStatus}
                                  </span>
                                </div>

                                <span style={{ fontSize: "12.5px", color: "var(--pulse-muted)", wordBreak: "break-all" }}>
                                  {item.user_email || "No email"}
                                </span>

                                {isAssigned && (
                                  <div
                                    style={{
                                      background: isClaimed ? "#ecfdf5" : "var(--pulse-mint)",
                                      border: `1px solid ${isClaimed ? "#a7f3d0" : "var(--pulse-border)"}`,
                                      borderRadius: "8px",
                                      padding: "6px 10px",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "3px",
                                      fontSize: "12px",
                                      marginTop: "3px",
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <span style={{ fontWeight: 600, color: isClaimed ? "#065f46" : "var(--pulse-forest)" }}>
                                        {item.points || item.reward_amount} Points
                                      </span>
                                      <span style={{ fontWeight: 700, color: "var(--pulse-ink)" }}>
                                        🍼 {item.bottle_count || Math.floor((item.points || item.reward_amount || 0) / 5)} Bottles
                                      </span>
                                    </div>
                                    {item.valid_till_formatted && (
                                      <div style={{ fontSize: "11px", color: "var(--pulse-muted)", display: "flex", justifyContent: "space-between" }}>
                                        <span>Valid Till:</span>
                                        <span>{item.valid_till_formatted.split(" ")[0]}</span>
                                      </div>
                                    )}
                                    {isClaimed && (
                                      <div style={{ fontSize: "11px", color: "#065f46", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
                                        <span>Claimed On:</span>
                                        <span>{item.claimed_at_formatted ? item.claimed_at_formatted.split(" ")[0] : "Claimed"}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div
                                  style={{
                                    marginTop: "4px",
                                    paddingTop: "8px",
                                    borderTop: "1px dashed var(--pulse-border)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "4px",
                                    fontSize: "12px",
                                    color: "var(--pulse-ink)",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "var(--pulse-muted)", fontWeight: 500 }}>Date:</span>
                                    <span style={{ fontWeight: 600 }}>{item.date || "N/A"}</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                                    <span style={{ color: "var(--pulse-muted)", fontWeight: 500 }}>Location:</span>
                                    <span style={{ fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>
                                      {item.bin_location || "N/A"}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "var(--pulse-muted)", fontWeight: 500 }}>Waste Type:</span>
                                    <span style={{ fontWeight: 600, color: "var(--pulse-forest)" }}>
                                      {item.waste_type || "N/A"}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "var(--pulse-muted)", fontWeight: 500 }}>
                                      {item.waste_type === "Plastic Bottles" ? "Bottle Count:" : "Quantity:"}
                                    </span>
                                    <span style={{ fontWeight: 700, color: "var(--pulse-ink)" }}>
                                      {item.estimated_quantity !== null && item.estimated_quantity !== undefined
                                        ? item.waste_type === "Plastic Bottles"
                                          ? `${Math.floor(Number(item.estimated_quantity))} bottles`
                                          : `${item.estimated_quantity} kg`
                                        : "N/A"}
                                    </span>
                                  </div>
                                </div>

                                <span style={{ fontSize: "11px", color: "var(--pulse-muted)", marginTop: "2px" }}>
                                  Submitted: {item.created_at_formatted || (item.created_at ? new Date(item.created_at).toLocaleString() : "")}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSubmission(item);
                                    setRewardAmount("");
                                    setAssignError("");
                                    setAssignSuccess("");
                                    setShowConfirmAssign(false);
                                  }}
                                  style={{
                                    marginTop: "8px",
                                    width: "100%",
                                    padding: "8px 12px",
                                    background: isAssigned ? "var(--pulse-mint)" : "var(--pulse-forest)",
                                    color: isAssigned ? "var(--pulse-forest)" : "#fff",
                                    border: isAssigned ? "1px solid var(--pulse-border)" : "none",
                                    borderRadius: "8px",
                                    fontWeight: 600,
                                    fontSize: "12.5px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  View Details &rarr;
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for Enlarged Photo */}
      {selectedRewardPhoto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedRewardPhoto(null)}
        >
          <div style={{ maxWidth: "90vw", maxHeight: "90vh", position: "relative" }}>
            <img
              src={selectedRewardPhoto}
              alt="Enlarged preview"
              style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: "12px", display: "block" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}