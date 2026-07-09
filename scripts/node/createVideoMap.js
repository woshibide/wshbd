const fs = require('fs');
const path = require('path');

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

function buildVideoMap(inputDir) {
    const videoMap = {};

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
            if (!videoExtensions.includes(ext)) {
                return;
            }

            const folderName = path.basename(dir);
            if (!videoMap[folderName]) {
                videoMap[folderName] = [];
            }

            const normalizedName = normalizeFileName(item);
            const normalizedPath = path.join(dir, normalizedName);

            if (normalizedName !== item) {
                fs.renameSync(fullPath, normalizedPath);
                console.log(`Renamed video: ${fullPath} -> ${normalizedPath}`);
            }

            videoMap[folderName].push(normalizedName);
        });
    }

    readDir(inputDir);

    Object.keys(videoMap).forEach(folder => {
        const deduped = Array.from(new Set(videoMap[folder]));
        videoMap[folder] = sortMediaNames(deduped);
    });

    return videoMap;
}

function mergeMaps(imageMap, videoMap) {
    const mediaMap = {};
    const allProjects = new Set([...Object.keys(imageMap), ...Object.keys(videoMap)]);

    allProjects.forEach(projectId => {
        const images = imageMap[projectId] || [];
        const videos = videoMap[projectId] || [];
        const merged = Array.from(new Set([...images, ...videos]));
        mediaMap[projectId] = sortMediaNames(merged);
    });

    return mediaMap;
}

function generateVideoAndMediaMaps(inputDir, imageMapPath, videoMapPath, mediaMapPath) {
    console.log('Starting video/media map generation...');
    console.log(`Input Directory: ${inputDir}`);

    const imageMap = readJSON(imageMapPath, {});
    const videoMap = buildVideoMap(inputDir);
    const mediaMap = mergeMaps(imageMap, videoMap);

    ensureDirForFile(videoMapPath);
    ensureDirForFile(mediaMapPath);

    fs.writeFileSync(videoMapPath, JSON.stringify(videoMap, null, 2), 'utf-8');
    fs.writeFileSync(mediaMapPath, JSON.stringify(mediaMap, null, 2), 'utf-8');

    console.log(`Wrote video map: ${videoMapPath}`);
    console.log(`Wrote media map: ${mediaMapPath}`);
    console.log('Video/media map generation completed.');
}

const args = process.argv.slice(2);
if (args.length !== 4) {
    console.error('Usage: node createVideoMap.js <input-directory> <image-map-path> <video-map-path> <media-map-path>');
    process.exit(1);
}

const [inputDirectory, imageMapPath, videoMapPath, mediaMapPath] = args;
generateVideoAndMediaMaps(inputDirectory, imageMapPath, videoMapPath, mediaMapPath);
