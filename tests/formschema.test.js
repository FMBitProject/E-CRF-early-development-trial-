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
    schemasEqual, describeSchemaChange,
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

// ── Change detection ─────────────────────────────────────────────────────────
// PUT /api/forms/:id refuses to rewrite a schema once entries reference it.
// That guard is only useful if it fires on real changes and stays quiet
// otherwise — a false positive blocks an edit the admin is entitled to make.

test('property order is not a schema change', () => {
    // The builder spreads each field on edit, so a property ticked and unticked
    // comes back at the end of the object. JSON.stringify saw that as a change.
    const a = schema({ key: 'ldl', label: 'LDL', type: 'number', required: true });
    const b = schema({ required: true, type: 'number', label: 'LDL', key: 'ldl' });
    assert.ok(schemasEqual(a, b));
});

test('an explicit undefined is not a schema change', () => {
    const a = schema({ key: 'ldl', label: 'LDL', type: 'number' });
    const b = schema({ key: 'ldl', label: 'LDL', type: 'number', unit: undefined });
    assert.ok(schemasEqual(a, b), 'JSON drops it anyway, so it cannot mean anything');
});

test('field order is a schema change — it is the order sites see', () => {
    const a = schema(field({ key: 'a' }), field({ key: 'b' }));
    const b = schema(field({ key: 'b' }), field({ key: 'a' }));
    assert.ok(!schemasEqual(a, b));
});

test('real edits are still detected', () => {
    const base = schema(field());
    assert.ok(!schemasEqual(base, schema(field({ type: 'text' }))),   'type');
    assert.ok(!schemasEqual(base, schema(field({ required: true }))), 'added property');
    assert.ok(!schemasEqual(base, schema(field(), field({ key: 'x' }))), 'added question');
    assert.ok(!schemasEqual(base, schema()),                          'removed question');
    assert.ok(!schemasEqual(base, { fields: [field()], extra: 1 }),   'top-level property');
});

test('nested option lists are compared by value, not by reference', () => {
    const a = schema(field({ type: 'select', options: ['A', 'B'] }));
    assert.ok(schemasEqual(a, schema(field({ type: 'select', options: ['A', 'B'] }))));
    assert.ok(!schemasEqual(a, schema(field({ type: 'select', options: ['A', 'C'] }))));
    assert.ok(!schemasEqual(a, schema(field({ type: 'select', options: ['A'] }))));
});

test('a blocked change explains itself in terms of questions, not diffs', () => {
    const before = schema(field({ key: 'ldl', label: 'LDL' }), field({ key: 'hdl', label: 'HDL' }));
    const after  = schema(field({ key: 'ldl', label: 'LDL', type: 'text' }), field({ key: 'trig', label: 'Triglycerides' }));
    const out = describeSchemaChange(after, before);
    assert.ok(out.some(c => c.includes('ldl') && c.includes('answer type')), out.join(' | '));
    assert.ok(out.some(c => c.includes('trig') && c.includes('added')), out.join(' | '));
    assert.ok(out.some(c => c.includes('hdl') && c.includes('orphaned')), out.join(' | '));
});

test('describing a change never throws on a malformed schema', () => {
    for (const bad of [null, undefined, {}, { fields: 'x' }, { fields: [null, {}] }]) {
        assert.doesNotThrow(() => describeSchemaChange(bad, schema(field())));
        assert.doesNotThrow(() => describeSchemaChange(schema(field()), bad));
    }
});

test('an edit to the answer choices is named, not lumped into a generic message', () => {
    // These are the most common edits. Reporting only add/remove/retype left
    // them falling through to "the question list or its validation rules
    // changed", which tells the admin nothing actionable.
    const before = schema(field({ key: 'sev', label: 'Severity', type: 'select', options: ['Mild', 'Severe'] }));
    const after  = schema(field({ key: 'sev', label: 'Severity', type: 'select', options: ['Mild', 'Moderate', 'Severe'] }));
    const out = describeSchemaChange(after, before);
    assert.equal(out.length, 1);
    assert.match(out[0], /answer choices changed/);
    assert.match(out[0], /sev/);
});

test('a min/max edit is named', () => {
    const out = describeSchemaChange(schema(field({ max: 300 })), schema(field({ max: 200 })));
    assert.match(out.join(' '), /maximum changed/);
});

test('a wording-only edit is named', () => {
    const out = describeSchemaChange(schema(field({ label: 'LDL-C' })), schema(field({ label: 'LDL' })));
    assert.match(out.join(' '), /wording changed/);
});

test('reordering questions is reported rather than left unexplained', () => {
    const a = schema(field({ key: 'a', label: 'A' }), field({ key: 'b', label: 'B' }));
    const b = schema(field({ key: 'b', label: 'B' }), field({ key: 'a', label: 'A' }));
    assert.ok(!schemasEqual(a, b), 'reordering must still block');
    assert.deepEqual(describeSchemaChange(b, a), ['the questions were reordered']);
});

test('a retype is reported once, not alongside every property that moved with it', () => {
    const before = schema(field({ key: 'x', label: 'X', type: 'number', max: 10 }));
    const after  = schema(field({ key: 'x', label: 'X', type: 'text', pattern: '^a$' }));
    const out = describeSchemaChange(after, before);
    assert.equal(out.length, 1);
    assert.match(out[0], /answer type from number to text/);
});

test('a change outside `fields` is reported', () => {
    const out = describeSchemaChange({ fields: [field()], sections: ['A'] }, { fields: [field()] });
    assert.deepEqual(out, ['schema property "sections" changed']);
});

test('every difference schemasEqual blocks on produces an explanation', () => {
    // A 409 with an empty details list is the failure mode this guards against.
    const base = schema(field({ key: 'x', label: 'X', type: 'number' }));
    const variants = [
        schema(field({ key: 'x', label: 'X', type: 'number', required: true })),
        schema(field({ key: 'x', label: 'Y', type: 'number' })),
        schema(field({ key: 'x', label: 'X', type: 'text' })),
        schema(field({ key: 'x', label: 'X', type: 'number', min: 1 })),
        schema(field({ key: 'x', label: 'X', type: 'number' }), field({ key: 'y', label: 'Y' })),
        schema(),
        { fields: [field({ key: 'x', label: 'X', type: 'number' })], extra: true },
    ];
    for (const v of variants) {
        assert.ok(!schemasEqual(base, v), 'fixture must actually differ');
        assert.ok(describeSchemaChange(v, base).length > 0, `no explanation for ${JSON.stringify(v)}`);
    }
});

test('a field property named like an Object prototype key is labelled as itself', () => {
    // PROP_LABEL is an object literal, so PROP_LABEL['constructor'] is a
    // function rather than undefined and would be spliced into the message.
    const out = describeSchemaChange(
        schema({ key: 'x', label: 'X', type: 'text', constructor: 'b' }),
        schema({ key: 'x', label: 'X', type: 'text', constructor: 'a' }),
    );
    assert.equal(out.length, 1);
    assert.match(out[0], /constructor changed/);
    assert.ok(!/native code/.test(out[0]), out[0]);
});
