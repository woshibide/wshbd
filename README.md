# le portfolio

Available at [https://its-pyotr.com](https://its-pyotr.com).

A Vue 3 site built with Vite and prerendered into plain static HTML.
Every page exists as a real file in `dist/`, so any static host can serve it, and Vue hydrates it in the browser for the interactive parts.

## Run

Requires Node.js 22 or newer.

```bash
npm install
npm run start                  # dev server with hot reload at http://127.0.0.1:5173
npm run start -- --port 4173   # pick another port; an occupied port is an error
npm run build                  # static site in dist/
npm run preview                # serve dist/ locally
```

## Tests

```bash
npm test           # unit tests for content, archive sorting, formatting and routes
npm run test:e2e   # builds, then checks the real pages in the installed Google Chrome
```

Set `PLAYWRIGHT_CHANNEL` to use another browser channel for the end-to-end tests.

## Add or change a project

1. Add or edit the project in `src/data/archive.json`.
   `id` looks like `E04`, `date` like `2024 Mar`, `hashtags` is a comma-separated list, and `shown: false` lists the project greyed out without a page.
2. Put its media in `public/content/projects/<id>/`.
   Files are ordered by name with numbers sorted naturally (`2.webp` before `10.webp`).
   A video `clip.mp4` uses `clip-poster.webp` as its poster.
3. Run `npm run media` to rename files to lowercase, convert JPG and PNG to WebP, and shrink oversized images (at most 1400 px and 500 KB).
   `npm run media -- --dry-run` shows what would change.
4. Run `npm run build`.

The build stops with a clear message when the data is broken, for example a shown project without media or a malformed date.
Media folders without a project only produce a warning.

## Layout

```text
index.html               page template; the build fills in head tags and the rendered page
src/
  data/archive.json      the projects
  site.js                site-wide copy, links and contact details
  routes.js              every page and its title
  pages/                 one component per page type
  components/            header, footer, archive, video player, theatre section
  lib/                   plain logic: content, archive sorting, formatting, curtain, error sketch
  styles/                global styles
public/
  content/               fonts, showreel, project media (served as is)
  web-essays/            standalone essays, copied as is
scripts/
  build.mjs              client build, server build, prerender, sitemap and robots.txt
  content-plugin.mjs     provides `virtual:content` to the app from archive.json and the media folders
  prepare-media.mjs      `npm run media`
test/unit, test/e2e
```

Press `d` on any page to show the four-column layout grid.

## Deploy

Upload the contents of `dist/`.
Pages live at directory paths such as `/archive/E04/index.html`.
Error pages are at `/errors/<code>/`, and `/404.html` is a copy of the 404 page for hosts that look for it.

Favicons, `og_1200x1200.png` and `team.jpg` in `public/content/misc/` are ignored by Git (`*.png`, `*.jpg`), so they have to be present on the machine that builds.
