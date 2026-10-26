
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import "../components/NotificationsPage.css";
import { getRoleDashboard, safeNavigateBack } from "../utils/navigation";
import {
  ArrowLeft,
  Bell,
  Truck,
  MessageSquareWarning,
  CheckCircle2,
  ClipboardList,
  Clock,
  Trash2,
  CheckCheck,
  RotateCw,
  Search,
  Radio,
  Sparkles,
  Volume2,
  VolumeX,
  ExternalLink,
  Activity,
} from "lucide-react";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("ALL"); // ALL | UNREAD | READ | PICKUP | COMPLAINT
  const [search, setSearch] = useState("");

  const {
    notifications,
    unreadCount,
    loading,
    soundEnabled,
    toggleSound,
    isPushSupported,
    isPushSubscribed,
    subscribeToPush,
    unsubscribeFromPush,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();

  const filteredList = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Status/category filter
      if (filter === "UNREAD" && n.is_read) return false;
      if (filter === "READ" && !n.is_read) return false;
      if (filter === "PICKUP" && !n.notification_type.includes("PICKUP") && !n.notification_type.includes("TASK")) {
        return false;
      }
      if (filter === "COMPLAINT" && !n.notification_type.includes("COMPLAINT")) {
        return false;
      }

      // 2. Search query filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = (n.title || "").toLowerCase().includes(q);
        const msgMatch = (n.message || "").toLowerCase().includes(q);
        if (!titleMatch && !msgMatch) return false;
      }

      return true;
    });
  }, [notifications, filter, search]);

  const getIconForType = (type) => {
    switch (type) {
      case "PICKUP_CREATED":
        return <Truck size={20} strokeWidth={2.2} />;
      case "TASK_ASSIGNED":
        return <ClipboardList size={20} strokeWidth={2.2} />;
      case "TASK_PENDING":
        return <Clock size={20} strokeWidth={2.2} />;
      case "TASK_COMPLETED":
        return <CheckCircle2 size={20} strokeWidth={2.2} />;
      case "COMPLAINT_CREATED":
      case "COMPLAINT_ASSIGNED":
      case "COMPLAINT_IN_PROGRESS":
        return <MessageSquareWarning size={20} strokeWidth={2.2} />;
      case "COMPLAINT_RESOLVED":
        return <CheckCircle2 size={20} strokeWidth={2.2} />;
      case "RECYCLER_ALERT":
        return <Sparkles size={20} strokeWidth={2.2} />;
      default:
        return <Bell size={20} strokeWidth={2.2} />;
    }
  };

  const handleActionClick = (n) => {
    if (!n.is_read) {
      markAsRead(n.id);
    }
    if (n.action_url && n.action_url.startsWith("/")) {
      navigate(n.action_url);
    }
  };

  return (
    <div className="ep-page-root">
      {/* Top Header */}
      <header className="ep-page-header">
        <div className="ep-page-header-inner">
          <button className="ep-page-back-btn" onClick={() => safeNavigateBack(navigate, getRoleDashboard())}>
            <ArrowLeft size={16} strokeWidth={2.2} />
            <span>Back to Dashboard</span>
          </button>

          <div
            className="ep-page-brand"
            onClick={() => navigate(getRoleDashboard())}
            style={{ cursor: "pointer" }}
            title="EcoPulse Dashboard"
          >
            <div className="ep-page-brand-icon">
              <Activity size={18} strokeWidth={2.5} />
            </div>
            <span>Eco<span className="ep-page-brand-accent">Pulse</span></span>
          </div>
        </div>
      </header>

      <main className="ep-page-main">
        {/* Hero Area */}
        <section className="ep-page-hero">
          <div className="ep-page-hero-text">
            <h1>Notification Center</h1>
            <p>
              Persistent records of all pickup dispatches, task assignments, and complaint resolutions.
            </p>
          </div>

          <div className="ep-page-hero-actions">
            <button
              className="ep-page-btn ep-page-btn-ghost"
              onClick={() => fetchNotifications(false)}
              title="Refresh Notifications"
            >
              <RotateCw size={15} strokeWidth={2.2} />
              <span>Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button
                className="ep-page-btn ep-page-btn-ghost"
                onClick={markAllAsRead}
              >
                <CheckCheck size={15} strokeWidth={2.2} />
                <span>Mark All Read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                className="ep-page-btn ep-page-btn-danger"
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete all notifications?")) {
                    clearAllNotifications();
                  }
                }}
              >
                <Trash2 size={15} strokeWidth={2.2} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </section>

        {/* Push & Sound Settings Banner */}
        <section className="ep-settings-card">
          <div className="ep-settings-info">
            <div className="ep-settings-icon">
              <Radio size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div className="ep-settings-title">Browser Push Notifications</div>
              <div className="ep-settings-desc">
                {isPushSubscribed
                  ? "Active — you will receive desktop and mobile alerts even when this tab is closed."
                  : "Enable to receive real-time collection updates when your browser is running in the background."}
              </div>
            </div>
          </div>

          <div className="ep-settings-actions">
            <button
              className="ep-page-btn ep-page-btn-ghost"
              onClick={toggleSound}
              title={soundEnabled ? "Mute notification chime" : "Enable notification chime"}
            >
              {soundEnabled ? (
                <>
                  <Volume2 size={16} strokeWidth={2.2} />
                  <span>Sound On</span>
                </>
              ) : (
                <>
                  <VolumeX size={16} strokeWidth={2.2} color="#9ca3af" />
                  <span>Sound Muted</span>
                </>
              )}
            </button>

            {isPushSupported && (
              <button
                className={`ep-push-toggle-btn ${isPushSubscribed ? "subscribed" : "unsubscribed"}`}
                onClick={isPushSubscribed ? unsubscribeFromPush : subscribeToPush}
              >
                {isPushSubscribed ? "Push Enabled (Turn Off)" : "Enable Push Alerts"}
              </button>
            )}
          </div>
        </section>

        {/* Filter and Search Bar */}
        <section className="ep-filter-bar">
          <div className="ep-search-wrap">
            <Search size={16} strokeWidth={2.2} className="ep-search-icon" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ep-search-input"
            />
          </div>

          <div className="ep-filter-group">
            <button
              className={`ep-filter-pill ${filter === "ALL" ? "active" : ""}`}
              onClick={() => setFilter("ALL")}
            >
              All ({notifications.length})
            </button>
            <button
              className={`ep-filter-pill ${filter === "UNREAD" ? "active" : ""}`}
              onClick={() => setFilter("UNREAD")}
            >
              Unread ({unreadCount})
            </button>
            <button
              className={`ep-filter-pill ${filter === "PICKUP" ? "active" : ""}`}
              onClick={() => setFilter("PICKUP")}
            >
              Pickups & Tasks
            </button>
            <button
              className={`ep-filter-pill ${filter === "COMPLAINT" ? "active" : ""}`}
              onClick={() => setFilter("COMPLAINT")}
            >
              Complaints
            </button>
          </div>
        </section>

        {/* Notification Cards List */}
        <section className="ep-cards-list">
          {filteredList.length === 0 ? (
            <div className="ep-page-empty">
              <div className="ep-page-empty-icon">
                <CheckCircle2 size={32} strokeWidth={2.2} />
              </div>
              <div className="ep-page-empty-title">
                {search ? "No matching notifications found" : "All caught up!"}
              </div>
              <p className="ep-page-empty-desc">
                {search
                  ? `No notifications found matching "${search}". Try clearing your search query.`
                  : "You have no notifications in this category. New updates will appear here automatically."}
              </p>
            </div>
          ) : (
            filteredList.map((n) => (
              <div key={n.id} className={`ep-card-item ${!n.is_read ? "unread" : ""}`}>
                <div className="ep-card-icon-box">{getIconForType(n.notification_type)}</div>

                <div className="ep-card-main">
                  <div className="ep-card-top">
                    <span className="ep-card-title">{n.title}</span>
                    <span className="ep-card-time">{n.time_ago || "Just now"}</span>
                  </div>

                  <div className="ep-card-desc">{n.message}</div>

                  <div className="ep-card-actions">
                    {n.action_url && n.action_url.startsWith("/") && (
                      <button
                        className="ep-card-action-btn"
                        onClick={() => handleActionClick(n)}
                      >
                        <span>View Details</span>
                        <ExternalLink size={13} strokeWidth={2.3} />
                      </button>
                    )}

                    {!n.is_read && (
                      <button
                        className="ep-card-mark-btn"
                        onClick={() => markAsRead(n.id)}
                      >
                        Mark as read
                      </button>
                    )}

                    <button
                      className="ep-card-del-btn"
                      onClick={() => deleteNotification(n.id)}
                      title="Delete permanently"
                      aria-label="Delete notification"
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
