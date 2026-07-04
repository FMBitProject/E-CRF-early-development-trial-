import { Router } from 'express';
import { eq, and, ilike, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { auditTrails } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// GET /api/audit — immutable audit trail.
// Restricted per ROLE_MATRIX: crc/investigator must not read other users'
// old/new clinical values, reasons, and IP addresses across the platform.
router.get('/', requireRole('admin', 'pi', 'cra', 'data_manager'), async (req, res) => {
    try {
        const { action, tableName, userId, search } = req.query;
        const conditions = [];
        if (action)    conditions.push(eq(auditTrails.action, action));
        if (tableName) conditions.push(eq(auditTrails.tableName, tableName));
        if (userId)    conditions.push(eq(auditTrails.userId, userId));
        if (search)    conditions.push(ilike(auditTrails.recordId, `%${search}%`));

        const rows = await db.select().from(auditTrails)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(auditTrails.createdAt))
            .limit(500);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
