const fs = require('fs');
const path = require('path');

let projectCount = 0;

const videoMimeTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.m4v': 'video/mp4',
    '.ogv': 'video/ogg'
};

function sortMediaNames(mediaNames) {
    return [...mediaNames].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
}

function isVideoFile(fileName) {
    return Boolean(videoMimeTypes[path.extname(fileName).toLowerCase()]);
}

function renderProjectMedia(project, fileName) {
    if (isVideoFile(fileName)) {
        const ext = path.extname(fileName).toLowerCase();
        const mimeType = videoMimeTypes[ext] || 'video/mp4';
        return `
            <video class="project-media project-media-video" autoplay muted loop playsinline controls preload="metadata">
                <source src="/content/projects/${project.id}/${fileName}" type="${mimeType}">
            </video>`;
    }

    return `
            <img class="project-media project-media-image" src="/content/projects/${project.id}/${fileName}" alt="${project.title}">`;
}

function createHtmlContent(project, mediaFiles, nextProject, nextProjectPreview) {
    const metaKeywords = Array.isArray(project.hashtags) ? project.hashtags.join(', ') : 'designed by pyotr';

    let htmlContent = `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <!-- This head section will be replaced by updateHeader.js -->
    </head>

    <body class="project-page">
        <header>
            <div id="menu-icon"> </nav>
        </header>
        <main>
            <div class="project-info">
                <div class="project-info-columns">
                <div>
                        <h1>${project.id}</h1>
                        <h2>${project.brand}</h2>
                        <p>${project.title}</p>
                        <p>${project.location}</p>
                        <p>${project.date}</p>
                    </div>
                    <div>
                        <h3>${project.intro}</h3>
                        <p>${project.description}</p>
                    </div>
                </div>
            </div>
            <div class="solo-project-images">`;

    mediaFiles.forEach(fileName => {
        htmlContent += renderProjectMedia(project, fileName);
    });

    htmlContent += `
        </div>
    </main>

    <section>
        <div class="projects-navigator">
            <div class="next-project-panel">
                <div id="next-project" data-next-id="${nextProject.id}">
                    <span>NEXT PROJECT</span>
                </div>
                <a class="next-project-preview" href="/archive/${nextProject.id}/" aria-label="Next project: ${nextProject.title}">
                    <img src="/content/projects/${nextProject.id}/${nextProjectPreview}" alt="${nextProject.title}">
                    <span>${nextProject.title}, ${nextProject.date}</span>
                </a>
            </div>
        </div>
    </section>

    <footer> </footer>

    <script type="module" src="/scripts/scripts.js"></script>
    <script type="module" src="/scripts/utils.js"></script>

</body>
</html>`;

    return htmlContent;
}

function createHtmlFiles(projects, mediaMap) {
    // create html files for each project
    projects.forEach((project, index) => {
        projectCount += 1;
        project.id = project.id.toUpperCase();

        const projectMedia = sortMediaNames(mediaMap[project.id] || []);
        if (projectMedia.length === 0) {
            console.log(`>>> No media found for project ${project.id}. Skipping...`);
            return;
        }

        // Only projects in this already-filtered list can be navigation targets.
        const nextProject = getNextProjectWithPreview(projects, mediaMap, index);
        const nextProjectMedia = sortMediaNames(mediaMap[nextProject.id] || []);
        const nextProjectPreview = nextProjectMedia.find(fileName => !isVideoFile(fileName));

        // create the html content
        const htmlContent = createHtmlContent(
            project,
            projectMedia,
            nextProject,
            nextProjectPreview
        );

        // create directory with the project id
        const projectDir = path.join(__dirname, '../../archive', project.id);
        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }

        // place `index.html` inside the project directory
        const outputFile = path.join(projectDir, 'index.html');
        fs.writeFileSync(outputFile, htmlContent, 'utf-8');
    });
    console.log('Created', projectCount, 'project pages');
}

function getNextProjectWithPreview(projects, mediaMap, currentIndex) {
    for (let offset = 1; offset <= projects.length; offset += 1) {
        const candidate = projects[(currentIndex + offset) % projects.length];
        const media = mediaMap[candidate.id] || [];
        if (media.some(fileName => !isVideoFile(fileName))) {
            return candidate;
        }
    }

    throw new Error('At least one visible project needs an image for the next-project preview.');
}

function main() {
    const projectsJsonPath = path.join(__dirname, '../../content/info/archive.json');
    const mediaMapPath = path.join(__dirname, '../../content/info/media-map.json');

    console.log(`Reading project data from ${projectsJsonPath}`);
    console.log(`Reading media map from ${mediaMapPath}`);

    const projectsData = JSON.parse(fs.readFileSync(projectsJsonPath, 'utf-8'));
    const mediaMap = JSON.parse(fs.readFileSync(mediaMapPath, 'utf-8'));

    const visibleProjects = projectsData.projects
        .filter(project => project.shown === true)
        .map(project => ({ ...project, id: project.id.toUpperCase() }))
        .filter(project => {
            const media = mediaMap[project.id] || [];
            return media.length > 0;
        });

    createHtmlFiles(visibleProjects, mediaMap);
}

main();
