import { Router } from 'express';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { studies, studyUsers, user as userTable } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

function isMissingTable(err) {
    const c = err?.cause;
    return err?.code === '42P01' || c?.code === '42P01' ||
           (err?.message || '').includes('does not exist') ||
           (c?.message || '').includes('does not exist');
}

// GET /api/studies — list studies accessible to current user
router.get('/', async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            const rows = await db.select().from(studies).orderBy(studies.createdAt);
            return res.json(rows);
        }
        // Non-admin: only studies they are assigned to
        const assignments = await db.select({ studyId: studyUsers.studyId })
            .from(studyUsers)
            .where(eq(studyUsers.userId, req.user.id));
        if (assignments.length === 0) return res.json([]);
        const ids = assignments.map(a => a.studyId);
        const rows = await db.select().from(studies)
            .where(inArray(studies.id, ids))
            .orderBy(studies.createdAt);
        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.json([]); // migration not yet complete
        res.status(500).json({ error: err.message });
    }
});

// POST /api/studies — create study (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
    const { title, protocolNo, phase, sponsor, indication, startDate, endDate } = req.body;
    if (!title || !protocolNo) return res.status(400).json({ error: 'title and protocolNo are required' });
    try {
        const [row] = await db.insert(studies).values({
            title, protocolNo, phase: phase || null,
            sponsor: sponsor || null, indication: indication || null,
            startDate: startDate || null, endDate: endDate || null,
            status: 'Active',
            createdBy: req.user.id, createdByName: req.user.name,
        }).returning();
        await writeAudit(db, { tableName: 'studies', recordId: row.id, action: 'INSERT', newValue: row.title, reason: 'Study created', user: req.user, ipAddress: req.ip });
        res.status(201).json(row);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Protocol number already exists' });
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/studies/:id — update study (admin only)
router.patch('/:id', requireRole('admin'), async (req, res) => {
    const id = parseInt(req.params.id);
    const { title, protocolNo, phase, sponsor, indication, status, startDate, endDate } = req.body;
    try {
        const [before] = await db.select().from(studies).where(eq(studies.id, id));
        if (!before) return res.status(404).json({ error: 'Study not found' });

        const updates = {};
        if (title       !== undefined) updates.title       = title;
        if (protocolNo  !== undefined) updates.protocolNo  = protocolNo;
        if (phase       !== undefined) updates.phase       = phase;
        if (sponsor     !== undefined) updates.sponsor     = sponsor;
        if (indication  !== undefined) updates.indication  = indication;
        if (status      !== undefined) updates.status      = status;
        if (startDate   !== undefined) updates.startDate   = startDate;
        if (endDate     !== undefined) updates.endDate     = endDate;
        updates.updatedAt = new Date();

        const [row] = await db.update(studies).set(updates).where(eq(studies.id, id)).returning();
        await writeAudit(db, { tableName: 'studies', recordId: id, action: 'UPDATE', newValue: JSON.stringify(updates), reason: 'Study updated', user: req.user, ipAddress: req.ip });
        res.json(row);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Protocol number already exists' });
        res.status(500).json({ error: err.message });
    }
});

// GET /api/studies/:id/users — list users assigned to a study
router.get('/:id/users', requireRole('admin'), async (req, res) => {
    const studyId = parseInt(req.params.id);
    try {
        const rows = await db
            .select({
                id: studyUsers.id,
                studyId: studyUsers.studyId,
                userId: studyUsers.userId,
                assignedAt: studyUsers.assignedAt,
                assignedBy: studyUsers.assignedBy,
                userName: userTable.name,
                userEmail: userTable.email,
                userRole: userTable.role,
            })
            .from(studyUsers)
            .innerJoin(userTable, eq(studyUsers.userId, userTable.id))
            .where(eq(studyUsers.studyId, studyId));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/studies/:id/users — assign user to study (admin only)
router.post('/:id/users', requireRole('admin'), async (req, res) => {
    const studyId = parseInt(req.params.id);
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    try {
        const [study] = await db.select({ id: studies.id }).from(studies).where(eq(studies.id, studyId));
        if (!study) return res.status(404).json({ error: 'Study not found' });

        const [existing] = await db.select({ id: studyUsers.id })
            .from(studyUsers)
            .where(and(eq(studyUsers.studyId, studyId), eq(studyUsers.userId, userId)));
        if (existing) return res.status(409).json({ error: 'User already assigned to this study' });

        const [row] = await db.insert(studyUsers).values({
            studyId, userId, assignedBy: req.user.id,
        }).returning();
        await writeAudit(db, { tableName: 'study_users', recordId: row.id, action: 'INSERT', newValue: userId, reason: 'User assigned to study', user: req.user, ipAddress: req.ip });
        res.status(201).json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/studies/:id/users/:userId — remove user assignment (admin only)
router.delete('/:id/users/:userId', requireRole('admin'), async (req, res) => {
    const studyId = parseInt(req.params.id);
    const { userId } = req.params;
    try {
        const [row] = await db.delete(studyUsers)
            .where(and(eq(studyUsers.studyId, studyId), eq(studyUsers.userId, userId)))
            .returning();
        if (!row) return res.status(404).json({ error: 'Assignment not found' });
        await writeAudit(db, { tableName: 'study_users', recordId: row.id, action: 'DELETE', oldValue: userId, reason: 'User removed from study', user: req.user, ipAddress: req.ip });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
