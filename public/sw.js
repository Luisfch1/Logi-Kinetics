const CACHE_NAME = 'logi-kinetics-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Caching dynamic requests using Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse.ok || networkResponse.type === 'opaque') {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, cacheCopy);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If offline and request is document, fallback to index
        if (req.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('./');
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});
