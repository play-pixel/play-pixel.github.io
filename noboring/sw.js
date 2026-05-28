// Service worker для PWA «Мои Задания».
// HTML — network-first (свежий код сразу после релиза, без возни с версиями), офлайн-фолбэк из кэша.
// Шрифты/иконки/манифест — cache-first (мгновенно).
const CACHE = 'noboring-v33';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './fonts/nunito-latin.woff2',
  './fonts/nunito-cyrillic.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // кэшируем файлы по отдельности: сбой одного не отменяет кэширование остальных
      .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
      .catch(() => {})
  );
  // НЕ вызываем skipWaiting здесь: новый SW ждёт, пока пользователь нажмёт «Обновить» (тост).
});

// страница просит активировать новую версию (клик по «Обновить») → встаём на место старого SW
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// навигация/HTML-документ?
function isHtml(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // HTML: сначала сеть (свежий код), копию кладём в кэш; без сети — отдаём кэшированную оболочку.
  if (isHtml(req)) {
    e.respondWith(
      fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Остальное: cache-first, иначе сеть (и кладём в кэш).
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => undefined);
    })
  );
});
