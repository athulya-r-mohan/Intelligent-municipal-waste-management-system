import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import "./NotificationBell.css";
import {
  Bell,
  Truck,
  MessageSquareWarning,
  CheckCircle2,
  ClipboardList,
  Clock,
  Trash2,
  Volume2,
  VolumeX,
  Radio,
  CheckCheck,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export default function NotificationBell({ className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState("all"); // "all" | "unread"
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    soundEnabled,
    toggleSound,
    isPushSupported,
    isPushSubscribed,
    pushPermission,
    subscribeToPush,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifications = notifications.filter((n) => {
    if (tab === "unread") return !n.is_read;
    return true;
  });

  const getIconForType = (type) => {
    switch (type) {
      case "PICKUP_CREATED":
        return <Truck size={17} strokeWidth={2.2} />;
      case "TASK_ASSIGNED":
        return <ClipboardList size={17} strokeWidth={2.2} />;
      case "TASK_PENDING":
        return <Clock size={17} strokeWidth={2.2} />;
      case "TASK_COMPLETED":
        return <CheckCircle2 size={17} strokeWidth={2.2} />;
      case "COMPLAINT_CREATED":
      case "COMPLAINT_ASSIGNED":
      case "COMPLAINT_IN_PROGRESS":
        return <MessageSquareWarning size={17} strokeWidth={2.2} />;
      case "COMPLAINT_RESOLVED":
        return <CheckCircle2 size={17} strokeWidth={2.2} />;
      case "RECYCLER_ALERT":
        return <Sparkles size={17} strokeWidth={2.2} />;
      default:
        return <Bell size={17} strokeWidth={2.2} />;
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.is_read) {
      markAsRead(n.id);
    }
    setIsOpen(false);
    if (n.action_url && n.action_url.startsWith("/")) {
      navigate(n.action_url);
    }
  };

  return (
    <div className={`ep-notif-container ${className}`} ref={dropdownRef}>
      <button
        className={`ep-notif-bell-btn ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="View notifications"
        title="Notifications"
      >
        <Bell size={19} strokeWidth={2.2} />
        {unreadCount > 0 && (
          <span className="ep-notif-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="ep-notif-dropdown">
          {/* Header */}
          <div className="ep-notif-header">
            <div className="ep-notif-header-title">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="ep-notif-header-count">{unreadCount} new</span>
              )}
            </div>

            <div className="ep-notif-header-actions">
              {/* Sound Toggle */}
              <button
                className="ep-notif-icon-btn"
                onClick={toggleSound}
                title={soundEnabled ? "Mute notification sound" : "Enable notification sound"}
                aria-label="Toggle sound"
              >
                {soundEnabled ? (
                  <Volume2 size={15} strokeWidth={2.2} />
                ) : (
                  <VolumeX size={15} strokeWidth={2.2} color="#9ca3af" />
                )}
              </button>

              {/* Mark All Read */}
              {unreadCount > 0 && (
                <button
                  className="ep-notif-icon-btn"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  aria-label="Mark all as read"
                >
                  <CheckCheck size={16} strokeWidth={2.2} />
                </button>
              )}
            </div>
          </div>

          {/* Push Banner (if supported and not yet subscribed) */}
          {isPushSupported && !isPushSubscribed && pushPermission !== "denied" && (
            <div className="ep-notif-push-banner">
              <div className="ep-notif-push-info">
                <Radio size={15} strokeWidth={2.3} />
                <span>Get background alerts</span>
              </div>
              <button
                className="ep-notif-push-btn"
                onClick={subscribeToPush}
              >
                Enable Push
              </button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="ep-notif-tabs">
            <button
              className={`ep-notif-tab ${tab === "all" ? "active" : ""}`}
              onClick={() => setTab("all")}
            >
              All ({notifications.length})
            </button>
            <button
              className={`ep-notif-tab ${tab === "unread" ? "active" : ""}`}
              onClick={() => setTab("unread")}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="ep-notif-list">
            {filteredNotifications.length === 0 ? (
              <div className="ep-notif-empty">
                <div className="ep-notif-empty-icon">
                  <CheckCircle2 size={22} strokeWidth={2.2} />
                </div>
                <div className="ep-notif-empty-text">
                  {tab === "unread" ? "No unread notifications" : "No notifications yet"}
                </div>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`ep-notif-item ${!n.is_read ? "unread" : ""}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="ep-notif-icon-wrap">{getIconForType(n.notification_type)}</div>
                  <div className="ep-notif-content">
                    <div className="ep-notif-title">{n.title}</div>
                    <div className="ep-notif-msg">{n.message}</div>
                    <div className="ep-notif-time">{n.time_ago || "Just now"}</div>
                  </div>
                  <button
                    className="ep-notif-del-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    title="Delete notification"
                    aria-label="Delete notification"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="ep-notif-footer">
            <button
              className="ep-notif-viewall-btn"
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
            >
              <span>View All</span>
              <ExternalLink size={13} strokeWidth={2.3} />
            </button>

            {notifications.length > 0 && (
              <button
                className="ep-notif-clear-btn"
                onClick={clearAllNotifications}
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
