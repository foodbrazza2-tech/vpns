const STATIC_CACHE = 'vpns-static-v2';
const DYNAMIC_CACHE = 'vpns-dynamic-v2';

self.addEventListener('install', (event) => {
  const staticAssets = ['/manifest.json'];
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(staticAssets))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (![STATIC_CACHE, DYNAMIC_CACHE].includes(cacheName)) {
            return caches.delete(cacheName);
          }
          return undefined;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // Navigation (the HTML shell) and API calls: always go to the network first so a
  // fresh deploy is never masked by a stale cached page referencing removed asset
  // files. Only fall back to the cache when truly offline.
  if (request.mode === 'navigate' || url.pathname.includes('/api/') || url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }

          if (request.mode === 'navigate') {
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, response.clone()));
          } else {
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request).then((response) => response || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Hashed static assets (JS/CSS/images) never change content for a given URL,
  // so cache-first is safe and fast here.
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse.ok) {
            return networkResponse;
          }

          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, networkResponse.clone()));
          return networkResponse;
        })
        .catch(() => {
          if (request.destination === 'image') {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999">Offline</text></svg>',
              {
                headers: { 'Content-Type': 'image/svg+xml' },
              }
            );
          }

          return new Response('Offline', { status: 503 });
        });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
