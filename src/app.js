import { createApp, createSSRApp } from 'vue';
import { projects } from 'virtual:content';
import App from './App.vue';
import { buildRoutes, findRoute } from './routes.js';
import './styles/base.css';
import './styles/sections.css';

export const routes = buildRoutes(projects);

// `hydrate` reuses prerendered markup; without it (dev server) the page renders from scratch.
export function createSiteApp(path, { hydrate }) {
    const route = findRoute(routes, path);
    const app = (hydrate ? createSSRApp : createApp)(App, { route });
    return { app, route };
}
