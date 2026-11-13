// Static-asset cache: stale-while-revalidate for same-origin files, network-first for the page.
// Proxy and third-party requests are never cached.
const VERSION = 'v2026.11.13-1';
const CACHE = `portfolio-${VERSION}`;
const CORE = ['./', './index.html', './css/app.css', './js/app.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  e.respondWith(isPage ? networkFirst(e.request) : staleWhileRevalidate(e.request));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try { const res = await fetch(req); if (res.ok) cache.put(req, res.clone()); return res; }
  catch { return (await cache.match(req)) || (await cache.match('./index.html')) || Response.error(); }
}
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const network = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  return cached || (await network) || Response.error();
}
