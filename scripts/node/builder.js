const { execSync } = require('child_process');
const path = require('path');
const { checkAndProcessImages } = require('./compressImages');

// complete portfolio build process
async function buildPortfolio() {
    const inputDirectory = '/Users/usr/design/_portfolio/www/content/images';
    const outputFilePath = path.join(__dirname, '..', '..', 'content', 'info', 'image-map.json');
    const executionResults = [];

    // helper function to run scripts with error tracking
    function runScript(scriptName, args = '') {
        const scriptPath = path.join(__dirname, scriptName);
        try {
            console.log(`\n >>>>> running ${scriptName}...`);
            execSync(`node ${scriptPath} ${args}`, { stdio: 'inherit' });
            console.log(` >>>>> ${scriptName} success`);
            executionResults.push({ script: scriptName, status: 'success' });
        } catch (error) {
            console.error(`\n >>>>> error running ${scriptName}:`, error.message);
            executionResults.push({ script: scriptName, status: 'failed', error: error.message });
        }
    }

    console.log('\n🚀 starting build...\n');

    // step 1: process images
    runScript('compressImages.js');
    runScript('createImageMap.js', `${inputDirectory} ${outputFilePath}`);
    
    // step 3: setup and cleanup
    runScript('createProjectDirectories.js');
    runScript('cleanUpFolder.js');

    // step 4: generate pages
    runScript('generateProjects.js');
    runScript('generateErrorPages.js');
    runScript('generateIndex.js');
    runScript('generateArchive.js');
    runScript('generateTheatre.js');

    // step 5: update and finalize
    runScript('updateHtml.js');
    runScript('updateHeader.js');
    runScript('./sitemap/generateSitemap.js');

    // build summary
    console.log('\n\n🎯 build summary:');
    console.log('━'.repeat(30));
    executionResults.forEach(result => {
        const icon = result.status === 'success' ? '✅' : '❌';
        console.log(`${icon} ${result.script}`);
        if (result.error) console.log(`   ${result.error}\n`);
    });
    
    const successCount = executionResults.filter(r => r.status === 'success').length;
    const totalCount = executionResults.length;
    if (totalCount == successCount){
        console.log('\n🚀 TOTAL SUCCESS 🚀\n')
    } else {
        console.log(`\n🏁 completed: ${successCount}/${totalCount} scripts successful\n`);
    }
}

// run the build
buildPortfolio();