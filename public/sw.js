// koji service worker — offline support for viewing trips on the go.
//
// Strategy:
//   - network-first for same-origin pages & RSC payloads (fresh when online,
//     last-seen copy when not — e.g. on the Tube or in a rural dead zone)
//   - cache-first for /_next/static (content-hashed, immutable)
//   - never touches /api/, /admin, cross-origin requests, or non-GET requests,
//     so the UpdateBanner deploy check (HEAD / with no-store) passes through
//
// Bump VERSION to invalidate all old caches on the next deploy of this file.
const VERSION = 'koji-v1';
const ASSET_CACHE = `${VERSION}-assets`;
const PAGE_CACHE = `${VERSION}-pages`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req));
  } else {
    event.respondWith(networkFirst(req));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    // Offline navigation to an uncached URL: fall back to the cached home page
    if (req.mode === 'navigate') {
      const home = await cache.match('/');
      if (home) return home;
    }
    throw err;
  }
}
