const { execSync } = require('child_process');
const path = require('path');


const executionResults = [];

function runScript(scriptName, args = '') {
    const scriptPath = path.join(__dirname, scriptName);
    try {
        console.log(`\n\n >>>>> Running ${scriptName}...`);
        execSync(`node ${scriptPath} ${args}`, { stdio: 'inherit' });
        console.log(` >>>>> ${scriptName} completed successfully.`);
        // Record success
        executionResults.push({ script: scriptName, status: 'success' });
    } catch (error) {
        console.error(`\n@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n
                         @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n
                         @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n >>>>> Error running ${scriptName}:`, error.message);
        // Record failure with error message
        executionResults.push({ script: scriptName, status: 'failed', error: error.message });
    }
}

function main() {


    runScript('createProjectDirectories.js');
    runScript('cleanUpFolder.js');
    
    // image map
    const inputDirectory = '/Users/usr/design/_portfolio/www/content/images';
    const outputFilePath = path.join(__dirname, '..', '..', 'content', 'info', 'image-map.json');
    runScript('createImageMap.js', `${inputDirectory} ${outputFilePath}`);
    

    runScript('generateProjects.js');
    runScript('generateErrorPages.js');
    runScript('generateIndex.js');
    runScript('generateArchive.js');
    runScript('generateSomething.js');

    runScript('updateHtml.js');
    runScript('/sitemap/generateSitemap.js');

    // summary
    console.log('\n\n');
    executionResults.forEach(result => {
        if (result.status === 'success') {
            console.log(`[ ✅ ] - ${result.script}`);
        } else {
            console.log(`[ ❌ ] - ${result.script}\n${result.error}\n`);
        }
    });
}

main();

console.log('\n');