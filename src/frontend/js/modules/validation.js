// ============================================================
// E-CRF Validation Module - Edit Checks per PRD
// Hard validation: block save | Soft validation: yellow warning
// ============================================================

/**
 * Validate a single numeric field against hard/soft rules.
 * @param {number|string} value
 * @param {object} rules - { hard_min, hard_max, soft_min, soft_max, unit }
 *                         OR { min, max, softMin, softMax, unit } (builder format)
 * @returns {{ level: 'ok'|'soft'|'hard', message: string }}
 */
export function validateNumericField(value, rules) {
    if (value === '' || value === null || value === undefined) {
        return { level: 'ok', message: '' };
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
        return { level: 'hard', message: 'Must be a valid number.' };
    }

    // Support both naming conventions
    const hardMin = rules.hard_min ?? rules.hardMin ?? rules.min;
    const hardMax = rules.hard_max ?? rules.hardMax ?? rules.max;
    const softMin = rules.soft_min ?? rules.softMin;
    const softMax = rules.soft_max ?? rules.softMax;
    const unit    = rules.unit ?? '';

    if (hardMin !== undefined && hardMin !== null && num < hardMin) {
        return { level: 'hard', message: `Value ${num} is below the minimum allowed (${hardMin}${unit ? ' ' + unit : ''}). Please correct.` };
    }
    if (hardMax !== undefined && hardMax !== null && num > hardMax) {
        return { level: 'hard', message: `Value ${num} exceeds the maximum allowed (${hardMax}${unit ? ' ' + unit : ''}). Please correct.` };
    }
    if (softMin !== undefined && softMin !== null && num < softMin) {
        return { level: 'soft', message: `Warning: ${num}${unit ? ' ' + unit : ''} is below the expected range (≥${softMin}). Please verify this value.` };
    }
    if (softMax !== undefined && softMax !== null && num > softMax) {
        return { level: 'soft', message: `Warning: ${num}${unit ? ' ' + unit : ''} exceeds the expected range (≤${softMax}). Please verify this value.` };
    }

    return { level: 'ok', message: '' };
}

/**
 * Validate a complete form's data against its schema fields.
 * Supports: required, numeric range, closed codelist, pattern, conditional required.
 * @param {object} formData - { fieldKey: value, ... }
 * @param {Array} schemaFields - from crf_form.schema_json.fields
 * @returns {{ valid: boolean, errors: object, warnings: object }}
 */
export function validateForm(formData, schemaFields) {
    const errors   = {};
    const warnings = {};

    for (const field of schemaFields) {
        const value  = formData[field.key];
        const isEmpty = value === undefined || value === null || value === '';

        // ── Conditional required ──────────────────────────────────────────
        const cr = field.conditionalRequired;
        if (cr?.ifField && cr?.ifValue != null) {
            const otherVal = String(formData[cr.ifField] ?? '');
            if (otherVal === String(cr.ifValue) && isEmpty) {
                errors[field.key] = `${field.label} is required when ${cr.ifField} is "${cr.ifValue}".`;
                continue;
            }
        }

        // ── Standard required ─────────────────────────────────────────────
        if (field.required && isEmpty) {
            errors[field.key] = `${field.label} is required.`;
            continue;
        }

        if (isEmpty) continue;

        // ── Numeric validation ────────────────────────────────────────────
        if (field.type === 'number') {
            // Support both field.validation (legacy) and field.min/max (builder)
            const rules = field.validation ?? field;
            const result = validateNumericField(value, rules);
            if (result.level === 'hard') {
                errors[field.key] = result.message;
            } else if (result.level === 'soft') {
                warnings[field.key] = result.message;
            }
        }

        // ── Closed codelist ───────────────────────────────────────────────
        if (field.closedCodelist && Array.isArray(field.options) && field.options.length > 0) {
            const vals    = Array.isArray(value) ? value : [value];
            const invalid = vals.filter(v => !field.options.includes(v));
            if (invalid.length > 0) {
                errors[field.key] = `${field.label}: "${invalid.join('", "')}" is not a valid value.`;
            }
        }

        // ── Pattern (regex) ───────────────────────────────────────────────
        if (field.pattern && typeof value === 'string') {
            try {
                if (!new RegExp(field.pattern).test(value)) {
                    errors[field.key] = field.patternMessage || `${field.label} does not match the required format.`;
                }
            } catch {
                // invalid regex — skip
            }
        }

        // ── Hardcoded cross-field: diastolic < systolic ───────────────────
        if (field.key === 'end_date' && formData.start_date && value) {
            if (new Date(value) < new Date(formData.start_date)) {
                errors[field.key] = 'End date cannot be before start date.';
            }
        }
        if (field.key === 'diastolic_bp' && formData.systolic_bp && value) {
            if (parseFloat(value) >= parseFloat(formData.systolic_bp)) {
                errors[field.key] = 'Diastolic BP must be less than Systolic BP.';
            }
        }
    }

    return { valid: Object.keys(errors).length === 0, errors, warnings };
}

/**
 * Apply validation state to a DOM input element.
 */
export function applyFieldValidation(inputEl, errorEl, result) {
    inputEl.classList.remove(
        'border-red-400', 'focus:border-red-400', 'focus:ring-red-400',
        'border-amber-400', 'focus:border-amber-400', 'focus:ring-amber-400',
        'border-emerald-400', 'focus:border-emerald-400', 'focus:ring-emerald-400'
    );
    if (errorEl) {
        errorEl.className = 'mt-1 text-xs min-h-[1rem] transition-all';
        errorEl.textContent = result.message || '';
    }

    if (result.level === 'hard') {
        inputEl.classList.add('border-red-400', 'focus:border-red-400', 'focus:ring-red-400');
        if (errorEl) errorEl.classList.add('text-red-600');
    } else if (result.level === 'soft') {
        inputEl.classList.add('border-amber-400', 'focus:border-amber-400', 'focus:ring-amber-400');
        if (errorEl) errorEl.classList.add('text-amber-600');
    } else if (result.message === '' && inputEl.value !== '') {
        inputEl.classList.add('border-emerald-400');
    }
}

/**
 * Attach live validation to a numeric input.
 */
export function attachLiveValidation(inputEl, rules, errorId) {
    const errorEl = document.getElementById(errorId);
    inputEl.addEventListener('input', () => applyFieldValidation(inputEl, errorEl, validateNumericField(inputEl.value, rules)));
    inputEl.addEventListener('blur',  () => applyFieldValidation(inputEl, errorEl, validateNumericField(inputEl.value, rules)));
}

// Legacy global export
window.validateBP = function (element, errorId) {
    const result = validateNumericField(element.value, { hard_max: 300, unit: 'mmHg' });
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.textContent = result.message;
        element.classList.toggle('border-red-500', result.level === 'hard');
        element.classList.toggle('ring-red-500', result.level === 'hard');
    }
};
