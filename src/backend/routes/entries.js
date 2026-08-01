import { Router } from 'express';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { crfDataEntries, crfForms, subjects, queries } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit, writeFieldDiffAudit } from '../lib/audit.js';
import { validateCRFData } from '../lib/validate.js';
import { siteCondition, subjectInSiteScope } from '../lib/sitescope.js';
import { isUniqueViolation } from '../lib/dberrors.js';
import {
    canUpdateEntry, canLockEntry, canUnlockEntry,
    checkEntryScope, statusAfterUpdate, statusForNewEntry,
} from '../lib/entryrules.js';
import {
    pendingAutoQueries, autoQueryText, AUTO_QUERY_AUTHOR, ACTIVE_QUERY_STATUSES,
} from '../lib/queryrules.js';

const router = Router();

export async function createAutoQueries(db, req, softViolations, entryId, subjectId, visitId, formId) {
    if (!softViolations?.length) return;

    const existing = await db.select({ fieldKey: queries.fieldKey, status: queries.status })
        .from(queries)
        .where(and(
            eq(queries.entryId, entryId),
            inArray(queries.status, ACTIVE_QUERY_STATUSES),
        ));

    for (const v of pendingAutoQueries(softViolations, existing)) {
        await db.insert(queries).values({
            studyId:      req.studyId,
            subjectId:    parseInt(subjectId),
            visitId:      visitId  ? parseInt(visitId)  : null,
            formId:       formId   ? parseInt(formId)   : null,
            entryId,
            fieldKey:     v.key,
            fieldLabel:   v.label,
            queryText:    autoQueryText(v),
            status:       'Open',
            raisedByName: AUTO_QUERY_AUTHOR,
        });
    }
}

// GET /api/entries?subjectId=&visitId=
router.get('/', async (req, res) => {
    try {
        const { subjectId, visitId } = req.query;
        // crf_data_entries has no study_id column — scope via the subject's study
        const conditions = [eq(subjects.studyId, req.studyId)];
        if (subjectId) conditions.push(eq(crfDataEntries.subjectId, parseInt(subjectId)));
        if (visitId)   conditions.push(eq(crfDataEntries.visitId,   parseInt(visitId)));
        const siteCond = siteCondition(req);
        if (siteCond) conditions.push(siteCond);

        const rows = await db
            .select({
                id:         crfDataEntries.id,
                subjectId:  crfDataEntries.subjectId,
                visitId:    crfDataEntries.visitId,
                formId:     crfDataEntries.formId,
                dataJson:   crfDataEntries.dataJson,
                status:     crfDataEntries.status,
                lockedAt:   crfDataEntries.lockedAt,
                lockedBy:   crfDataEntries.lockedBy,
                lockReason: crfDataEntries.lockReason,
                createdAt:  crfDataEntries.createdAt,
                updatedAt:  crfDataEntries.updatedAt,
                formName:   crfForms.name,
            })
            .from(crfDataEntries)
            .innerJoin(subjects, eq(crfDataEntries.subjectId, subjects.id))
            .leftJoin(crfForms, eq(crfDataEntries.formId, crfForms.id))
            .where(and(...conditions));

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/entries — upsert (create or update) a data entry
router.post('/', requireRole('investigator', 'pi', 'admin', 'crc'), async (req, res) => {
    try {
        const body = req.body;
        const { subjectId, visitId, formId, dataJson, reason } = body;
        if (!subjectId || !visitId || !formId) {
            return res.status(400).json({ error: 'subjectId, visitId, formId are required' });
        }

        // Subject must belong to the active study (entries are not study-scoped directly)
        const [subject] = await db.select({ studyId: subjects.studyId, siteId: subjects.siteId }).from(subjects)
            .where(eq(subjects.id, parseInt(subjectId)));
        const scope = checkEntryScope({ subject, activeStudyId: req.studyId, siteScope: req.siteScope });
        if (!scope.ok) return res.status(scope.status).json({ error: scope.error });

        // Load form schema for validation
        const [form] = await db.select().from(crfForms).where(eq(crfForms.id, formId));
        if (!form) return res.status(404).json({ error: 'Form not found' });

        const schemaFields = form.schemaJson?.fields ?? [];
        const { valid, errors, warnings, softViolations } = validateCRFData(dataJson ?? {}, schemaFields);
        if (!valid) return res.status(422).json({ error: 'Validation failed', errors });

        // Check for existing entry
        const [existing] = await db.select().from(crfDataEntries)
            .where(and(
                eq(crfDataEntries.subjectId, subjectId),
                eq(crfDataEntries.visitId, visitId),
                eq(crfDataEntries.formId, formId),
            ));

        if (existing) {
            const guard = canUpdateEntry(existing, { reason });
            if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

            const [updated] = await db.update(crfDataEntries)
                .set({ dataJson: dataJson ?? {}, status: statusAfterUpdate(), updatedAt: new Date(), updatedBy: req.user.id })
                .where(eq(crfDataEntries.id, existing.id))
                .returning();

            await writeFieldDiffAudit(db, {
                tableName: 'crf_data_entries', recordId: existing.id,
                oldData: existing.dataJson, newData: dataJson,
                reason, user: req.user, ipAddress: req.ip,
            });

            await createAutoQueries(db, req, softViolations, existing.id, subjectId, visitId, formId);
            return res.json({ entry: updated, warnings });
        }

        // Create new.
        // The select-then-insert above cannot be made atomic on its own — there
        // is no row to lock before the first insert — so idx_crf_entry_unique
        // settles it. Losing that race means someone else saved this form for
        // this visit while the page was open.
        //
        // Only this statement is wrapped: crf_data_entries has exactly one
        // unique index, so a violation here needs no constraint-name check and
        // has no fallback hole if the driver omits the name. Catching around
        // the whole handler would have mapped a unique violation raised by the
        // audit or auto-query writes below onto this message.
        let created;
        try {
            [created] = await db.insert(crfDataEntries).values({
                subjectId, visitId, formId,
                dataJson: dataJson ?? {},
                status: statusForNewEntry(body.status),
                createdBy: req.user.id,
                updatedBy: req.user.id,
            }).returning();
        } catch (insertErr) {
            if (isUniqueViolation(insertErr)) {
                return res.status(409).json({
                    error: 'This form was saved for this visit by someone else while you were editing. Reload to see their entry before saving again.',
                });
            }
            throw insertErr;
        }

        await writeAudit(db, {
            tableName: 'crf_data_entries', recordId: created.id, action: 'INSERT',
            reason: reason ?? 'Initial data entry',
            user: req.user, ipAddress: req.ip,
        });

        await createAutoQueries(db, req, softViolations, created.id, subjectId, visitId, formId);
        res.status(201).json({ entry: created, warnings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/entries/:id/lock — CRA or admin locks an entry
router.patch('/:id/lock', requireRole('cra', 'pi', 'admin'), async (req, res) => {
    try {
        const { reason } = req.body;

        const [row] = await db.select({ entry: crfDataEntries, studyId: subjects.studyId })
            .from(crfDataEntries)
            .innerJoin(subjects, eq(crfDataEntries.subjectId, subjects.id))
            .where(eq(crfDataEntries.id, parseInt(req.params.id)));
        const entry = (row && row.studyId === req.studyId) ? row.entry : null;
        if (entry && !(await subjectInSiteScope(req, entry.subjectId))) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        const guard = canLockEntry(entry, { reason });
        if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

        const [locked] = await db.update(crfDataEntries)
            .set({ status: 'Locked', lockedAt: new Date(), lockedBy: req.user.id, lockReason: reason, updatedAt: new Date() })
            .where(eq(crfDataEntries.id, entry.id))
            .returning();

        await writeAudit(db, {
            tableName: 'crf_data_entries', recordId: entry.id, action: 'LOCK',
            reason, user: req.user, ipAddress: req.ip,
        });

        res.json(locked);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/entries/:id/unlock — admin only
router.patch('/:id/unlock', requireRole('admin'), async (req, res) => {
    try {
        const { reason } = req.body;

        const [row] = await db.select({ entry: crfDataEntries, studyId: subjects.studyId })
            .from(crfDataEntries)
            .innerJoin(subjects, eq(crfDataEntries.subjectId, subjects.id))
            .where(eq(crfDataEntries.id, parseInt(req.params.id)));
        const entry = (row && row.studyId === req.studyId) ? row.entry : null;
        const guard = canUnlockEntry(entry, { reason });
        if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

        const [unlocked] = await db.update(crfDataEntries)
            .set({ status: 'Saved', unlockedAt: new Date(), unlockedBy: req.user.id, unlockReason: reason, updatedAt: new Date() })
            .where(eq(crfDataEntries.id, entry.id))
            .returning();

        await writeAudit(db, {
            tableName: 'crf_data_entries', recordId: entry.id, action: 'UNLOCK',
            reason, user: req.user, ipAddress: req.ip,
        });

        res.json(unlocked);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
