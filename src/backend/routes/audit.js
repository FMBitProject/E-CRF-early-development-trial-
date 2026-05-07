import { Router } from 'express';
import { eq, and, ilike, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { auditTrails } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// GET /api/audit — immutable audit trail (CRA and admin only)
router.get('/', requireRole('cra', 'admin'), async (req, res) => {
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
