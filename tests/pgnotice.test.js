// Unit tests for lib/pgnotice.js — routing of PostgreSQL NOTICE/WARNING output.
//
// The startup migration raises a WARNING when crf_data_entries holds duplicates
// and idx_crf_entry_unique therefore could not be created. That line is the only
// signal an operator gets, so it has to be visible — and the first attempt at
// making it visible sent *every* notice to console.warn, which buried it under
// the ~157 "already exists, skipping" notices the idempotent migration list
// produces on every restart.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNotice } from '../src/backend/lib/pgnotice.js';

test('a WARNING is reported', () => {
    const out = formatNotice({ severity: 'WARNING', message: 'crf_data_entries has 3 duplicate groups' });
    assert.ok(out, 'must not be suppressed');
    assert.match(out, /WARNING/);
    assert.match(out, /3 duplicate groups/);
});

test('routine idempotent-migration notices are suppressed', () => {
    // 157 IF NOT EXISTS statements each emit one of these on every boot after
    // the first. Reporting them all is what hid the warning above.
    for (const message of [
        'relation "idx_ae_subject" already exists, skipping',
        'column "visit_order" of relation "visits" already exists, skipping',
        'relation "quality_tolerance_limits" already exists, skipping',
    ]) {
        assert.equal(formatNotice({ severity: 'NOTICE', message }), null, message);
    }
});

test('severity is read from the non-localised field', () => {
    // postgres-js exposes both: severity_local (S) is translated by lc_messages,
    // severity (V) is not. Matching on the localised one would silently stop
    // working on a server configured in Indonesian.
    const out = formatNotice({ severity: 'WARNING', severity_local: 'PERINGATAN', message: 'x' });
    assert.ok(out);
    assert.match(out, /WARNING/);
    assert.ok(!out.includes('PERINGATAN'));
});

test('suppression is by severity, not by matching English message text', () => {
    // lc_messages can translate the message body, so a text match would leak
    // every routine notice on a non-English server.
    assert.equal(formatNotice({ severity: 'NOTICE', message: 'relasi sudah ada, dilewati' }), null);
});

test('errors and fatals are reported alongside warnings', () => {
    for (const severity of ['WARNING', 'ERROR', 'FATAL', 'PANIC']) {
        assert.ok(formatNotice({ severity, message: 'x' }), severity);
    }
    for (const severity of ['NOTICE', 'INFO', 'LOG', 'DEBUG']) {
        assert.equal(formatNotice({ severity, message: 'x' }), null, severity);
    }
});

test('detail and hint are kept — they are often the actionable part', () => {
    // The first version printed only severity and message, dropping what
    // postgres-js had previously shown by logging the whole object.
    const out = formatNotice({ severity: 'WARNING', message: 'm', detail: 'd', hint: 'h' });
    assert.match(out, /m/);
    assert.match(out, /d/);
    assert.match(out, /h/);
});

test('verbose mode lets an operator see the suppressed notices', () => {
    assert.ok(formatNotice({ severity: 'NOTICE', message: 'x' }, { verbose: true }));
});

test('a malformed notice never throws — it is called from the connection handler', () => {
    // Throwing inside onnotice happens on the driver's data path.
    for (const bad of [null, undefined, {}, 'x', 42, { severity: null, message: null }]) {
        assert.doesNotThrow(() => formatNotice(bad), JSON.stringify(bad));
    }
    assert.equal(formatNotice({}), null, 'no severity means routine');
});

test('an unknown severity is reported rather than silently dropped', () => {
    assert.ok(formatNotice({ severity: 'SOMETHING_NEW', message: 'x' }));
});
