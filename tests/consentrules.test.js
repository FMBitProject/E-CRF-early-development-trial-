// Unit tests for the informed-consent decision rules (lib/consentrules.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    CONSENT_TASK, isDelegatedForConsent, eligibleConsentTakers,
    earliestProcedure, isConsentLate,
} from '../src/backend/lib/consentrules.js';

const deleg = (over = {}) => ({
    userId: 'u1',
    status: 'Active',
    tasks:  [CONSENT_TASK, 'Randomization'],
    start:  '2026-01-01',
    end:    null,
    ...over,
});

// ── isDelegatedForConsent ──────────────────────────────────────────────

test('delegated staff within an open-ended delegation passes', () => {
    assert.equal(isDelegatedForConsent([deleg()], 'u1', '2026-07-28'), true);
});

test('a different user is never covered by someone else delegation', () => {
    assert.equal(isDelegatedForConsent([deleg()], 'u2', '2026-07-28'), false);
});

test('delegation without the consent task fails', () => {
    const rows = [deleg({ tasks: ['Randomization', 'Sample Collection'] })];
    assert.equal(isDelegatedForConsent(rows, 'u1', '2026-07-28'), false);
});

test('inactive delegation fails even with the right task', () => {
    assert.equal(isDelegatedForConsent([deleg({ status: 'Ended' })], 'u1', '2026-07-28'), false);
});

test('consent dated before the delegation started fails', () => {
    const rows = [deleg({ start: '2026-06-01' })];
    assert.equal(isDelegatedForConsent(rows, 'u1', '2026-05-31'), false);
    assert.equal(isDelegatedForConsent(rows, 'u1', '2026-06-01'), true, 'start date itself is covered');
});

test('consent dated after the delegation ended fails', () => {
    const rows = [deleg({ end: '2026-06-30' })];
    assert.equal(isDelegatedForConsent(rows, 'u1', '2026-07-01'), false);
    assert.equal(isDelegatedForConsent(rows, 'u1', '2026-06-30'), true, 'end date itself is covered');
});

test('an ISO timestamp consent date is compared by day, not string length', () => {
    const rows = [deleg({ start: '2026-01-01', end: '2026-12-31' })];
    assert.equal(isDelegatedForConsent(rows, 'u1', '2026-07-28T09:15:00.000Z'), true);
});

test('non-array tasks (bad jsonb) is treated as no tasks, not a crash', () => {
    assert.equal(isDelegatedForConsent([deleg({ tasks: null })], 'u1', '2026-07-28'), false);
    assert.equal(isDelegatedForConsent([deleg({ tasks: '[]' })], 'u1', '2026-07-28'), false);
});

test('any one matching row is enough when a user has several delegations', () => {
    const rows = [deleg({ end: '2026-03-01' }), deleg({ start: '2026-07-01' })];
    assert.equal(isDelegatedForConsent(rows, 'u1', '2026-07-28'), true);
});

test('empty or missing rows fail closed', () => {
    assert.equal(isDelegatedForConsent([], 'u1', '2026-07-28'), false);
    assert.equal(isDelegatedForConsent(undefined, 'u1', '2026-07-28'), false);
});

// ── eligibleConsentTakers ──────────────────────────────────────────────

test('picker lists only active, consent-delegated, unexpired staff', () => {
    const rows = [
        deleg({ userId: 'a' }),
        deleg({ userId: 'b', status: 'Ended' }),
        deleg({ userId: 'c', tasks: ['Randomization'] }),
        deleg({ userId: 'd', end: '2026-01-31' }),
    ];
    assert.deepEqual(eligibleConsentTakers(rows, '2026-07-28').map(r => r.userId), ['a']);
});

test('a delegation that has not started yet is still offered', () => {
    // The date check runs on save against the consent date, which may be later.
    const rows = [deleg({ userId: 'a', start: '2027-01-01' })];
    assert.equal(eligibleConsentTakers(rows, '2026-07-28').length, 1);
});

// ── earliestProcedure ──────────────────────────────────────────────────

test('earliest of visits and screening wins', () => {
    const visits = [
        { actualDate: '2026-07-10', visitName: 'Week 4' },
        { actualDate: '2026-07-02', visitName: 'Baseline' },
    ];
    const screens = [{ screeningDate: '2026-06-28' }];
    assert.deepEqual(earliestProcedure(visits, screens), { date: '2026-06-28', label: 'screening' });
});

test('visitDate is used when actualDate is absent', () => {
    const visits = [{ actualDate: null, visitDate: '2026-07-02', visitName: 'Baseline' }];
    assert.deepEqual(earliestProcedure(visits, []), { date: '2026-07-02', label: 'visit "Baseline"' });
});

test('planned-only visits (no date recorded) are not procedures', () => {
    const visits = [{ actualDate: null, visitDate: null, visitName: 'Week 8' }];
    assert.equal(earliestProcedure(visits, []), null);
});

test('nothing on record → null', () => {
    assert.equal(earliestProcedure([], []), null);
    assert.equal(earliestProcedure(undefined, undefined), null);
});

// ── isConsentLate ──────────────────────────────────────────────────────

test('consent after the first procedure is late', () => {
    assert.equal(isConsentLate('2026-07-03', '2026-07-01'), true);
});

test('consent before the first procedure is fine', () => {
    assert.equal(isConsentLate('2026-06-30', '2026-07-01'), false);
});

test('same-day consent is not flagged — the date cannot prove the sequence', () => {
    assert.equal(isConsentLate('2026-07-01', '2026-07-01'), false);
});

test('a missing date on either side never raises a deviation', () => {
    assert.equal(isConsentLate(null, '2026-07-01'), false);
    assert.equal(isConsentLate('2026-07-01', null), false);
});

test('dates spanning a year boundary compare correctly', () => {
    assert.equal(isConsentLate('2027-01-02', '2026-12-31'), true);
    assert.equal(isConsentLate('2026-12-31', '2027-01-02'), false);
});
