import { parseProjectDate } from './content.js';

// Sorting and filtering for the archive list. Pure functions over project objects.

export const SORT_FIELDS = ['index', 'who', 'what', 'when'];
const WHAT_INDICATORS = ['☄', '☯', '✈', '😱', '🔫', '🏃', '👤', '😉', '𝄞', '🚁', '†', '▩', '♬', '👾'];

const sortValue = {
    index: project => project.id.toLowerCase(),
    who: project => project.brand.toLowerCase(),
    what: project => project.title.toLowerCase(),
    when: project => parseProjectDate(project.date),
};

export function sortProjects(projects, field, order) {
    const direction = order === 'asc' ? 1 : -1;
    const value = sortValue[field];
    return [...projects].sort((a, b) => {
        const valueA = value(a);
        const valueB = value(b);
        if (valueA < valueB) return -direction;
        if (valueA > valueB) return direction;
        return 0;
    });
}

export function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// Every tag once, in order of first appearance.
export function collectTags(projects) {
    return [...new Set(projects.flatMap(project => project.tags))];
}

export function matchesTags(project, selectedTags) {
    return selectedTags.length === 0 || selectedTags.some(tag => project.tags.includes(tag));
}

// Clicking a header sorts by that column with its stored order, then flips the stored order
// for the next click. "what" sorts once, then shuffles with a random indicator.
export function createSortState() {
    return { field: null, order: { index: 'desc', who: 'asc', what: 'asc', when: 'desc' }, whatSorted: false, whatIndicator: '☄' };
}

export function applySort(state, projects, field, random = Math.random) {
    const next = { ...state, order: { ...state.order }, field };
    if (field === 'what') {
        next.whatIndicator = WHAT_INDICATORS[Math.floor(random() * WHAT_INDICATORS.length)];
        if (!state.whatSorted) {
            // the indicator for the first "what" click still shows the arrow
            return { state: { ...next, whatSorted: true, showArrow: true }, projects: sortProjects(projects, 'what', 'asc') };
        }
        return { state: { ...next, showArrow: false }, projects: shuffle(projects, random) };
    }
    next.order[field] = state.order[field] === 'asc' ? 'desc' : 'asc';
    return { state: next, projects: sortProjects(projects, field, state.order[field]) };
}

export function sortIndicator(state, field) {
    if (field !== state.field) return '';
    if (field === 'what' && !state.showArrow) return state.whatIndicator;
    return state.order[field] === 'asc' ? '↓' : '↑';
}

// Initial archive view: newest first, as the page has always opened.
export function initialArchive(projects) {
    return applySort(createSortState(), projects, 'when');
}
