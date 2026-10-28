import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applySort, collectTags, initialArchive, matchesTags, sortIndicator } from '../../src/lib/archive.js';

const projects = [
    { id: 'E04', brand: 'Lev', title: 'Book', date: '2022 Dec', tags: ['book', 'editorial'] },
    { id: 'W02', brand: 'Ernst', title: 'Website', date: '2024 Mar', tags: ['front end'] },
    { id: 'A10', brand: 'ernst', title: 'Poster', date: '2024 Mar', tags: ['posters', 'editorial'] },
];
const ids = list => list.map(project => project.id);

test('opens newest first with the "when" arrow', () => {
    const { state, projects: sorted } = initialArchive(projects);
    assert.deepEqual(ids(sorted), ['W02', 'A10', 'E04']); // stable for equal dates
    assert.equal(sortIndicator(state, 'when'), '↓');
    assert.equal(sortIndicator(state, 'who'), '');
});

test('each click uses the stored order, then flips it', () => {
    let { state, projects: list } = initialArchive(projects);
    ({ state, projects: list } = applySort(state, list, 'index'));
    assert.deepEqual(ids(list), ['W02', 'E04', 'A10']);
    assert.equal(sortIndicator(state, 'index'), '↓');
    ({ state, projects: list } = applySort(state, list, 'index'));
    assert.deepEqual(ids(list), ['A10', 'E04', 'W02']);
    assert.equal(sortIndicator(state, 'index'), '↑');
});

test('"what" sorts once with an arrow, then shuffles with a random symbol', () => {
    let { state, projects: list } = initialArchive(projects);
    ({ state, projects: list } = applySort(state, list, 'what', () => 0));
    assert.deepEqual(ids(list), ['E04', 'A10', 'W02']);
    assert.equal(sortIndicator(state, 'what'), '↓');
    ({ state, projects: list } = applySort(state, list, 'what', () => 0));
    assert.equal(sortIndicator(state, 'what'), '☄');
    assert.equal(list.length, 3);
});

test('tags: first-seen order, any selected tag matches, none selected shows all', () => {
    assert.deepEqual(collectTags(projects), ['book', 'editorial', 'front end', 'posters']);
    assert.ok(matchesTags(projects[0], []));
    assert.ok(matchesTags(projects[0], ['posters', 'book']));
    assert.ok(!matchesTags(projects[1], ['editorial']));
});
