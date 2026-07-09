const fs = require('fs');
const path = require('path');

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
const videoExtensions = ['.mp4', '.webm', '.mov', '.m4v', '.ogv'];

function sortMediaNames(names) {
    return [...names].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
}

function readJSON(filePath, fallback = {}) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.warn(`Could not read JSON from ${filePath}. Using fallback.`);
        return fallback;
    }
}

function ensureDirForFile(filePath) {
    const outputDir = path.dirname(filePath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
}

function normalizeFileName(fileName) {
    return fileName.toLowerCase().replace(/\s+/g, '_');
}

function buildMediaMap(inputDir) {
    const mediaMap = {};

    function readDir(dir) {
        const items = fs.readdirSync(dir).sort();

        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                readDir(fullPath);
                return;
            }

            const ext = path.extname(item).toLowerCase();
            if (!imageExtensions.includes(ext) && !videoExtensions.includes(ext)) {
                return;
            }

            const folderName = path.basename(dir);
            if (!mediaMap[folderName]) {
                mediaMap[folderName] = [];
            }

            const normalizedName = normalizeFileName(item);
            const normalizedPath = path.join(dir, normalizedName);

            if (normalizedName !== item) {
                fs.renameSync(fullPath, normalizedPath);
                console.log(`Renamed media: ${fullPath} -> ${normalizedPath}`);
            }

            mediaMap[folderName].push(normalizedName);
        });
    }

    readDir(inputDir);

    Object.keys(mediaMap).forEach(folder => {
        const deduped = Array.from(new Set(mediaMap[folder]));
        mediaMap[folder] = sortMediaNames(deduped);
    });

    return mediaMap;
}

function generateMediaMap(inputDir, mediaMapPath) {
    console.log('Starting media map generation...');
    console.log(`Input Directory: ${inputDir}`);

    ensureDirForFile(mediaMapPath);

    const mediaMap = buildMediaMap(inputDir);
    fs.writeFileSync(mediaMapPath, JSON.stringify(mediaMap, null, 2), 'utf-8');

    console.log(`Wrote media map: ${mediaMapPath}`);
    console.log('Media map generation completed.');
}

const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error('Usage: node createVideoMap.js <input-directory> <media-map-path>');
    process.exit(1);
}

const [inputDirectory, mediaMapPath] = args;
generateMediaMap(inputDirectory, mediaMapPath);
