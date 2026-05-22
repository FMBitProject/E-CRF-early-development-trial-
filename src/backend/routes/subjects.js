import { Router } from 'express';
import { eq, ilike, and, count, sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { subjects, sites, visits, ieAssessments, crfDataEntries, queries, subjectRandomization } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// GET /api/subjects — list with optional ?status=&search=
router.get('/', async (req, res) => {
    try {
        const { status, search } = req.query;
        const conditions = [eq(subjects.studyId, req.studyId)];
        if (status) conditions.push(eq(subjects.status, status));
        if (search) conditions.push(ilike(subjects.subjectCode, `%${search}%`));
        // Site-scoped: investigator and crc only see subjects at their assigned site
        if (['investigator', 'crc'].includes(req.user.role) && req.user.siteId) {
            conditions.push(eq(subjects.siteId, req.user.siteId));
        }

        const rows = await db
            .select({
                id:             subjects.id,
                subjectCode:    subjects.subjectCode,
                initials:       subjects.initials,
                sex:            subjects.sex,
                genderIdentity: subjects.genderIdentity,
                dateOfBirth:    subjects.dateOfBirth,
                status:         subjects.status,
                enrolledAt:     subjects.enrolledAt,
                siteCode:       sites.code,
                siteName:       sites.name,
            })
            .from(subjects)
            .leftJoin(sites, eq(subjects.siteId, sites.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(subjects.enrolledAt);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/subjects/status-overview — PI/admin/CRA aggregate view: entries, signatures, queries, randomization per subject
router.get('/status-overview', requireRole('pi', 'admin', 'cra', 'data_manager'), async (req, res) => {
    try {
        const studySubjects = await db
            .select({
                id:          subjects.id,
                subjectCode: subjects.subjectCode,
                initials:    subjects.initials,
                status:      subjects.status,
                siteCode:    sites.code,
                siteName:    sites.name,
            })
            .from(subjects)
            .leftJoin(sites, eq(subjects.siteId, sites.id))
            .where(eq(subjects.studyId, req.studyId))
            .orderBy(subjects.subjectCode);

        if (studySubjects.length === 0) return res.json([]);

        const subjectIds = studySubjects.map(s => s.id);

        // Entry counts grouped by subjectId + status
        const entryCounts = await db
            .select({
                subjectId: crfDataEntries.subjectId,
                status:    crfDataEntries.status,
                cnt:       count(),
            })
            .from(crfDataEntries)
            .where(sql`${crfDataEntries.subjectId} = ANY(${sql.raw(`ARRAY[${subjectIds.join(',')}]`)})`)
            .groupBy(crfDataEntries.subjectId, crfDataEntries.status);

        // Count signed entries per subject (join back to crfDataEntries)
        const signedPerSubject = await db
            .select({
                subjectId: crfDataEntries.subjectId,
                cnt:       count(),
            })
            .from(crfDataEntries)
            .where(sql`${crfDataEntries.subjectId} = ANY(ARRAY[${sql.raw(subjectIds.join(','))}])
                AND ${crfDataEntries.id} IN (SELECT entry_id FROM esignatures)`)
            .groupBy(crfDataEntries.subjectId);

        // Open query counts per subject
        const openQueries = await db
            .select({
                subjectId: queries.subjectId,
                cnt:       count(),
            })
            .from(queries)
            .where(sql`${queries.subjectId} = ANY(ARRAY[${sql.raw(subjectIds.join(','))}])
                AND ${queries.status} = 'Open'`)
            .groupBy(queries.subjectId);

        // Randomization status per subject
        const randRows = await db
            .select({
                subjectId:       subjectRandomization.subjectId,
                treatmentArm:    subjectRandomization.treatmentArm,
                randomizedAt:    subjectRandomization.randomizedAt,
            })
            .from(subjectRandomization)
            .where(sql`${subjectRandomization.subjectId} = ANY(ARRAY[${sql.raw(subjectIds.join(','))}])`);

        // Build lookup maps
        const entryMap = {};
        for (const row of entryCounts) {
            if (!entryMap[row.subjectId]) entryMap[row.subjectId] = {};
            entryMap[row.subjectId][row.status] = parseInt(row.cnt);
        }
        const signedMap = Object.fromEntries(signedPerSubject.map(r => [r.subjectId, parseInt(r.cnt)]));
        const queryMap  = Object.fromEntries(openQueries.map(r => [r.subjectId, parseInt(r.cnt)]));
        const randMap   = Object.fromEntries(randRows.map(r => [r.subjectId, r]));

        const result = studySubjects.map(s => {
            const entries = entryMap[s.id] ?? {};
            const totalEntries = Object.values(entries).reduce((a, b) => a + b, 0);
            const rand = randMap[s.id];
            return {
                id:            s.id,
                subjectCode:   s.subjectCode,
                initials:      s.initials,
                status:        s.status,
                siteCode:      s.siteCode,
                siteName:      s.siteName,
                totalEntries,
                draftCount:    entries['Draft']  ?? 0,
                savedCount:    entries['Saved']  ?? 0,
                signedCount:   signedMap[s.id]   ?? 0,
                lockedCount:   entries['Locked'] ?? 0,
                openQueries:   queryMap[s.id]    ?? 0,
                randomized:    !!rand,
                treatmentArm:  rand?.treatmentArm ?? null,
                randomizedAt:  rand?.randomizedAt ?? null,
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/subjects/:id — detail with visits
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db
            .select({
                id:             subjects.id,
                subjectCode:    subjects.subjectCode,
                siteId:         subjects.siteId,
                siteCode:       sites.code,
                siteName:       sites.name,
                initials:       subjects.initials,
                dateOfBirth:    subjects.dateOfBirth,
                sex:            subjects.sex,
                genderIdentity: subjects.genderIdentity,
                enrolledAt:     subjects.enrolledAt,
                status:         subjects.status,
                withdrawnAt:    subjects.withdrawnAt,
                withdrawReason: subjects.withdrawReason,
                enrolledBy:     subjects.enrolledBy,
            })
            .from(subjects)
            .leftJoin(sites, eq(subjects.siteId, sites.id))
            .where(eq(subjects.id, parseInt(req.params.id)));

        if (!row) return res.status(404).json({ error: 'Subject not found' });

        const visitRows = await db.select().from(visits)
            .where(eq(visits.subjectId, parseInt(req.params.id)))
            .orderBy(visits.visitOrder, visits.createdAt);

        res.json({ ...row, visits: visitRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/subjects — enroll new subject (investigator, pi, admin, crc)
router.post('/', requireRole('investigator', 'pi', 'admin', 'crc'), async (req, res) => {
    try {
        const { subjectCode, siteId, initials, dateOfBirth, sex, genderIdentity, enrolledAt } = req.body;
        if (!subjectCode) return res.status(400).json({ error: 'subjectCode is required' });

        const [created] = await db.insert(subjects).values({
            studyId:     req.studyId,
            subjectCode,
            siteId:      siteId ?? null,
            initials:       initials ?? null,
            dateOfBirth:    dateOfBirth ?? null,
            sex:            sex ?? null,
            genderIdentity: genderIdentity ?? null,
            enrolledAt:     enrolledAt ? new Date(enrolledAt) : new Date(),
            enrolledBy:  req.user.id,
        }).returning();

        await writeAudit(db, {
            tableName: 'subjects', recordId: created.id, action: 'INSERT',
            newValue: subjectCode, reason: 'Subject enrolled',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        if (err.message.includes('unique')) {
            return res.status(409).json({ error: 'Subject code already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/subjects/:id/status — withdraw / complete (investigator, admin)
router.patch('/:id/status', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const { status, reason } = req.body;
        const allowedTransitions = ['Completed', 'Withdrawn', 'Screen Failed'];
        if (!allowedTransitions.includes(status)) {
            return res.status(400).json({ error: 'Invalid status transition' });
        }
        if (status === 'Withdrawn' && !reason) {
            return res.status(400).json({ error: 'Withdrawal reason is required' });
        }

        const updates = { status, updatedAt: new Date() };
        if (status === 'Withdrawn') {
            updates.withdrawnAt = new Date();
            updates.withdrawReason = reason;
        }

        const [updated] = await db.update(subjects)
            .set(updates)
            .where(eq(subjects.id, parseInt(req.params.id)))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Subject not found' });

        await writeAudit(db, {
            tableName: 'subjects', recordId: updated.id, action: 'UPDATE',
            fieldName: 'status', newValue: status, reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/subjects/:id/ie-assessment — record I/E criteria assessment
router.post('/:id/ie-assessment', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const subjectId = parseInt(req.params.id);
        const { criteriaJson, passed } = req.body;
        if (!Array.isArray(criteriaJson) || typeof passed !== 'boolean') {
            return res.status(400).json({ error: 'criteriaJson (array) and passed (boolean) are required' });
        }

        const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId));
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        const [assessment] = await db.insert(ieAssessments).values({
            subjectId,
            criteriaJson,
            passed,
            assessedBy:     req.user.id,
            assessedByName: req.user.name,
        }).returning();

        if (!passed) {
            await db.update(subjects)
                .set({ status: 'Screen Failed', updatedAt: new Date() })
                .where(eq(subjects.id, subjectId));

            await writeAudit(db, {
                tableName: 'subjects', recordId: subjectId, action: 'UPDATE',
                fieldName: 'status', oldValue: subject.status, newValue: 'Screen Failed',
                reason: 'Failed Inclusion/Exclusion criteria assessment',
                user: req.user, ipAddress: req.ip,
            });
        }

        res.status(201).json(assessment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/subjects/:id/ie-assessment — fetch I/E assessment history
router.get('/:id/ie-assessment', async (req, res) => {
    try {
        const rows = await db.select().from(ieAssessments)
            .where(eq(ieAssessments.subjectId, parseInt(req.params.id)))
            .orderBy(ieAssessments.assessedAt);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
