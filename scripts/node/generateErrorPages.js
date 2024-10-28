const fs = require('fs');
const path = require('path');

// Define the error codes you want to generate pages for
const errorCodes = [400, 401, 403, 404, 500, 502, 503, 504];

// Read the template file
const templatePath = path.join(__dirname, 'templates', 'error_template.html');
const template = fs.readFileSync(templatePath, 'utf-8');

// Directory to output the generated error pages
const outputDir = path.join(__dirname, '..', '..', 'errors');

// Ensure the output directory exists
if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });
}

// Generate error pages
errorCodes.forEach((code) => {
    const errorPageContent = template.replace(/%ERROR_NUM%/g, code.toString());
    const outputPath = path.join(outputDir, `${code}.html`); // Fixed path
    fs.writeFileSync(outputPath, errorPageContent, 'utf-8');
});

console.log('Generated', errorCodes.length + 1, `error pages in, ${outputDir}`);
