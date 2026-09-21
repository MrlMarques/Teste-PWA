const CACHE_NAME = 'taskflow-v7';
const ASSETS_TO_CACHE = [
'/',
'/index.html',
'/css/style.css',
'/js/app.js',
'/js/db.js',
'/manifest.json'
];

self.addEventListener('install', (event) => {
event.waitUntil(
caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
.then(() => self.skipWaiting())
);
});

self.addEventListener('activate', (event) => {
event.waitUntil(
caches.keys().then((cacheNames) => {
return Promise.all(
cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
);
}).then(() => self.clients.claim())
);
});

self.addEventListener('fetch', (event) => {
if (event.request.method !== 'GET') return;
event.respondWith(
caches.match(event.request).then((cachedResponse) => {
return cachedResponse || fetch(event.request);
})
);
});
