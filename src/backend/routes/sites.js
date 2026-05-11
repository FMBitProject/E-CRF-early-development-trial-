// Site Management — ICH GCP E6(R3) §4.1.1
// Sites must be formally registered before subject enrollment

import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { sites } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// GET /api/sites — list sites (all for admin, active-only for others)
router.get('/', async (req, res) => {
    try {
        const isAdmin = req.user?.role === 'admin';
        const rows = isAdmin
            ? await db.select().from(sites).orderBy(sites.code)
            : await db.select().from(sites).where(eq(sites.status, 'Active')).orderBy(sites.code);
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
        if (!existing) return res.status(404).json({ error: 'Site not found' });

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
