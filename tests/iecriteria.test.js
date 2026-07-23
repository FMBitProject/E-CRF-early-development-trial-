// Unit tests for per-study I/E criteria sanitization (lib/iecriteria.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeIeCriteria } from '../src/backend/lib/iecriteria.js';

test('null/undefined/non-object → null (use default set)', () => {
    assert.equal(sanitizeIeCriteria(null), null);
    assert.equal(sanitizeIeCriteria(undefined), null);
    assert.equal(sanitizeIeCriteria('nope'), null);
    assert.equal(sanitizeIeCriteria(42), null);
});

test('both lists empty → null', () => {
    assert.equal(sanitizeIeCriteria({ inclusion: [], exclusion: [] }), null);
    assert.equal(sanitizeIeCriteria({}), null);
});

test('drops empty/whitespace labels', () => {
    const r = sanitizeIeCriteria({
        inclusion: [{ label: 'Age 18+' }, { label: '   ' }, { label: '' }, {}],
        exclusion: [],
    });
    assert.deepEqual(r.inclusion.map(x => x.label), ['Age 18+']);
    assert.deepEqual(r.exclusion, []);
});

test('assigns stable keys and de-duplicates', () => {
    const r = sanitizeIeCriteria({
        inclusion: [{ label: 'A' }, { key: 'dup', label: 'B' }, { key: 'dup', label: 'C' }],
        exclusion: [{ label: 'X' }],
    });
    const keys = r.inclusion.map(x => x.key);
    assert.equal(new Set(keys).size, keys.length, 'keys unique');
    assert.equal(r.inclusion[1].key, 'dup');       // first occurrence keeps provided key
    assert.equal(r.exclusion[0].key, 'exc_1');
});

test('one-sided lists are allowed (inclusion only, no exclusion)', () => {
    const r = sanitizeIeCriteria({ inclusion: [{ label: 'Consent' }], exclusion: [] });
    assert.equal(r.inclusion.length, 1);
    assert.deepEqual(r.exclusion, []);
});

test('caps list length and label length', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ label: `c${i}` }));
    const r = sanitizeIeCriteria({ inclusion: many, exclusion: [{ label: 'y' }] });
    assert.equal(r.inclusion.length, 50);
    const long = sanitizeIeCriteria({ inclusion: [{ label: 'z'.repeat(500) }], exclusion: [] });
    assert.equal(long.inclusion[0].label.length, 300);
});

test('sanitizes malicious keys to a safe slug', () => {
    const r = sanitizeIeCriteria({ inclusion: [{ key: '<b>x</b>', label: 'L' }], exclusion: [] });
    assert.match(r.inclusion[0].key, /^[a-z0-9_]+$/);
});
