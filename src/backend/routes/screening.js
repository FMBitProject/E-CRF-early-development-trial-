// Screening Log — ICH GCP E6(R3) §8.3.20
import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { screeningLog, subjects, sites } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// GET /api/screening — list all screening records for study
router.get('/', async (req, res) => {
    try {
        const rows = await db
            .select({
                id:                  screeningLog.id,
                screeningDate:       screeningLog.screeningDate,
                screeningCode:       screeningLog.screeningCode,
                subjectInitials:     screeningLog.subjectInitials,
                disposition:         screeningLog.disposition,
                failReason:          screeningLog.failReason,
                eligibilityCriteria: screeningLog.eligibilityCriteria,
                notes:               screeningLog.notes,
                enrolledSubjectId:   screeningLog.enrolledSubjectId,
                siteId:              screeningLog.siteId,
                siteName:            sites.name,
                enrolledCode:        subjects.subjectCode,
                createdByName:       screeningLog.createdByName,
                createdAt:           screeningLog.createdAt,
                updatedAt:           screeningLog.updatedAt,
            })
            .from(screeningLog)
            .leftJoin(sites, eq(screeningLog.siteId, sites.id))
            .leftJoin(subjects, eq(screeningLog.enrolledSubjectId, subjects.id))
            .where(eq(screeningLog.studyId, req.studyId))
            .orderBy(desc(screeningLog.screeningDate));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/screening/stats
router.get('/stats', async (req, res) => {
    try {
        const rows = await db
            .select({ disposition: screeningLog.disposition })
            .from(screeningLog)
            .where(eq(screeningLog.studyId, req.studyId));
        const stats = { total: rows.length, enrolled: 0, screenFailed: 0, pending: 0 };
        for (const r of rows) {
            if (r.disposition === 'Enrolled')       stats.enrolled++;
            else if (r.disposition === 'Screen Failed') stats.screenFailed++;
            else                                         stats.pending++;
        }
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/screening
router.post('/', requireRole('admin', 'investigator', 'pi', 'crc'), async (req, res) => {
    try {
        const { screeningDate, screeningCode, subjectInitials, disposition,
                failReason, eligibilityCriteria, notes, siteId } = req.body;
        if (!screeningDate || !screeningCode || !disposition) {
            return res.status(400).json({ error: 'screeningDate, screeningCode, and disposition are required' });
        }
        const [row] = await db.insert(screeningLog).values({
            studyId: req.studyId,
            siteId: siteId ? parseInt(siteId) : null,
            screeningDate, screeningCode, subjectInitials: subjectInitials || null,
            disposition, failReason: failReason || null,
            eligibilityCriteria: eligibilityCriteria || null,
            notes: notes || null,
            createdBy: req.user.id, createdByName: req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'screening_log', recordId: row.id, action: 'INSERT',
            newValue: JSON.stringify({ screeningCode, disposition }),
            user: req.user, ipAddress: req.ip,
        });
        res.status(201).json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/screening/:id
router.patch('/:id', requireRole('admin', 'investigator', 'pi', 'crc'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [existing] = await db.select().from(screeningLog)
            .where(and(eq(screeningLog.id, id), eq(screeningLog.studyId, req.studyId)));
        if (!existing) return res.status(404).json({ error: 'Record not found' });

        const allowed = ['screeningDate', 'subjectInitials', 'disposition',
                         'failReason', 'eligibilityCriteria', 'notes', 'siteId', 'enrolledSubjectId'];
        const updates = {};
        for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
        updates.updatedAt = new Date();

        const [updated] = await db.update(screeningLog).set(updates)
            .where(eq(screeningLog.id, id)).returning();

        await writeAudit(db, {
            tableName: 'screening_log', recordId: id, action: 'UPDATE',
            oldValue: existing.disposition, newValue: updated.disposition,
            reason: req.body.reason || 'Field update',
            user: req.user, ipAddress: req.ip,
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/screening/:id (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [deleted] = await db.delete(screeningLog)
            .where(and(eq(screeningLog.id, id), eq(screeningLog.studyId, req.studyId)))
            .returning();
        if (!deleted) return res.status(404).json({ error: 'Screening record not found' });
        await writeAudit(db, {
            tableName: 'screening_log', recordId: id, action: 'DELETE',
            oldValue: deleted.screeningCode ?? String(id),
            user: req.user, ipAddress: req.ip,
        });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
