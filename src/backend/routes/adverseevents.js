import { Router } from 'express';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { adverseEvents, subjects } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// Expedited reporting deadline: 7 days for fatal/life-threatening SAE, 15 days for all other SAE
function calcExpeditedDeadline(isSerious, seriousCriteria) {
    if (!isSerious) return null;
    const urgent = (seriousCriteria || []).some(c =>
        ['death', 'life_threatening'].includes(c)
    );
    const days = urgent ? 7 : 15;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
}

// GET /api/ae — list AEs, optional ?subjectId=&serious=&status=
router.get('/', async (req, res) => {
    try {
        const { subjectId, serious, status } = req.query;
        const conditions = [];
        if (subjectId) conditions.push(eq(adverseEvents.subjectId, parseInt(subjectId)));
        if (serious === 'true') conditions.push(eq(adverseEvents.isSerious, true));
        if (status) conditions.push(eq(adverseEvents.reportStatus, status));
        // Site-scoped for investigator/crc
        if (['investigator', 'crc'].includes(req.user.role) && req.user.siteId) {
            const siteSubjects = await db
                .select({ id: subjects.id })
                .from(subjects)
                .where(eq(subjects.siteId, req.user.siteId));
            const ids = siteSubjects.map(s => s.id);
            if (ids.length === 0) return res.json([]);
            // Filter by subject IDs in the user's site
            conditions.push(
                ids.length === 1
                    ? eq(adverseEvents.subjectId, ids[0])
                    : inArray(adverseEvents.subjectId, ids)
            );
        }
        const rows = await db
            .select({
                id:                      adverseEvents.id,
                subjectId:               adverseEvents.subjectId,
                subjectCode:             subjects.subjectCode,
                aeTerm:                  adverseEvents.aeTerm,
                meddraPt:                adverseEvents.meddraPt,
                meddraSoc:               adverseEvents.meddraSoc,
                onsetDate:               adverseEvents.onsetDate,
                resolutionDate:          adverseEvents.resolutionDate,
                outcome:                 adverseEvents.outcome,
                severity:                adverseEvents.severity,
                isSerious:               adverseEvents.isSerious,
                seriousCriteria:         adverseEvents.seriousCriteria,
                causality:               adverseEvents.causality,
                actionTaken:             adverseEvents.actionTaken,
                narrative:               adverseEvents.narrative,
                reportStatus:            adverseEvents.reportStatus,
                reportedToSponsorAt:     adverseEvents.reportedToSponsorAt,
                reportedToIrbAt:         adverseEvents.reportedToIrbAt,
                requiresExpeditedReport: adverseEvents.requiresExpeditedReport,
                expeditedDeadline:       adverseEvents.expeditedDeadline,
                createdByName:           adverseEvents.createdByName,
                createdAt:               adverseEvents.createdAt,
                updatedAt:               adverseEvents.updatedAt,
            })
            .from(adverseEvents)
            .leftJoin(subjects, eq(adverseEvents.subjectId, subjects.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(adverseEvents.createdAt));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/ae/stats — summary counts for dashboard
router.get('/stats', async (req, res) => {
    try {
        const all = await db.select({
            isSerious:    adverseEvents.isSerious,
            reportStatus: adverseEvents.reportStatus,
            requiresExpeditedReport: adverseEvents.requiresExpeditedReport,
            expeditedDeadline: adverseEvents.expeditedDeadline,
        }).from(adverseEvents);

        const now = new Date();
        res.json({
            total:           all.length,
            serious:         all.filter(a => a.isSerious).length,
            draft:           all.filter(a => a.reportStatus === 'Draft').length,
            overdue:         all.filter(a =>
                a.requiresExpeditedReport &&
                a.reportStatus !== 'Closed' &&
                a.expeditedDeadline &&
                new Date(a.expeditedDeadline) < now
            ).length,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/ae/:id — single AE detail
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db
            .select()
            .from(adverseEvents)
            .where(eq(adverseEvents.id, parseInt(req.params.id)));
        if (!row) return res.status(404).json({ error: 'Adverse event not found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/ae — create new AE (investigator, admin)
router.post('/', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const {
            subjectId, aeTerm, meddraPt, meddraSoc,
            onsetDate, resolutionDate, outcome,
            severity, isSerious, seriousCriteria,
            causality, actionTaken, narrative,
        } = req.body;

        if (!subjectId || !aeTerm || !severity) {
            return res.status(400).json({ error: 'subjectId, aeTerm, and severity are required' });
        }

        const serious = Boolean(isSerious);
        const criteria = Array.isArray(seriousCriteria) ? seriousCriteria : [];
        const requiresExpedited = serious;
        const deadline = calcExpeditedDeadline(serious, criteria);

        const [created] = await db.insert(adverseEvents).values({
            subjectId:               parseInt(subjectId),
            aeTerm,
            meddraPt:                meddraPt ?? null,
            meddraSoc:               meddraSoc ?? null,
            onsetDate:               onsetDate ?? null,
            resolutionDate:          resolutionDate ?? null,
            outcome:                 outcome ?? null,
            severity,
            isSerious:               serious,
            seriousCriteria:         criteria,
            causality:               causality ?? null,
            actionTaken:             actionTaken ?? null,
            narrative:               narrative ?? null,
            reportStatus:            'Draft',
            requiresExpeditedReport: requiresExpedited,
            expeditedDeadline:       deadline,
            createdBy:               req.user.id,
            createdByName:           req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'adverse_events', recordId: created.id, action: 'INSERT',
            newValue: `${aeTerm} | Serious: ${serious} | Severity: ${severity}`,
            reason: 'Adverse event recorded',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/ae/:id — update AE with reason for change (ICH GCP)
router.patch('/:id', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason, ...fields } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for edits (ICH GCP)' });

        const [existing] = await db.select().from(adverseEvents).where(eq(adverseEvents.id, id));
        if (!existing) return res.status(404).json({ error: 'Adverse event not found' });
        if (existing.reportStatus === 'Closed') {
            return res.status(409).json({ error: 'Cannot edit a closed adverse event' });
        }

        const serious = fields.isSerious !== undefined ? Boolean(fields.isSerious) : existing.isSerious;
        const criteria = Array.isArray(fields.seriousCriteria) ? fields.seriousCriteria : existing.seriousCriteria;
        const requiresExpedited = serious;
        const deadline = calcExpeditedDeadline(serious, criteria);

        const updates = {
            aeTerm:                  fields.aeTerm          ?? existing.aeTerm,
            meddraPt:                fields.meddraPt        ?? existing.meddraPt,
            meddraSoc:               fields.meddraSoc       ?? existing.meddraSoc,
            onsetDate:               fields.onsetDate       ?? existing.onsetDate,
            resolutionDate:          fields.resolutionDate  ?? existing.resolutionDate,
            outcome:                 fields.outcome         ?? existing.outcome,
            severity:                fields.severity        ?? existing.severity,
            isSerious:               serious,
            seriousCriteria:         criteria,
            causality:               fields.causality       ?? existing.causality,
            actionTaken:             fields.actionTaken     ?? existing.actionTaken,
            narrative:               fields.narrative       ?? existing.narrative,
            requiresExpeditedReport: requiresExpedited,
            expeditedDeadline:       deadline,
            updatedBy:               req.user.id,
            updatedAt:               new Date(),
        };

        const [updated] = await db.update(adverseEvents)
            .set(updates)
            .where(eq(adverseEvents.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'adverse_events', recordId: id, action: 'UPDATE',
            fieldName: 'multiple', oldValue: existing.aeTerm, newValue: updated.aeTerm,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/ae/:id/report — mark as reported to sponsor/IRB
router.patch('/:id/report', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reportedToSponsor, reportedToIrb } = req.body;

        const [existing] = await db.select().from(adverseEvents).where(eq(adverseEvents.id, id));
        if (!existing) return res.status(404).json({ error: 'Adverse event not found' });

        const now = new Date();
        const updates = { updatedBy: req.user.id, updatedAt: now };
        if (reportedToSponsor) updates.reportedToSponsorAt = now;
        if (reportedToIrb)    updates.reportedToIrbAt = now;

        const allReported = (reportedToSponsor || existing.reportedToSponsorAt) &&
                            (reportedToIrb    || existing.reportedToIrbAt);
        if (allReported) updates.reportStatus = 'Reported';

        const [updated] = await db.update(adverseEvents)
            .set(updates)
            .where(eq(adverseEvents.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'adverse_events', recordId: id, action: 'UPDATE',
            fieldName: 'report_status', oldValue: existing.reportStatus, newValue: updated.reportStatus,
            reason: `Expedited report submitted — sponsor: ${!!reportedToSponsor}, IRB: ${!!reportedToIrb}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/ae/:id/close — close AE (CRA, admin)
router.patch('/:id/close', requireRole('cra', 'pi', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [updated] = await db.update(adverseEvents)
            .set({ reportStatus: 'Closed', updatedBy: req.user.id, updatedAt: new Date() })
            .where(eq(adverseEvents.id, id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Adverse event not found' });

        await writeAudit(db, {
            tableName: 'adverse_events', recordId: id, action: 'UPDATE',
            fieldName: 'report_status', oldValue: 'Reported', newValue: 'Closed',
            reason: 'AE closed by CRA/Admin',
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
