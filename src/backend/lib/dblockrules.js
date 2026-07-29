/**
 * Study-level Database Lock rules — pure, no DB.
 *
 * ICH GCP E6(R3) §5.5.7 requires that the trial database is only locked once the
 * data is clean, and that the lock is a deliberate, attributable act. This module
 * holds both halves of that: the automated pre-lock checklist, and the
 * dual-signature state machine.
 *
 *   (none) ──initiate──▶ Pending Signatures ──CRA signs──▶ Pending Approval
 *                                                              │
 *                                              admin signs ────┘──▶ Locked
 *
 * Neither signature may be replayed, and the admin cannot sign first.
 */

const deny = (status, error) => ({ ok: false, status, error });
const allow = () => ({ ok: true });

/** Lock-request statuses that mean a request is already in flight. */
export const IN_FLIGHT_STATUSES = ['Pending Signatures', 'Pending Approval', 'Approved'];

/**
 * Build the pre-lock compliance checklist from raw counts.
 * Counts arrive as numbers or as SQL bigint strings, so every one is coerced.
 */
export function buildPreLockChecks(counts, runAt = new Date()) {
    const n = v => Number(v ?? 0);
    const plural = (c, one, many) => (c === 1 ? one : many);

    const openQueries     = n(counts.openQueries);
    const resolvedQueries = n(counts.resolvedQueries);
    const draftEntries    = n(counts.draftEntries);
    const savedEntries    = n(counts.savedEntries);
    const draftSAEs       = n(counts.draftSAEs);
    const openDeviations  = n(counts.openDeviations);

    const checks = [
        {
            id:     'queries_open',
            label:  'All data queries closed',
            ref:    'ICH E6(R3) §5.5.7 — no outstanding data queries at database lock',
            passed: openQueries === 0,
            detail: openQueries > 0
                ? `${openQueries} open quer${plural(openQueries, 'y', 'ies')} must be resolved and closed`
                : 'All queries closed',
        },
        {
            id:     'queries_resolved',
            label:  'No queries pending CRA review',
            ref:    'ICH E6(R3) §5.5.7',
            passed: resolvedQueries === 0,
            detail: resolvedQueries > 0
                ? `${resolvedQueries} resolved quer${plural(resolvedQueries, 'y', 'ies')} awaiting CRA closure`
                : 'No resolved queries pending',
        },
        {
            id:     'entries_draft',
            label:  'No CRF entries in Draft status',
            ref:    'ICH E6(R3) §5.5.7 — all data must be reviewed and signed',
            passed: draftEntries === 0,
            detail: draftEntries > 0
                ? `${draftEntries} form${plural(draftEntries, '', 's')} still in Draft`
                : 'No draft entries',
        },
        {
            id:     'entries_unsigned',
            label:  'All CRF entries signed or locked',
            ref:    '21 CFR Part 11 §11.10 — electronic signatures required before lock',
            passed: savedEntries === 0,
            detail: savedEntries > 0
                ? `${savedEntries} form${plural(savedEntries, '', 's')} saved but not signed`
                : 'All entries signed/locked',
        },
        {
            id:     'sae_unreported',
            label:  'All SAEs reported (no Draft SAEs)',
            ref:    'ICH E2A / E6(R3) §4.11 — all serious adverse events must be reported',
            passed: draftSAEs === 0,
            detail: draftSAEs > 0
                ? `${draftSAEs} serious AE${plural(draftSAEs, '', 's')} in Draft — expedited reporting required`
                : 'All SAEs reported',
        },
        {
            id:     'deviations_open',
            label:  'No open protocol deviations',
            ref:    'ICH E6(R3) §4.5 — CAPA implementation required before lock',
            passed: openDeviations === 0,
            detail: openDeviations > 0
                ? `${openDeviations} deviation${plural(openDeviations, '', 's')} still Open`
                : 'No open deviations',
        },
    ];

    return { checks, allPassed: checks.every(c => c.passed), runAt: runAt.toISOString() };
}

/** Guard for POST /api/dblock/initiate. `current` is the latest lock record, if any. */
export function canInitiateLock(current) {
    if (current?.status === 'Locked') {
        return deny(409, 'Study database is already locked');
    }
    if (IN_FLIGHT_STATUSES.includes(current?.status)) {
        return deny(409, 'A database lock request is already pending approval');
    }
    return allow();
}

/** Guard for POST /api/dblock/:id/sign-cra — runs before the password is verified. */
export function canSignCra(lock, { password } = {}) {
    if (!password) return deny(400, 'Password required for electronic signature');
    if (!lock) return deny(404, 'Lock record not found');
    if (lock.craSigned) return deny(409, 'CRA already signed');
    return allow();
}

/** Guard for POST /api/dblock/:id/sign-admin — the admin countersigns, never signs first. */
export function canSignAdmin(lock, { password } = {}) {
    if (!password) return deny(400, 'Password required for electronic signature');
    if (!lock) return deny(404, 'Lock record not found');
    if (!lock.craSigned) return deny(400, 'CRA must sign before admin approval');
    if (lock.adminSigned) return deny(409, 'Admin already signed');
    return allow();
}

/** Status after the CRA signature: Approved only if the admin already countersigned. */
export function statusAfterCraSignature(lock) {
    return lock.adminSigned ? 'Approved' : 'Pending Approval';
}

/** The admin signature is the final act — it locks the database. */
export function statusAfterAdminSignature() {
    return 'Locked';
}

/** Derive the study's current lock state from its lock history. */
export function currentLockState(history = []) {
    const current = history[history.length - 1] || null;
    return { isLocked: current?.status === 'Locked', status: current?.status ?? null, current, history };
}
