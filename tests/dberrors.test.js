// Unit tests for lib/dberrors.js — unique-violation detection through the
// drizzle DrizzleQueryError wrapper (original postgres error on .cause).

import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';

const { isUniqueViolation } = await import('../src/backend/lib/dberrors.js');

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
