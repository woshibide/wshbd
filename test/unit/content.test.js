import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContent, buildProjectMedia, nextProjectWithImage, parseProjectDate } from '../../src/lib/content.js';

const project = (id, overrides = {}) => ({
    shown: true, id, date: '2024 Mar', brand: 'Brand', title: 'Book', location: 'NL',
    intro: '', description: '', hashtags: 'book, editorial', ...overrides,
});

test('media: numeric order, posters attached to their video, other files ignored', () => {
    const media = buildProjectMedia('W07', ['10.webp', '2.webp', '1.mp4', '1-poster.webp', 'notes.txt', '3.mp4']);
    assert.deepEqual(media.map(item => item.src.split('/').pop()), ['1.mp4', '2.webp', '3.mp4', '10.webp']);
    assert.equal(media[0].poster, '/content/projects/W07/1-poster.webp');
    assert.equal(media[0].mimeType, 'video/mp4');
    assert.equal(media[2].poster, null);
});

test('a poster without its video stays a regular image', () => {
    assert.deepEqual(buildProjectMedia('A1', ['x-poster.webp']).map(item => item.type), ['image']);
});

test('dates parse to sortable months and reject typos', () => {
    assert.ok(parseProjectDate('2024 Mar') < parseProjectDate('2024 apr'));
    assert.ok(parseProjectDate('2023 Dec') < parseProjectDate('2024 Jan'));
    assert.throws(() => parseProjectDate('March 2024'), /invalid date/);
});

test('content: tags split, duplicate hidden ids get unique keys, orphan folders warn', () => {
    const { projects, warnings } = buildContent(
        { projects: [project('M08'), project('M08', { shown: false })] },
        { M08: ['1.webp'], X01: ['1.webp'] }
    );
    assert.deepEqual(projects.map(item => item.key), ['M08', 'M08-2']);
    assert.deepEqual(projects[0].tags, ['book', 'editorial']);
    assert.match(warnings[0], /X01/);
});

test('content: build fails clearly on broken data', () => {
    assert.throws(() => buildContent({ projects: [project('E01')] }, {}), /without media.*E01/);
    assert.throws(() => buildContent({ projects: [project('E01', { shown: 'yes' })] }, { E01: ['1.webp'] }), /"shown"/);
    assert.throws(() => buildContent({ projects: [project('e01')] }, { e01: ['1.webp'] }), /id must look like/);
    assert.throws(() => buildContent({ projects: [project('E01'), project('E01')] }, { E01: ['1.webp'] }), /unique ids/);
});

test('next project skips hidden and video-only projects and wraps around', () => {
    const { projects } = buildContent(
        { projects: [project('A1'), project('B1', { shown: false }), project('C1'), project('D1')] },
        { A1: ['1.webp'], B1: ['1.webp'], C1: ['1.mp4'], D1: ['1.webp'] }
    );
    assert.equal(nextProjectWithImage(projects, 'A1').project.id, 'D1');
    assert.equal(nextProjectWithImage(projects, 'D1').project.id, 'A1');
});
