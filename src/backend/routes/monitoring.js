// Monitoring Visit Reports & SDV — ICH GCP E6(R3) §5.18
// CRA monitoring visit records with source data verification tracking

import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { monitoringVisits, sdvRecords, subjects, sites } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { checkAndNotifyVisitClean } from '../lib/visitclean.js';

const router = Router();

function isMissingTable(err) {
    const c = err?.cause;
    return err?.code === '42P01' || c?.code === '42P01' ||
           (err?.message || '').includes('does not exist') ||
           (c?.message || '').includes('does not exist');
}

// GET /api/monitoring — list monitoring visits
router.get('/', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const { status, siteId } = req.query;
        const conditions = [eq(monitoringVisits.studyId, req.studyId)];
        if (status) conditions.push(eq(monitoringVisits.status, status));
        if (siteId) conditions.push(eq(monitoringVisits.siteId, parseInt(siteId)));

        const rows = await db.select().from(monitoringVisits)
            .where(and(...conditions))
            .orderBy(desc(monitoringVisits.visitDate));

        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.json([]);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/monitoring/:id — single monitoring visit with SDV records
router.get('/:id', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [visit] = await db.select().from(monitoringVisits)
            .where(eq(monitoringVisits.id, id));
        if (!visit) return res.status(404).json({ error: 'Monitoring visit not found' });

        const sdv = await db.select().from(sdvRecords)
            .where(eq(sdvRecords.monitoringVisitId, id))
            .orderBy(sdvRecords.subjectCode, sdvRecords.visitName);

        res.json({ ...visit, sdvRecords: sdv });
    } catch (err) {
        if (isMissingTable(err)) return res.status(404).json({ error: 'Monitoring visit not found' });
        res.status(500).json({ error: err.message });
    }
});

// POST /api/monitoring — create monitoring visit (cra/admin)
router.post('/', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const {
            visitDate, siteId, visitType, findings,
            actionItems, subjectsReviewed, nextVisitDate, notes,
        } = req.body;

        if (!visitDate || !visitType) {
            return res.status(400).json({ error: 'visitDate and visitType are required' });
        }

        let siteName = null;
        if (siteId) {
            const [site] = await db.select({ name: sites.name }).from(sites)
                .where(eq(sites.id, parseInt(siteId)));
            siteName = site?.name ?? null;
        }

        const [record] = await db.insert(monitoringVisits).values({
            studyId:          req.studyId,
            visitDate,
            siteId:           siteId ? parseInt(siteId) : null,
            siteName,
            visitType,
            craId:            req.user.id,
            craName:          req.user.name,
            findings:         findings ?? null,
            actionItems:      Array.isArray(actionItems) ? actionItems : [],
            subjectsReviewed: Array.isArray(subjectsReviewed) ? subjectsReviewed : [],
            nextVisitDate:    nextVisitDate ?? null,
            notes:            notes ?? null,
            status:           'Draft',
        }).returning();

        await writeAudit(db, {
            tableName: 'monitoring_visits', recordId: record.id, action: 'INSERT',
            newValue: `${visitType} monitoring visit on ${visitDate} by ${req.user.name}`,
            reason: 'Monitoring visit created per ICH GCP E6(R3) §5.18',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/monitoring/:id — update draft visit
router.patch('/:id', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [existing] = await db.select().from(monitoringVisits)
            .where(eq(monitoringVisits.id, id));
        if (!existing) return res.status(404).json({ error: 'Monitoring visit not found' });
        if (existing.status === 'Acknowledged') {
            return res.status(409).json({ error: 'Cannot edit an acknowledged monitoring visit' });
        }

        const { visitDate, visitType, findings, actionItems, subjectsReviewed, nextVisitDate, notes } = req.body;
        const updates = { updatedAt: new Date() };
        if (visitDate         !== undefined) updates.visitDate         = visitDate;
        if (visitType         !== undefined) updates.visitType         = visitType;
        if (findings          !== undefined) updates.findings          = findings;
        if (actionItems       !== undefined) updates.actionItems       = actionItems;
        if (subjectsReviewed  !== undefined) updates.subjectsReviewed  = subjectsReviewed;
        if (nextVisitDate     !== undefined) updates.nextVisitDate     = nextVisitDate;
        if (notes             !== undefined) updates.notes             = notes;

        const [updated] = await db.update(monitoringVisits).set(updates)
            .where(eq(monitoringVisits.id, id)).returning();

        await writeAudit(db, {
            tableName: 'monitoring_visits', recordId: id, action: 'UPDATE',
            newValue: JSON.stringify(updates),
            reason: 'Monitoring visit updated',
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/monitoring/:id/submit — CRA submits the visit report for PI review
router.post('/:id/submit', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [existing] = await db.select().from(monitoringVisits)
            .where(eq(monitoringVisits.id, id));
        if (!existing) return res.status(404).json({ error: 'Monitoring visit not found' });
        if (existing.status !== 'Draft') return res.status(409).json({ error: 'Only draft visits can be submitted' });

        const [updated] = await db.update(monitoringVisits)
            .set({ status: 'Submitted', submittedAt: new Date(), updatedAt: new Date() })
            .where(eq(monitoringVisits.id, id)).returning();

        await writeAudit(db, {
            tableName: 'monitoring_visits', recordId: id, action: 'UPDATE',
            fieldName: 'status', oldValue: 'Draft', newValue: 'Submitted',
            reason: 'Monitoring visit report submitted for PI review',
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/monitoring/:id/acknowledge — PI/Admin acknowledges the visit report
router.post('/:id/acknowledge', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { piComments } = req.body;

        const [existing] = await db.select().from(monitoringVisits)
            .where(eq(monitoringVisits.id, id));
        if (!existing) return res.status(404).json({ error: 'Monitoring visit not found' });
        if (existing.status !== 'Submitted') {
            return res.status(409).json({ error: 'Only submitted visits can be acknowledged' });
        }

        const now = new Date();
        const [updated] = await db.update(monitoringVisits).set({
            status:              'Acknowledged',
            acknowledgedBy:      req.user.id,
            acknowledgedByName:  req.user.name,
            acknowledgedAt:      now,
            piComments:          piComments ?? null,
            updatedAt:           now,
        }).where(eq(monitoringVisits.id, id)).returning();

        await writeAudit(db, {
            tableName: 'monitoring_visits', recordId: id, action: 'UPDATE',
            fieldName: 'status', oldValue: 'Submitted', newValue: 'Acknowledged',
            reason: `Monitoring visit acknowledged by ${req.user.name} (PI/Admin)`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/monitoring/:id/sdv — list SDV records for a visit
router.get('/:id/sdv', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const rows = await db.select().from(sdvRecords)
            .where(eq(sdvRecords.monitoringVisitId, id))
            .orderBy(sdvRecords.subjectCode, sdvRecords.visitName);
        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.json([]);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/monitoring/:id/sdv — add or update an SDV record
router.post('/:id/sdv', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const monitoringVisitId = parseInt(req.params.id);
        const {
            subjectId, subjectCode, visitId, visitName,
            formId, formName, sdvStatus, discrepancyNote,
        } = req.body;

        if (!subjectCode || !sdvStatus) {
            return res.status(400).json({ error: 'subjectCode and sdvStatus are required' });
        }

        const validStatuses = ['Verified', 'Discrepant', 'Not Reviewed', 'N/A'];
        if (!validStatuses.includes(sdvStatus)) {
            return res.status(400).json({ error: `sdvStatus must be one of: ${validStatuses.join(', ')}` });
        }

        // Check if record already exists for this visit+subject+form combination
        const conditions = [
            eq(sdvRecords.monitoringVisitId, monitoringVisitId),
            eq(sdvRecords.subjectCode, subjectCode),
        ];
        if (formId) conditions.push(eq(sdvRecords.formId, parseInt(formId)));
        if (visitId) conditions.push(eq(sdvRecords.visitId, parseInt(visitId)));

        const [existing] = await db.select().from(sdvRecords).where(and(...conditions));

        const now = new Date();
        let record;
        if (existing) {
            [record] = await db.update(sdvRecords).set({
                sdvStatus,
                discrepancyNote: discrepancyNote ?? null,
                verifiedBy:      req.user.id,
                verifiedByName:  req.user.name,
                verifiedAt:      now,
            }).where(eq(sdvRecords.id, existing.id)).returning();
        } else {
            [record] = await db.insert(sdvRecords).values({
                monitoringVisitId,
                subjectId:       subjectId ? parseInt(subjectId) : null,
                subjectCode,
                visitId:         visitId ? parseInt(visitId) : null,
                visitName:       visitName ?? null,
                formId:          formId ? parseInt(formId) : null,
                formName:        formName ?? null,
                sdvStatus,
                discrepancyNote: discrepancyNote ?? null,
                verifiedBy:      req.user.id,
                verifiedByName:  req.user.name,
                verifiedAt:      now,
            }).returning();
        }

        await writeAudit(db, {
            tableName: 'sdv_records', recordId: record.id, action: existing ? 'UPDATE' : 'INSERT',
            newValue: `SDV: ${subjectCode}${visitName ? ` / ${visitName}` : ''}${formName ? ` / ${formName}` : ''} → ${sdvStatus}`,
            reason: `Source data verification per ICH GCP E6(R3) §5.18.4`,
            user: req.user, ipAddress: req.ip,
        });

        // If SDV status changed to Verified, check if subject is now fully clean
        if (sdvStatus === 'Verified' && record.subjectId) {
            checkAndNotifyVisitClean(req.studyId, record.subjectId).catch(() => {});
        }

        res.status(existing ? 200 : 201).json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
