# Portfolio development

## Architecture

Site ships plain static HTML, CSS, JavaScript, fonts, and media.
Keep browser runtime framework-free.
Deployment target is read from ignored `.env.deploy.local` or explicit environment/CLI settings; hosting configuration stays unchanged.

- `src/pages.json` lists hand-authored pages; project routes must not be added here.
- `src/pages/` and `src/templates/` own page content and shared layouts.
- `content/info/archive.json` owns current project data, ordering, visibility, and selected status.
- `content/projects/` and `content/misc/` contain original public assets.
- `web-essays/` stays in place and passes through build unchanged.
- Original `styles/styles.css`, `styles/sections.css`, and shared scripts listed in `build/paths.mjs` are preserved legacy assets for excluded section.
- `src/styles/` and `src/scripts/` own editable browser assets.
- `build/` contains build, media, preview, validation, Lighthouse, and deployment tools.
- Portfolio root HTML, compiled CSS/JS, sitemap, robots, `.cache/site`, and optimized media are generated.
Excluded web essays and their legacy assets remain hand-authored exceptions.

Regenerate generated outputs; never edit them manually.
Do not optimize, minify, rewrite, or audit web essays without explicit user request.

## Commands

All npm commands, dependency installation, media preparation, and builds run locally only.
Never run `npm ci`, `npm run media`, or `npm run build` on the production server.
Production receives finished static files and only serves them.
Use Node 22.19 or newer and run `npm ci` after checkout.
Run `npm run media` explicitly when originals change; FFmpeg must be available for video derivatives.
Use `npm run media:backup -- --to DIRECTORY` for original-media backups outside source content.
Use `npm run media:restore -- --from DIRECTORY` to restore missing media after a fresh checkout without overwriting local edits.
Run `npm run build` to validate and generate output in existing published layout.
Run `npm run dev` to rebuild source changes and preview at `http://127.0.0.1:4173`.
Run `npm run preview` to inspect staged output without rebuilding.
Run `npm run check` for link, build-invariant, and deployment tests.
Run `npm run test:e2e` for desktop and mobile browser checks.
Set `CHROME_PATH` when Chromium lives outside default macOS location.
Set `CDP_URL=http://127.0.0.1:9222` to use an already-running audit browser.
Run `npm run audit -- --origin URL --label LABEL --output DIRECTORY` for three Lighthouse runs per route/device.
Add `--port 9222` to audit through an already-running browser.

## Performance and media

Declare page/component assets in build asset map; avoid adding unrelated CSS/JS to shared foundation.
Keep interaction classes, hover, focus, expanded states, and dynamically created media styled.
Warm the first two archive images per public project after initial text paint, with bounded background concurrency.
Keep remaining archive media deferred until hover or expansion.
Use `project-summary` and `project-description` for text roles and page-specific containers for layout.
Do not convert, subset, or replace existing fonts.
Do not modify or delete original media during build or preparation.
Keep service-worker registration disabled.
Use content-based asset hashes and deterministic build inputs.
Build must stop on invalid input and validate staged output before publishing locally.
Generate project pages and their sitemap entries only for projects explicitly marked `shown: true` in `content/info/archive.json`.
Publish original project media and derivatives only for those visible project IDs.
Never copy `content/info/` source JSON or legacy maps into public output.
Keep hidden originals locally; publication filtering must not delete or modify original files.
Use the shared `src/pages/project.njk` template for all project pages.
Remove stale generated project pages when projects are hidden or removed, even when the local build cache is missing.

## Deployment

Keep project media, showreels, optimized derivatives, and miscellaneous images outside Git.
Keep project JSON, existing fonts, generated HTML/CSS/JS, sitemap, and robots available to Git.
Use local rsync deployment to publish the complete finished website, including media, without passing media through GitHub.
Never delete local media when removing it from Git tracking or rewrite Git history without explicit instruction.
Do not pull media-removal commits into the live web root; Git would delete previously tracked server media.
Never require a server build.
`npm run deploy -- --dry-run` runs locally, builds, validates, and previews uploads and eligible deletions without remote writes.
`npm run deploy` runs locally and uploads staged public output, assets before HTML, using existing SSH authentication.
Override destination through `--host`, `--path`, and optionally `--state-dir`.
Keep actual server addresses, SSH usernames, destination paths, and credentials in ignored local configuration only.
Public `.env.example`, source, and documentation must contain no real deployment destination.
Missing destination settings must fail before building or contacting a server.
Keep deployment ownership state outside public web root.
Delete only manifest-owned stale files after successful transfers.
Preserve unknown remote files, server-modified files, and obsolete assets while HTML cache lifetime is unknown.
Set `--asset-retention-days N` only when N covers maximum HTML cache lifetime.
First deployment establishes ownership; it must not infer ownership of unrelated existing files.
For the Git-to-rsync migration, prepare a private legacy inventory from the previous deployed Git revision with `npm run deploy:prepare` locally.
Adopt legacy files only after matching server Git revision and fingerprints; preserve unrelated files.
Stop before uploads when inventory-owned private files differ on the server.
Retire known hidden project pages/media and source metadata after successful transfers, regardless of asset cache retention.
Record project ownership for hashed derivatives in private build/deployment state; hiding the last owning project must retire those derivatives as well.
Keep each deployment's local snapshot separate from `.cache/site` and capture it under the build lock.
Do not move or rewrite server Git metadata or hosting configuration.
The user runs server preflight and deployment commands manually; do not retry SSH authentication on their behalf without a new explicit instruction.
The rsync deployment must never upload source files, dependencies, credentials, tests, or audit reports.
Creating or testing deployment tooling does not authorize a production upload.

## Quality and collaboration

Preserve concurrent local edits.
Reproduce bugs through end-user browser behavior before fixing them.
Compare desktop and mobile screenshots and inspect typography, spacing, focus, navigation, and media states carefully.
Fix encountered check failures and flaky tests; do not hide failures with retries.
Prefer quality, simplicity, robustness, scalability, and maintainability over development cost.
Never manually modify changelogs or files marked auto-generated.
Write each full sentence of long Markdown documents on its own physical line.
Never use an em dash or emojis in code comments.
Never add an agent co-author to commit messages.
Use terse communication when requested; write code, commits, and PR descriptions normally.
