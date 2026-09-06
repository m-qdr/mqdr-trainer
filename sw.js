/* ============================================================
 *  MQDR Trainer — Service Worker (offline support)
 *  Стратегии:
 *   - Навигация (HTML): network-first, офлайн — кэш index.html
 *   - Остальные GET (иконки, манифест): cache-first
 * ============================================================ */

const CACHE_NAME = 'mqdr-cache-v10';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(APP_SHELL);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
            return null;
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', function (event) {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  // Навигация: сначала пробуем сеть, при офлайне отдаём закэшированную страницу
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put('./index.html', clone);
          });
          return response;
        })
        .catch(function () {
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Остальные ресурсы: cache-first, догружаем по мере необходимости
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(request)
        .then(function (networkResponse) {
          const isSameOrigin = new URL(request.url).origin === self.location.origin;
          if (networkResponse && networkResponse.ok && isSameOrigin) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        })
        .catch(function () {
          return cached;
        });
    })
  );
});
