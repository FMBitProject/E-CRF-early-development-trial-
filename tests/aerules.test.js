// OQ-03 — Adverse event / SAE expedited-reporting rules.
// Traces to URS-SAF-01/02/03; ICH E2A §3.3; 21 CFR 312.32(c)(1); ICH E6(R3) §4.11.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    expeditedWindowDays, calcExpeditedDeadline, requiresExpeditedReport,
    canCreateAe, canEditAe, resolveSeriousness, resolveReportStatus,
    isOverdue, computeAeStats, URGENT_CRITERIA, SERIOUS_CRITERIA,
} from '../src/backend/lib/aerules.js';

const T0 = new Date('2026-07-01T00:00:00.000Z');
const daysBetween = (a, b) => Math.round((b - a) / 86400000);

// ── Reporting windows ────────────────────────────────────────────────────────

test('a non-serious AE has no expedited window and no deadline', () => {
    assert.equal(expeditedWindowDays(false, []), null);
    assert.equal(calcExpeditedDeadline(false, [], T0), null);
    assert.equal(calcExpeditedDeadline(false, ['death'], T0), null,
        'criteria are irrelevant when the AE is not flagged serious');
});

test('a fatal SAE gets the 7-day window', () => {
    assert.equal(expeditedWindowDays(true, ['death']), 7);
    assert.equal(daysBetween(T0, calcExpeditedDeadline(true, ['death'], T0)), 7);
});

test('a life-threatening SAE gets the 7-day window', () => {
    assert.equal(expeditedWindowDays(true, ['life_threatening']), 7);
    assert.equal(daysBetween(T0, calcExpeditedDeadline(true, ['life_threatening'], T0)), 7);
});

test('all other SAEs get the 15-day window', () => {
    for (const c of ['hospitalization', 'disability', 'congenital', 'medically_important']) {
        assert.equal(expeditedWindowDays(true, [c]), 15, `${c} must be a 15-day SAE`);
    }
    assert.equal(daysBetween(T0, calcExpeditedDeadline(true, ['hospitalization'], T0)), 15);
});

test('an SAE with no criteria recorded still gets the 15-day window, never none', () => {
    assert.equal(expeditedWindowDays(true, []), 15);
    assert.equal(expeditedWindowDays(true, null), 15);
    assert.equal(expeditedWindowDays(true, undefined), 15);
});

test('the shortest applicable window wins when criteria are combined', () => {
    assert.equal(expeditedWindowDays(true, ['hospitalization', 'death']), 7);
    assert.equal(expeditedWindowDays(true, ['disability', 'life_threatening', 'congenital']), 7);
});

test('an unrecognised criterion falls back to 15 days rather than dropping the deadline', () => {
    assert.equal(expeditedWindowDays(true, ['something_new']), 15);
});

test('the deadline is computed from the injected clock and crosses month ends correctly', () => {
    const lateJuly = new Date('2026-07-28T10:00:00.000Z');
    const d = calcExpeditedDeadline(true, ['hospitalization'], lateJuly);
    assert.equal(d.toISOString().split('T')[0], '2026-08-12');
});

test('calcExpeditedDeadline does not mutate the clock it was given', () => {
    const now = new Date(T0.getTime());
    calcExpeditedDeadline(true, ['death'], now);
    assert.equal(now.getTime(), T0.getTime());
});

test('every serious AE requires an expedited report regardless of criteria', () => {
    assert.equal(requiresExpeditedReport(true), true);
    assert.equal(requiresExpeditedReport(false), false);
});

test('the urgent criteria are exactly death and life-threatening', () => {
    assert.deepEqual(URGENT_CRITERIA, ['death', 'life_threatening']);
    for (const c of URGENT_CRITERIA) assert.ok(SERIOUS_CRITERIA.includes(c));
    assert.equal(SERIOUS_CRITERIA.length, 6, 'the full ICH E2A seriousness vocabulary');
});

// ── Seriousness resolution on partial updates ────────────────────────────────

test('a PATCH that omits isSerious keeps the stored seriousness', () => {
    const existing = { isSerious: true, seriousCriteria: ['death'] };
    const r = resolveSeriousness({ narrative: 'more detail' }, existing);
    assert.equal(r.isSerious, true);
    assert.deepEqual(r.seriousCriteria, ['death']);
});

test('a PATCH cannot silently downgrade an SAE by omitting the criteria array', () => {
    const existing = { isSerious: true, seriousCriteria: ['life_threatening'] };
    const r = resolveSeriousness({ severity: 'Moderate' }, existing);
    assert.equal(expeditedWindowDays(r.isSerious, r.seriousCriteria), 7,
        'the 7-day clock must survive an unrelated edit');
});

test('an explicit isSerious:false does downgrade the AE', () => {
    const r = resolveSeriousness({ isSerious: false }, { isSerious: true, seriousCriteria: ['death'] });
    assert.equal(r.isSerious, false);
    assert.equal(calcExpeditedDeadline(r.isSerious, r.seriousCriteria, T0), null);
});

test('on create, seriousness defaults to not-serious with no criteria', () => {
    const r = resolveSeriousness({}, null);
    assert.equal(r.isSerious, false);
    assert.deepEqual(r.seriousCriteria, []);
});

test('a non-array seriousCriteria is ignored rather than stored', () => {
    const r = resolveSeriousness({ isSerious: true, seriousCriteria: 'death' }, null);
    assert.deepEqual(r.seriousCriteria, []);
});

// ── Create / edit guards ─────────────────────────────────────────────────────

test('an AE needs a subject, a term and a severity', () => {
    assert.equal(canCreateAe({ subjectId: 1, aeTerm: 'Headache', severity: 'Mild' }).ok, true);
    assert.equal(canCreateAe({ aeTerm: 'Headache', severity: 'Mild' }).status, 400);
    assert.equal(canCreateAe({ subjectId: 1, severity: 'Mild' }).status, 400);
    assert.equal(canCreateAe({ subjectId: 1, aeTerm: 'Headache' }).status, 400);
});

test('editing an AE requires a reason (ICH GCP)', () => {
    assert.equal(canEditAe({ reportStatus: 'Draft' }, {}).status, 400);
    assert.match(canEditAe({ reportStatus: 'Draft' }, {}).error, /reason is required/i);
    assert.equal(canEditAe({ reportStatus: 'Draft' }, { reason: 'Onset date corrected' }).ok, true);
});

test('a closed AE is frozen', () => {
    const r = canEditAe({ reportStatus: 'Closed' }, { reason: 'let me in' });
    assert.equal(r.status, 409);
    assert.match(r.error, /Cannot edit a closed adverse event/);
});

test('a missing AE is a 404', () => {
    assert.equal(canEditAe(null, { reason: 'x' }).status, 404);
});

// ── Dual-channel reporting ───────────────────────────────────────────────────

test('reporting to the sponsor alone does not mark the AE Reported', () => {
    const existing = { reportStatus: 'Draft', reportedToSponsorAt: null, reportedToIrbAt: null };
    assert.equal(resolveReportStatus(existing, { reportedToSponsor: true }), 'Draft');
});

test('reporting to the IRB alone does not mark the AE Reported', () => {
    const existing = { reportStatus: 'Draft', reportedToSponsorAt: null, reportedToIrbAt: null };
    assert.equal(resolveReportStatus(existing, { reportedToIrb: true }), 'Draft');
});

test('both channels in one call marks it Reported', () => {
    const existing = { reportStatus: 'Draft', reportedToSponsorAt: null, reportedToIrbAt: null };
    assert.equal(resolveReportStatus(existing, { reportedToSponsor: true, reportedToIrb: true }), 'Reported');
});

test('the second channel completes a report started earlier', () => {
    const existing = { reportStatus: 'Draft', reportedToSponsorAt: T0, reportedToIrbAt: null };
    assert.equal(resolveReportStatus(existing, { reportedToIrb: true }), 'Reported');
});

test('a report call with neither flag leaves the status untouched', () => {
    assert.equal(resolveReportStatus({ reportStatus: 'Draft' }, {}), 'Draft');
    assert.equal(resolveReportStatus({ reportStatus: 'Reported', reportedToSponsorAt: T0, reportedToIrbAt: T0 }, {}), 'Reported');
});

test('resolveReportStatus is not the guard that protects a Closed AE', () => {
    // With both channels already complete the rule resolves to 'Reported' even
    // for a Closed AE. Freezing a closed record is canEditAe's job; this test
    // pins the division of responsibility so neither guard is removed as
    // redundant.
    const closed = { reportStatus: 'Closed', reportedToSponsorAt: T0, reportedToIrbAt: T0 };
    assert.equal(resolveReportStatus(closed, {}), 'Reported');
    assert.equal(canEditAe(closed, { reason: 'x' }).status, 409);
});

// ── Overdue detection ────────────────────────────────────────────────────────

const past   = new Date('2026-06-01T00:00:00.000Z');
const future = new Date('2026-09-01T00:00:00.000Z');

test('an SAE past its deadline and not closed is overdue', () => {
    assert.equal(isOverdue({
        requiresExpeditedReport: true, reportStatus: 'Draft', expeditedDeadline: past,
    }, T0), true);
});

test('an SAE still within its window is not overdue', () => {
    assert.equal(isOverdue({
        requiresExpeditedReport: true, reportStatus: 'Draft', expeditedDeadline: future,
    }, T0), false);
});

test('a closed SAE is never overdue', () => {
    assert.equal(isOverdue({
        requiresExpeditedReport: true, reportStatus: 'Closed', expeditedDeadline: past,
    }, T0), false);
});

test('a non-expedited AE is never overdue, even with a stale deadline', () => {
    assert.equal(isOverdue({
        requiresExpeditedReport: false, reportStatus: 'Draft', expeditedDeadline: past,
    }, T0), false);
});

test('an SAE with no deadline recorded is not counted as overdue', () => {
    assert.equal(isOverdue({
        requiresExpeditedReport: true, reportStatus: 'Draft', expeditedDeadline: null,
    }, T0), false);
});

test('a Reported-but-not-Closed SAE past deadline still counts as overdue', () => {
    assert.equal(isOverdue({
        requiresExpeditedReport: true, reportStatus: 'Reported', expeditedDeadline: past,
    }, T0), true);
});

test('an ISO date string deadline is compared correctly, not lexically', () => {
    assert.equal(isOverdue({
        requiresExpeditedReport: true, reportStatus: 'Draft',
        expeditedDeadline: '2026-06-01T00:00:00.000Z',
    }, T0), true);
});

// ── Dashboard counters ───────────────────────────────────────────────────────

test('computeAeStats counts total, serious, draft and overdue independently', () => {
    const rows = [
        { isSerious: false, reportStatus: 'Draft',    requiresExpeditedReport: false, expeditedDeadline: null },
        { isSerious: true,  reportStatus: 'Draft',    requiresExpeditedReport: true,  expeditedDeadline: past },
        { isSerious: true,  reportStatus: 'Reported', requiresExpeditedReport: true,  expeditedDeadline: future },
        { isSerious: true,  reportStatus: 'Closed',   requiresExpeditedReport: true,  expeditedDeadline: past },
    ];
    assert.deepEqual(computeAeStats(rows, T0), { total: 4, serious: 3, draft: 2, overdue: 1 });
});

test('computeAeStats on an empty study returns all zeros', () => {
    assert.deepEqual(computeAeStats([], T0), { total: 0, serious: 0, draft: 0, overdue: 0 });
});
