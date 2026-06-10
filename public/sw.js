// Kill-switch service worker.
//
// An earlier version of the explorer shipped a cache-first service worker that
// could serve stale responses (including /api/ data) indefinitely. Browsers
// that still have it registered will fetch this file on their periodic update
// check; this replacement immediately takes over, wipes every cache it owns,
// and unregisters itself so all future requests go straight to the network.
// (index.html also unregisters any service worker on page load as a second
// line of defense.)
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
