/**
 * Adverse-event / SAE rules — pure, no DB.
 *
 * Expedited reporting timelines follow ICH E2A §3.3 and 21 CFR 312.32(c)(1):
 *   - fatal or life-threatening SAE .... 7 calendar days
 *   - all other SAEs ................... 15 calendar days
 * Non-serious AEs carry no expedited deadline.
 */

const deny = (status, error) => ({ ok: false, status, error });
const allow = () => ({ ok: true });

/** Serious criteria that trigger the shorter 7-day clock. */
export const URGENT_CRITERIA = ['death', 'life_threatening'];

/** The full ICH E2A seriousness vocabulary accepted by the API. */
export const SERIOUS_CRITERIA = [
    'death', 'life_threatening', 'hospitalization',
    'disability', 'congenital', 'medically_important',
];

/**
 * Days allowed before an SAE must reach the sponsor/authority.
 * A non-array `seriousCriteria` is treated as no criteria rather than throwing:
 * an SAE must always come out with a deadline, and defaulting to the shorter-is-
 * safer 15 days is better than a 500 that loses the report entirely.
 */
export function expeditedWindowDays(isSerious, seriousCriteria) {
    if (!isSerious) return null;
    const criteria = Array.isArray(seriousCriteria) ? seriousCriteria : [];
    return criteria.some(c => URGENT_CRITERIA.includes(c)) ? 7 : 15;
}

/**
 * Absolute deadline for expedited reporting.
 * `now` is injectable so the rule is testable without freezing the clock.
 */
export function calcExpeditedDeadline(isSerious, seriousCriteria, now = new Date()) {
    const days = expeditedWindowDays(isSerious, seriousCriteria);
    if (days === null) return null;
    const d = new Date(now.getTime());
    d.setDate(d.getDate() + days);
    return d;
}

/** Every serious AE requires an expedited report, regardless of criteria. */
export function requiresExpeditedReport(isSerious) {
    return Boolean(isSerious);
}

/** Guard for POST /api/ae. */
export function canCreateAe({ subjectId, aeTerm, severity } = {}) {
    if (!subjectId || !aeTerm || !severity) {
        return deny(400, 'subjectId, aeTerm, and severity are required');
    }
    return allow();
}

/** Guard for PATCH /api/ae/:id — a closed AE is frozen; edits need a reason (ICH GCP). */
export function canEditAe(existing, { reason } = {}) {
    if (!reason) return deny(400, 'reason is required for edits (ICH GCP)');
    if (!existing) return deny(404, 'Adverse event not found');
    if (existing.reportStatus === 'Closed') {
        return deny(409, 'Cannot edit a closed adverse event');
    }
    return allow();
}

/**
 * Guard for PATCH /api/ae/:id/report. A closed AE has completed its safety
 * review; recording a further report against it would move it backwards from
 * Closed to Reported, so the record is frozen here the same way canEditAe
 * freezes it against ordinary edits.
 */
export function canReportAe(existing) {
    if (!existing) return deny(404, 'Adverse event not found');
    if (existing.reportStatus === 'Closed') {
        return deny(409, 'Cannot record a report against a closed adverse event');
    }
    return allow();
}

/**
 * Resolve the seriousness fields for a create or a patch. On a patch, omitted
 * fields fall back to the stored record — a partial update must never silently
 * downgrade an SAE to non-serious.
 */
export function resolveSeriousness(fields = {}, existing = null) {
    const isSerious = fields.isSerious !== undefined
        ? Boolean(fields.isSerious)
        : Boolean(existing?.isSerious);
    const seriousCriteria = Array.isArray(fields.seriousCriteria)
        ? fields.seriousCriteria
        : (existing?.seriousCriteria ?? []);
    return { isSerious, seriousCriteria };
}

/**
 * Report status after PATCH /api/ae/:id/report. An AE only becomes 'Reported'
 * once BOTH the sponsor and the IRB/EC have been notified; a single-channel
 * report leaves it in its current status.
 */
export function resolveReportStatus(existing, { reportedToSponsor, reportedToIrb } = {}) {
    const sponsorDone = Boolean(reportedToSponsor || existing?.reportedToSponsorAt);
    const irbDone     = Boolean(reportedToIrb    || existing?.reportedToIrbAt);
    return (sponsorDone && irbDone) ? 'Reported' : (existing?.reportStatus ?? 'Draft');
}

/** An SAE is overdue when its deadline passed and it is still not closed out. */
export function isOverdue(ae, now = new Date()) {
    return Boolean(
        ae.requiresExpeditedReport &&
        ae.reportStatus !== 'Closed' &&
        ae.expeditedDeadline &&
        new Date(ae.expeditedDeadline) < now,
    );
}

/** Dashboard counters for GET /api/ae/stats. */
export function computeAeStats(rows, now = new Date()) {
    return {
        total:   rows.length,
        serious: rows.filter(a => a.isSerious).length,
        draft:   rows.filter(a => a.reportStatus === 'Draft').length,
        overdue: rows.filter(a => isOverdue(a, now)).length,
    };
}
