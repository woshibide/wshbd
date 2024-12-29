const fs = require('fs');
const path = require('path');

// define the error codes you want to generate pages for
const errorCodes = [400, 401, 403, 404, 500, 502, 503, 504];

// read the template file
const templatePath = path.join(__dirname, 'templates', 'error_template.html');
const template = fs.readFileSync(templatePath, 'utf-8');

// directory to output the generated error pages
const outputDir = path.join(__dirname, '..', '..', 'errors');

// ensure the output directory exists
if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });
}

// generate error pages
errorCodes.forEach((code) => {
    const errorPageContent = template.replace(/%ERROR_NUM%/g, code.toString());

    // create directory with the error code
    const errorDir = path.join(outputDir, code.toString());
    if (!fs.existsSync(errorDir)) {
        fs.mkdirSync(errorDir, { recursive: true });
    }

    // place `index.html` inside the error directory
    const outputPath = path.join(errorDir, 'index.html');
    fs.writeFileSync(outputPath, errorPageContent, 'utf-8');
});

console.log('Generated', errorCodes.length, 'error pages in', outputDir);