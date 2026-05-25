// Aggregate Reports — Missing Data, Data Completeness (ICH E6(R3) QMS §5.0.7)
import crypto from 'crypto';
import { Router } from 'express';
import { eq, and, inArray } from 'drizzle-orm';
import { db, client } from '../db/connection.js';
import {
    subjects, sites, visits, crfDataEntries, crfForms,
    queries, adverseEvents, protocolDeviations, screeningLog,
} from '../db/schemas/schema.js';

const router = Router();

// GET /api/reports/missing-data?groupBy=site|visit|form
// Returns completion rate per site/visit/form
router.get('/missing-data', async (req, res) => {
    try {
        const groupBy = req.query.groupBy || 'site';
        const sid = req.studyId;

        // Fetch all subjects, visits, entries for this study
        const allSubjects = await db.select({
            id: subjects.id, subjectCode: subjects.subjectCode,
            siteId: subjects.siteId, status: subjects.status,
        }).from(subjects).where(eq(subjects.studyId, sid));

        if (!allSubjects.length) return res.json([]);

        const subjIds = allSubjects.map(s => s.id);

        const allVisits = await db.select({
            id: visits.id, subjectId: visits.subjectId, visitName: visits.visitName,
            formIds: visits.formIds, status: visits.status,
        }).from(visits).where(inArray(visits.subjectId, subjIds));

        const allEntries = await db.select({
            id: crfDataEntries.id, subjectId: crfDataEntries.subjectId,
            visitId: crfDataEntries.visitId, formId: crfDataEntries.formId,
            status: crfDataEntries.status,
        }).from(crfDataEntries).where(inArray(crfDataEntries.subjectId, subjIds));

        const allForms = await db.select({ id: crfForms.id, name: crfForms.name })
            .from(crfForms).where(eq(crfForms.isActive, true));

        const allSites = await db.select({ id: sites.id, name: sites.name, code: sites.code })
            .from(sites);

        // Build lookup maps
        const siteMap   = new Map(allSites.map(s => [s.id, s]));
        const formMap   = new Map(allForms.map(f => [f.id, f]));
        const subjMap   = new Map(allSubjects.map(s => [s.id, s]));
        const entryMap  = new Map(); // key: `${subjectId}-${visitId}-${formId}`
        for (const e of allEntries) {
            entryMap.set(`${e.subjectId}-${e.visitId}-${e.formId}`, e);
        }

        // Compute expected vs completed per groupBy dimension
        const buckets = new Map();

        const getOrCreate = (key, label) => {
            if (!buckets.has(key)) {
                buckets.set(key, { key, label, expected: 0, completed: 0, draft: 0, missing: 0 });
            }
            return buckets.get(key);
        };

        for (const visit of allVisits) {
            const subj = subjMap.get(visit.subjectId);
            if (!subj || subj.status === 'Screen Failed') continue;

            const formIds = Array.isArray(visit.formIds) ? visit.formIds : [];
            for (const formId of formIds) {
                const form = formMap.get(formId);

                let key, label;
                if (groupBy === 'site') {
                    const site = siteMap.get(subj.siteId);
                    key   = `site-${subj.siteId || 'unknown'}`;
                    label = site ? `${site.name} (${site.code})` : 'Unknown Site';
                } else if (groupBy === 'visit') {
                    key   = `visit-${visit.visitName}`;
                    label = visit.visitName;
                } else if (groupBy === 'form') {
                    key   = `form-${formId}`;
                    label = form?.name ?? `Form #${formId}`;
                } else {
                    key = 'all'; label = 'All';
                }

                const bucket = getOrCreate(key, label);
                bucket.expected++;

                const entry = entryMap.get(`${visit.subjectId}-${visit.id}-${formId}`);
                if (!entry) {
                    bucket.missing++;
                } else if (entry.status === 'Draft') {
                    bucket.draft++;
                } else {
                    bucket.completed++;
                }
            }
        }

        const result = Array.from(buckets.values()).map(b => ({
            ...b,
            completionPct: b.expected > 0 ? Math.round((b.completed / b.expected) * 100) : 100,
            missingPct:    b.expected > 0 ? Math.round((b.missing  / b.expected) * 100) : 0,
        }));

        result.sort((a, b) => b.missingPct - a.missingPct);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/data-quality — query rate, deviation rate per site
router.get('/data-quality', async (req, res) => {
    try {
        const sid = req.studyId;

        const allSubjects = await db.select({
            id: subjects.id, siteId: subjects.siteId, status: subjects.status,
        }).from(subjects).where(eq(subjects.studyId, sid));

        if (!allSubjects.length) return res.json([]);

        const allSites   = await db.select({ id: sites.id, name: sites.name, code: sites.code }).from(sites);
        const siteMap    = new Map(allSites.map(s => [s.id, s]));
        const subjIds    = allSubjects.map(s => s.id);

        const [allQueries, allDeviations, allAE] = await Promise.all([
            db.select({ subjectId: queries.subjectId, status: queries.status })
                .from(queries).where(and(eq(queries.studyId, sid))),
            db.select({ subjectId: protocolDeviations.subjectId })
                .from(protocolDeviations).where(eq(protocolDeviations.studyId, sid)),
            db.select({ subjectId: adverseEvents.subjectId, isSerious: adverseEvents.isSerious })
                .from(adverseEvents).where(eq(adverseEvents.studyId, sid)),
        ]);

        const siteStats = new Map();
        for (const subj of allSubjects) {
            if (subj.status === 'Screen Failed') continue;
            const siteId = subj.siteId || 'unknown';
            if (!siteStats.has(siteId)) {
                const site = siteMap.get(siteId);
                siteStats.set(siteId, {
                    siteId, siteName: site?.name ?? 'Unknown', siteCode: site?.code ?? '',
                    subjects: 0, openQueries: 0, totalQueries: 0,
                    deviations: 0, sae: 0,
                });
            }
            siteStats.get(siteId).subjects++;
        }

        for (const q of allQueries) {
            const subj = allSubjects.find(s => s.id === q.subjectId);
            if (!subj) continue;
            const stat = siteStats.get(subj.siteId || 'unknown');
            if (!stat) continue;
            stat.totalQueries++;
            if (q.status === 'Open') stat.openQueries++;
        }
        for (const d of allDeviations) {
            const subj = allSubjects.find(s => s.id === d.subjectId);
            const stat = siteStats.get(subj?.siteId || 'unknown');
            if (stat) stat.deviations++;
        }
        for (const ae of allAE) {
            if (!ae.isSerious) continue;
            const subj = allSubjects.find(s => s.id === ae.subjectId);
            const stat = siteStats.get(subj?.siteId || 'unknown');
            if (stat) stat.sae++;
        }

        const result = Array.from(siteStats.values()).map(s => ({
            ...s,
            queryRate:    s.subjects > 0 ? +(s.totalQueries / s.subjects).toFixed(2) : 0,
            openQueryRate:s.subjects > 0 ? +(s.openQueries  / s.subjects).toFixed(2) : 0,
            deviationRate:s.subjects > 0 ? +(s.deviations   / s.subjects).toFixed(2) : 0,
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/audit-integrity — verify audit trail hash chain
router.get('/audit-integrity', async (req, res) => {
    try {
        const rows = await client.unsafe(
            `SELECT id, table_name, record_id, action, field_name, old_value, new_value,
                    user_id, ip_address, created_at, audit_hash
             FROM audit_trails ORDER BY id ASC LIMIT 1000`
        );

        let tampered = 0;
        const issues = [];

        for (const row of rows) {
            if (!row.audit_hash) continue;
            const createdAt = new Date(row.created_at);
            const raw = [
                row.table_name, String(row.record_id), row.action,
                row.field_name ?? '', row.old_value ?? '', row.new_value ?? '',
                row.user_id ?? '', row.ip_address ?? '',
                createdAt.toISOString(),
            ].join('|');
            const expected = crypto.createHash('sha256').update(raw).digest('hex');
            if (expected !== row.audit_hash) {
                tampered++;
                issues.push({ id: row.id, expected, actual: row.audit_hash });
            }
        }

        res.json({
            checked: rows.length,
            tampered,
            intact:  rows.length - tampered,
            status:  tampered === 0 ? 'PASS' : 'FAIL',
            issues:  issues.slice(0, 20),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/visit-compliance — visit window compliance by site
router.get('/visit-compliance', async (req, res) => {
    try {
        const sid = req.studyId;
        const allSubjects = await db.select({ id: subjects.id, siteId: subjects.siteId, status: subjects.status })
            .from(subjects).where(eq(subjects.studyId, sid));
        if (!allSubjects.length) {
            return res.json({ summary: { total: 0, inWindow: 0, outOfWindow: 0, noDate: 0 }, bySite: [] });
        }
        const subjIds = allSubjects.map(s => s.id);
        const allSites = await db.select({ id: sites.id, name: sites.name, code: sites.code }).from(sites);
        const siteMap  = new Map(allSites.map(s => [s.id, s]));
        const subjMap  = new Map(allSubjects.map(s => [s.id, s]));

        const allVisits = await db.select({
            id: visits.id, subjectId: visits.subjectId, visitName: visits.visitName,
            windowCompliance: visits.windowCompliance, actualDate: visits.actualDate,
        }).from(visits).where(inArray(visits.subjectId, subjIds));

        let totalIn = 0, totalOut = 0, totalNoDate = 0;
        const siteStats = new Map();

        for (const v of allVisits) {
            const subj = subjMap.get(v.subjectId);
            if (!subj || subj.status === 'Screen Failed') continue;
            const siteId = subj.siteId || 'unknown';
            if (!siteStats.has(siteId)) {
                const site = siteMap.get(siteId);
                siteStats.set(siteId, {
                    siteId, siteName: site?.name ?? 'Unknown', siteCode: site?.code ?? '',
                    total: 0, inWindow: 0, outOfWindow: 0, noDate: 0,
                });
            }
            const stat = siteStats.get(siteId);
            stat.total++;
            const wc = (v.windowCompliance || '').toLowerCase();
            if (wc.includes('out of window')) { stat.outOfWindow++; totalOut++; }
            else if (!v.actualDate)            { stat.noDate++;     totalNoDate++; }
            else                               { stat.inWindow++;   totalIn++; }
        }

        res.json({
            summary: { total: allVisits.length, inWindow: totalIn, outOfWindow: totalOut, noDate: totalNoDate },
            bySite: Array.from(siteStats.values()).map(s => ({
                ...s,
                compliancePct: s.total > 0 ? Math.round(((s.total - s.outOfWindow) / s.total) * 100) : 100,
            })).sort((a, b) => a.compliancePct - b.compliancePct),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/query-aging — open query age brackets + avg resolution time
router.get('/query-aging', async (req, res) => {
    try {
        const sid = req.studyId;
        const allQueries = await db.select({
            id: queries.id, status: queries.status,
            raisedAt: queries.raisedAt, resolvedAt: queries.resolvedAt,
        }).from(queries).where(eq(queries.studyId, sid));

        if (!allQueries.length) {
            return res.json({ total: 0, open: 0, resolved: 0, avgResolutionDays: null, brackets: [] });
        }

        const now  = Date.now();
        const brackets = { '0-7d': 0, '8-14d': 0, '15-30d': 0, '>30d': 0 };
        let totalResMs = 0, resolvedCount = 0;

        for (const q of allQueries) {
            if (q.status === 'Open' && q.raisedAt) {
                const ageDays = (now - new Date(q.raisedAt).getTime()) / 86400000;
                if (ageDays <= 7)       brackets['0-7d']++;
                else if (ageDays <= 14) brackets['8-14d']++;
                else if (ageDays <= 30) brackets['15-30d']++;
                else                   brackets['>30d']++;
            }
            if (q.resolvedAt && q.raisedAt) {
                const ms = new Date(q.resolvedAt).getTime() - new Date(q.raisedAt).getTime();
                if (ms >= 0) { totalResMs += ms; resolvedCount++; }
            }
        }

        res.json({
            total:    allQueries.length,
            open:     allQueries.filter(q => q.status === 'Open').length,
            resolved: resolvedCount,
            avgResolutionDays: resolvedCount > 0 ? parseFloat((totalResMs / resolvedCount / 86400000).toFixed(2)) : null,
            brackets: Object.entries(brackets).map(([label, count]) => ({ label, count })),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/data-timeliness — per-site avg days from visit actualDate to first CRF entry
router.get('/data-timeliness', async (req, res) => {
    try {
        const sid = req.studyId;
        const rows = await client`
            SELECT
                COALESCE(si.name, 'Unknown') AS site_name,
                COALESCE(si.code, '')        AS site_code,
                COUNT(*)::int                AS total_entries,
                ROUND(AVG(diff_days)::numeric, 2)   AS avg_days,
                ROUND(MIN(diff_days)::numeric, 2)   AS min_days,
                ROUND(MAX(diff_days)::numeric, 2)   AS max_days,
                COUNT(*) FILTER (WHERE diff_days > 3)::int AS over_3_days,
                COUNT(*) FILTER (WHERE diff_days > 7)::int AS over_7_days
            FROM (
                SELECT
                    s.site_id,
                    EXTRACT(EPOCH FROM (MIN(at2.created_at) - v.actual_date::date)) / 86400 AS diff_days
                FROM visits v
                INNER JOIN subjects s         ON s.id = v.subject_id AND s.study_id = ${sid}
                INNER JOIN crf_data_entries e  ON e.visit_id = v.id
                INNER JOIN audit_trails at2    ON at2.table_name = 'crf_data_entries'
                                              AND at2.record_id  = e.id::text
                                              AND at2.action     = 'INSERT'
                WHERE v.actual_date IS NOT NULL
                  AND v.status      = 'Completed'
                GROUP BY v.id, v.actual_date, s.site_id
                HAVING EXTRACT(EPOCH FROM (MIN(at2.created_at) - v.actual_date::date)) >= 0
            ) sub
            LEFT JOIN sites si ON si.id = sub.site_id
            GROUP BY si.id, si.name, si.code
            ORDER BY avg_days DESC NULLS LAST
        `;

        res.json(rows.map(r => ({
            siteName:     r.site_name,
            siteCode:     r.site_code,
            totalEntries: r.total_entries,
            avgDays:      r.avg_days  != null ? parseFloat(r.avg_days)  : null,
            minDays:      r.min_days  != null ? parseFloat(r.min_days)  : null,
            maxDays:      r.max_days  != null ? parseFloat(r.max_days)  : null,
            over3Days:    r.over_3_days  ?? 0,
            over7Days:    r.over_7_days  ?? 0,
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/critical-data — completion % for critical vs non-critical fields
router.get('/critical-data', async (req, res) => {
    try {
        const sid = req.studyId;
        const allForms = await db.select({ id: crfForms.id, name: crfForms.name, schemaJson: crfForms.schemaJson })
            .from(crfForms).where(eq(crfForms.isActive, true));

        const criticalFormIds = new Set();
        for (const f of allForms) {
            const fields = f.schemaJson?.fields ?? [];
            if (fields.some(field => field.isCritical)) criticalFormIds.add(f.id);
        }

        const allSubjects = await db.select({ id: subjects.id, status: subjects.status })
            .from(subjects).where(eq(subjects.studyId, sid));
        if (!allSubjects.length) {
            return res.json({ critical: { expected: 0, completed: 0, pct: 100, formCount: 0 }, nonCritical: { expected: 0, completed: 0, pct: 100, formCount: 0 } });
        }
        const subjIds = allSubjects.filter(s => s.status !== 'Screen Failed').map(s => s.id);
        if (!subjIds.length) {
            return res.json({ critical: { expected: 0, completed: 0, pct: 100, formCount: criticalFormIds.size }, nonCritical: { expected: 0, completed: 0, pct: 100, formCount: allForms.length - criticalFormIds.size } });
        }

        const allVisits = await db.select({ id: visits.id, formIds: visits.formIds })
            .from(visits).where(inArray(visits.subjectId, subjIds));

        const allEntries = await db.select({ visitId: crfDataEntries.visitId, formId: crfDataEntries.formId, status: crfDataEntries.status })
            .from(crfDataEntries).where(inArray(crfDataEntries.subjectId, subjIds));

        const completedSet = new Set(allEntries.filter(e => e.status !== 'Draft').map(e => `${e.visitId}-${e.formId}`));

        let critExp = 0, critDone = 0, nonCritExp = 0, nonCritDone = 0;
        for (const v of allVisits) {
            for (const fid of (Array.isArray(v.formIds) ? v.formIds : [])) {
                const key = `${v.id}-${fid}`;
                if (criticalFormIds.has(fid)) {
                    critExp++;
                    if (completedSet.has(key)) critDone++;
                } else {
                    nonCritExp++;
                    if (completedSet.has(key)) nonCritDone++;
                }
            }
        }

        res.json({
            critical:    { expected: critExp,    completed: critDone,    pct: critExp    > 0 ? Math.round((critDone    / critExp)    * 100) : 100, formCount: criticalFormIds.size },
            nonCritical: { expected: nonCritExp, completed: nonCritDone, pct: nonCritExp > 0 ? Math.round((nonCritDone / nonCritExp) * 100) : 100, formCount: allForms.length - criticalFormIds.size },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/disposition — subject disposition funnel
router.get('/disposition', async (req, res) => {
    try {
        const sid = req.studyId;
        let screened = 0, screenFailed = 0;
        try {
            const screenRows = await db.select({ disposition: screeningLog.disposition })
                .from(screeningLog).where(eq(screeningLog.studyId, sid));
            screened     = screenRows.length;
            screenFailed = screenRows.filter(r => r.disposition === 'Screen Failed').length;
        } catch { /* table may not exist yet */ }

        const subjectRows = await db.select({ status: subjects.status })
            .from(subjects).where(eq(subjects.studyId, sid));

        const cnt = {};
        for (const r of subjectRows) cnt[r.status] = (cnt[r.status] || 0) + 1;

        const active       = cnt['Active']       || 0;
        const completed    = cnt['Completed']    || 0;
        const withdrawn    = cnt['Withdrawn']    || 0;
        const discontinued = cnt['Discontinued'] || 0;
        const sfSubs       = cnt['Screen Failed'] || 0;
        const totalEnrolled = subjectRows.filter(s => s.status !== 'Screen Failed').length;

        res.json({
            screened:       Math.max(screened, totalEnrolled + sfSubs),
            screenFailed:   Math.max(screenFailed, sfSubs),
            enrolled:       totalEnrolled,
            active,
            completed,
            withdrawn,
            discontinued,
            completionRate: totalEnrolled > 0 ? Math.round((completed    / totalEnrolled) * 100) : 0,
            retentionRate:  totalEnrolled > 0 ? Math.round(((active + completed) / totalEnrolled) * 100) : 100,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
