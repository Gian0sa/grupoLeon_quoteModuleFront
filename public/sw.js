// Service Worker mínimo para habilitar el criterio de instalación PWA en navegadores
const CACHE_NAME = 'autopartes-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Las peticiones a microservicios e internet pasan directamente por la red
  if (
    event.request.url.includes('/authModule/') ||
    event.request.url.includes('/quoteModule/') ||
    event.request.url.includes('/reportModule/')
  ) {
    return;
  }
});
