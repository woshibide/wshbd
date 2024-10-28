const fs = require('fs');
const path = require('path');

const archivePath = path.join(__dirname, '../../', 'content', 'info', 'archive.json');
const imageMapPath = path.join(__dirname, '../../', 'content', 'info', 'image-map.json');
const templatePath = path.join(__dirname, './templates/index_template.html');
const outputPath = path.join(__dirname, '../../', 'index.html');

const verticalProjectID = 'W04'; // MET Museum
const giantProjectID = 'B08';    // Ole

// Read and parse JSON files
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
        const isActive = index === 0 ? 'active' : '';
        return `
            <img src="${imagePath}" class="spotlight-gallery-image ${isActive}" loading="lazy" alt="${project.title}">
        `;
    }).join('\n');

    const imageCounter = projectImages.length > 0 ? `[1/${projectImages.length}]` : '';

    const projectHTML = `
    <li class="spotlight-project">
        <div class="project-wrapper">
            <div class="spotlight-gallery-container">
                ${imageElements}
                <div class="image-counter">${imageCounter}</div>
                <div class="spotlight-id">${project.id}</div>
            </div>
            <div class="spotlight-info">
                <div class="spotlight-xtr-info">
                    <a href="/archive/${project.id}.html">
                        <p class="spotlight-brand">${project.brand}</p>
                    </a>
                    <p class="spotlight-title">${project.title}</p>
                </div>
                <p class="spotlight-description">${project.description}</p>
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
        return `
            <img src="${imagePath}" class="spotlight-gallery-image ${isActive}" loading="lazy" alt="${project.title}">
        `;
    }).join('\n');


    const verticalHTML = `
    <div class="spotlight-vertical">
        <div class="xtr-info">
            <a href="/archive/${project.id}.html">${project.brand}</a>
            <p>${project.title}</p>
        </div>
        <div class="gallery">
            <div class="gallery-nav">
                <p class="project-id">${project.id}</p>
            </div>
            ${imageElements}
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
                <a href="/archive/${project.id}.html">${project.brand}</a>
                <p class="spotlight-giant-title">${project.title}</p>
            </div>
            <p class="spotlight-giant-description">${project.description}</p>
        </div>
    </div>
    `;
    return giantHTML;
}


// Generate HTML for all standard spotlight projects
function generateStandardProjectsHTML(projects, imageMap) {
    let projectsHTML = '';
    projects.forEach(project => {
        if (project.spotlight && project.id !== verticalProjectID && project.id !== giantProjectID) {
            const projectHTML = generateProjectHTML(project, imageMap);
            projectsHTML += projectHTML;
        }
    });
    return projectsHTML;
}

// Generate HTML for the vertical spotlight project
function generateVerticalProjectSection(project, imageMap) {
    return generateVerticalProjectHTML(project, imageMap);
}

// Generate HTML for the giant spotlight project
function generateGiantProjectSection(project, imageMap) {
    return generateGiantProjectHTML(project, imageMap);
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

// Main function to generate index.html
function generateIndex() {
    // Read data
    const archiveData = readJSON(archivePath);
    const imageMapData = readJSON(imageMapPath);

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
    const standardProjectsHTML = generateStandardProjectsHTML(standardProjects, imageMapData);

    // Generate HTML for vertical and giant projects
    let verticalProjectHTML = '';
    let giantProjectHTML = '';

    if (verticalProject) {
        verticalProjectHTML = generateVerticalProjectSection(verticalProject, imageMapData);
    }

    if (giantProject) {
        giantProjectHTML = generateGiantProjectSection(giantProject, imageMapData);
    }

    // Read the main template
    let templateContent = fs.readFileSync(templatePath, 'utf-8');

    // Count the number of <!-- PROJECTS_PLACEHOLDER --> in the template
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

    // Write the final HTML to index.html
    fs.writeFileSync(outputPath, templateContent);
    console.log('index.html has been generated successfully.');
}

generateIndex();
