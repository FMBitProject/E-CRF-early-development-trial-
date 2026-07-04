// System Validation Documentation — ICH GCP E6(R3) Appendix C.2
// Platform-level (vendor) software validation, not tenant data: only the
// platform_owner may author records; tenant admins may read them as compliance
// evidence for their own use.
import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db, client } from '../db/connection.js';
import { systemValidationLog } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// GET /api/sysval/info — system metadata (app version, environment)
router.get('/info', requireRole('admin', 'platform_owner'), (_req, res) => {
    res.json({
        appVersion:        process.env.npm_package_version || '1.0.0',
        environment:       process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
        nodeVersion:       process.version,
        uptimeSeconds:     Math.floor(process.uptime()),
    });
});

// GET /api/sysval — list all validation records (admin only)
router.get('/', requireRole('admin', 'platform_owner'), async (req, res) => {
    try {
        // Self-heal: ensure table exists before querying
        await client.unsafe(`CREATE TABLE IF NOT EXISTS system_validation_log (
            id               SERIAL PRIMARY KEY,
            version          TEXT NOT NULL,
            validation_date  TEXT NOT NULL,
            validation_type  TEXT NOT NULL,
            status           TEXT NOT NULL DEFAULT 'Pending',
            performed_by     TEXT,
            summary          TEXT,
            changes_since    TEXT,
            approved_by      TEXT,
            approved_at      TIMESTAMP,
            created_by       TEXT REFERENCES "user"(id),
            created_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`);
        const rows = await db.select().from(systemValidationLog)
            .orderBy(desc(systemValidationLog.createdAt));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/sysval — create validation record (admin only)
router.post('/', requireRole('platform_owner'), async (req, res) => {
    try {
        const { version, validationDate, validationType, status, performedBy,
                summary, changesSince, approvedBy } = req.body;
        if (!version || !validationDate || !validationType || !summary) {
            return res.status(400).json({ error: 'version, validationDate, validationType, summary are required' });
        }
        const [row] = await db.insert(systemValidationLog).values({
            version, validationDate, validationType,
            status:       status       ?? 'Pending',
            performedBy:  performedBy  ?? null,
            summary,
            changesSince: changesSince ?? null,
            approvedBy:   approvedBy   ?? null,
            createdBy:    req.user.id,
        }).returning();

        await writeAudit(db, {
            tableName: 'system_validation_log', recordId: String(row.id), action: 'INSERT',
            newValue: `Validation record v${version} (${validationType}) created`,
            reason: 'System validation record added',
            user: req.user, ipAddress: req.ip,
        });
        res.status(201).json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/sysval/:id — update record (admin only)
router.patch('/:id', requireRole('platform_owner'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status, performedBy, summary, changesSince, approvedBy, validationDate } = req.body;
        const updates = {};
        if (status !== undefined)        updates.status        = status;
        if (performedBy !== undefined)   updates.performedBy   = performedBy;
        if (summary !== undefined)       updates.summary       = summary;
        if (changesSince !== undefined)  updates.changesSince  = changesSince;
        if (approvedBy !== undefined)    updates.approvedBy    = approvedBy;
        if (validationDate !== undefined) updates.validationDate = validationDate;

        const [row] = await db.update(systemValidationLog).set(updates)
            .where(eq(systemValidationLog.id, id)).returning();
        if (!row) return res.status(404).json({ error: 'Record not found' });

        await writeAudit(db, {
            tableName: 'system_validation_log', recordId: String(id), action: 'UPDATE',
            newValue: JSON.stringify(updates),
            reason: `Validation record updated: ${JSON.stringify(updates)}`,
            user: req.user, ipAddress: req.ip,
        });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/sysval/:id/approve — mark as Validated (admin only)
router.patch('/:id/approve', requireRole('platform_owner'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [row] = await db.update(systemValidationLog)
            .set({ status: 'Validated', approvedBy: req.user.name, approvedAt: new Date() })
            .where(eq(systemValidationLog.id, id)).returning();
        if (!row) return res.status(404).json({ error: 'Record not found' });

        await writeAudit(db, {
            tableName: 'system_validation_log', recordId: String(id), action: 'UPDATE',
            newValue: 'Status set to Validated',
            reason: `Approved by ${req.user.name}`,
            user: req.user, ipAddress: req.ip,
        });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/sysval/:id — delete validation record (admin only)
router.delete('/:id', requireRole('platform_owner'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [row] = await db.delete(systemValidationLog)
            .where(eq(systemValidationLog.id, id))
            .returning();
        if (!row) return res.status(404).json({ error: 'Record not found' });

        await writeAudit(db, {
            tableName: 'system_validation_log', recordId: String(id), action: 'DELETE',
            oldValue: `v${row.version} (${row.validationType})`,
            reason: `Validation record deleted by ${req.user.name}`,
            user: req.user, ipAddress: req.ip,
        });
        res.json({ success: true, deleted: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
