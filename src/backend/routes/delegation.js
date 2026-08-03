// Delegation Log & Training Records — ICH GCP E6(R3) §4.1.5 + §8.3
// Site staff delegation with task assignment, sign-off, and training tracking

import { Router } from 'express';
import { eq, and, or, desc, gte, lte, isNull } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { delegationLog, trainingRecords, user } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { isoDay } from '../lib/isodate.js';
import { dbErrorMessage } from '../lib/dberrors.js';
import { orgCondition, effectiveOrgId, sameOrg } from '../lib/tenantscope.js';
import { resolveTrainingScope } from '../lib/trainingrules.js';

/**
 * A failed statement used to be answered with `err.message`, which for a
 * drizzle error is "Failed query: insert into … params: …" — the SQL and every
 * bound value, delivered to the browser, with no word about what actually went
 * wrong. Log the whole thing where an operator can read it; send back only the
 * reason postgres gave.
 */
function failed(res, err, context) {
    console.error(`[delegation] ${context}:`, err);
    res.status(500).json({ error: dbErrorMessage(err) });
}

/**
 * Conditions every training-record read must carry.
 *
 * The tenant filter is the important half: this table had no organization_id
 * and no filter at all, so one hospital's admin could list another hospital's
 * staff qualifications.
 *
 * The study half implements lib/trainingrules.js — a study's file shows its own
 * protocol training plus every person-level qualification, so each TMF is
 * complete without the same GCP certificate being copied into every study.
 * Kept in sync with visibleInStudy(), which asserts the same rule in tests.
 */
function trainingScope(req) {
    const conditions = [];
    const org = orgCondition(req, trainingRecords.organizationId);
    if (org) conditions.push(org);
    conditions.push(req.studyId
        ? or(isNull(trainingRecords.studyId), eq(trainingRecords.studyId, req.studyId))
        : isNull(trainingRecords.studyId));
    return conditions;
}

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
        failed(res, err, 'list delegation');
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
            .where(and(...trainingScope(req), ...[
                userId       ? eq(trainingRecords.userId, userId)             : undefined,
                trainingType ? eq(trainingRecords.trainingType, trainingType) : undefined,
            ].filter(Boolean)))
            .orderBy(desc(trainingRecords.trainingDate));
        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.json([]);
        failed(res, err, 'list training records');
    }
});

// POST /api/delegation/training/records — add training record (admin only)
router.post('/training/records', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const { userId: traineeId, trainingType, trainingDate, expiryDate, certificateRef, notes, studySpecific } = req.body;

        if (!traineeId || !trainingType || !trainingDate) {
            return res.status(400).json({ error: 'userId, trainingType, and trainingDate are required' });
        }

        const [targetUser] = await db.select({ name: user.name }).from(user).where(eq(user.id, traineeId));
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // training_date and expiry_date are TEXT "YYYY-MM-DD", same as the
        // delegation dates below — a Date object binds as timestamptz and the
        // column refuses it.
        const tDate = isoDay(trainingDate);
        const xDate = expiryDate ? isoDay(expiryDate) : null;
        if (!tDate) return res.status(400).json({ error: 'trainingDate is not a valid date (expected YYYY-MM-DD)' });
        if (expiryDate && !xDate) return res.status(400).json({ error: 'expiryDate is not a valid date (expected YYYY-MM-DD)' });
        if (xDate && xDate < tDate) return res.status(400).json({ error: 'expiryDate cannot be before trainingDate' });

        const [record] = await db.insert(trainingRecords).values({
            organizationId:  effectiveOrgId(req),
            // null for a transferable qualification, the active study for
            // protocol training — see lib/trainingrules.js.
            studyId:         resolveTrainingScope({ trainingType, studySpecific, studyId: req.studyId }),
            userId:          traineeId,
            userName:        targetUser.name,
            trainingType,
            trainingDate:    tDate,
            expiryDate:      xDate,
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
        failed(res, err, 'create training record');
    }
});

// GET /api/delegation/training/expiring — training expiring within N days (default 30)
router.get('/training/expiring', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const days = Number.parseInt(req.query.days ?? '30', 10);
        const window = Number.isFinite(days) && days >= 0 ? days : 30;
        const future = new Date();
        future.setDate(future.getDate() + window);

        // expiry_date is TEXT "YYYY-MM-DD". Comparing it against a Date bound
        // the parameter as a timestamp, which the column will not compare
        // against — the endpoint returned an error rather than a list. ISO date
        // strings order lexicographically, so a plain text BETWEEN is correct.
        const from = isoDay(new Date());
        const to   = isoDay(future);

        const rows = await db.select().from(trainingRecords)
            .where(and(
                ...trainingScope(req),
                gte(trainingRecords.expiryDate, from),
                lte(trainingRecords.expiryDate, to),
            ))
            .orderBy(trainingRecords.expiryDate);
        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.json([]);
        failed(res, err, 'list expiring training');
    }
});

// DELETE /api/delegation/training/records/:id — admin only
router.delete('/training/records/:id', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [existing] = await db.select().from(trainingRecords).where(eq(trainingRecords.id, id));
        // 404 rather than 403 for another tenant's record, matching the rest of
        // the codebase: one tenant must not be able to probe what another has.
        if (!existing || !sameOrg(req, existing.organizationId)) {
            return res.status(404).json({ error: 'Training record not found' });
        }

        await db.delete(trainingRecords).where(eq(trainingRecords.id, id));

        await writeAudit(db, {
            tableName: 'training_records', recordId: id, action: 'DELETE',
            oldValue: `${existing.trainingType} for ${existing.userName}`,
            reason: 'Training record deleted by admin',
            user: req.user, ipAddress: req.ip,
        });

        res.json({ ok: true });
    } catch (err) {
        failed(res, err, 'delete training record');
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
        failed(res, err, 'get delegation');
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

        // delegation_start/end are TEXT columns holding "YYYY-MM-DD", and
        // consentrules.day() compares them by slicing the first ten characters.
        // Wrapping the value in `new Date()` made postgres-js bind the
        // parameter as a timestamptz, which the text column rejects outright —
        // and had it been accepted it would have stored "Sat Aug 01 2026 …",
        // whose first ten characters are "Sat Aug 01". Every delegation-window
        // check would then have failed, which is the check that decides who may
        // take informed consent (ICH E6(R3) §4.1.5).
        const start = isoDay(delegationStart);
        const end   = delegationEnd ? isoDay(delegationEnd) : null;
        if (!start)  return res.status(400).json({ error: 'delegationStart is not a valid date (expected YYYY-MM-DD)' });
        if (delegationEnd && !end) return res.status(400).json({ error: 'delegationEnd is not a valid date (expected YYYY-MM-DD)' });
        if (end && end < start)    return res.status(400).json({ error: 'delegationEnd cannot be before delegationStart' });

        // Fetch the delegated user's name and role
        const [targetUser] = await db.select({ name: user.name, role: user.role })
            .from(user).where(eq(user.id, delegatedUserId));
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const [entry] = await db.insert(delegationLog).values({
            studyId:         req.studyId,
            userId:          delegatedUserId,
            userName:        targetUser.name,
            userRole:        targetUser.role,
            // An unselected <select> posts "", which is not null and which an
            // integer column will not take.
            siteId:          siteId === '' || siteId == null ? null : parseInt(siteId, 10),
            delegatedTasks,
            delegationStart: start,
            delegationEnd:   end,
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
        failed(res, err, 'create delegation');
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
        // Same TEXT "YYYY-MM-DD" contract as the create path above.
        if (delegationStart !== undefined) {
            const s = isoDay(delegationStart);
            if (!s) return res.status(400).json({ error: 'delegationStart is not a valid date (expected YYYY-MM-DD)' });
            updates.delegationStart = s;
        }
        if (delegationEnd !== undefined) {
            if (delegationEnd) {
                const e = isoDay(delegationEnd);
                if (!e) return res.status(400).json({ error: 'delegationEnd is not a valid date (expected YYYY-MM-DD)' });
                updates.delegationEnd = e;
            } else {
                updates.delegationEnd = null;
            }
        }
        const effStart = updates.delegationStart ?? existing.delegationStart;
        const effEnd   = updates.delegationEnd   ?? existing.delegationEnd;
        if (effStart && effEnd && effEnd < effStart) {
            return res.status(400).json({ error: 'delegationEnd cannot be before delegationStart' });
        }
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
        failed(res, err, 'update delegation');
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
        failed(res, err, 'sign delegation');
    }
});

export default router;
