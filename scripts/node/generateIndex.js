const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'templates/index_template.html');
const outputPath = path.join(__dirname, '../../index.html');

fs.copyFileSync(templatePath, outputPath);
console.log('index.html has been generated successfully.');
