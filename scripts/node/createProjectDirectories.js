const fs = require('fs');
const path = require('path');


let existDir = 0;
let newDir = 0; 
let projectCount = 0;

function createProjectDirectories(jsonFilePath, imagesDirectory) {
    // Read the archive.json file
    const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

    // Iterate through each project in the JSON file
    data.projects.forEach(project => {
        projectCount += 1;
        const projectDir = path.join(imagesDirectory, project.id);
        
        // Check if the directory exists
        if (!fs.existsSync(projectDir)) {
            // if it doesn't exist, create the directory (use recursive for safety)
            fs.mkdirSync(projectDir, { recursive: true });
            console.log(`Created directory: ${projectDir}`);
            newDir += 1;
        } else {
            existDir += 1;
        }

    });
}

function main() {

    const archiveJsonPath = path.join(__dirname, '../../content/info/archive.json');
    const args = process.argv.slice(2);
    const imagesDirectory = args[0] || process.env.IMAGES_DIR || path.join(__dirname, '..', '..', 'content', 'images');

    createProjectDirectories(archiveJsonPath, imagesDirectory);
    
    console.log('Checked', projectCount, 'projects');
    console.log('Created', newDir, 'new directories, found', existDir, 'directories');
}

main();
