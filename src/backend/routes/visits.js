import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { visits, subjects } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router({ mergeParams: true });

// GET /api/subjects/:subjectId/visits
router.get('/', async (req, res) => {
    try {
        const rows = await db.select().from(visits)
            .where(eq(visits.subjectId, parseInt(req.params.subjectId)))
            .orderBy(visits.createdAt);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/subjects/:subjectId/visits
router.post('/', requireRole('investigator', 'admin'), async (req, res) => {
    try {
        const subjectId = parseInt(req.params.subjectId);
        const { visitName, visitDate } = req.body;
        if (!visitName) return res.status(400).json({ error: 'visitName is required' });

        const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId));
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        const [created] = await db.insert(visits).values({
            subjectId,
            visitName,
            visitDate: visitDate ?? null,
        }).returning();

        await writeAudit(db, {
            tableName: 'visits', recordId: created.id, action: 'INSERT',
            newValue: visitName, reason: 'Visit created',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/subjects/:subjectId/visits/:id/status
router.patch('/:id/status', requireRole('investigator', 'cra', 'admin'), async (req, res) => {
    try {
        const { status } = req.body;
        const [updated] = await db.update(visits)
            .set({ status, updatedAt: new Date() })
            .where(eq(visits.id, parseInt(req.params.id)))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Visit not found' });

        await writeAudit(db, {
            tableName: 'visits', recordId: updated.id, action: 'UPDATE',
            fieldName: 'status', newValue: status,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
