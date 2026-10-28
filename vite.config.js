import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import contentPlugin from './scripts/content-plugin.mjs';

// The dev server only serves exact public/ file paths; let /web-essays/montaigne/ find its
// index.html like the static host and `vite preview` do.
const publicDirectoryIndex = {
    name: 'public-directory-index',
    configureServer(server) {
        server.middlewares.use((request, _response, next) => {
            const [pathname, query] = request.url.split('?');
            if (pathname.endsWith('/') && existsSync(path.join(server.config.publicDir, pathname, 'index.html'))) {
                request.url = `${pathname}index.html${query ? `?${query}` : ''}`;
            }
            next();
        });
    },
};

export default defineConfig({
    // Absolute URLs like /content/... point into public/ and stay as they are.
    plugins: [vue({ template: { transformAssetUrls: { includeAbsolute: false } } }), contentPlugin(), publicDirectoryIndex],
    // Pages live at nested paths (/archive/E04/), so assets are referenced from the site root.
    base: '/',
    build: {
        // Project media is served from public/ as is; never inline it.
        assetsInlineLimit: 0,
        // p5 (~1 MB) is only loaded on error pages, as its own chunk.
        chunkSizeWarningLimit: 1100,
    },
});
