import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { safeErrorResponses, apiErrorHandler } from '../src/backend/middleware/errors.js';
import { request, ApiError } from '../src/frontend/js/modules/http.js';

async function fixture(t) {
    const app = express();
    app.use(safeErrorResponses);
    app.use(express.json({ limit: '100b' }));
    app.get('/failure', (_req, res) => res.status(500).json({ error: 'Failed query: secret participant', stack: 'private stack', details: ['private'] }));
    app.get('/throw', () => { throw new Error('private stack'); });
    app.post('/echo', (req, res) => res.json(req.body));
    app.get('/empty', (_req, res) => res.sendStatus(204));
    app.get('/html', (_req, res) => res.send('<html>proxy page</html>'));
    app.get('/conflict', (_req, res) => res.status(409).json({ error: 'Subject code already exists.', details: ['Choose another code.'] }));
    app.get('/denied', (_req, res) => res.status(403).json({ error: 'Forbidden', mustChangePassword: true, details: ['Change your password.'] }));
    app.get('/slow', (_req, res) => { res.setHeader('Content-Type', 'application/json'); res.write('{'); });
    app.get('/download', (_req, res) => res.send('a,b\n1,2'));
    app.use(apiErrorHandler);
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => { server.closeAllConnections(); server.close(); });
    return `http://127.0.0.1:${server.address().port}`;
}

test('legacy and thrown server errors never return private payloads', async t => {
    const base = await fixture(t);
    for (const path of ['/failure', '/throw']) {
        const res = await fetch(base + path);
        assert.equal(res.status, 500);
        const body = await res.json();
        assert.equal(body.code, 'SERVER_ERROR');
        assert.equal(body.requestId, res.headers.get('X-Request-ID'));
        assert.doesNotMatch(JSON.stringify(body), /secret|private|Failed query/);
        await assert.rejects(request(base + path), err => err instanceof ApiError && err.status === 500 && !JSON.stringify(err).includes('private'));
    }
});

test('malformed and oversized JSON yield actionable JSON responses', async t => {
    const base = await fixture(t);
    for (const [body, status] of [['{"broken":', 400], [JSON.stringify({ value: 'x'.repeat(150) }), 413]]) {
        const res = await fetch(base + '/echo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        assert.equal(res.status, status);
        const payload = await res.json();
        assert.equal(typeof payload.error, 'string');
        assert.doesNotMatch(JSON.stringify(payload), /SyntaxError|stack|broken/);
    }
});

test('empty, invalid JSON, validation details, permissions and downloads', async t => {
    const base = await fixture(t);
    assert.equal(await request(base + '/empty'), null);
    await assert.rejects(request(base + '/html'), e => e.code === 'INVALID_RESPONSE' && !e.message.includes('<html>'));
    await assert.rejects(request(base + '/conflict'), e => e.status === 409 && e.message === 'Subject code already exists.' && e.details[0] === 'Choose another code.');
    await assert.rejects(request(base + '/denied'), e => e.status === 403 && e.data.mustChangePassword === true && /Account Security/.test(e.message));
    assert.equal(await (await request(base + '/download', {}, { responseType: 'blob' })).text(), 'a,b\n1,2');
});

test('timeout covers stalled response bodies; caller cancellation is distinct', async t => {
    const base = await fixture(t);
    await assert.rejects(request(base + '/slow', {}, { timeoutMs: 80 }), e => e.code === 'TIMEOUT' && /check whether/.test(e.message));
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(request(base + '/empty', { signal: controller.signal }), e => e.code === 'CANCELLED');
});

test('network and non-JSON HTTP failures never expose raw browser errors', async t => {
    t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed private-host'); });
    await assert.rejects(request('/test', { method: 'POST' }), e => e.code === 'NETWORK_ERROR' && /check whether/.test(e.message) && !e.message.includes('private-host'));
    t.mock.method(globalThis, 'fetch', async () => new Response('<html>private proxy</html>', { status: 502 }));
    await assert.rejects(request('/test'), e => e.status === 502 && !e.message.includes('private'));
    t.mock.method(globalThis, 'fetch', async () => new Response('null', { status: 429 }));
    await assert.rejects(request('/test'), e => e.status === 429 && /Wait/.test(e.message));
});
