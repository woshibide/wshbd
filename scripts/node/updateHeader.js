const fs = require('fs');
const path = require('path');

const headerTemplatePath = path.join(__dirname, '/templates/header_template.html');
const headerTemplate = fs.readFileSync(headerTemplatePath, 'utf-8');

let updCount = 0;

// Helper function to sanitize text for HTML attributes
function sanitizeForHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;') // ampersands
        .replace(/"/g, '&quot;') // double quotes
        .replace(/'/g, '&#39;') // single quotes
        .replace(/</g, '&lt;') // less-than
        .replace(/>/g, '&gt;'); // greater-than
}

function updateHtmlFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf-8');
        let metaData = extractMetaData(content, filePath);

        // Create updated header with page-specific metadata
        let updatedHeader = headerTemplate
            .replace('{{KEYWORDS}}', metaData.keywords)
            .replace('{{DESCRIPTION}}', metaData.description)
            .replace('{{OG_TITLE}}', metaData.ogTitle)
            .replace('{{OG_DESCRIPTION}}', metaData.ogDescription)
            .replace('{{OG_URL}}', metaData.ogUrl)
            .replace('{{CHANGE_TITLE}}', metaData.title); 

        // Replace existing head with updated template
        content = content.replace(/<head>[\s\S]*?<\/head>/i, updatedHeader);

        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    } catch (error) {
        console.error(`Error updating ${filePath}:`, error.message);
        return false;
    }
}

// Extract existing metadata from HTML file or derive from filepath
function extractMetaData(content, filePath) {
    const metaData = {
        title: 'wshbd',
        keywords: 'design, creative coding, web design, editorial design',
        description: 'portfolio of graphic designer & developer Pyotr Goloub',
        ogTitle: 'works by Pyotr Goloub aka wshbd',
        ogDescription: 'work by graphic designer & developer Pyotr Goloub',
        ogUrl: 'https://wshbd.com/' // base URL with domain
    };

    const isRootIndex = path.resolve(filePath) === path.resolve(path.join(__dirname, '../../index.html'));
    if (isRootIndex) {
        metaData.title = 'wshbd';
        metaData.ogTitle = 'wshbd';
        metaData.ogUrl = 'https://wshbd.com/';
        return metaData;
    }

    // for archive pages
    const archiveMatch = filePath.match(/\/archive\/([^\/]+)\/index\.html$/);
    if (archiveMatch) {
        const projectId = archiveMatch[1];
        metaData.ogUrl = `https://wshbd.com/archive/${projectId}`; 
        
        try {
            const brandMatch = content.match(/<h2>(.*?)<\/h2>/i);
            if (brandMatch) {
                metaData.title = brandMatch[1]; // brand name as title
                metaData.ogTitle = `${brandMatch[1]} // wshbd`;
            } else {
                // If no brand name, use project ID
                metaData.title = projectId;
                metaData.ogTitle = `${projectId} // wshbd`;
            }

            // Extract keywords
            const keywordsMatch = content.match(/<meta name="keywords" content="(.*?)"/i);
            if (keywordsMatch) metaData.keywords = keywordsMatch[1];

            // Extract description or intro for project
            const introMatch = content.match(/<h3>(.*?)<\/h3>/i);
            if (introMatch) metaData.description = introMatch[1];
            metaData.ogDescription = metaData.description;
        } catch (error) {
            console.warn(`Warning: Could not extract metadata from ${filePath}`);
        }
    } else {
        // for non-archive pages, use folder name
        const pathParts = filePath.split('/');
        
        // find the containing folder name
        let folderName = "wshbd"; // fallback 
        
        if (pathParts.length >= 2) {
            const parentFolder = pathParts[pathParts.length - 2];
            if (parentFolder !== 'www' && parentFolder !== 'scripts') {
                folderName = parentFolder;
            }
        }
        
        const fileName = pathParts[pathParts.length - 1].replace('.html', '');
        
        if (fileName !== 'index') {
            metaData.title = `${fileName} // wshbd`;
            metaData.ogTitle = `${fileName} // wshbd`;
            metaData.ogUrl = `https://wshbd.com/${fileName}`;
            
        } else if (folderName === "www") {
            // If it's the main index.html (homepage)
            metaData.title = `${folderName}`;
            metaData.ogTitle = `${folderName} // wshbd`;
            metaData.ogUrl = "https://wshbd.com/"; // Root URL for homepage
        } else {
            metaData.title = `${folderName} // wshbd`;
            metaData.ogTitle = `${folderName} // wshbd`;
            metaData.ogUrl = `https://wshbd.com/${folderName}`;
        }
    }

    // sanitanization for html
    metaData.description = sanitizeForHtml(metaData.description);
    metaData.ogDescription = sanitizeForHtml(metaData.ogDescription);
    metaData.title = sanitizeForHtml(metaData.title);
    metaData.ogTitle = sanitizeForHtml(metaData.ogTitle);

    return metaData;
}

function findHtmlFiles(dirPath) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            findHtmlFiles(filePath); // recursive search in subdirectories
        } else if (path.extname(file) === '.html') {
            // skip header_template.html
            if (file === 'header_template.html') {
                console.log('Skipping header template file:', filePath);
                return;
            }
            
            if (updateHtmlFile(filePath)) {
                updCount += 1;
            }
        }
    });
}

const targetDirectory = path.join(__dirname, '../..');

findHtmlFiles(targetDirectory);

console.log('Updated', updCount, 'html files with head');