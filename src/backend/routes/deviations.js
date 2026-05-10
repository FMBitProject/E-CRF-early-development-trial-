import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { protocolDeviations, subjects } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// GET /api/deviations — list, optional ?subjectId=&status=&type=
router.get('/', async (req, res) => {
    try {
        const { subjectId, status, type } = req.query;
        const conditions = [];
        if (subjectId) conditions.push(eq(protocolDeviations.subjectId, parseInt(subjectId)));
        if (status)    conditions.push(eq(protocolDeviations.status, status));
        if (type)      conditions.push(eq(protocolDeviations.deviationType, type));

        const rows = await db
            .select({
                id:               protocolDeviations.id,
                subjectId:        protocolDeviations.subjectId,
                subjectCode:      subjects.subjectCode,
                deviationType:    protocolDeviations.deviationType,
                category:         protocolDeviations.category,
                description:      protocolDeviations.description,
                deviationDate:    protocolDeviations.deviationDate,
                discoveryDate:    protocolDeviations.discoveryDate,
                rootCause:        protocolDeviations.rootCause,
                impactOnSubject:  protocolDeviations.impactOnSubject,
                capa:             protocolDeviations.capa,
                reportedToIrb:    protocolDeviations.reportedToIrb,
                reportedToIrbAt:  protocolDeviations.reportedToIrbAt,
                status:           protocolDeviations.status,
                createdByName:    protocolDeviations.createdByName,
                createdAt:        protocolDeviations.createdAt,
                updatedAt:        protocolDeviations.updatedAt,
            })
            .from(protocolDeviations)
            .leftJoin(subjects, eq(protocolDeviations.subjectId, subjects.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(protocolDeviations.createdAt));

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/deviations/stats
router.get('/stats', async (req, res) => {
    try {
        const all = await db.select({
            deviationType: protocolDeviations.deviationType,
            status:        protocolDeviations.status,
            reportedToIrb: protocolDeviations.reportedToIrb,
        }).from(protocolDeviations);

        res.json({
            total:    all.length,
            open:     all.filter(d => d.status === 'Open').length,
            major:    all.filter(d => d.deviationType === 'Major').length,
            pending:  all.filter(d => d.status === 'Open' && !d.reportedToIrb && d.deviationType === 'Major').length,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/deviations/:id
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db.select().from(protocolDeviations)
            .where(eq(protocolDeviations.id, parseInt(req.params.id)));
        if (!row) return res.status(404).json({ error: 'Protocol deviation not found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/deviations — create (investigator, admin)
router.post('/', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const {
            subjectId, deviationType, category, description,
            deviationDate, discoveryDate, rootCause,
            impactOnSubject, capa,
        } = req.body;

        if (!deviationType || !description) {
            return res.status(400).json({ error: 'deviationType and description are required' });
        }

        const [created] = await db.insert(protocolDeviations).values({
            subjectId:       subjectId ? parseInt(subjectId) : null,
            deviationType,
            category:        category       ?? null,
            description,
            deviationDate:   deviationDate  ?? null,
            discoveryDate:   discoveryDate  ?? null,
            rootCause:       rootCause      ?? null,
            impactOnSubject: impactOnSubject ?? null,
            capa:            capa           ?? null,
            status:          'Open',
            createdBy:       req.user.id,
            createdByName:   req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'protocol_deviations', recordId: created.id, action: 'INSERT',
            newValue: `${deviationType}: ${description.substring(0, 80)}`,
            reason: 'Protocol deviation recorded',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/deviations/:id — update with RFC
router.patch('/:id', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason, ...fields } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for edits' });

        const [existing] = await db.select().from(protocolDeviations)
            .where(eq(protocolDeviations.id, id));
        if (!existing) return res.status(404).json({ error: 'Protocol deviation not found' });
        if (existing.status === 'Closed') {
            return res.status(409).json({ error: 'Cannot edit a closed deviation' });
        }

        const updates = {
            deviationType:    fields.deviationType    ?? existing.deviationType,
            category:         fields.category         ?? existing.category,
            description:      fields.description      ?? existing.description,
            deviationDate:    fields.deviationDate    ?? existing.deviationDate,
            discoveryDate:    fields.discoveryDate     ?? existing.discoveryDate,
            rootCause:        fields.rootCause         ?? existing.rootCause,
            impactOnSubject:  fields.impactOnSubject   ?? existing.impactOnSubject,
            capa:             fields.capa              ?? existing.capa,
            updatedBy:        req.user.id,
            updatedAt:        new Date(),
        };

        const [updated] = await db.update(protocolDeviations)
            .set(updates)
            .where(eq(protocolDeviations.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'protocol_deviations', recordId: id, action: 'UPDATE',
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/deviations/:id/report-irb — mark reported to IRB
router.patch('/:id/report-irb', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [updated] = await db.update(protocolDeviations)
            .set({ reportedToIrb: true, reportedToIrbAt: new Date(), updatedBy: req.user.id, updatedAt: new Date() })
            .where(eq(protocolDeviations.id, id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Protocol deviation not found' });

        await writeAudit(db, {
            tableName: 'protocol_deviations', recordId: id, action: 'UPDATE',
            fieldName: 'reported_to_irb', newValue: 'true',
            reason: 'Deviation reported to IRB/EC',
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/deviations/:id/status — advance status (CAPA Implemented / Closed)
router.patch('/:id/status', requireRole('cra', 'pi', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        const allowed = ['CAPA Implemented', 'Closed'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ error: 'status must be "CAPA Implemented" or "Closed"' });
        }

        const [existing] = await db.select().from(protocolDeviations)
            .where(eq(protocolDeviations.id, id));
        if (!existing) return res.status(404).json({ error: 'Protocol deviation not found' });

        const [updated] = await db.update(protocolDeviations)
            .set({ status, updatedBy: req.user.id, updatedAt: new Date() })
            .where(eq(protocolDeviations.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'protocol_deviations', recordId: id, action: 'UPDATE',
            fieldName: 'status', oldValue: existing.status, newValue: status,
            reason: `Deviation status advanced to ${status}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
