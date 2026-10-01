import { siteCondition } from '../lib/sitescope.js';
import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { randomizationList, subjectRandomization, subjects } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { isUniqueViolation } from '../lib/dberrors.js';
import {
    BLINDED_LABEL, maskTreatmentArms, validateRandList, normalizeRandList,
    canRandomize, canUnblind, noSlotError, randomizationStats,
} from '../lib/randomrules.js';

const router = Router();

// GET /api/randomization/list — view the randomization list (admin only, shows arms)
router.get('/list', requireRole('admin'), async (req, res) => {
    try {
        const rows = await db.select().from(randomizationList)
            .where(eq(randomizationList.studyId, req.studyId))
            .orderBy(randomizationList.id);
        res.json(rows);
    } catch (err) {
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// POST /api/randomization/list — upload randomization list (admin only)
// Body: { entries: [{ randCode, treatmentArm, stratum }] }
router.post('/list', requireRole('admin'), async (req, res) => {
    try {
        const { entries } = req.body;
        const guard = validateRandList(entries);
        if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

        const values = normalizeRandList(entries).map(e => ({
            ...e,
            studyId:    req.studyId,
            uploadedBy: req.user.id,
        }));

        const inserted = await db.transaction(async tx => {
            const rows = await tx.insert(randomizationList).values(values).returning();
            await writeAudit(tx, {
                tableName: 'randomization_list', recordId: 0, action: 'INSERT',
                newValue: `${rows.length} codes uploaded`,
                reason: 'Randomization list uploaded by admin',
                user: req.user, ipAddress: req.ip,
            });
            return rows;
        });

        res.status(201).json({ uploaded: inserted.length, total: entries.length });
    } catch (err) {
        if (isUniqueViolation(err)) {
            return res.status(409).json({ error: 'One or more randomization codes already exist in this study.' });
        }
        // TODO: Return a generic server error with a support reference instead of exposing raw database errors.
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// GET /api/randomization — get assignment for ?subjectId= or all assignments
router.get('/', async (req, res) => {
    try {
        const { subjectId } = req.query;
        const conditions = [eq(subjects.studyId, req.studyId), siteCondition(req)];
        if (subjectId) {
            const sid = Number(subjectId);
            if (!Number.isSafeInteger(sid) || sid <= 0) {
                return res.status(400).json({ error: 'Invalid subjectId' });
            }
            conditions.push(eq(subjectRandomization.subjectId, sid));
        }

        const rows = await db
            .select({
                id:               subjectRandomization.id,
                subjectId:        subjectRandomization.subjectId,
                subjectCode:      subjects.subjectCode,
                randCode:         subjectRandomization.randCode,
                treatmentArm:     subjectRandomization.treatmentArm,
                stratum:          subjectRandomization.stratum,
                isBlinded:        subjectRandomization.isBlinded,
                unblindedAt:      subjectRandomization.unblindedAt,
                unblindReason:    subjectRandomization.unblindReason,
                randomizedAt:     subjectRandomization.randomizedAt,
                randomizedByName: subjectRandomization.randomizedByName,
            })
            .from(subjectRandomization)
            .leftJoin(subjects, eq(subjectRandomization.subjectId, subjects.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(subjectRandomization.randomizedAt);

        // Blind treatment arm for non-admin users
        res.json(maskTreatmentArms(rows, req.user.role));
    } catch (err) {
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// POST /api/randomization — assign next available slot to a subject (admin, investigator)
router.post('/', requireRole('admin', 'investigator', 'pi'), async (req, res) => {
    try {
        const { subjectId, stratum } = req.body;
        if (!subjectId) return res.status(400).json({ error: 'subjectId is required' });

        const sid = Number(subjectId);
        if (!Number.isSafeInteger(sid) || sid <= 0) {
            return res.status(400).json({ error: 'Invalid subjectId' });
        }

        const assignment = await db.transaction(async tx => {
            // Check subject exists in this study, is at the caller's site, and is Active
            const [subject] = await tx.select().from(subjects)
                .where(and(eq(subjects.id, sid), eq(subjects.studyId, req.studyId)))
                .for('update');
            const [existing] = await tx.select().from(subjectRandomization)
                .where(eq(subjectRandomization.subjectId, sid));

            const guard = canRandomize({ subject, existingAssignment: existing, siteScope: req.siteScope });
            if (!guard.ok) throw Object.assign(new Error(guard.error), { status: guard.status });

            // Find next available slot (matching stratum if provided, scoped to study)
            const listConditions = [eq(randomizationList.isUsed, false), eq(randomizationList.studyId, req.studyId)];
            if (stratum) listConditions.push(eq(randomizationList.stratum, stratum));

            const [slot] = await tx.select().from(randomizationList)
                .where(and(...listConditions))
                .orderBy(randomizationList.id)
                .limit(1).for('update', { skipLocked: true });

            if (!slot) throw Object.assign(new Error(noSlotError(stratum)), { status: 409 });

            // Mark slot as used
            await tx.update(randomizationList)
                .set({ isUsed: true })
                .where(eq(randomizationList.id, slot.id));

            // Create assignment
            const [assignment] = await tx.insert(subjectRandomization).values({
                subjectId:        sid,
                randCode:         slot.randCode,
                treatmentArm:     slot.treatmentArm,
                stratum:          slot.stratum ?? null,
                isBlinded:        true,
                randomizedBy:     req.user.id,
                randomizedByName: req.user.name,
            }).returning();

            await writeAudit(tx, {
                tableName: 'subject_randomization', recordId: assignment.id, action: 'INSERT',
                newValue: `Subject ${subject.subjectCode} → Code ${slot.randCode}`,
                reason: 'Subject randomized',
                user: req.user, ipAddress: req.ip,
            });

            return assignment;
        });

        res.status(201).json({
            ...assignment,
            treatmentArm: BLINDED_LABEL, // always blind at creation
        });
    } catch (err) {
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// PATCH /api/randomization/:id/unblind — emergency or final unblinding (admin only)
router.patch('/:id/unblind', requireRole('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'Invalid randomization id' });
        }
        const { reason } = req.body;

        const updated = await db.transaction(async tx => {
            const [locked] = await tx.select({ assignment: subjectRandomization })
                .from(subjectRandomization)
                .innerJoin(subjects, eq(subjectRandomization.subjectId, subjects.id))
                .where(and(
                    eq(subjectRandomization.id, id),
                    eq(subjects.studyId, req.studyId),
                    siteCondition(req),
                ))
                .for('update');

            const guard = canUnblind(locked?.assignment, { reason });
            if (!guard.ok) throw Object.assign(new Error(guard.error), { status: guard.status });

            const [row] = await tx.update(subjectRandomization)
                .set({ isBlinded: false, unblindedAt: new Date(), unblindedBy: req.user.id, unblindReason: reason })
                .where(and(eq(subjectRandomization.id, id), eq(subjectRandomization.isBlinded, true)))
                .returning();
            if (!row) throw Object.assign(new Error('Already unblinded'), { status: 409 });

            await writeAudit(tx, {
                tableName: 'subject_randomization', recordId: id, action: 'UPDATE',
                fieldName: 'is_blinded', oldValue: 'true', newValue: 'false',
                reason: `Unblinding: ${reason}`,
                user: req.user, ipAddress: req.ip,
            });
            return row;
        });

        res.json(updated);
    } catch (err) {
        // TODO: Return a generic server error with a support reference instead of exposing raw database errors.
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// GET /api/randomization/stats
router.get('/stats', async (req, res) => {
    try {
        const allList = await db.select({ isUsed: randomizationList.isUsed }).from(randomizationList)
            .where(eq(randomizationList.studyId, req.studyId));
        const assignments = await db.select({ isBlinded: subjectRandomization.isBlinded })
            .from(subjectRandomization)
            .leftJoin(subjects, eq(subjectRandomization.subjectId, subjects.id))
            .where(and(eq(subjects.studyId, req.studyId), siteCondition(req)));

        res.json(randomizationStats(allList, assignments));
    } catch (err) {
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

export default router;
