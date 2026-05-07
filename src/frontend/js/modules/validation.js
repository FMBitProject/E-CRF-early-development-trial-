// ============================================================
// E-CRF Validation Module - Edit Checks per PRD
// Hard validation: block save | Soft validation: yellow warning
// ============================================================

/**
 * Validate a single numeric field against hard/soft rules from schema.
 * @param {number|string} value
 * @param {object} rules - { hard_min, hard_max, soft_min, soft_max, unit }
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

    // Hard limits (physiologically impossible / data entry error)
    if (rules.hard_min !== undefined && num < rules.hard_min) {
        return { level: 'hard', message: `Value ${num} is below the minimum allowed limit of ${rules.hard_min}${rules.unit ? ' ' + rules.unit : ''}. Please correct.` };
    }
    if (rules.hard_max !== undefined && num > rules.hard_max) {
        return { level: 'hard', message: `Value ${num} exceeds the maximum allowed limit of ${rules.hard_max}${rules.unit ? ' ' + rules.unit : ''}. Please correct.` };
    }

    // Soft limits (possible but unusual - warning only)
    if (rules.soft_min !== undefined && num < rules.soft_min) {
        return { level: 'soft', message: `Warning: ${num}${rules.unit ? ' ' + rules.unit : ''} is below the expected range (≥${rules.soft_min}). Please verify this value.` };
    }
    if (rules.soft_max !== undefined && num > rules.soft_max) {
        return { level: 'soft', message: `Warning: ${num}${rules.unit ? ' ' + rules.unit : ''} exceeds the expected range (≤${rules.soft_max}). Please verify this value.` };
    }

    return { level: 'ok', message: '' };
}

/**
 * Validate a complete form's data against its schema fields.
 * @param {object} formData - { fieldKey: value, ... }
 * @param {Array} schemaFields - from crf_form.schema_json.fields
 * @returns {{ valid: boolean, errors: object, warnings: object }}
 *   errors: { fieldKey: message } — hard violations (block submit)
 *   warnings: { fieldKey: message } — soft violations (allow submit with acknowledgment)
 */
export function validateForm(formData, schemaFields) {
    const errors = {};
    const warnings = {};

    for (const field of schemaFields) {
        const value = formData[field.key];

        // Required check
        if (field.required && (value === undefined || value === null || value === '')) {
            errors[field.key] = `${field.label} is required.`;
            continue;
        }

        // Numeric validation
        if ((field.type === 'number') && field.validation && value !== '' && value !== undefined && value !== null) {
            const result = validateNumericField(value, field.validation);
            if (result.level === 'hard') {
                errors[field.key] = result.message;
            } else if (result.level === 'soft') {
                warnings[field.key] = result.message;
            }
        }

        // Date: end_date must be >= start_date when both present
        if (field.key === 'end_date' && formData.start_date && value) {
            if (new Date(value) < new Date(formData.start_date)) {
                errors[field.key] = 'End date cannot be before start date.';
            }
        }

        // Diastolic BP must be < Systolic BP
        if (field.key === 'diastolic_bp' && formData.systolic_bp && value) {
            if (parseFloat(value) >= parseFloat(formData.systolic_bp)) {
                errors[field.key] = 'Diastolic BP must be less than Systolic BP.';
            }
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        warnings
    };
}

/**
 * Apply validation state to a DOM input element.
 * @param {HTMLElement} inputEl
 * @param {HTMLElement} errorEl
 * @param {{ level, message }} result
 */
export function applyFieldValidation(inputEl, errorEl, result) {
    // Clear states
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
 * @param {HTMLInputElement} inputEl
 * @param {object} rules
 * @param {string} errorId
 */
export function attachLiveValidation(inputEl, rules, errorId) {
    const errorEl = document.getElementById(errorId);
    inputEl.addEventListener('input', () => {
        const result = validateNumericField(inputEl.value, rules);
        applyFieldValidation(inputEl, errorEl, result);
    });
    inputEl.addEventListener('blur', () => {
        const result = validateNumericField(inputEl.value, rules);
        applyFieldValidation(inputEl, errorEl, result);
    });
}

// Legacy global export (for backward compat with old inline usage)
window.validateBP = function (element, errorId) {
    const result = validateNumericField(element.value, { hard_max: 300, unit: 'mmHg' });
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.textContent = result.message;
        element.classList.toggle('border-red-500', result.level === 'hard');
        element.classList.toggle('ring-red-500', result.level === 'hard');
    }
};
