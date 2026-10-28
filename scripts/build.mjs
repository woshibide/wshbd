// Production build: client bundle, server bundle, then one prerendered HTML file per route.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';
import { SITE_URL } from '../src/site.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const ssrDir = path.join(root, 'node_modules/.cache/ssr');

// Both bundles must print the same build time in the footer.
process.env.SITE_BUILT_AT = new Date().toISOString();

await build({ root });
await build({ root, logLevel: 'warn', build: { ssr: 'src/entry-server.js', outDir: ssrDir, emptyOutDir: true } });

const { render, routes } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href);
const template = readFileSync(path.join(distDir, 'index.html'), 'utf8');

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

function headTags(head) {
    return [
        `<meta name="keywords" content="${escapeHtml(head.keywords)}">`,
        `<meta name="description" content="${escapeHtml(head.description)}">`,
        `<meta property="og:title" content="${escapeHtml(head.ogTitle)}">`,
        `<meta property="og:description" content="${escapeHtml(head.description)}">`,
        `<meta property="og:image" content="${SITE_URL}/content/misc/og_1200x1200.png">`,
        `<meta property="og:url" content="${escapeHtml(head.url)}">`,
        '<meta name="twitter:card" content="summary_large_image">',
        `<link rel="canonical" href="${escapeHtml(head.url)}">`,
        `<title>${escapeHtml(head.title)}</title>`,
    ].join('\n    ');
}

function fill(html, route, appHtml) {
    const parts = [
        ['<!--head-->', headTags(route.head)],
        ['<body>', route.bodyClass ? `<body class="${escapeHtml(route.bodyClass)}">` : '<body>'],
        ['<div id="app"><!--app--></div>', `<div id="app" data-route="${escapeHtml(route.path)}">${appHtml}</div>`],
    ];
    return parts.reduce((result, [marker, value]) => {
        if (!result.includes(marker)) throw new Error(`index.html is missing ${marker}`);
        return result.replace(marker, () => value);
    }, html);
}

function write(relativePath, contents) {
    const file = path.join(distDir, relativePath);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, contents);
}

for (const route of routes) {
    const { html } = await render(route.path);
    const page = fill(template, route, html);
    write(path.join(route.path, 'index.html'), page);
    // Static hosts that look for /404.html get the same page.
    if (route.path === '/errors/404/') write('404.html', page);
}

const today = process.env.SITE_BUILT_AT.slice(0, 10);
const urls = routes.filter(route => route.sitemap).map(route => {
    const depth = route.path.split('/').filter(Boolean).length;
    const priority = route.path === '/' ? '1.0' : Math.max(0.1, 1 - depth * 0.2).toFixed(1);
    return `  <url>\n    <loc>${SITE_URL}${route.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${depth <= 1 ? 'weekly' : 'monthly'}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
});
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nDisallow:\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

rmSync(ssrDir, { recursive: true, force: true });
console.log(`prerendered ${routes.length} pages into dist/`);
