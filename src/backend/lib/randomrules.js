/**
 * Randomization and blinding rules — pure, no DB.
 *
 * Allocation is pre-generated list based (not computed at request time): the
 * statistician uploads a list, and the system hands out the lowest unused slot
 * that matches the subject's stratum. This keeps allocation concealment with
 * the list, and makes every assignment reproducible from the list + order.
 */

const deny = (status, error) => ({ ok: false, status, error });
const allow = () => ({ ok: true });

export const BLINDED_LABEL = '*** BLINDED ***';

/** Only an unblinding admin may see a treatment arm while the subject is blinded. */
export function canSeeTreatmentArm(row, role) {
    return !row.isBlinded || role === 'admin';
}

/** Replace the arm with a placeholder for anyone not entitled to see it. */
export function maskTreatmentArm(row, role) {
    return { ...row, treatmentArm: canSeeTreatmentArm(row, role) ? row.treatmentArm : BLINDED_LABEL };
}

export function maskTreatmentArms(rows, role) {
    return rows.map(r => maskTreatmentArm(r, role));
}

/** Validate an uploaded randomization list before any row is written. */
export function validateRandList(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
        return deny(400, 'entries array is required');
    }
    for (const e of entries) {
        if (!e.randCode || !e.treatmentArm) {
            return deny(400, 'Each entry needs randCode and treatmentArm');
        }
    }
    return allow();
}

/** Codes are stored upper-cased and trimmed so lookups can never miss on case. */
export function normalizeRandEntry(entry) {
    return {
        randCode:     String(entry.randCode).trim().toUpperCase(),
        treatmentArm: entry.treatmentArm,
        stratum:      entry.stratum ?? null,
        isUsed:       false,
    };
}

export function normalizeRandList(entries) {
    return entries.map(normalizeRandEntry);
}

/** Guard for POST /api/randomization. */
export function canRandomize({ subject, existingAssignment, siteScope } = {}) {
    if (!subject) return deny(404, 'Subject not found');
    if (Array.isArray(siteScope) && !siteScope.includes(subject.siteId)) {
        return deny(404, 'Subject not found');
    }
    if (subject.status !== 'Active') {
        return deny(409, 'Only Active subjects can be randomized');
    }
    if (existingAssignment) return deny(409, 'Subject already randomized');
    return allow();
}

/**
 * Pick the allocation slot for a subject: lowest id among unused slots, filtered
 * by stratum when the study is stratified. Returns null when the list is
 * exhausted — the caller must refuse to randomize rather than invent an arm.
 */
export function pickNextSlot(slots, stratum = null) {
    const eligible = slots
        .filter(s => !s.isUsed && (!stratum || s.stratum === stratum))
        .sort((a, b) => a.id - b.id);
    return eligible[0] ?? null;
}

export function noSlotError(stratum) {
    return 'No available randomization slots' + (stratum ? ` for stratum "${stratum}"` : '');
}

/** Guard for PATCH /api/randomization/:id/unblind (admin only). */
export function canUnblind(assignment, { reason } = {}) {
    if (!reason) return deny(400, 'reason is required for unblinding');
    if (!assignment) return deny(404, 'Randomization record not found');
    if (!assignment.isBlinded) return deny(409, 'Already unblinded');
    return allow();
}

/** Counters for GET /api/randomization/stats. */
export function randomizationStats(slots, assignments) {
    return {
        totalSlots: slots.length,
        usedSlots:  slots.filter(l => l.isUsed).length,
        available:  slots.filter(l => !l.isUsed).length,
        randomized: assignments.length,
        unblinded:  assignments.filter(a => !a.isBlinded).length,
    };
}
