// Aggregate Reports — Missing Data, Data Completeness (ICH E6(R3) QMS §5.0.7)
import crypto from 'crypto';
import { Router } from 'express';
import { eq, and, inArray } from 'drizzle-orm';
import { db, client } from '../db/connection.js';
import {
    subjects, sites, visits, crfDataEntries, crfForms,
    queries, adverseEvents, protocolDeviations,
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

export default router;
