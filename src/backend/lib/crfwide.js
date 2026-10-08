/**
 * CRF data in "wide" layout for the Excel export — pure, no DB.
 *
 * The CSV CRF export is long format (one row per field) because that is safe
 * across forms with different field sets and is what SPSS restructures from.
 * People reading the data in Excel want the opposite: one row per subject per
 * visit, one column per question. Doing that per form keeps every sheet's
 * columns meaningful.
 */

export const CRF_ID_HEADERS = ['SUBJID', 'SITEID', 'VISIT', 'VISITDATE', 'ENTRY_STATUS'];

function formFields(form) {
    const fields = form?.schemaJson?.fields;
    return Array.isArray(fields) ? fields.filter(f => f && typeof f.key === 'string' && f.key) : [];
}

/** Arrays (checkbox answers) join like the CSV; booleans read as Y/N like every other domain. */
export function crfCellValue(value) {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join('; ');
    if (typeof value === 'boolean') return value ? 'Y' : 'N';
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
}

/**
 * @param {object[]} forms   crf_forms rows ({ id, name, version, schemaJson })
 * @param {object[]} entries { formId, subjectCode, siteCode, visitName, visitDate, status, dataJson },
 *                           already ordered by subject and visit
 * @returns {{ name, headers, rows, numberColumns }[]} one sheet per form that has entries
 */
export function crfWideSheets(forms, entries) {
    const byForm = new Map();
    for (const e of entries) {
        if (!byForm.has(e.formId)) byForm.set(e.formId, []);
        byForm.get(e.formId).push(e);
    }

    return forms
        .filter(f => byForm.has(f.id))
        .map(form => {
            const formEntries = byForm.get(form.id);
            const fields = formFields(form);
            const keys = fields.map(f => f.key);

            // Answers stored under a key the current schema no longer has (a
            // question removed after data was captured) must not vanish from
            // the export — append them after the schema's columns.
            const known = new Set(keys);
            const extra = new Set();
            for (const e of formEntries) {
                const dj = e.dataJson && typeof e.dataJson === 'object' ? e.dataJson : {};
                for (const k of Object.keys(dj)) if (!known.has(k)) extra.add(k);
            }
            const allKeys = [...keys, ...[...extra].sort()];

            const rows = formEntries.map(e => {
                const dj = e.dataJson && typeof e.dataJson === 'object' ? e.dataJson : {};
                return [
                    e.subjectCode || '', e.siteCode || '', e.visitName || '', e.visitDate || '', e.status || '',
                    ...allKeys.map(k => crfCellValue(dj[k])),
                ];
            });

            return {
                name: form.name || `Form ${form.id}`,
                headers: [...CRF_ID_HEADERS, ...allKeys],
                rows,
                numberColumns: fields.filter(f => f.type === 'number').map(f => f.key),
            };
        });
}

function optionText(o) {
    if (o && typeof o === 'object') {
        const v = o.value ?? '';
        const l = o.label ?? '';
        return l && String(l) !== String(v) ? `${v}=${l}` : String(v || l);
    }
    return String(o);
}

/** Data dictionary: what each column on the form sheets means. */
export function crfDictionarySheet(forms) {
    const rows = [];
    for (const form of forms) {
        for (const f of formFields(form)) {
            rows.push([
                form.name || `Form ${form.id}`, form.version || '', f.key, f.label || '', f.type || '',
                Array.isArray(f.options) ? f.options.map(optionText).join('; ') : '',
                f.unit || '',
            ]);
        }
    }
    return {
        name: 'Data Dictionary',
        headers: ['FORM', 'FORM_VERSION', 'FIELD', 'LABEL', 'TYPE', 'OPTIONS', 'UNIT'],
        rows,
    };
}
