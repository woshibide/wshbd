import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatAmsterdamClock, formatAmsterdamDate, nextCopyLabel, restoreCopyLabel } from '../../src/lib/format.js';

test('dates and clock are in Amsterdam time', () => {
    const date = new Date('2026-10-22T17:55:35Z');
    assert.equal(formatAmsterdamDate(date), '22 OCT 2026, 19:55 CEST');
    assert.equal(formatAmsterdamClock(date), '19:55:35');
});

test('copy label grows one mark per click and wraps', () => {
    assert.equal(nextCopyLabel('email', 'email', 3), 'email COPIED!');
    assert.equal(nextCopyLabel('email COPIED!', 'email', 3), 'email COPIED!!');
    assert.equal(nextCopyLabel('email COPIED!!!', 'email', 3), 'email');
});

test('saved labels are restored only when valid', () => {
    assert.equal(restoreCopyLabel('email COPIED!!', 'email'), 'email COPIED!!');
    assert.equal(restoreCopyLabel('COPIED!!', 'email'), 'email COPIED!!');
    assert.equal(restoreCopyLabel('<script>', 'email'), 'email');
    assert.equal(restoreCopyLabel(null, 'email'), 'email');
});
