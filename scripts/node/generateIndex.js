const fs = require('fs');
const path = require('path');

const archivePath = path.join(__dirname, '../../', 'content', 'info', 'archive.json');
const archiveData = readJSON(archivePath);

const imageMapPath = path.join(__dirname, '../../', 'content', 'info', 'image-map.json');
const imageMapData = readJSON(imageMapPath);

const templatePath = path.join(__dirname, './templates/index_template.html');
const outputPath = path.join(__dirname, '../../', 'index.html');

const verticalProjectID = 'W04'; // none
const giantProjectID = 'B08';    // Ole

function readJSON(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading JSON from ${filePath}:`, error);
        return null;
    }
}

// Generate HTML for a standard spotlight project
function generateProjectHTML(project, imageMap) {
    const projectImages = imageMap[project.id] || [];
    const imageElements = projectImages.map((fileName, index) => {
        const imagePath = `/content/images/${project.id}/${fileName}`;
        // use data-src for lazy loading, load first few images immediately for smooth marquee start
        const shouldLoadImmediately = index < 3; // load first 3 images immediately
        const srcAttribute = shouldLoadImmediately ? `src="${imagePath}"` : `data-src="${imagePath}"`;
        const lazyClass = shouldLoadImmediately ? '' : ' lazy';
        return `
            <img ${srcAttribute} class="spotlight-gallery-image${lazyClass}" data-index="${index}" loading="lazy" alt="${project.title}">
        `;
    }).join('\n');

    // update counter format to remove brackets
    const imageCounter = projectImages.length > 0 ? `1/${projectImages.length}` : '';

    const projectHTML = `
    <li class="spotlight-project">
        <div class="project-wrapper">
            <div class="spotlight-info">
                <div class="spotlight-xtr-info">
                    <a href="/archive/${project.id}">
                        <p class="spotlight-brand">${project.brand}</p>
                    </a>
                    <p class="spotlight-title">${project.title}</p>
                </div>
                <p class="spotlight-description">${project.description}</p>
            </div>
            <div class="spotlight-gallery-container">
                <div class="spotlight-gallery">
                    ${imageElements}
                </div>
                <div class="spotlight-id">${project.id}</div>
            </div>
        </div>
    </li>
    `;
    return projectHTML;
}

// Generate HTML for a vertical template project
function generateVerticalProjectHTML(project, imageMap) {
    const projectImages = imageMap[project.id] || [];
    const imageElements = projectImages.map((fileName, index) => {
        const imagePath = `/content/images/${project.id}/${fileName}`;
        const isActive = index === 0 ? 'active' : '';
        // use data-src for lazy loading, except for the first image
        const srcAttribute = index === 0 ? `src="${imagePath}"` : `data-src="${imagePath}"`;
        const lazyClass = index === 0 ? '' : ' lazy';
        return `
            <img ${srcAttribute} class="spotlight-gallery-image ${isActive}${lazyClass}" loading="lazy" alt="${project.title}">
        `;
    }).join('\n');

    const imageCounter = projectImages.length > 0 ? `1/${projectImages.length}` : '';

    const verticalHTML = `
    <div class="spotlight-vertical">
        <div class="gallery">
            <div class="gallery-nav">
                <p class="project-id">${project.id}</p>
                <div class="vertical-image-counter">${imageCounter}</div>
            </div>
            ${imageElements}
        </div>
        <div class="xtr-info">
            <a href="/archive/${project.id}">${project.brand}</a>
            <p>${project.title}</p>
        </div>
    </div>
    `;
    return verticalHTML;
}


// Generate HTML for a giant template project
function generateGiantProjectHTML(project, imageMap) {
    const projectImages = imageMap[project.id] || [];
    const imageElements = projectImages.map((fileName, index) => {
        const imagePath = `/content/images/${project.id}/${fileName}`;
        const isActive = index === 0 ? 'active' : '';
        return `
            <img src="${imagePath}" class="spotlight-gallery-image ${isActive}" loading="lazy" alt="${project.title}">
        `;
    }).join('\n');

    const imageCounter = projectImages.length > 0 ? `[1/${projectImages.length}]` : '';

    const giantHTML = `
    <div class="spotlight-giant">
        <div class="image-counter">${imageCounter}</div>
        <div class="spotlight-giant-id">${project.id}</div>
        
        <div class="spotlight-giant-gallery">
            ${imageElements}
        </div>

        <div class="spotlight-giant-info">
            <div class="spotlight-giant-xtr-info">
                <a href="/archive/${project.id}">${project.brand}</a>
                <p class="spotlight-giant-title">${project.title}</p>
            </div>
            <p class="spotlight-giant-description">${project.description}</p>
        </div>
    </div>
    `;
    return giantHTML;
}



// extracts content from element with id 'extract-me' from provided HTML file
function getOtherPagesContent(htmlContent) {
    const extractMeMatch = htmlContent.match(/<(\w+)[^>]*id=["']extract-me["'][^>]*>([\s\S]*?)<\/\1>/);
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


function generateIndex() {


    if (!archiveData || !imageMapData) {
        console.error('Error reading data files. Aborting.');
        return;
    }

    // Count total number of spotlight projects
    const totalSpotlights = archiveData.projects.filter(p => p.spotlight).length;
    console.log('Spotlight projects:', totalSpotlights);

    // Fetch vertical and giant projects by ID
    const verticalProject = archiveData.projects.find(p => p.id === verticalProjectID);
    const giantProject = archiveData.projects.find(p => p.id === giantProjectID);

    if (!verticalProject) {
        console.error(`Vertical project with ID "${verticalProjectID}" not found.`);
    }
    if (!giantProject) {
        console.error(`Giant project with ID "${giantProjectID}" not found.`);
    }

    // Generate HTML for standard projects
    const standardProjects = archiveData.projects.filter(p => p.spotlight && p.id !== verticalProjectID && p.id !== giantProjectID);
    // const standardProjectsHTML = generateStandardProjectsHTML(standardProjects, imageMapData);

    // Generate HTML for vertical and giant projects
    let verticalProjectHTML = '';
    let giantProjectHTML = '';

    if (verticalProject) {
        verticalProjectHTML = generateVerticalProjectHTML(verticalProject, imageMapData);
    } else {
        console.error(`Vertical project with ID "${verticalProjectID}" not found.`);
    }

    if (giantProject) {
        giantProjectHTML = generateGiantProjectHTML(giantProject, imageMapData);
    } else {
        console.error(`Giant project with ID "${verticalProjectID}" not found.`);
    }

    // get the main template
    let templateContent = fs.readFileSync(templatePath, 'utf-8');

    // count placeholders to assure script was successfully executed
    const standardPlaceholder = '<!-- PROJECTS_PLACEHOLDER -->';
    const standardPlaceholderRegex = new RegExp(standardPlaceholder, 'g');
    const standardCount = (templateContent.match(standardPlaceholderRegex) || []).length;
    console.log('Standard project placeholders:', standardCount);

    // Split standard projects into chunks based on the number of placeholders
    const standardChunks = splitArrayIntoChunks(standardProjects, standardCount);
    console.log('Standard projects split into', standardChunks.length, 'chunks.');

    // Generate HTML for each chunk
    const standardChunksHTML = standardChunks.map(chunk => {
        let chunkHTML = '';
        chunk.forEach(project => {
            chunkHTML += generateProjectHTML(project, imageMapData);
        });
        return chunkHTML;
    });

    // Replace each <!-- PROJECTS_PLACEHOLDER --> with its corresponding chunk HTML
    let replacedStandardCount = 0;
    templateContent = templateContent.replace(standardPlaceholderRegex, () => {
        const html = standardChunksHTML[replacedStandardCount] || '';
        replacedStandardCount++;
        return html;
    });

    console.log('Inserted', replacedStandardCount, 'standard project chunks into the template.');

    // Replace vertical and giant project placeholders
    const verticalPlaceholder = '<!-- VERTICAL_PROJECT_PLACEHOLDER -->';
    if (verticalProjectHTML) {
        templateContent = templateContent.replace(verticalPlaceholder, verticalProjectHTML);
        console.log('Vertical Project HTML successfully inserted into template.');
    } else {
        console.error('Failed to insert vertical project HTML into template.');
    }

    const giantPlaceholder = '<!-- GIANT_PROJECT_PLACEHOLDER -->';
    if (giantProjectHTML) {
        templateContent = templateContent.replace(giantPlaceholder, giantProjectHTML);
        console.log('Giant Project HTML successfully inserted into template.');
    } else {
        console.error('Failed to insert giant project HTML into template.');
    }

    // Verify if all standard project chunks were inserted
    if (replacedStandardCount < standardChunks.length) {
        console.warn(`Not all standard project chunks were inserted. Expected: ${standardChunks.length}, Inserted: ${replacedStandardCount}`);
    }


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
