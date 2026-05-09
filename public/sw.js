const CACHE_NAME = 'caterpillar-offline-v2';
const OFFLINE_ASSETS = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);

      try {
        const response = await fetch(event.request);
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          await cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return cached ?? await cache.match('./index.html') ?? Response.error();
      }
    }),
  );
});
