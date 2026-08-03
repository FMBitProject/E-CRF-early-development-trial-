// OQ-A18 — server-side CRF edit checks (lib/validate.js).
// Traces to URS-DC-01; ICH E6(R3) §5.5.3 (data quality checks at entry).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCRFData } from '../src/backend/lib/validate.js';

const run = (data, fields) => validateCRFData(data, fields);

// ── Required ─────────────────────────────────────────────────────────────────

const REQ = [{ key: 'ldl', label: 'LDL', type: 'number', required: true }];

test('a required field must be answered', () => {
    for (const value of [undefined, null, '']) {
        const r = run({ ldl: value }, REQ);
        assert.equal(r.valid, false, `${JSON.stringify(value)} must fail`);
        assert.match(r.errors[0], /LDL is required/);
    }
    assert.equal(run({ ldl: 100 }, REQ).valid, true);
});

test('a required multi-select with nothing ticked is empty, not answered', () => {
    // [] is not '' — without an explicit array check it would pass as answered.
    const fields = [{ key: 'symptoms', label: 'Symptoms', type: 'checkbox', required: true }];
    assert.equal(run({ symptoms: [] }, fields).valid, false);
    assert.match(run({ symptoms: [] }, fields).errors[0], /Symptoms is required/);
    assert.equal(run({ symptoms: ['Headache'] }, fields).valid, true);
});

test('a value of zero counts as answered', () => {
    assert.equal(run({ ldl: 0 }, REQ).valid, true);
});

// ── Hard vs soft ranges ──────────────────────────────────────────────────────

const RANGE = [{ key: 'sbp', label: 'Systolic BP', type: 'number', unit: 'mmHg',
                 min: 40, max: 300, softMin: 90, softMax: 180 }];

test('a value inside every range is clean', () => {
    const r = run({ sbp: 120 }, RANGE);
    assert.equal(r.valid, true);
    assert.deepEqual(r.warnings, []);
    assert.deepEqual(r.softViolations, []);
});

test('a value outside the hard range blocks the save', () => {
    assert.equal(run({ sbp: 350 }, RANGE).valid, false);
    assert.equal(run({ sbp: 10 }, RANGE).valid, false);
    assert.match(run({ sbp: 350 }, RANGE).errors[0], /exceeds the allowed maximum \(300 mmHg\)/);
});

test('a value outside the soft range saves but raises a warning and a query', () => {
    const r = run({ sbp: 200 }, RANGE);
    assert.equal(r.valid, true, 'soft violations must not block the save');
    assert.equal(r.warnings.length, 1);
    assert.equal(r.softViolations.length, 1);
    assert.equal(r.softViolations[0].key, 'sbp');
});

test('a hard failure does not also emit a soft query for the same field', () => {
    const r = run({ sbp: 350 }, RANGE);
    assert.equal(r.valid, false);
    assert.deepEqual(r.softViolations, [], 'the value was rejected — there is nothing to query');
});

test('auto-query can be switched off while keeping the warning', () => {
    const fields = [{ ...RANGE[0], autoQueryOnRangeViolation: false }];
    const r = run({ sbp: 200 }, fields);
    assert.equal(r.warnings.length, 1);
    assert.deepEqual(r.softViolations, []);
});

test('a non-numeric entry in a number field is rejected', () => {
    assert.equal(run({ sbp: 'abc' }, RANGE).valid, false);
    assert.match(run({ sbp: 'abc' }, RANGE).errors[0], /must be a valid number/);
});

// ── Closed codelist ──────────────────────────────────────────────────────────

const CODED = [{ key: 'dose', label: 'Dose', type: 'select',
                 options: ['10 mg', '20 mg'], closedCodelist: true }];

test('a closed codelist rejects a value that is not on the list', () => {
    assert.equal(run({ dose: '15 mg' }, CODED).valid, false);
    assert.match(run({ dose: '15 mg' }, CODED).errors[0], /not a valid codelist value/);
    assert.equal(run({ dose: '10 mg' }, CODED).valid, true);
});

test('a closed codelist checks every entry of a multi-select', () => {
    const fields = [{ ...CODED[0], type: 'checkbox' }];
    assert.equal(run({ dose: ['10 mg', '20 mg'] }, fields).valid, true);
    assert.equal(run({ dose: ['10 mg', 'bogus'] }, fields).valid, false);
});

test('an open list accepts anything', () => {
    const fields = [{ ...CODED[0], closedCodelist: false }];
    assert.equal(run({ dose: '15 mg' }, fields).valid, true);
});

// ── Conditional required ─────────────────────────────────────────────────────

const COND = [
    { key: 'smoker', label: 'Smoker', type: 'boolean' },
    { key: 'packs',  label: 'Packs per day', type: 'number',
      conditionalRequired: { ifField: 'smoker', ifValue: 'Yes' } },
];

test('a conditional field is required only when the trigger matches', () => {
    assert.equal(run({ smoker: 'Yes', packs: '' }, COND).valid, false);
    assert.match(run({ smoker: 'Yes', packs: '' }, COND).errors[0], /required when smoker is "Yes"/);
    assert.equal(run({ smoker: 'No',  packs: '' }, COND).valid, true);
    assert.equal(run({ smoker: 'Yes', packs: 5 }, COND).valid, true);
});

// ── Cross-field ──────────────────────────────────────────────────────────────

test('diastolic BP must be below systolic', () => {
    const r = run({ systolic_bp: 120, diastolic_bp: 130 }, []);
    assert.equal(r.valid, false);
    assert.match(r.errors[0], /Diastolic BP must be less than Systolic BP/);
    assert.equal(run({ systolic_bp: 120, diastolic_bp: 80 }, []).valid, true);
});

test('equal systolic and diastolic is rejected', () => {
    assert.equal(run({ systolic_bp: 120, diastolic_bp: 120 }, []).valid, false);
});

test('the cross-field check stays quiet when either value is absent', () => {
    assert.equal(run({ systolic_bp: 120 }, []).valid, true);
    assert.equal(run({}, []).valid, true);
});

// ── Pattern ──────────────────────────────────────────────────────────────────

test('a pattern rejects a wrongly formatted value with its own message', () => {
    const fields = [{ key: 'code', label: 'Code', type: 'text',
                      pattern: '^[A-Z]{2}\\d{4}$', patternMessage: 'Must be 2 letters + 4 digits' }];
    assert.equal(run({ code: 'ab12' }, fields).valid, false);
    assert.equal(run({ code: 'ab12' }, fields).errors[0], 'Must be 2 letters + 4 digits');
    assert.equal(run({ code: 'AB1234' }, fields).valid, true);
});

test('an invalid regex in the schema is ignored rather than blocking data entry', () => {
    const fields = [{ key: 'code', label: 'Code', type: 'text', pattern: '([unclosed' }];
    assert.equal(run({ code: 'anything' }, fields).valid, true);
});

// ── Field attribution ───────────────────────────────────────────────────────
// errorFields carries the same messages tagged with the field they belong to.
// importengine's merge guard needs it: several messages embed the offending
// value, so comparing two validation runs by message string treats one field
// failing one rule twice as two different problems.

test('every error is tagged with the field it came from', () => {
    const fields = [
        { key: 'ldl', label: 'LDL', type: 'number', min: 10 },
        { key: 'name', label: 'Name', type: 'text', required: true },
    ];
    const { errors, errorFields } = validateCRFData({ ldl: '3' }, fields);
    assert.equal(errorFields.length, errors.length, 'the two views must not drift');
    assert.deepEqual(errorFields.map(e => e.message), errors);
    assert.deepEqual(errorFields.map(e => e.key).sort(), ['ldl', 'name']);
});

test('a cross-field error is tagged with a null key, not a field it half-belongs to', () => {
    const fields = [
        { key: 'systolic_bp', label: 'SBP', type: 'number' },
        { key: 'diastolic_bp', label: 'DBP', type: 'number' },
    ];
    const { errorFields } = validateCRFData({ systolic_bp: '90', diastolic_bp: '120' }, fields);
    assert.equal(errorFields.length, 1);
    assert.equal(errorFields[0].key, null);
    assert.match(errorFields[0].message, /Diastolic BP must be less than Systolic BP/);
});

test('the same field failing the same rule at two values keeps one stable key', () => {
    // The property the merge guard actually depends on.
    const fields = [{ key: 'ldl', label: 'LDL', type: 'number', min: 10 }];
    const a = validateCRFData({ ldl: '5' }, fields).errorFields;
    const b = validateCRFData({ ldl: '3' }, fields).errorFields;
    assert.notEqual(a[0].message, b[0].message, 'messages differ — that was the trap');
    assert.equal(a[0].key, b[0].key, 'keys do not');
});

test('a clean record reports no errorFields', () => {
    assert.deepEqual(validateCRFData({ ldl: '50' }, [{ key: 'ldl', label: 'LDL', type: 'number', min: 10 }]).errorFields, []);
});

test('each error names the rule that failed, not just the field', () => {
    // The merge guard compares (field, rule). Without the rule, one field
    // failing two different rules looked like the same problem.
    const f = [{ key: 'ldl', label: 'LDL', type: 'number', min: 10 }];
    const low = validateCRFData({ ldl: '5' }, f).errorFields[0];
    const nan = validateCRFData({ ldl: 'abc' }, f).errorFields[0];
    assert.equal(low.key, nan.key, 'same field');
    assert.notEqual(low.rule, nan.rule, 'different rule');
});

test('a cross-field rule has its own rule id, so a second one cannot collide with it', () => {
    const f = [
        { key: 'systolic_bp', label: 'SBP', type: 'number' },
        { key: 'diastolic_bp', label: 'DBP', type: 'number' },
    ];
    const [e] = validateCRFData({ systolic_bp: '90', diastolic_bp: '120' }, f).errorFields;
    assert.equal(e.key, null);
    assert.ok(e.rule && e.rule !== 'required', `cross-field rule id missing: ${e.rule}`);
});

test('validateCRFData does not throw when schemaFields is not an array', () => {
    for (const bad of [null, undefined, 'x', 42, {}]) {
        assert.doesNotThrow(() => validateCRFData({ a: 1 }, bad), `schemaFields=${JSON.stringify(bad)}`);
    }
});

test('a malformed entry inside schemaFields is skipped, not fatal', () => {
    // A null in the fields array threw on field.conditionalRequired. Reached
    // from an import, that aborts the whole row with a TypeError instead of a
    // validation result.
    const good = { key: 'ldl', label: 'LDL', type: 'number', min: 10 };
    for (const bad of [null, undefined, 'x', 7, []]) {
        assert.doesNotThrow(() => validateCRFData({ ldl: '5' }, [bad, good]), `entry ${JSON.stringify(bad)}`);
    }
    // The valid field beside it is still checked.
    const { errorFields } = validateCRFData({ ldl: '5' }, [null, good]);
    assert.equal(errorFields.length, 1);
    assert.equal(errorFields[0].key, 'ldl');
});

test('a missing formData is treated as an empty record, not a crash', () => {
    // schemaFields was hardened against null in the same commit and formData
    // was not — the identical failure one argument along.
    const f = [{ key: 'ldl', label: 'LDL', type: 'number', min: 10, required: true }];
    for (const bad of [null, undefined]) {
        assert.doesNotThrow(() => validateCRFData(bad, f), `formData=${JSON.stringify(bad)}`);
        assert.equal(validateCRFData(bad, f).valid, false, 'a required field is still reported missing');
    }
});

test('an array is not a record — the object guard must not let one through', () => {
    const f = [{ key: 'ldl', label: 'LDL', type: 'number', required: true }];
    assert.doesNotThrow(() => validateCRFData([], f));
    assert.equal(validateCRFData([], f).valid, false);
    assert.equal(validateCRFData(['a', 'b'], f).valid, false);
});
