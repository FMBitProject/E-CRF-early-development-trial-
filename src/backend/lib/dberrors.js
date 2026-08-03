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
 * The reason postgres refused, with the drizzle wrapper stripped off.
 *
 * DrizzleQueryError.message is only "Failed query: insert into … params: …" —
 * the SQL and every bound parameter, and not one word about what went wrong.
 * A route answering `res.status(500).json({ error: err.message })` therefore
 * ships the schema and the parameter values (patient data among them) to the
 * browser while withholding the only useful part, which sits on err.cause.
 *
 * Returns a generic line rather than the query text when no cause is present:
 * the query is never something a client should see.
 */
export function dbErrorMessage(err) {
    const isQueryText = (m) => typeof m === 'string' && /^Failed query:/i.test(m);
    let best = '';
    for (let e = err, depth = 0; e && typeof e === 'object' && depth < 5; e = e.cause, depth++) {
        const m = typeof e.message === 'string' ? e.message.trim() : '';
        if (!m || isQueryText(m)) continue;
        best = m;   // keep walking: the deepest non-wrapper message is the real one
    }
    return best || 'Database rejected the request. Check the server log for the full error.';
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
