const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// new function to install python dependencies and manage venv
function setupPythonEnvironment() {
    const venvPath = path.join(__dirname, 'venv');
    const requirementsPath = path.join(__dirname, 'requirements.txt');
    const pythonExecutable = path.join(venvPath, 'bin', 'python');
    const pipExecutable = path.join(venvPath, 'bin', 'pip');

    // 1. check if venv exists, if not create it
    if (!fs.existsSync(venvPath)) {
        console.log('python virtual environment not found, creating one...');
        try {
            execSync(`python3 -m venv ${venvPath}`, { stdio: 'inherit' });
            console.log('virtual environment created successfully.');
        } catch (error) {
            console.error('failed to create python virtual environment:', error.message);
            throw error; // stop the script if we can't create the venv
        }
    }

    // 2. install dependencies from requirements.txt using venv's pip
    if (fs.existsSync(requirementsPath)) {
        console.log('requirements.txt found, installing dependencies into venv...');
        try {
            execSync(`${pipExecutable} install -r ${requirementsPath}`, { stdio: 'inherit' });
            console.log('python dependencies installed successfully.');
        } catch (error) {
            console.error('failed to install python dependencies:', error.message);
            throw error; // stop the script if dependencies fail
        }
    }

    return { pythonExecutable };
}

// metadata cache file to track processed images
const CACHE_FILE = path.join(__dirname, '.image_cache.json');

// load metadata cache
function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const cacheData = fs.readFileSync(CACHE_FILE, 'utf8');
            return JSON.parse(cacheData);
        }
    } catch (error) {
        console.error('error loading cache:', error.message);
    }
    return {};
}

// save metadata cache
function saveCache(cache) {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (error) {
        console.error('error saving cache:', error.message);
    }
}

// generate file hash for content comparison - o(1) per file
function getFileHash(filePath) {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(fileBuffer).digest('hex');
    } catch (error) {
        console.error(`error reading file ${filePath}:`, error.message);
        return null;
    }
}

// get file metadata for change detection - o(1) per file
function getFileMetadata(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            size: stats.size,
            mtime: stats.mtime.getTime(),
            hash: getFileHash(filePath)
        };
    } catch (error) {
        console.error(`error getting metadata for ${filePath}:`, error.message);
        return null;
    }
}

// check if image needs processing based on cache - o(1) lookup
function needsProcessing(filePath, cache) {
    const cached = cache[filePath];
    if (!cached) {
        return true; // new file
    }
    
    const current = getFileMetadata(filePath);
    if (!current) {
        return false; // can't read file
    }
    
    // quick size and mtime check first (o(1))
    if (cached.size !== current.size || cached.mtime !== current.mtime) {
        return true; // file changed
    }
    
    // if size and mtime match but we want to be extra sure, check hash
    if (cached.hash !== current.hash) {
        return true; // content changed
    }
    
    return false; // file unchanged
}

// detect new or modified images efficiently - o(n) where n = number of images
function detectChangedImages(baseDir, cache) {
    console.log(`detecting new/changed images in: ${baseDir}`);
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
    const changedImages = new Map(); // dir -> [changed image paths]
    const newCache = {};
    
    function scanDirectory(dir) {
        try {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                
                try {
                    const stats = fs.statSync(fullPath);
                    
                    if (stats.isDirectory()) {
                        scanDirectory(fullPath);
                    } else {
                        const ext = path.extname(item).toLowerCase();
                        if (imageExtensions.includes(ext)) {
                            if (needsProcessing(fullPath, cache)) {
                                console.log(` detected change: ${fullPath}`);
                                
                                if (!changedImages.has(dir)) {
                                    changedImages.set(dir, []);
                                }
                                changedImages.get(dir).push(fullPath);
                            }
                            
                            // update cache with current metadata
                            const metadata = getFileMetadata(fullPath);
                            if (metadata) {
                                newCache[fullPath] = metadata;
                            }
                        }
                    }
                } catch (err) {
                    console.error(`error checking file ${fullPath}:`, err.message);
                }
            }
        } catch (err) {
            console.error(`error scanning directory ${dir}:`, err.message);
        }
    }
    
    scanDirectory(baseDir);
    
    // clean cache - remove entries for files that no longer exist
    Object.keys(cache).forEach(filePath => {
        if (fs.existsSync(filePath)) {
            if (!newCache[filePath]) {
                newCache[filePath] = cache[filePath]; // preserve unchanged files
            }
        }
        // if file doesn't exist, it's automatically removed from cache
    });
    
    return { changedImages, newCache };
}

// compress only directories with new/changed images - o(m) where m = number of changed directories
function processChangedImages(changedImages, newCache, originalCache, pythonExecutable) {
    if (changedImages.size === 0) {
        console.log(`no new or changed images detected`);
        return false;
    }
    
    const pythonScript = path.join(__dirname, '.', 'image_compressor.py');
    let anyDirProcessed = false;
    
    console.log(`\nfound ${changedImages.size} directories with new/changed images`);
    
    for (const [dir, imagePaths] of changedImages) {
        console.log(`\nprocessing ${imagePaths.length} changed images in: ${dir}`);
        imagePaths.forEach(imagePath => {
            console.log(` - ${path.basename(imagePath)}`);
        });
        
        try {
            execSync(`${pythonExecutable} ${pythonScript} ${dir}`, { stdio: 'inherit' });
            console.log(`image compression completed for ${dir}`);
            anyDirProcessed = true;
        } catch (error) {
            console.error(`\n error compressing images in ${dir}:`, error.message);
            // revert cache for this directory's images to their original state
            console.log(`reverting cache for failed directory: ${dir}`);
            imagePaths.forEach(imagePath => {
                if (originalCache[imagePath]) {
                    newCache[imagePath] = originalCache[imagePath]; // revert to old metadata
                } else {
                    delete newCache[imagePath]; // it was a new file, so remove it from cache
                }
            });
        }
    }
    
    return anyDirProcessed;
}

// utility function to clear cache and force reprocessing of all images
function clearCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            fs.unlinkSync(CACHE_FILE);
            console.log('cache cleared successfully');
        } else {
            console.log('no cache file found');
        }
    } catch (error) {
        console.error('error clearing cache:', error.message);
    }
}

// utility function to force process all images (ignores cache)
function forceProcessAllImages(baseDir) {
    console.log(`\nforce processing all images in: ${baseDir}`);
    clearCache();
    const { pythonExecutable } = setupPythonEnvironment();
    // we need to reload the empty cache after clearing
    const cache = loadCache();
    const { changedImages, newCache } = detectChangedImages(baseDir, cache);
    const processed = processChangedImages(changedImages, newCache, cache, pythonExecutable);
    saveCache(newCache);
    return processed;
}

// main function - new strategy for detecting and processing only changed images
function checkAndProcessImages(baseDir) {
    const { pythonExecutable } = setupPythonEnvironment();
    const originalCache = loadCache();
    const { changedImages, newCache } = detectChangedImages(baseDir, originalCache);
    
    const processed = processChangedImages(changedImages, newCache, originalCache, pythonExecutable);
    
    saveCache(newCache);
    return processed;
}

// run the script when called directly
if (require.main === module) {
    const baseDir = '/Users/usr/design/_portfolio/www/content/images';
    const args = process.argv.slice(2);
    
    if (args.includes('--force') || args.includes('-f')) {
        console.log('force mode: processing all images regardless of cache');
        const processed = forceProcessAllImages(baseDir);
        console.log(processed ? '\n force compression completed' : '\n force compression failed');
    } else if (args.includes('--clear-cache') || args.includes('-c')) {
        clearCache();
    } else if (args.includes('--help') || args.includes('-h')) {
        console.log('image compression script - efficient change detection');
        console.log('usage: node compressImages.js [options]');
        console.log('');
        console.log('options:');
        console.log('  --force, -f        force process all images (ignores cache)');
        console.log('  --clear-cache, -c  clear the metadata cache');
        console.log('  --help, -h         show this help message');
        console.log('');
        console.log('default: only process new or changed images');
    } else {
        // default: smart detection mode
        const processed = checkAndProcessImages(baseDir);
        
        if (processed) {
            console.log(`\ncompression process completed`);
        } else {
            console.log(`\nno compression needed - all images are up to date`);
        }
    }
}

module.exports = { 
    checkAndProcessImages,
    detectChangedImages,
    processChangedImages,
    clearCache,
    forceProcessAllImages
};
