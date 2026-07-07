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
