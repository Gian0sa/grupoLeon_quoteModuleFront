const CACHE_NAME = 'autopartes-pwa-v9';
const MAX_STATIC_CACHE_ENTRIES = 30;

async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      // FIFO: eliminar las entradas más antiguas para mantener bajo el uso de almacenamiento y RAM
      const deleteCount = keys.length - maxItems;
      for (let i = 0; i < deleteCount; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (err) {
    console.warn('[SW] Error al recortar caché:', err);
  }
}

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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'PURGE_ALL_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      ).then(() => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      })
    );
  }
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

  // 3. Archivos estáticos inmutables (/assets/* con hash, fuentes, iconos): Cache-First con límite estricto
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
            caches.open(CACHE_NAME).then(async (cache) => {
              await cache.put(request, responseToCache);
              trimCache(CACHE_NAME, MAX_STATIC_CACHE_ENTRIES);
            });
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
