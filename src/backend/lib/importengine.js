// Pure logic for the spreadsheet Data Import tool. No DB access here — the route
// (routes/import.js) executes the writes; these helpers do inference, column
// routing, value normalization and per-row planning so dry-run == commit logic
// and everything is unit-testable without a database.
//
// A row from a per-visit sheet carries: subject identity/demographics, the visit
// date, CRF field values, and (Week 12/24) AE/SAE columns. `columnMap` says where
// each CSV header goes: { target, field? } with target one of
//   'subjectCode' | 'sex' | 'initials' | 'genderIdentity'   (subject record)
//   'visitDate'                                              (visit actual date)
//   'crf'   (+ field = form field key)                       (CRF data_json)
//   'ae' | 'aeSerious'                                       (adverse events)
//   'skip'                                                   (ignored: IMT, SDV…)

import { validateCRFData } from './validate.js';

const VALID_FIELD_TYPES = ['text', 'number', 'date', 'datetime', 'textarea', 'select', 'radio', 'checkbox', 'boolean'];

export function slugify(header) {
    return String(header ?? '').trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'field';
}

// Normalize free-text sex to the stored 1-char code (subjects.sex is varchar(1)).
export function normalizeSex(value) {
    const v = String(value ?? '').trim().toLowerCase();
    if (!v) return null;
    if (/^(m|male|laki|laki-laki|l|pria)/.test(v)) return 'M';
    if (/^(f|female|perempuan|p|wanita)/.test(v)) return 'F';
    return 'U';
}

const DATE_RE = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/;
const NIHIL_RE = /^(nihil|tidak ada|tdk ada|none|n\/a|na|-)$/i;

// AE columns say "NIHIL"/"tidak ada" when nothing to report.
export function isNihil(value) {
    const v = String(value ?? '').trim();
    return v === '' || NIHIL_RE.test(v) || /tidak ada.*(dilaporkan|ktd|ae|sae)/i.test(v);
}

function looksNumeric(v) { const s = String(v).trim(); return s !== '' && !isNaN(Number(s)); }
function looksDate(v)    { return DATE_RE.test(String(v).trim()); }

// Numeric-only cell (skips junk like "#DIV/0!", "n/a"); returns the trimmed
// string when numeric, else null. Vital/lab modules store numbers.
export function numOrNull(v) {
    const s = String(v ?? '').trim();
    return s !== '' && !isNaN(Number(s)) ? s : null;
}
export function intOrNull(v) {
    const n = numOrNull(v);
    return n == null ? null : Math.round(Number(n));
}

// Split a combined blood-pressure cell ("120/80") into [systolic, diastolic].
export function splitBP(v) {
    const m = String(v ?? '').match(/(\d{2,3})\s*[/\\]\s*(\d{2,3})/);
    return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [null, null];
}

// Derive a lab test name + unit from a column header, e.g.
// "LDL (mg/dL)" → { testName: "LDL", unit: "mg/dL" }.
export function parseLabHeader(header) {
    const raw = String(header ?? '').trim();
    const m = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    return m ? { testName: m[1].trim(), unit: m[2].trim() } : { testName: raw, unit: null };
}

// Infer a CRF form schema from CSV headers + sample rows. `skip` headers (IMT,
// SDV, subject/visit/AE columns) are excluded. The user reviews the result.
export function deriveFormSchema(headers, rows, skip = []) {
    const skipSet = new Set(skip);
    const usedKeys = new Set();
    const fields = [];

    for (const header of headers) {
        if (!header || skipSet.has(header)) continue;
        const values = rows.map(r => r[header]).filter(v => v != null && String(v).trim() !== '');
        let key = slugify(header);
        while (usedKeys.has(key)) key = `${key}_${fields.length}`;
        usedKeys.add(key);

        const distinct = [...new Set(values.map(v => String(v).trim()))];
        const maxLen = values.reduce((m, v) => Math.max(m, String(v).length), 0);
        const field = { key, label: String(header).trim(), type: 'text', required: false };

        if (values.length === 0) {
            field.type = 'text';
        } else if (values.every(looksNumeric)) {
            field.type = 'number';
        } else if (values.every(looksDate)) {
            field.type = 'date';
        } else if (distinct.length <= 8 && maxLen <= 40) {
            // short, small distinct set of labels → a dropdown. Options are only a
            // SUGGESTION (not closedCodelist): we infer them from a sample, so a
            // value that appears only in later rows must NOT be rejected on import.
            field.type = 'select';
            field.options = distinct;
        } else if (maxLen > 60) {
            field.type = 'textarea';
        }
        if (!VALID_FIELD_TYPES.includes(field.type)) field.type = 'text';
        fields.push(field);
    }
    return { fields };
}

// Build a schema (fields) from a set of headers for the derive endpoint, honoring
// an explicit type override map if the caller wants one (rare).
export function deriveForm({ headers, rows, skip = [] }) {
    return deriveFormSchema(headers, rows || [], skip);
}

// Plan a single row: figure out the subject/visit/CRF/AE it implies and validate
// the CRF data. NO DB access — returns a structured intent + validation result.
export function planRow(row, columnMap, formFields = []) {
    const subject = {};
    const crf = {};
    const vital = {};       // vital_signs fields
    const labs = [];        // [{ testName, unit, value, date?, refRangeText? }]
    let currentLab = null;  // the lab test most recently seen (columns are ordered:
                            // value → date → reference range, per test)
    let labName = null, sharedLabDate = null;
    let subjectCode = null;
    let visitDate = null;
    let ae = null;          // { term, serious, onsetDate, narrative }
    const structuralErrors = [];

    for (const [header, spec] of Object.entries(columnMap || {})) {
        if (!spec || spec.target === 'skip') continue;
        const raw = row[header];
        const val = raw == null ? '' : String(raw).trim();

        switch (spec.target) {
            case 'subjectCode': subjectCode = val || null; break;
            case 'sex':            if (val) subject.sex = normalizeSex(val); break;
            case 'initials':       if (val) subject.initials = val.slice(0, 10); break;
            case 'genderIdentity': if (val) subject.genderIdentity = val.slice(0, 50); break;
            case 'visitDate':      if (val) visitDate = val; break;
            case 'crf':
                if (spec.field && val !== '') crf[spec.field] = val;
                break;
            case 'ae':
                if (!isNihil(val)) {
                    ae = ae || { serious: false };
                    ae.term = val.slice(0, 200);
                    ae.narrative = val;
                }
                break;
            case 'aeSerious':
                if (!isNihil(val)) {
                    ae = ae || {};
                    ae.serious = true;
                    ae.term = ae.term || val.slice(0, 200);
                    ae.narrative = ae.narrative || val;
                }
                break;
            case 'aeOnsetDate':
                if (val && ae) ae.onsetDate = val;
                break;

            // ── Vital Signs (dedicated module) ─────────────────────────────
            case 'vitalBP': {
                const [s, d] = splitBP(val);
                if (s != null) vital.systolicBp = s;
                if (d != null) vital.diastolicBp = d;
                break;
            }
            case 'vitalWeight': if (numOrNull(val)) vital.weight = numOrNull(val); break;
            case 'vitalHeight': if (numOrNull(val)) vital.height = numOrNull(val); break;
            case 'vitalBmi':    if (numOrNull(val)) vital.bmi = numOrNull(val); break;
            case 'vitalHR':     if (intOrNull(val) != null) vital.heartRate = intOrNull(val); break;
            case 'vitalTemp':   if (numOrNull(val)) vital.temperature = numOrNull(val); break;
            case 'vitalRR':     if (intOrNull(val) != null) vital.respiratoryRate = intOrNull(val); break;
            case 'vitalSpO2':   if (numOrNull(val)) vital.oxygenSaturation = numOrNull(val); break;

            // ── Laboratory (dedicated module) — one row per test ──────────
            // Columns are positional: a lab value starts a test; the date and
            // reference-range columns that follow attach to that same test.
            case 'lab':
                if (val !== '') {
                    const { testName, unit } = parseLabHeader(spec.field || header);
                    currentLab = { testName, unit, value: val };
                    labs.push(currentLab);
                } else {
                    currentLab = null;   // test not done → its date/ref have nothing to attach
                }
                break;
            case 'labDate':
                if (val) { if (currentLab && !currentLab.date) currentLab.date = val; else sharedLabDate = val; }
                break;
            case 'labRef':
                if (val && currentLab) currentLab.refRangeText = val;
                break;
            case 'labName': if (val) labName = val; break;

            default: break;
        }
    }

    // fill each lab row's shared name and fall back to a shared/visit date
    for (const l of labs) { l.labName = labName; if (!l.date) l.date = sharedLabDate || visitDate; }

    if (!subjectCode) structuralErrors.push('Missing subject code');

    const validation = validateCRFData(crf, formFields);

    return {
        subjectCode,
        subject,
        visitDate,
        crf,
        vital: Object.keys(vital).length ? vital : null,
        labs,
        ae,
        structuralErrors,
        validation,        // { valid, errors, warnings, softViolations }
        // Overall row disposition for the preview table:
        errors:   [...structuralErrors, ...validation.errors],
        warnings: validation.warnings,
        ok:       structuralErrors.length === 0 && validation.valid,
    };
}

/**
 * Merge an imported row onto an entry that already exists, and report only the
 * validation errors this import introduced.
 *
 * Two defects meet here. The importer originally assigned plan.crf wholesale,
 * so re-importing a two-column correction against a ten-question form deleted
 * the other eight answers. Merging fixes that, but planRow validates the mapped
 * columns alone — and a cross-field rule can only fail once both sides are
 * present, which is after the merge. Validating only the incoming half let the
 * import store an entry that validateCRFData rejects.
 *
 * The comparison against the pre-merge state matters: an entry saved before a
 * rule existed is already failing, and blocking on that would make a legacy
 * record impossible to correct by import — the opposite of the point. Only
 * problems that were not there before are attributed to this import.
 *
 * @returns {{ merged: object, introduced: string[] }}
 */
export function mergeEntryData(existingData, incoming, formFields = []) {
    const before = { ...(existingData ?? {}) };
    const merged = { ...before, ...(incoming ?? {}) };
    const already = new Set(validateCRFData(before, formFields).errors);
    const introduced = validateCRFData(merged, formFields).errors.filter(e => !already.has(e));
    return { merged, introduced };
}
