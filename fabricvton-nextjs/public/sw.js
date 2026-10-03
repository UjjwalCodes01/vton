// The installable app this worker cached for has moved to clothsyai.fabricvton.com,
// and the pages it pre-cached now redirect there. Browsers that installed the old
// worker fetch this file on their next visit: it clears its caches and removes
// itself, so www.fabricvton.com is served straight from the network again.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => client.navigate(client.url));
    })(),
  );
});
