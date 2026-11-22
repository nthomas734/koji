// koji service worker — offline support for viewing trips on the go.
//
// Strategy:
//   - network-first for same-origin pages & RSC payloads (fresh when online,
//     last-seen copy when not — e.g. on the Tube or in a rural dead zone)
//   - page navigations with a cached copy race the network against
//     NAV_TIMEOUT_MS: a network that hasn't answered by then loses to the
//     cached copy, and its response refreshes the cache in the background
//     (along with the /_next/static files it names, so the copy it leaves
//     never points at scripts this phone doesn't have). No cached copy:
//     wait for the network, as before.
//   - cache-first for /_next/static (content-hashed, immutable)
//   - cache-first for koma reference photographs, which live on Supabase
//     storage: cross-origin, uploaded once, never changed, and the entire
//     content of nine frame sheets. Skipping them meant every interior shot
//     was a broken square the moment the phone lost signal — which is exactly
//     when you are standing in the interior.
//   - never touches /api/, /admin, other cross-origin requests, or non-GET
//     requests, so the UpdateBanner deploy check (/api/version) always goes
//     to the network
//
// Bump VERSION to invalidate all old caches on the next deploy of this file.
// v3 (2026-11-11): pages cached before koma went private still hold the shot
// plan in their payload; the bump clears them off every phone.
// v4 (2026-11-15): navigations time out to the cached copy after 3 s.
const VERSION = 'koji-v4';
const NAV_TIMEOUT_MS = 3000;
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
  } else if (req.mode === 'navigate') {
    event.respondWith(navigate(event));
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

// A stalled network (a train between stations) doesn't throw, it just waits,
// so network-first alone held a cached trip back for as long as the network
// took. Only navigations get the timer: RSC fetches stay network-first.
async function navigate(event) {
  const req = event.request;
  const cache = await caches.open(PAGE_CACHE);
  const hit = await cache.match(req);
  if (!hit) return networkFirst(req);

  const network = fetch(req);
  const timer = new Promise((resolve) => setTimeout(resolve, NAV_TIMEOUT_MS, null));
  const first = await Promise.race([network.catch(() => null), timer]);
  if (first) {
    if (first.ok) event.waitUntil(cache.put(req, first.clone()));
    return first;
  }
  // Too slow, or failed: show the cached copy, and keep the worker alive
  // until the late response has been stored. Chrome can cancel that first
  // fetch once the cached copy is chosen (it shares the browser's own preload
  // of the page), so on failure ask again, past the HTTP cache, whose lock
  // would otherwise hold the retry until the cancelled request is cleared.
  // Safari lets the first one finish.
  const late = network.catch(() =>
    fetch(req.url, { credentials: 'same-origin', redirect: 'manual', cache: 'no-store' }));
  event.waitUntil(late.then((res) => refresh(cache, req, res)).catch(() => {}));
  return hit;
}

// Store a page that arrived after its cached copy was shown. It was never
// rendered, so its scripts were never fetched; fetch them now, from the same
// deploy that served the page. Otherwise, after a deploy that changed chunk
// hashes, this copy could be shown offline pointing at files the phone never
// got and the server no longer has.
async function refresh(cache, req, res) {
  if (!res.ok) return;
  const html = await res.clone().text();
  const assets = await caches.open(ASSET_CACHE);
  const urls = [...new Set(html.match(/\/_next\/static\/[^"'\s\\)]+/g) || [])];
  await Promise.all(urls.map(async (u) => {
    try {
      if (await assets.match(u)) return;
      const r = await fetch(u);
      if (r.ok) await assets.put(u, r);
    } catch { /* the page still stores; the asset is fetched on first use */ }
  }));
  await cache.put(req, res);
}

// UpdateBanner's Reload: store a fresh copy of the page (and the scripts it
// names) before the page reloads, then say so. A plain reload on a slow link
// would hit the 3 s timer above and show the old cached copy again, and a
// fetch from the page alone isn't enough: networkFirst doesn't wait for its
// cache write, so the reload could still find the old entry.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'koji:refresh-page') return;
  const url = new URL(event.data.url, self.location.origin);
  url.hash = '';
  if (url.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    try {
      const res = await fetch(url.href, { cache: 'no-store', credentials: 'same-origin', redirect: 'manual' });
      await refresh(await caches.open(PAGE_CACHE), url.href, res);
    } catch { /* offline: the reload falls back as any navigation does */ }
    event.source?.postMessage({ type: 'koji:page-refreshed' });
  })());
});

// Save a trip onto the phone (lib/saveTrip.ts, 2026-11-21): store each page
// and the scripts it names, then answer on the port with whether all stored.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'koji:save-trip') return;
  const port = event.ports?.[0];
  const urls = (event.data.urls || []).map((u) => new URL(u, self.location.origin))
    .filter((u) => u.origin === self.location.origin && !u.pathname.startsWith('/api/') && !u.pathname.startsWith('/admin'));
  event.waitUntil((async () => {
    const cache = await caches.open(PAGE_CACHE);
    const results = await Promise.all(urls.map(async (url) => {
      url.hash = '';
      try {
        const res = await fetch(url.href, { cache: 'no-store', credentials: 'same-origin', redirect: 'manual' });
        if (!res.ok) return false;
        await refresh(cache, url.href, res);
        return true;
      } catch { return false; }
    }));
    port?.postMessage({ ok: urls.length > 0 && results.every(Boolean) });
  })());
});

// Trip alerts (Web Push from /api/notify). iOS requires every push to show a
// notification, so always call showNotification.
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || 'koji', {
    body: d.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: d.tag,
    data: { url: d.url || '/' },
  }));
});

// Tap: focus an open koji window on the stop, or open one
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) { await w.navigate(url).catch(() => {}); return w.focus(); }
    }
    return self.clients.openWindow(url);
  })());
});
