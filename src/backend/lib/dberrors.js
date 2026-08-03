// Database error classification.
//
// Drizzle wraps failed statements in a DrizzleQueryError whose message is the
// raw "Failed query: insert into ..." text, with the ORIGINAL postgres error
// attached as err.cause. Checks like `err.code === '23505'` or
// `err.message.includes('duplicate')` therefore never match on the wrapper and
// raw SQL leaks to the UI as a 500. This helper walks the cause chain so route
// handlers can turn unique-constraint violations into friendly 409 responses.
export function isUniqueViolation(err) {
    for (let e = err, depth = 0; e && depth < 5; e = e.cause, depth++) {
        if (e.code === '23505') return true;
        if (typeof e.message === 'string' && /unique|duplicate/i.test(e.message)) return true;
    }
    return false;
}

/**
 * Which constraint was violated, walking the same cause chain.
 *
 * A route with more than one unique constraint in play cannot phrase a useful
 * message without this: the import handler reported every 23505 as "Subject
 * code already exists", which became wrong the moment a second constraint
 * (one CRF entry per subject/visit/form) existed. Returns '' when the driver
 * did not name one.
 */
export function uniqueConstraintName(err) {
    let fallback = '';
    for (let e = err, depth = 0; e && depth < 5; e = e.cause, depth++) {
        // postgres-js exposes constraint_name (it maps the PG error field 'n');
        // node-postgres calls it constraint.
        const name = e.constraint_name ?? e.constraint;
        if (!name) continue;
        // Only frames that are themselves unique violations may name a
        // constraint. A foreign-key failure wrapped in the same chain carries
        // a constraint name too, and the caller turns whatever comes back into
        // a user-facing message — naming the wrong one sends the operator
        // looking in entirely the wrong place.
        if (e.code === '23505') return String(name);
        const looksUnique = e.code === undefined
            && typeof e.message === 'string' && /unique|duplicate/i.test(e.message);
        if (looksUnique && !fallback) fallback = String(name);
    }
    return fallback;
}
