import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { concomitantMeds, subjects } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { siteCondition, subjectInSiteScope } from '../lib/sitescope.js';

const router = Router();

// GET /api/conmeds — list by study, optional ?subjectId=
router.get('/', async (req, res) => {
    try {
        const { subjectId } = req.query;
        const conditions = [eq(concomitantMeds.studyId, req.studyId)];
        if (subjectId) conditions.push(eq(concomitantMeds.subjectId, parseInt(subjectId)));
        const siteCond = siteCondition(req);
        if (siteCond) conditions.push(siteCond);

        const rows = await db
            .select({
                id:            concomitantMeds.id,
                subjectId:     concomitantMeds.subjectId,
                subjectCode:   subjects.subjectCode,
                drugName:      concomitantMeds.drugName,
                whoDrugName:   concomitantMeds.whoDrugName,
                whoDrugCode:   concomitantMeds.whoDrugCode,
                atcCode:       concomitantMeds.atcCode,
                indication:    concomitantMeds.indication,
                dose:          concomitantMeds.dose,
                doseUnit:      concomitantMeds.doseUnit,
                frequency:     concomitantMeds.frequency,
                route:         concomitantMeds.route,
                startDate:     concomitantMeds.startDate,
                stopDate:      concomitantMeds.stopDate,
                isOngoing:     concomitantMeds.isOngoing,
                notes:         concomitantMeds.notes,
                createdByName: concomitantMeds.createdByName,
                createdAt:     concomitantMeds.createdAt,
                updatedAt:     concomitantMeds.updatedAt,
            })
            .from(concomitantMeds)
            .leftJoin(subjects, eq(concomitantMeds.subjectId, subjects.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(concomitantMeds.createdAt));

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/conmeds/:id
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db
            .select()
            .from(concomitantMeds)
            .where(and(eq(concomitantMeds.id, parseInt(req.params.id)), eq(concomitantMeds.studyId, req.studyId)));
        if (!row || !(await subjectInSiteScope(req, row.subjectId))) {
            return res.status(404).json({ error: 'Concomitant medication record not found' });
        }
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/conmeds — create
router.post('/', requireRole('investigator', 'pi', 'admin', 'crc'), async (req, res) => {
    try {
        const {
            subjectId, drugName, whoDrugName, whoDrugCode, atcCode,
            indication, dose, doseUnit, frequency, route,
            startDate, stopDate, isOngoing, notes,
        } = req.body;

        if (!subjectId || !drugName) {
            return res.status(400).json({ error: 'subjectId and drugName are required' });
        }

        const [subject] = await db.select({ studyId: subjects.studyId, siteId: subjects.siteId }).from(subjects)
            .where(eq(subjects.id, parseInt(subjectId)));
        if (!subject || subject.studyId !== req.studyId ||
            (Array.isArray(req.siteScope) && !req.siteScope.includes(subject.siteId))) {
            return res.status(404).json({ error: 'Subject not found in the active study' });
        }

        const [created] = await db.insert(concomitantMeds).values({
            studyId:      req.studyId,
            subjectId:    parseInt(subjectId),
            drugName,
            whoDrugName:  whoDrugName  ?? null,
            whoDrugCode:  whoDrugCode  ?? null,
            atcCode:      atcCode      ?? null,
            indication:   indication   ?? null,
            dose:         dose         ?? null,
            doseUnit:     doseUnit     ?? null,
            frequency:    frequency    ?? null,
            route:        route        ?? null,
            startDate:    startDate    ?? null,
            stopDate:     stopDate     ?? null,
            isOngoing:    isOngoing !== undefined ? Boolean(isOngoing) : true,
            notes:        notes        ?? null,
            createdBy:    req.user.id,
            createdByName: req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'concomitant_meds', recordId: created.id, action: 'INSERT',
            newValue: `${drugName} | Ongoing: ${created.isOngoing}`,
            reason: 'Concomitant medication recorded',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/conmeds/:id — update with reason
router.patch('/:id', requireRole('investigator', 'pi', 'admin', 'crc'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason, ...fields } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for edits (ICH GCP)' });

        const [existing] = await db.select().from(concomitantMeds)
            .where(and(eq(concomitantMeds.id, id), eq(concomitantMeds.studyId, req.studyId)));
        if (!existing || !(await subjectInSiteScope(req, existing.subjectId))) {
            return res.status(404).json({ error: 'Concomitant medication record not found' });
        }

        const updates = {
            drugName:     fields.drugName    ?? existing.drugName,
            whoDrugName:  fields.whoDrugName ?? existing.whoDrugName,
            whoDrugCode:  fields.whoDrugCode ?? existing.whoDrugCode,
            atcCode:      fields.atcCode     ?? existing.atcCode,
            indication:   fields.indication  ?? existing.indication,
            dose:         fields.dose        ?? existing.dose,
            doseUnit:     fields.doseUnit    ?? existing.doseUnit,
            frequency:    fields.frequency   ?? existing.frequency,
            route:        fields.route       ?? existing.route,
            startDate:    fields.startDate   ?? existing.startDate,
            stopDate:     fields.stopDate    ?? existing.stopDate,
            isOngoing:    fields.isOngoing !== undefined
                              ? Boolean(fields.isOngoing)
                              : existing.isOngoing,
            notes:        fields.notes       ?? existing.notes,
            updatedBy:    req.user.id,
            updatedAt:    new Date(),
        };

        const [updated] = await db.update(concomitantMeds)
            .set(updates)
            .where(eq(concomitantMeds.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'concomitant_meds', recordId: id, action: 'UPDATE',
            fieldName: 'multiple', oldValue: existing.drugName, newValue: updated.drugName,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/conmeds/:id — delete with audit
router.delete('/:id', requireRole('pi', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for deletion (ICH GCP)' });

        const [existing] = await db.select().from(concomitantMeds)
            .where(and(eq(concomitantMeds.id, id), eq(concomitantMeds.studyId, req.studyId)));
        if (!existing || !(await subjectInSiteScope(req, existing.subjectId))) {
            return res.status(404).json({ error: 'Concomitant medication record not found' });
        }

        await db.delete(concomitantMeds).where(eq(concomitantMeds.id, id));

        await writeAudit(db, {
            tableName: 'concomitant_meds', recordId: id, action: 'DELETE',
            oldValue: `${existing.drugName} | Subject: ${existing.subjectId}`,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ success: true, deleted: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
