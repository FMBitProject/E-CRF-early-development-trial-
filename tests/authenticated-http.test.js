import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticatedRequest, verifyStoredSession } from '../src/frontend/js/modules/authenticated-http.js';
import { authRequest } from '../src/frontend/js/modules/auth-http.js';

const keys = ['ecrf_session', 'ecrf_study_id', 'ecrf_study_meta', 'ecrf_site_context_id', 'ecrf_site_context_meta'];
function browser(t) {
    const values = new Map(keys.map(key => [key, key === 'ecrf_session' ? JSON.stringify({ id: 'test', role: 'pi', name: 'Old name' }) : 'display context']));
    values.set('unrelated-preference', 'keep');
    const redirects = [];
    for (const [key, value] of Object.entries({
        localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
        window: { location: { replace: url => redirects.push(url) } },
    })) {
        const original = Object.getOwnPropertyDescriptor(globalThis, key);
        Object.defineProperty(globalThis, key, { configurable: true, value });
        t.after(() => original ? Object.defineProperty(globalThis, key, original) : delete globalThis[key]);
    }
    return { values, redirects };
}
function reply(t, status, body = {}) {
    t.mock.method(globalThis, 'fetch', async (path, options) => {
        assert.equal(options.credentials, 'include');
        return new Response(JSON.stringify(body), { status });
    });
}

test('protected 401 clears stale display context and returns to sign-in', async t => {
    const { values, redirects } = browser(t);
    reply(t, 401);
    await assert.rejects(authenticatedRequest('/api/subjects'), error => error.status === 401);
    assert.deepEqual(redirects, ['/login.html?reason=session-expired']);
    assert.ok(keys.every(key => !values.has(key)));
    assert.equal(values.get('unrelated-preference'), 'keep');
});

test('expired download session also returns to sign-in without downloading', async t => {
    const { redirects } = browser(t);
    reply(t, 401);
    await assert.rejects(authenticatedRequest('/api/export/odm', {}, { responseType: 'blob' }), error => error.status === 401);
    assert.equal(redirects.length, 1);
});

test('403 and service errors preserve the session and do not redirect', async t => {
    const { values, redirects } = browser(t);
    for (const status of [403, 503]) {
        reply(t, status);
        await assert.rejects(authenticatedRequest('/api/subjects'), error => error.status === status);
        assert.ok(values.has('ecrf_session'));
    }
    assert.equal(redirects.length, 0);
});

test('incorrect login credentials remain on the login form', async t => {
    const { values, redirects } = browser(t);
    reply(t, 401);
    await assert.rejects(authRequest('/api/mfa/initiate', { method: 'POST' }), /email and password/);
    assert.equal(redirects.length, 0);
    assert.ok(values.has('ecrf_session'));
});

test('login checks the cookie with the server and refreshes cached identity', async t => {
    const { values } = browser(t);
    const user = { id: 'test', role: 'investigator', name: 'Verified name' };
    reply(t, 200, { user, session: { expiresAt: '2030-01-01' } });
    assert.deepEqual(await verifyStoredSession(), user);
    assert.equal(JSON.parse(values.get('ecrf_session')).role, 'investigator');
    assert.equal(JSON.parse(values.get('ecrf_session')).name, 'Verified name');
});

test('invalid saved session is cleared on login without a redirect loop', async t => {
    const { values, redirects } = browser(t);
    reply(t, 401);
    assert.equal(await verifyStoredSession(), null);
    assert.ok(keys.every(key => !values.has(key)));
    assert.equal(redirects.length, 0);
});

test('login stays available when no saved session exists', async t => {
    const { values } = browser(t);
    values.delete('ecrf_session');
    t.mock.method(globalThis, 'fetch', async () => { assert.fail('should not request a session'); });
    assert.equal(await verifyStoredSession(), null);
});

test('server failure during login verification keeps context and reports the error', async t => {
    const { values, redirects } = browser(t);
    reply(t, 503);
    await assert.rejects(verifyStoredSession(), error => error.status === 503);
    assert.ok(values.has('ecrf_session'));
    assert.equal(redirects.length, 0);
});

test('delayed verification cannot clear a newer successful login', async t => {
    const { values } = browser(t);
    let finish;
    t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finish = resolve; }));
    const verification = verifyStoredSession();
    const newerSession = JSON.stringify({ id: 'test', role: 'pi', name: 'New login', loginAt: '2026-10-06T12:00:00Z' });
    values.set('ecrf_session', newerSession);
    finish(new Response('{}', { status: 401 }));
    assert.equal(await verification, null);
    assert.equal(values.get('ecrf_session'), newerSession);
});
