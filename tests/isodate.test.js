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

test('isoDay falls back to EXPORT_TZ when no zone is passed', () => {
    // This used to also assert `EXPORT_TZ === process.env.EXPORT_TZ || 'Asia/Jakarta'`,
    // which is true whatever the environment holds — a tautology that could
    // never fail. What EXPORT_TZ resolves to under each environment is now
    // covered by the child-process tests at the bottom of this file, which is
    // the only place module-initialisation order can actually be observed.
    assert.equal(isoDay('2026-07-31T06:00:00+07:00'), isoDay('2026-07-31T06:00:00+07:00', EXPORT_TZ));
    assert.equal(isoDay('2026-07-31T20:00:00Z'), isoDay('2026-07-31T20:00:00Z', EXPORT_TZ));
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

// ── Date-only values ────────────────────────────────────────────────────────
// consentDate, onsetDate and dateOfBirth are stored as plain "YYYY-MM-DD" text.
// Such a value carries no time and no offset, so there is no instant to
// convert — but `new Date('2026-07-15')` invents midnight UTC, and formatting
// that anywhere west of UTC moved the day backwards.

test('a date-only string is returned unchanged, in any timezone', () => {
    for (const tz of ['Asia/Jakarta', 'UTC', 'America/New_York', 'America/Sao_Paulo', 'Pacific/Auckland']) {
        assert.equal(isoDay('2026-07-15', tz), '2026-07-15', `shifted in ${tz}`);
    }
});

test('a date-only string that is not a real date is still rejected', () => {
    // JS rolls 2026-02-31 over to 2026-03-03 rather than refusing it, so the
    // shortcut has to confirm the calendar contains the date before echoing it.
    assert.equal(isoDay('2026-02-31'), '');
    assert.equal(isoDay('2026-13-45'), '');
    assert.equal(isoDay('0000-00-00'), '');
});

test('surrounding whitespace does not defeat the date-only path', () => {
    assert.equal(isoDay('  2026-07-15  '), '2026-07-15');
});

// ── Coercion artefacts ──────────────────────────────────────────────────────

test('booleans and arrays are not dates, however willing JS is to coerce them', () => {
    // new Date(false) is the epoch and new Date([2026]) is 2026-01-01. Both put
    // a confident wrong value in a regulatory export.
    for (const v of [false, true, [], [2026], [2026, 1, 1]]) {
        assert.equal(isoDay(v), '', `${JSON.stringify(v)} must not become a date`);
        assert.equal(isoDateTime(v), '');
        assert.equal(toDate(v), null);
    }
});

test('a number is still an epoch offset — that is a real date', () => {
    assert.equal(isoDay(0, 'UTC'), '1970-01-01');
    assert.notEqual(toDate(1785000000000), null);
});

// ── Module initialisation ───────────────────────────────────────────────────
// EXPORT_TZ is read at import time, so a fault there takes down every route
// that touches an exporter. The previous test here asserted
// `EXPORT_TZ === process.env.EXPORT_TZ || 'Asia/Jakarta'`, which is true
// whatever the environment holds and therefore could never fail — and the
// branch that runs when the variable IS set was never executed by CI at all.
// These spawn a real process with the variable set, which is the only way to
// exercise module-initialisation order.

import { execFileSync } from 'node:child_process';

const loadWith = (env) => execFileSync(
    process.execPath,
    ['--input-type=module', '-e', `
        const m = await import('${new URL('../src/backend/lib/isodate.js', import.meta.url).href}');
        process.stdout.write(m.EXPORT_TZ + '|' + m.isoDay('2026-07-31T06:00:00+07:00'));
    `],
    { env: { ...process.env, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
);

test('the module loads when EXPORT_TZ is set — the documented setup path', () => {
    // .env.example ships EXPORT_TZ uncommented, so this is what a fresh install
    // does. A ReferenceError here means the server does not start at all.
    const [zone, day] = loadWith({ EXPORT_TZ: 'Asia/Makassar' }).split('|');
    assert.equal(zone, 'Asia/Makassar');
    assert.equal(day, '2026-07-31', 'WITA is UTC+8, so 06:00 WIB is the same day');
});

test('the module loads when EXPORT_TZ is unset', () => {
    const env = { ...process.env };
    delete env.EXPORT_TZ;
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', `
        const m = await import('${new URL('../src/backend/lib/isodate.js', import.meta.url).href}');
        process.stdout.write(m.EXPORT_TZ);
    `], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    assert.equal(out, 'Asia/Jakarta');
});

test('a bad EXPORT_TZ degrades to UTC instead of killing the process', () => {
    const [zone, day] = loadWith({ EXPORT_TZ: 'Not/AZone' }).split('|');
    assert.equal(zone, 'UTC');
    assert.equal(day, '2026-07-30', 'UTC really is the previous day for that instant');
});
