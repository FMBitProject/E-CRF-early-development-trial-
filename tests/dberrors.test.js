// Unit tests for lib/dberrors.js — unique-violation detection through the
// drizzle DrizzleQueryError wrapper (original postgres error on .cause).

import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';

const { isUniqueViolation, uniqueConstraintName, dbErrorMessage } = await import('../src/backend/lib/dberrors.js');

test('detects a bare postgres unique violation (code 23505)', () => {
    const err = Object.assign(new Error('duplicate key value violates unique constraint "x"'), { code: '23505' });
    assert.equal(isUniqueViolation(err), true);
});

test('detects a drizzle-wrapped unique violation via err.cause', () => {
    const pgErr = Object.assign(new Error('duplicate key value violates unique constraint "subjects_code_uq"'), { code: '23505' });
    const wrapper = new Error('Failed query: insert into "subjects" ...');
    wrapper.cause = pgErr;
    assert.equal(isUniqueViolation(wrapper), true);
});

test('detects by message text when no code is present', () => {
    assert.equal(isUniqueViolation(new Error('UNIQUE constraint failed')), true);
    assert.equal(isUniqueViolation(new Error('something duplicate happened')), true);
});

test('does not flag unrelated errors (even wrapped)', () => {
    const wrapper = new Error('Failed query: select 1');
    wrapper.cause = Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' });
    assert.equal(isUniqueViolation(wrapper), false);
    assert.equal(isUniqueViolation(new Error('null value in column violates not-null constraint')), false);
});

test('survives cyclic cause chains', () => {
    const a = new Error('a'); const b = new Error('b');
    a.cause = b; b.cause = a;   // cycle — depth cap must stop the walk
    assert.equal(isUniqueViolation(a), false);
});

// ── Which constraint fired ──────────────────────────────────────────────────
// A route with more than one unique constraint in play cannot phrase a useful
// message without this. postgres-js names the field constraint_name (it maps
// the PG error field 'n'); node-postgres calls it constraint.

test('the constraint name is read from either driver spelling', () => {
    assert.equal(uniqueConstraintName({ code: '23505', constraint_name: 'idx_crf_entry_unique' }), 'idx_crf_entry_unique');
    assert.equal(uniqueConstraintName({ code: '23505', constraint: 'subjects_subject_code_unique' }), 'subjects_subject_code_unique');
});

test('the name is found through the drizzle wrapper', () => {
    const wrapped = new Error('Failed query: insert into ...');
    wrapped.cause = { code: '23505', constraint_name: 'idx_crf_entry_unique' };
    assert.equal(uniqueConstraintName(wrapped), 'idx_crf_entry_unique');
});

test('the 23505 frame wins over an unrelated constraint name higher in the chain', () => {
    // Returning the first name in the chain could name a constraint from a
    // different error entirely, and the caller uses it to pick a message.
    const outer = new Error('wrapper');
    outer.constraint_name = 'some_other_constraint';
    outer.cause = { code: '23505', constraint_name: 'idx_crf_entry_unique' };
    assert.equal(uniqueConstraintName(outer), 'idx_crf_entry_unique');
});

test('an unnamed or absent constraint yields an empty string, never undefined', () => {
    assert.equal(uniqueConstraintName({ code: '23505' }), '');
    assert.equal(uniqueConstraintName(new Error('nope')), '');
    assert.equal(uniqueConstraintName(null), '');
    assert.equal(uniqueConstraintName(undefined), '');
});

test('a name is not taken from a frame that is not a unique violation', () => {
    // The fallback existed for a 23505 frame that carries no constraint name.
    // It must not reach into an unrelated frame — the caller turns whatever
    // comes back into a user-facing message about the wrong thing.
    const err = new Error('some other failure');
    err.code = '23503';                       // foreign key violation
    err.constraint_name = 'subjects_site_id_fkey';
    assert.equal(uniqueConstraintName(err), '');
});

test('a unique violation identified only by message still yields its name', () => {
    const err = new Error('duplicate key value violates unique constraint "idx_crf_entry_unique"');
    err.constraint_name = 'idx_crf_entry_unique';
    assert.equal(uniqueConstraintName(err), 'idx_crf_entry_unique');
});

// ── Surfacing the real cause ────────────────────────────────────────────────
// DrizzleQueryError.message is only "Failed query: insert into … params: …".
// Routes that answer res.status(500).json({ error: err.message }) therefore
// ship the SQL and every bound parameter to the browser while withholding the
// one thing anybody needs — why postgres refused. A delegation entry failing in
// production showed the operator a wall of SQL and no reason at all.

test('the postgres reason is extracted from under the drizzle wrapper', () => {
    const wrapped = new Error('Failed query: insert into "delegation_log" ... params: 2,abc');
    wrapped.cause = Object.assign(new Error('column "delegation_start" is of type text but expression is of type timestamp with time zone'), { code: '42804' });
    const msg = dbErrorMessage(wrapped);
    assert.match(msg, /is of type text but expression is of type/);
    assert.ok(!msg.includes('Failed query'), 'the query text must not come along');
    assert.ok(!msg.includes('params:'), 'bound parameters must never reach a client');
});

test('a bare postgres error is returned as-is', () => {
    const err = Object.assign(new Error('duplicate key value violates unique constraint "x"'), { code: '23505' });
    assert.equal(dbErrorMessage(err), 'duplicate key value violates unique constraint "x"');
});

test('the deepest cause wins over an intermediate wrapper', () => {
    const outer = new Error('Failed query: select 1');
    outer.cause = new Error('Failed query: select 2');
    outer.cause.cause = Object.assign(new Error('relation "nope" does not exist'), { code: '42P01' });
    assert.equal(dbErrorMessage(outer), 'relation "nope" does not exist');
});

test('an error with no usable cause falls back to a generic line, never to SQL', () => {
    const onlyQuery = new Error('Failed query: insert into "x" ... params: secret');
    const msg = dbErrorMessage(onlyQuery);
    assert.ok(!msg.includes('secret'));
    assert.ok(!msg.includes('Failed query'));
    assert.ok(msg.length > 0);
});

test('a non-error input does not throw', () => {
    for (const bad of [null, undefined, 'x', 42, {}]) {
        assert.doesNotThrow(() => dbErrorMessage(bad), JSON.stringify(bad));
    }
});
