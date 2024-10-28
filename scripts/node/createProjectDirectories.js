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
            // If it doesn't exist, create the directory
            fs.mkdirSync(projectDir);
            console.log(`Created directory: ${projectDir}`);
            newDir += 1;
        } else {
            existDir += 1;
        }

    });
}

function main() {

    const archiveJsonPath = path.join(__dirname, '../../content/info/archive.json');
    const imagesDirectory = '/Users/usr/design/_portfolio/www/content/images';

    createProjectDirectories(archiveJsonPath, imagesDirectory);
    
    console.log('Checked', projectCount, 'projects');
    console.log('Created', newDir, 'new directories, found', existDir, 'directories');
}

main();
