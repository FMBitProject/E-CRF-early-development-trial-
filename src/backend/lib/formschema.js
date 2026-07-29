/**
 * CRF form schema validation — pure, no DB.
 *
 * A form schema is the definition of what data a study collects, so a bad
 * schema is not a cosmetic problem: a duplicate key silently makes two
 * questions share one storage slot, and a key with unexpected characters ends
 * up in an element id, a CDISC ODM OID and a CSV column header.
 *
 * The builder UI enforces the same rules, but the API is reachable without it.
 */

export const VALID_FIELD_TYPES = [
    'text', 'number', 'date', 'datetime', 'textarea',
    'select', 'radio', 'checkbox', 'boolean',
];

/** Answer types that are meaningless without a list of choices. */
export const CHOICE_FIELD_TYPES = ['select', 'radio', 'checkbox'];

/**
 * A field key becomes: `dataJson` property, DOM id/name, ODM ItemOID suffix and
 * CSV column header. Restrict it to a shape that is safe in all four.
 */
export const FIELD_KEY_RE = /^[a-z_][a-z0-9_]*$/;

/**
 * @returns {string[]} human-readable errors; empty means the schema is valid.
 * Messages name the question by its label so a designer can find it, rather
 * than by a zero-based array index.
 */
export function validateFormSchema(schemaJson) {
    if (!schemaJson || typeof schemaJson !== 'object' || Array.isArray(schemaJson)) {
        return ['schemaJson must be an object'];
    }
    const fields = schemaJson.fields;
    if (!Array.isArray(fields)) return ['schemaJson.fields must be an array'];

    const errors = [];
    if (fields.length === 0) errors.push('At least one question is required');

    const seenKeys = new Map();   // key → label of the question that claimed it

    fields.forEach((f, i) => {
        const at = f?.label ? `"${f.label}" (question ${i + 1})` : `Question ${i + 1}`;

        if (!f || typeof f !== 'object') {
            errors.push(`Question ${i + 1}: must be an object`);
            return;
        }
        if (!f.label) errors.push(`Question ${i + 1}: needs a question/label`);

        if (!f.key) {
            errors.push(`${at}: key is required`);
        } else if (typeof f.key !== 'string' || !FIELD_KEY_RE.test(f.key)) {
            errors.push(`${at}: key "${f.key}" may only contain lowercase letters, digits and underscores, and may not start with a digit`);
        } else if (seenKeys.has(f.key)) {
            errors.push(`${at}: has the same key "${f.key}" as "${seenKeys.get(f.key)}" — the two answers would overwrite each other`);
        } else {
            seenKeys.set(f.key, f.label ?? f.key);
        }

        if (!f.type || !VALID_FIELD_TYPES.includes(f.type)) {
            errors.push(`${at}: answer type must be one of ${VALID_FIELD_TYPES.join(', ')}`);
        } else if (CHOICE_FIELD_TYPES.includes(f.type)
                   && (!Array.isArray(f.options) || f.options.length === 0)) {
            errors.push(`${at}: this answer type needs at least one choice`);
        }
    });

    return errors;
}

// Deriving a key from a label is a builder-UI convenience and lives in the
// frontend module. This file stays the authority that *rejects* a bad schema,
// whichever client produced it.
