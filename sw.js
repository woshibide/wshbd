const CACHE_NAME = 'project-cache-v1';
const IMAGE_CACHE_NAME = 'image-cache-v1';
const JSON_CACHE_NAME = 'json-cache-v1';

self.addEventListener('install', (event) => {
    // console.log('Service Worker: Installing');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // console.log('Service Worker: Caching static assets');
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
                '/archive/index.html',
                '/something.html',
                '/info.html',
                '/scripts/scripts.js',
                // '/content/info/archive.json', // to be cached by server
                // '/content/info/image-map.json' // to be cached by server
            ]);
        }).then(() => {
            // console.log('Service Worker: All static assets cached');
        })
    );
});

// clean up old caches
self.addEventListener('activate', (event) => {
    // console.log('Service Worker: Activating');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME && cache !== IMAGE_CACHE_NAME && cache !== JSON_CACHE_NAME) {
                        // console.log(`Service Worker: Deleting old cache ${cache}`);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            // console.log('Service Worker: Activation complete');
        })
    );
});

// Fetch Event: Handle requests for JSON files and images
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);
    // console.log(`Service Worker: Fetching ${requestUrl.pathname}`);

    // cache JSON files
    // if (requestUrl.pathname.endsWith('.json')) {
    //     event.respondWith(
    //         caches.match(event.request).then((response) => {
    //             if (response) {
    //                 // console.log(`Service Worker: Serving cached JSON ${requestUrl.pathname}`);
    //                 return response;
    //             }
    //             // console.log(`Service Worker: Fetching and caching JSON ${requestUrl.pathname}`);
    //             return fetch(event.request).then((networkResponse) => {
    //                 return caches.open(JSON_CACHE_NAME).then((cache) => {
    //                     cache.put(event.request, networkResponse.clone());
    //                     return networkResponse;
    //                 });
    //             });
    //         })
    //     );
    //     return;
    // }

    // cache images
    if (requestUrl.pathname.startsWith('/content/images/')) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                if (response) {
                    // console.log(`Service Worker: Serving cached image ${requestUrl.pathname}`);
                    return response;
                }
                // console.log(`Service Worker: Fetching and caching image ${requestUrl.pathname}`);
                return fetch(event.request).then((networkResponse) => {
                    return caches.open(IMAGE_CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // try cache first, then network
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                // console.log(`Service Worker: Serving cached resource ${requestUrl.pathname}`);
                return response;
            }
            // console.log(`Service Worker: Fetching resource ${requestUrl.pathname}`);
            return fetch(event.request);
        })
    );
});


