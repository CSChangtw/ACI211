// ACI 211 PWA Service Worker v1.0
const CACHE_NAME = 'aci211-v1';

// 離線時需要快取的核心檔案
const CORE_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── 安裝：快取核心檔案 ──────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] 快取核心檔案');
      return cache.addAll(CORE_FILES);
    })
  );
  self.skipWaiting();
});

// ── 啟動：清除舊版快取 ─────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch：Cache First，網路失敗則用快取 ──────────────────
self.addEventListener('fetch', event => {
  // 只處理 GET 請求，略過 CDN 外部資源（jsPDF 等）
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 外部 CDN（cdnjs, fonts）直接走網路，失敗靜默
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 408 }))
    );
    return;
  }

  // 本地檔案：Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // 成功則順便存入快取
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
