import { createSiteApp } from './app.js';

const root = document.getElementById('app');
// Prerendered pages record their route, so a 404 page served at any URL still hydrates as itself.
const { app, route } = createSiteApp(root.dataset.route || window.location.pathname, {
    hydrate: root.firstElementChild !== null,
});

document.title = route.head.title;
document.body.className = route.bodyClass;
app.mount(root);
