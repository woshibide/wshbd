import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRoutes, findRoute } from '../../src/routes.js';

const projects = [
    { id: 'E04', shown: true, brand: 'Lev Tolstoi', tags: ['book'] },
    { id: 'W01', shown: false, brand: 'Hidden', tags: [] },
];
const routes = buildRoutes(projects);

test('one page per shown project, titled like before', () => {
    const route = findRoute(routes, '/archive/E04/');
    assert.equal(route.page, 'project');
    assert.equal(route.head.title, 'LEV TOLSTOI');
    assert.equal(route.head.ogTitle, 'LEV TOLSTOI // PYOTR');
    assert.equal(route.bodyClass, 'project-page');
    assert.equal(findRoute(routes, '/archive/W01/').path, '/errors/404/');
});

test('paths are matched with or without trailing slash or index.html', () => {
    assert.equal(findRoute(routes, '/archive').page, 'archive');
    assert.equal(findRoute(routes, '/about/index.html').page, 'about');
    assert.equal(findRoute(routes, '/').head.title, "IT'S PYOTR");
});

test('error pages exist and stay out of the sitemap', () => {
    const errors = routes.filter(route => route.page === 'error');
    assert.equal(errors.length, 8);
    assert.ok(errors.every(route => !route.sitemap));
});
