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

function createHtmlContent(project, mediaFiles, nextProjectId, prevProjectId) {
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
                <div class="id">
                    <h1>${project.id}</h1>
                </div>
                <div class="project-info-columns">
                    <div>
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
            <div id="prev-project" data-prev-id="${prevProjectId}">
                <span>previous</span>
            </div>
            <div id="next-project" data-next-id="${nextProjectId}">
                <span>next</span>
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

        // calculate next and previous project ids
        const nextProjectId = projects[index + 1]
            ? projects[index + 1].id.toUpperCase()
            : getRandomProjectId(projects, project.id);
        const prevProjectId = projects[index - 1]
            ? projects[index - 1].id.toUpperCase()
            : getRandomProjectId(projects, project.id);

        // create the html content
        const htmlContent = createHtmlContent(
            project,
            projectMedia,
            nextProjectId,
            prevProjectId
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

function getRandomProjectId(projects, currentProjectId) {
    let randomProject;
    do {
        randomProject = projects[Math.floor(Math.random() * projects.length)];
    } while (randomProject.id.toUpperCase() === currentProjectId);
    return randomProject.id.toUpperCase();
}


function main() {
    const projectsJsonPath = path.join(__dirname, '../../content/info/archive.json');
    const mediaMapPath = path.join(__dirname, '../../content/info/media-map.json');

    console.log(`Reading project data from ${projectsJsonPath}`);
    console.log(`Reading media map from ${mediaMapPath}`);

    const projectsData = JSON.parse(fs.readFileSync(projectsJsonPath, 'utf-8'));
    const mediaMap = JSON.parse(fs.readFileSync(mediaMapPath, 'utf-8'));

    const visibleProjects = projectsData.projects.filter(project => project.shown === true);

    createHtmlFiles(visibleProjects, mediaMap);
}

main();
