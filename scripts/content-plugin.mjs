// Vite plugin that provides `virtual:content`: archive.json merged with the media found in
// public/content/projects, plus the build timestamps shown in the footer.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { buildContent } from '../src/lib/content.js';
import { formatAmsterdamDate } from '../src/lib/format.js';

const MODULE_ID = 'virtual:content';
const RESOLVED_ID = '\0' + MODULE_ID;

function listProjectFolders(projectsDir) {
    const listing = {};
    for (const folder of readdirSync(projectsDir).sort()) {
        const folderPath = path.join(projectsDir, folder);
        if (!statSync(folderPath).isDirectory()) continue;
        listing[folder] = readdirSync(folderPath).filter(name => statSync(path.join(folderPath, name)).isFile());
    }
    return listing;
}

// Most recent commit that added project media. Falls back to the build time outside Git.
function lastContentAddition(root, fallback) {
    try {
        const output = execFileSync(
            'git',
            ['log', '-1', '--format=%cI', '--diff-filter=A', '--', 'public/content/projects', 'content/projects'],
            { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
        ).trim();
        const date = new Date(output);
        return output && !Number.isNaN(date.getTime()) ? date : fallback;
    } catch {
        return fallback;
    }
}

export function loadContent(root) {
    const archivePath = path.join(root, 'src/data/archive.json');
    const projectsDir = path.join(root, 'public/content/projects');
    let archive;
    try {
        archive = JSON.parse(readFileSync(archivePath, 'utf8'));
    } catch (error) {
        throw new Error(`could not read ${archivePath}: ${error.message}`);
    }
    return { ...buildContent(archive, listProjectFolders(projectsDir)), archivePath, projectsDir };
}

export default function contentPlugin() {
    let root;
    // One timestamp per process, so the client and server bundles render the same footer.
    const builtAt = process.env.SITE_BUILT_AT ? new Date(process.env.SITE_BUILT_AT) : new Date();

    return {
        name: 'site-content',
        configResolved(config) {
            root = config.root;
        },
        resolveId(id) {
            if (id === MODULE_ID) return RESOLVED_ID;
        },
        load(id) {
            if (id !== RESOLVED_ID) return;
            const { projects, warnings, archivePath } = loadContent(root);
            this.addWatchFile(archivePath);
            warnings.forEach(warning => this.warn(warning));
            const contentChangedAt = lastContentAddition(root, builtAt);
            const site = {
                builtAt: builtAt.toISOString(),
                builtAtLabel: formatAmsterdamDate(builtAt),
                contentChangedAt: contentChangedAt.toISOString(),
                contentChangedAtLabel: formatAmsterdamDate(contentChangedAt),
            };
            return `export const projects = ${JSON.stringify(projects)};\nexport const site = ${JSON.stringify(site)};\n`;
        },
        configureServer(server) {
            const projectsDir = path.join(root, 'public/content/projects');
            const reload = file => {
                if (!file.startsWith(projectsDir)) return;
                const module = server.moduleGraph.getModuleById(RESOLVED_ID);
                if (module) server.moduleGraph.invalidateModule(module);
                server.ws.send({ type: 'full-reload' });
            };
            server.watcher.add(projectsDir);
            server.watcher.on('add', reload);
            server.watcher.on('unlink', reload);
        },
    };
}
