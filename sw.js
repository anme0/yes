// Simple offline cache
const CACHE = "pwa-stopwatch-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  e.respondWith(
    caches.match(request).then(res => res || fetch(request).then(networkRes => {
      // cache GETs for future
      if (request.method === "GET" && networkRes.ok) {
        const copy = networkRes.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
      }
      return networkRes;
    }).catch(() => caches.match("./index.html")))
  );
});
