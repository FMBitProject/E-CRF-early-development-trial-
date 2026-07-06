// Billing routes — Stripe checkout + webhook. Inert until configured.
// The webhook is signature-verified and mounted with a RAW body parser
// (see server.js) — it must not go through express.json().

import { Router } from 'express';
import { eq, or } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { organizations } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import {
    isBillingEnabled, planPriceMap, createCheckoutSession,
    verifyWebhookSignature, mapEventToUpdate,
} from '../lib/billing.js';

// ── Webhook handler (raw body; no auth — verified by signature) ──────────────
// Exported separately so server.js can mount it with express.raw before json.
export async function handleBillingWebhook(req, res) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!isBillingEnabled() || !secret) {
        return res.status(503).json({ error: 'Billing is not configured' });
    }
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
    const sig = req.headers['stripe-signature'];
    if (!verifyWebhookSignature(raw, sig, secret)) {
        return res.status(400).json({ error: 'Invalid signature' });
    }

    let event;
    try { event = JSON.parse(raw); } catch { return res.status(400).json({ error: 'Invalid payload' }); }

    try {
        const upd = mapEventToUpdate(event);
        if (!upd) return res.json({ received: true, ignored: event.type });

        // Resolve the tenant: explicit org id (checkout) → customer → subscription.
        let org = null;
        if (upd.orgId) {
            [org] = await db.select().from(organizations).where(eq(organizations.id, upd.orgId));
        }
        if (!org && (upd.customerId || upd.subscriptionId)) {
            [org] = await db.select().from(organizations).where(or(
                upd.customerId     ? eq(organizations.billingCustomerId, upd.customerId) : undefined,
                upd.subscriptionId ? eq(organizations.billingSubscriptionId, upd.subscriptionId) : undefined,
            ));
        }
        if (!org) return res.json({ received: true, unmatched: true });

        const set = { updatedAt: new Date() };
        if (upd.customerId)         set.billingCustomerId     = upd.customerId;
        if (upd.subscriptionId)     set.billingSubscriptionId = upd.subscriptionId;
        if (upd.plan)               set.plan                  = upd.plan;
        if (upd.subscriptionStatus) set.subscriptionStatus    = upd.subscriptionStatus;

        await db.update(organizations).set(set).where(eq(organizations.id, org.id));

        await writeAudit(db, {
            tableName: 'organizations', recordId: String(org.id), action: 'UPDATE',
            fieldName: 'subscription', newValue: JSON.stringify({ event: event.type, ...set, updatedAt: undefined }),
            reason: `Billing webhook: ${event.type}`,
            user: { id: null, name: 'Stripe', role: 'system', organizationId: org.id },
            ipAddress: req.ip,
        });

        res.json({ received: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ── Authed routes (mounted with requireAuth) ─────────────────────────────────
const router = Router();

// GET /api/billing/config — is billing enabled + which plans have a price.
router.get('/config', requireRole('platform_owner', 'admin'), (_req, res) => {
    const map = planPriceMap();
    res.json({
        enabled: isBillingEnabled(),
        plans: Object.fromEntries(Object.entries(map).map(([p, id]) => [p, !!id])),
    });
});

// POST /api/billing/checkout — platform operator starts a checkout for a tenant.
// Body: { orgId, plan }. Returns { url } to redirect the payer to.
router.post('/checkout', requireRole('platform_owner'), async (req, res) => {
    try {
        if (!isBillingEnabled()) return res.status(503).json({ error: 'Billing is not configured' });
        const { orgId, plan } = req.body;
        if (!orgId || !plan) return res.status(400).json({ error: 'orgId and plan are required' });

        const [org] = await db.select().from(organizations).where(eq(organizations.id, parseInt(orgId)));
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        const base = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
        const session = await createCheckoutSession({
            org, plan,
            successUrl: `${base}/platform.html?billing=success`,
            cancelUrl:  `${base}/platform.html?billing=cancelled`,
        });
        res.json({ url: session.url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
