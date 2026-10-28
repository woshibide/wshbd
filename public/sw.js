// An earlier version of the site could register a caching service worker at /sw.js.
// This replacement clears those caches and unregisters itself, so old visitors get fresh pages.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        await Promise.all((await caches.keys()).map(key => caches.delete(key)));
        await self.registration.unregister();
        const windows = await self.clients.matchAll({ type: 'window' });
        windows.forEach(client => client.navigate(client.url));
    })());
});
