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

/**
 * Order-insensitive deep equality, used to decide whether a PUT actually
 * changes the schema.
 *
 * The guard that protects captured data compared `JSON.stringify(a) !==
 * JSON.stringify(b)`, which is sensitive to property order. The builder spreads
 * each field object on edit (`{ ...prev, [k]: v }`), so ticking a checkbox and
 * ticking it back appends the property at the end and the stringified form no
 * longer matches — the admin got "Schema cannot be modified: N data entries
 * reference this form" for a schema they had not changed.
 *
 * Property *order* carries no meaning in a schema. Field order does, so arrays
 * are still compared positionally.
 */
export function schemasEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
        return Object.is(a, b);
    }
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
        return a.length === b.length && a.every((v, i) => schemasEqual(v, b[i]));
    }
    // An absent property and one explicitly set to undefined are the same
    // schema: JSON round-tripping drops the latter anyway.
    const keys = (o) => Object.keys(o).filter(k => o[k] !== undefined);
    const ka = keys(a), kb = keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && schemasEqual(a[k], b[k]));
}

/**
 * Plain-language summary of what a schema change did, so a blocked update says
 * more than "something differs". Returns [] when only cosmetic details moved.
 */
export function describeSchemaChange(next, prev) {
    const fieldsOf = (s) => (Array.isArray(s?.fields) ? s.fields : []);
    const byKey    = (s) => new Map(fieldsOf(s).filter(f => f?.key).map(f => [f.key, f]));
    const before = byKey(prev), after = byKey(next);
    const changes = [];

    for (const [key, f] of after) {
        if (!before.has(key)) changes.push(`question "${f.label || key}" (${key}) added`);
        else if (before.get(key).type !== f.type) {
            changes.push(`question "${f.label || key}" (${key}) changed answer type from ${before.get(key).type} to ${f.type}`);
        }
    }
    for (const [key, f] of before) {
        if (!after.has(key)) changes.push(`question "${f.label || key}" (${key}) removed — its captured answers would be orphaned`);
    }
    return changes;
}
