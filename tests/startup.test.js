import test from 'node:test';
import assert from 'node:assert/strict';
import { createStartupGate } from '../src/backend/middleware/startup.js';

function response() {
    return { statusCode: null, body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test('API requests await startup and concurrent requests initialize only once', async () => {
    let finish, starts = 0, admitted = 0, ready = 0;
    const initialization = new Promise(resolve => { finish = resolve; });
    const gate = createStartupGate(() => { starts++; return initialization; }, { onReady: () => { ready++; } });
    const first = response(), second = response();
    const requests = [gate({ path: '/dashboard/stats' }, first, () => { admitted++; }),
        gate({ path: '/register/config' }, second, () => { admitted++; })];
    await Promise.resolve();
    assert.equal(starts, 1);
    assert.equal(admitted, 0);
    assert.equal(first.statusCode, null);
    assert.equal(second.statusCode, null);
    finish();
    await Promise.all(requests);
    assert.equal(admitted, 2);
    assert.equal(ready, 1);
    await gate({ path: '/ready' }, response(), () => { admitted++; });
    assert.equal(starts, 1);
    assert.equal(admitted, 3);
});

test('startup failure denies concurrent and later API calls and logs its cause once', async () => {
    const error = new Error('MFA_ENCRYPTION_KEY missing');
    const logs = [];
    let admitted = 0, starts = 0;
    const gate = createStartupGate(async () => { starts++; throw error; }, { onError: err => logs.push(err) });
    const replies = [response(), response(), response()];
    await Promise.all(replies.slice(0, 2).map(res => gate({ path: '/dashboard/stats' }, res, () => { admitted++; })));
    await gate({ path: '/ready' }, replies[2], () => { admitted++; });
    assert.equal(starts, 1);
    assert.equal(admitted, 0);
    assert.deepEqual(logs, [error]);
    for (const res of replies) {
        assert.equal(res.statusCode, 503);
        assert.deepEqual(res.body, { error: 'Service initialization failed' });
    }
});

test('liveness stays available without triggering initialization, even after startup fails', async () => {
    let starts = 0, admitted = 0;
    const gate = createStartupGate(() => { starts++; throw new Error('database unavailable'); });
    await gate({ path: '/health' }, response(), () => { admitted++; });
    assert.equal(starts, 0);
    await gate({ path: '/ready' }, response(), () => { admitted++; });
    await gate({ path: '/health' }, response(), () => { admitted++; });
    assert.equal(starts, 1);
    assert.equal(admitted, 2);
});
