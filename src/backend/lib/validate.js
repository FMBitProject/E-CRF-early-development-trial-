/**
 * Server-side clinical edit checks mirroring the frontend validation logic.
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateCRFData(formData, schemaFields) {
    const errors = [];
    const warnings = [];

    for (const field of schemaFields) {
        const value = formData[field.key];

        if (field.required && (value === undefined || value === null || value === '')) {
            errors.push(`${field.label} is required.`);
            continue;
        }

        if ((value === undefined || value === null || value === '') && !field.required) {
            continue;
        }

        if (field.type === 'number' && field.validation) {
            const num = parseFloat(value);
            if (isNaN(num)) {
                errors.push(`${field.label} must be a valid number.`);
                continue;
            }
            const { hardMin, hardMax, softMin, softMax } = field.validation;
            if (hardMin !== undefined && num < hardMin) {
                errors.push(`${field.label} (${num}) is below physiological minimum (${hardMin}).`);
            } else if (hardMax !== undefined && num > hardMax) {
                errors.push(`${field.label} (${num}) exceeds physiological maximum (${hardMax}).`);
            } else if (softMin !== undefined && num < softMin) {
                warnings.push(`${field.label} (${num}) is unusually low. Please verify.`);
            } else if (softMax !== undefined && num > softMax) {
                warnings.push(`${field.label} (${num}) is unusually high. Please verify.`);
            }
        }
    }

    // Cross-field: diastolic < systolic
    const sbp = parseFloat(formData.systolic_bp);
    const dbp = parseFloat(formData.diastolic_bp);
    if (!isNaN(sbp) && !isNaN(dbp) && dbp >= sbp) {
        errors.push('Diastolic BP must be less than Systolic BP.');
    }

    return { valid: errors.length === 0, errors, warnings };
}
