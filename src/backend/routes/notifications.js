// In-app notification checks — SAE deadlines, open queries, expiring training
import { Router } from 'express';
import { eq, and, lt, gte } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { saeReports, adverseEvents, subjects, queries, trainingRecords } from '../db/schemas/schema.js';
import { sendSAEDeadlineEmail } from '../lib/email.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// GET /api/notifications — aggregate alerts for current study (all authed roles)
router.get('/', async (req, res) => {
    try {
        const studyId  = req.studyId;
        const now      = new Date();
        const in48h    = new Date(now.getTime() + 48 * 3600 * 1000);

        const alerts = [];

        // 1. SAE reports approaching or past deadline
        const pendingSAEReports = await db
            .select({
                id:           saeReports.id,
                aeId:         saeReports.aeId,
                aeTerm:       adverseEvents.aeTerm,
                subjectCode:  subjects.subjectCode,
                reportType:   saeReports.reportType,
                deadlineDate: saeReports.deadlineDate,
                deadlineDays: saeReports.deadlineDays,
                status:       saeReports.status,
            })
            .from(saeReports)
            .leftJoin(adverseEvents, eq(saeReports.aeId, adverseEvents.id))
            .leftJoin(subjects, eq(adverseEvents.subjectId, subjects.id))
            .where(and(
                eq(adverseEvents.studyId, studyId),
                eq(saeReports.status, 'Pending'),
                lt(saeReports.deadlineDate, in48h),
            ));

        for (const r of pendingSAEReports) {
            const deadline  = new Date(r.deadlineDate);
            const hoursLeft = Math.round((deadline - now) / 3600000);
            const isOverdue = deadline < now;
            alerts.push({
                type:     isOverdue ? 'danger' : 'warning',
                category: 'sae_deadline',
                title:    isOverdue
                    ? `SAE Report OVERDUE — ${r.subjectCode}`
                    : `SAE Report Due in ${hoursLeft}h — ${r.subjectCode}`,
                body:     `${r.aeTerm} · ${r.reportType} · Deadline: ${deadline.toLocaleDateString()}`,
                link:     '#saereports',
                meta:     { saeReportId: r.id, aeId: r.aeId, hoursLeft },
            });
        }

        // 2. Open queries count
        const openQueriesRows = await db
            .select({ id: queries.id, subjectId: queries.subjectId, raisedAt: queries.raisedAt })
            .from(queries)
            .where(and(eq(queries.studyId, studyId), eq(queries.status, 'Open')));

        if (openQueriesRows.length > 0) {
            // Flag queries open > 7 days
            const staleQueries = openQueriesRows.filter(q => {
                const age = (now - new Date(q.raisedAt)) / 86400000;
                return age > 7;
            });
            alerts.push({
                type:     staleQueries.length > 0 ? 'warning' : 'info',
                category: 'open_queries',
                title:    `${openQueriesRows.length} Open Quer${openQueriesRows.length === 1 ? 'y' : 'ies'}`,
                body:     staleQueries.length > 0
                    ? `${staleQueries.length} quer${staleQueries.length === 1 ? 'y' : 'ies'} open for more than 7 days`
                    : 'Review and respond to open queries',
                link: '#queries',
                meta: { count: openQueriesRows.length, staleCount: staleQueries.length },
            });
        }

        // 3. Expiring training records (within 30 days)
        const in30d = new Date(now.getTime() + 30 * 86400000);
        try {
            const expiringTraining = await db
                .select({ id: trainingRecords.id, userName: trainingRecords.userName, trainingType: trainingRecords.trainingType, expiryDate: trainingRecords.expiryDate })
                .from(trainingRecords)
                .where(and(
                    eq(trainingRecords.studyId, studyId),
                    gte(trainingRecords.expiryDate, now),
                    lt(trainingRecords.expiryDate, in30d),
                ));

            if (expiringTraining.length > 0) {
                alerts.push({
                    type:     'warning',
                    category: 'training_expiry',
                    title:    `${expiringTraining.length} Training Record${expiringTraining.length > 1 ? 's' : ''} Expiring Soon`,
                    body:     expiringTraining.map(t => `${t.userName} — ${t.trainingType}`).join(', '),
                    link:     '#delegation',
                    meta:     { records: expiringTraining },
                });
            }
        } catch {} // table may not exist yet in older deployments

        res.json({
            timestamp: now.toISOString(),
            count:     alerts.length,
            alerts,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/notifications/send-sae-deadline-emails — trigger SAE deadline emails (admin/cra)
router.post('/send-sae-deadline-emails', requireRole('admin', 'cra'), async (req, res) => {
    try {
        const studyId = req.studyId;
        const now     = new Date();
        const in48h   = new Date(now.getTime() + 48 * 3600 * 1000);

        const pending = await db
            .select({
                id:           saeReports.id,
                aeTerm:       adverseEvents.aeTerm,
                subjectCode:  subjects.subjectCode,
                reportType:   saeReports.reportType,
                deadlineDate: saeReports.deadlineDate,
            })
            .from(saeReports)
            .leftJoin(adverseEvents, eq(saeReports.aeId, adverseEvents.id))
            .leftJoin(subjects, eq(adverseEvents.subjectId, subjects.id))
            .where(and(
                eq(adverseEvents.studyId, studyId),
                eq(saeReports.status, 'Pending'),
                lt(saeReports.deadlineDate, in48h),
            ));

        let sent = 0;
        for (const r of pending) {
            const deadline    = new Date(r.deadlineDate);
            const hoursLeft   = Math.round((deadline - now) / 3600000);
            if (req.user?.email) {
                await sendSAEDeadlineEmail(req.user.email, req.user.name, {
                    subjectCode:   r.subjectCode,
                    aeTerm:        r.aeTerm,
                    deadlineDate:  deadline.toLocaleDateString(),
                    reportType:    r.reportType,
                    hoursRemaining: hoursLeft,
                }).catch(() => {});
                sent++;
            }
        }

        res.json({ sent, pending: pending.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
