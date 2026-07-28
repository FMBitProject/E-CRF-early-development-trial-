import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { informedConsents, subjects, delegationLog } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { siteCondition, subjectInSiteScope } from '../lib/sitescope.js';
import { checkConsentDelegation, autoCreateLateConsentDeviation, eligibleConsentTakers } from '../lib/consentcheck.js';

const router = Router();

// GET /api/consents?subjectId= — list consent records for a subject
router.get('/', async (req, res) => {
    try {
        const { subjectId } = req.query;
        const conditions = [eq(informedConsents.studyId, req.studyId)];
        if (subjectId) conditions.push(eq(informedConsents.subjectId, parseInt(subjectId)));
        const siteCond = siteCondition(req);
        if (siteCond) conditions.push(siteCond);

        const rows = await db
            .select({
                id:              informedConsents.id,
                subjectId:       informedConsents.subjectId,
                subjectCode:     subjects.subjectCode,
                consentVersion:  informedConsents.consentVersion,
                consentDate:     informedConsents.consentDate,
                consentTime:     informedConsents.consentTime,
                consentType:     informedConsents.consentType,
                language:        informedConsents.language,
                obtainedBy:      informedConsents.obtainedBy,
                obtainedByName:  informedConsents.obtainedByName,
                witnessName:     informedConsents.witnessName,
                witnessType:     informedConsents.witnessType,
                assentObtained:  informedConsents.assentObtained,
                assentDate:      informedConsents.assentDate,
                copyProvided:    informedConsents.copyProvided,
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

// GET /api/consents/delegates — staff delegated for the consent process.
// Drives the "Obtained By" dropdown so the form cannot offer an undelegated person.
router.get('/delegates', async (req, res) => {
    try {
        const rows = await db.select({
            userId:   delegationLog.userId,
            userName: delegationLog.userName,
            userRole: delegationLog.userRole,
            siteId:   delegationLog.siteId,
            tasks:    delegationLog.delegatedTasks,
            status:   delegationLog.status,
            start:    delegationLog.delegationStart,
            end:      delegationLog.delegationEnd,
        }).from(delegationLog).where(eq(delegationLog.studyId, req.studyId));

        const today = new Date().toISOString().split('T')[0];
        const eligible = eligibleConsentTakers(rows, today);

        // delegationLogEmpty lets the UI fall back to free entry instead of
        // dead-ending a study that has not built its delegation log yet.
        res.json({
            delegationLogEmpty: rows.length === 0,
            delegates: eligible.map(r => ({
                userId: r.userId, userName: r.userName, userRole: r.userRole,
                siteId: r.siteId, delegationStart: r.start, delegationEnd: r.end,
            })),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/consents — record consent (investigator, pi, admin, crc)
router.post('/', requireRole('investigator', 'pi', 'admin', 'crc'), async (req, res) => {
    try {
        const {
            subjectId, consentVersion, consentDate, consentTime,
            consentType, language, obtainedBy, obtainedByName,
            witnessName, witnessType, assentObtained, assentDate,
            copyProvided, notes, amendmentId,
        } = req.body;

        if (!subjectId || !consentVersion || !consentDate) {
            return res.status(400).json({ error: 'subjectId, consentVersion, and consentDate are required' });
        }
        if (consentTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(consentTime)) {
            return res.status(400).json({ error: 'consentTime must be in HH:MM (24-hour) format' });
        }

        const [subject] = await db.select({ siteId: subjects.siteId }).from(subjects)
            .where(and(eq(subjects.id, parseInt(subjectId)), eq(subjects.studyId, req.studyId)));
        if (!subject) return res.status(404).json({ error: 'Subject not found in the active study' });
        if (Array.isArray(req.siteScope) && !req.siteScope.includes(subject.siteId)) {
            return res.status(404).json({ error: 'Subject not found in the active study' });
        }

        const allowedTypes = ['Initial', 'Re-consent', 'Withdrawal'];
        const type = allowedTypes.includes(consentType) ? consentType : 'Initial';

        const allowedWitnessTypes = [
            'Impartial Witness (Illiterate Subject)',
            'Legally Authorized Representative',
            'Parent / Guardian',
        ];
        if (witnessType && !allowedWitnessTypes.includes(witnessType)) {
            return res.status(400).json({ error: `witnessType must be one of: ${allowedWitnessTypes.join(', ')}` });
        }

        // Withdrawal type automatically marks the consent record as withdrawn
        const isWithdrawn = type === 'Withdrawal';

        // ICH GCP E6(R3) §4.1.5 — only a delegated person may take consent.
        const warnings = [];
        if (obtainedBy) {
            const delegation = await checkConsentDelegation(req.studyId, obtainedBy, consentDate);
            if (!delegation.ok) return res.status(400).json({ error: delegation.error });
            if (delegation.warning) warnings.push(delegation.warning);
        } else if (type !== 'Withdrawal') {
            warnings.push('No consent taker recorded — ICH GCP E6(R3) §4.8 expects the person who conducted the consent discussion to be documented.');
        }

        const [created] = await db.insert(informedConsents).values({
            studyId:        req.studyId,
            subjectId:      parseInt(subjectId),
            consentVersion,
            consentDate,
            consentTime:    consentTime ?? null,
            consentType:    type,
            language:       language    ?? 'Indonesian',
            obtainedBy:     obtainedBy     ?? null,
            obtainedByName: obtainedByName ?? null,
            witnessName:    witnessName ?? null,
            witnessType:    witnessType ?? null,
            assentObtained: !!assentObtained,
            assentDate:     assentObtained ? (assentDate ?? null) : null,
            copyProvided:   !!copyProvided,
            notes:          notes       ?? null,
            amendmentId:    amendmentId ? parseInt(amendmentId) : null,
            isWithdrawn,
            withdrawnAt:    isWithdrawn ? new Date() : null,
            createdBy:      req.user.id,
            createdByName:  req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'informed_consents', recordId: created.id, action: 'INSERT',
            newValue: `Type: ${type} | Version: ${consentVersion} | Date: ${consentDate}${consentTime ? ' ' + consentTime : ''}`
                + `${obtainedByName ? ' | Obtained by: ' + obtainedByName : ''}`,
            reason: `Informed consent recorded (UU PDP / ICH GCP) — ${type}`,
            user: req.user, ipAddress: req.ip,
        });

        // ICH GCP E6(R3) §4.8.8 — consent must precede any study procedure.
        let autoDeviation = null;
        if (type === 'Initial') {
            autoDeviation = await autoCreateLateConsentDeviation(
                req.studyId, parseInt(subjectId), consentDate, req.user,
            );
        }

        res.status(201).json({ ...created, warnings, autoDeviation });
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
            .where(and(eq(informedConsents.id, id), eq(informedConsents.studyId, req.studyId)));
        if (!existing || !(await subjectInSiteScope(req, existing.subjectId))) {
            return res.status(404).json({ error: 'Consent record not found' });
        }
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
