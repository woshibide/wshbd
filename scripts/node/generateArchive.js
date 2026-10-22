const fs = require('fs');
const path = require('path');

const archivePath = path.join(__dirname, '../../content/info/archive.json');
const mediaMapPath = path.join(__dirname, '../../content/info/media-map.json');
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

function escapeAttribute(value) {
    return String(value).replace(/[&"<>]/g, character => ({
        '&': '&amp;',
        '"': '&quot;',
        '<': '&lt;',
        '>': '&gt;'
    })[character]);
}

function generateMediaHTML(projectId, mediaFiles) {
    return mediaFiles.map(fileName => {
        const source = fileName.startsWith('/')
            ? fileName
            : `/content/projects/${projectId}/${fileName}`;
        const safeSource = escapeAttribute(source);
        const safeProjectId = escapeAttribute(projectId);

        if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(fileName)) {
            const mimeType = {
                mp4: 'video/mp4',
                webm: 'video/webm',
                mov: 'video/quicktime',
                m4v: 'video/mp4',
                ogv: 'video/ogg'
            }[fileName.split('.').pop().toLowerCase()];
            const posterSource = source.replace(/\.[^.]+$/, '-poster.webp');

            return `<video class="archive-media-item archive-media-video" poster="${escapeAttribute(posterSource)}" muted loop playsinline controls preload="none"><source src="${safeSource}" type="${mimeType}"></video>`;
        }

        return `<img class="archive-media-item" src="${safeSource}" alt="${safeProjectId}" loading="eager" decoding="async">`;
    }).join('');
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

    <section class="hashtag-container archive-areas" aria-labelledby="archive-areas-title">
        <h2 id="archive-areas-title" class="archive-section-title">Areas</h2>
        <ul class="hashtag-pool">
            <li class="hashtag hashtag--reset" id="hashtag-reset" data-tag="reset">
                <button class="hashtag-button" type="button">~ % RESET SCOPE</button>
            </li>`;

    hashtags.forEach(tag => {
        html += `<li class="hashtag" data-tag="${tag}"><button class="hashtag-button" type="button" aria-pressed="false">${tag}</button></li>`;
    });

    html += `
        </ul>
    </section>
    `;

    return html;
}

// Function to generate archive items HTML
function generateArchiveItemsHTML(projects, mediaMap) {
    let html = '';
    projectCount = 0;
    const seenProjectIds = new Map();
    projects.forEach(project => {
        projectCount += 1;

        const isShown = project.shown !== false;

        const hashtags = project.hashtags ? project.hashtags.split(',').map(tag => tag.trim()) : [];
        const hashtagsHTML = hashtags.map(tag => `<p class="hashtag">${tag}</p>`).join('');

        const hashtagsDiv = `
            <div class="hashtags-line" style="display: none;">
                ${hashtagsHTML}
            </div>
        `;

        const idLetter = project.id.match(/[A-Za-z]+/)[0];
        const idNumber = project.id.match(/\d+/)[0];
        const idOccurrence = (seenProjectIds.get(project.id) || 0) + 1;
        const domId = idOccurrence === 1 ? project.id : `${project.id}-${idOccurrence}`;
        seenProjectIds.set(project.id, idOccurrence);

        const mediaFiles = mediaMap[project.id] || ['/content/misc/non-image.svg'];
        const mediaHTML = generateMediaHTML(project.id, mediaFiles);


        const archiveItem = `
<details class="archive-item${isShown ? '' : ' archive-item--hidden'}" id="${domId}" data-project-id="${project.id}" data-shown="${isShown}" aria-disabled="${isShown ? 'false' : 'true'}"${isShown ? '' : ' inert'}>
    <summary class="archive-summary">
      <span class="archive-summary-content">
    ${isShown ? `<a class="item-id-link" href="./${project.id}/" aria-label="Open project ${project.id}">` : `<span class="item-id-link item-id-link--disabled">`}
        <span class="item-id" data-field="id">
            <span class="id-letter">${idLetter}</span>
            <span class="id-number">${idNumber}</span>
        </span>
    ${isShown ? `</a>` : `</span>`}
    <span class="item-info" data-field="who">${project.brand}</span>
    <span class="item-info" data-field="what">${project.title}</span>
    <span class="item-info" data-field="when">${project.date}</span>
      </span>
      <span class="image-container">${mediaHTML}</span>
    </summary>
    ${hashtagsDiv}
</details>
`;


        html += archiveItem;
    });

    console.log('Created', projectCount, 'list items for archive');
    return html;
}

function generateArchive() {
    // Read data
    const archiveData = readJSON(archivePath);
    const mediaMap = readJSON(mediaMapPath);
    if (!archiveData || !mediaMap) {
        console.error('Error reading archive data. Aborting.');
        return;
    }

    const allProjects = archiveData.projects;

    const uniqueHashtags = extractUniqueHashtags(allProjects);

    const hashtagPoolHTML = generateHashtagPoolHTML(uniqueHashtags);
    const archiveItemsHTML = generateArchiveItemsHTML(allProjects, mediaMap);

    let templateContent = fs.readFileSync(templatePath, 'utf8');

    let finalHTML = templateContent.replace('<!-- HASHTAG_CONTAINER_PLACEHOLDER -->', hashtagPoolHTML);
    finalHTML = finalHTML.replace('<!-- ARCHIVE_ITEMS_PLACEHOLDER -->', archiveItemsHTML);

    fs.writeFileSync(outputPath, finalHTML);
}

generateArchive();
