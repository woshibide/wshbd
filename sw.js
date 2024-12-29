const CACHE_NAME = 'project-cache-v2';
const IMAGE_CACHE_NAME = 'image-cache-v2';
const JSON_CACHE_NAME = 'json-cache-v2';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/index.html',
                '/errors/400.html',
                '/errors/401.html',
                '/errors/403.html',
                '/errors/404.html',
                '/errors/500.html',
                '/errors/502.html',
                '/errors/503.html',
                '/errors/504.html',
                '/something',
                '/archive/index.html',
                '/info.html',
                '/scripts/scripts.js',
                '/scripts/archive.js',
                '/sections.css',
            ]);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            await self.clients.claim();

            // Delete old caches
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map((cache) => {
                    if (
                        cache !== CACHE_NAME &&
                        cache !== IMAGE_CACHE_NAME &&
                        cache !== JSON_CACHE_NAME
                    ) {
                        return caches.delete(cache);
                    }
                })
            );
        })()
    );
});

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    if (requestUrl.pathname.startsWith('/content/images/')) {
        event.respondWith(
            caches.open(IMAGE_CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((response) => {
                    return (
                        response ||
                        fetch(event.request)
                            .then((networkResponse) => {
                                cache.put(event.request, networkResponse.clone());
                                return networkResponse;
                            })
                            .catch(() => {
                                console.log('oh no, the image is not found')
                            })
                    );
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((response) => {
                return (
                    response ||
                    fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    })
                );
            });
        })
    );
});
