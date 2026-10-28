import { DESCRIPTION, ERROR_CODES, KEYWORDS, SITE_URL } from './site.js';

// Every page of the site. The prerender script writes one HTML file per route,
// and the browser looks its route up again to hydrate the same page.

function route(path, page, { title, ogTitle = title, props = {}, bodyClass = '', keywords = KEYWORDS, sitemap = true }) {
    return {
        path,
        page,
        props,
        bodyClass,
        sitemap,
        head: { title, ogTitle, keywords, description: DESCRIPTION, url: SITE_URL + path },
    };
}

const section = name => `${name.toUpperCase()} // PYOTR`;

export function buildRoutes(projects) {
    return [
        route('/', 'home', { title: "IT'S PYOTR" }),
        route('/archive/', 'archive', { title: section('archive') }),
        ...projects
            .filter(project => project.shown)
            .map(project => route(`/archive/${project.id}/`, 'project', {
                title: project.brand.toUpperCase(),
                ogTitle: section(project.brand),
                keywords: project.tags.join(', ') || KEYWORDS,
                props: { id: project.id },
                bodyClass: 'project-page',
            })),
        route('/about/', 'about', { title: section('about') }),
        route('/theatre/', 'theatre', { title: section('theatre'), bodyClass: 'theatre-page' }),
        route('/web-essays/', 'essays', { title: section('web-essays') }),
        ...ERROR_CODES.map(code => route(`/errors/${code}/`, 'error', {
            title: section(String(code)),
            props: { code },
            sitemap: false,
        })),
    ];
}

export function normalizePath(pathname) {
    const path = pathname.replace(/index\.html$/, '');
    return path.endsWith('/') ? path : `${path}/`;
}

// Unknown paths render the 404 page, which is what the server answers with for them.
export function findRoute(routes, pathname) {
    const path = normalizePath(pathname);
    return routes.find(entry => entry.path === path) || routes.find(entry => entry.path === '/errors/404/');
}
