// OQ-05 — Study database lock: pre-lock checklist and dual-signature workflow.
// Traces to URS-DBL-01/02/03; ICH E6(R3) §5.5.7; 21 CFR Part 11 §11.10, §11.200.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildPreLockChecks, canInitiateLock, canSignCra, canSignAdmin,
    statusAfterCraSignature, statusAfterAdminSignature, currentLockState,
    IN_FLIGHT_STATUSES,
} from '../src/backend/lib/dblockrules.js';

const CLEAN = {
    openQueries: 0, resolvedQueries: 0, draftEntries: 0,
    savedEntries: 0, draftSAEs: 0, openDeviations: 0,
};
const RUN_AT = new Date('2026-07-28T09:00:00.000Z');
const byId = (result) => Object.fromEntries(result.checks.map(c => [c.id, c]));

// ── Pre-lock checklist ───────────────────────────────────────────────────────

test('a fully clean study passes all six checks', () => {
    const r = buildPreLockChecks(CLEAN, RUN_AT);
    assert.equal(r.checks.length, 6);
    assert.equal(r.allPassed, true);
    assert.ok(r.checks.every(c => c.passed));
    assert.equal(r.runAt, '2026-07-28T09:00:00.000Z');
});

test('every check carries the regulatory clause it enforces', () => {
    for (const c of buildPreLockChecks(CLEAN, RUN_AT).checks) {
        assert.ok(c.id && c.label && c.detail, `check ${c.id} is incomplete`);
        assert.match(c.ref, /ICH|CFR/, `check ${c.id} must cite its source`);
    }
});

test('a single open query blocks the lock', () => {
    const r = buildPreLockChecks({ ...CLEAN, openQueries: 1 }, RUN_AT);
    assert.equal(r.allPassed, false);
    assert.equal(byId(r).queries_open.passed, false);
    assert.match(byId(r).queries_open.detail, /1 open query must be resolved/);
});

test('a resolved-but-not-closed query also blocks the lock', () => {
    const r = buildPreLockChecks({ ...CLEAN, resolvedQueries: 2 }, RUN_AT);
    assert.equal(r.allPassed, false);
    assert.match(byId(r).queries_resolved.detail, /2 resolved queries awaiting CRA closure/);
});

test('draft CRF entries block the lock', () => {
    const r = buildPreLockChecks({ ...CLEAN, draftEntries: 3 }, RUN_AT);
    assert.equal(byId(r).entries_draft.passed, false);
    assert.match(byId(r).entries_draft.detail, /3 forms still in Draft/);
});

test('saved-but-unsigned entries block the lock (Part 11 signature requirement)', () => {
    const r = buildPreLockChecks({ ...CLEAN, savedEntries: 1 }, RUN_AT);
    assert.equal(byId(r).entries_unsigned.passed, false);
    assert.match(byId(r).entries_unsigned.detail, /1 form saved but not signed/);
    assert.match(byId(r).entries_unsigned.ref, /21 CFR Part 11/);
});

test('an unreported SAE blocks the lock', () => {
    const r = buildPreLockChecks({ ...CLEAN, draftSAEs: 1 }, RUN_AT);
    assert.equal(byId(r).sae_unreported.passed, false);
    assert.match(byId(r).sae_unreported.detail, /1 serious AE in Draft/);
});

test('an open protocol deviation blocks the lock until CAPA is closed', () => {
    const r = buildPreLockChecks({ ...CLEAN, openDeviations: 2 }, RUN_AT);
    assert.equal(byId(r).deviations_open.passed, false);
    assert.match(byId(r).deviations_open.detail, /2 deviations still Open/);
});

test('counts arriving as SQL bigint strings are coerced, not truthiness-tested', () => {
    // Postgres COUNT() comes back as a string. '0' is truthy in JS — if the rule
    // tested truthiness instead of numeric equality, a clean study would fail.
    const r = buildPreLockChecks({
        openQueries: '0', resolvedQueries: '0', draftEntries: '0',
        savedEntries: '0', draftSAEs: '0', openDeviations: '0',
    }, RUN_AT);
    assert.equal(r.allPassed, true);
});

test('a non-zero bigint string is still detected as a failure', () => {
    const r = buildPreLockChecks({ ...CLEAN, openQueries: '7' }, RUN_AT);
    assert.equal(r.allPassed, false);
    assert.match(byId(r).queries_open.detail, /7 open queries/);
});

test('missing counts are treated as zero rather than crashing the checklist', () => {
    const r = buildPreLockChecks({}, RUN_AT);
    assert.equal(r.checks.length, 6);
    assert.equal(r.allPassed, true);
});

test('all six failing at once produces six failures, not a short-circuit', () => {
    const r = buildPreLockChecks({
        openQueries: 1, resolvedQueries: 1, draftEntries: 1,
        savedEntries: 1, draftSAEs: 1, openDeviations: 1,
    }, RUN_AT);
    assert.equal(r.checks.filter(c => !c.passed).length, 6);
    assert.equal(r.allPassed, false);
});

test('singular and plural wording is correct at the 1 / 2 boundary', () => {
    assert.match(byId(buildPreLockChecks({ ...CLEAN, openQueries: 1 }, RUN_AT)).queries_open.detail, /1 open query /);
    assert.match(byId(buildPreLockChecks({ ...CLEAN, openQueries: 2 }, RUN_AT)).queries_open.detail, /2 open queries /);
    assert.match(byId(buildPreLockChecks({ ...CLEAN, draftEntries: 1 }, RUN_AT)).entries_draft.detail, /1 form still/);
    assert.match(byId(buildPreLockChecks({ ...CLEAN, draftEntries: 2 }, RUN_AT)).entries_draft.detail, /2 forms still/);
});

// ── Initiating a lock ────────────────────────────────────────────────────────

test('a study with no lock history can be initiated', () => {
    assert.equal(canInitiateLock(null).ok, true);
    assert.equal(canInitiateLock(undefined).ok, true);
});

test('an already-locked study cannot be re-initiated', () => {
    const r = canInitiateLock({ status: 'Locked' });
    assert.equal(r.status, 409);
    assert.match(r.error, /already locked/i);
});

test('a lock request already in flight blocks a second one', () => {
    // Regression: 'Pending Signatures' — the status set the moment a lock is
    // initiated — was previously not blocked, so a second POST /initiate created
    // a duplicate lock request with its own independent signature pair.
    for (const status of IN_FLIGHT_STATUSES) {
        const r = canInitiateLock({ status });
        assert.equal(r.ok, false, `status ${status} must block a new request`);
        assert.equal(r.status, 409);
    }
});

test('a rejected or cancelled request does not block a fresh attempt', () => {
    assert.equal(canInitiateLock({ status: 'Rejected' }).ok, true);
});

// ── Dual signature ───────────────────────────────────────────────────────────

const pending = { id: 1, craSigned: false, adminSigned: false, status: 'Pending Signatures' };

test('both signatures require the password to be re-entered', () => {
    assert.equal(canSignCra(pending, {}).status, 400);
    assert.equal(canSignAdmin({ ...pending, craSigned: true }, {}).status, 400);
    assert.match(canSignCra(pending, {}).error, /Password required for electronic signature/);
});

test('the CRA may sign a pending lock', () => {
    assert.equal(canSignCra(pending, { password: 'pw' }).ok, true);
});

test('neither signature can be replayed', () => {
    assert.equal(canSignCra({ ...pending, craSigned: true }, { password: 'pw' }).status, 409);
    assert.equal(canSignAdmin({ ...pending, craSigned: true, adminSigned: true }, { password: 'pw' }).status, 409);
});

test('the admin cannot sign before the CRA — the order of review is enforced', () => {
    const r = canSignAdmin(pending, { password: 'pw' });
    assert.equal(r.ok, false);
    assert.equal(r.status, 400);
    assert.match(r.error, /CRA must sign before admin approval/);
});

test('the admin may countersign once the CRA has signed', () => {
    assert.equal(canSignAdmin({ ...pending, craSigned: true }, { password: 'pw' }).ok, true);
});

test('a missing lock record is a 404 on both signature endpoints', () => {
    assert.equal(canSignCra(null, { password: 'pw' }).status, 404);
    assert.equal(canSignAdmin(null, { password: 'pw' }).status, 404);
});

test('the guard runs before the password is verified, so a bad id never reaches auth', () => {
    assert.equal(canSignCra(null, { password: 'wrong' }).status, 404);
    assert.equal(canSignCra({ ...pending, craSigned: true }, { password: 'wrong' }).status, 409);
});

// ── Resulting status ─────────────────────────────────────────────────────────

test('the CRA signature moves the request to Pending Approval', () => {
    assert.equal(statusAfterCraSignature({ adminSigned: false }), 'Pending Approval');
});

test('a CRA signature on an already-countersigned request marks it Approved', () => {
    assert.equal(statusAfterCraSignature({ adminSigned: true }), 'Approved');
});

test('the admin signature is the act that locks the database', () => {
    assert.equal(statusAfterAdminSignature(), 'Locked');
});

// ── Current state derivation ─────────────────────────────────────────────────

test('the latest record in the history is the current state', () => {
    const history = [{ status: 'Rejected' }, { status: 'Locked' }];
    const s = currentLockState(history);
    assert.equal(s.isLocked, true);
    assert.equal(s.status, 'Locked');
    assert.equal(s.current, history[1]);
    assert.equal(s.history.length, 2);
});

test('a study with no lock history reports unlocked with a null status', () => {
    const s = currentLockState([]);
    assert.deepEqual({ isLocked: s.isLocked, status: s.status, current: s.current }, {
        isLocked: false, status: null, current: null,
    });
});

test('an in-flight request is not reported as locked', () => {
    for (const status of IN_FLIGHT_STATUSES) {
        assert.equal(currentLockState([{ status }]).isLocked, false, `${status} is not locked`);
    }
});
