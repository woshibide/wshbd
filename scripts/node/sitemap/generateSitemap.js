const fs = require('fs');
const path = require('path');
const { create } = require('xmlbuilder2');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '../../..');
const IGNORE_FOLDERS = ['node_modules', '.git', 'node', 'errors', 'web-essays'];
const DOMAINS = ['https://wshbd.com'];
const ROBOTS_FILENAME = 'robots.txt';

let pageCount = 0;
let sitemapPath;

// Recursively get all HTML files
function getHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    
    const fullPath = path.join(dir, file);
    const relativePath = path.relative(ROOT_DIR, fullPath);

    const stat = fs.statSync(fullPath);

    // Split the relative path into its segments
    const pathSegments = relativePath.split(path.sep);

    // Check if any segment is in IGNORE_FOLDERS
    const shouldIgnore = pathSegments.some((segment) => IGNORE_FOLDERS.includes(segment));

    if (shouldIgnore) {
      return; // Skip this file or directory
    }

    if (stat.isDirectory()) {
      // Recurse into directories
      getHtmlFiles(fullPath, fileList);
    } else if (path.extname(fullPath) === '.html') {
      fileList.push('/' + relativePath.replace(/\\/g, '/'));
      pageCount += 1;
    }
  });

  return fileList;
}

function generateSitemap(htmlFiles) {
  DOMAINS.forEach((domain) => {

    const urlset = {
      urlset: {
        '@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
        url: htmlFiles.map((file) => ({
          loc: domain + file,
          changefreq: 'weekly',
          priority: '0.5',
        })),
      },
    };

    const xml = create(urlset).end({ prettyPrint: true });

    // Save sitemap with domain-specific name into ROOT_DIR
    sitemapPath = path.join(ROOT_DIR, `sitemap.xml`);
    fs.writeFileSync(sitemapPath, xml);
  });
}

function generateRobotsTxt() {
  let content = `User-agent: *\nDisallow:\n\n`;

  DOMAINS.forEach((domain) => {
    const domainName = domain.replace(/https?:\/\//, '').replace(/\./g, '_');
    content += `Sitemap: ${domain}/sitemap.xml\n`;
  });

  const robotsPath = path.join(ROOT_DIR, ROBOTS_FILENAME);
  fs.writeFileSync(robotsPath, content);
  console.log(`Generated ${robotsPath}`);
}

function main() {
  const htmlFiles = getHtmlFiles(ROOT_DIR);
  generateSitemap(htmlFiles);
  console.log(`Generated ${sitemapPath}`, 'with', pageCount, 'pages');
  generateRobotsTxt();
}

main();
