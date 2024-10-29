const fs = require('fs');
const path = require('path');

let projectCount = 0;

function createHtmlContent(project, imageFiles) {
    const metaKeywords = Array.isArray(project.hashtags) ? project.hashtags.join(', ') : '';

    let htmlContent = `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="author" content="Pyotr Goloub">
    <meta name="keywords" content="${metaKeywords}">
    <meta name="description" content="portfolio of graphic designer & developer Pyotr Goloub">
    <meta property="og:title" content="works by wshbd">
    <meta property="og:image" content="/content/misc/og_1200x1200.png">
    <meta property="og:description" content="work by graphic designer & developer Pyotr Goloub">
    <meta property="og:url" content="wshbd.com">
    <meta name="twitter:card" content="/content/misc/og_1200x1200.png" />

    <title>wshbd // ${project.brand}</title>
    <link rel="icon" type="image/png" sizes="32x32" href="/content/misc/favicon_32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/content/misc/favicon_16x16.png">
    <link rel="icon" type="image/png" sizes="48x48" href="/content/misc/favicon_48x48.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/content/misc/favicon_192x192.png">
    <link rel="apple-touch-icon" type="image/png" sizes="167x167" href="/content/misc/favicon_167x167.png">
    <link rel="apple-touch-icon" type="image/png" sizes="180x180" href="/content/misc/favicon_180x180.png">
    <link rel="shortcut icon" type="image/png" href="/content/misc/favicon_180x180.png" />

    <link rel="stylesheet" href="https://use.typekit.net/dxz4nuq.css">
    <link rel="stylesheet" href="/styles/styles.css">
    <link rel="stylesheet" href="/styles/sections.css">
</head>

<body>
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
        <div class="images">`;

    imageFiles.forEach(image => {
        htmlContent += `\n            <img src="/content/images/${project.id}/${image}" alt="${project.title}">`;
    });

    htmlContent += `
        </div>
    </main>
    <footer> </footer>

    <script type="module" src="/scripts/scripts.js"></script>
    <script type="module" src="/scripts/utils.js"></script>

</body>
</html>`;
    
    return htmlContent;
}

function createHtmlFiles(projects, imageMap) {
    projects.forEach(project => {
        projectCount += 1;
        // Convert project.id to uppercase here
        project.id = project.id.toUpperCase();
        
        const projectImages = imageMap[project.id] || [];
        if (projectImages.length === 0) {
            console.log(`>>> No images found for project ${project.id}. Skipping...`);
            return;
        }

        const htmlContent = createHtmlContent(project, projectImages);

        const outputFile = path.join(__dirname, '../../archive', `${project.id}.html`);
        fs.writeFileSync(outputFile, htmlContent, 'utf-8');
        
    });
    console.log('Created', projectCount, 'project pages');
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
