const CACHE_NAME = 'lotto-pro-v1';
const assetsToCache = [
  './index.html',
  './enhancedAiRecommend.js',
  './hotRecommend.js',
  './lstmRecommend.js', // [추가]
  './lottoData.json',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});