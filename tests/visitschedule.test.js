// Unit tests for the per-study protocol visit schedule (lib/visitschedule.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeVisitSchedule, plannedDateFor, offsetFromDayOne } from '../src/backend/lib/visitschedule.js';

test('study days have no Day 0: offsets around Day 1', () => {
    assert.equal(offsetFromDayOne(1),   0);    // Day 1 = enrollment date
    assert.equal(offsetFromDayOne(2),   1);
    assert.equal(offsetFromDayOne(29),  28);
    assert.equal(offsetFromDayOne(-1), -1);    // day before Day 1
    assert.equal(offsetFromDayOne(-14), -14);
});

test('plannedDateFor derives calendar dates from the enrollment date', () => {
    assert.equal(plannedDateFor('2026-07-23',   1), '2026-07-23');
    assert.equal(plannedDateFor('2026-07-23', -14), '2026-07-09');
    assert.equal(plannedDateFor('2026-07-23',  29), '2026-08-20');
});

test('plannedDateFor handles month/year rollover', () => {
    assert.equal(plannedDateFor('2026-12-28', 8), '2027-01-04');
    assert.equal(plannedDateFor('2026-03-01', -1), '2026-02-28');
});

test('plannedDateFor returns null on missing/invalid enrollment date', () => {
    assert.equal(plannedDateFor(null, 1), null);
    assert.equal(plannedDateFor('not-a-date', 1), null);
});

test('sanitize: non-array / empty → null (no template)', () => {
    assert.equal(sanitizeVisitSchedule(null), null);
    assert.equal(sanitizeVisitSchedule('x'), null);
    assert.equal(sanitizeVisitSchedule([]), null);
});

test('sanitize: drops unnamed rows and Day 0', () => {
    const r = sanitizeVisitSchedule([
        { name: 'Baseline', studyDay: 1, windowDays: 0 },
        { name: '',         studyDay: 5 },
        { name: 'Bad',      studyDay: 0 },
        { name: 'NoDay' },
    ]);
    assert.equal(r.length, 1);
    assert.equal(r[0].name, 'Baseline');
});

test('sanitize: sorts by study day and assigns order', () => {
    const r = sanitizeVisitSchedule([
        { name: 'Week 4',    studyDay: 29 },
        { name: 'Screening', studyDay: -14 },
        { name: 'Baseline',  studyDay: 1 },
    ]);
    assert.deepEqual(r.map(v => v.name),  ['Screening', 'Baseline', 'Week 4']);
    assert.deepEqual(r.map(v => v.order), [1, 2, 3]);
});

test('sanitize: coerces numeric strings, clamps negative window to 0', () => {
    const r = sanitizeVisitSchedule([{ name: 'V', studyDay: '10', windowDays: '3' }]);
    assert.equal(r[0].studyDay, 10);
    assert.equal(r[0].windowDays, 3);
    const neg = sanitizeVisitSchedule([{ name: 'V', studyDay: 10, windowDays: -5 }]);
    assert.equal(neg[0].windowDays, 0);
});

test('sanitize: caps the number of visits', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ name: `V${i}`, studyDay: i + 1 }));
    assert.equal(sanitizeVisitSchedule(many).length, 60);
});
