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
            default: break;
        }
    }

    if (!subjectCode) structuralErrors.push('Missing subject code');

    const validation = validateCRFData(crf, formFields);

    return {
        subjectCode,
        subject,
        visitDate,
        crf,
        ae,
        structuralErrors,
        validation,        // { valid, errors, warnings, softViolations }
        // Overall row disposition for the preview table:
        errors:   [...structuralErrors, ...validation.errors],
        warnings: validation.warnings,
        ok:       structuralErrors.length === 0 && validation.valid,
    };
}
