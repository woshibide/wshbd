const fs = require('fs');
const path = require('path');

const archivePath = path.join(__dirname, '../../content/info/archive.json');
const templatePath = path.join(__dirname, './templates/archive_template.html');
const outputPath = path.join(__dirname, '../../archive/index.html');

projectCount = 0;

function readJSON(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading JSON from ${filePath}:`, error);
        return null;
    }
}

// Function to extract unique hashtags
function extractUniqueHashtags(projects) {
    const hashtagsSet = new Set();

    projects.forEach(project => {
        projectCount += 1;
        if (project.hashtags) {
            project.hashtags.split(',').forEach(tag => {
                hashtagsSet.add(tag.trim());

            });
        }
    });
    console.log('found', hashtagsSet.size, 'unique hashtags, in', projectCount, 'projects');
    return Array.from(hashtagsSet);
}

// Function to generate the hashtag pool HTML
function generateHashtagPoolHTML(hashtags) {

    let html = `

    <div class="hashtag-container">
        <h2>project scope</h2>
        <ul class="hashtag-pool">
            <li class="hashtag" id="hashtag-reset" data-tag="reset">scope:~# clear</li>`;

    hashtags.forEach(tag => {
        html += `<li class="hashtag" data-tag="${tag}">${tag}</li>`;
    });

    html += `
        </ul>
    </div>
    `;

    return html;
}

// Function to generate archive items HTML
function generateArchiveItemsHTML(projects) {
    let html = '';
    projectCount = 0;
    projects.forEach(project => {
        projectCount += 1;

        const hashtags = project.hashtags ? project.hashtags.split(',').map(tag => tag.trim()) : [];
        const hashtagsHTML = hashtags.map(tag => `<p class="hashtag">${tag}</p>`).join('');

        const hashtagsDiv = `
            <div class="hashtags-line" style="display: none;">
                ${hashtagsHTML}
            </div>
        `;

        const idLetter = project.id.match(/[A-Za-z]+/)[0];
        const idNumber = project.id.match(/\d+/)[0];


        const archiveItem = `
<div class="archive-item" id="${project.id}">
<div class="item-id" id="id">
    <div class="id-letter">${idLetter}</div>
    <div class="id-number">${idNumber}</div>
</div>
    <a href="/archive/${project.id}">
    <div class="item-info" id="who">${project.brand}</div>
    </a>
    <div class="item-info" id="what">${project.title}</div>
    <div class="item-info" id="when">${project.date}</div>
    ${hashtagsDiv}
    <div class="image-container"></div>
</div>
`;


        html += archiveItem;
    });

    console.log('Created', projectCount, 'list items for archive');
    return html;
}

function generateArchive() {
    // Read data
    const archiveData = readJSON(archivePath);
    if (!archiveData) {
        console.error('Error reading archive data. Aborting.');
        return;
    }

    const uniqueHashtags = extractUniqueHashtags(archiveData.projects);

    const hashtagPoolHTML = generateHashtagPoolHTML(uniqueHashtags);
    const archiveItemsHTML = generateArchiveItemsHTML(archiveData.projects);

    let templateContent = fs.readFileSync(templatePath, 'utf8');

    let finalHTML = templateContent.replace('<!-- HASHTAG_CONTAINER_PLACEHOLDER -->', hashtagPoolHTML);
    finalHTML = finalHTML.replace('<!-- ARCHIVE_ITEMS_PLACEHOLDER -->', archiveItemsHTML);

    fs.writeFileSync(outputPath, finalHTML);
}

generateArchive();
