self.addEventListener('install', (event) => {
  const staticAssets = ['/', '/index.html', '/manifest.json'];
  event.waitUntil(
    caches.open('vpns-static-v1').then((cache) => cache.addAll(staticAssets))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (!['vpns-static-v1', 'vpns-dynamic-v1', 'vpns-consulting-v1'].includes(cacheName)) {
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

  if (url.pathname.includes('/api/') || url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }

          caches.open('vpns-dynamic-v1').then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => caches.match(request).then((response) => response || new Response('Offline', { status: 503 })))
    );
    return;
  }

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

          caches.open('vpns-dynamic-v1').then((cache) => cache.put(request, networkResponse.clone()));
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