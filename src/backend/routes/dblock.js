// Study-Level Database Lock — ICH GCP E6(R3) §5.5.7
// Formal dual-signature DBL workflow with automated pre-lock compliance checks

import { Router } from 'express';
import { eq, and, count } from 'drizzle-orm';
import { db } from '../db/connection.js';
import {
    studyDbLock, queries, crfDataEntries, adverseEvents, protocolDeviations,
    informedConsents, subjects, account,
} from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { verifyPassword } from '@better-auth/utils/password';
import { sendDBLockRequestEmail } from '../lib/email.js';
import { user as userTable, studies } from '../db/schemas/schema.js';

const router = Router();

// Run all pre-lock compliance checks per ICH GCP E6(R3) §5.5.7
async function runPreLockChecks(studyId) {
    const [
        [{ openQueries }],
        [{ resolvedQueries }],
        [{ draftEntries }],
        [{ savedEntries }],
        [{ draftSAEs }],
        [{ openDeviations }],
        [{ unconsented }],
        [{ totalSubjects }],
    ] = await Promise.all([
        db.select({ openQueries:     count() }).from(queries).where(and(eq(queries.studyId, studyId), eq(queries.status, 'Open'))),
        db.select({ resolvedQueries: count() }).from(queries).where(and(eq(queries.studyId, studyId), eq(queries.status, 'Resolved'))),
        db.select({ draftEntries:    count() }).from(crfDataEntries).where(eq(crfDataEntries.status, 'Draft')),
        db.select({ savedEntries:    count() }).from(crfDataEntries).where(eq(crfDataEntries.status, 'Saved')),
        db.select({ draftSAEs:       count() }).from(adverseEvents)
            .where(and(eq(adverseEvents.studyId, studyId), eq(adverseEvents.isSerious, true), eq(adverseEvents.reportStatus, 'Draft'))),
        db.select({ openDeviations:  count() }).from(protocolDeviations).where(and(eq(protocolDeviations.studyId, studyId), eq(protocolDeviations.status, 'Open'))),
        db.select({ unconsented:     count() }).from(subjects).where(and(eq(subjects.studyId, studyId), eq(subjects.status, 'Active'))),
        db.select({ totalSubjects:   count() }).from(subjects).where(eq(subjects.studyId, studyId)),
    ]);

    const checks = [
        {
            id:      'queries_open',
            label:   'All data queries closed',
            ref:     'ICH E6(R3) §5.5.7 — no outstanding data queries at database lock',
            passed:  Number(openQueries) === 0,
            detail:  Number(openQueries) > 0 ? `${openQueries} open quer${openQueries === 1 ? 'y' : 'ies'} must be resolved and closed` : 'All queries closed',
        },
        {
            id:      'queries_resolved',
            label:   'No queries pending CRA review',
            ref:     'ICH E6(R3) §5.5.7',
            passed:  Number(resolvedQueries) === 0,
            detail:  Number(resolvedQueries) > 0 ? `${resolvedQueries} resolved quer${resolvedQueries === 1 ? 'y' : 'ies'} awaiting CRA closure` : 'No resolved queries pending',
        },
        {
            id:      'entries_draft',
            label:   'No CRF entries in Draft status',
            ref:     'ICH E6(R3) §5.5.7 — all data must be reviewed and signed',
            passed:  Number(draftEntries) === 0,
            detail:  Number(draftEntries) > 0 ? `${draftEntries} form${draftEntries === 1 ? '' : 's'} still in Draft` : 'No draft entries',
        },
        {
            id:      'entries_unsigned',
            label:   'All CRF entries signed or locked',
            ref:     '21 CFR Part 11 §11.10 — electronic signatures required before lock',
            passed:  Number(savedEntries) === 0,
            detail:  Number(savedEntries) > 0 ? `${savedEntries} form${savedEntries === 1 ? '' : 's'} saved but not signed` : 'All entries signed/locked',
        },
        {
            id:      'sae_unreported',
            label:   'All SAEs reported (no Draft SAEs)',
            ref:     'ICH E2A / E6(R3) §4.11 — all serious adverse events must be reported',
            passed:  Number(draftSAEs) === 0,
            detail:  Number(draftSAEs) > 0 ? `${draftSAEs} serious AE${draftSAEs === 1 ? '' : 's'} in Draft — expedited reporting required` : 'All SAEs reported',
        },
        {
            id:      'deviations_open',
            label:   'No open protocol deviations',
            ref:     'ICH E6(R3) §4.5 — CAPA implementation required before lock',
            passed:  Number(openDeviations) === 0,
            detail:  Number(openDeviations) > 0 ? `${openDeviations} deviation${openDeviations === 1 ? '' : 's'} still Open` : 'No open deviations',
        },
    ];

    const allPassed = checks.every(c => c.passed);
    return { checks, allPassed, runAt: new Date().toISOString() };
}

// GET /api/dblock — alias for /status (frontend compat)
router.get('/', async (req, res) => {
    try {
        const locks = await db.select().from(studyDbLock).where(eq(studyDbLock.studyId, req.studyId)).orderBy(studyDbLock.createdAt);
        const current = locks[locks.length - 1] || null;
        res.json({ isLocked: current?.status === 'Locked', status: current?.status ?? null, current, history: locks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dblock/status — current DB lock state
router.get('/status', async (req, res) => {
    try {
        const locks = await db.select().from(studyDbLock).where(eq(studyDbLock.studyId, req.studyId)).orderBy(studyDbLock.createdAt);
        const current = locks[locks.length - 1] || null;
        res.json({
            isLocked:  current?.status === 'Locked',
            current,
            history:   locks,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/dblock/check — run pre-lock checks without initiating (CRA, admin)
router.post('/check', requireRole('cra', 'pi', 'admin', 'data_manager'), async (req, res) => {
    try {
        const result = await runPreLockChecks(req.studyId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/dblock/initiate — Data Manager/PI initiates the DBL process
router.post('/initiate', requireRole('pi', 'admin', 'data_manager'), async (req, res) => {
    try {
        const { notes } = req.body;

        // Cannot initiate if already locked or pending
        const existing = await db.select({ status: studyDbLock.status }).from(studyDbLock)
            .where(eq(studyDbLock.studyId, req.studyId)).orderBy(studyDbLock.createdAt);
        const current = existing[existing.length - 1];
        if (current?.status === 'Locked') {
            return res.status(409).json({ error: 'Study database is already locked' });
        }
        if (current?.status === 'Pending Approval') {
            return res.status(409).json({ error: 'A database lock request is already pending approval' });
        }

        // Run automated checks
        const preCheck = await runPreLockChecks(req.studyId);

        const [lock] = await db.insert(studyDbLock).values({
            studyId:         req.studyId,
            status:          'Pending Signatures',
            preCheckJson:    preCheck,
            initiatedBy:     req.user.id,
            initiatedByName: req.user.name,
            initiatedAt:     new Date(),
            notes:           notes ?? null,
        }).returning();

        await writeAudit(db, {
            tableName: 'study_db_lock', recordId: lock.id, action: 'INSERT',
            newValue: 'Database Lock process initiated',
            reason: `DBL initiated by ${req.user.name} — Pre-checks: ${preCheck.allPassed ? 'ALL PASSED' : 'FAILED'}`,
            user: req.user, ipAddress: req.ip,
        });

        // Notify CRA and Admin users to sign
        const [study] = await db.select({ title: studies.title, protocolNo: studies.protocolNo })
            .from(studies).where(eq(studies.id, req.studyId));
        const signatories = await db.select({ name: userTable.name, email: userTable.email, role: userTable.role })
            .from(userTable)
            .where(eq(userTable.role, 'cra'));
        const admins = await db.select({ name: userTable.name, email: userTable.email, role: userTable.role })
            .from(userTable)
            .where(eq(userTable.role, 'admin'));
        const toNotify = [...signatories, ...admins].filter(u => u.email && u.email !== req.user.email);
        for (const u of toNotify) {
            sendDBLockRequestEmail(u.email, u.name, {
                studyTitle:  study?.title   ?? 'Study',
                protocolNo:  study?.protocolNo ?? '—',
                requestedBy: req.user.name,
                role:        u.role === 'cra' ? 'CRA / Monitor' : 'Administrator',
            }).catch(() => {});
        }

        res.status(201).json({ lock, preCheck });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/dblock/:id/sign-cra — CRA electronic signature (password re-entry)
router.post('/:id/sign-cra', requireRole('cra', 'pi', 'admin', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { password } = req.body;
        if (!password) return res.status(400).json({ error: 'Password required for electronic signature' });

        const [lock] = await db.select().from(studyDbLock).where(eq(studyDbLock.id, id));
        if (!lock) return res.status(404).json({ error: 'Lock record not found' });
        if (lock.craSigned) return res.status(409).json({ error: 'CRA already signed' });

        const [acct] = await db.select({ password: account.password }).from(account)
            .where(eq(account.userId, req.user.id) && eq(account.providerId, 'credential'));
        if (!await verifyPassword(acct?.password ?? '', password)) {
            return res.status(401).json({ error: 'Incorrect password — electronic signature rejected' });
        }

        const [updated] = await db.update(studyDbLock)
            .set({
                craSigned:      true,
                craSignedAt:    new Date(),
                craSignedBy:    req.user.id,
                craSignedByName: req.user.name,
                status:          lock.adminSigned ? 'Approved' : 'Pending Approval',
            })
            .where(eq(studyDbLock.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'study_db_lock', recordId: id, action: 'UPDATE',
            fieldName: 'cra_signed', newValue: 'true',
            reason: `CRA electronic signature applied for database lock (ICH E6(R3) §5.5.7)`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/dblock/:id/sign-admin — Admin electronic signature + final lock
router.post('/:id/sign-admin', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { password } = req.body;
        if (!password) return res.status(400).json({ error: 'Password required for electronic signature' });

        const [lock] = await db.select().from(studyDbLock).where(eq(studyDbLock.id, id));
        if (!lock) return res.status(404).json({ error: 'Lock record not found' });
        if (!lock.craSigned) return res.status(400).json({ error: 'CRA must sign before admin approval' });
        if (lock.adminSigned) return res.status(409).json({ error: 'Admin already signed' });

        const [acct] = await db.select({ password: account.password }).from(account)
            .where(eq(account.userId, req.user.id) && eq(account.providerId, 'credential'));
        if (!await verifyPassword(acct?.password ?? '', password)) {
            return res.status(401).json({ error: 'Incorrect password — electronic signature rejected' });
        }

        const now = new Date();
        const [updated] = await db.update(studyDbLock)
            .set({
                adminSigned:      true,
                adminSignedAt:    now,
                adminSignedBy:    req.user.id,
                adminSignedByName: req.user.name,
                status:           'Locked',
                lockedAt:         now,
            })
            .where(eq(studyDbLock.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'study_db_lock', recordId: id, action: 'LOCK',
            fieldName: 'status', oldValue: 'Pending Approval', newValue: 'Locked',
            reason: `Study database locked — dual-signature complete. CRA: ${lock.craSignedByName}, Admin: ${req.user.name}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
