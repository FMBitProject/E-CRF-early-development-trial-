import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { queries, subjects, visits, crfForms, user } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { sendQueryRaisedEmail, sendQueryResolvedEmail } from '../lib/email.js';
import { checkAndNotifyVisitClean } from '../lib/visitclean.js';

const router = Router();

// GET /api/queries — list with optional ?status=&subjectId=
router.get('/', async (req, res) => {
    try {
        const { status, subjectId } = req.query;
        const conditions = [eq(queries.studyId, req.studyId)];
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
            studyId:    req.studyId,
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

        // Email notification: find investigators at this subject's site
        const [subjectRow] = await db
            .select({ siteId: subjects.siteId, subjectCode: subjects.subjectCode })
            .from(subjects)
            .where(eq(subjects.id, subjectId));

        if (subjectRow?.siteId) {
            const investigators = await db
                .select({ email: user.email, name: user.name })
                .from(user)
                .where(and(eq(user.role, 'investigator'), eq(user.siteId, subjectRow.siteId)));

            const [visitRow] = visitId
                ? await db.select({ visitName: visits.visitName }).from(visits).where(eq(visits.id, visitId))
                : [null];

            for (const inv of investigators) {
                sendQueryRaisedEmail(inv.email, inv.name, {
                    subjectCode: subjectRow.subjectCode || String(subjectId),
                    queryText,
                    raisedByName: req.user.name,
                    visitName: visitRow?.visitName ?? null,
                    fieldLabel: fieldLabel ?? null,
                }).catch(() => {});
            }
        }

        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/queries/:id/resolve — investigator/CRC resolves
router.patch('/:id/resolve', requireRole('investigator', 'pi', 'admin', 'crc'), async (req, res) => {
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

        // Email notification: CRA who raised the query
        if (q.raisedBy) {
            const [craUser] = await db.select({ email: user.email, name: user.name })
                .from(user).where(eq(user.id, q.raisedBy));
            const [subjectRow] = await db.select({ subjectCode: subjects.subjectCode })
                .from(subjects).where(eq(subjects.id, q.subjectId));
            if (craUser) {
                sendQueryResolvedEmail(craUser.email, craUser.name, {
                    subjectCode:    subjectRow?.subjectCode ?? String(q.subjectId),
                    queryText:      q.queryText,
                    resolutionText,
                    resolvedByName: req.user.name,
                }).catch(() => {});
            }
        }

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

        // Check if this subject is now fully clean (no open queries + SDV 100%)
        checkAndNotifyVisitClean(req.studyId, q.subjectId).catch(() => {});

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
