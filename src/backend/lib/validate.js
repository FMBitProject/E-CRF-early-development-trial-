/**
 * Server-side clinical edit checks mirroring the frontend validation logic.
 * Returns { valid, errors: string[], errorFields: [{key, rule, message}], warnings, softViolations }
 * where errorFields carries the same messages tagged with the field they belong
 * to (null for cross-field rules) and the rule that produced them. The rule
 * matters because several messages embed the offending value, so callers that
 * compare two validation runs cannot use the message as an identity.
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
    // Key and rule are passed explicitly rather than tracked in a mutable
    // `currentKey`: with ambient state, any rule added outside the field loop
    // silently inherits the last field's key unless its author remembers to
    // reset it. Making it an argument removes the whole class of mistake.
    const push = (key, rule, msg) => { errors.push(msg); errorFields.push({ key, rule, message: msg }); };

    // A caller that hands over a non-array (a schema stored as an object, a
    // null from a form with no schema) must get "nothing to check", not a
    // TypeError from for...of half-way through an import. Same for the record
    // itself: an absent formData is an empty record whose required fields are
    // all missing, which is a validation result, not a crash.
    const fields = Array.isArray(schemaFields) ? schemaFields : [];
    const data   = (formData && typeof formData === 'object') ? formData : {};

    for (const field of fields) {
        // A null or non-object entry threw on field.conditionalRequired below.
        // validateFormSchema rejects those on write, but a legacy row or a
        // hand-posted schema can still carry one, and reached from an import
        // that aborts the whole row with a TypeError rather than a result.
        if (!field || typeof field !== 'object') continue;
        const key = field.key ?? null;
        const value = data[key];
        // A multi-select with nothing ticked arrives as [], which is not '' —
        // without this it would satisfy a "required" field.
        const isEmpty = value === undefined || value === null || value === ''
            || (Array.isArray(value) && value.length === 0);

        // ── Conditional required ────────────────────────────────────────────
        const cr = field.conditionalRequired;
        if (cr?.ifField && cr?.ifValue != null) {
            const otherVal = String(data[cr.ifField] ?? '');
            const isCondMet = otherVal === String(cr.ifValue);
            if (isCondMet && isEmpty) {
                push(key, 'conditional-required', `${field.label} is required when ${cr.ifField} is "${cr.ifValue}".`);
                continue;
            }
        }

        // ── Standard required ───────────────────────────────────────────────
        if (field.required && isEmpty) {
            push(key, 'required', `${field.label} is required.`);
            continue;
        }

        if (isEmpty) continue;

        // ── Number range checks ─────────────────────────────────────────────
        if (field.type === 'number') {
            const num     = parseFloat(value);
            if (isNaN(num)) {
                push(key, 'number-format', `${field.label} must be a valid number.`);
                continue;
            }

            // Support both field.min (builder) and field.validation.hardMin (legacy)
            const hardMin = field.min         ?? field.validation?.hardMin;
            const hardMax = field.max         ?? field.validation?.hardMax;
            const softMin = field.softMin     ?? field.validation?.softMin;
            const softMax = field.softMax     ?? field.validation?.softMax;

            if (hardMin !== undefined && hardMin !== null && num < hardMin) {
                push(key, 'min', `${field.label} (${num}) is below the allowed minimum (${hardMin}${field.unit ? ' ' + field.unit : ''}).`);
            } else if (hardMax !== undefined && hardMax !== null && num > hardMax) {
                push(key, 'max', `${field.label} (${num}) exceeds the allowed maximum (${hardMax}${field.unit ? ' ' + field.unit : ''}).`);
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
                push(key, 'codelist', `${field.label}: "${invalid.join('", "')}" is not a valid codelist value.`);
            }
        }

        // ── Pattern (regex) validation ─────────────────────────────────────
        if (field.pattern && typeof value === 'string') {
            try {
                const rx = new RegExp(field.pattern);
                if (!rx.test(value)) {
                    push(key, 'pattern', field.patternMessage || `${field.label} does not match the required format.`);
                }
            } catch {
                // invalid regex in schema — skip silently
            }
        }
    }

    // ── Hardcoded cross-field: diastolic < systolic ─────────────────────────
    const sbp = parseFloat(data.systolic_bp);
    const dbp = parseFloat(data.diastolic_bp);
    // Cross-field rules belong to no single field, so they carry key null and a
    // rule id of their own. The id is what distinguishes them from each other —
    // matching cross-field errors by message would break the moment a rule
    // embedded a value the way the range messages do.
    if (!isNaN(sbp) && !isNaN(dbp) && dbp >= sbp) {
        push(null, 'cross-field:bp', 'Diastolic BP must be less than Systolic BP.');
    }

    return { valid: errors.length === 0, errors, errorFields, warnings, softViolations };
}
