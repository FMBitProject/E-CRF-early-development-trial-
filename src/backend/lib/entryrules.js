/**
 * CRF data-entry lifecycle rules — pure, no DB.
 *
 * The entry state machine enforced here is the core of 21 CFR Part 11 §11.10(a)/(e)
 * and ICH E6(R3) §5.5: who may change a record, when a reason for change is
 * mandatory, and which transitions are forbidden.
 *
 *   Draft ──save──▶ Saved ──sign──▶ Signed ──lock──▶ Locked
 *                     ▲               │                 │
 *                     └──edit(reason)─┘                 └──unlock(admin)──▶ Saved
 *
 * Every guard returns either { ok: true } or { ok: false, status, error } so the
 * route layer can respond without re-deriving the rule.
 */

export const ENTRY_STATUSES = ['Draft', 'Saved', 'Signed', 'Locked'];

const deny = (status, error) => ({ ok: false, status, error });
const allow = (extra = {}) => ({ ok: true, ...extra });

/**
 * Guard for POST /api/entries when an entry already exists (i.e. an update).
 * A Locked entry is immutable; every other update needs a reason for change.
 */
export function canUpdateEntry(existing, { reason } = {}) {
    if (existing?.status === 'Locked') {
        return deny(409, 'Entry is locked and cannot be modified');
    }
    if (!reason) {
        return deny(400, 'reason is required when updating an existing entry (21 CFR Part 11)');
    }
    return allow();
}

/**
 * Status an entry takes after a successful update. Editing a Signed entry
 * invalidates the signature and returns the record to Saved — the investigator
 * must re-sign (21 CFR Part 11 §11.70, signature/record linking).
 */
export function statusAfterUpdate() {
    return 'Saved';
}

/** Status for a newly created entry. Only an explicit 'Draft' keeps it a draft. */
export function statusForNewEntry(requestedStatus) {
    return requestedStatus === 'Draft' ? 'Draft' : 'Saved';
}

/** Guard for PATCH /api/entries/:id/lock (CRA / PI / admin). */
export function canLockEntry(entry, { reason } = {}) {
    if (!reason) return deny(400, 'Lock reason is required');
    if (!entry)  return deny(404, 'Entry not found');
    if (entry.status === 'Locked') return deny(409, 'Already locked');
    return allow();
}

/** Guard for PATCH /api/entries/:id/unlock (admin only). */
export function canUnlockEntry(entry, { reason } = {}) {
    if (!reason) return deny(400, 'Unlock reason is required');
    if (!entry)  return deny(404, 'Entry not found');
    if (entry.status !== 'Locked') return deny(409, 'Entry is not locked');
    return allow();
}

/**
 * Guard for POST /api/signatures. Order matters: a locked or already-signed
 * entry is rejected before the password is ever checked, so a failed signature
 * attempt never leaks whether the credential was right.
 */
export function canSignEntry(entry) {
    if (!entry) return deny(404, 'Entry not found');
    if (entry.status === 'Locked') return deny(409, 'Entry is locked');
    if (entry.status === 'Signed') return deny(409, 'Entry already signed');
    if (entry.status === 'Draft')  return deny(400, 'Save entry before signing');
    return allow();
}

/**
 * Ownership/scope check shared by every entry mutation: the entry's subject must
 * belong to the active study and to a site the caller is assigned to.
 * `siteScope` is null/undefined for unrestricted roles (admin, CRA, data manager).
 */
export function checkEntryScope({ subject, activeStudyId, siteScope }) {
    if (!subject) return deny(404, 'Subject not found');
    if (subject.studyId !== activeStudyId) {
        return deny(403, 'Subject does not belong to the active study');
    }
    if (Array.isArray(siteScope) && !siteScope.includes(subject.siteId)) {
        return deny(403, 'Subject is not at your assigned site');
    }
    return allow();
}
