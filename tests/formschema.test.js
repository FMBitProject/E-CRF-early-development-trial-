// OQ-A19 — CRF form schema validation (lib/formschema.js).
// Traces to URS-DC-01/DC-02; ICH E6(R3) §5.5.3.
//
// The schema defines what a study collects, so these rules protect the shape of
// every record that follows: a duplicate key makes two questions share one
// storage slot, and a malformed key reaches a DOM id, an ODM OID and a CSV
// column header. The builder UI checks the same things, but the API is
// reachable without it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    validateFormSchema, VALID_FIELD_TYPES, CHOICE_FIELD_TYPES, FIELD_KEY_RE,
} from '../src/backend/lib/formschema.js';

const field = (over = {}) => ({ key: 'ldl', label: 'LDL', type: 'number', ...over });
const schema = (...fields) => ({ fields });

// ── Shape ────────────────────────────────────────────────────────────────────

test('a well-formed schema passes', () => {
    assert.deepEqual(validateFormSchema(schema(field())), []);
});

test('a non-object schema is rejected', () => {
    for (const bad of [null, undefined, 'x', 42, []]) {
        assert.ok(validateFormSchema(bad).length, `${JSON.stringify(bad)} must be rejected`);
    }
});

test('fields must be an array, and a form needs at least one question', () => {
    assert.match(validateFormSchema({ fields: 'nope' })[0], /must be an array/);
    assert.match(validateFormSchema({ fields: [] })[0], /At least one question/);
});

test('a non-object entry in the fields array does not crash the validator', () => {
    const errs = validateFormSchema({ fields: [null, 'x', 7] });
    assert.equal(errs.length, 3);
    assert.ok(errs.every(e => /must be an object/.test(e)));
});

// ── Key format ───────────────────────────────────────────────────────────────

test('a key must be lowercase letters, digits and underscores', () => {
    for (const key of ['ldl', 'serum_creatinine', '_private', 'a1', 'x_2']) {
        assert.deepEqual(validateFormSchema(schema(field({ key }))), [], `${key} should be allowed`);
        assert.ok(FIELD_KEY_RE.test(key));
    }
});

test('a key that could break out of an HTML attribute or an OID is rejected', () => {
    for (const key of ['"><script>', 'a b', 'UPPER', 'has-dash', 'dot.key', '1leading', '', 'ldl!']) {
        const errs = validateFormSchema(schema(field({ key })));
        assert.ok(errs.length, `key ${JSON.stringify(key)} must be rejected`);
    }
});

test('a non-string key is rejected rather than coerced', () => {
    for (const key of [42, {}, [], true]) {
        assert.ok(validateFormSchema(schema(field({ key }))).length, `${JSON.stringify(key)} must be rejected`);
    }
});

test('the rejection message quotes the offending key so it can be found', () => {
    const errs = validateFormSchema(schema(field({ key: 'Bad Key' })));
    assert.ok(errs.some(e => e.includes('"Bad Key"')));
});

// ── Duplicate keys ───────────────────────────────────────────────────────────

test('two questions may not share a key — their answers would overwrite', () => {
    const errs = validateFormSchema(schema(
        field({ key: 'weight', label: 'Berat Badan' }),
        field({ key: 'weight', label: 'Berat badan' }),
    ));
    assert.equal(errs.length, 1);
    assert.match(errs[0], /overwrite each other/);
});

test('the duplicate message names both questions, not array indexes', () => {
    const errs = validateFormSchema(schema(
        field({ key: 'weight', label: 'Berat Badan' }),
        field({ key: 'weight', label: 'Berat badan' }),
    ));
    assert.ok(errs[0].includes('Berat Badan'), 'names the first claimant');
    assert.ok(errs[0].includes('Berat badan'), 'names the duplicate');
});

test('three questions on one key report two collisions', () => {
    const errs = validateFormSchema(schema(
        field({ key: 'w', label: 'A' }), field({ key: 'w', label: 'B' }), field({ key: 'w', label: 'C' }),
    ));
    assert.equal(errs.filter(e => /overwrite/.test(e)).length, 2);
});

test('keys differing only in case are NOT duplicates — uppercase is already refused', () => {
    const errs = validateFormSchema(schema(field({ key: 'ldl' }), field({ key: 'LDL', label: 'x' })));
    assert.ok(errs.some(e => /may only contain lowercase/.test(e)));
    assert.ok(!errs.some(e => /overwrite/.test(e)));
});

// ── Label and type ───────────────────────────────────────────────────────────

test('every question needs a label', () => {
    assert.match(validateFormSchema(schema(field({ label: '' })))[0], /needs a question\/label/);
});

test('the answer type must be one the data-entry form can render', () => {
    for (const type of VALID_FIELD_TYPES) {
        const extra = CHOICE_FIELD_TYPES.includes(type) ? { options: ['A'] } : {};
        assert.deepEqual(validateFormSchema(schema(field({ type, ...extra }))), [], `${type} should be allowed`);
    }
    assert.ok(validateFormSchema(schema(field({ type: 'signature' }))).length);
    assert.ok(validateFormSchema(schema(field({ type: undefined }))).length);
});

test('the valid types are exactly the nine the builder offers', () => {
    assert.deepEqual(VALID_FIELD_TYPES, [
        'text', 'number', 'date', 'datetime', 'textarea',
        'select', 'radio', 'checkbox', 'boolean',
    ]);
});

// ── Choice questions ─────────────────────────────────────────────────────────

test('every choice type needs at least one option — including checkbox', () => {
    // checkbox was previously exempt, so a multi-select could be saved with no
    // choices and render as an empty box during data entry.
    for (const type of CHOICE_FIELD_TYPES) {
        assert.ok(validateFormSchema(schema(field({ type }))).length, `${type} with no options must fail`);
        assert.ok(validateFormSchema(schema(field({ type, options: [] }))).length, `${type} with [] must fail`);
        assert.deepEqual(validateFormSchema(schema(field({ type, options: ['A'] }))), []);
    }
});

test('non-choice types do not require options', () => {
    for (const type of ['text', 'number', 'date', 'datetime', 'textarea', 'boolean']) {
        assert.deepEqual(validateFormSchema(schema(field({ type }))), [], `${type} needs no options`);
    }
});

// ── Reporting ────────────────────────────────────────────────────────────────

test('all problems are reported at once, not just the first', () => {
    const errs = validateFormSchema(schema(
        field({ key: 'Bad Key', label: '' }),
        field({ key: 'ldl', label: 'A', type: 'select' }),
    ));
    assert.ok(errs.length >= 3, `expected several errors, got ${errs.length}`);
});
