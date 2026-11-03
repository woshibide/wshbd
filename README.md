# IT'S PYOTR

Static portfolio at [its-pyotr.com](https://its-pyotr.com/).
All installation, media preparation, and builds run locally.
Production only serves finished static files; never run npm or FFmpeg there.

## Local work

Build requires Node 22.19+ and npm.
FFmpeg is needed only for video preparation; Chromium is needed only for optional browser checks and audits.

```sh
npm ci
npm run media
npm run build
npm run preview
```

Run `media` after changing original media; it caches derivatives and preserves originals.
Run `build` after source changes; it validates staged output before updating generated files.
Preview serves `.cache/site/` at `http://127.0.0.1:4173`.
Use `npm run dev` to rebuild on page, style, script, or project-JSON changes.

## Source and public output

Edit project data in `content/info/archive.json`, pages in `src/pages/`, and shared templates in `src/templates/`.
Edit browser styles/scripts in `src/styles/` and `src/scripts/`.
All project pages use `src/pages/project.njk`; only projects explicitly marked `shown: true` get pages, original media, derivatives, and sitemap entries in public output.
Hidden archive entries can retain their existing disabled NDA labels, but have no public project page or media.
Source JSON and legacy media maps under `content/info/` are never uploaded.
Original hidden media remains locally available for future publication.
Build removes obsolete generated project pages even when its previous output cache is missing.

Original fonts keep their files, formats, and glyphs.
Web essays and their legacy shared assets pass through byte-for-byte; do not optimize or rewrite that section.
Keep service-worker registration disabled.
Keep archive preloading of the first two images per public project after text paint.
Build selects and hashes page-specific CSS/JS; never edit generated HTML or compiled assets directly.
Old `/theatre/` links use a static redirect to `/selected/`.

## Git and media backup

Git stores source, project JSON, fonts, generated HTML/CSS/JS, sitemap, and robots.
Media stays outside Git and goes directly to production through rsync.
Removing media from Git tracking preserves local files; older Git history remains unchanged.
Do not deploy by pulling the media-removal commit into the live checkout, because Git would delete previously tracked server media.
Keep project, showreel, and miscellaneous original assets in a separate media backup, including hidden originals.

```sh
npm run media:backup -- --to /absolute/path/to/new-media-backup
npm run media:restore -- --from /absolute/path/to/media-backup
```

Backup writes a checksum inventory outside source content and refuses an existing destination.
Restore verifies the entire backup before copying missing files and refuses conflicting local files or symlinks.
A fresh checkout needs its media restored before `media` and `build` can reproduce the website.
Generated derivatives can be recreated locally and are not required in the original-media backup.

## Static deployment

Deployment reads destination from ignored `.env.deploy.local` and uses existing SSH authentication.
Copy blank `.env.example` for a new machine; set private `DEPLOY_HOST` and `DEPLOY_PATH` locally.
Never commit real server addresses, SSH usernames, destination paths, or credentials.
Optional `DEPLOY_STATE_DIR` overrides ownership-state location outside web root.

For first migration from the old Git deployment, prepare an inventory locally before committing this update:

```sh
npm run deploy:prepare
```

This fingerprints the previous committed files, records its revision in ignored local settings, and contacts no server.
If that is not the deployed revision, use `npm run deploy:prepare -- PREVIOUS_DEPLOYED_REVISION`.
The ignored inventory is regenerated from the recorded revision if its cache is removed.
First deployment verifies server Git revision and file fingerprints before adopting ownership.
Matching old hidden pages/media, source JSON, and build tools are retired after successful uploads.
Unrelated server files remain untouched; changed private files stop deployment before uploads rather than being silently exposed or deleted.
Server Git metadata and hosting configuration are not moved or rewritten.

Run these commands manually on your local machine:

```sh
npm run deploy -- --dry-run
npm run deploy
```

Dry-run builds locally, performs read-only server checks, and previews uploads/deletions without remote writes.
Deployment freezes a separate local snapshot under the build lock, so later rebuilds cannot change its files or ownership hashes.
Only finished public output uploads, assets/media before HTML, using checksums to skip identical content.
Local machine and server need rsync 3+; server also needs POSIX shell, Git for initial migration, `sha256sum`, and `base64`.
Server permissions, ownership, groups, and web-server settings stay unchanged.
Deployment ownership manifests and locks stay outside public web root.
A failed transfer skips pruning and manifest advancement; some uploads may already have completed, so resolve failure and rerun.
Private ownership state records project IDs for original media and hashed derivatives, so both retire when their last owning project is hidden.
Other obsolete assets remain while HTML cache lifetime is unknown.
Set `--asset-retention-days N` only when N covers maximum HTML cache lifetime.
Use `--host`, `--path`, `--state-dir`, or `--legacy-manifest` for explicit overrides.
No build, preview, backup, or local check uploads to production.

## Verification

Run `npm run check` after a local build for links, public-output boundaries, build invariants, deployment safety, and media restoration.
Use `npm run test:e2e` for browser interaction changes.
Use `npm run audit` only when performance measurement is requested; saved reports are local, ignored artifacts.
Do not retry server authentication on the user's behalf; the user runs server checks and deployment commands manually.
