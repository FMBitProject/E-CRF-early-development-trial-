import { Router } from 'express';
import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { crfForms, crfDataEntries } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { orgCondition, sameOrg, effectiveOrgId } from '../lib/tenantscope.js';

const router = Router();

const VALID_FIELD_TYPES = ['text', 'number', 'date', 'datetime', 'textarea', 'select', 'radio', 'checkbox', 'boolean'];

function validateSchema(schemaJson) {
    const errors = [];
    if (!schemaJson || typeof schemaJson !== 'object') return ['schemaJson must be an object'];
    const fields = schemaJson.fields;
    if (!Array.isArray(fields)) return ['schemaJson.fields must be an array'];
    if (fields.length === 0) errors.push('At least one field is required');

    const keys = new Set();
    fields.forEach((f, i) => {
        if (!f.key)   errors.push(`fields[${i}]: key is required`);
        if (!f.label) errors.push(`fields[${i}]: label is required`);
        if (!f.type || !VALID_FIELD_TYPES.includes(f.type))
            errors.push(`fields[${i}]: type must be one of ${VALID_FIELD_TYPES.join(', ')}`);
        if (f.key && keys.has(f.key)) errors.push(`fields[${i}]: duplicate key "${f.key}"`);
        if (f.key) keys.add(f.key);
        if ((f.type === 'select' || f.type === 'radio') && (!Array.isArray(f.options) || f.options.length === 0))
            errors.push(`fields[${i}]: select/radio requires options array`);
    });
    return errors;
}

// GET /api/forms — list all active CRF form templates
router.get('/', async (req, res) => {
    try {
        const { all } = req.query;
        const rows = await db.select({
            id:          crfForms.id,
            name:        crfForms.name,
            description: crfForms.description,
            version:     crfForms.version,
            isActive:    crfForms.isActive,
            createdAt:   crfForms.createdAt,
        }).from(crfForms)
            .where(orgCondition(req, crfForms.organizationId))   // tenant-scoped library
            .orderBy(desc(crfForms.createdAt));
        // By default return only active; admin can pass ?all=1 to see all
        const filtered = (all && req.user?.role === 'admin') ? rows : rows.filter(r => r.isActive);
        res.json(filtered);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/forms/:id — single form with schema
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db.select().from(crfForms)
            .where(eq(crfForms.id, parseInt(req.params.id)));
        if (!row || !sameOrg(req, row.organizationId)) return res.status(404).json({ error: 'Form not found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/forms — create new form template (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
    try {
        const { name, description, version, schemaJson } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });
        if (!schemaJson) return res.status(400).json({ error: 'schemaJson is required' });

        const schemaErrors = validateSchema(schemaJson);
        if (schemaErrors.length) return res.status(422).json({ error: 'Invalid schema', details: schemaErrors });

        const [created] = await db.insert(crfForms).values({
            organizationId: effectiveOrgId(req),
            name:        name.trim(),
            description: description ?? null,
            version:     version ?? '1.0',
            schemaJson,
            isActive:    true,
        }).returning();

        await writeAudit(db, {
            tableName: 'crf_forms', recordId: created.id, action: 'INSERT',
            newValue: `Form "${name}" v${version ?? '1.0'} created`,
            reason: 'New CRF form created',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/forms/:id — update form (creates new version, deactivates old)
router.put('/:id', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, description, version, schemaJson, reason } = req.body;
        if (!schemaJson) return res.status(400).json({ error: 'schemaJson is required' });
        if (!reason) return res.status(400).json({ error: 'reason is required for form updates' });

        const schemaErrors = validateSchema(schemaJson);
        if (schemaErrors.length) return res.status(422).json({ error: 'Invalid schema', details: schemaErrors });

        const [existing] = await db.select().from(crfForms).where(eq(crfForms.id, id));
        if (!existing || !sameOrg(req, existing.organizationId)) return res.status(404).json({ error: 'Form not found' });

        // Captured data was entered and validated against the current schema —
        // rewriting it in place silently changes the meaning of existing entries
        // (fields can vanish or change type). Block once any entry references
        // this form; create a new form version instead.
        if (JSON.stringify(schemaJson) !== JSON.stringify(existing.schemaJson)) {
            const [{ inUse }] = await db.select({ inUse: count() }).from(crfDataEntries)
                .where(eq(crfDataEntries.formId, id));
            if (Number(inUse) > 0) {
                return res.status(409).json({
                    error: `Schema cannot be modified: ${inUse} data entr${Number(inUse) === 1 ? 'y' : 'ies'} reference this form. Create a new form version instead.`,
                });
            }
        }

        // Auto-increment version if not provided
        const oldVer = parseFloat(existing.version || '1.0');
        const newVersion = version ?? String((oldVer + 0.1).toFixed(1));

        const [updated] = await db.update(crfForms).set({
            name:        name ?? existing.name,
            description: description ?? existing.description,
            version:     newVersion,
            schemaJson,
        }).where(eq(crfForms.id, id)).returning();

        await writeAudit(db, {
            tableName: 'crf_forms', recordId: id, action: 'UPDATE',
            fieldName: 'schema', oldValue: `v${existing.version}`,
            newValue: `v${newVersion}`,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/forms/:id/status — activate or deactivate (admin only)
router.patch('/:id/status', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { isActive, reason } = req.body;
        if (isActive === undefined) return res.status(400).json({ error: 'isActive is required' });
        if (!reason) return res.status(400).json({ error: 'reason is required' });

        const [existing] = await db.select().from(crfForms).where(eq(crfForms.id, id));
        if (!existing || !sameOrg(req, existing.organizationId)) return res.status(404).json({ error: 'Form not found' });

        const [updated] = await db.update(crfForms)
            .set({ isActive: !!isActive })
            .where(eq(crfForms.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'crf_forms', recordId: id, action: 'UPDATE',
            fieldName: 'is_active', oldValue: String(existing.isActive), newValue: String(!!isActive),
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/forms/:id — hard delete only if no entries reference it (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required' });

        const [existing] = await db.select().from(crfForms).where(eq(crfForms.id, id));
        if (!existing || !sameOrg(req, existing.organizationId)) return res.status(404).json({ error: 'Form not found' });

        // Check for data entries that reference this form
        const { crfDataEntries } = await import('../db/schemas/schema.js');
        const [usedEntry] = await db.select({ id: crfDataEntries.id })
            .from(crfDataEntries)
            .where(eq(crfDataEntries.formId, id))
            .limit(1);

        if (usedEntry) {
            return res.status(409).json({
                error: 'Form has data entries and cannot be deleted. Deactivate it instead.',
            });
        }

        await db.delete(crfForms).where(eq(crfForms.id, id));

        await writeAudit(db, {
            tableName: 'crf_forms', recordId: id, action: 'DELETE',
            oldValue: `Form "${existing.name}" v${existing.version}`,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ deleted: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
