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
