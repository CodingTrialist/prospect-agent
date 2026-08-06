// Minimal app-shell service worker. Expo SDK 50+ does not generate one.
// Bump CACHE_VERSION on every deploy so clients pick up new bundles.
const CACHE_VERSION = 'prospect-triage-v1';

// Relative to this script's own URL, so the same worker works whether the app
// is served from the domain root or from a GitHub Pages /<repo>/ subpath.
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const INDEX_URL = new URL('./index.html', self.location.href).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      // Not `addAll` — it rejects the whole batch if any single entry 404s,
      // which silently prevents the worker from ever installing.
      .then((cache) =>
        Promise.all(
          SHELL.map((url) =>
            cache.add(url).catch((err) => console.warn('Skipped precache for', url, err)),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// Network-first for navigation, cache-first for static assets.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(INDEX_URL)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          return res;
        }),
    ),
  );
});
