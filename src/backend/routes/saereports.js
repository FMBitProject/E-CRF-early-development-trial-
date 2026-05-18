// SAE Expedited Reporting — ICH E2A §4
// 7-day: fatal/life-threatening | 15-day: all other serious AEs

import { Router } from 'express';
import { eq, and, desc, lt } from 'drizzle-orm';
import { verifyPassword } from '@better-auth/utils/password';
import { db } from '../db/connection.js';
import { saeReports, adverseEvents, subjects, account } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

async function checkPassword(userId, password) {
    const [acct] = await db
        .select({ password: account.password })
        .from(account)
        .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
    if (!acct?.password) return false;
    return verifyPassword(acct.password, password);
}

const router = Router();

function isMissingTable(err) {
    const c = err?.cause;
    return err?.code === '42P01' || c?.code === '42P01' ||
           (err?.message || '').includes('does not exist') ||
           (c?.message || '').includes('does not exist');
}

function calcDeadline(day0Date, deadlineDays) {
    const d = new Date(day0Date);
    d.setDate(d.getDate() + deadlineDays);
    return d;
}

// GET /api/saereports — list all SAE reports with AE + subject info
router.get('/', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const { aeId, status } = req.query;
        const conditions = [eq(adverseEvents.studyId, req.studyId)];
        if (aeId)   conditions.push(eq(saeReports.aeId, parseInt(aeId)));
        if (status) conditions.push(eq(saeReports.status, status));

        const rows = await db
            .select({
                id:               saeReports.id,
                aeId:             saeReports.aeId,
                aeTerm:           adverseEvents.aeTerm,
                subjectCode:      subjects.subjectCode,
                reportType:       saeReports.reportType,
                reportNumber:     saeReports.reportNumber,
                day0Date:         saeReports.day0Date,
                deadlineDays:     saeReports.deadlineDays,
                deadlineDate:     saeReports.deadlineDate,
                submittedAt:      saeReports.submittedAt,
                submissionRef:    saeReports.submissionRef,
                submittedTo:      saeReports.submittedTo,
                narrative:        saeReports.narrative,
                status:           saeReports.status,
                submittedByName:  saeReports.submittedByName,
                createdByName:    saeReports.createdByName,
                createdAt:        saeReports.createdAt,
            })
            .from(saeReports)
            .leftJoin(adverseEvents, eq(saeReports.aeId, adverseEvents.id))
            .leftJoin(subjects, eq(adverseEvents.subjectId, subjects.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(saeReports.createdAt));

        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.json([]);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/saereports/overdue — reports past deadline not yet submitted
router.get('/overdue', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const now = new Date();
        const rows = await db
            .select({
                id:           saeReports.id,
                aeId:         saeReports.aeId,
                aeTerm:       adverseEvents.aeTerm,
                subjectCode:  subjects.subjectCode,
                reportType:   saeReports.reportType,
                deadlineDays: saeReports.deadlineDays,
                deadlineDate: saeReports.deadlineDate,
                status:       saeReports.status,
                createdByName: saeReports.createdByName,
            })
            .from(saeReports)
            .leftJoin(adverseEvents, eq(saeReports.aeId, adverseEvents.id))
            .leftJoin(subjects, eq(adverseEvents.subjectId, subjects.id))
            .where(and(eq(adverseEvents.studyId, req.studyId), eq(saeReports.status, 'Pending'), lt(saeReports.deadlineDate, now)))
            .orderBy(saeReports.deadlineDate);

        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.json([]);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/saereports/:id — single SAE report
router.get('/:id', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const [row] = await db.select().from(saeReports)
            .where(eq(saeReports.id, parseInt(req.params.id)));
        if (!row) return res.status(404).json({ error: 'SAE report not found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/saereports — create SAE report (pi/cra/admin)
router.post('/', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const { aeId, reportType, day0Date, deadlineDays, submittedTo, narrative } = req.body;

        if (!aeId || !reportType || !day0Date || !deadlineDays) {
            return res.status(400).json({ error: 'aeId, reportType, day0Date, and deadlineDays are required' });
        }

        const days = parseInt(deadlineDays);
        if (![7, 15].includes(days)) {
            return res.status(400).json({ error: 'deadlineDays must be 7 or 15 (ICH E2A)' });
        }

        const [ae] = await db.select({ id: adverseEvents.id, isSerious: adverseEvents.isSerious })
            .from(adverseEvents).where(eq(adverseEvents.id, parseInt(aeId)));
        if (!ae) return res.status(404).json({ error: 'Adverse event not found' });
        if (!ae.isSerious) return res.status(400).json({ error: 'Only serious adverse events require expedited reports' });

        // Find the report number (sequential per AE)
        const existing = await db.select({ id: saeReports.id })
            .from(saeReports).where(eq(saeReports.aeId, parseInt(aeId)));
        const reportNumber = existing.length + 1;

        const deadlineDate = calcDeadline(day0Date, days);

        const [record] = await db.insert(saeReports).values({
            aeId:          parseInt(aeId),
            reportType,
            reportNumber,
            day0Date,
            deadlineDays:  days,
            deadlineDate,
            submittedTo:   submittedTo ?? null,
            narrative:     narrative ?? null,
            status:        'Pending',
            createdBy:     req.user.id,
            createdByName: req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'sae_reports', recordId: record.id, action: 'INSERT',
            newValue: `${reportType} SAE report #${reportNumber} — deadline ${days}d (${deadlineDate.toLocaleDateString()})`,
            reason: `SAE expedited reporting per ICH E2A §4 (${days}-day requirement)`,
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/saereports/:id/sign — e-sign by investigator (ICH GCP E6(R3) C.4.4)
router.patch('/:id/sign', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { password, meaning } = req.body;
        if (!password || !meaning) {
            return res.status(400).json({ error: 'password and meaning are required' });
        }

        const [existing] = await db.select().from(saeReports).where(eq(saeReports.id, id));
        if (!existing) return res.status(404).json({ error: 'SAE report not found' });
        if (existing.signedAt) {
            return res.status(409).json({ error: 'Already signed' });
        }

        const ok = await checkPassword(req.user.id, password);
        if (!ok) return res.status(401).json({ error: 'Invalid password' });

        const now = new Date();
        const [updated] = await db.update(saeReports).set({
            signedBy:       req.user.id,
            signedByName:   req.user.name,
            signedAt:       now,
            signingMeaning: meaning,
            updatedAt:      now,
        }).where(eq(saeReports.id, id)).returning();

        await writeAudit(db, {
            tableName: 'sae_reports', recordId: id, action: 'UPDATE',
            fieldName: 'signed_at',
            newValue: `Signed by ${req.user.name} | Meaning: ${meaning}`,
            reason: `SAE report e-signed — ${meaning}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/saereports/:id/submit — mark SAE report as submitted
router.patch('/:id/submit', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { submissionRef, narrative } = req.body;

        const [existing] = await db.select().from(saeReports).where(eq(saeReports.id, id));
        if (!existing) return res.status(404).json({ error: 'SAE report not found' });
        if (existing.status === 'Submitted' || existing.status === 'Late Submission') {
            return res.status(409).json({ error: 'Already submitted' });
        }
        if (!existing.signedAt) {
            return res.status(400).json({ error: 'SAE report must be signed by an investigator before submission (ICH GCP E6(R3) C.4.4)' });
        }

        const now = new Date();
        const isLate = now > new Date(existing.deadlineDate);
        const newStatus = isLate ? 'Late Submission' : 'Submitted';
        const daysLate = isLate
            ? Math.ceil((now - new Date(existing.deadlineDate)) / 86400000)
            : 0;

        const [updated] = await db.update(saeReports).set({
            status:          newStatus,
            submittedAt:     now,
            submissionRef:   submissionRef ?? existing.submissionRef,
            narrative:       narrative ?? existing.narrative,
            submittedBy:     req.user.id,
            submittedByName: req.user.name,
            updatedAt:       now,
        }).where(eq(saeReports.id, id)).returning();

        const auditReason = isLate
            ? `LATE SUBMISSION — ${daysLate} day(s) past ${existing.deadlineDays}-day deadline${submissionRef ? ` | ref: ${submissionRef}` : ''}`
            : `SAE submitted within ${existing.deadlineDays}-day deadline${submissionRef ? ` | ref: ${submissionRef}` : ''}`;

        await writeAudit(db, {
            tableName: 'sae_reports', recordId: id, action: 'UPDATE',
            fieldName: 'status', oldValue: existing.status, newValue: newStatus,
            reason: auditReason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
