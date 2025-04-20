const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');

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

// create readline interface for user input
function getUserInput(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

// to run python script
function runPythonScript(scriptName, args = '') {
    try {
        console.log(`\n\n >>>>> Running Python script ${scriptName}...`);
        execSync(`python3 ${scriptName} ${args}`, { stdio: 'inherit' });
        console.log(` >>>>> ${scriptName} completed successfully.`);
        executionResults.push({ script: scriptName, status: 'success' });
    } catch (error) {
        console.error(`\n>>>>> Error running Python script ${scriptName}:`, error.message);
        executionResults.push({ script: scriptName, status: 'failed', error: error.message });
    }
}

async function main() {
    const inputDirectory = '/Users/usr/design/_portfolio/www/content/images';
    const outputFilePath = path.join(__dirname, '..', '..', 'content', 'info', 'image-map.json');

    // should images be compressed
    const needsCompress = await getUserInput('compress images first? (y/n): ');
    if (needsCompress.toLowerCase() === 'y') {
        const pythonScript = path.join(__dirname, '.', 'image_compressor.py');

        // uses hardcoded values from the script
        runPythonScript(pythonScript, inputDirectory);
    }

    runScript('createImageMap.js', `${inputDirectory} ${outputFilePath}`);

    runScript('createProjectDirectories.js');
    runScript('cleanUpFolder.js');

    runScript('generateProjects.js');
    runScript('generateErrorPages.js');
    runScript('generateIndex.js');
    runScript('generateArchive.js');
    runScript('generateTheatre.js');

    runScript('updateHtml.js');
    runScript('updateHeader.js');
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