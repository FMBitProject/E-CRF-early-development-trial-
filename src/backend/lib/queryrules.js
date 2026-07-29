/**
 * Data-query lifecycle rules — pure, no DB.
 *
 * Open ──resolve(site)──▶ Resolved ──close(CRA)──▶ Closed
 *
 * A query may only move forward, and only the opposite party may move it: the
 * site answers, the monitor closes. This separation is what makes the query
 * trail evidence of independent review (ICH E6(R3) §5.18.4).
 */

const deny = (status, error) => ({ ok: false, status, error });
const allow = () => ({ ok: true });

export const QUERY_STATUSES = ['Open', 'Resolved', 'Closed'];

/** Guard for POST /api/queries. */
export function canRaiseQuery({ subjectId, queryText } = {}) {
    if (!subjectId || !queryText) {
        return deny(400, 'subjectId and queryText are required');
    }
    return allow();
}

/** Guard for PATCH /api/queries/:id/resolve (investigator / CRC / PI / admin). */
export function canResolveQuery(query, { resolutionText } = {}) {
    if (!resolutionText) return deny(400, 'resolutionText is required');
    if (!query) return deny(404, 'Query not found');
    if (query.status !== 'Open') return deny(409, 'Only Open queries can be resolved');
    return allow();
}

/** Guard for PATCH /api/queries/:id/close (CRA / data manager / admin). */
export function canCloseQuery(query) {
    if (!query) return deny(404, 'Query not found');
    if (query.status !== 'Resolved') return deny(409, 'Only Resolved queries can be closed');
    return allow();
}

/**
 * Statuses that make an existing auto-query a duplicate. A Closed auto-query
 * must NOT suppress a new one: if the same out-of-range value is re-entered
 * after the monitor closed the original, that is a fresh finding.
 */
export const ACTIVE_QUERY_STATUSES = ['Open', 'Resolved'];

/** Text written for a system-raised query, tagged so it is distinguishable from a CRA query. */
export function autoQueryText(violation) {
    return `[Auto] ${violation.message}`;
}

export const AUTO_QUERY_AUTHOR = 'Auto-validation';

/**
 * Decide which soft-range violations still need an auto-query, given the
 * queries already attached to this entry. Returns the violations to insert.
 *
 * @param softViolations  from validateCRFData()
 * @param existingQueries rows of { fieldKey, status } already on the entry
 */
export function pendingAutoQueries(softViolations, existingQueries = []) {
    if (!softViolations?.length) return [];
    const blocked = new Set(
        existingQueries
            .filter(q => ACTIVE_QUERY_STATUSES.includes(q.status))
            .map(q => q.fieldKey),
    );
    const seen = new Set();
    return softViolations.filter(v => {
        if (blocked.has(v.key) || seen.has(v.key)) return false;
        seen.add(v.key);
        return true;
    });
}
