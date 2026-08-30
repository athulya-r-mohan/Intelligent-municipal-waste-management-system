import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { playNotificationSound, unlockAudio } from "../utils/sound";

const API_BASE_URL = "http://127.0.0.1:8000/api";

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
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    "";
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

  const knownIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);
  const pollingTimerRef = useRef(null);

  // Check Web Push support in browser
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsPushSupported(true);
      setPushPermission(Notification.permission);
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
      // Quiet fail on network hiccups
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
      console.warn("Notification fetch error:", err.message);
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
      // Quiet fail
    }
  }, [isPushSupported]);

  // Subscribe to push notifications
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
        alert("Push notification permission was denied. Please enable notifications in your browser settings to receive waste updates.");
        return false;
      }

      // Get VAPID public key
      const keyRes = await axios.get(`${API_BASE_URL}/notifications/vapid-public-key/`);
      const vapidPublicKey = keyRes.data.public_key;
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

    // Optimistic UI update
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

  // Start polling cycle when authenticated
  useEffect(() => {
    const token = localStorage.getItem("access") || localStorage.getItem("access_token");
    if (token) {
      fetchNotifications(false);
      checkPushSubscription();

      pollingTimerRef.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchNotifications(true);
        } else {
          fetchUnreadCount();
        }
      }, 10000);
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [fetchNotifications, fetchUnreadCount, checkPushSubscription]);

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
