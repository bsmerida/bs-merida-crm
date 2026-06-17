const CACHE = "duclaud-v1";
const OFFLINE_URL = "/admin";
 
self.addEventListener("install", e => {
  self.skipWaiting();
});
 
self.addEventListener("activate", e => {
  e.waitUntil(clients.claim());
});
 
// Push notification handler
self.addEventListener("push", e => {
  const data = e.data?.json() || {};
  const title = data.title || "Duclaud CRM";
  const options = {
    body:  data.body  || "Tienes una notificación nueva.",
    icon:  "/icon-192.png",
    badge: "/icon-72.png",
    data:  { url: data.url || "/admin" },
    vibrate: [200, 100, 200],
    actions: data.actions || [],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});
 
// Click en notificación → abrir la URL correcta
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.notification.data?.url || "/admin";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
