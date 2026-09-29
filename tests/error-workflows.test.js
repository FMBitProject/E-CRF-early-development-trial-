import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveEnrollment } from '../src/frontend/js/modules/enrollment-save.js';
import { readObject, readContext, writeContext, writeStored } from '../src/frontend/js/modules/storage.js';
import { authRequest } from '../src/frontend/js/modules/auth-http.js';

const assessment = { criteria: [{ id: 'I1', met: true }], passed: true, consent: { consentVersion: 'v1' } };

test('assessment failure retains created subject and reports partial save without retry', async () => {
    const calls = [];
    const api = {
        createSubject: async () => { calls.push('subject'); return { id: 8 }; },
        submitIEAssessment: async () => { calls.push('assessment'); throw new Error('private query'); },
        createConsent: async () => { calls.push('consent'); },
    };
    const result = await saveEnrollment(api, {}, assessment);
    assert.deepEqual(calls, ['subject', 'assessment', 'consent']);
    assert.equal(result.subject.id, 8);
    assert.deepEqual(result.unconfirmed, ['inclusion/exclusion assessment']);
    assert.ok(!JSON.stringify(result).includes('private'));
});

test('both uncertain follow-ups are reported; failed creation starts no follow-up', async () => {
    const unavailable = async () => { throw new Error('disconnected'); };
    const api = { createSubject: async () => ({ id: 8 }), submitIEAssessment: unavailable, createConsent: unavailable };
    assert.deepEqual((await saveEnrollment(api, {}, assessment)).unconfirmed, ['inclusion/exclusion assessment', 'consent record']);
    let followUps = 0;
    api.createSubject = unavailable;
    api.submitIEAssessment = api.createConsent = async () => { followUps++; };
    await assert.rejects(saveEnrollment(api, {}, assessment));
    assert.equal(followUps, 0);
});

test('successful enrollment preserves subject ID for follow-up records', async () => {
    const api = {
        createSubject: async () => ({ id: 21 }),
        submitIEAssessment: async (id, criteria, passed) => { assert.equal(id, 21); assert.equal(criteria, assessment.criteria); assert.equal(passed, true); },
        createConsent: async payload => { assert.equal(payload.subjectId, 21); assert.equal(payload.consentType, 'Initial'); },
    };
    assert.deepEqual((await saveEnrollment(api, {}, assessment)).unconfirmed, []);
});

function storage(t, initial = {}) {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const values = new Map(Object.entries(initial));
    const store = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: store });
    t.after(() => original ? Object.defineProperty(globalThis, 'localStorage', original) : delete globalThis.localStorage);
    return { values, store };
}

test('corrupt session/context is cleared and does not silently select a study', t => {
    const { values } = storage(t, { session: '{broken', study_id: '12oops', study_meta: '{}' });
    assert.equal(readObject('session'), null);
    assert.equal(values.has('session'), false);
    assert.equal(readContext('study'), null);
    assert.equal(values.has('study_id'), false);
    values.set('study_id', '12'); values.set('study_meta', '{"id":999,"title":"A"}');
    assert.equal(readContext('study').id, 12);
    values.set('session', '[]');
    assert.equal(readObject('session'), null);
});

test('blocked storage fails closed; partial writes cannot keep stale context', t => {
    const { values, store } = storage(t, { study_id: '9', study_meta: '{}' });
    store.setItem = () => { throw new Error('Quota exceeded'); };
    assert.throws(() => writeContext('study', { id: 2 }, { title: 'New' }), e => e.code === 'STORAGE_UNAVAILABLE');
    assert.equal(values.has('study_id'), false);
    store.getItem = () => { throw new Error('SecurityError'); };
    assert.equal(readContext('study'), null);
    assert.throws(() => writeStored('session', '{}'), /Allow site storage/);
});

test('login failures use sign-in instructions; technical 5xx details stay hidden', async t => {
    t.mock.method(globalThis, 'fetch', async () => new Response('{"error":"private exception"}', { status: 401 }));
    await assert.rejects(authRequest('/api/mfa/initiate', { method: 'POST' }), e => /email and password/.test(e.message) && !e.message.includes('private'));
    await assert.rejects(authRequest('/api/mfa/totp-verify', { method: 'POST' }), e => /start sign-in again/.test(e.message));
    t.mock.method(globalThis, 'fetch', async () => new Response('{"error":"private exception"}', { status: 500 }));
    await assert.rejects(authRequest('/api/register', { method: 'POST' }), e => e.status === 500 && !e.message.includes('private'));
});

test('identical concurrent writes are blocked and the guard is released afterwards', async t => {
    const { request } = await import('../src/frontend/js/modules/http.js');
    let release;
    let calls = 0;
    t.mock.method(globalThis, 'fetch', () => {
        calls++;
        return new Promise(resolve => { release = () => resolve(new Response('{}', { status: 200 })); });
    });
    const options = { method: 'POST', body: '{"name":"synthetic"}' };
    const first = request('/api/subjects', options);
    await assert.rejects(request('/api/subjects', options), e => e.code === 'REQUEST_PENDING');
    assert.equal(calls, 1);
    release();
    await first;
    const next = request('/api/subjects', options);
    assert.equal(calls, 2);
    release();
    await next;
});

test('enrollment UI blocks double-submit and shows persistent partial-save guidance', async t => {
    const originals = new Map(['window', 'document'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const elements = new Map(Object.entries({
        'ns-code': { value: '123' }, 'ns-initial': { value: 'AB' },
        'ns-sex': { value: 'Female' }, 'ns-gender-identity': { value: '' },
        'ns-dob': { value: '1990-01-01' }, 'ns-enroll': { value: '2026-01-01' },
        'ns-site': { value: '1' }, 'ns-submit': { disabled: false },
        'ns-error': { textContent: '', classList: { add() {}, remove() {} } },
        'modal-root': { innerHTML: '' },
    }));
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { _ieCriteriaResults: assessment.criteria, _iePasses: true, _consentData: assessment.consent } });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { getElementById: id => elements.get(id) || null } });
    t.after(() => { for (const [key, descriptor] of originals) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]; });
    const { api } = await import('../src/frontend/js/modules/api.js');
    // The module schedules an unrelated visit-form listener on import.
    t.mock.method(globalThis, 'setTimeout', () => 0);
    await import('../src/frontend/js/modules/subjects.js');
    let finishCreation;
    let creates = 0;
    t.mock.method(api, 'createSubject', () => { creates++; return new Promise(resolve => { finishCreation = () => resolve({ id: 24 }); }); });
    t.mock.method(api, 'submitIEAssessment', async () => { throw new Error('lost response'); });
    t.mock.method(api, 'createConsent', async () => ({}));
    const first = window.submitNewSubject();
    await window.submitNewSubject();
    assert.equal(creates, 1);
    assert.equal(elements.get('ns-submit').disabled, true);
    finishCreation();
    await first;
    const html = elements.get('modal-root').innerHTML;
    assert.match(html, /Subject saved/);
    assert.match(html, /inclusion\/exclusion assessment/);
    assert.match(html, /Do not enroll this subject again/);
    assert.match(html, /#subjects\/24/);
    assert.doesNotMatch(html, /enrolled successfully/);
    assert.equal(window._ieCriteriaResults, assessment.criteria);
    await window.submitNewSubject();
    assert.equal(creates, 1);
});
