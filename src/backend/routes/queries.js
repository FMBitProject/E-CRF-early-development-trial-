import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { queries, subjects, visits, crfForms } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// GET /api/queries — list with optional ?status=&subjectId=
router.get('/', async (req, res) => {
    try {
        const { status, subjectId } = req.query;
        const conditions = [];
        if (status)    conditions.push(eq(queries.status, status));
        if (subjectId) conditions.push(eq(queries.subjectId, parseInt(subjectId)));

        const rows = await db
            .select({
                id:             queries.id,
                subjectId:      queries.subjectId,
                subjectCode:    subjects.subjectCode,
                visitId:        queries.visitId,
                visitName:      visits.visitName,
                formId:         queries.formId,
                formName:       crfForms.name,
                entryId:        queries.entryId,
                fieldKey:       queries.fieldKey,
                fieldLabel:     queries.fieldLabel,
                queryText:      queries.queryText,
                status:         queries.status,
                raisedBy:       queries.raisedBy,
                raisedByName:   queries.raisedByName,
                raisedAt:       queries.raisedAt,
                resolutionText: queries.resolutionText,
                resolvedByName: queries.resolvedByName,
                resolvedAt:     queries.resolvedAt,
                closedAt:       queries.closedAt,
            })
            .from(queries)
            .leftJoin(subjects, eq(queries.subjectId, subjects.id))
            .leftJoin(visits,   eq(queries.visitId,   visits.id))
            .leftJoin(crfForms, eq(queries.formId,    crfForms.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(queries.raisedAt));

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/queries — CRA raises a query
router.post('/', requireRole('cra', 'admin'), async (req, res) => {
    try {
        const { subjectId, visitId, formId, entryId, fieldKey, fieldLabel, queryText } = req.body;
        if (!subjectId || !queryText) {
            return res.status(400).json({ error: 'subjectId and queryText are required' });
        }

        const [created] = await db.insert(queries).values({
            subjectId,
            visitId:    visitId    ?? null,
            formId:     formId     ?? null,
            entryId:    entryId    ?? null,
            fieldKey:   fieldKey   ?? null,
            fieldLabel: fieldLabel ?? null,
            queryText,
            raisedBy:     req.user.id,
            raisedByName: req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'queries', recordId: created.id, action: 'INSERT',
            newValue: queryText, reason: 'Query raised by CRA',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/queries/:id/resolve — investigator resolves
router.patch('/:id/resolve', requireRole('investigator', 'admin'), async (req, res) => {
    try {
        const { resolutionText } = req.body;
        if (!resolutionText) return res.status(400).json({ error: 'resolutionText is required' });

        const [q] = await db.select().from(queries).where(eq(queries.id, parseInt(req.params.id)));
        if (!q) return res.status(404).json({ error: 'Query not found' });
        if (q.status !== 'Open') return res.status(409).json({ error: 'Only Open queries can be resolved' });

        const [updated] = await db.update(queries)
            .set({
                status:         'Resolved',
                resolutionText,
                resolvedBy:     req.user.id,
                resolvedByName: req.user.name,
                resolvedAt:     new Date(),
            })
            .where(eq(queries.id, q.id))
            .returning();

        await writeAudit(db, {
            tableName: 'queries', recordId: q.id, action: 'UPDATE',
            fieldName: 'status', oldValue: 'Open', newValue: 'Resolved',
            reason: resolutionText, user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/queries/:id/close — CRA closes a resolved query
router.patch('/:id/close', requireRole('cra', 'admin'), async (req, res) => {
    try {
        const [q] = await db.select().from(queries).where(eq(queries.id, parseInt(req.params.id)));
        if (!q) return res.status(404).json({ error: 'Query not found' });
        if (q.status !== 'Resolved') return res.status(409).json({ error: 'Only Resolved queries can be closed' });

        const [updated] = await db.update(queries)
            .set({ status: 'Closed', closedBy: req.user.id, closedAt: new Date() })
            .where(eq(queries.id, q.id))
            .returning();

        await writeAudit(db, {
            tableName: 'queries', recordId: q.id, action: 'UPDATE',
            fieldName: 'status', oldValue: 'Resolved', newValue: 'Closed',
            reason: 'Query closed by CRA', user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
