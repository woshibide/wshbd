const fs = require('fs');
const path = require('path');

// Supported image extensions
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg'];

let dirCount = 0;
let imgCount = 0;

function generateImageMap(inputDir, outputPath) {
    console.log(`Starting to generate image map...`);
    console.log(`Input Directory: ${inputDir}`);
    console.log(`Output Path: ${outputPath}`);
    
    const imageMap = {};

    // Recursively read directories
    function readDir(dir) {
        dirCount += 1;
        const items = fs.readdirSync(dir);
        let foundImages = false;

        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // If it's a directory, recursively read it
                readDir(fullPath);
            } else {
                const ext = path.extname(item).toLowerCase();
                if (imageExtensions.includes(ext)) {
                    imgCount += 1;

                    foundImages = true;
                    const folderName = path.basename(dir);

                    // Create directory entry if it doesn't exist
                    if (!imageMap[folderName]) {
                        imageMap[folderName] = [];
                    }

                    // Prepare the new name
                    const newName = item.toLowerCase().replace(/\s+/g, '_');
                    const newPath = path.join(dir, newName);

                    // Rename the file if the name has changed
                    if (newName !== item) {
                        console.log(`Renaming file: ${fullPath} to ${newPath}`);
                        fs.renameSync(fullPath, newPath);
                    }

                    // Add the image to the map
                    imageMap[folderName].push(newName);
                }
            }
        });
    }

    readDir(inputDir);

    // Ensure the output path is a file and not a directory
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        console.log(`Output directory does not exist, creating: ${outputDir}`);
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the image map to the specified output file
    console.log(`Writing image map to ${outputPath}`);
    fs.writeFileSync(outputPath, JSON.stringify(imageMap, null, 2), 'utf-8');
    console.log('Image map generation completed.');
    console.log('Added images', imgCount, 'in', dirCount, 'directories');
}

const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error('Usage: node createImageMap.js <input-directory> <output-path>');
    process.exit(1);
}

const [inputDirectory, outputFilePath] = args;

generateImageMap(inputDirectory, outputFilePath);
