// OQ-04 — Randomization, allocation concealment and blinding.
// Traces to URS-RND-01/02/03; ICH E6(R3) §5.5.4, §5.13.4; ICH E9 §2.3.2.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    BLINDED_LABEL, canSeeTreatmentArm, maskTreatmentArm, maskTreatmentArms,
    validateRandList, normalizeRandEntry, normalizeRandList,
    canRandomize, pickNextSlot, noSlotError, canUnblind, randomizationStats,
} from '../src/backend/lib/randomrules.js';

const slot = (id, arm, stratum = null, isUsed = false) =>
    ({ id, randCode: `R${id}`, treatmentArm: arm, stratum, isUsed });

// ── Blinding ─────────────────────────────────────────────────────────────────

test('a blinded arm is hidden from every role except admin', () => {
    const row = { isBlinded: true, treatmentArm: 'Drug A' };
    for (const role of ['investigator', 'pi', 'crc', 'cra', 'data_manager', 'monitor', '']) {
        assert.equal(canSeeTreatmentArm(row, role), false, `role ${role} must stay blinded`);
        assert.equal(maskTreatmentArm(row, role).treatmentArm, BLINDED_LABEL);
    }
    assert.equal(canSeeTreatmentArm(row, 'admin'), true);
    assert.equal(maskTreatmentArm(row, 'admin').treatmentArm, 'Drug A');
});

test('role matching for unblinding is exact — no case or prefix tricks', () => {
    const row = { isBlinded: true, treatmentArm: 'Drug A' };
    for (const role of ['Admin', 'ADMIN', 'admin ', 'administrator']) {
        assert.equal(maskTreatmentArm(row, role).treatmentArm, BLINDED_LABEL);
    }
});

test('once formally unblinded the arm is visible to everyone', () => {
    const row = { isBlinded: false, treatmentArm: 'Placebo' };
    assert.equal(maskTreatmentArm(row, 'investigator').treatmentArm, 'Placebo');
});

test('masking does not mutate the source row', () => {
    const row = { isBlinded: true, treatmentArm: 'Drug A' };
    maskTreatmentArm(row, 'crc');
    assert.equal(row.treatmentArm, 'Drug A');
});

test('masking preserves every other field on the row', () => {
    const row = { id: 4, subjectId: 9, randCode: 'R004', isBlinded: true, treatmentArm: 'Drug A' };
    const masked = maskTreatmentArm(row, 'crc');
    assert.equal(masked.randCode, 'R004', 'the code stays visible — only the arm is concealed');
    assert.equal(masked.subjectId, 9);
});

test('a mixed list masks only the rows that are still blinded', () => {
    const out = maskTreatmentArms([
        { isBlinded: true,  treatmentArm: 'Drug A' },
        { isBlinded: false, treatmentArm: 'Placebo' },
    ], 'cra');
    assert.deepEqual(out.map(r => r.treatmentArm), [BLINDED_LABEL, 'Placebo']);
});

// ── List upload ──────────────────────────────────────────────────────────────

test('an empty or non-array list is refused', () => {
    assert.equal(validateRandList([]).status, 400);
    assert.equal(validateRandList(null).status, 400);
    assert.equal(validateRandList(undefined).status, 400);
    assert.equal(validateRandList('R001,A').status, 400);
});

test('every entry must carry a code and an arm — one bad row rejects the whole upload', () => {
    const r = validateRandList([
        { randCode: 'R001', treatmentArm: 'A' },
        { randCode: 'R002' },
    ]);
    assert.equal(r.status, 400);
    assert.match(r.error, /needs randCode and treatmentArm/);
});

test('a valid list passes', () => {
    assert.equal(validateRandList([{ randCode: 'R001', treatmentArm: 'A' }]).ok, true);
});

test('codes are trimmed and upper-cased so a lookup can never miss on case', () => {
    assert.equal(normalizeRandEntry({ randCode: '  r001 ', treatmentArm: 'A' }).randCode, 'R001');
});

test('a normalised entry always starts unused, whatever the upload claimed', () => {
    const e = normalizeRandEntry({ randCode: 'R1', treatmentArm: 'A', isUsed: true });
    assert.equal(e.isUsed, false);
});

test('a missing stratum normalises to null, not undefined', () => {
    assert.equal(normalizeRandEntry({ randCode: 'R1', treatmentArm: 'A' }).stratum, null);
});

test('normalising a list preserves order and length', () => {
    const out = normalizeRandList([
        { randCode: 'r3', treatmentArm: 'A' },
        { randCode: 'r1', treatmentArm: 'B' },
    ]);
    assert.deepEqual(out.map(e => e.randCode), ['R3', 'R1']);
});

// ── Allocation ───────────────────────────────────────────────────────────────

test('allocation takes the lowest-id unused slot, preserving list order', () => {
    const slots = [slot(3, 'A'), slot(1, 'B'), slot(2, 'A')];
    assert.equal(pickNextSlot(slots).id, 1);
});

test('used slots are never re-issued', () => {
    const slots = [slot(1, 'A', null, true), slot(2, 'B')];
    assert.equal(pickNextSlot(slots).id, 2);
});

test('a stratified study only draws from the matching stratum', () => {
    const slots = [slot(1, 'A', 'male'), slot(2, 'B', 'female'), slot(3, 'A', 'female')];
    assert.equal(pickNextSlot(slots, 'female').id, 2);
    assert.equal(pickNextSlot(slots, 'male').id, 1);
});

test('an exhausted stratum returns null even when other strata have slots', () => {
    const slots = [slot(1, 'A', 'male', true), slot(2, 'B', 'female')];
    assert.equal(pickNextSlot(slots, 'male'), null);
});

test('an exhausted list returns null rather than inventing an arm', () => {
    assert.equal(pickNextSlot([slot(1, 'A', null, true)]), null);
    assert.equal(pickNextSlot([]), null);
});

test('an unstratified request ignores the stratum column entirely', () => {
    const slots = [slot(1, 'A', 'male'), slot(2, 'B', 'female')];
    assert.equal(pickNextSlot(slots, null).id, 1);
});

test('pickNextSlot does not mutate the caller\'s array order', () => {
    const slots = [slot(3, 'A'), slot(1, 'B')];
    pickNextSlot(slots);
    assert.deepEqual(slots.map(s => s.id), [3, 1]);
});

test('the exhausted-list message names the stratum when the study is stratified', () => {
    assert.equal(noSlotError(null), 'No available randomization slots');
    assert.equal(noSlotError('female'), 'No available randomization slots for stratum "female"');
});

// ── Eligibility to randomize ─────────────────────────────────────────────────

const activeSubject = { id: 1, siteId: 5, status: 'Active' };

test('an Active, unrandomized, in-scope subject may be randomized', () => {
    assert.equal(canRandomize({ subject: activeSubject, existingAssignment: null, siteScope: [5] }).ok, true);
});

test('a subject may never be randomized twice', () => {
    const r = canRandomize({ subject: activeSubject, existingAssignment: { id: 9 }, siteScope: null });
    assert.equal(r.status, 409);
    assert.match(r.error, /already randomized/i);
});

test('only Active subjects can be randomized', () => {
    for (const status of ['Screening', 'Screen Failed', 'Withdrawn', 'Completed']) {
        const r = canRandomize({ subject: { ...activeSubject, status }, existingAssignment: null, siteScope: null });
        assert.equal(r.status, 409, `${status} must not be randomizable`);
    }
});

test('a subject at another site is a 404, so site staff cannot probe the enrolment list', () => {
    const r = canRandomize({ subject: activeSubject, existingAssignment: null, siteScope: [7, 8] });
    assert.equal(r.status, 404);
    assert.equal(r.error, 'Subject not found', 'must not reveal that the subject exists');
});

test('an unknown subject is a 404', () => {
    assert.equal(canRandomize({ subject: null, existingAssignment: null, siteScope: null }).status, 404);
});

test('the site check runs before the status check — no status leak across sites', () => {
    const r = canRandomize({
        subject: { ...activeSubject, status: 'Withdrawn' },
        existingAssignment: null, siteScope: [7],
    });
    assert.equal(r.status, 404);
});

// ── Unblinding ───────────────────────────────────────────────────────────────

test('unblinding demands a documented reason', () => {
    assert.equal(canUnblind({ isBlinded: true }, {}).status, 400);
    assert.match(canUnblind({ isBlinded: true }, {}).error, /reason is required for unblinding/);
    assert.equal(canUnblind({ isBlinded: true }, { reason: 'Medical emergency' }).ok, true);
});

test('a record cannot be unblinded twice', () => {
    const r = canUnblind({ isBlinded: false }, { reason: 'again' });
    assert.equal(r.status, 409);
    assert.match(r.error, /Already unblinded/);
});

test('a missing randomization record is a 404', () => {
    assert.equal(canUnblind(null, { reason: 'x' }).status, 404);
});

// ── Statistics ───────────────────────────────────────────────────────────────

test('randomization stats reconcile: used + available = total', () => {
    const slots = [slot(1, 'A', null, true), slot(2, 'B', null, true), slot(3, 'A'), slot(4, 'B')];
    const assignments = [{ isBlinded: true }, { isBlinded: false }];
    const s = randomizationStats(slots, assignments);
    assert.deepEqual(s, { totalSlots: 4, usedSlots: 2, available: 2, randomized: 2, unblinded: 1 });
    assert.equal(s.usedSlots + s.available, s.totalSlots);
});

test('stats on an empty study are all zero', () => {
    assert.deepEqual(randomizationStats([], []), {
        totalSlots: 0, usedSlots: 0, available: 0, randomized: 0, unblinded: 0,
    });
});
