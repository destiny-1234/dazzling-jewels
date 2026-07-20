// Minimal service worker — its only job is to satisfy PWA installability
// criteria and speed up repeat loads of truly static assets (icons, logo
// images). It deliberately does NOT cache pages, API calls, or Supabase
// requests, since this site handles live stock, cart, and order data that
// must never be served stale.

const CACHE_NAME = 'fave-static-v1';
const STATIC_PATH_PREFIXES = ['/icons/', '/images/'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  const isStaticAsset =
    event.request.method === 'GET' &&
    url.origin === self.location.origin &&
    STATIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

  if (!isStaticAsset) {
    // Everything else (pages, API routes, Supabase calls) — always go to
    // the network as normal, no caching involved.
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
  );
});
