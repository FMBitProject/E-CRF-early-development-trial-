// Behavior tests for the requireRole middleware itself.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireRole } from '../src/backend/middleware/rbac.js';

function mockRes() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
    };
}

test('requireRole exposes allowedRoles for introspection', () => {
    const mw = requireRole('cra', 'admin');
    assert.deepEqual(mw.allowedRoles, ['cra', 'admin']);
});

test('rejects unauthenticated requests with 401', () => {
    const mw = requireRole('admin');
    const res = mockRes();
    let nextCalled = false;
    mw({ user: null }, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test('rejects a role not in the allow-list with 403', () => {
    const mw = requireRole('pi', 'admin');
    const res = mockRes();
    let nextCalled = false;
    mw({ user: { role: 'crc' } }, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});

test('passes an allowed role through to next()', () => {
    const mw = requireRole('pi', 'admin');
    const res = mockRes();
    let nextCalled = false;
    mw({ user: { role: 'pi' } }, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, null);
    assert.equal(nextCalled, true);
});

test('role comparison is exact — no prefix/case matching', () => {
    const mw = requireRole('admin');
    for (const role of ['Admin', 'ADMIN', 'admin ', 'administrator', '']) {
        const res = mockRes();
        let nextCalled = false;
        mw({ user: { role } }, res, () => { nextCalled = true; });
        assert.equal(res.statusCode, 403, `role "${role}" must be rejected`);
        assert.equal(nextCalled, false);
    }
});
