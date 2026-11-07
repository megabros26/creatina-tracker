// Service worker: permite abrir la app sin conexión.
// Estrategia "red primero": si hay internet se usa siempre la última versión.
const CACHE = 'creatina-v2';
const ARCHIVOS = [
    './',
    'index.html',
    'style.css',
    'app.js',
    'manifest.json',
    'icon-180.png',
    'icon-192.png',
    'icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((claves) =>
            Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        fetch(event.request)
            .then((resp) => {
                if (resp.ok && new URL(event.request.url).origin === location.origin) {
                    const copia = resp.clone();
                    caches.open(CACHE).then((c) => c.put(event.request, copia));
                }
                return resp;
            })
            .catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
});
