// OQ-01 — CRF data-entry lifecycle and reason-for-change enforcement.
// Traces to URS-DM-01/02/03 and 21 CFR Part 11 §11.10(a),(e); ICH E6(R3) §5.5.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    canUpdateEntry, canLockEntry, canUnlockEntry, canSignEntry,
    checkEntryScope, statusAfterUpdate, statusForNewEntry, ENTRY_STATUSES,
} from '../src/backend/lib/entryrules.js';

const entry = (status, extra = {}) => ({ id: 1, subjectId: 7, status, ...extra });

// ── Reason for change (21 CFR Part 11 §11.10(e)) ─────────────────────────────

test('updating an existing entry without a reason is rejected', () => {
    const r = canUpdateEntry(entry('Saved'), {});
    assert.equal(r.ok, false);
    assert.equal(r.status, 400);
    assert.match(r.error, /reason is required/i);
    assert.match(r.error, /21 CFR Part 11/);
});

test('an empty-string reason does not satisfy the requirement', () => {
    for (const reason of ['', null, undefined, 0]) {
        const r = canUpdateEntry(entry('Saved'), { reason });
        assert.equal(r.ok, false, `reason ${JSON.stringify(reason)} must be rejected`);
        assert.equal(r.status, 400);
    }
});

test('a non-empty reason permits the update', () => {
    assert.deepEqual(canUpdateEntry(entry('Saved'), { reason: 'Transcription error' }), { ok: true });
});

// ── Locked records are immutable ─────────────────────────────────────────────

test('a Locked entry cannot be updated even with a reason', () => {
    const r = canUpdateEntry(entry('Locked'), { reason: 'PI asked me to' });
    assert.equal(r.ok, false);
    assert.equal(r.status, 409);
    assert.match(r.error, /locked and cannot be modified/i);
});

test('the lock check runs before the reason check — a locked entry is never a 400', () => {
    // Otherwise a caller could probe lock state by omitting the reason.
    const r = canUpdateEntry(entry('Locked'), {});
    assert.equal(r.status, 409);
});

// ── Editing a signed record invalidates the signature ────────────────────────

test('a Signed entry may be corrected, and reverts to Saved so it must be re-signed', () => {
    assert.equal(canUpdateEntry(entry('Signed'), { reason: 'Lab value corrected' }).ok, true);
    assert.equal(statusAfterUpdate(), 'Saved');
});

test('every update lands in Saved, never silently back in Draft', () => {
    assert.equal(statusAfterUpdate(), 'Saved');
});

// ── New-entry status ─────────────────────────────────────────────────────────

test('only an explicit "Draft" creates a draft; anything else is Saved', () => {
    assert.equal(statusForNewEntry('Draft'), 'Draft');
    assert.equal(statusForNewEntry('Saved'), 'Saved');
    assert.equal(statusForNewEntry(undefined), 'Saved');
    // A client must not be able to self-declare a Signed or Locked record.
    assert.equal(statusForNewEntry('Signed'), 'Saved');
    assert.equal(statusForNewEntry('Locked'), 'Saved');
    assert.equal(statusForNewEntry('draft'), 'Saved');   // exact match only
});

// ── Lock / unlock ────────────────────────────────────────────────────────────

test('locking requires a reason and a real entry, and cannot be replayed', () => {
    assert.equal(canLockEntry(entry('Saved'), {}).status, 400);
    assert.equal(canLockEntry(null, { reason: 'SDV complete' }).status, 404);
    assert.equal(canLockEntry(entry('Locked'), { reason: 'again' }).status, 409);
    assert.equal(canLockEntry(entry('Saved'), { reason: 'SDV complete' }).ok, true);
    assert.equal(canLockEntry(entry('Signed'), { reason: 'SDV complete' }).ok, true);
});

test('unlocking is only possible from Locked, and needs a reason', () => {
    assert.equal(canUnlockEntry(entry('Locked'), {}).status, 400);
    assert.equal(canUnlockEntry(null, { reason: 'x' }).status, 404);
    assert.equal(canUnlockEntry(entry('Saved'), { reason: 'x' }).status, 409);
    assert.match(canUnlockEntry(entry('Saved'), { reason: 'x' }).error, /not locked/i);
    assert.equal(canUnlockEntry(entry('Locked'), { reason: 'Query reopened by DM' }).ok, true);
});

test('a missing entry is a 404 before the reason is even considered — no existence oracle', () => {
    // The reason check fires first by design (it is a client-side input error),
    // but a caller supplying a reason must not learn that an id does not exist
    // through any status other than 404.
    assert.equal(canLockEntry(null, { reason: 'r' }).status, 404);
    assert.equal(canUnlockEntry(null, { reason: 'r' }).status, 404);
});

// ── Electronic signature preconditions (21 CFR Part 11 §11.70) ───────────────

test('only a Saved entry can be signed', () => {
    assert.equal(canSignEntry(entry('Saved')).ok, true);
});

test('Draft, Signed and Locked entries are refused, each with its own status', () => {
    assert.equal(canSignEntry(entry('Draft')).status, 400);
    assert.match(canSignEntry(entry('Draft')).error, /save entry before signing/i);

    assert.equal(canSignEntry(entry('Signed')).status, 409);
    assert.match(canSignEntry(entry('Signed')).error, /already signed/i);

    assert.equal(canSignEntry(entry('Locked')).status, 409);
    assert.match(canSignEntry(entry('Locked')).error, /locked/i);

    assert.equal(canSignEntry(null).status, 404);
});

test('a signature can never be applied twice to the same record', () => {
    const signed = entry('Signed');
    assert.equal(canSignEntry(signed).ok, false);
    assert.equal(canSignEntry(signed).status, 409);
});

// ── Study and site scoping ───────────────────────────────────────────────────

test('an entry for a subject in another study is refused', () => {
    const r = checkEntryScope({
        subject: { studyId: 2, siteId: 5 }, activeStudyId: 1, siteScope: null,
    });
    assert.equal(r.status, 403);
    assert.match(r.error, /does not belong to the active study/i);
});

test('a site-scoped user cannot write to a subject at another site', () => {
    const r = checkEntryScope({
        subject: { studyId: 1, siteId: 9 }, activeStudyId: 1, siteScope: [5, 6],
    });
    assert.equal(r.status, 403);
    assert.match(r.error, /not at your assigned site/i);
});

test('a null site scope means unrestricted (admin, CRA, data manager)', () => {
    for (const siteScope of [null, undefined]) {
        assert.equal(
            checkEntryScope({ subject: { studyId: 1, siteId: 9 }, activeStudyId: 1, siteScope }).ok,
            true,
        );
    }
});

test('an empty site-scope array grants nothing, rather than everything', () => {
    const r = checkEntryScope({ subject: { studyId: 1, siteId: 9 }, activeStudyId: 1, siteScope: [] });
    assert.equal(r.ok, false);
    assert.equal(r.status, 403);
});

test('a missing subject is a 404, not a 403', () => {
    assert.equal(checkEntryScope({ subject: null, activeStudyId: 1, siteScope: null }).status, 404);
});

test('the declared status vocabulary matches what the guards accept', () => {
    assert.deepEqual(ENTRY_STATUSES, ['Draft', 'Saved', 'Signed', 'Locked']);
});
