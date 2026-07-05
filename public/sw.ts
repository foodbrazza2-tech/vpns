/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'vpns-consulting-v1';
const STATIC_CACHE = 'vpns-static-v1';
const DYNAMIC_CACHE = 'vpns-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
    ])
  );
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (![STATIC_CACHE, DYNAMIC_CACHE, CACHE_NAME].includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch handler avec stratégie Network First pour API, Cache First pour assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Requêtes API - Network First
  if (url.pathname.includes('/api/') || url.hostname !== location.hostname) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response.ok) throw new Error('Network response was not ok');
          const cache = caches.open(DYNAMIC_CACHE);
          cache.then((c) => c.put(request, response.clone()));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((response) => {
            return response || new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // Assets statiques - Cache First
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) return response;

      return fetch(request)
        .then((response) => {
          if (!response.ok) return response;

          const cache = caches.open(DYNAMIC_CACHE);
          cache.then((c) => c.put(request, response.clone()));
          return response;
        })
        .catch(() => {
          // Fallback pour les images
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

// Message handler pour skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

export {};
