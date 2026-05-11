import { Router } from 'express';
import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { subjects, visits, crfDataEntries, queries, auditTrails } from '../db/schemas/schema.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
    try {
        // Run all 6 queries in parallel — single round-trip batch
        const sid = req.studyId;
        const [
            [{ total: totalSubjects }],
            [{ active: activeSubjects }],
            [{ pending: pendingForms }],
            [{ open: openQueries }],
            [{ total: totalVisits }],
            recentAudit,
        ] = await Promise.all([
            db.select({ total: count() }).from(subjects).where(eq(subjects.studyId, sid)),
            db.select({ active: count() }).from(subjects).where(and(eq(subjects.studyId, sid), eq(subjects.status, 'Active'))),
            db.select({ pending: count() }).from(crfDataEntries).where(eq(crfDataEntries.status, 'Draft')),
            db.select({ open: count() }).from(queries).where(and(eq(queries.studyId, sid), eq(queries.status, 'Open'))),
            db.select({ total: count() }).from(visits),
            db.select({
                id:        auditTrails.id,
                action:    auditTrails.action,
                tableName: auditTrails.tableName,
                recordId:  auditTrails.recordId,
                reason:    auditTrails.reason,
                userName:  auditTrails.userName,
                userRole:  auditTrails.userRole,
                createdAt: auditTrails.createdAt,
            }).from(auditTrails)
              .orderBy(desc(auditTrails.createdAt))
              .limit(8),
        ]);

        res.json({
            activeSubjects: Number(activeSubjects),
            totalSubjects:  Number(totalSubjects),
            pendingForms:   Number(pendingForms),
            openQueries:    Number(openQueries),
            totalVisits:    Number(totalVisits),
            recentAudit,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
