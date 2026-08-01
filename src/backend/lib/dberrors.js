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
        // Prefer the frame that actually carries the unique violation. A
        // wrapper further out can carry a name from an unrelated error, and
        // the caller picks a user-facing message from whatever comes back.
        if (e.code === '23505') return String(name);
        if (!fallback) fallback = String(name);
    }
    return fallback;
}
