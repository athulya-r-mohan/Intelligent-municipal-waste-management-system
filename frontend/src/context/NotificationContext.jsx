import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { playNotificationSound, unlockAudio } from "../utils/sound";
import { getAccessToken, getUserRole } from "../utils/auth";
import { BellRing, X } from "lucide-react";
import { API_BASE_URL } from "../api/api";


const NotificationContext = createContext(null);

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const getAuthHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushPermission, setPushPermission] = useState("default");
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("ecopulse_sound_enabled") !== "false";
  });
  const [rolePromptDismissed, setRolePromptDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("ecopulse_push_prompt_dismissed") === "true";
    } catch (e) {
      return false;
    }
  });

  const knownIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);
  const pollingTimerRef = useRef(null);

  // Check Web Push support in browser
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsPushSupported(true);
      if (typeof Notification !== "undefined") {
        setPushPermission(Notification.permission);
      }
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("ecopulse_sound_enabled", String(next));
      return next;
    });
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/notifications/unread-count/`, { headers });
      if (res.data && typeof res.data.unread_count === "number") {
        setUnreadCount(res.data.unread_count);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        if (pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }
        setUnreadCount(0);
      }
    }
  }, []);

  // Fetch full notification list
  const fetchNotifications = useCallback(async (quiet = false) => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (!quiet) setLoading(true);

    try {
      const res = await axios.get(`${API_BASE_URL}/notifications/`, { headers });
      if (res.data && res.data.success) {
        const fetched = res.data.notifications || [];
        setNotifications(fetched);
        setUnreadCount(res.data.unread_count || 0);

        // Check for genuinely new incoming notifications
        let hasNewNotification = false;
        fetched.forEach((n) => {
          if (!knownIdsRef.current.has(n.id)) {
            knownIdsRef.current.add(n.id);
            if (initialLoadDoneRef.current && !n.is_read) {
              hasNewNotification = true;
            }
          }
        });

        // Play chime only if genuine new notification arrived while application was already open
        if (hasNewNotification && soundEnabled) {
          playNotificationSound();
        }

        initialLoadDoneRef.current = true;
      }
    } catch (err) {
      if (err.response?.status === 401) {
        if (pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }
        setNotifications([]);
        setUnreadCount(0);
      } else {
        console.warn("Notification fetch error:", err.message);
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [soundEnabled]);

  // Check push subscription status from backend
  const checkPushSubscription = useCallback(async () => {
    if (!isPushSupported) return;
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/notifications/subscription-status/`, { headers });
      if (res.data && res.data.is_subscribed) {
        setIsPushSubscribed(true);
      } else {
        setIsPushSubscribed(false);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setIsPushSubscribed(false);
      }
    }
  }, [isPushSupported]);

  // Automatically re-sync existing browser push subscription for authenticated user
  const syncPushSubscriptionIfGranted = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    const token = getAccessToken();
    if (!token) return;

    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      if (typeof Notification !== "undefined") {
        setPushPermission(Notification.permission);
      }
      return;
    }

    setPushPermission("granted");

    try {
      const headers = getAuthHeaders();
      if (!headers.Authorization) return;

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      // If browser already granted permission but no PushSubscription object exists yet
      if (!subscription) {
        const keyRes = await axios.get(`${API_BASE_URL}/notifications/vapid-public-key/`);
        const vapidPublicKey = keyRes.data?.public_key;
        if (vapidPublicKey) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }
      }

      if (subscription) {
        const subData = subscription.toJSON();
        await axios.post(
          `${API_BASE_URL}/notifications/subscribe/`,
          {
            endpoint: subData.endpoint,
            keys: subData.keys,
            user_agent: navigator.userAgent,
          },
          { headers }
        );
        setIsPushSubscribed(true);
      }
    } catch (err) {
      console.warn("Background push auto-sync failed:", err?.message || err);
    }
  }, []);

  // Subscribe to push notifications (explicit user gesture)
  const subscribeToPush = useCallback(async () => {
    if (!isPushSupported) {
      alert("Browser push notifications are not supported in this browser.");
      return false;
    }

    unlockAudio();

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== "granted") {
        return false;
      }

      // Get VAPID public key
      const keyRes = await axios.get(`${API_BASE_URL}/notifications/vapid-public-key/`);
      const vapidPublicKey = keyRes.data?.public_key;
      if (!vapidPublicKey) {
        throw new Error("VAPID public key unavailable.");
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const subData = subscription.toJSON();
      const headers = getAuthHeaders();

      await axios.post(
        `${API_BASE_URL}/notifications/subscribe/`,
        {
          endpoint: subData.endpoint,
          keys: subData.keys,
          user_agent: navigator.userAgent,
        },
        { headers }
      );

      setIsPushSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      alert(`Could not enable browser push notifications: ${err.message}`);
      return false;
    }
  }, [isPushSupported]);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async () => {
    try {
      if (isPushSupported && "serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      const headers = getAuthHeaders();
      await axios.post(`${API_BASE_URL}/notifications/unsubscribe/`, {}, { headers });
      setIsPushSubscribed(false);
      return true;
    } catch (err) {
      console.error("Error unsubscribing from push:", err);
      return false;
    }
  }, [isPushSupported]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await axios.patch(`${API_BASE_URL}/notifications/${id}/read/`, {}, { headers });
    } catch (err) {
      console.error("Error marking notification read:", err);
      fetchNotifications(true);
    }
  }, [fetchNotifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await axios.post(`${API_BASE_URL}/notifications/mark-all-read/`, {}, { headers });
    } catch (err) {
      console.error("Error marking all read:", err);
      fetchNotifications(true);
    }
  }, [fetchNotifications]);

  // Delete single notification
  const deleteNotification = useCallback(async (id) => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;

    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      const res = await axios.delete(`${API_BASE_URL}/notifications/${id}/`, { headers });
      if (res.data && typeof res.data.unread_count === "number") {
        setUnreadCount(res.data.unread_count);
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
      fetchNotifications(true);
    }
  }, [fetchNotifications]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;

    setNotifications([]);
    setUnreadCount(0);

    try {
      await axios.delete(`${API_BASE_URL}/notifications/clear-all/`, { headers });
    } catch (err) {
      console.error("Error clearing all notifications:", err);
      fetchNotifications(true);
    }
  }, [fetchNotifications]);

  // Start polling cycle and sync push subscription when authenticated
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      fetchNotifications(false);
      checkPushSubscription();
      syncPushSubscriptionIfGranted();

      pollingTimerRef.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchNotifications(true);
        } else {
          fetchUnreadCount();
        }
      }, 10000);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setIsPushSubscribed(false);
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [fetchNotifications, fetchUnreadCount, checkPushSubscription, syncPushSubscriptionIfGranted]);

  const handleDismissRolePrompt = () => {
    setRolePromptDismissed(true);
    try {
      sessionStorage.setItem("ecopulse_push_prompt_dismissed", "true");
    } catch (e) {}
  };

  const currentRole = getUserRole();
  const isPrivilegedRole = ["ADMIN", "STAFF", "RECYCLER"].includes(currentRole);
  const showRolePrompt =
    Boolean(getAccessToken()) &&
    isPrivilegedRole &&
    isPushSupported &&
    !isPushSubscribed &&
    pushPermission === "default" &&
    !rolePromptDismissed;

  const value = {
    notifications,
    unreadCount,
    loading,
    soundEnabled,
    toggleSound,
    isPushSupported,
    isPushSubscribed,
    pushPermission,
    subscribeToPush,
    unsubscribeFromPush,
    syncPushSubscriptionIfGranted,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {showRolePrompt && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            maxWidth: "400px",
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 12px 36px rgba(15, 36, 26, 0.22), 0 2px 10px rgba(0,0,0,0.06)",
            border: "1.5px solid #bbf7d0",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            animation: "epSlideUp 0.3s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#dcfce7",
                  color: "#166534",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <BellRing size={20} strokeWidth={2.2} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#166534" }}>
                  Enable Background Notifications
                </div>
                <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600" }}>
                  Recommended for {currentRole === "ADMIN" ? "Administrators" : currentRole === "STAFF" ? "Field Staff" : "Recyclers"}
                </div>
              </div>
            </div>
            <button
              onClick={handleDismissRolePrompt}
              style={{
                background: "none",
                border: "none",
                color: "#9ca3af",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                borderRadius: "6px",
              }}
              title="Dismiss"
              aria-label="Dismiss notification prompt"
            >
              <X size={18} />
            </button>
          </div>

          <p style={{ margin: 0, fontSize: "12.5px", color: "#374151", lineHeight: 1.45 }}>
            Receive immediate desktop and mobile alerts for pickup dispatches, task assignments, and recycling updates even when this tab is closed.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-end" }}>
            <button
              onClick={handleDismissRolePrompt}
              style={{
                background: "transparent",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "12.5px",
                fontWeight: "600",
                color: "#4b5563",
                cursor: "pointer",
              }}
            >
              Maybe Later
            </button>
            <button
              onClick={async () => {
                const ok = await subscribeToPush();
                if (ok) {
                  setShowRolePrompt(false);
                }
              }}
              style={{
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                border: "none",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "12.5px",
                fontWeight: "700",
                color: "#ffffff",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(22, 163, 74, 0.35)",
              }}
            >
              Enable Alerts
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
