import { Router } from 'express';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { crfDataEntries, crfForms, subjects, queries } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit, writeFieldDiffAudit } from '../lib/audit.js';
import { validateCRFData } from '../lib/validate.js';

const router = Router();

async function createAutoQueries(db, req, softViolations, entryId, subjectId, visitId, formId) {
    if (!softViolations?.length) return;
    for (const v of softViolations) {
        const [dup] = await db.select({ id: queries.id })
            .from(queries)
            .where(and(
                eq(queries.entryId, entryId),
                eq(queries.fieldKey, v.key),
                inArray(queries.status, ['Open', 'Resolved']),
            ));
        if (!dup) {
            await db.insert(queries).values({
                studyId:      req.studyId,
                subjectId:    parseInt(subjectId),
                visitId:      visitId  ? parseInt(visitId)  : null,
                formId:       formId   ? parseInt(formId)   : null,
                entryId,
                fieldKey:     v.key,
                fieldLabel:   v.label,
                queryText:    `[Auto] ${v.message}`,
                status:       'Open',
                raisedByName: 'Auto-validation',
            });
        }
    }
}

// GET /api/entries?subjectId=&visitId=
router.get('/', async (req, res) => {
    try {
        const { subjectId, visitId } = req.query;
        const conditions = [];
        if (subjectId) conditions.push(eq(crfDataEntries.subjectId, parseInt(subjectId)));
        if (visitId)   conditions.push(eq(crfDataEntries.visitId,   parseInt(visitId)));

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
            .leftJoin(crfForms, eq(crfDataEntries.formId, crfForms.id))
            .where(conditions.length ? and(...conditions) : undefined);

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
            if (existing.status === 'Locked') {
                return res.status(409).json({ error: 'Entry is locked and cannot be modified' });
            }
            if (!reason) {
                return res.status(400).json({ error: 'reason is required when updating an existing entry (21 CFR Part 11)' });
            }

            const [updated] = await db.update(crfDataEntries)
                .set({ dataJson: dataJson ?? {}, status: 'Saved', updatedAt: new Date(), updatedBy: req.user.id })
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

        // Create new
        const [created] = await db.insert(crfDataEntries).values({
            subjectId, visitId, formId,
            dataJson: dataJson ?? {},
            status: (body.status === 'Draft') ? 'Draft' : 'Saved',
            createdBy: req.user.id,
            updatedBy: req.user.id,
        }).returning();

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
        if (!reason) return res.status(400).json({ error: 'Lock reason is required' });

        const [entry] = await db.select().from(crfDataEntries)
            .where(eq(crfDataEntries.id, parseInt(req.params.id)));
        if (!entry) return res.status(404).json({ error: 'Entry not found' });
        if (entry.status === 'Locked') return res.status(409).json({ error: 'Already locked' });

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
        if (!reason) return res.status(400).json({ error: 'Unlock reason is required' });

        const [entry] = await db.select().from(crfDataEntries)
            .where(eq(crfDataEntries.id, parseInt(req.params.id)));
        if (!entry) return res.status(404).json({ error: 'Entry not found' });
        if (entry.status !== 'Locked') return res.status(409).json({ error: 'Entry is not locked' });

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
