const CACHE_NAME = 'dmc-planner-v2.1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './fonts/DMC5Font.ttf',
    './fonts/PTSansNarrow-Bold.ttf',
    './fonts/UbuntuCondensed-Regular.ttf',
    './image/Dante.png',
    './image/Vergil.png',
    './image/Nero.png'
];

// Устанавливаем и кэшируем файлы
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Перехватываем запросы и отдаем из кэша, если нет интернета
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});