import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db, client } from '../db/connection.js';
import { blindDataReviews, adverseEvents, subjects } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// Default checklist template for a new BDR
function defaultChecklist() {
    return {
        dataCompleteness: {
            label: 'All mandatory CRF fields completed',
            ticked: false,
        },
        queryResolution: {
            label: 'All open queries reviewed and resolved or justified',
            ticked: false,
        },
        deviationReview: {
            label: 'All protocol deviations reviewed and assessed',
            ticked: false,
        },
        safetyReview: {
            label: 'All SAEs reviewed and expedited reports confirmed',
            ticked: false,
        },
        consentVerification: {
            label: 'Informed consent status verified for all subjects',
            ticked: false,
        },
        auditTrailReview: {
            label: 'Audit trail spot-checked; no unexplained edits',
            ticked: false,
        },
        randomizationCheck: {
            label: 'Randomization integrity confirmed',
            ticked: false,
        },
    };
}

// GET /api/bdreview — list reviews for current study, most recent first
router.get('/', async (req, res) => {
    try {
        const rows = await db
            .select()
            .from(blindDataReviews)
            .where(eq(blindDataReviews.studyId, req.studyId))
            .orderBy(desc(blindDataReviews.createdAt));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/bdreview/current — get latest In Progress review or null
router.get('/current', async (req, res) => {
    try {
        const [row] = await db
            .select()
            .from(blindDataReviews)
            .where(and(
                eq(blindDataReviews.studyId, req.studyId),
                eq(blindDataReviews.status, 'In Progress'),
            ))
            .orderBy(desc(blindDataReviews.createdAt))
            .limit(1);
        res.json(row ?? null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/bdreview/:id
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db
            .select()
            .from(blindDataReviews)
            .where(and(
                eq(blindDataReviews.id, parseInt(req.params.id)),
                eq(blindDataReviews.studyId, req.studyId),
            ));
        if (!row) return res.status(404).json({ error: 'Blind data review not found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/bdreview — initiate new BDR (admin/cra/pi only)
// Auto-populates counts from live DB
router.post('/', requireRole('admin', 'cra', 'pi'), async (req, res) => {
    try {
        // Check there is no existing In Progress review
        const [inProgress] = await db
            .select({ id: blindDataReviews.id })
            .from(blindDataReviews)
            .where(and(
                eq(blindDataReviews.studyId, req.studyId),
                eq(blindDataReviews.status, 'In Progress'),
            ));
        if (inProgress) {
            return res.status(409).json({
                error: 'A blind data review is already In Progress',
                existingId: inProgress.id,
            });
        }

        // Query live counts
        const studyId = req.studyId;

        const [openQueriesRow] = await client`
            SELECT COUNT(*)::int AS count
            FROM queries
            WHERE study_id = ${studyId} AND status = 'Open'
        `;

        const [openDeviationsRow] = await client`
            SELECT COUNT(*)::int AS count
            FROM protocol_deviations
            WHERE study_id = ${studyId} AND status = 'Open'
        `;

        const [pendingSaesRow] = await client`
            SELECT COUNT(*)::int AS count
            FROM sae_reports
            WHERE status = 'Pending'
              AND ae_id IN (
                  SELECT id FROM adverse_events WHERE study_id = ${studyId}
              )
        `;

        const openQueries    = openQueriesRow?.count    ?? 0;
        const openDeviations = openDeviationsRow?.count ?? 0;
        const pendingSaes    = pendingSaesRow?.count    ?? 0;
        const missingCritical = 0; // Complex to compute — left as 0 pending CRF completion analysis

        const today = new Date().toISOString().slice(0, 10);

        const [created] = await db.insert(blindDataReviews).values({
            studyId,
            reviewDate:      today,
            status:          'In Progress',
            checklistJson:   defaultChecklist(),
            openQueries,
            openDeviations,
            pendingSaes,
            missingCritical,
            notes:           req.body.notes ?? null,
            createdBy:       req.user.id,
            createdByName:   req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'blind_data_reviews', recordId: created.id, action: 'INSERT',
            newValue: `BDR initiated | Queries: ${openQueries} | Deviations: ${openDeviations} | Pending SAEs: ${pendingSaes}`,
            reason: 'Blind data review initiated',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/bdreview/:id — update checklist_json sections, notes
router.patch('/:id', requireRole('admin', 'cra', 'pi'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { checklistJson, notes } = req.body;

        const [existing] = await db.select().from(blindDataReviews)
            .where(and(
                eq(blindDataReviews.id, id),
                eq(blindDataReviews.studyId, req.studyId),
            ));
        if (!existing) return res.status(404).json({ error: 'Blind data review not found' });
        if (existing.status === 'Completed') {
            return res.status(409).json({ error: 'Cannot edit a completed blind data review' });
        }

        const mergedChecklist = checklistJson
            ? { ...existing.checklistJson, ...checklistJson }
            : existing.checklistJson;

        const updates = {
            checklistJson: mergedChecklist,
            notes:         notes !== undefined ? notes : existing.notes,
        };

        const [updated] = await db.update(blindDataReviews)
            .set(updates)
            .where(eq(blindDataReviews.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'blind_data_reviews', recordId: id, action: 'UPDATE',
            fieldName: 'checklist_json',
            newValue: 'Checklist sections updated',
            reason: 'BDR checklist updated',
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/bdreview/:id/complete — mark completed, validates all checklist sections ticked
router.post('/:id/complete', requireRole('admin', 'cra', 'pi'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const [existing] = await db.select().from(blindDataReviews)
            .where(and(
                eq(blindDataReviews.id, id),
                eq(blindDataReviews.studyId, req.studyId),
            ));
        if (!existing) return res.status(404).json({ error: 'Blind data review not found' });
        if (existing.status !== 'In Progress') {
            return res.status(409).json({ error: `Review is already ${existing.status}` });
        }

        // Validate all checklist sections are ticked
        const checklist = existing.checklistJson ?? {};
        const unticked = Object.entries(checklist)
            .filter(([, section]) => !section.ticked)
            .map(([key, section]) => section.label ?? key);

        if (unticked.length > 0) {
            return res.status(422).json({
                error: 'All checklist sections must be ticked before completing the review',
                unticked,
            });
        }

        const now = new Date();
        const [updated] = await db.update(blindDataReviews)
            .set({
                status:          'Completed',
                completedBy:     req.user.id,
                completedByName: req.user.name,
                completedAt:     now,
            })
            .where(eq(blindDataReviews.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'blind_data_reviews', recordId: id, action: 'UPDATE',
            fieldName: 'status', oldValue: 'In Progress', newValue: 'Completed',
            reason: `BDR completed by ${req.user.name}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
