import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { medicalHistory, subjects } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// GET /api/medhistory — list by study, optional ?subjectId=
router.get('/', async (req, res) => {
    try {
        const { subjectId } = req.query;
        const conditions = [eq(medicalHistory.studyId, req.studyId)];
        if (subjectId) conditions.push(eq(medicalHistory.subjectId, parseInt(subjectId)));

        const rows = await db
            .select({
                id:                    medicalHistory.id,
                subjectId:             medicalHistory.subjectId,
                subjectCode:           subjects.subjectCode,
                condition:             medicalHistory.condition,
                icdCode:               medicalHistory.icdCode,
                icdVersion:            medicalHistory.icdVersion,
                onsetDate:             medicalHistory.onsetDate,
                resolutionDate:        medicalHistory.resolutionDate,
                status:                medicalHistory.status,
                severity:              medicalHistory.severity,
                isRelatedToIndication: medicalHistory.isRelatedToIndication,
                notes:                 medicalHistory.notes,
                createdByName:         medicalHistory.createdByName,
                createdAt:             medicalHistory.createdAt,
                updatedAt:             medicalHistory.updatedAt,
            })
            .from(medicalHistory)
            .leftJoin(subjects, eq(medicalHistory.subjectId, subjects.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(medicalHistory.createdAt));

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/medhistory/:id
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db
            .select()
            .from(medicalHistory)
            .where(and(eq(medicalHistory.id, parseInt(req.params.id)), eq(medicalHistory.studyId, req.studyId)));
        if (!row) return res.status(404).json({ error: 'Medical history record not found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/medhistory — create
router.post('/', requireRole('investigator', 'pi', 'admin', 'crc'), async (req, res) => {
    try {
        const {
            subjectId, condition, icdCode, icdVersion,
            onsetDate, resolutionDate, status, severity,
            isRelatedToIndication, notes,
        } = req.body;

        if (!subjectId || !condition) {
            return res.status(400).json({ error: 'subjectId and condition are required' });
        }

        const [subject] = await db.select({ studyId: subjects.studyId }).from(subjects)
            .where(eq(subjects.id, parseInt(subjectId)));
        if (!subject || subject.studyId !== req.studyId) {
            return res.status(404).json({ error: 'Subject not found in the active study' });
        }

        const [created] = await db.insert(medicalHistory).values({
            studyId:               req.studyId,
            subjectId:             parseInt(subjectId),
            condition,
            icdCode:               icdCode               ?? null,
            icdVersion:            icdVersion             ?? 'ICD-10',
            onsetDate:             onsetDate              ?? null,
            resolutionDate:        resolutionDate         ?? null,
            status:                status                 ?? 'Active',
            severity:              severity               ?? null,
            isRelatedToIndication: Boolean(isRelatedToIndication),
            notes:                 notes                  ?? null,
            createdBy:             req.user.id,
            createdByName:         req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'medical_history', recordId: created.id, action: 'INSERT',
            newValue: `${condition} | Status: ${created.status}`,
            reason: 'Medical history recorded',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/medhistory/:id — update with reason (ICH GCP)
router.patch('/:id', requireRole('investigator', 'pi', 'admin', 'crc'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason, ...fields } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for edits (ICH GCP)' });

        const [existing] = await db.select().from(medicalHistory)
            .where(and(eq(medicalHistory.id, id), eq(medicalHistory.studyId, req.studyId)));
        if (!existing) return res.status(404).json({ error: 'Medical history record not found' });

        const updates = {
            condition:             fields.condition             ?? existing.condition,
            icdCode:               fields.icdCode              ?? existing.icdCode,
            icdVersion:            fields.icdVersion           ?? existing.icdVersion,
            onsetDate:             fields.onsetDate            ?? existing.onsetDate,
            resolutionDate:        fields.resolutionDate       ?? existing.resolutionDate,
            status:                fields.status               ?? existing.status,
            severity:              fields.severity             ?? existing.severity,
            isRelatedToIndication: fields.isRelatedToIndication !== undefined
                                       ? Boolean(fields.isRelatedToIndication)
                                       : existing.isRelatedToIndication,
            notes:                 fields.notes                ?? existing.notes,
            updatedBy:             req.user.id,
            updatedAt:             new Date(),
        };

        const [updated] = await db.update(medicalHistory)
            .set(updates)
            .where(eq(medicalHistory.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'medical_history', recordId: id, action: 'UPDATE',
            fieldName: 'multiple', oldValue: existing.condition, newValue: updated.condition,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/medhistory/:id — delete with audit
router.delete('/:id', requireRole('pi', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for deletion (ICH GCP)' });

        const [existing] = await db.select().from(medicalHistory)
            .where(and(eq(medicalHistory.id, id), eq(medicalHistory.studyId, req.studyId)));
        if (!existing) return res.status(404).json({ error: 'Medical history record not found' });

        await db.delete(medicalHistory).where(eq(medicalHistory.id, id));

        await writeAudit(db, {
            tableName: 'medical_history', recordId: id, action: 'DELETE',
            oldValue: `${existing.condition} | Status: ${existing.status}`,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ success: true, deleted: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
