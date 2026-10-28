import { renderToString } from 'vue/server-renderer';
import { createSiteApp, routes } from './app.js';

export { routes };

export async function render(path) {
    const { app, route } = createSiteApp(path, { hydrate: true });
    return { html: await renderToString(app), route };
}
