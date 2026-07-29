// OQ-07 — Statistical CSV export integrity (RFC 4180).
// Traces to URS-EXP-03/04; ICH E6(R3) §5.5.3.
// A quoting defect here silently shifts columns in SPSS/SAS — the failure mode
// is a wrong analysis, not an error message.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    csvCell, csvRow, buildCsv, withBom, UTF8_BOM,
    isValidDomain, CSV_DOMAINS, INVALID_DOMAIN_ERROR,
    vitalsToRows, vitalUnit, VITALS_SPEC,
} from '../src/backend/lib/csv.js';

// ── Cell quoting ─────────────────────────────────────────────────────────────

test('a plain value is not quoted', () => {
    assert.equal(csvCell('01LKT'), '01LKT');
    assert.equal(csvCell(230), '230');
});

test('a value containing a comma is quoted', () => {
    assert.equal(csvCell('Jakarta, Indonesia'), '"Jakarta, Indonesia"');
});

test('an embedded quote is doubled and the cell is quoted', () => {
    assert.equal(csvCell('say "hi"'), '"say ""hi"""');
});

test('a value containing a newline is quoted so the row is not split', () => {
    assert.equal(csvCell('line1\nline2'), '"line1\nline2"');
    assert.equal(csvCell('line1\r\nline2'), '"line1\r\nline2"');
});

test('a lone carriage return is quoted too — Excel-authored text carries them', () => {
    assert.equal(csvCell('a\rb'), '"a\rb"');
});

test('null and undefined become empty cells, never the text "null"', () => {
    assert.equal(csvCell(null), '');
    assert.equal(csvCell(undefined), '');
});

test('zero and false survive as values rather than collapsing to empty', () => {
    assert.equal(csvCell(0), '0');
    assert.equal(csvCell(false), 'false');
});

test('an AE narrative with commas, quotes and newlines stays in one cell', () => {
    const narrative = 'Subject reported "severe" pain,\nresolved after 2 days';
    const row = csvRow(['01LKT', narrative, 'Mild']);
    assert.equal(row.split(',')[0], '01LKT');
    assert.equal(row, `01LKT,"Subject reported ""severe"" pain,\nresolved after 2 days",Mild`);
});

// ── Row and document assembly ────────────────────────────────────────────────

test('rows are CRLF-terminated per RFC 4180', () => {
    const csv = buildCsv(['A', 'B'], [[1, 2], [3, 4]]);
    assert.equal(csv, 'A,B\r\n1,2\r\n3,4');
});

test('a header-only export is still a valid document', () => {
    assert.equal(buildCsv(['SUBJID', 'AETERM'], []), 'SUBJID,AETERM');
});

test('every row has the same number of cells as the header', () => {
    const headers = ['SUBJID', 'VISIT', 'LBTEST', 'LBORRES'];
    const csv = buildCsv(headers, [['01LKT', 'Week 4', 'LDL, direct', '230']]);
    // Counting on the parsed form, not a naive split — the third cell is quoted.
    const lines = csv.split('\r\n');
    assert.equal(lines.length, 2);
    assert.ok(lines[1].includes('"LDL, direct"'));
});

test('the BOM is prepended so Excel detects UTF-8', () => {
    const csv = withBom('A,B');
    assert.equal(csv.charCodeAt(0), 0xFEFF);
    assert.equal(csv, UTF8_BOM + 'A,B');
    assert.equal(csv.slice(1), 'A,B', 'the BOM is the only addition');
});

test('Indonesian characters survive the round trip unaltered', () => {
    assert.equal(csvCell('Nyeri kepala ringan'), 'Nyeri kepala ringan');
    assert.equal(csvCell('RS Umum Daerah — Jakarta'), 'RS Umum Daerah — Jakarta');
});

// ── Domain whitelist ─────────────────────────────────────────────────────────

test('the seven SDTM-style domains are accepted and nothing else', () => {
    assert.deepEqual(CSV_DOMAINS, ['DM', 'AE', 'DEV', 'IC', 'LB', 'VS', 'CRF']);
    for (const d of CSV_DOMAINS) assert.equal(isValidDomain(d), true);
    for (const d of ['XX', '', 'dm', 'DM ', null]) {
        assert.equal(isValidDomain(d), false, `${JSON.stringify(d)} must be rejected`);
    }
});

test('the rejection message names every valid domain', () => {
    for (const d of CSV_DOMAINS) assert.ok(INVALID_DOMAIN_ERROR.includes(d));
});

// ── Vital signs long format ──────────────────────────────────────────────────

test('one vitals record expands to one row per recorded measurement', () => {
    const rows = vitalsToRows(
        { systolicBp: 120, diastolicBp: 80, heartRate: 72, assessmentDate: '2026-07-23' },
        '01LKT', 'Week 4',
    );
    assert.equal(rows.length, 3);
    assert.deepEqual(rows[0], ['01LKT', 'Week 4', 'SYSBP', 'Systolic Blood Pressure', 120, 'mmHg', '2026-07-23']);
    assert.deepEqual(rows[2], ['01LKT', 'Week 4', 'HR', 'Heart Rate', 72, 'beats/min', '2026-07-23']);
});

test('measurements that were not taken produce no rows', () => {
    const rows = vitalsToRows({ systolicBp: 120, diastolicBp: null, heartRate: '' }, 'S1', 'V1');
    assert.deepEqual(rows.map(r => r[2]), ['SYSBP']);
});

test('a vitals record with nothing recorded produces no rows at all', () => {
    assert.deepEqual(vitalsToRows({ assessmentDate: '2026-07-23' }, 'S1', 'V1'), []);
});

test('a measured zero is exported, not dropped as falsy', () => {
    // A heart rate of 0 is clinically meaningful (asystole) and must not vanish.
    const rows = vitalsToRows({ heartRate: 0 }, 'S1', 'V1');
    assert.equal(rows.length, 1);
    assert.equal(rows[0][4], 0);
});

test('fixed-unit measurements always carry their SI unit', () => {
    assert.equal(vitalUnit({}, 'systolicBp', 'mmHg'), 'mmHg');
    assert.equal(vitalUnit({}, 'bmi', 'kg/m2'), 'kg/m2');
    assert.equal(vitalUnit({}, 'oxygenSaturation', '%'), '%');
});

test('temperature, weight and height take the unit the site recorded', () => {
    assert.equal(vitalUnit({ temperatureUnit: 'C' }, 'temperature', null), 'C');
    assert.equal(vitalUnit({ temperatureUnit: 'F' }, 'temperature', null), 'F');
    assert.equal(vitalUnit({ weightUnit: 'kg' }, 'weight', null), 'kg');
    assert.equal(vitalUnit({ heightUnit: 'cm' }, 'height', null), 'cm');
});

test('a per-record unit that was never captured exports empty, not undefined', () => {
    assert.equal(vitalUnit({}, 'temperature', null), '');
    assert.equal(vitalUnit({}, 'weight', null), '');
});

test('the temperature unit follows the record, so 37 C is never read as 37 F', () => {
    const c = vitalsToRows({ temperature: 37, temperatureUnit: 'C' }, 'S1', 'V1');
    const f = vitalsToRows({ temperature: 98.6, temperatureUnit: 'F' }, 'S2', 'V1');
    assert.equal(c[0][5], 'C');
    assert.equal(f[0][5], 'F');
});

test('the vitals spec covers all nine measurements with unique test codes', () => {
    assert.equal(VITALS_SPEC.length, 9);
    const codes = VITALS_SPEC.map(([code]) => code);
    assert.equal(new Set(codes).size, 9, 'VSTESTCD values must be unique');
});

test('vitals rows have exactly the seven columns the VS header declares', () => {
    const rows = vitalsToRows({ systolicBp: 120 }, 'S1', 'V1');
    assert.equal(rows[0].length, 7);
});
