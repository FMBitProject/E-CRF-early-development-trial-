// Unit tests for the Data Import engine (lib/importengine.js) — pure, no DB.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveFormSchema, normalizeSex, isNihil, slugify, planRow, splitBP, parseLabHeader, numOrNull } from '../src/backend/lib/importengine.js';

test('splitBP splits a combined blood-pressure cell', () => {
    assert.deepEqual(splitBP('120/80'), [120, 80]);
    assert.deepEqual(splitBP(' 138 / 90 '), [138, 90]);
    assert.deepEqual(splitBP(''), [null, null]);
    assert.deepEqual(splitBP('n/a'), [null, null]);
});

test('parseLabHeader extracts test name + unit', () => {
    assert.deepEqual(parseLabHeader('LDL (mg/dL)'), { testName: 'LDL', unit: 'mg/dL' });
    assert.deepEqual(parseLabHeader('HDL'), { testName: 'HDL', unit: null });
});

test('numOrNull rejects junk like #DIV/0!', () => {
    assert.equal(numOrNull('25.0'), '25.0');
    assert.equal(numOrNull('#DIV/0!'), null);
    assert.equal(numOrNull(''), null);
});

test('planRow groups per-test date and reference range positionally', () => {
    // column order: LDL value, LDL date, LDL ref, HDL value, HDL date, HDL ref, lab name
    const cmap = {
        'ID': { target: 'subjectCode' },
        'LDL (mg/dL)': { target: 'lab' }, 'Tgl LDL': { target: 'labDate' }, 'Ruj LDL': { target: 'labRef' },
        'HDL (mg/dL)': { target: 'lab' }, 'Tgl HDL': { target: 'labDate' }, 'Ruj HDL': { target: 'labRef' },
        'Nama Lab': { target: 'labName' },
    };
    const p = planRow(
        { 'ID': 'S1', 'LDL (mg/dL)': '40', 'Tgl LDL': '2026-07-08', 'Ruj LDL': '<100',
          'HDL (mg/dL)': '54', 'Tgl HDL': '2026-07-09', 'Ruj HDL': '>50', 'Nama Lab': 'Prodia' },
        cmap, [],
    );
    assert.equal(p.labs.length, 2);
    const ldl = p.labs.find(l => l.testName === 'LDL');
    const hdl = p.labs.find(l => l.testName === 'HDL');
    assert.deepEqual({ v: ldl.value, d: ldl.date, r: ldl.refRangeText, n: ldl.labName }, { v: '40', d: '2026-07-08', r: '<100', n: 'Prodia' });
    assert.deepEqual({ v: hdl.value, d: hdl.date, r: hdl.refRangeText, n: hdl.labName }, { v: '54', d: '2026-07-09', r: '>50', n: 'Prodia' });
});

test('planRow extracts vitals (BP split) and lab rows', () => {
    const cmap = {
        'ID': { target: 'subjectCode' },
        'Tekanan Darah': { target: 'vitalBP' },
        'Berat Badan': { target: 'vitalWeight' },
        'IMT': { target: 'vitalBmi' },
        'LDL (mg/dL)': { target: 'lab' },
        'Nama Laboratorium': { target: 'labName' },
        'Tanggal Kedatangan': { target: 'visitDate' },
    };
    const p = planRow(
        { 'ID': '01LKT', 'Tekanan Darah': '120/80', 'Berat Badan': '64', 'IMT': '#DIV/0!', 'LDL (mg/dL)': '230', 'Nama Laboratorium': 'Prodia', 'Tanggal Kedatangan': '2026-07-23' },
        cmap, [],
    );
    assert.equal(p.vital.systolicBp, 120);
    assert.equal(p.vital.diastolicBp, 80);
    assert.equal(p.vital.weight, '64');
    assert.ok(!('bmi' in p.vital));                 // #DIV/0! skipped
    assert.equal(p.labs.length, 1);
    assert.deepEqual(
        { t: p.labs[0].testName, u: p.labs[0].unit, v: p.labs[0].value, n: p.labs[0].labName, d: p.labs[0].date },
        { t: 'LDL', u: 'mg/dL', v: '230', n: 'Prodia', d: '2026-07-23' },
    );
});
import { parseCSV, parseCSVRecords } from '../src/frontend/vendor/csvparse.js';

test('parseCSVRecords returns raw rows (for grouped-header sheets)', () => {
    // row 1 = sparse group titles, row 2 = real headers
    const recs = parseCSVRecords('No.,IDENTITAS,,\n"No.","ID Subjek","Usia","SDV"\n1,01LKT,50,\n');
    assert.equal(recs.length, 3);
    assert.deepEqual(recs[1], ['No.', 'ID Subjek', 'Usia', 'SDV']);
    assert.equal(recs[2][1], '01LKT');
});

test('parseCSV handles BOM, quoted commas/newlines, CRLF, and escaped quotes', () => {
    const csv = '﻿"ID Subjek","Notes"\r\n01LKT,"a, b\nc"\r\n02LKT,"say ""hi"""\r\n';
    const { headers, rows } = parseCSV(csv);
    assert.deepEqual(headers, ['ID Subjek', 'Notes']);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]['ID Subjek'], '01LKT');
    assert.equal(rows[0]['Notes'], 'a, b\nc');
    assert.equal(rows[1]['Notes'], 'say "hi"');
});

test('parseCSV tolerates a file without a trailing newline', () => {
    const { rows } = parseCSV('a,b\n1,2');
    assert.deepEqual(rows, [{ a: '1', b: '2' }]);
});

test('normalizeSex maps free text to a 1-char code', () => {
    assert.equal(normalizeSex('Laki-Laki'), 'M');
    assert.equal(normalizeSex('Perempuan'), 'F');
    assert.equal(normalizeSex('male'), 'M');
    assert.equal(normalizeSex('Female'), 'F');
    assert.equal(normalizeSex('xyz'), 'U');
    assert.equal(normalizeSex(''), null);
});

test('isNihil detects "no AE reported" markers', () => {
    assert.equal(isNihil('NIHIL'), true);
    assert.equal(isNihil('Tidak ada'), true);
    assert.equal(isNihil('NIHIL (Tidak ada AE yang dilaporkan)'), true);
    assert.equal(isNihil(''), true);
    assert.equal(isNihil('Nyeri kepala'), false);
});

test('slugify makes safe field keys', () => {
    assert.equal(slugify('LDL (mg/dL)'), 'ldl_mg_dl');
    assert.equal(slugify('Risiko CV'), 'risiko_cv');
});

test('deriveFormSchema infers types (number/date/select/text) and skips columns', () => {
    const headers = ['LDL (mg/dL)', 'Tanggal', 'Dosis', 'Risiko CV', 'Notes', 'IMT'];
    const rows = [
        { 'LDL (mg/dL)': '230', 'Tanggal': '21-7-2026', 'Dosis': '10/10 mg', 'Risiko CV': 'Sangat Tinggi', 'Notes': 'x', 'IMT': '#DIV/0!' },
        { 'LDL (mg/dL)': '40',  'Tanggal': '3-10-2026', 'Dosis': '10/5 mg',  'Risiko CV': 'Tinggi',        'Notes': 'y', 'IMT': '#DIV/0!' },
        { 'LDL (mg/dL)': '55',  'Tanggal': '8-7-2026',  'Dosis': '10/10 mg', 'Risiko CV': 'Sangat Tinggi', 'Notes': 'z', 'IMT': '#DIV/0!' },
    ];
    const { fields } = deriveFormSchema(headers, rows, ['IMT']);
    const byLabel = Object.fromEntries(fields.map(f => [f.label, f]));
    assert.equal(byLabel['LDL (mg/dL)'].type, 'number');
    assert.equal(byLabel['Tanggal'].type, 'date');
    assert.equal(byLabel['Dosis'].type, 'select');
    assert.deepEqual(byLabel['Dosis'].options.sort(), ['10/10 mg', '10/5 mg']);
    // derived selects are open (options are a suggestion, not a hard whitelist)
    assert.ok(!byLabel['Dosis'].closedCodelist);
    assert.equal(byLabel['Risiko CV'].type, 'select');
    assert.equal(byLabel['IMT'], undefined);   // skipped
    assert.ok(fields.every(f => /^[a-z0-9_]+$/.test(f.key)));
});

const COLMAP = {
    'ID Subjek':   { target: 'subjectCode' },
    'Jenis Kelamin': { target: 'sex' },
    'Tanggal Kedatangan': { target: 'visitDate' },
    'LDL':         { target: 'crf', field: 'ldl' },
    'Dosis':       { target: 'crf', field: 'dosis' },
    'IMT':         { target: 'skip' },
    'AE':          { target: 'ae' },
    'SAE':         { target: 'aeSerious' },
};
const FIELDS = [
    { key: 'ldl',   label: 'LDL',   type: 'number', max: 500, softMax: 190 },
    { key: 'dosis', label: 'Dosis', type: 'select', options: ['10/10 mg', '10/5 mg'], closedCodelist: true },
];

test('planRow routes columns to subject/visit/crf and validates', () => {
    const p = planRow(
        { 'ID Subjek': '01LKT', 'Jenis Kelamin': 'Laki-Laki', 'Tanggal Kedatangan': '21-7-2026', 'LDL': '230', 'Dosis': '10/10 mg', 'IMT': '#DIV/0!', 'AE': 'NIHIL', 'SAE': 'NIHIL' },
        COLMAP, FIELDS,
    );
    assert.equal(p.subjectCode, '01LKT');
    assert.equal(p.subject.sex, 'M');
    assert.equal(p.visitDate, '21-7-2026');
    assert.deepEqual(p.crf, { ldl: '230', dosis: '10/10 mg' });
    assert.equal(p.ae, null);                    // both NIHIL
    assert.equal(p.ok, true);                    // 230 < hard max 500 (soft warning only)
    assert.equal(p.warnings.length, 1);          // 230 > softMax 190
});

test('planRow flags missing subject code and hard validation errors', () => {
    const p = planRow({ 'ID Subjek': '', 'LDL': '9999', 'Dosis': 'bogus' }, COLMAP, FIELDS);
    assert.equal(p.ok, false);
    assert.ok(p.errors.some(e => /subject code/i.test(e)));
    assert.ok(p.errors.some(e => /LDL/.test(e)));       // over hard max
    assert.ok(p.errors.some(e => /codelist/i.test(e))); // invalid select value
});

test('planRow creates an AE from a non-NIHIL safety column, serious from SAE', () => {
    const p1 = planRow({ 'ID Subjek': 'S1', 'AE': 'Nyeri kepala', 'SAE': 'NIHIL' }, COLMAP, FIELDS);
    assert.equal(p1.ae.term, 'Nyeri kepala');
    assert.equal(p1.ae.serious, false);

    const p2 = planRow({ 'ID Subjek': 'S2', 'AE': 'NIHIL', 'SAE': 'Dirawat inap' }, COLMAP, FIELDS);
    assert.equal(p2.ae.serious, true);
    assert.equal(p2.ae.term, 'Dirawat inap');
});

// ── Merging an import onto an existing entry ────────────────────────────────
// The importer used to assign plan.crf wholesale, deleting every answer the CSV
// did not contain. Merging fixed that but opened a second hole: plan.validation
// is computed over the mapped columns alone, so the merged result — the thing
// actually stored — was never checked. A cross-field rule can only fail once
// both sides are present, which by definition is after the merge.

import { mergeEntryData } from '../src/backend/lib/importengine.js';

const BP_FIELDS = [
    { key: 'systolic_bp',  label: 'SBP', type: 'number' },
    { key: 'diastolic_bp', label: 'DBP', type: 'number' },
];

test('merging preserves answers the imported file never mentioned', () => {
    const { merged } = mergeEntryData({ a: '1', b: '2', c: '3' }, { b: '9' }, []);
    assert.deepEqual(merged, { a: '1', b: '9', c: '3' });
});

test('an import that only supplies part of a cross-field rule is caught', () => {
    // Validated alone, { diastolic_bp: 120 } is fine — the other side is
    // missing so the comparison is skipped. Merged, it is not.
    const { introduced } = mergeEntryData({ systolic_bp: '90' }, { diastolic_bp: '120' }, BP_FIELDS);
    assert.equal(introduced.length, 1);
    assert.match(introduced[0], /Diastolic BP must be less than Systolic BP/);
});

test('a valid merge introduces nothing', () => {
    const { merged, introduced } = mergeEntryData({ systolic_bp: '120' }, { diastolic_bp: '80' }, BP_FIELDS);
    assert.deepEqual(introduced, []);
    assert.deepEqual(merged, { systolic_bp: '120', diastolic_bp: '80' });
});

test('a problem the entry already had does not block an unrelated correction', () => {
    // The entry was saved before the rule existed. Blocking here would make a
    // legacy record impossible to correct by import, which is the opposite of
    // what the guard is for.
    const broken = { systolic_bp: '90', diastolic_bp: '120' };
    const { introduced } = mergeEntryData(broken, { systolic_bp: '90' }, BP_FIELDS);
    assert.deepEqual(introduced, [], 'the pre-existing error is not attributed to this import');
});

test('an import that fixes a pre-existing problem introduces nothing', () => {
    const broken = { systolic_bp: '90', diastolic_bp: '120' };
    const { merged, introduced } = mergeEntryData(broken, { systolic_bp: '140' }, BP_FIELDS);
    assert.deepEqual(introduced, []);
    assert.equal(merged.systolic_bp, '140');
});

test('null and undefined sides are handled', () => {
    assert.deepEqual(mergeEntryData(null, { a: '1' }, []).merged, { a: '1' });
    assert.deepEqual(mergeEntryData({ a: '1' }, null, []).merged, { a: '1' });
    assert.deepEqual(mergeEntryData(undefined, undefined, []).merged, {});
    assert.doesNotThrow(() => mergeEntryData({ a: '1' }, { b: '2' }));
});

test('re-importing a still-invalid value for an already-invalid field is not "introduced"', () => {
    // The comparison used to be by error string, and range messages embed the
    // value: "LDL (5) is below..." vs "LDL (3) is below..." looked like a new
    // problem, so a correction that improved a legacy value but did not fully
    // fix it was rejected. The field was already failing either way.
    const f = [{ key: 'ldl', label: 'LDL', type: 'number', min: 10 }];
    assert.deepEqual(mergeEntryData({ ldl: '5' }, { ldl: '3' }, f).introduced, []);
    assert.deepEqual(mergeEntryData({ ldl: '5' }, { ldl: '7' }, f).introduced, []);
    assert.deepEqual(mergeEntryData({ ldl: '5' }, { ldl: '50' }, f).introduced, [], 'fixing it is fine too');
});

test('breaking a field that was previously valid IS introduced', () => {
    const f = [{ key: 'ldl', label: 'LDL', type: 'number', min: 10 }];
    const { introduced } = mergeEntryData({ ldl: '50' }, { ldl: '3' }, f);
    assert.equal(introduced.length, 1);
    assert.match(introduced[0], /LDL/);
});

test('a cross-field rule newly broken by the merge is still introduced', () => {
    // Regression guard: moving to key-based comparison must not lose the case
    // the field-key attribution cannot see, since a cross-field error belongs
    // to no single field.
    const { introduced } = mergeEntryData({ systolic_bp: '90' }, { diastolic_bp: '120' }, BP_FIELDS);
    assert.equal(introduced.length, 1);
    assert.match(introduced[0], /Diastolic BP must be less than Systolic BP/);
});

test('a cross-field rule already broken stays un-introduced', () => {
    const broken = { systolic_bp: '90', diastolic_bp: '120' };
    assert.deepEqual(mergeEntryData(broken, { systolic_bp: '95' }, BP_FIELDS).introduced, []);
});
