const fs = require('fs');
const path = require('path');

const archivePath = path.join(__dirname, '../../', 'content', 'info', 'archive.json');
const archiveData = readJSON(archivePath);

const templatePath = path.join(__dirname, './templates/index_template.html');
const outputPath = path.join(__dirname, '../../', 'index.html');

function readJSON(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading JSON from ${filePath}:`, error);
        return null;
    }
}




// extracts content from element with id 'extract-me' from provided HTML file
function getOtherPagesContent(htmlContent) {
    const extractMeMatch = htmlContent.match(/<(\w+)[^>]*id=["']extract-me["'][^>]*>([\s\S]*)<\/\1>/);
    // check if match is found and return only the content inside the tags
    if (extractMeMatch) {
        return extractMeMatch[2]; // return only the content inside the tags
    }
    return '';
}

// Helper function to split array into N nearly equal parts
function splitArrayIntoChunks(array, numChunks) {
    const chunks = [];
    const chunkSize = Math.ceil(array.length / numChunks);
    for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        chunks.push(array.slice(start, end));
    }
    return chunks;
}

function rewriteEmbeddedArchiveLinks(html) {
    // archive markup is embedded into root index, so item links must point to /archive/<id>/
    return html.replace(
        /(<a\s+class=["']item-id-link["']\s+href=["'])\.\/([^"']+\/)(["'])/g,
        '$1./archive/$2$3'
    );
}


function generateIndex() {

    if (!archiveData) {
        console.error('Error reading data files. Aborting.');
        return;
    }

    // get the main template
    let templateContent = fs.readFileSync(templatePath, 'utf-8');


    ////////////////////////////////////////////
    //  Include other pages inside main page  //
    ////////////////////////////////////////////
    
    // get newly generated pages
    // TODO: potentially a weak point in maintaining further
    const archiveContentPath = path.join(__dirname, '../../archive/index.html');
    const aboutContentPath = path.join(__dirname, '../../about/index.html');
    // const somethingContentPath = path.join(__dirname, '../../something/index.html');

    let archiveContent = '';
    let aboutContent = '';
    // let somethingContent = '';

    try {
        archiveContent = fs.readFileSync(archiveContentPath, 'utf-8');
        archiveContent = getOtherPagesContent(archiveContent);
        archiveContent = rewriteEmbeddedArchiveLinks(archiveContent);
    } catch (error) {
        console.error('Error reading archive content:', error.message);
    }

    try {
        aboutContent = fs.readFileSync(aboutContentPath, 'utf-8');
        aboutContent = getOtherPagesContent(aboutContent);
    } catch (error) {
        console.error('Error reading about content:', error.message);
    }

    // try {
    //     somethingContent = fs.readFileSync(somethingContentPath, 'utf-8');
    //     // extract the portion you want to include
    //     somethingContent = getOtherPagesContent(somethingContent);
    // } catch (error) {
    //     console.error('Error reading something content:', error.message);
    // }

    // Replace placeholders with actual content
    templateContent = templateContent.replace('<!-- ARCHIVE_CONTENT_PLACEHOLDER -->', archiveContent);
    templateContent = templateContent.replace('<!-- ABOUT_CONTENT_PLACEHOLDER -->', aboutContent);
    // templateContent = templateContent.replace('<!-- SOMETHING_CONTENT_PLACEHOLDER -->', somethingContent);

    // Write the final HTML to index.html
    fs.writeFileSync(outputPath, templateContent);
    console.log('index.html has been generated successfully.');
}

generateIndex();
// generate archive
// insert about
// generate something
