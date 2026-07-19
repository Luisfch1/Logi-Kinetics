const CACHE_NAME = 'logi-kinetics-cache-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // --- Network-First strategy para index.html (Navegación) ---
  if (req.mode === 'navigate' || req.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(req).then((networkResponse) => {
        if (networkResponse.ok) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, cacheCopy));
        }
        return networkResponse;
      }).catch(() => {
        // Fallback a caché si estamos offline
        return caches.match(req).then(cached => {
            return cached || caches.match('./index.html') || caches.match('./');
        });
      })
    );
    return;
  }

  // --- Stale-While-Revalidate para el resto (JS, CSS, Imágenes) ---
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
      }).catch(() => { /* ignorar errores offline para recursos estáticos */ });

      return cachedResponse || fetchPromise;
    })
  );
});
