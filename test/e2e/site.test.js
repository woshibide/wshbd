// End-to-end checks of the built site (dist/) in a real browser.
// Run with `npm run test:e2e`, which builds first. Uses the installed Google Chrome.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
const TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
    '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
    '.xml': 'application/xml', '.txt': 'text/plain',
};
// Gitignored binaries that only exist on the production server.
const KNOWN_MISSING = /^\/content\/misc\/(favicon_\d+x\d+\.png|team\.jpg|og_1200x1200\.png)$/;

let server;
let browser;
let base;

// Serves dist/ like a plain static host: directory -> index.html, unknown -> 404.html with status 404.
function serveDist(request, response) {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
        response.writeHead(400).end();
        return;
    }
    let file = path.join(dist, pathname);
    if (file !== dist && !file.startsWith(dist + path.sep)) file = dist;
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!existsSync(file)) {
        response.writeHead(404, { 'content-type': 'text/html' });
        createReadStream(path.join(dist, '404.html')).pipe(response);
        return;
    }
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    const { size } = statSync(file);
    // Video seeking needs byte ranges, like any real static host provides.
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range || '');
    if (range) {
        const start = range[1] ? Number(range[1]) : size - Number(range[2]);
        const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
        response.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1, 'accept-ranges': 'bytes' });
        createReadStream(file, { start, end }).pipe(response);
        return;
    }
    response.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
    createReadStream(file).pipe(response);
}

before(async () => {
    assert.ok(existsSync(path.join(dist, 'index.html')), 'dist/ is missing, run npm run build');
    server = createServer(serveDist);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
});

after(async () => {
    await browser?.close();
    server?.close();
});

// Opens a page and collects console errors, page errors and failed requests.
async function open(url, { viewport = { width: 1440, height: 900 } } = {}) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const problems = [];
    page.on('console', message => {
        if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) problems.push(message.text());
    });
    page.on('pageerror', error => problems.push(String(error)));
    page.on('response', response => {
        const { pathname } = new URL(response.url());
        if (response.status() >= 400 && response.url().startsWith(base) && !KNOWN_MISSING.test(pathname)) {
            if (pathname !== new URL(url, base).pathname) problems.push(`${response.status()} ${pathname}`);
        }
    });
    await page.goto(base + url, { waitUntil: 'load' });
    return { page, problems, close: () => context.close() };
}

test('every page loads and hydrates without errors', async () => {
    const urls = ['/', '/archive/', '/archive/E04/', '/archive/W07/', '/about/', '/theatre/', '/web-essays/', '/errors/500/'];
    for (const url of urls) {
        const { page, problems, close } = await open(url);
        await page.waitForTimeout(300);
        assert.deepEqual(problems, [], `${url}: ${problems.join(', ')}`);
        assert.ok(await page.title(), `${url} has a title`);
        await close();
    }
});

test('unknown URLs answer 404 with the error page', async () => {
    const response = await fetch(`${base}/no-such-page/`);
    assert.equal(response.status, 404);
    const { page, problems, close } = await open('/no-such-page/');
    await page.waitForSelector('#p5js canvas');
    assert.equal(await page.textContent('.error-code'), '404 :(');
    assert.deepEqual(problems, []);
    await close();
});

test('archive: newest first, tag filter, reset, open item', async () => {
    const { page, problems, close } = await open('/archive/');
    assert.equal((await page.textContent('#filter-when')).trim(), 'when ↓');

    const visibleRows = () => page.locator('.archive-list .archive-item:visible').count();
    const allRows = await visibleRows();
    await page.click('.hashtag[data-tag="book"] .hashtag-button');
    const bookRows = await visibleRows();
    assert.ok(bookRows > 0 && bookRows < allRows, 'tag narrows the list');
    assert.equal(await page.getAttribute('.hashtag[data-tag="book"] .hashtag-button', 'aria-pressed'), 'true');

    await page.click('#filter-who');
    assert.equal((await page.textContent('#filter-who')).trim(), 'who ↑'); // shows the order the next click will use

    const row = page.locator('.archive-item[data-shown="true"]:visible').first();
    await row.locator('summary').click({ position: { x: 900, y: 5 } });
    assert.equal(await row.evaluate(element => element.open), true);
    assert.ok(await row.locator('.image-container img, .image-container video').first().isVisible());

    await page.click('#hashtag-reset .hashtag-button');
    assert.equal(await visibleRows(), allRows);
    assert.equal(await row.evaluate(element => element.open), false, 'reset closes open items');
    assert.deepEqual(problems, []);
    await close();
});

test('footer brief on another page opens the archive filtered', async () => {
    const { page, close } = await open('/archive/E04/');
    await page.click('#design-brief p:has-text("EDITORIAL")');
    await page.waitForURL(/\/archive\/#archive$/);
    await page.waitForSelector('.hashtag.selected[data-tag="editorial"]');
    await close();
});

test('menu, layout grid and email copy', async () => {
    const { page, close } = await open('/about/');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.click('#menu-icon');
    assert.ok(await page.locator('#nav-menu.open').isVisible());
    await page.click('#menu-icon');
    await page.mouse.move(700, 450); // the hovered menu icon stretches across the top of the page

    await page.keyboard.press('d');
    assert.ok(await page.locator('#column-grid-overlay.is-visible').isVisible());

    await page.click('.sticky-email');
    await page.waitForSelector('.sticky-email:text-is("email COPIED!")'); // clipboard write is async
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'yes@its-pyotr.com');
    await page.reload();
    assert.equal(await page.textContent('.sticky-email'), 'email COPIED!', 'label survives reload');
    assert.match(await page.textContent('#time'), /^\d\d:\d\d:\d\d$/);
    await close();
});

test('theatre: curtain opens, arrows step media and projects', async () => {
    const { page, problems, close } = await open('/theatre/');
    await page.waitForSelector('#theatre-curtain', { state: 'hidden', timeout: 15000 });
    const firstId = await page.locator('.project-section').first().getAttribute('id');
    const counter = page.locator(`#${firstId} .gallery-counter`);
    assert.match(await counter.textContent(), /^IMAGE 1 OUT OF \d+$/);
    await page.keyboard.press('ArrowRight');
    assert.match(await counter.textContent(), /^IMAGE 2 OUT OF \d+$/);
    await page.keyboard.press('ArrowDown');
    const secondId = await page.locator('.project-section').nth(1).getAttribute('id');
    await page.waitForFunction(id => window.location.hash === `#${id}`, secondId);
    assert.deepEqual(problems, []);
    await close();
});

test('project video player controls', async () => {
    const { page, close } = await open('/archive/W07/');
    const player = page.locator('.project-video-player').first();
    const play = player.locator('.video-control-play');
    await page.waitForFunction(() => !document.querySelector('.project-video-player video').paused);
    assert.equal(await play.textContent(), 'PAUSE');
    await player.hover();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.video-player-controls')).opacity === '1');
    await play.click();
    await player.locator('.video-control-play:text-is("PLAY")').waitFor(); // updates on the pause event
    assert.equal(await page.locator('.solo-project-images img[src$="-poster.webp"]').count(), 0, 'posters are not gallery images');
    await close();
});

test('sitemap and robots', async () => {
    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
    assert.match(sitemap, /<loc>https:\/\/its-pyotr\.com\/archive\/E04\/<\/loc>/);
    assert.doesNotMatch(sitemap, /errors/);
    assert.match(await (await fetch(`${base}/robots.txt`)).text(), /Sitemap: https:\/\/its-pyotr\.com\/sitemap\.xml/);
});
