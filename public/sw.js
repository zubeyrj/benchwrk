// Benchwrk service worker: makes the site installable and quick to reopen, and shows reminders.
// App files: network first, cached copy when offline. API and database calls are never cached.
const CACHE = "benchwork-v2";
const SHELL = ["/", "/index.html", "/app.js", "/platform.js", "/runner.js", "/config.js", "/harness.txt", "/icon.svg", "/manifest.webmanifest"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/") || u.pathname.startsWith("/c/")) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match("/index.html"))));
});

// Reminders sent by /api/cron/nudge.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Benchwrk", { body: d.body || "", icon: "/icon-192.png", badge: "/icon-192.png", tag: d.tag || "bw", renotify: true, data: { url: d.url || "/#home" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/#home", location.origin);
  if (url.origin !== location.origin) return;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const c = cs.find((x) => new URL(x.url).origin === location.origin);
    if (c) return c.focus().then((w) => (w && w.navigate ? w.navigate(url.href) : null)).catch(() => null);
    return self.clients.openWindow(url.href);
  }));
});
