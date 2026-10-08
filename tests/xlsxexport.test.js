// Excel (.xlsx) study export — workbook structure, cell typing and CRF pivot.
// A typing defect here is silent: "007" read back as 7, or a free-text answer
// starting with "=" evaluated as a formula, would change the data a reviewer sees.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync, crc32 } from 'node:zlib';
import {
    buildXlsx, sheetXml, columnLetter, excelDateSerial, uniqueSheetNames, xmlEscape,
} from '../src/backend/lib/xlsx.js';
import { crfWideSheets, crfDictionarySheet, crfCellValue, CRF_ID_HEADERS } from '../src/backend/lib/crfwide.js';

/** Read every entry of a ZIP via its central directory, verifying CRCs. */
function unzip(buf) {
    const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    const count = buf.readUInt16LE(eocd + 10);
    let p = buf.readUInt32LE(eocd + 16);
    const files = {};
    for (let i = 0; i < count; i++) {
        assert.equal(buf.readUInt32LE(p), 0x02014b50);
        const crc = buf.readUInt32LE(p + 16);
        const size = buf.readUInt32LE(p + 20);
        const nameLen = buf.readUInt16LE(p + 28);
        const local = buf.readUInt32LE(p + 42);
        const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
        const lNameLen = buf.readUInt16LE(local + 26);
        const start = local + 30 + lNameLen;
        const raw = inflateRawSync(buf.subarray(start, start + size));
        assert.equal(crc32(raw), crc, `CRC mismatch for ${name}`);
        files[name] = raw.toString('utf8');
        p += 46 + nameLen;
    }
    return files;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

test('column letters roll over like Excel', () => {
    assert.equal(columnLetter(0), 'A');
    assert.equal(columnLetter(25), 'Z');
    assert.equal(columnLetter(26), 'AA');
    assert.equal(columnLetter(701), 'ZZ');
    assert.equal(columnLetter(702), 'AAA');
});

test('date serials match Excel, and impossible days are rejected', () => {
    assert.equal(excelDateSerial('1900-03-01'), 61);
    assert.equal(excelDateSerial('2026-10-08'), 46303);
    assert.equal(excelDateSerial('2026-02-31'), null);
    assert.equal(excelDateSerial('2026-10-08T10:00:00Z'), null);
    assert.equal(excelDateSerial('08/10/2026'), null);
});

test('XML-illegal control characters are stripped, markup is escaped', () => {
    assert.equal(xmlEscape('a\u0001b<c>&"d"'), 'ab&lt;c&gt;&amp;&quot;d&quot;');
    assert.equal(xmlEscape('tab\tand\nnewline'), 'tab\tand\nnewline');
});

test('sheet names are sanitised, truncated to 31 chars and de-duplicated', () => {
    const names = uniqueSheetNames(['Vital/Signs', 'vital signs', 'A'.repeat(40), 'A'.repeat(40), '', "'x'"]);
    assert.equal(names[0], 'Vital Signs');
    assert.equal(names[1], 'vital signs (2)');
    assert.equal(names[2].length, 31);
    assert.equal(names[3].length, 31);
    assert.ok(names[3].endsWith(' (2)'));
    assert.equal(names[4], 'Sheet');
    assert.equal(names[5], 'x');
});

// ── Cell typing ──────────────────────────────────────────────────────────────

test('a subject code with leading zeros stays text', () => {
    const xml = sheetXml({ headers: ['SUBJID'], rows: [['007']] });
    assert.match(xml, /<c r="A2" t="inlineStr"><is><t xml:space="preserve">007<\/t>/);
});

test('numeric strings become numbers only in declared number columns', () => {
    const xml = sheetXml({ headers: ['A', 'B'], rows: [['12.5', '12.5']], numberColumns: ['B'] });
    assert.match(xml, /<c r="A2" t="inlineStr">/);
    assert.match(xml, /<c r="B2"><v>12.5<\/v><\/c>/);
});

test('non-numeric text in a number column stays text, not NaN', () => {
    const xml = sheetXml({ headers: ['LBORRES'], rows: [['<0.5']], numberColumns: ['LBORRES'] });
    assert.match(xml, /<t xml:space="preserve">&lt;0.5<\/t>/);
});

test('a YYYY-MM-DD string becomes a date cell; a datetime stays text', () => {
    const xml = sheetXml({ headers: ['D', 'T'], rows: [['2026-10-08', '2026-10-08T10:00:00+07:00']] });
    assert.match(xml, /<c r="A2" s="2"><v>46303<\/v><\/c>/);
    assert.match(xml, /<c r="B2" t="inlineStr">/);
});

test('a value beginning with "=" is stored as text, never a formula', () => {
    const xml = sheetXml({ headers: ['X'], rows: [['=HYPERLINK("http://x")']] });
    assert.doesNotMatch(xml, /<f>/);
    assert.match(xml, /t="inlineStr"/);
});

test('empty cells are omitted, header row is styled and frozen', () => {
    const xml = sheetXml({ headers: ['A', 'B'], rows: [['', null]] });
    assert.match(xml, /<row r="2"><\/row>/);
    assert.match(xml, /<c r="A1" s="1" t="inlineStr">/);
    assert.match(xml, /state="frozen"/);
    assert.match(xml, /<autoFilter ref="A1:B2"\/>/);
});

// ── Package ──────────────────────────────────────────────────────────────────

test('the workbook is a valid zip with every required part', () => {
    const buf = buildXlsx([
        { name: 'DM', headers: ['SUBJID'], rows: [['001']] },
        { name: 'AE', headers: ['SUBJID', 'AETERM'], rows: [] },
    ]);
    assert.equal(buf.readUInt32LE(0), 0x04034b50);
    const files = unzip(buf);
    for (const part of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml',
        'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']) {
        assert.ok(files[part], `missing ${part}`);
    }
    assert.match(files['xl/workbook.xml'], /<sheet name="DM" sheetId="1" r:id="rId1"\/>/);
    assert.match(files['xl/workbook.xml'], /<sheet name="AE" sheetId="2" r:id="rId2"\/>/);
    assert.match(files['xl/_rels/workbook.xml.rels'], /Id="rId3"[^>]*styles/);
});

test('identical input produces identical bytes', () => {
    const sheets = [{ name: 'DM', headers: ['A'], rows: [['x']] }];
    assert.deepEqual(buildXlsx(sheets), buildXlsx(sheets));
});

test('a workbook with no sheets is refused', () => {
    assert.throws(() => buildXlsx([]));
});

// ── CRF wide pivot ───────────────────────────────────────────────────────────

const FORMS = [
    { id: 1, name: 'Vitals', version: '1.0', schemaJson: { fields: [
        { key: 'sbp', label: 'Systolic', type: 'number', unit: 'mmHg' },
        { key: 'symptoms', label: 'Symptoms', type: 'checkbox', options: [{ value: 'h', label: 'Headache' }, 'nausea'] },
    ] } },
    { id: 2, name: 'Unused', schemaJson: { fields: [{ key: 'x', label: 'X', type: 'text' }] } },
];

test('one row per subject-visit, one column per question, in schema order', () => {
    const [sheet] = crfWideSheets(FORMS, [
        { formId: 1, subjectCode: '001', siteCode: 'S1', visitName: 'Day 1', visitDate: '2026-01-02', status: 'Signed',
          dataJson: { symptoms: ['h', 'nausea'], sbp: '120' } },
        { formId: 1, subjectCode: '002', siteCode: 'S1', visitName: 'Day 1', visitDate: '', status: 'Draft',
          dataJson: { sbp: 118 } },
    ]);
    assert.equal(sheet.name, 'Vitals');
    assert.deepEqual(sheet.headers, [...CRF_ID_HEADERS, 'sbp', 'symptoms']);
    assert.deepEqual(sheet.rows[0], ['001', 'S1', 'Day 1', '2026-01-02', 'Signed', '120', 'h; nausea']);
    assert.deepEqual(sheet.rows[1], ['002', 'S1', 'Day 1', '', 'Draft', 118, '']);
    assert.deepEqual(sheet.numberColumns, ['sbp']);
});

test('forms without entries get no sheet', () => {
    const sheets = crfWideSheets(FORMS, [{ formId: 1, dataJson: {} }]);
    assert.deepEqual(sheets.map(s => s.name), ['Vitals']);
});

test('answers under a key no longer in the schema are kept, after the schema columns', () => {
    const [sheet] = crfWideSheets(FORMS, [{ formId: 1, dataJson: { sbp: 1, old_q: 'kept', a_old: 'also' } }]);
    assert.deepEqual(sheet.headers.slice(CRF_ID_HEADERS.length), ['sbp', 'symptoms', 'a_old', 'old_q']);
    assert.ok(sheet.rows[0].includes('kept'));
});

test('cell values: booleans as Y/N, objects as JSON, null as empty', () => {
    assert.equal(crfCellValue(true), 'Y');
    assert.equal(crfCellValue(false), 'N');
    assert.equal(crfCellValue(null), '');
    assert.equal(crfCellValue({ a: 1 }), '{"a":1}');
    assert.equal(crfCellValue(0), 0);
});

test('the data dictionary lists every question with its choices and unit', () => {
    const dict = crfDictionarySheet([FORMS[0]]);
    assert.deepEqual(dict.rows, [
        ['Vitals', '1.0', 'sbp', 'Systolic', 'number', '', 'mmHg'],
        ['Vitals', '1.0', 'symptoms', 'Symptoms', 'checkbox', 'h=Headache; nausea', ''],
    ]);
});
