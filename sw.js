const CACHE_NAME = 'lotto-pro-v1';
const assetsToCache = [
  './index.html',
  './enhancedAiRecommend.js',
  './hotRecommend.js',
  './lottoData.json'
  // 추가로 사용하는 CSS나 JS 파일이 있다면 여기에 이름을 적어주세요.
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