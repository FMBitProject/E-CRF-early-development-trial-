import { Router } from 'express';
import { eq, ilike, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { subjects, sites, user } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// GET /api/subjects — list with optional ?status=&search=
router.get('/', async (req, res) => {
    try {
        const { status, search } = req.query;
        const conditions = [];
        if (status) conditions.push(eq(subjects.status, status));
        if (search) conditions.push(ilike(subjects.subjectCode, `%${search}%`));

        const rows = await db
            .select({
                id:          subjects.id,
                subjectCode: subjects.subjectCode,
                initials:    subjects.initials,
                sex:         subjects.sex,
                status:      subjects.status,
                enrolledAt:  subjects.enrolledAt,
                siteCode:    sites.code,
                siteName:    sites.name,
            })
            .from(subjects)
            .leftJoin(sites, eq(subjects.siteId, sites.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(subjects.enrolledAt);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/subjects/:id — detail
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db
            .select({
                id:             subjects.id,
                subjectCode:    subjects.subjectCode,
                siteId:         subjects.siteId,
                siteCode:       sites.code,
                siteName:       sites.name,
                initials:       subjects.initials,
                dateOfBirth:    subjects.dateOfBirth,
                sex:            subjects.sex,
                enrolledAt:     subjects.enrolledAt,
                status:         subjects.status,
                withdrawnAt:    subjects.withdrawnAt,
                withdrawReason: subjects.withdrawReason,
                enrolledBy:     subjects.enrolledBy,
            })
            .from(subjects)
            .leftJoin(sites, eq(subjects.siteId, sites.id))
            .where(eq(subjects.id, parseInt(req.params.id)));

        if (!row) return res.status(404).json({ error: 'Subject not found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/subjects — enroll new subject (investigator, admin)
router.post('/', requireRole('investigator', 'admin'), async (req, res) => {
    try {
        const { subjectCode, siteId, initials, dateOfBirth, sex } = req.body;
        if (!subjectCode) return res.status(400).json({ error: 'subjectCode is required' });

        const [created] = await db.insert(subjects).values({
            subjectCode,
            siteId:      siteId ?? null,
            initials:    initials ?? null,
            dateOfBirth: dateOfBirth ?? null,
            sex:         sex ?? null,
            enrolledBy:  req.user.id,
        }).returning();

        await writeAudit(db, {
            tableName: 'subjects', recordId: created.id, action: 'INSERT',
            newValue: subjectCode, reason: 'Subject enrolled',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        if (err.message.includes('unique')) {
            return res.status(409).json({ error: 'Subject code already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/subjects/:id/status — withdraw / complete (investigator, admin)
router.patch('/:id/status', requireRole('investigator', 'admin'), async (req, res) => {
    try {
        const { status, reason } = req.body;
        const allowedTransitions = ['Completed', 'Withdrawn', 'Screen Failed'];
        if (!allowedTransitions.includes(status)) {
            return res.status(400).json({ error: 'Invalid status transition' });
        }
        if (status === 'Withdrawn' && !reason) {
            return res.status(400).json({ error: 'Withdrawal reason is required' });
        }

        const updates = { status, updatedAt: new Date() };
        if (status === 'Withdrawn') {
            updates.withdrawnAt = new Date();
            updates.withdrawReason = reason;
        }

        const [updated] = await db.update(subjects)
            .set(updates)
            .where(eq(subjects.id, parseInt(req.params.id)))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Subject not found' });

        await writeAudit(db, {
            tableName: 'subjects', recordId: updated.id, action: 'UPDATE',
            fieldName: 'status', newValue: status, reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
