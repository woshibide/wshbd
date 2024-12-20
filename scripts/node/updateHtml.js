const fs = require('fs');
const path = require('path');

const navTemplatePath = path.join(__dirname, '/templates/nav.html');
const footerTemplatePath = path.join(__dirname, '/templates/footer.html');

const navTemplate = fs.readFileSync(navTemplatePath, 'utf-8');
const footerTemplate = fs.readFileSync(footerTemplatePath, 'utf-8');

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