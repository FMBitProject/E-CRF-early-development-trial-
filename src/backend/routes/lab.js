import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db, client } from '../db/connection.js';
import { labResults, subjects, visits } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// GET /api/lab — list by study, optional ?subjectId=&visitId=&status=&panel=
router.get('/', async (req, res) => {
    try {
        // Self-heal: add loinc_coding_status if this DB predates the migration
        await client.unsafe(`ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS loinc_coding_status TEXT NOT NULL DEFAULT 'Custom'`).catch(() => {});

        const { subjectId, visitId, status, panel } = req.query;
        const conditions = [eq(labResults.studyId, req.studyId)];
        if (subjectId) conditions.push(eq(labResults.subjectId, parseInt(subjectId)));
        if (visitId)   conditions.push(eq(labResults.visitId, parseInt(visitId)));
        if (status)    conditions.push(eq(labResults.status, status));
        if (panel)     conditions.push(eq(labResults.panelName, panel));

        const rows = await db
            .select({
                id:                   labResults.id,
                subjectId:            labResults.subjectId,
                subjectCode:          subjects.subjectCode,
                visitId:              labResults.visitId,
                visitName:            visits.visitName,
                panelName:            labResults.panelName,
                testName:             labResults.testName,
                testCode:             labResults.testCode,
                loincCodingStatus:    labResults.loincCodingStatus,
                specimenType:         labResults.specimenType,
                specimenCollectedAt:  labResults.specimenCollectedAt,
                labName:              labResults.labName,
                valueNumeric:         labResults.valueNumeric,
                valueText:            labResults.valueText,
                unit:                 labResults.unit,
                refRangeLow:          labResults.refRangeLow,
                refRangeHigh:         labResults.refRangeHigh,
                refRangeText:         labResults.refRangeText,
                abnormalityFlag:      labResults.abnormalityFlag,
                clinicalSignificance: labResults.clinicalSignificance,
                isAbnormal:           labResults.isAbnormal,
                assessedBy:           labResults.assessedBy,
                assessedByName:       labResults.assessedByName,
                assessmentDate:       labResults.assessmentDate,
                status:               labResults.status,
                notes:                labResults.notes,
                createdByName:        labResults.createdByName,
                createdAt:            labResults.createdAt,
                updatedAt:            labResults.updatedAt,
            })
            .from(labResults)
            .leftJoin(subjects, eq(labResults.subjectId, subjects.id))
            .leftJoin(visits, eq(labResults.visitId, visits.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(labResults.createdAt));

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/lab/:id
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db
            .select()
            .from(labResults)
            .where(and(eq(labResults.id, parseInt(req.params.id)), eq(labResults.studyId, req.studyId)));
        if (!row) return res.status(404).json({ error: 'Lab result not found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/lab — create
router.post('/', requireRole('investigator', 'pi', 'admin', 'crc'), async (req, res) => {
    try {
        const {
            subjectId, visitId,
            panelName, panel,           // accept both for compat
            testName, testCode, loincCodingStatus,
            specimenType, specimenCollectedAt, labName,
            valueNumeric, valueText, unit,
            refRangeLow, refRangeHigh, refRangeText,
            abnormalityFlag, clinicalSignificance, isAbnormal, notes,
        } = req.body;

        if (!subjectId || !testName) {
            return res.status(400).json({ error: 'subjectId and testName are required' });
        }

        const [subject] = await db.select({ studyId: subjects.studyId }).from(subjects)
            .where(eq(subjects.id, parseInt(subjectId)));
        if (!subject || subject.studyId !== req.studyId) {
            return res.status(404).json({ error: 'Subject not found in the active study' });
        }

        const resolvedPanel = panelName ?? panel ?? null;

        const [created] = await db.insert(labResults).values({
            studyId:              req.studyId,
            subjectId:            parseInt(subjectId),
            visitId:              visitId             ? parseInt(visitId) : null,
            panelName:            resolvedPanel,
            testName,
            testCode:             testCode            ?? null,
            loincCodingStatus:    loincCodingStatus   ?? 'Custom',
            specimenType:         specimenType        ?? null,
            specimenCollectedAt:  specimenCollectedAt ?? null,
            labName:              labName             ?? null,
            valueNumeric:         valueNumeric        ?? null,
            valueText:            valueText           ?? null,
            unit:                 unit                ?? null,
            refRangeLow:          refRangeLow         ?? null,
            refRangeHigh:         refRangeHigh        ?? null,
            refRangeText:         refRangeText        ?? null,
            abnormalityFlag:      abnormalityFlag      ?? null,
            clinicalSignificance: clinicalSignificance ?? 'NCS',
            isAbnormal:           Boolean(isAbnormal),
            status:               'Pending',
            notes:                notes               ?? null,
            createdBy:            req.user.id,
            createdByName:        req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'lab_results', recordId: created.id, action: 'INSERT',
            newValue: `${testName} | Panel: ${panelName ?? 'N/A'} | Status: Pending`,
            reason: 'Lab result recorded',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/lab/:id — update; require reason if clinicalSignificance or isAbnormal changes
router.patch('/:id', requireRole('investigator', 'pi', 'admin', 'crc'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason, ...fields } = req.body;

        const [existing] = await db.select().from(labResults)
            .where(and(eq(labResults.id, id), eq(labResults.studyId, req.studyId)));
        if (!existing) return res.status(404).json({ error: 'Lab result not found' });
        if (existing.status === 'Verified') {
            return res.status(409).json({ error: 'Cannot edit a verified lab result; unverify first' });
        }

        const significanceChanged = fields.clinicalSignificance !== undefined &&
            fields.clinicalSignificance !== existing.clinicalSignificance;
        const abnormalChanged = fields.isAbnormal !== undefined &&
            Boolean(fields.isAbnormal) !== existing.isAbnormal;

        if ((significanceChanged || abnormalChanged) && !reason) {
            return res.status(400).json({ error: 'reason is required when changing clinicalSignificance or isAbnormal (ICH GCP)' });
        }
        if (!reason && !significanceChanged && !abnormalChanged) {
            // reason still recommended but not strictly required for non-assessment edits
            // enforce for all edits per GCP policy
            return res.status(400).json({ error: 'reason is required for all edits (ICH GCP)' });
        }

        const resolvedPanel = fields.panelName ?? fields.panel ?? existing.panelName;
        const updates = {
            panelName:            resolvedPanel,
            testName:             fields.testName            ?? existing.testName,
            testCode:             fields.testCode            ?? existing.testCode,
            loincCodingStatus:    fields.loincCodingStatus   ?? existing.loincCodingStatus,
            specimenType:         fields.specimenType        ?? existing.specimenType,
            specimenCollectedAt:  fields.specimenCollectedAt ?? existing.specimenCollectedAt,
            labName:              fields.labName             ?? existing.labName,
            valueNumeric:         fields.valueNumeric        ?? existing.valueNumeric,
            valueText:            fields.valueText           ?? existing.valueText,
            unit:                 fields.unit                ?? existing.unit,
            refRangeLow:          fields.refRangeLow         ?? existing.refRangeLow,
            refRangeHigh:         fields.refRangeHigh        ?? existing.refRangeHigh,
            refRangeText:         fields.refRangeText        ?? existing.refRangeText,
            abnormalityFlag:      fields.abnormalityFlag     ?? existing.abnormalityFlag,
            clinicalSignificance: fields.clinicalSignificance ?? existing.clinicalSignificance,
            isAbnormal:           fields.isAbnormal !== undefined ? Boolean(fields.isAbnormal) : existing.isAbnormal,
            notes:                fields.notes               ?? existing.notes,
            updatedBy:            req.user.id,
            updatedAt:            new Date(),
        };

        const [updated] = await db.update(labResults)
            .set(updates)
            .where(eq(labResults.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'lab_results', recordId: id, action: 'UPDATE',
            fieldName: significanceChanged ? 'clinical_significance' : 'multiple',
            oldValue: significanceChanged ? existing.clinicalSignificance : existing.testName,
            newValue: significanceChanged ? updated.clinicalSignificance  : updated.testName,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/lab/:id/verify — mark as Verified, set assessedBy/assessedByName/assessmentDate
router.patch('/:id/verify', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const [existing] = await db.select().from(labResults)
            .where(and(eq(labResults.id, id), eq(labResults.studyId, req.studyId)));
        if (!existing) return res.status(404).json({ error: 'Lab result not found' });

        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        const [updated] = await db.update(labResults)
            .set({
                status:         'Verified',
                assessedBy:     req.user.id,
                assessedByName: req.user.name,
                assessmentDate: todayStr,
                updatedBy:      req.user.id,
                updatedAt:      now,
            })
            .where(eq(labResults.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'lab_results', recordId: id, action: 'UPDATE',
            fieldName: 'status', oldValue: existing.status, newValue: 'Verified',
            reason: `Lab result verified by ${req.user.name}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/lab/:id — delete with audit
router.delete('/:id', requireRole('pi', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for deletion (ICH GCP)' });

        const [existing] = await db.select().from(labResults)
            .where(and(eq(labResults.id, id), eq(labResults.studyId, req.studyId)));
        if (!existing) return res.status(404).json({ error: 'Lab result not found' });

        await db.delete(labResults).where(eq(labResults.id, id));

        await writeAudit(db, {
            tableName: 'lab_results', recordId: id, action: 'DELETE',
            oldValue: `${existing.testName} | Panel: ${existing.panelName ?? 'N/A'}`,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ success: true, deleted: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
