// Prepares project media in public/content/projects for the web:
//   - file names become lowercase with underscores instead of spaces
//   - JPG/PNG become WebP, at most 1400 px on the long side and 500 KB, and the original is deleted
//   - oversized WebP files are recompressed in place
// GIF, SVG and video files are only renamed. Run `npm run media -- --dry-run` to preview.
// Another projects folder can be given as an argument: `npm run media -- path/to/projects`.
import { existsSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const MAX_DIMENSION = 1400;
const MAX_BYTES = 500_000;
const CONVERT = new Set(['.jpg', '.jpeg', '.png']);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const projectsDir = path.resolve(args.find(arg => !arg.startsWith('--')) || path.join(root, 'public/content/projects'));

const kb = bytes => `${(bytes / 1000).toFixed(1)} KB`;

// Highest WebP quality that fits the size limit, found by bisection.
async function encodeWebp(input) {
    // decode and resize once, uncompressed, so the image is only lossy-encoded at the end
    const { data, info } = await sharp(input, { animated: false })
        .rotate()
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .raw()
        .toBuffer({ resolveWithObject: true });
    const raw = { raw: { width: info.width, height: info.height, channels: info.channels } };
    let low = 1;
    let high = 99;
    let best = null;
    while (low <= high) {
        const quality = Math.floor((low + high) / 2);
        const output = await sharp(data, raw).webp({ quality, effort: 5 }).toBuffer();
        if (output.length <= MAX_BYTES) {
            best = output;
            low = quality + 1;
        } else {
            high = quality - 1;
        }
    }
    if (!best) throw new Error(`cannot get under ${kb(MAX_BYTES)} even at quality 1`);
    return best;
}

async function needsRecompression(file) {
    const { width, height } = await sharp(file).metadata();
    return statSync(file).size > MAX_BYTES || Math.max(width, height) > MAX_DIMENSION;
}

let changes = 0;
const failures = [];

for (const folder of readdirSync(projectsDir).sort()) {
    const folderPath = path.join(projectsDir, folder);
    if (!statSync(folderPath).isDirectory()) continue;

    for (const name of readdirSync(folderPath).sort()) {
        let file = path.join(folderPath, name);
        if (!statSync(file).isFile() || name.startsWith('.')) continue;

        const normalized = name.toLowerCase().replace(/\s+/g, '_');
        if (normalized !== name && existsSync(path.join(folderPath, normalized))) {
            failures.push(`${folder}/${name}: cannot rename, ${normalized} already exists`);
            continue;
        }
        if (normalized !== name) {
            console.log(`rename   ${folder}/${name} -> ${normalized}`);
            changes += 1;
            if (!dryRun) renameSync(file, path.join(folderPath, normalized));
            file = path.join(folderPath, normalized);
        }

        const extension = path.extname(normalized).toLowerCase();
        const convert = CONVERT.has(extension);
        if (!convert && !(extension === '.webp' && await needsRecompression(dryRun ? path.join(folderPath, name) : file))) continue;

        const target = convert ? file.slice(0, -extension.length) + '.webp' : file;
        const label = `${folder}/${path.basename(file)}`;
        changes += 1;
        if (dryRun) {
            console.log(`${convert ? 'convert ' : 'compress'} ${label}`);
            continue;
        }
        try {
            // only the first frame would survive; leave animations to be prepared by hand
            if ((await sharp(file).metadata()).pages > 1) throw new Error('animated image, left untouched');
            const before = statSync(file).size;
            const output = await encodeWebp(file);
            if (convert && statSync(target, { throwIfNoEntry: false })) throw new Error(`${path.basename(target)} already exists`);
            writeFileSync(target, output);
            if (convert) unlinkSync(file);
            console.log(`${convert ? 'convert ' : 'compress'} ${label}: ${kb(before)} -> ${kb(output.length)}`);
        } catch (error) {
            failures.push(`${label}: ${error.message}`);
        }
    }
}

console.log(changes ? `${changes} change${changes === 1 ? '' : 's'}${dryRun ? ' planned (dry run)' : ''}` : 'all media is ready');
if (failures.length) {
    console.error(`failed:\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
