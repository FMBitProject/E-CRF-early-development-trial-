// Organization (tenant) lifecycle — SaaS platform operations.
// Restricted to the platform_owner role (the cross-tenant SaaS operator).
// Tenant admins manage users WITHIN their org via /api/users; they never
// reach this router.

import { Router } from 'express';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/connection.js';
import { organizations, user, passwordMeta } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { auth } from '../auth/better-auth.js';
import { sendUserInviteEmail } from '../lib/email.js';
import { orgUsage, planLimits, PLANS } from '../lib/plans.js';
import { client } from '../db/connection.js';

const router = Router();

const VALID_STATUS = ['Active', 'Suspended', 'Closed'];
const VALID_SUB_STATUS = ['Trialing', 'Active', 'PastDue', 'Canceled'];
const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Everything here is platform-operator only.
router.use(requireRole('platform_owner'));

// GET /api/organizations — list all tenants
router.get('/', async (_req, res) => {
    try {
        const rows = await db.select().from(organizations).orderBy(organizations.createdAt);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/organizations/overview — all tenants with usage vs plan limits.
// (Defined before /:id so the literal path is not shadowed.)
router.get('/overview', async (_req, res) => {
    try {
        const orgs = await db.select().from(organizations).orderBy(organizations.createdAt);
        const rows = await Promise.all(orgs.map(async (o) => {
            const usage  = await orgUsage(o.id);
            const limits = planLimits(o.plan);
            return {
                id: o.id, name: o.name, slug: o.slug, status: o.status,
                plan: o.plan, subscriptionStatus: o.subscriptionStatus,
                trialEndsAt: o.trialEndsAt, usage, limits,
            };
        }));
        res.json({ plans: PLANS, tenants: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/organizations/:id — one tenant + basic counts
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
        if (!org) return res.status(404).json({ error: 'Organization not found' });
        res.json(org);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/organizations — provision a new tenant + its first admin.
// Body: { name, slug?, adminName, adminEmail }
router.post('/', async (req, res) => {
    try {
        const { name, slug, adminName, adminEmail } = req.body;
        if (!name || !adminName || !adminEmail) {
            return res.status(400).json({ error: 'name, adminName, and adminEmail are required' });
        }
        const finalSlug = slugify(slug || name);
        if (!finalSlug) return res.status(400).json({ error: 'Could not derive a valid slug' });

        const [dupSlug] = await db.select({ id: organizations.id }).from(organizations)
            .where(eq(organizations.slug, finalSlug));
        if (dupSlug) return res.status(409).json({ error: `Slug "${finalSlug}" is already taken` });

        const normalizedEmail = adminEmail.toLowerCase().trim();
        const [dupEmail] = await db.select({ id: user.id }).from(user).where(eq(user.email, normalizedEmail));
        if (dupEmail) return res.status(409).json({ error: 'A user with the admin email already exists' });

        // 1. Create the tenant.
        const [org] = await db.insert(organizations)
            .values({ name, slug: finalSlug, status: 'Active' })
            .returning();

        // 2. Create its first admin via Better Auth (temp password, must-change).
        const tempPassword = crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + 'A1!';
        const signUp = await auth.api.signUpEmail({
            body: { name: adminName.trim(), email: normalizedEmail, password: tempPassword },
        });
        if (!signUp?.user?.id) {
            return res.status(500).json({ error: 'Organization created but admin account failed' });
        }
        await db.update(user)
            .set({ role: 'admin', organizationId: org.id })
            .where(eq(user.id, signUp.user.id));
        await db.insert(passwordMeta)
            .values({ userId: signUp.user.id, lastChangedAt: new Date(), mustChange: true })
            .onConflictDoNothing();

        sendUserInviteEmail(normalizedEmail, adminName, {
            tempPassword,
            role: 'admin',
            invitedBy: req.user.name,
            appUrl: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
        }).catch(() => {});

        await writeAudit(db, {
            tableName: 'organizations', recordId: String(org.id), action: 'INSERT',
            newValue: `Tenant "${name}" (${finalSlug}) provisioned with admin <${normalizedEmail}>`,
            reason: 'Tenant provisioned by platform operator',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json({ organization: org, admin: { email: normalizedEmail, tempPasswordSent: true } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/organizations/:id — rename or change status (suspend/activate/close)
router.patch('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, status, plan, subscriptionStatus, trialEndsAt } = req.body;
        if (status !== undefined && !VALID_STATUS.includes(status)) {
            return res.status(400).json({ error: `status must be one of: ${VALID_STATUS.join(', ')}` });
        }
        if (plan !== undefined && !PLANS[plan]) {
            return res.status(400).json({ error: `plan must be one of: ${Object.keys(PLANS).join(', ')}` });
        }
        if (subscriptionStatus !== undefined && !VALID_SUB_STATUS.includes(subscriptionStatus)) {
            return res.status(400).json({ error: `subscriptionStatus must be one of: ${VALID_SUB_STATUS.join(', ')}` });
        }

        const [before] = await db.select().from(organizations).where(eq(organizations.id, id));
        if (!before) return res.status(404).json({ error: 'Organization not found' });

        const updates = { updatedAt: new Date() };
        if (name   !== undefined) updates.name   = name;
        if (status !== undefined) updates.status = status;
        if (plan   !== undefined) updates.plan   = plan;
        if (subscriptionStatus !== undefined) updates.subscriptionStatus = subscriptionStatus;
        if (trialEndsAt !== undefined) updates.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;

        const [org] = await db.update(organizations).set(updates)
            .where(eq(organizations.id, id)).returning();

        await writeAudit(db, {
            tableName: 'organizations', recordId: String(id), action: 'UPDATE',
            fieldName: status !== undefined ? 'status' : 'multiple',
            oldValue: status !== undefined ? before.status : before.name,
            newValue: status !== undefined ? org.status : org.name,
            reason: `Tenant updated by platform operator${status ? ` — status → ${status}` : ''}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(org);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/organizations/:id/usage — resource usage vs plan limits.
router.get('/:id/usage', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
        if (!org) return res.status(404).json({ error: 'Organization not found' });
        res.json({ plan: org.plan, usage: await orgUsage(id), limits: planLimits(org.plan) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/organizations/:id/export — tenant data portability bundle (JSON).
// Supports GDPR / UU PDP data-portability requests, operator-mediated.
// NOTE: this is a portability EXPORT, not erasure — clinical data is subject to
// trial retention (ICH ~25 yr); "forgetting" a tenant = Close + revoke access.
router.get('/:id/export', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        // Core tenant tables (org-owned) + clinical data scoped via the org's
        // studies. Passwords/tokens are never exported.
        const [studies, sites, users, subjects, ae, deviations, consents, queries, audit] = await Promise.all([
            client`SELECT * FROM studies WHERE organization_id = ${id}`,
            client`SELECT * FROM sites WHERE organization_id = ${id}`,
            client`SELECT id, name, email, role, site_id, is_active, created_at FROM "user" WHERE organization_id = ${id}`,
            client`SELECT s.* FROM subjects s JOIN studies st ON st.id = s.study_id WHERE st.organization_id = ${id}`,
            client`SELECT * FROM adverse_events WHERE study_id IN (SELECT id FROM studies WHERE organization_id = ${id})`,
            client`SELECT * FROM protocol_deviations WHERE study_id IN (SELECT id FROM studies WHERE organization_id = ${id})`,
            client`SELECT * FROM informed_consents WHERE study_id IN (SELECT id FROM studies WHERE organization_id = ${id})`,
            client`SELECT * FROM queries WHERE study_id IN (SELECT id FROM studies WHERE organization_id = ${id})`,
            client`SELECT * FROM audit_trails WHERE organization_id = ${id}`,
        ]);

        await writeAudit(db, {
            tableName: 'organizations', recordId: String(id), action: 'EXPORT',
            newValue: `Tenant data export generated (${subjects.length} subjects)`,
            reason: 'Data portability export by platform operator',
            user: req.user, ipAddress: req.ip,
        });

        res.setHeader('Content-Disposition', `attachment; filename="tenant-${org.slug}-export.json"`);
        res.json({
            exportedAt: new Date().toISOString(),
            organization: org,
            counts: { studies: studies.length, sites: sites.length, users: users.length, subjects: subjects.length },
            data: { studies, sites, users, subjects, adverseEvents: ae, deviations, consents, queries, auditTrails: audit },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
