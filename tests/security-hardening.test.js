import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import { encryptSecret, decryptSecret, backupDigest, equalDigest, tokenDigest } from '../src/backend/lib/security-crypto.js';
import { readSessionToken, sessionCookieOptions } from '../src/backend/lib/session.js';
import { trustedOrigins, validCredentials, checkOrigin, asyncRoute } from '../src/backend/lib/http-security.js';
import { visitActionAttributes, dispatchSafeAction } from '../src/frontend/js/modules/visit-actions.js';
import { safeErrorResponses, apiErrorHandler } from '../src/backend/middleware/errors.js';

process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.DATABASE_URL = 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.ALLOW_SELF_REGISTRATION = 'false';

function response() {
    return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
}

test('MFA encryption uses unique nonces and rejects tampering and another user', () => {
    const a = encryptSecret('TESTSECRET', 'user-a');
    const b = encryptSecret('TESTSECRET', 'user-a');
    assert.notEqual(a, b);
    assert.ok(!a.includes('TESTSECRET'));
    assert.equal(decryptSecret(a, 'user-a'), 'TESTSECRET');
    assert.throws(() => decryptSecret(a, 'user-b'));
    assert.throws(() => decryptSecret(a.slice(0, -1) + (a.endsWith('0') ? '1' : '0'), 'user-a'));
    assert.throws(() => decryptSecret('legacy-secret', 'user-a'));
});

test('backup codes are user-bound and comparisons reject different digests', () => {
    assert.equal(backupDigest('aa bb', 'a'), backupDigest('AABB', 'a'));
    assert.notEqual(backupDigest('AABB', 'a'), backupDigest('AABB', 'b'));
    assert.ok(equalDigest(backupDigest('AABB', 'a'), backupDigest('AABB', 'a')));
    assert.ok(!equalDigest(undefined, 'x'));
    assert.ok(!equalDigest('xx', 'xy'));
});

test('only new random session tokens are accepted, never stored digests or malformed cookies', () => {
    const token = 'v1.' + crypto.randomBytes(32).toString('hex');
    const read = value => readSessionToken({ headers: { cookie: `better-auth.session_token=${value}` } });
    assert.equal(read(token), token);
    assert.equal(read(tokenDigest(token)), null);
    assert.equal(read('old-bearer-token'), null);
    assert.equal(read('%'), null);
    assert.equal(readSessionToken({ headers: {} }), null);
});

test('production cookies are secure independently of request headers', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
        assert.equal(sessionCookieOptions().secure, true);
        assert.equal(sessionCookieOptions().httpOnly, true);
        assert.equal(sessionCookieOptions().sameSite, 'lax');
    } finally {
        if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
    }
});

test('credential validation rejects type confusion and excessive password lengths', () => {
    for (const email of [123, {}, [], null, 'bad']) assert.ok(!validCredentials({ email, password: 'x' }));
    assert.ok(!validCredentials({ email: 'a@b.test', password: 'x'.repeat(257) }));
    assert.ok(validCredentials({ email: 'a@b.test', password: 'StrongPassword!27' }));
});

test('unrelated Vercel origins fail both allowlist and mutation checks', () => {
    assert.ok(!trustedOrigins().has('https://untrusted-third-party.vercel.app'));
    const res = response();
    let called = false;
    checkOrigin({ method: 'POST', path: '/mfa/initiate', headers: { origin: 'https://untrusted-third-party.vercel.app' } }, res, () => called = true);
    assert.equal(res.statusCode, 403);
    assert.equal(called, false);
});

test('visit labels remain escaped data, including the original injection payload', () => {
    const attrs = visitActionAttributes('select', 1, `');globalThis.pwned=true;//"><img src=x onerror=alert(1)>`);
    assert.ok(!attrs.includes('onclick='));
    assert.ok(!attrs.includes('<img'));
    assert.ok(attrs.includes('&quot;'));
    assert.ok(attrs.includes('&#39;'));
});

test('malformed login and session inputs get controlled HTTP responses without a database', async t => {
    const { default: mfa } = await import('../src/backend/routes/mfa.js');
    const { default: register } = await import('../src/backend/routes/register.js');
    const { requireAuth } = await import('../src/backend/middleware/auth.js');
    const app = express();
    app.use(safeErrorResponses, express.json());
    app.use('/api/mfa', mfa);
    app.use('/api/register', register);
    app.get('/private', requireAuth, (_req, res) => res.json({ ok: true }));
    app.get('/throw', asyncRoute(async () => { throw new Error('private diagnostic'); }));
    app.use(apiErrorHandler);
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const email of [123, {}, [], null]) {
        const result = await fetch(base + '/api/mfa/initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'x' }) });
        assert.equal(result.status, 400);
    }
    const malformed = await fetch(base + '/private', { headers: { cookie: 'better-auth.session_token=%' } });
    assert.equal(malformed.status, 401);
    const signup = await fetch(base + '/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.ADMIN_EMAIL || 'admin@example.test', role: 'admin', password: 'Arbitrary!Password29', name: 'Caller', acceptedLicense: true }) });
    assert.equal(signup.status, 403);
    const error = await fetch(base + '/throw');
    assert.equal(error.status, 500);
    assert.ok(!(await error.text()).includes('private diagnostic'));
    const legacy = await fetch(base + '/api/mfa/verify', { method: 'POST' });
    assert.equal(legacy.status, 410);
});

test('safe action dispatch passes hostile labels as literal values, never evaluates them', () => {
    const label = "');globalThis.pwned = true;//";
    let received;
    assert.equal(dispatchSafeAction({ dataset: { safeAction: 'select', safeArgs: JSON.stringify([42, label]) } },
        { selectVisit: (...args) => received = args }), true);
    assert.deepEqual(received, [42, label]);
    assert.equal(globalThis.pwned, undefined);
    assert.equal(dispatchSafeAction({ dataset: { safeAction: 'inlineQuery', safeArgs: JSON.stringify(['field', label]) } },
        { openInlineQueryModal: (...args) => received = args }), true);
    assert.deepEqual(received, ['field', label]);
    assert.equal(dispatchSafeAction({ dataset: { safeAction: 'constructor', safeArgs: '[]' } }), false);
});
