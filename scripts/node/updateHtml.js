const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const navTemplatePath = path.join(__dirname, '/templates/nav.html');
const footerTemplatePath = path.join(__dirname, '/templates/footer.html');

const navTemplate = fs.readFileSync(navTemplatePath, 'utf-8').trimEnd();
const buildTime = new Date();
const siteRoot = path.join(__dirname, '../..');

function formatAmsterdamTime(date) {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Amsterdam',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZoneName: 'short'
    }).format(date).toUpperCase();
}

function getLastImageAdditionTime() {
    try {
        const timestamp = execFileSync('git', [
            'log', '-1', '--format=%cI', '--diff-filter=A', '--', 'content/projects'
        ], { cwd: siteRoot, encoding: 'utf-8' }).trim();
        const date = new Date(timestamp);
        return timestamp && !Number.isNaN(date.getTime()) ? date : buildTime;
    } catch (error) {
        return buildTime;
    }
}

const buildTimeAmsterdam = formatAmsterdamTime(buildTime);
const lastImageAdditionTime = getLastImageAdditionTime();
const lastImageAdditionAmsterdam = formatAmsterdamTime(lastImageAdditionTime);
const footerTemplate = fs.readFileSync(footerTemplatePath, 'utf-8')
    .replace('{{BUILD_TIME_ISO}}', buildTime.toISOString())
    .replace('{{BUILD_TIME_AMSTERDAM}}', buildTimeAmsterdam)
    .replace('{{LAST_IMAGE_ADDITION_ISO}}', lastImageAdditionTime.toISOString())
    .replace('{{LAST_IMAGE_ADDITION_AMSTERDAM}}', lastImageAdditionAmsterdam);
const ignoredDirectories = new Set(['.git', 'node_modules', 'scripts']);

let updCount = 0;

// update <nav> and <footer> in an HTML file
function updateHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');

    // Replace existing content with templates
    // use regex to replace the existing nav section with the nav template
    content = content.replace(/<div id="menu-icon">[\s\S]*?<\/nav>/i, navTemplate);
    content = content.replace(/<footer[\s\S]*?<\/footer>/i, footerTemplate);

    fs.writeFileSync(filePath, content, 'utf-8');
}

function findHtmlFiles(dirPath) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (ignoredDirectories.has(file)) return;
            findHtmlFiles(filePath); // recursive search in subdirectories
        } else if (path.extname(file) === '.html') {
            updCount += 1;
            updateHtmlFile(filePath);
        }
    });

}

const targetDirectory = path.join(__dirname, '../..'); 

findHtmlFiles(targetDirectory);

console.log('Updated', updCount, 'html files with footer and nav');
