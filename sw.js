// GOB CRM service worker: makes the site installable and keeps the shell
// (HTML/CSS/JS/fonts) available offline. Data always comes live from Firebase.
const VERSION = 'gob-crm-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/assets/logo.png', '/assets/icon-192.png', '/assets/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only same-origin static assets are cached; APIs, Firebase, fonts CDN go straight through.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  // Network first (so deploys show up immediately), cache as fallback for offline.
  e.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; })
    .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('/index.html') : undefined))));
});
