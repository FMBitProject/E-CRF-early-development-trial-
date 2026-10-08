import test from 'node:test';
import assert from 'node:assert/strict';
import { trustedOrigins, checkOrigin } from '../src/backend/lib/http-security.js';
import { authRequest } from '../src/frontend/js/modules/auth-http.js';

function configure(t, values) {
    for (const key of ['NODE_ENV', 'BETTER_AUTH_URL', 'VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL']) {
        const previous = process.env[key];
        if (values[key] === undefined) delete process.env[key]; else process.env[key] = values[key];
        t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
    }
}
function mutation(origin, extraHeaders = {}) {
    let admitted = false;
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
    checkOrigin({ method: 'POST', path: '/mfa/initiate', headers: { origin, ...extraHeaders } }, res, () => { admitted = true; });
    return { admitted, ...res };
}

test('Vercel production alias works when it differs from the deployment URL', t => {
    configure(t, { NODE_ENV: 'production', VERCEL_URL: 'ecrf-abc123.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'ecrf.vercel.app' });
    assert.equal(mutation('https://ecrf.vercel.app').admitted, true);
    assert.equal(mutation('https://ecrf-abc123.vercel.app').admitted, true);
    assert.equal(trustedOrigins().has('http://localhost:3000'), false);
});

test('only exact configured origins are trusted, regardless of host headers', t => {
    configure(t, { NODE_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'ecrf.vercel.app' });
    for (const origin of ['https://other.vercel.app', 'https://ecrf.vercel.app.attacker.test', 'http://ecrf.vercel.app', 'https://ecrf.vercel.app:8443']) {
        const result = mutation(origin, { host: 'ecrf.vercel.app', 'x-forwarded-host': 'ecrf.vercel.app' });
        assert.equal(result.admitted, false);
        assert.equal(result.statusCode, 403);
        assert.equal(result.body.code, 'ORIGIN_NOT_ALLOWED');
    }
});

test('explicit application URL works for custom domains and non-Vercel hosting', t => {
    configure(t, { NODE_ENV: 'production', BETTER_AUTH_URL: 'https://trial.example.test' });
    assert.equal(mutation('https://trial.example.test').admitted, true);
    assert.equal(mutation('https://unrelated.example.test').admitted, false);
});

test('login distinguishes URL configuration rejection from insufficient account permission', async t => {
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ code: 'ORIGIN_NOT_ALLOWED', error: 'Origin not allowed' }), { status: 403 }));
    await assert.rejects(authRequest('/api/mfa/initiate', { method: 'POST' }), error =>
        error.status === 403 && /website address/.test(error.message) && !/do not have permission/.test(error.message));
});
