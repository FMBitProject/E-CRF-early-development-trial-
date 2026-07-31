/**
 * Server-side clinical edit checks mirroring the frontend validation logic.
 * Returns { valid, errors: string[], errorFields: [{key, message}], warnings, softViolations }
 * where errorFields carries the same messages tagged with the field they belong
 * to — null for cross-field rules, which belong to no single field.
 *
 * Field schema properties consumed:
 *   required, type, min, max, softMin, softMax, unit
 *   closedCodelist (boolean) — reject values outside options list
 *   pattern (string)        — regex that value must match
 *   patternMessage (string) — human-readable error for pattern failure
 *   conditionalRequired ({ ifField, ifValue }) — required when another field equals a value
 *   autoQueryOnRangeViolation (boolean) — already drives softViolations → auto-query
 */
export function validateCRFData(formData, schemaFields) {
    const errors         = [];
    const warnings       = [];
    const softViolations = [];
    // Same errors, tagged with the field they belong to (null for cross-field
    // rules). `errors` alone is not enough to reason about: several messages
    // embed the offending value, so comparing two validation runs by message
    // treats "LDL (5) too low" and "LDL (3) too low" as different problems when
    // they are the same field failing the same rule. importengine's merge guard
    // needs to tell "this field was already broken" from "this import broke it".
    const errorFields    = [];
    let currentKey = null;
    const push = (msg) => { errors.push(msg); errorFields.push({ key: currentKey, message: msg }); };

    for (const field of schemaFields) {
        currentKey = field.key ?? null;
        const value = formData[field.key];
        // A multi-select with nothing ticked arrives as [], which is not '' —
        // without this it would satisfy a "required" field.
        const isEmpty = value === undefined || value === null || value === ''
            || (Array.isArray(value) && value.length === 0);

        // ── Conditional required ────────────────────────────────────────────
        const cr = field.conditionalRequired;
        if (cr?.ifField && cr?.ifValue != null) {
            const otherVal = String(formData[cr.ifField] ?? '');
            const isCondMet = otherVal === String(cr.ifValue);
            if (isCondMet && isEmpty) {
                push(`${field.label} is required when ${cr.ifField} is "${cr.ifValue}".`);
                continue;
            }
        }

        // ── Standard required ───────────────────────────────────────────────
        if (field.required && isEmpty) {
            push(`${field.label} is required.`);
            continue;
        }

        if (isEmpty) continue;

        // ── Number range checks ─────────────────────────────────────────────
        if (field.type === 'number') {
            const num     = parseFloat(value);
            if (isNaN(num)) {
                push(`${field.label} must be a valid number.`);
                continue;
            }

            // Support both field.min (builder) and field.validation.hardMin (legacy)
            const hardMin = field.min         ?? field.validation?.hardMin;
            const hardMax = field.max         ?? field.validation?.hardMax;
            const softMin = field.softMin     ?? field.validation?.softMin;
            const softMax = field.softMax     ?? field.validation?.softMax;

            if (hardMin !== undefined && hardMin !== null && num < hardMin) {
                push(`${field.label} (${num}) is below the allowed minimum (${hardMin}${field.unit ? ' ' + field.unit : ''}).`);
            } else if (hardMax !== undefined && hardMax !== null && num > hardMax) {
                push(`${field.label} (${num}) exceeds the allowed maximum (${hardMax}${field.unit ? ' ' + field.unit : ''}).`);
            } else {
                if (softMin !== undefined && softMin !== null && num < softMin) {
                    const msg = `${field.label} (${num}) is unusually low (expected ≥ ${softMin}). Please verify.`;
                    warnings.push(msg);
                    if (field.autoQueryOnRangeViolation !== false) {
                        softViolations.push({ key: field.key, label: field.label, message: msg });
                    }
                } else if (softMax !== undefined && softMax !== null && num > softMax) {
                    const msg = `${field.label} (${num}) is unusually high (expected ≤ ${softMax}). Please verify.`;
                    warnings.push(msg);
                    if (field.autoQueryOnRangeViolation !== false) {
                        softViolations.push({ key: field.key, label: field.label, message: msg });
                    }
                }
            }
        }

        // ── Closed codelist ────────────────────────────────────────────────
        if (field.closedCodelist && Array.isArray(field.options) && field.options.length > 0) {
            const allowed = field.options;
            const vals = Array.isArray(value) ? value : [value];
            const invalid = vals.filter(v => !allowed.includes(v));
            if (invalid.length > 0) {
                push(`${field.label}: "${invalid.join('", "')}" is not a valid codelist value.`);
            }
        }

        // ── Pattern (regex) validation ─────────────────────────────────────
        if (field.pattern && typeof value === 'string') {
            try {
                const rx = new RegExp(field.pattern);
                if (!rx.test(value)) {
                    push(field.patternMessage || `${field.label} does not match the required format.`);
                }
            } catch {
                // invalid regex in schema — skip silently
            }
        }
    }

    // ── Hardcoded cross-field: diastolic < systolic ─────────────────────────
    const sbp = parseFloat(formData.systolic_bp);
    const dbp = parseFloat(formData.diastolic_bp);
    if (!isNaN(sbp) && !isNaN(dbp) && dbp >= sbp) {
        currentKey = null;
        push('Diastolic BP must be less than Systolic BP.');
    }

    return { valid: errors.length === 0, errors, errorFields, warnings, softViolations };
}
