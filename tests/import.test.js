// Unit tests for the Data Import engine (lib/importengine.js) — pure, no DB.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveFormSchema, normalizeSex, isNihil, slugify, planRow } from '../src/backend/lib/importengine.js';
import { parseCSV } from '../src/frontend/vendor/csvparse.js';

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
    assert.equal(byLabel['Dosis'].closedCodelist, true);
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
