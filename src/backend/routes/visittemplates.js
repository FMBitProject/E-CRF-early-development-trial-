import { Router } from 'express';
import { client } from '../db/connection.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { db } from '../db/connection.js';

const router = Router();

// ── GET /api/visit-templates — list templates for current study
router.get('/', async (req, res) => {
    try {
        const rows = await client`
            SELECT vst.*,
                   COUNT(vsi.id)::int AS visit_count
            FROM visit_schedule_templates vst
            LEFT JOIN visit_schedule_items vsi ON vsi.template_id = vst.id
            WHERE vst.study_id = ${req.studyId}
            GROUP BY vst.id
            ORDER BY vst.created_at DESC`;
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/visit-templates/:id — template + items + form names
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [tmpl] = await client`
            SELECT * FROM visit_schedule_templates
            WHERE id = ${id} AND study_id = ${req.studyId}`;
        if (!tmpl) return res.status(404).json({ error: 'Template not found' });

        const items = await client`
            SELECT vsi.*,
                   COALESCE(
                       array_agg(cf.name ORDER BY cf.name) FILTER (WHERE cf.id IS NOT NULL),
                       '{}'::text[]
                   ) AS form_names
            FROM visit_schedule_items vsi
            LEFT JOIN LATERAL unnest(vsi.form_ids) AS fid(id) ON TRUE
            LEFT JOIN crf_forms cf ON cf.id = fid.id
            WHERE vsi.template_id = ${id}
            GROUP BY vsi.id
            ORDER BY vsi.visit_order`;

        res.json({ ...tmpl, items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/visit-templates — create template (admin, pi)
router.post('/', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const { name, description, items } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });
        if (!Array.isArray(items) || items.length === 0)
            return res.status(400).json({ error: 'items array is required' });

        for (let i = 0; i < items.length; i++) {
            if (!items[i].visitName) return res.status(400).json({ error: `items[${i}].visitName is required` });
            if (items[i].visitOrder == null) return res.status(400).json({ error: `items[${i}].visitOrder is required` });
        }

        const [tmpl] = await client`
            INSERT INTO visit_schedule_templates
                (study_id, name, description, is_active, created_by, created_by_name, created_at, updated_at)
            VALUES (${req.studyId}, ${name.trim()}, ${description ?? null},
                    TRUE, ${req.user.id}, ${req.user.name}, NOW(), NOW())
            RETURNING *`;

        const insertedItems = [];
        for (const it of items) {
            const formIds = Array.isArray(it.formIds) ? it.formIds.map(Number) : [];
            const [row] = await client`
                INSERT INTO visit_schedule_items
                    (template_id, visit_name, visit_order, visit_type, study_day,
                     window_days_before, window_days_after, form_ids, is_mandatory, notes)
                VALUES (${tmpl.id}, ${it.visitName.trim()}, ${parseInt(it.visitOrder)},
                        ${it.visitType ?? 'Scheduled'}, ${it.studyDay ?? null},
                        ${it.windowDaysBefore ?? 3}, ${it.windowDaysAfter ?? 3},
                        ${formIds}, ${it.isMandatory !== false}, ${it.notes ?? null})
                RETURNING *`;
            insertedItems.push(row);
        }

        await writeAudit(db, {
            tableName: 'visit_schedule_templates', recordId: tmpl.id, action: 'INSERT',
            newValue: `Template "${name}" with ${items.length} visits`,
            reason: 'Visit schedule template created',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json({ ...tmpl, items: insertedItems });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /api/visit-templates/:id — replace template + items (admin, pi)
router.put('/:id', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, description, items, reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required' });

        const [existing] = await client`
            SELECT id, name FROM visit_schedule_templates
            WHERE id = ${id} AND study_id = ${req.studyId}`;
        if (!existing) return res.status(404).json({ error: 'Template not found' });

        await client`
            UPDATE visit_schedule_templates
            SET name = ${name ?? existing.name}, description = ${description ?? null}, updated_at = NOW()
            WHERE id = ${id}`;

        if (Array.isArray(items)) {
            await client`DELETE FROM visit_schedule_items WHERE template_id = ${id}`;
            for (const it of items) {
                const formIds = Array.isArray(it.formIds) ? it.formIds.map(Number) : [];
                await client`
                    INSERT INTO visit_schedule_items
                        (template_id, visit_name, visit_order, visit_type, study_day,
                         window_days_before, window_days_after, form_ids, is_mandatory, notes)
                    VALUES (${id}, ${it.visitName.trim()}, ${parseInt(it.visitOrder)},
                            ${it.visitType ?? 'Scheduled'}, ${it.studyDay ?? null},
                            ${it.windowDaysBefore ?? 3}, ${it.windowDaysAfter ?? 3},
                            ${Array.isArray(it.formIds) ? it.formIds.map(Number) : []},
                            ${it.isMandatory !== false}, ${it.notes ?? null})`;
            }
        }

        await writeAudit(db, {
            tableName: 'visit_schedule_templates', recordId: id, action: 'UPDATE',
            reason,
            user: req.user, ipAddress: req.ip,
        });

        const updatedItems = await client`
            SELECT * FROM visit_schedule_items WHERE template_id = ${id} ORDER BY visit_order`;
        res.json({ id, items: updatedItems });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/visit-templates/:id (admin)
router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required' });

        const [existing] = await client`
            SELECT id, name FROM visit_schedule_templates
            WHERE id = ${id} AND study_id = ${req.studyId}`;
        if (!existing) return res.status(404).json({ error: 'Template not found' });

        await client`DELETE FROM visit_schedule_items WHERE template_id = ${id}`;
        await client`DELETE FROM visit_schedule_templates WHERE id = ${id}`;

        await writeAudit(db, {
            tableName: 'visit_schedule_templates', recordId: id, action: 'DELETE',
            oldValue: `Template "${existing.name}"`,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ deleted: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/visit-templates/:id/generate/:subjectId
// Generate scheduled visits for a subject from the template
router.post('/:id/generate/:subjectId', requireRole('admin', 'pi', 'investigator'), async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);
        const subjectId  = parseInt(req.params.subjectId);
        const { enrollmentDate, overwrite } = req.body;

        const [tmpl] = await client`
            SELECT * FROM visit_schedule_templates
            WHERE id = ${templateId} AND study_id = ${req.studyId}`;
        if (!tmpl) return res.status(404).json({ error: 'Template not found' });

        const [subject] = await client`
            SELECT * FROM subjects WHERE id = ${subjectId} AND study_id = ${req.studyId}`;
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        const baseDate = enrollmentDate
            ? new Date(enrollmentDate)
            : new Date(subject.enrolled_at);

        const items = await client`
            SELECT * FROM visit_schedule_items WHERE template_id = ${templateId} ORDER BY visit_order`;

        if (!items.length) return res.status(400).json({ error: 'Template has no visit items' });

        if (overwrite) {
            // Remove existing scheduled visits that have no CRF entries
            await client`
                DELETE FROM visits v
                WHERE v.subject_id = ${subjectId}
                  AND v.status = 'Scheduled'
                  AND NOT EXISTS (
                      SELECT 1 FROM crf_data_entries e WHERE e.visit_id = v.id
                  )`;
        }

        const created = [];
        for (const item of items) {
            const plannedDate = item.study_day != null
                ? new Date(baseDate.getTime() + item.study_day * 86400000).toISOString().split('T')[0]
                : null;

            const windowDays = (item.window_days_before ?? 3) + (item.window_days_after ?? 3);

            const itemFormIds = Array.isArray(item.form_ids) ? item.form_ids.filter(Boolean) : [];
            const [visit] = await client`
                INSERT INTO visits
                    (subject_id, visit_name, visit_order, visit_type, planned_date,
                     window_days, study_day, form_ids, status, created_by_name, created_at, updated_at)
                VALUES (${subjectId}, ${item.visit_name}, ${item.visit_order},
                        ${item.visit_type ?? 'Scheduled'}, ${plannedDate},
                        ${windowDays}, ${item.study_day ?? null},
                        ${itemFormIds}, 'Scheduled', ${req.user.name}, NOW(), NOW())
                RETURNING *`;
            created.push(visit);
        }

        await writeAudit(db, {
            tableName: 'visits', recordId: subjectId, action: 'INSERT',
            newValue: `Generated ${created.length} visits from template "${tmpl.name}"`,
            reason: 'Visit schedule generated from template',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json({ generated: created.length, visits: created });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
