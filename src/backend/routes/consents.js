import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { informedConsents, subjects } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// GET /api/consents?subjectId= — list consent records for a subject
router.get('/', async (req, res) => {
    try {
        const { subjectId } = req.query;
        const conditions = [eq(informedConsents.studyId, req.studyId)];
        if (subjectId) conditions.push(eq(informedConsents.subjectId, parseInt(subjectId)));

        const rows = await db
            .select({
                id:              informedConsents.id,
                subjectId:       informedConsents.subjectId,
                subjectCode:     subjects.subjectCode,
                consentVersion:  informedConsents.consentVersion,
                consentDate:     informedConsents.consentDate,
                consentType:     informedConsents.consentType,
                language:        informedConsents.language,
                witnessName:     informedConsents.witnessName,
                notes:           informedConsents.notes,
                isWithdrawn:     informedConsents.isWithdrawn,
                withdrawnAt:     informedConsents.withdrawnAt,
                withdrawnReason: informedConsents.withdrawnReason,
                createdByName:   informedConsents.createdByName,
                createdAt:       informedConsents.createdAt,
            })
            .from(informedConsents)
            .leftJoin(subjects, eq(informedConsents.subjectId, subjects.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(informedConsents.createdAt));

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/consents/stats — consent coverage for dashboard
router.get('/stats', async (req, res) => {
    try {
        const allSubjects = await db.select({ id: subjects.id }).from(subjects)
            .where(and(eq(subjects.studyId, req.studyId), eq(subjects.status, 'Active')));
        const consented = await db.select({ subjectId: informedConsents.subjectId }).from(informedConsents)
            .where(and(eq(informedConsents.studyId, req.studyId), eq(informedConsents.isWithdrawn, false)));
        const consentedIds = new Set(consented.map(c => c.subjectId));
        const unconsented = allSubjects.filter(s => !consentedIds.has(s.id)).length;

        res.json({
            totalActive:  allSubjects.length,
            consented:    consentedIds.size,
            unconsented,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/consents — record consent (investigator, admin)
router.post('/', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const {
            subjectId, consentVersion, consentDate,
            consentType, language, witnessName, notes,
        } = req.body;

        if (!subjectId || !consentVersion || !consentDate) {
            return res.status(400).json({ error: 'subjectId, consentVersion, and consentDate are required' });
        }

        const allowedTypes = ['Initial', 'Re-consent', 'Withdrawal'];
        const type = allowedTypes.includes(consentType) ? consentType : 'Initial';

        // Withdrawal type automatically marks the consent record as withdrawn
        const isWithdrawn = type === 'Withdrawal';

        const [created] = await db.insert(informedConsents).values({
            studyId:        req.studyId,
            subjectId:      parseInt(subjectId),
            consentVersion,
            consentDate,
            consentType:    type,
            language:       language    ?? 'Indonesian',
            witnessName:    witnessName ?? null,
            notes:          notes       ?? null,
            isWithdrawn,
            withdrawnAt:    isWithdrawn ? new Date() : null,
            createdBy:      req.user.id,
            createdByName:  req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'informed_consents', recordId: created.id, action: 'INSERT',
            newValue: `Type: ${type} | Version: ${consentVersion} | Date: ${consentDate}`,
            reason: `Informed consent recorded (UU PDP / ICH GCP) — ${type}`,
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/consents/:id/withdraw — record consent withdrawal
router.patch('/:id/withdraw', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for withdrawal' });

        const [existing] = await db.select().from(informedConsents)
            .where(eq(informedConsents.id, id));
        if (!existing) return res.status(404).json({ error: 'Consent record not found' });
        if (existing.isWithdrawn) {
            return res.status(409).json({ error: 'Consent already withdrawn' });
        }

        const [updated] = await db.update(informedConsents)
            .set({ isWithdrawn: true, withdrawnAt: new Date(), withdrawnReason: reason })
            .where(eq(informedConsents.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'informed_consents', recordId: id, action: 'UPDATE',
            fieldName: 'is_withdrawn', oldValue: 'false', newValue: 'true',
            reason: `Consent withdrawal recorded: ${reason}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
