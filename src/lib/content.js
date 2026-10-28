// Pure content helpers shared by the Vite content plugin, the pages and the tests.
// Nothing here touches the filesystem or the DOM.

export const VIDEO_TYPES = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.m4v': 'video/mp4',
    '.ogv': 'video/ogg',
};
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
export const POSTER_SUFFIX = '-poster.webp';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const REQUIRED_TEXT_FIELDS = ['id', 'brand', 'title', 'date', 'location', 'description', 'intro', 'hashtags'];

function extension(fileName) {
    const dot = fileName.lastIndexOf('.');
    return dot === -1 ? '' : fileName.slice(dot).toLowerCase();
}

function stripExtension(fileName) {
    const dot = fileName.lastIndexOf('.');
    return dot === -1 ? fileName : fileName.slice(0, dot);
}

export function isVideoFile(fileName) {
    return extension(fileName) in VIDEO_TYPES;
}

export function isMediaFile(fileName) {
    return isVideoFile(fileName) || IMAGE_EXTENSIONS.includes(extension(fileName));
}

export function sortMediaNames(names) {
    return [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

// Turns a project folder listing into ordered media items.
// `<name>-poster.webp` next to `<name>.mp4` is that video's poster, not a gallery image.
export function buildProjectMedia(projectId, fileNames) {
    const names = sortMediaNames(fileNames.filter(isMediaFile));
    const posters = new Set(
        names.filter(isVideoFile).map(name => `${stripExtension(name)}${POSTER_SUFFIX}`).filter(poster => names.includes(poster))
    );
    const base = `/content/projects/${projectId}/`;

    return names
        .filter(name => !posters.has(name))
        .map(name => {
            if (!isVideoFile(name)) return { type: 'image', src: base + name };
            const poster = `${stripExtension(name)}${POSTER_SUFFIX}`;
            return {
                type: 'video',
                src: base + name,
                mimeType: VIDEO_TYPES[extension(name)],
                poster: posters.has(poster) ? base + poster : null,
            };
        });
}

// "2024 Mar" -> sortable month number. Throws on anything else so typos fail the build.
export function parseProjectDate(value) {
    const match = /^(\d{4}) ([a-z]{3})$/i.exec(String(value).trim());
    const month = match ? MONTHS.indexOf(match[2].toLowerCase()) : -1;
    if (month === -1) throw new Error(`invalid date "${value}", expected "YYYY Mon" like "2024 Mar"`);
    return Number(match[1]) * 12 + month;
}

export function splitTags(hashtags) {
    return hashtags.split(',').map(tag => tag.trim()).filter(Boolean);
}

function validateProject(project, index) {
    const where = `archive.json project #${index + 1}${project?.id ? ` (${project.id})` : ''}`;
    if (!project || typeof project !== 'object') throw new Error(`${where}: not an object`);
    for (const field of REQUIRED_TEXT_FIELDS) {
        if (typeof project[field] !== 'string') throw new Error(`${where}: "${field}" must be a string`);
    }
    if (typeof project.shown !== 'boolean') throw new Error(`${where}: "shown" must be true or false`);
    if (!/^[A-Z]+\d+$/.test(project.id)) throw new Error(`${where}: id must look like "E04"`);
    try {
        parseProjectDate(project.date);
    } catch (error) {
        throw new Error(`${where}: ${error.message}`);
    }
}

// Combines archive.json with the media folder listing ({ [projectId]: [fileName] }).
// Returns every project in archive order plus warnings for things worth a look.
export function buildContent(archive, listing) {
    if (!archive || !Array.isArray(archive.projects)) throw new Error('archive.json: expected { "projects": [...] }');

    const occurrences = new Map();
    const projects = archive.projects.map((project, index) => {
        validateProject(project, index);
        const occurrence = (occurrences.get(project.id) || 0) + 1;
        occurrences.set(project.id, occurrence);
        return {
            id: project.id,
            key: occurrence === 1 ? project.id : `${project.id}-${occurrence}`,
            shown: project.shown,
            brand: project.brand,
            title: project.title,
            location: project.location,
            date: project.date,
            intro: project.intro,
            description: project.description,
            tags: splitTags(project.hashtags),
            media: buildProjectMedia(project.id, listing[project.id] || []),
        };
    });

    const shownIds = projects.filter(project => project.shown).map(project => project.id);
    const duplicateShown = shownIds.filter((id, index) => shownIds.indexOf(id) !== index);
    if (duplicateShown.length) throw new Error(`archive.json: shown projects must have unique ids, repeated: ${duplicateShown.join(', ')}`);

    const withoutMedia = projects.filter(project => project.shown && project.media.length === 0).map(project => project.id);
    if (withoutMedia.length) {
        throw new Error(`shown projects without media in public/content/projects: ${withoutMedia.join(', ')} (add media or set "shown": false)`);
    }
    if (!projects.some(project => project.shown && project.media.some(item => item.type === 'image'))) {
        throw new Error('at least one shown project needs an image for the next-project preview');
    }

    const knownIds = new Set(projects.map(project => project.id));
    const warnings = Object.keys(listing)
        .filter(folder => !knownIds.has(folder))
        .map(folder => `public/content/projects/${folder} has no project in archive.json`);

    return { projects, warnings };
}

export function shownProjects(projects) {
    return projects.filter(project => project.shown);
}

// Next shown project (wrapping around) that has an image to preview.
export function nextProjectWithImage(projects, id) {
    const shown = shownProjects(projects);
    const start = shown.findIndex(project => project.id === id);
    for (let offset = 1; offset <= shown.length; offset += 1) {
        const candidate = shown[(start + offset) % shown.length];
        const image = candidate.media.find(item => item.type === 'image');
        if (image) return { project: candidate, image };
    }
    return null;
}
