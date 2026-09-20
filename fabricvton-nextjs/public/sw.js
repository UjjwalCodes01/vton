// Clothsy AI Service Worker for PWA Offline Caching and Speed
const CACHE_NAME = "clothsy-vton-v2";

const STATIC_ASSETS = [
  "/clothsy",
  "/demo",
  "/studio",
  "/about",
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
  "/icons/apple-touch-icon.png",
  "/fabricvton-removebg.png",
];

// Install: pre-cache critical shell routes
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Some assets failed to pre-cache:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy depending on request type
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ignore non-GET or cross-origin requests
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // 1. Navigation requests (HTML pages): Network-first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match("/clothsy");
          if (fallback) return fallback;
          return new Response(
            `<!DOCTYPE html><html><head><title>Clothsy AI - Offline</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;padding:24px;text-align:center}h1{color:#0d9488}p{color:#94a3b8;max-width:400px}button{background:#0d9488;color:#fff;border:none;border-radius:10px;padding:12px 24px;font-weight:700;font-size:16px;cursor:pointer;margin-top:16px}</style></head><body><h1>Clothsy AI</h1><p>You appear to be offline. Reconnect to the internet to use online AI Try-On features.</p><button onclick="window.location.reload()">Retry</button></body></html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }

  // 2. Static assets (images, fonts, scripts, css): Stale-while-revalidate
  const isStatic =
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "script" ||
    request.destination === "style" ||
    request.url.includes("/_next/") ||
    request.url.includes("/icons/") ||
    request.url.includes("/model_images/");

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Fallback default fetch
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// Skip waiting message handler
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
