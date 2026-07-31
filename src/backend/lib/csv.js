/**
 * RFC 4180 CSV serialisation for the statistical exports — pure, no DB.
 *
 * The output is read by SPSS/SAS/R, so it must survive commas, embedded quotes
 * and newlines in free-text clinical fields (AE narratives, deviation
 * descriptions) without shifting a single column.
 */

/** Quote a cell only when it needs it; double any embedded quote. */
export function csvCell(value) {
    const s = String(value ?? '');
    return (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r'))
        ? `"${s.replace(/"/g, '""')}"`
        : s;
}

export function csvRow(cells) {
    return cells.map(csvCell).join(',');
}

/** Header row + data rows, CRLF-terminated per RFC 4180. */
export function buildCsv(headers, rows) {
    return [csvRow(headers), ...rows.map(csvRow)].join('\r\n');
}

/**
 * Excel only detects UTF-8 in a CSV when it starts with a byte-order mark.
 * Written as an escape, not the literal character: a BOM in source is invisible,
 * and an editor or a "strip BOM" lint rule silently removing it would break
 * every export in a way nobody would spot by reading the diff.
 */
export const UTF8_BOM = '\uFEFF';

export function withBom(csv) {
    return UTF8_BOM + csv;
}

/** Domains accepted by GET /api/export/csv. */
export const CSV_DOMAINS = ['DM', 'AE', 'DEV', 'IC', 'LB', 'VS', 'CRF'];

export function isValidDomain(domain) {
    return CSV_DOMAINS.includes(domain);
}

export const INVALID_DOMAIN_ERROR = 'domain must be DM, AE, DEV, IC, LB, VS, or CRF';

/**
 * Vital-signs long-format definition, shared by the exporter and its tests.
 * [ VSTESTCD, VSTEST, column on vital_signs, fixed unit (null = per-record unit) ]
 */
export const VITALS_SPEC = [
    ['SYSBP',  'Systolic Blood Pressure',  'systolicBp',       'mmHg'],
    ['DIABP',  'Diastolic Blood Pressure', 'diastolicBp',      'mmHg'],
    ['HR',     'Heart Rate',               'heartRate',        'beats/min'],
    ['RESP',   'Respiratory Rate',         'respiratoryRate',  'breaths/min'],
    ['TEMP',   'Temperature',              'temperature',      null],
    ['WEIGHT', 'Weight',                   'weight',           null],
    ['HEIGHT', 'Height',                   'height',           null],
    ['BMI',    'Body Mass Index',          'bmi',              'kg/m2'],
    ['SPO2',   'Oxygen Saturation',        'oxygenSaturation', '%'],
];

/** Per-record unit for the measurements the site can record in either unit. */
export function vitalUnit(vital, key, fixedUnit) {
    if (fixedUnit !== null && fixedUnit !== undefined) return fixedUnit;
    if (key === 'temperature') return vital.temperatureUnit || '';
    if (key === 'weight')      return vital.weightUnit      || '';
    if (key === 'height')      return vital.heightUnit      || '';
    return '';
}

/** Expand one vital_signs row into one CSV row per recorded measurement. */
export function vitalsToRows(vital, subjectCode, visitName) {
    return VITALS_SPEC
        .filter(([, , key]) => vital[key] != null && String(vital[key]) !== '')
        .map(([code, name, key, fixedUnit]) => [
            subjectCode, visitName, code, name, vital[key],
            vitalUnit(vital, key, fixedUnit),
            vital.assessmentDate || '',
        ]);
}
