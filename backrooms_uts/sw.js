const CACHE_NAME = 'backrooms-v1';
const MEDIA_CACHE = 'backrooms-media-v1';

// Media files — cache-first (large, rarely change)
const isMedia = (url) => /\.(jpg|jpeg|png|gif|webp|mp4|webm|mp3|ogg)(\?|$)/i.test(url);

// App shell — network-first (always fresh, cache as fallback)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET and cross-origin
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  if (isMedia(url.pathname)) {
    // Media: cache-first
    e.respondWith(
      caches.open(MEDIA_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(resp => {
            if (resp.ok) cache.put(e.request, resp.clone());
            return resp;
          });
        })
      )
    );
  } else {
    // App files: network-first, cache fallback
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
  }
});

// On activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== MEDIA_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// On install — take over immediately
self.addEventListener('install', () => self.skipWaiting());
