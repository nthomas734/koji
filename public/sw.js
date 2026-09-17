// koji service worker — offline support for viewing trips on the go.
//
// Strategy:
//   - network-first for same-origin pages & RSC payloads (fresh when online,
//     last-seen copy when not — e.g. on the Tube or in a rural dead zone)
//   - cache-first for /_next/static (content-hashed, immutable)
//   - cache-first for koma reference photographs, which live on Supabase
//     storage: cross-origin, uploaded once, never changed, and the entire
//     content of nine frame sheets. Skipping them meant every interior shot
//     was a broken square the moment the phone lost signal — which is exactly
//     when you are standing in the interior.
//   - never touches /api/, /admin, other cross-origin requests, or non-GET
//     requests, so the UpdateBanner deploy check (HEAD / with no-store) passes
//
// Bump VERSION to invalidate all old caches on the next deploy of this file.
const VERSION = 'koji-v2';
const ASSET_CACHE = `${VERSION}-assets`;
const PAGE_CACHE = `${VERSION}-pages`;
const REF_CACHE = `${VERSION}-refs`;

// Matched on host *and* path so this stays the koma reference bucket and does
// not quietly become "cache anything Supabase serves".
function isKomaRef(url) {
  return /(^|\.)supabase\.co$/.test(url.hostname)
    && url.pathname.includes('/object/public/koma-refs/');
}

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
  if (url.origin !== self.location.origin) {
    if (isKomaRef(url)) event.respondWith(cacheFirst(req, REF_CACHE));
    return;
  }
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req, ASSET_CACHE));
  } else {
    event.respondWith(networkFirst(req));
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  // An <img> to another origin is a no-cors request, so the response is opaque:
  // status 0 and `ok` false even when it arrived fine. Checking only `ok` would
  // have cached nothing and looked like it worked.
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
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
