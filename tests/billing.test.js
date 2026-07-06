// Unit tests for the billing core (lib/billing.js) — pure functions, no Stripe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.STRIPE_PRICE_TRIAL    = 'price_trial';
process.env.STRIPE_PRICE_STANDARD = 'price_std';
process.env.STRIPE_PRICE_ENTERPRISE = 'price_ent';

const {
    verifyWebhookSignature, mapSubscriptionStatus, planForPrice, mapEventToUpdate,
} = await import('../src/backend/lib/billing.js');

function signedHeader(payload, secret, t = Math.floor(Date.now() / 1000)) {
    const v1 = crypto.createHmac('sha256', secret).update(`${t}.${payload}`, 'utf8').digest('hex');
    return `t=${t},v1=${v1}`;
}

test('verifyWebhookSignature accepts a correctly signed payload', () => {
    const secret = 'whsec_test';
    const payload = JSON.stringify({ id: 'evt_1', type: 'ping' });
    assert.equal(verifyWebhookSignature(payload, signedHeader(payload, secret), secret), true);
});

test('verifyWebhookSignature rejects a tampered payload', () => {
    const secret = 'whsec_test';
    const header = signedHeader('{"a":1}', secret);
    assert.equal(verifyWebhookSignature('{"a":2}', header, secret), false);
});

test('verifyWebhookSignature rejects a wrong secret and stale timestamp', () => {
    const payload = '{"x":1}';
    assert.equal(verifyWebhookSignature(payload, signedHeader(payload, 'right'), 'wrong'), false);
    const stale = signedHeader(payload, 'sec', Math.floor(Date.now() / 1000) - 10000);
    assert.equal(verifyWebhookSignature(payload, stale, 'sec'), false);
});

test('mapSubscriptionStatus maps Stripe statuses to our vocabulary', () => {
    assert.equal(mapSubscriptionStatus('trialing'), 'Trialing');
    assert.equal(mapSubscriptionStatus('active'), 'Active');
    assert.equal(mapSubscriptionStatus('past_due'), 'PastDue');
    assert.equal(mapSubscriptionStatus('canceled'), 'Canceled');
    assert.equal(mapSubscriptionStatus('incomplete'), null);
});

test('planForPrice reverse-maps configured price ids', () => {
    assert.equal(planForPrice('price_std'), 'standard');
    assert.equal(planForPrice('price_ent'), 'enterprise');
    assert.equal(planForPrice('price_unknown'), null);
});

test('mapEventToUpdate: checkout.session.completed binds customer + subscription', () => {
    const upd = mapEventToUpdate({
        type: 'checkout.session.completed',
        data: { object: { client_reference_id: '42', customer: 'cus_1', subscription: 'sub_1' } },
    });
    assert.deepEqual(upd, { orgId: 42, customerId: 'cus_1', subscriptionId: 'sub_1', subscriptionStatus: 'Active' });
});

test('mapEventToUpdate: subscription.updated derives plan from price and status', () => {
    const upd = mapEventToUpdate({
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_1', customer: 'cus_1', status: 'past_due', items: { data: [{ price: { id: 'price_std' } }] } } },
    });
    assert.equal(upd.plan, 'standard');
    assert.equal(upd.subscriptionStatus, 'PastDue');
    assert.equal(upd.subscriptionId, 'sub_1');
});

test('mapEventToUpdate: deletion cancels, unrelated events are ignored', () => {
    assert.equal(mapEventToUpdate({ type: 'customer.subscription.deleted', data: { object: { id: 's', customer: 'c' } } }).subscriptionStatus, 'Canceled');
    assert.equal(mapEventToUpdate({ type: 'charge.refunded', data: { object: {} } }), null);
});
