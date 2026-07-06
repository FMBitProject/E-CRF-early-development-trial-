// Billing integration (Stripe) — no SDK dependency; uses node crypto + fetch.
//
// Fully inert until STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are set, so the
// app runs without billing configured. The webhook signature verification and
// event→subscription mapping are pure functions (unit-tested offline).
//
// Plan → Stripe price ids come from env:
//   STRIPE_PRICE_TRIAL, STRIPE_PRICE_STANDARD, STRIPE_PRICE_ENTERPRISE
// Checkout sets client_reference_id = organization id so the first webhook can
// bind the Stripe customer/subscription to the tenant.

import crypto from 'crypto';

export function isBillingEnabled() {
    return !!process.env.STRIPE_SECRET_KEY;
}

export function planPriceMap() {
    return {
        trial:      process.env.STRIPE_PRICE_TRIAL      || null,
        standard:   process.env.STRIPE_PRICE_STANDARD   || null,
        enterprise: process.env.STRIPE_PRICE_ENTERPRISE || null,
    };
}

export function priceForPlan(plan) {
    return planPriceMap()[plan] || null;
}

export function planForPrice(priceId) {
    if (!priceId) return null;
    const map = planPriceMap();
    return Object.keys(map).find(p => map[p] === priceId) || null;
}

// Map a Stripe subscription.status to our subscriptionStatus vocabulary.
export function mapSubscriptionStatus(stripeStatus) {
    switch (stripeStatus) {
        case 'trialing':                              return 'Trialing';
        case 'active':                                return 'Active';
        case 'past_due':
        case 'unpaid':                                return 'PastDue';
        case 'canceled':
        case 'incomplete_expired':                    return 'Canceled';
        default:                                      return null; // incomplete/paused — no change
    }
}

// Verify a Stripe webhook signature header ("t=...,v1=...").
// signedPayload = `${t}.${rawBody}`; v1 = HMAC-SHA256(secret, signedPayload).
// Rejects if outside the timestamp tolerance (default 5 min) or mismatched.
export function verifyWebhookSignature(rawBody, signatureHeader, secret, toleranceSec = 300) {
    if (!rawBody || !signatureHeader || !secret) return false;
    const parts = Object.fromEntries(
        String(signatureHeader).split(',').map(kv => {
            const i = kv.indexOf('=');
            return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
        }),
    );
    const t = parseInt(parts.t, 10);
    const v1 = parts.v1;
    if (!t || !v1) return false;
    if (Math.abs(Math.floor(Date.now() / 1000) - t) > toleranceSec) return false;

    const expected = crypto.createHmac('sha256', secret)
        .update(`${t}.${rawBody}`, 'utf8').digest('hex');
    // timing-safe compare (guard against unequal lengths)
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(v1, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Translate a parsed Stripe event into a tenant update.
// Returns { customerId?, subscriptionId?, plan?, subscriptionStatus? } or null
// when the event is not billing-relevant. The route resolves the tenant by
// customerId / subscriptionId and applies the fields.
export function mapEventToUpdate(event) {
    const obj = event?.data?.object;
    if (!obj) return null;

    switch (event.type) {
        case 'checkout.session.completed':
            return {
                orgId:          obj.client_reference_id ? parseInt(obj.client_reference_id) : null,
                customerId:     obj.customer || null,
                subscriptionId: obj.subscription || null,
                subscriptionStatus: 'Active',
            };
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            const priceId = obj.items?.data?.[0]?.price?.id || null;
            return {
                customerId:     obj.customer || null,
                subscriptionId: obj.id || null,
                plan:           planForPrice(priceId) || undefined,
                subscriptionStatus: mapSubscriptionStatus(obj.status) || undefined,
            };
        }
        case 'customer.subscription.deleted':
            return { customerId: obj.customer || null, subscriptionId: obj.id || null, subscriptionStatus: 'Canceled' };
        case 'invoice.payment_failed':
            return { customerId: obj.customer || null, subscriptionStatus: 'PastDue' };
        case 'invoice.payment_succeeded':
            return { customerId: obj.customer || null, subscriptionStatus: 'Active' };
        default:
            return null;
    }
}

// ── Stripe REST calls (raw fetch, form-encoded) — only when configured ───────
async function stripeApi(path, method = 'POST', form = {}) {
    if (!isBillingEnabled()) throw new Error('Billing is not configured');
    const body = new URLSearchParams();
    const flatten = (obj, prefix = '') => {
        for (const [k, v] of Object.entries(obj)) {
            if (v === undefined || v === null) continue;
            const key = prefix ? `${prefix}[${k}]` : k;
            if (typeof v === 'object' && !Array.isArray(v)) flatten(v, key);
            else body.append(key, String(v));
        }
    };
    flatten(form);
    const res = await fetch(`https://api.stripe.com${path}`, {
        method,
        headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: method === 'GET' ? undefined : body,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || 'Stripe API error');
    return json;
}

// Create a Checkout session for a tenant's plan subscription. Returns { url }.
export async function createCheckoutSession({ org, plan, successUrl, cancelUrl }) {
    const priceId = priceForPlan(plan);
    if (!priceId) throw new Error(`No Stripe price configured for plan "${plan}"`);
    const session = await stripeApi('/v1/checkout/sessions', 'POST', {
        mode: 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': 1,
        client_reference_id: String(org.id),
        success_url: successUrl,
        cancel_url: cancelUrl,
        ...(org.billingCustomerId ? { customer: org.billingCustomerId } : {}),
    });
    return { url: session.url, id: session.id };
}
