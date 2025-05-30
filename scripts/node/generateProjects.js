const fs = require('fs');
const path = require('path');

let projectCount = 0;

function createHtmlContent(project, imageFiles, nextProjectId, prevProjectId) {
    const metaKeywords = Array.isArray(project.hashtags) ? project.hashtags.join(', ') : 'designed by wshbd';

    let htmlContent = `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <!-- This head section will be replaced by updateHeader.js -->
    </head>

    <body>
        <header>
            <div id="menu-icon"> </nav>
        </header>
        <main>
            <div class="project-info">
                <div class="id">
                    <h1>${project.id}</h1>
                </div>
                <br><br><br>
                <h2>${project.brand}</h2>
                <p>${project.title}</p>
                <p>${project.location}</p>
                <p>${project.date}</p>
                <br>
                <h3>${project.intro}</h3>
                <p>${project.description}</p>
            </div>
            <div class="solo-project-images">`;

    imageFiles.forEach(image => {
        htmlContent += `\n            <img src="/content/images/${project.id}/${image}" alt="${project.title}">`;
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

function createHtmlFiles(projects, imageMap) {
    // create html files for each project
    projects.forEach((project, index) => {
        projectCount += 1;
        project.id = project.id.toUpperCase();

        const projectImages = imageMap[project.id] || [];
        if (projectImages.length === 0) {
            console.log(`>>> No images found for project ${project.id}. Skipping...`);
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
            projectImages,
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
    const imageMapPath = path.join(__dirname, '../../content/info/image-map.json');

    console.log(`Reading project data from ${projectsJsonPath}`);
    console.log(`Reading image map from ${imageMapPath}`);

    const projectsData = JSON.parse(fs.readFileSync(projectsJsonPath, 'utf-8'));
    const imageMap = JSON.parse(fs.readFileSync(imageMapPath, 'utf-8'));

    createHtmlFiles(projectsData.projects, imageMap);
}

main();
