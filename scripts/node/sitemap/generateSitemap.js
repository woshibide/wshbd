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
    // create a date object for the lastmod element
    const today = new Date().toISOString().split('T')[0];
    
    const urlset = {
      urlset: {
        '@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
        url: htmlFiles.map((file) => {
          // determine priority based on path depth - homepage gets highest priority
          const depth = (file.match(/\//g) || []).length;
          const priority = Math.max(0.1, 1.0 - (depth * 0.2)).toFixed(1);
          
          return {
            loc: domain + file,
            lastmod: today,
            // dynamic change frequency based on path depth
            changefreq: depth <= 1 ? 'weekly' : 'monthly',
            priority: file === '/' || file === '/index.html' ? '1.0' : priority,
          };
        }),
      },
    };

    const xml = create(urlset).end({ prettyPrint: true });

    // check if we're exceeding the 50,000 url limit or 10mb size limit
    if (htmlFiles.length > 50000 || xml.length > 10 * 1024 * 1024) {
      console.warn('warning: sitemap exceeds recommended size limits');
    }
    
    sitemapPath = path.join(ROOT_DIR, `sitemap.xml`);
    fs.writeFileSync(sitemapPath, xml);
    
    // log sitemap size for monitoring
    console.log(`generated sitemap with ${htmlFiles.length} urls (${(xml.length / 1024).toFixed(2)} kb)`);
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
