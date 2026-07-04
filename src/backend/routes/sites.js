// Site Management — ICH GCP E6(R3) §4.1.1
// Sites must be formally registered before subject enrollment

import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, client } from '../db/connection.js';
import { sites } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { orgCondition, sameOrg, effectiveOrgId } from '../lib/tenantscope.js';

const router = Router();

// GET /api/sites — list sites (all in the caller's org for admin; user_sites-based for others)
router.get('/', async (req, res) => {
    try {
        const isAdmin = req.user?.role === 'admin' || req.user?.role === 'platform_owner';
        if (isAdmin) {
            // Org-scoped: an admin sees only their organization's sites.
            const rows = await db.select().from(sites)
                .where(orgCondition(req, sites.organizationId))
                .orderBy(sites.code);
            return res.json(rows);
        }

        // Non-admin: return sites from user_sites, filtered by X-Study-ID if present
        const studyId = req.headers['x-study-id'] ? parseInt(req.headers['x-study-id']) : null;

        let rows = [];
        try {
            if (studyId) {
                rows = await client`
                    SELECT DISTINCT s.*
                    FROM user_sites us
                    JOIN sites s ON s.id = us.site_id
                    WHERE us.user_id = ${req.user.id} AND us.study_id = ${studyId}
                    ORDER BY s.code
                `;
            } else {
                rows = await client`
                    SELECT DISTINCT s.*
                    FROM user_sites us
                    JOIN sites s ON s.id = us.site_id
                    WHERE us.user_id = ${req.user.id}
                    ORDER BY s.code
                `;
            }
        } catch {
            // user_sites table not yet created — fall back to legacy site_id column
        }

        // Fallback: if no user_sites rows, use legacy user.site_id
        if (!rows.length && req.user.siteId) {
            const [site] = await db.select().from(sites).where(eq(sites.id, req.user.siteId));
            rows = site ? [site] : [];
        }

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/sites — create a new site (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
    try {
        const { name, code, country, piName } = req.body;
        if (!name || !code) {
            return res.status(400).json({ error: 'name and code are required' });
        }

        const [site] = await db.insert(sites).values({
            organizationId: effectiveOrgId(req),
            name,
            code:    code.toUpperCase().trim(),
            country: country ?? null,
            piName:  piName  ?? null,
            status:  'Active',
        }).returning();

        await writeAudit(db, {
            tableName: 'sites', recordId: site.id, action: 'INSERT',
            newValue: `${site.code} — ${site.name}`,
            reason: 'Site registered per ICH GCP E6(R3) §4.1.1',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(site);
    } catch (err) {
        if (err.message?.includes('unique') || err.code === '23505') {
            return res.status(409).json({ error: 'Site code already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/sites/:id — update site (admin only)
router.patch('/:id', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, country, piName, status } = req.body;

        const [existing] = await db.select().from(sites).where(eq(sites.id, id));
        if (!existing || !sameOrg(req, existing.organizationId)) {
            return res.status(404).json({ error: 'Site not found' });
        }

        const updates = {};
        if (name    !== undefined) updates.name    = name;
        if (country !== undefined) updates.country = country;
        if (piName  !== undefined) updates.piName  = piName;
        if (status  !== undefined) updates.status  = status;

        const [updated] = await db.update(sites).set(updates)
            .where(eq(sites.id, id)).returning();

        await writeAudit(db, {
            tableName: 'sites', recordId: id, action: 'UPDATE',
            newValue: JSON.stringify(updates),
            reason: 'Site information updated',
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
