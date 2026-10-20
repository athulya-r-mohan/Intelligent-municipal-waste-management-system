/* ============================================================
   EcoPulse Web Push Service Worker
   ============================================================ */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: "EcoPulse Notification",
        body: event.data.text() || "You have a new update in EcoPulse.",
      };
    }
  } else {
    data = {
      title: "EcoPulse Update",
      body: "New update in Waste Management System.",
    };
  }

  const title = data.title || "EcoPulse Smart Waste";
  const defaultIcon = new URL("/favicon.svg", self.location.origin).href;
  const options = {
    body: data.body || data.message || "New municipal waste update received.",
    icon: data.icon ? new URL(data.icon, self.location.origin).href : defaultIcon,
    badge: data.badge ? new URL(data.badge, self.location.origin).href : defaultIcon,
    vibrate: [200, 100, 200],
    data: {
      url: data.action_url || data.url || "/notifications",
      id: data.id,
      notification_type: data.notification_type,
    },
    tag: `ecopulse-notif-${data.id || Date.now()}`,
    renotify: true,
    actions: [
      { action: "open", title: "View Details" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const rawUrl = (event.notification.data && event.notification.data.url) || "/notifications";
  let targetUrl;
  try {
    targetUrl = new URL(rawUrl, self.location.origin).href;
  } catch (err) {
    targetUrl = new URL("/notifications", self.location.origin).href;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it and navigate
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        // Otherwise, open a new browser window to the absolute target URL
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
