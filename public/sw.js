const CACHE_NAME = 'autopartes-pwa-v11';
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

  // 2.1 Ignorar en desarrollo (Vite HMR, recargas locales de módulos y depuración)
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.search.includes('t=') ||
    url.search.includes('import')
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
      caches.match(request)
        .then((cachedResponse) => {
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
        .catch(async () => {
          // Si el fetch falla (offline o error de red), intentar devolver caché existente
          const fallbackCache = await caches.match(request);
          if (fallbackCache) return fallbackCache;
          // Retornar una Response válida para evitar TypeError: Failed to convert value to 'Response'
          return new Response(null, { status: 404, statusText: 'Not Found' });
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
        .catch(async () => {
          const cachedHtml = (await caches.match('/index.html')) || (await caches.match(request));
          if (cachedHtml) return cachedHtml;
          return new Response(
            '<!DOCTYPE html><html><body><h2>Sin conexión a la red</h2><p>Por favor reconéctese a internet para continuar.</p></body></html>',
            {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            }
          );
        })
    );
  }
});


// ═══════════════════════════════════════════════════════════════════════
// 5. Web Push Notifications (Nivel 2 - Windows, Android & iOS PWA)
// ═══════════════════════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_) {
      data = {
        title: 'Grupo León',
        body: event.data.text() || 'Tienes una nueva notificación.',
      };
    }
  } else {
    data = {
      title: 'Grupo León',
      body: 'Nueva actualización en el sistema de cotizaciones.',
    };
  }

  const title = data.title || 'Grupo León - Notificación';
  const options = {
    body: data.body || 'Tienes una nueva actualización en cotizaciones.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag || 'grupo-leon-quote-notification',
    renotify: true,
    requireInteraction: false,
    data: data.data || { url: '/cotizaciones' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/cotizaciones';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. Si ya existe una ventana abierta de la app, enfocarla y navegar
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url && client.url.includes(self.location.origin)) {
            client.postMessage({ type: 'NAVIGATE_TO', url: targetUrl });
            return client.focus();
          }
        }
      }
      // 2. Si la app estaba cerrada, abrir una nueva ventana
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
