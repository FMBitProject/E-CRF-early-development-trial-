// OQ-08 — Audit trail generation and tamper evidence.
// Traces to URS-AUD-01/02/03; 21 CFR Part 11 §11.10(b),(c),(e); ICH E6(R3) §4.9.
//
// writeAudit already takes its `db` as a parameter, so the real implementation
// is exercised here against a collecting stub — no database required.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeAudit, writeFieldDiffAudit } from '../src/backend/lib/audit.js';

function fakeDb() {
    const rows = [];
    return {
        rows,
        insert() {
            return { values(v) { rows.push(v); return Promise.resolve(); } };
        },
    };
}

const USER = { id: 'u-1', name: 'Dr Sari', role: 'investigator', organizationId: 'org-9' };

// ── Attribution: who, what, when (Part 11 §11.10(e)) ─────────────────────────

test('an audit row captures the record, the action, the user and the source IP', async () => {
    const db = fakeDb();
    await writeAudit(db, {
        tableName: 'crf_data_entries', recordId: 42, action: 'UPDATE',
        fieldName: 'ldl', oldValue: '230', newValue: '210',
        reason: 'Transcription error', user: USER, ipAddress: '10.0.0.5',
    });

    assert.equal(db.rows.length, 1);
    const r = db.rows[0];
    assert.equal(r.tableName, 'crf_data_entries');
    assert.equal(r.action, 'UPDATE');
    assert.equal(r.fieldName, 'ldl');
    assert.equal(r.oldValue, '230');
    assert.equal(r.newValue, '210');
    assert.equal(r.reason, 'Transcription error');
    assert.equal(r.userId, 'u-1');
    assert.equal(r.userName, 'Dr Sari');
    assert.equal(r.userRole, 'investigator');
    assert.equal(r.ipAddress, '10.0.0.5');
    assert.ok(r.createdAt instanceof Date);
});

test('the record id is stored as a string so numeric and text keys compare alike', async () => {
    const db = fakeDb();
    await writeAudit(db, { tableName: 't', recordId: 42, action: 'INSERT', user: USER });
    assert.equal(db.rows[0].recordId, '42');
    assert.equal(typeof db.rows[0].recordId, 'string');
});

test('the organization is stamped on every row so audit reads stay tenant-isolated', async () => {
    const db = fakeDb();
    await writeAudit(db, { tableName: 't', recordId: 1, action: 'INSERT', user: USER });
    assert.equal(db.rows[0].organizationId, 'org-9');
});

test('optional fields default to null rather than undefined', async () => {
    const db = fakeDb();
    await writeAudit(db, { tableName: 't', recordId: 1, action: 'INSERT', user: USER });
    for (const k of ['fieldName', 'oldValue', 'newValue', 'reason', 'ipAddress']) {
        assert.equal(db.rows[0][k], null, `${k} must be null, not undefined`);
    }
});

test('a system-generated event with no user still produces an audit row', async () => {
    const db = fakeDb();
    await writeAudit(db, { tableName: 't', recordId: 1, action: 'INSERT' });
    assert.equal(db.rows.length, 1);
    assert.equal(db.rows[0].userId, null);
    assert.ok(db.rows[0].auditHash);
});

// ── Tamper evidence ──────────────────────────────────────────────────────────

const hashOf = async (params) => {
    const db = fakeDb();
    await writeAudit(db, params);
    return db.rows[0].auditHash;
};

test('every row carries a SHA-256 hash', async () => {
    const h = await hashOf({ tableName: 't', recordId: 1, action: 'INSERT', user: USER });
    assert.match(h, /^[0-9a-f]{64}$/);
});

test('changing any hashed field changes the hash', async () => {
    const base = { tableName: 'crf_data_entries', recordId: 1, action: 'UPDATE',
                   fieldName: 'ldl', oldValue: '230', newValue: '210',
                   user: USER, ipAddress: '10.0.0.5' };
    const original = await hashOf(base);

    const mutations = {
        tableName: 'subjects',
        recordId:  2,
        action:    'DELETE',
        fieldName: 'hdl',
        oldValue:  '231',
        newValue:  '211',
        ipAddress: '10.0.0.6',
    };
    for (const [key, value] of Object.entries(mutations)) {
        assert.notEqual(await hashOf({ ...base, [key]: value }), original,
            `tampering with ${key} must change the hash`);
    }
    assert.notEqual(await hashOf({ ...base, user: { ...USER, id: 'u-2' } }), original,
        'tampering with the acting user must change the hash');
});

test('two rows written at different instants hash differently even when identical', async () => {
    const params = { tableName: 't', recordId: 1, action: 'INSERT', user: USER };
    const a = await hashOf(params);
    await new Promise(r => setTimeout(r, 2));
    const b = await hashOf(params);
    assert.notEqual(a, b, 'the timestamp is part of the hash');
});

test('the reason is stored verbatim alongside the hashed fields', async () => {
    // The reason sits outside the integrity hash by design — it is free text
    // attached to the change, not part of the record's identity. It must still
    // be persisted exactly as entered.
    const base = { tableName: 't', recordId: 1, action: 'INSERT', user: USER };
    const db = fakeDb();
    await writeAudit(db, { ...base, reason: 'Corrected per source document' });
    assert.equal(db.rows[0].reason, 'Corrected per source document');
    assert.match(db.rows[0].auditHash, /^[0-9a-f]{64}$/);
});

// ── Field-level diffs ────────────────────────────────────────────────────────

const diff = async (oldData, newData, reason = 'Correction') => {
    const db = fakeDb();
    await writeFieldDiffAudit(db, {
        tableName: 'crf_data_entries', recordId: 7,
        oldData, newData, reason, user: USER, ipAddress: '10.0.0.5',
    });
    return db.rows;
};

test('only changed fields are audited — unchanged ones produce no rows', async () => {
    const rows = await diff({ ldl: 230, hdl: 45 }, { ldl: 210, hdl: 45 });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].fieldName, 'ldl');
    assert.equal(rows[0].oldValue, '230');
    assert.equal(rows[0].newValue, '210');
});

test('an update that changes nothing writes no audit rows', async () => {
    assert.equal((await diff({ ldl: 230 }, { ldl: 230 })).length, 0);
});

test('every changed field gets its own row', async () => {
    const rows = await diff({ ldl: 230, hdl: 45, tg: 150 }, { ldl: 210, hdl: 50, tg: 150 });
    assert.deepEqual(rows.map(r => r.fieldName).sort(), ['hdl', 'ldl']);
});

test('a newly added field is audited with an empty old value', async () => {
    const rows = await diff({}, { ldl: 210 });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].oldValue, '');
    assert.equal(rows[0].newValue, '210');
});

test('a removed field is audited — deletion is a change, not a no-op', async () => {
    const rows = await diff({ ldl: 230 }, {});
    assert.equal(rows.length, 1);
    assert.equal(rows[0].oldValue, '230');
    assert.equal(rows[0].newValue, '');
});

test('clearing a value to null is audited as a change to empty', async () => {
    const rows = await diff({ ldl: 230 }, { ldl: null });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].newValue, '');
});

test('null and undefined and missing are all treated as the same empty value', async () => {
    assert.equal((await diff({ ldl: null }, { ldl: undefined })).length, 0);
    assert.equal((await diff({ ldl: null }, {})).length, 0);
});

test('a numeric value re-entered as a string is not a change', async () => {
    // Values are compared after string coercion, matching how they render on the
    // CRF. 230 and '230' are the same recorded value, not an edit worth auditing.
    assert.equal((await diff({ ldl: 230 }, { ldl: '230' })).length, 0);
});

test('a value re-entered with different precision IS audited', async () => {
    // '230' and '230.0' render differently on the CRF, so the change is real
    // even though the numbers are equal.
    const rows = await diff({ ldl: '230' }, { ldl: '230.0' });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].oldValue, '230');
    assert.equal(rows[0].newValue, '230.0');
});

test('the reason for change is carried onto every field row', async () => {
    const rows = await diff({ ldl: 230, hdl: 45 }, { ldl: 210, hdl: 50 }, 'Source data verification');
    assert.equal(rows.length, 2);
    for (const r of rows) assert.equal(r.reason, 'Source data verification');
});

test('every diff row is an UPDATE against the same record, each with its own hash', async () => {
    const rows = await diff({ ldl: 230, hdl: 45 }, { ldl: 210, hdl: 50 });
    for (const r of rows) {
        assert.equal(r.action, 'UPDATE');
        assert.equal(r.recordId, '7');
        assert.equal(r.tableName, 'crf_data_entries');
        assert.match(r.auditHash, /^[0-9a-f]{64}$/);
    }
    assert.notEqual(rows[0].auditHash, rows[1].auditHash);
});

test('a diff against absent data does not crash', async () => {
    assert.equal((await diff(null, null)).length, 0);
    assert.equal((await diff(undefined, { ldl: 1 })).length, 1);
    assert.equal((await diff({ ldl: 1 }, undefined)).length, 1);
});

test('a boolean flipping to false is audited rather than swallowed as falsy', async () => {
    const rows = await diff({ smoker: true }, { smoker: false });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].oldValue, 'true');
    assert.equal(rows[0].newValue, 'false');
});

test('a value changing to zero is audited', async () => {
    const rows = await diff({ dose: 10 }, { dose: 0 });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].newValue, '0');
});
