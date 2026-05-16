import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { protocolAmendments } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// GET /api/amendments — list amendments for current study
router.get('/', async (req, res) => {
    try {
        const rows = await db
            .select()
            .from(protocolAmendments)
            .where(eq(protocolAmendments.studyId, req.studyId))
            .orderBy(desc(protocolAmendments.createdAt));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/amendments/:id
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db
            .select()
            .from(protocolAmendments)
            .where(and(
                eq(protocolAmendments.id, parseInt(req.params.id)),
                eq(protocolAmendments.studyId, req.studyId),
            ));
        if (!row) return res.status(404).json({ error: 'Protocol amendment not found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/amendments — create (admin/pi only)
router.post('/', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const {
            amendmentNo, effectiveDate, summary, changes,
            requiresReconsent, reconsentReason,
            irbApprovalDate, irbRefNo,
        } = req.body;

        if (!amendmentNo || !effectiveDate || !summary) {
            return res.status(400).json({ error: 'amendmentNo, effectiveDate, and summary are required' });
        }

        const [created] = await db.insert(protocolAmendments).values({
            studyId:           req.studyId,
            amendmentNo,
            effectiveDate,
            summary,
            changes:           changes           ?? null,
            requiresReconsent: Boolean(requiresReconsent),
            reconsentReason:   reconsentReason   ?? null,
            irbApprovalDate:   irbApprovalDate   ?? null,
            irbRefNo:          irbRefNo          ?? null,
            status:            'Draft',
            createdBy:         req.user.id,
            createdByName:     req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'protocol_amendments', recordId: created.id, action: 'INSERT',
            newValue: `${amendmentNo} | ${summary.substring(0, 80)} | Status: Draft`,
            reason: 'Protocol amendment created',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/amendments/:id — update status or fields; require reason
router.patch('/:id', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason, ...fields } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for edits (ICH GCP)' });

        const [existing] = await db.select().from(protocolAmendments)
            .where(and(
                eq(protocolAmendments.id, id),
                eq(protocolAmendments.studyId, req.studyId),
            ));
        if (!existing) return res.status(404).json({ error: 'Protocol amendment not found' });
        if (existing.status === 'Implemented') {
            return res.status(409).json({ error: 'Cannot edit an implemented amendment' });
        }

        const allowedStatuses = ['Draft', 'Approved', 'Implemented'];
        if (fields.status && !allowedStatuses.includes(fields.status)) {
            return res.status(400).json({ error: `status must be one of: ${allowedStatuses.join(', ')}` });
        }

        const updates = {
            amendmentNo:       fields.amendmentNo       ?? existing.amendmentNo,
            effectiveDate:     fields.effectiveDate     ?? existing.effectiveDate,
            summary:           fields.summary           ?? existing.summary,
            changes:           fields.changes           ?? existing.changes,
            requiresReconsent: fields.requiresReconsent !== undefined
                                   ? Boolean(fields.requiresReconsent)
                                   : existing.requiresReconsent,
            reconsentReason:   fields.reconsentReason   ?? existing.reconsentReason,
            irbApprovalDate:   fields.irbApprovalDate   ?? existing.irbApprovalDate,
            irbRefNo:          fields.irbRefNo          ?? existing.irbRefNo,
            status:            fields.status            ?? existing.status,
            updatedAt:         new Date(),
        };

        const [updated] = await db.update(protocolAmendments)
            .set(updates)
            .where(eq(protocolAmendments.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'protocol_amendments', recordId: id, action: 'UPDATE',
            fieldName: fields.status ? 'status' : 'multiple',
            oldValue: fields.status ? existing.status : existing.amendmentNo,
            newValue: fields.status ? updated.status  : updated.amendmentNo,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/amendments/:id — delete (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for deletion' });

        const [existing] = await db.select().from(protocolAmendments)
            .where(and(
                eq(protocolAmendments.id, id),
                eq(protocolAmendments.studyId, req.studyId),
            ));
        if (!existing) return res.status(404).json({ error: 'Protocol amendment not found' });
        if (existing.status === 'Implemented') {
            return res.status(409).json({ error: 'Cannot delete an implemented amendment' });
        }

        await db.delete(protocolAmendments).where(eq(protocolAmendments.id, id));

        await writeAudit(db, {
            tableName: 'protocol_amendments', recordId: id, action: 'DELETE',
            oldValue: `${existing.amendmentNo} | ${existing.summary.substring(0, 80)}`,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ success: true, deleted: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
