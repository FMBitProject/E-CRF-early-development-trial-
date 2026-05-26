/**
 * Server-side clinical edit checks mirroring the frontend validation logic.
 * Returns { valid: boolean, errors: string[], warnings: string[], softViolations: array }
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

    for (const field of schemaFields) {
        const value = formData[field.key];
        const isEmpty = value === undefined || value === null || value === '';

        // ── Conditional required ────────────────────────────────────────────
        const cr = field.conditionalRequired;
        if (cr?.ifField && cr?.ifValue != null) {
            const otherVal = String(formData[cr.ifField] ?? '');
            const isCondMet = otherVal === String(cr.ifValue);
            if (isCondMet && isEmpty) {
                errors.push(`${field.label} is required when ${cr.ifField} is "${cr.ifValue}".`);
                continue;
            }
        }

        // ── Standard required ───────────────────────────────────────────────
        if (field.required && isEmpty) {
            errors.push(`${field.label} is required.`);
            continue;
        }

        if (isEmpty) continue;

        // ── Number range checks ─────────────────────────────────────────────
        if (field.type === 'number') {
            const num     = parseFloat(value);
            if (isNaN(num)) {
                errors.push(`${field.label} must be a valid number.`);
                continue;
            }

            // Support both field.min (builder) and field.validation.hardMin (legacy)
            const hardMin = field.min         ?? field.validation?.hardMin;
            const hardMax = field.max         ?? field.validation?.hardMax;
            const softMin = field.softMin     ?? field.validation?.softMin;
            const softMax = field.softMax     ?? field.validation?.softMax;

            if (hardMin !== undefined && hardMin !== null && num < hardMin) {
                errors.push(`${field.label} (${num}) is below the allowed minimum (${hardMin}${field.unit ? ' ' + field.unit : ''}).`);
            } else if (hardMax !== undefined && hardMax !== null && num > hardMax) {
                errors.push(`${field.label} (${num}) exceeds the allowed maximum (${hardMax}${field.unit ? ' ' + field.unit : ''}).`);
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
                errors.push(`${field.label}: "${invalid.join('", "')}" is not a valid codelist value.`);
            }
        }

        // ── Pattern (regex) validation ─────────────────────────────────────
        if (field.pattern && typeof value === 'string') {
            try {
                const rx = new RegExp(field.pattern);
                if (!rx.test(value)) {
                    errors.push(field.patternMessage || `${field.label} does not match the required format.`);
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
        errors.push('Diastolic BP must be less than Systolic BP.');
    }

    return { valid: errors.length === 0, errors, warnings, softViolations };
}
