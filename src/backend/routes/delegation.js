// Delegation Log & Training Records — ICH GCP E6(R3) §4.1.5 + §8.3
// Site staff delegation with task assignment, sign-off, and training tracking

import { Router } from 'express';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { delegationLog, trainingRecords, user } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// ---------------------------------------------------------------------------
// DELEGATION LOG
// ---------------------------------------------------------------------------

function isMissingTable(err) {
    const c = err?.cause;
    return err?.code === '42P01' || c?.code === '42P01' ||
           (err?.message || '').includes('does not exist') ||
           (c?.message || '').includes('does not exist');
}

// GET /api/delegation — list delegation entries
// Privileged roles see all entries; other roles (investigator, crc) only see
// their own so they can review and sign them (ICH GCP §4.1.5).
router.get('/', async (req, res) => {
    try {
        const privileged = ['admin', 'cra', 'pi', 'data_manager'].includes(req.user.role);
        const { status } = req.query;
        const userId = privileged ? req.query.userId : req.user.id;
        const base = eq(delegationLog.studyId, req.studyId);
        const rows = await db.select().from(delegationLog)
            .where(
                userId && status ? and(base, eq(delegationLog.userId, userId), eq(delegationLog.status, status))
                : userId ? and(base, eq(delegationLog.userId, userId))
                : status ? and(base, eq(delegationLog.status, status))
                : base
            )
            .orderBy(desc(delegationLog.createdAt));
        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.json([]);
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------------
// TRAINING RECORDS  (must be before /:id to avoid route shadowing)
// ---------------------------------------------------------------------------

// GET /api/delegation/training/records — list training records
router.get('/training/records', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const { userId, trainingType } = req.query;
        const rows = await db.select().from(trainingRecords)
            .where(
                userId && trainingType ? and(eq(trainingRecords.userId, userId), eq(trainingRecords.trainingType, trainingType))
                : userId ? eq(trainingRecords.userId, userId)
                : trainingType ? eq(trainingRecords.trainingType, trainingType)
                : undefined
            )
            .orderBy(desc(trainingRecords.trainingDate));
        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.json([]);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/delegation/training/records — add training record (admin only)
router.post('/training/records', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const { userId: traineeId, trainingType, trainingDate, expiryDate, certificateRef, notes } = req.body;

        if (!traineeId || !trainingType || !trainingDate) {
            return res.status(400).json({ error: 'userId, trainingType, and trainingDate are required' });
        }

        const [targetUser] = await db.select({ name: user.name }).from(user).where(eq(user.id, traineeId));
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const [record] = await db.insert(trainingRecords).values({
            userId:          traineeId,
            userName:        targetUser.name,
            trainingType,
            trainingDate:    new Date(trainingDate),
            expiryDate:      expiryDate ? new Date(expiryDate) : null,
            certificateRef:  certificateRef ?? null,
            notes:           notes ?? null,
            recordedBy:      req.user.id,
            recordedByName:  req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'training_records', recordId: record.id, action: 'INSERT',
            newValue: `${trainingType} training recorded for ${targetUser.name}`,
            reason: 'Training record per ICH E6(R3) §8.3',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/delegation/training/expiring — training expiring within N days (default 30)
router.get('/training/expiring', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const days = parseInt(req.query.days ?? '30');
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + days);

        const rows = await db.select().from(trainingRecords)
            .where(and(gte(trainingRecords.expiryDate, now), lte(trainingRecords.expiryDate, future)))
            .orderBy(trainingRecords.expiryDate);
        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.json([]);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/delegation/training/records/:id — admin only
router.delete('/training/records/:id', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [existing] = await db.select().from(trainingRecords).where(eq(trainingRecords.id, id));
        if (!existing) return res.status(404).json({ error: 'Training record not found' });

        await db.delete(trainingRecords).where(eq(trainingRecords.id, id));

        await writeAudit(db, {
            tableName: 'training_records', recordId: id, action: 'DELETE',
            oldValue: `${existing.trainingType} for ${existing.userName}`,
            reason: 'Training record deleted by admin',
            user: req.user, ipAddress: req.ip,
        });

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------------
// DELEGATION LOG — parameterized routes last to avoid shadowing /training/*
// ---------------------------------------------------------------------------

// GET /api/delegation/:id — single entry
// Privileged roles see any entry; other roles only their own (to sign it).
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [row] = await db.select().from(delegationLog).where(eq(delegationLog.id, id));
        if (!row) return res.status(404).json({ error: 'Delegation record not found' });
        const privileged = ['admin', 'cra', 'pi', 'data_manager'].includes(req.user.role);
        if (!privileged && row.userId !== req.user.id) {
            return res.status(403).json({ error: 'You can only view your own delegation entry' });
        }
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/delegation — create delegation entry (admin only)
router.post('/', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const {
            userId: delegatedUserId, siteId, delegatedTasks,
            delegationStart, delegationEnd, notes,
        } = req.body;

        if (!delegatedUserId || !delegatedTasks?.length || !delegationStart) {
            return res.status(400).json({ error: 'userId, delegatedTasks, and delegationStart are required' });
        }

        // Fetch the delegated user's name and role
        const [targetUser] = await db.select({ name: user.name, role: user.role })
            .from(user).where(eq(user.id, delegatedUserId));
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const [entry] = await db.insert(delegationLog).values({
            studyId:         req.studyId,
            userId:          delegatedUserId,
            userName:        targetUser.name,
            userRole:        targetUser.role,
            siteId:          siteId ?? null,
            delegatedTasks,
            delegationStart: new Date(delegationStart),
            delegationEnd:   delegationEnd ? new Date(delegationEnd) : null,
            status:          'Active',
            notes:           notes ?? null,
            createdBy:       req.user.id,
            createdByName:   req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'delegation_log', recordId: entry.id, action: 'INSERT',
            newValue: `Delegation created for ${targetUser.name} (${delegatedTasks.join(', ')})`,
            reason: `Delegation log entry per ICH E6(R3) §4.1.5`,
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(entry);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/delegation/:id — update (admin only)
router.patch('/:id', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { delegatedTasks, delegationStart, delegationEnd, status, notes } = req.body;

        const [existing] = await db.select().from(delegationLog).where(eq(delegationLog.id, id));
        if (!existing) return res.status(404).json({ error: 'Delegation record not found' });

        const updates = { updatedAt: new Date() };
        if (delegatedTasks !== undefined) updates.delegatedTasks = delegatedTasks;
        if (delegationStart !== undefined) updates.delegationStart = new Date(delegationStart);
        if (delegationEnd !== undefined) updates.delegationEnd = delegationEnd ? new Date(delegationEnd) : null;
        if (status !== undefined) updates.status = status;
        if (notes !== undefined) updates.notes = notes;

        const [updated] = await db.update(delegationLog).set(updates)
            .where(eq(delegationLog.id, id)).returning();

        await writeAudit(db, {
            tableName: 'delegation_log', recordId: id, action: 'UPDATE',
            newValue: JSON.stringify(updates),
            reason: 'Delegation record updated',
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/delegation/:id/sign — investigator/staff e-signs their delegation
router.post('/:id/sign', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const [entry] = await db.select().from(delegationLog).where(eq(delegationLog.id, id));
        if (!entry) return res.status(404).json({ error: 'Delegation record not found' });
        if (entry.userId !== req.user.id) {
            return res.status(403).json({ error: 'You can only sign your own delegation entries' });
        }
        if (entry.signedAt) return res.status(409).json({ error: 'Already signed' });

        const [updated] = await db.update(delegationLog)
            .set({ signedAt: new Date(), signedByName: req.user.name })
            .where(eq(delegationLog.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'delegation_log', recordId: id, action: 'UPDATE',
            fieldName: 'signed_at', newValue: new Date().toISOString(),
            reason: `Delegation log signed by ${req.user.name} (ICH E6(R3) §4.1.5)`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
