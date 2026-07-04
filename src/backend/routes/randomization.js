import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { randomizationList, subjectRandomization, subjects } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// GET /api/randomization/list — view the randomization list (admin only, shows arms)
router.get('/list', requireRole('admin'), async (req, res) => {
    try {
        const rows = await db.select().from(randomizationList)
            .where(eq(randomizationList.studyId, req.studyId))
            .orderBy(randomizationList.id);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/randomization/list — upload randomization list (admin only)
// Body: { entries: [{ randCode, treatmentArm, stratum }] }
router.post('/list', requireRole('admin'), async (req, res) => {
    try {
        const { entries } = req.body;
        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: 'entries array is required' });
        }
        for (const e of entries) {
            if (!e.randCode || !e.treatmentArm) {
                return res.status(400).json({ error: 'Each entry needs randCode and treatmentArm' });
            }
        }

        const values = entries.map(e => ({
            studyId:      req.studyId,
            randCode:     e.randCode.trim().toUpperCase(),
            treatmentArm: e.treatmentArm,
            stratum:      e.stratum ?? null,
            isUsed:       false,
            uploadedBy:   req.user.id,
        }));

        // Upsert — skip already existing codes
        const inserted = [];
        for (const v of values) {
            try {
                const [row] = await db.insert(randomizationList).values(v)
                    .onConflictDoNothing()
                    .returning();
                if (row) inserted.push(row);
            } catch {}
        }

        await writeAudit(db, {
            tableName: 'randomization_list', recordId: 0, action: 'INSERT',
            newValue: `${inserted.length} codes uploaded`,
            reason: `Randomization list uploaded by admin`,
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json({ uploaded: inserted.length, total: entries.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/randomization — get assignment for ?subjectId= or all assignments
router.get('/', async (req, res) => {
    try {
        const { subjectId } = req.query;
        const conditions = [];
        if (subjectId) conditions.push(eq(subjectRandomization.subjectId, parseInt(subjectId)));

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
        const user = req.user;
        const blinded = rows.map(r => ({
            ...r,
            treatmentArm: (!r.isBlinded || user.role === 'admin') ? r.treatmentArm : '*** BLINDED ***',
        }));

        res.json(blinded);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/randomization — assign next available slot to a subject (admin, investigator)
router.post('/', requireRole('admin', 'investigator', 'pi'), async (req, res) => {
    try {
        const { subjectId, stratum } = req.body;
        if (!subjectId) return res.status(400).json({ error: 'subjectId is required' });

        const sid = parseInt(subjectId);

        // Check subject exists in this study, is at the caller's site, and is Active
        const [subject] = await db.select().from(subjects)
            .where(and(eq(subjects.id, sid), eq(subjects.studyId, req.studyId)));
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        if (Array.isArray(req.siteScope) && !req.siteScope.includes(subject.siteId)) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        if (subject.status !== 'Active') {
            return res.status(409).json({ error: 'Only Active subjects can be randomized' });
        }

        // Check not already randomized
        const [existing] = await db.select().from(subjectRandomization)
            .where(eq(subjectRandomization.subjectId, sid));
        if (existing) return res.status(409).json({ error: 'Subject already randomized' });

        // Find next available slot (matching stratum if provided, scoped to study)
        const listConditions = [eq(randomizationList.isUsed, false), eq(randomizationList.studyId, req.studyId)];
        if (stratum) listConditions.push(eq(randomizationList.stratum, stratum));

        const [slot] = await db.select().from(randomizationList)
            .where(and(...listConditions))
            .orderBy(randomizationList.id)
            .limit(1);

        if (!slot) {
            return res.status(409).json({ error: 'No available randomization slots' + (stratum ? ` for stratum "${stratum}"` : '') });
        }

        // Mark slot as used
        await db.update(randomizationList)
            .set({ isUsed: true })
            .where(eq(randomizationList.id, slot.id));

        // Create assignment
        const [assignment] = await db.insert(subjectRandomization).values({
            subjectId:        sid,
            randCode:         slot.randCode,
            treatmentArm:     slot.treatmentArm,
            stratum:          slot.stratum ?? null,
            isBlinded:        true,
            randomizedBy:     req.user.id,
            randomizedByName: req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'subject_randomization', recordId: assignment.id, action: 'INSERT',
            newValue: `Subject ${subject.subjectCode} → Code ${slot.randCode}`,
            reason: 'Subject randomized',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json({
            ...assignment,
            treatmentArm: '*** BLINDED ***', // always blind at creation
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/randomization/:id/unblind — emergency or final unblinding (admin only)
router.patch('/:id/unblind', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for unblinding' });

        const [existing] = await db.select().from(subjectRandomization)
            .where(eq(subjectRandomization.id, id));
        if (!existing) return res.status(404).json({ error: 'Randomization record not found' });
        if (!existing.isBlinded) return res.status(409).json({ error: 'Already unblinded' });

        const [updated] = await db.update(subjectRandomization)
            .set({ isBlinded: false, unblindedAt: new Date(), unblindedBy: req.user.id, unblindReason: reason })
            .where(eq(subjectRandomization.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'subject_randomization', recordId: id, action: 'UPDATE',
            fieldName: 'is_blinded', oldValue: 'true', newValue: 'false',
            reason: `Unblinding: ${reason}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
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
            .where(eq(subjects.studyId, req.studyId));

        res.json({
            totalSlots:     allList.length,
            usedSlots:      allList.filter(l => l.isUsed).length,
            available:      allList.filter(l => !l.isUsed).length,
            randomized:     assignments.length,
            unblinded:      assignments.filter(a => !a.isBlinded).length,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
