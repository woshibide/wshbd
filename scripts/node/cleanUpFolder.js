const fs = require('fs');
const path = require('path');
const readline = require('readline');

const archiveJsonPath = path.join(__dirname, '../../content/info/archive.json');
const inputDirectory = '/Users/usr/design/_portfolio/www/content/images';

const data = JSON.parse(fs.readFileSync(archiveJsonPath, 'utf8'));

const projectMap = new Map(data.projects.map(project => [project.id, project.brand]));

// Get the list of folders in the directory
const folders = fs.readdirSync(inputDirectory).filter(file => fs.statSync(path.join(inputDirectory, file)).isDirectory());

// Identify redundant folders
const redundantFolders = folders.filter(folder => !projectMap.has(folder));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const promptUser = () => {
  return new Promise((resolve) => {
    
    console.log('\nCorresponding project folders:');
    folders.forEach(folder => {
      if (projectMap.has(folder)) {
        console.log(`- ${folder}: ${projectMap.get(folder)}`);
      }
    });
    
    console.log('\n\n\nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n')
    console.log('Found redundant folders:');
    redundantFolders.forEach(folder => {
      console.log(`- ${folder} (no corresponding project)`);
    });

    rl.question(`\nDo you want to delete all redundant folders? (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
};

const cleanUpFolders = async () => {
  if (redundantFolders.length === 0) {
    console.log('No redundant folders found.');
    rl.close();
    return;
  }

  const shouldDelete = await promptUser();
  if (shouldDelete) {
    redundantFolders.forEach(folder => {
      fs.rmSync(path.join(inputDirectory, folder), { recursive: true, force: true });
      console.log(`Deleted folder: ${folder}`);
    });
  } else {
    console.log('No folders were deleted.');
  }

  rl.close();
};

cleanUpFolders();

