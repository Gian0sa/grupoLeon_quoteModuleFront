const CACHE_NAME = 'autopartes-pwa-v8';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Solo interceptar peticiones GET
  if (request.method !== 'GET') return;

  // 2. Ignorar peticiones a microservicios, APIs externas y WebSockets
  if (
    url.pathname.includes('/authModule/') ||
    url.pathname.includes('/quoteModule/') ||
    url.pathname.includes('/reportModule/') ||
    url.pathname.includes('/socket.io') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // 3. Archivos estáticos inmutables (/assets/* con hash, fuentes, iconos): Cache-First
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. Navegación principal (HTML): Network-First con fallback a caché
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html') || caches.match(request))
    );
  }
});
