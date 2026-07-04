import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { vitalSigns, subjects, visits } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// Auto-calculate BMI: weight (kg) / (height (cm) / 100)^2
function calcBmi(weight, weightUnit, height, heightUnit) {
    if (!weight || !height) return null;
    let wKg = parseFloat(weight);
    let hCm = parseFloat(height);
    if (isNaN(wKg) || isNaN(hCm) || hCm <= 0) return null;
    if (weightUnit && weightUnit.toLowerCase() === 'lb') wKg = wKg * 0.453592;
    if (heightUnit && heightUnit.toLowerCase() === 'in') hCm = hCm * 2.54;
    const hM = hCm / 100;
    return (wKg / (hM * hM)).toFixed(2);
}

// GET /api/vitalsigns — list by study, optional ?subjectId=&visitId=
router.get('/', async (req, res) => {
    try {
        const { subjectId, visitId } = req.query;
        const conditions = [eq(vitalSigns.studyId, req.studyId)];
        if (subjectId) conditions.push(eq(vitalSigns.subjectId, parseInt(subjectId)));
        if (visitId)   conditions.push(eq(vitalSigns.visitId, parseInt(visitId)));

        const rows = await db
            .select({
                id:               vitalSigns.id,
                subjectId:        vitalSigns.subjectId,
                subjectCode:      subjects.subjectCode,
                visitId:          vitalSigns.visitId,
                visitName:        visits.visitName,
                assessmentDate:   vitalSigns.assessmentDate,
                assessmentTime:   vitalSigns.assessmentTime,
                position:         vitalSigns.position,
                systolicBp:       vitalSigns.systolicBp,
                diastolicBp:      vitalSigns.diastolicBp,
                heartRate:        vitalSigns.heartRate,
                respiratoryRate:  vitalSigns.respiratoryRate,
                temperature:      vitalSigns.temperature,
                temperatureUnit:  vitalSigns.temperatureUnit,
                weight:           vitalSigns.weight,
                weightUnit:       vitalSigns.weightUnit,
                height:           vitalSigns.height,
                heightUnit:       vitalSigns.heightUnit,
                bmi:              vitalSigns.bmi,
                oxygenSaturation: vitalSigns.oxygenSaturation,
                notes:            vitalSigns.notes,
                createdByName:    vitalSigns.createdByName,
                createdAt:        vitalSigns.createdAt,
                updatedAt:        vitalSigns.updatedAt,
            })
            .from(vitalSigns)
            .leftJoin(subjects, eq(vitalSigns.subjectId, subjects.id))
            .leftJoin(visits, eq(vitalSigns.visitId, visits.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(vitalSigns.createdAt));

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/vitalsigns/:id
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db
            .select()
            .from(vitalSigns)
            .where(and(eq(vitalSigns.id, parseInt(req.params.id)), eq(vitalSigns.studyId, req.studyId)));
        if (!row) return res.status(404).json({ error: 'Vital signs record not found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/vitalsigns — create, auto-calculate BMI if not provided
router.post('/', requireRole('investigator', 'pi', 'admin', 'crc'), async (req, res) => {
    try {
        const {
            subjectId, visitId, assessmentDate, assessmentTime,
            position, systolicBp, diastolicBp, heartRate, respiratoryRate,
            temperature, temperatureUnit, weight, weightUnit,
            height, heightUnit, bmi, oxygenSaturation, notes,
        } = req.body;

        if (!subjectId || !assessmentDate) {
            return res.status(400).json({ error: 'subjectId and assessmentDate are required' });
        }

        const [subject] = await db.select({ studyId: subjects.studyId }).from(subjects)
            .where(eq(subjects.id, parseInt(subjectId)));
        if (!subject || subject.studyId !== req.studyId) {
            return res.status(404).json({ error: 'Subject not found in the active study' });
        }

        const computedBmi = bmi ?? calcBmi(weight, weightUnit ?? 'kg', height, heightUnit ?? 'cm');

        const [created] = await db.insert(vitalSigns).values({
            studyId:          req.studyId,
            subjectId:        parseInt(subjectId),
            visitId:          visitId          ? parseInt(visitId) : null,
            assessmentDate,
            assessmentTime:   assessmentTime   ?? null,
            position:         position         ?? 'Sitting',
            systolicBp:       systolicBp       !== undefined ? parseInt(systolicBp)       : null,
            diastolicBp:      diastolicBp      !== undefined ? parseInt(diastolicBp)      : null,
            heartRate:        heartRate        !== undefined ? parseInt(heartRate)        : null,
            respiratoryRate:  respiratoryRate  !== undefined ? parseInt(respiratoryRate)  : null,
            temperature:      temperature      ?? null,
            temperatureUnit:  temperatureUnit  ?? 'C',
            weight:           weight           ?? null,
            weightUnit:       weightUnit       ?? 'kg',
            height:           height           ?? null,
            heightUnit:       heightUnit       ?? 'cm',
            bmi:              computedBmi      !== null ? String(computedBmi) : null,
            oxygenSaturation: oxygenSaturation ?? null,
            notes:            notes            ?? null,
            createdBy:        req.user.id,
            createdByName:    req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'vital_signs', recordId: created.id, action: 'INSERT',
            newValue: `Subject: ${subjectId} | Date: ${assessmentDate}`,
            reason: 'Vital signs recorded',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/vitalsigns/:id — update with reason
router.patch('/:id', requireRole('investigator', 'pi', 'admin', 'crc'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason, ...fields } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for edits (ICH GCP)' });

        const [existing] = await db.select().from(vitalSigns)
            .where(and(eq(vitalSigns.id, id), eq(vitalSigns.studyId, req.studyId)));
        if (!existing) return res.status(404).json({ error: 'Vital signs record not found' });

        const newWeight      = fields.weight      ?? existing.weight;
        const newWeightUnit  = fields.weightUnit  ?? existing.weightUnit;
        const newHeight      = fields.height      ?? existing.height;
        const newHeightUnit  = fields.heightUnit  ?? existing.heightUnit;
        const newBmi = fields.bmi !== undefined
            ? fields.bmi
            : calcBmi(newWeight, newWeightUnit, newHeight, newHeightUnit) ?? existing.bmi;

        const updates = {
            assessmentDate:   fields.assessmentDate  ?? existing.assessmentDate,
            assessmentTime:   fields.assessmentTime  ?? existing.assessmentTime,
            position:         fields.position        ?? existing.position,
            systolicBp:       fields.systolicBp      !== undefined ? parseInt(fields.systolicBp)      : existing.systolicBp,
            diastolicBp:      fields.diastolicBp     !== undefined ? parseInt(fields.diastolicBp)     : existing.diastolicBp,
            heartRate:        fields.heartRate       !== undefined ? parseInt(fields.heartRate)       : existing.heartRate,
            respiratoryRate:  fields.respiratoryRate !== undefined ? parseInt(fields.respiratoryRate) : existing.respiratoryRate,
            temperature:      fields.temperature     ?? existing.temperature,
            temperatureUnit:  fields.temperatureUnit ?? existing.temperatureUnit,
            weight:           newWeight,
            weightUnit:       newWeightUnit,
            height:           newHeight,
            heightUnit:       newHeightUnit,
            bmi:              newBmi !== null ? String(newBmi) : existing.bmi,
            oxygenSaturation: fields.oxygenSaturation ?? existing.oxygenSaturation,
            notes:            fields.notes            ?? existing.notes,
            updatedBy:        req.user.id,
            updatedAt:        new Date(),
        };

        const [updated] = await db.update(vitalSigns)
            .set(updates)
            .where(eq(vitalSigns.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'vital_signs', recordId: id, action: 'UPDATE',
            fieldName: 'multiple', oldValue: existing.assessmentDate, newValue: updated.assessmentDate,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/vitalsigns/:id — delete with audit
router.delete('/:id', requireRole('pi', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for deletion (ICH GCP)' });

        const [existing] = await db.select().from(vitalSigns)
            .where(and(eq(vitalSigns.id, id), eq(vitalSigns.studyId, req.studyId)));
        if (!existing) return res.status(404).json({ error: 'Vital signs record not found' });

        await db.delete(vitalSigns).where(eq(vitalSigns.id, id));

        await writeAudit(db, {
            tableName: 'vital_signs', recordId: id, action: 'DELETE',
            oldValue: `Subject: ${existing.subjectId} | Date: ${existing.assessmentDate}`,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ success: true, deleted: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
