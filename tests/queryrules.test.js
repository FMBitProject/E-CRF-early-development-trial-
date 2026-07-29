// OQ-02 — Data-query lifecycle and automatic query generation.
// Traces to URS-DM-04/05 and ICH E6(R3) §5.18.4 (monitoring / query resolution).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    canRaiseQuery, canResolveQuery, canCloseQuery,
    pendingAutoQueries, autoQueryText, AUTO_QUERY_AUTHOR,
    ACTIVE_QUERY_STATUSES, QUERY_STATUSES,
} from '../src/backend/lib/queryrules.js';

const q = (status) => ({ id: 3, status, subjectId: 7 });

// ── Raising ──────────────────────────────────────────────────────────────────

test('a query needs both a subject and query text', () => {
    assert.equal(canRaiseQuery({ subjectId: 1, queryText: 'Please verify' }).ok, true);
    assert.equal(canRaiseQuery({ subjectId: 1 }).status, 400);
    assert.equal(canRaiseQuery({ queryText: 'x' }).status, 400);
    assert.equal(canRaiseQuery({}).status, 400);
    assert.equal(canRaiseQuery({ subjectId: 1, queryText: '' }).status, 400);
});

// ── Forward-only state machine ───────────────────────────────────────────────

test('only an Open query can be resolved', () => {
    assert.equal(canResolveQuery(q('Open'), { resolutionText: 'Corrected' }).ok, true);
    assert.equal(canResolveQuery(q('Resolved'), { resolutionText: 'Corrected' }).status, 409);
    assert.equal(canResolveQuery(q('Closed'), { resolutionText: 'Corrected' }).status, 409);
});

test('resolving requires an explanation — a blank resolution is rejected', () => {
    assert.equal(canResolveQuery(q('Open'), {}).status, 400);
    assert.equal(canResolveQuery(q('Open'), { resolutionText: '' }).status, 400);
    assert.match(canResolveQuery(q('Open'), {}).error, /resolutionText is required/);
});

test('only a Resolved query can be closed — the monitor cannot skip the site answer', () => {
    assert.equal(canCloseQuery(q('Resolved')).ok, true);
    assert.equal(canCloseQuery(q('Open')).status, 409);
    assert.match(canCloseQuery(q('Open')).error, /Only Resolved queries can be closed/);
});

test('a closed query is terminal — it can be neither resolved nor closed again', () => {
    assert.equal(canResolveQuery(q('Closed'), { resolutionText: 'x' }).ok, false);
    assert.equal(canCloseQuery(q('Closed')).ok, false);
});

test('a missing query is a 404 on both transitions', () => {
    assert.equal(canResolveQuery(null, { resolutionText: 'x' }).status, 404);
    assert.equal(canCloseQuery(null).status, 404);
});

test('the declared status vocabulary is Open → Resolved → Closed', () => {
    assert.deepEqual(QUERY_STATUSES, ['Open', 'Resolved', 'Closed']);
});

// ── Auto-query generation from soft range violations ─────────────────────────

const violation = (key) => ({ key, label: key.toUpperCase(), message: `${key} is unusually high` });

test('no soft violations means no auto-queries', () => {
    assert.deepEqual(pendingAutoQueries([], []), []);
    assert.deepEqual(pendingAutoQueries(undefined, []), []);
    assert.deepEqual(pendingAutoQueries(null, []), []);
});

test('a violation with no existing query produces one auto-query', () => {
    const out = pendingAutoQueries([violation('ldl')], []);
    assert.equal(out.length, 1);
    assert.equal(out[0].key, 'ldl');
});

test('an Open or Resolved query on the same field suppresses a duplicate', () => {
    for (const status of ACTIVE_QUERY_STATUSES) {
        const out = pendingAutoQueries([violation('ldl')], [{ fieldKey: 'ldl', status }]);
        assert.deepEqual(out, [], `status ${status} must suppress a duplicate`);
    }
});

test('a CLOSED query does not suppress a new one — a re-entered bad value is a fresh finding', () => {
    const out = pendingAutoQueries([violation('ldl')], [{ fieldKey: 'ldl', status: 'Closed' }]);
    assert.equal(out.length, 1);
    assert.equal(out[0].key, 'ldl');
});

test('a query on a different field does not suppress this one', () => {
    const out = pendingAutoQueries([violation('ldl')], [{ fieldKey: 'hdl', status: 'Open' }]);
    assert.equal(out.length, 1);
});

test('two violations on the same field in one submission yield a single query', () => {
    const out = pendingAutoQueries([violation('ldl'), violation('ldl')], []);
    assert.equal(out.length, 1);
});

test('several distinct fields each get their own query', () => {
    const out = pendingAutoQueries([violation('ldl'), violation('hdl'), violation('tg')], []);
    assert.deepEqual(out.map(v => v.key), ['ldl', 'hdl', 'tg']);
});

test('mixed state: one field already queried, one not', () => {
    const out = pendingAutoQueries(
        [violation('ldl'), violation('hdl')],
        [{ fieldKey: 'ldl', status: 'Open' }],
    );
    assert.deepEqual(out.map(v => v.key), ['hdl']);
});

// ── Attribution ──────────────────────────────────────────────────────────────

test('system-raised queries are tagged so they are distinguishable from a CRA query', () => {
    assert.equal(autoQueryText({ message: 'LDL is unusually high' }), '[Auto] LDL is unusually high');
    assert.equal(AUTO_QUERY_AUTHOR, 'Auto-validation');
});
