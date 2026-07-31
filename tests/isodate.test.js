// OQ-A20 — export date formatting (lib/isodate.js).
// Traces to URS-EXP-01/02.
//
// `new Date('garbage').toISOString()` throws. Before this module, one malformed
// stored date aborted the entire ODM or CSV export with a 500 — nobody could
// export anything until the offending row was found by hand.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDate, isoDay, isoDateTime, EXPORT_TZ } from '../src/backend/lib/isodate.js';

test('an ISO timestamp is reduced to its calendar day', () => {
    assert.equal(isoDay('2026-07-28T09:30:00.000Z'), '2026-07-28');
    assert.equal(isoDay(new Date('2026-07-28T09:30:00.000Z')), '2026-07-28');
});

test('a full instant is preserved by isoDateTime', () => {
    assert.equal(isoDateTime('2026-07-28T09:30:00.000Z'), '2026-07-28T09:30:00.000Z');
});

test('an absent value yields an empty string, not a 1970 date', () => {
    for (const v of [null, undefined, '']) {
        assert.equal(isoDay(v), '', `${JSON.stringify(v)} must be empty`);
        assert.equal(isoDateTime(v), '');
        assert.equal(toDate(v), null);
    }
});

test('a malformed date degrades to an empty cell instead of throwing', () => {
    for (const v of ['garbage', 'not-a-date', '2026-13-45', {}, NaN]) {
        assert.doesNotThrow(() => isoDay(v), `isoDay(${JSON.stringify(v)}) must not throw`);
        assert.doesNotThrow(() => isoDateTime(v));
        assert.equal(isoDay(v), '');
        assert.equal(isoDateTime(v), '');
    }
});

test('an Invalid Date object is handled like any other bad value', () => {
    assert.equal(isoDay(new Date('nope')), '');
    assert.equal(toDate(new Date('nope')), null);
});

test('a numeric epoch is accepted', () => {
    assert.equal(isoDay(0), '1970-01-01');
    assert.equal(isoDay(1785000000000, 'UTC'), isoDateTime(1785000000000).split('T')[0]);
});

// OQ-A20.1 — a stored timestamp is an instant, a --DTC column is a calendar day.
// Reducing one to the other in UTC reported every enrolment before 07:00 WIB a
// day early, which is roughly the whole of a site's morning clinic.
test('a calendar day is resolved in the export timezone, not in UTC', () => {
    const earlyMorningJakarta = '2026-07-31T06:00:00+07:00';   // = 2026-07-30T23:00Z
    assert.equal(isoDay(earlyMorningJakarta, 'Asia/Jakarta'), '2026-07-31');
    assert.equal(isoDay(earlyMorningJakarta, 'UTC'), '2026-07-30', 'the old behaviour, kept as the contrast');
});

test('the export timezone defaults to the sites, so isoDay needs no argument', () => {
    assert.equal(EXPORT_TZ, process.env.EXPORT_TZ || 'Asia/Jakarta');
    assert.equal(isoDay('2026-07-31T06:00:00+07:00'), isoDay('2026-07-31T06:00:00+07:00', EXPORT_TZ));
});

test('an unusable timezone degrades to UTC instead of throwing', () => {
    // Intl throws RangeError on an unknown zone. An exporter must not die
    // because one caller passed a bad name.
    assert.doesNotThrow(() => isoDay('2026-07-31T06:00:00Z', 'Not/AZone'));
});

test('the value zero is a real date, not treated as absent', () => {
    // A plain `value ? ... : ''` guard would have dropped the epoch.
    assert.notEqual(isoDay(0), '');
});
