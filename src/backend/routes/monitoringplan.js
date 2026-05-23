// Risk-Based Monitoring Plan — ICH GCP E6(R3) §5.18.3
import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { monitoringPlans } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// GET /api/monitoring-plan — get current/all plans for study
router.get('/', async (req, res) => {
    try {
        const rows = await db.select().from(monitoringPlans)
            .where(eq(monitoringPlans.studyId, req.studyId))
            .orderBy(desc(monitoringPlans.createdAt));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/monitoring-plan/current — latest approved plan
router.get('/current', async (req, res) => {
    try {
        const [plan] = await db.select().from(monitoringPlans)
            .where(and(
                eq(monitoringPlans.studyId, req.studyId),
                eq(monitoringPlans.status, 'Approved'),
            ))
            .orderBy(desc(monitoringPlans.approvedAt))
            .limit(1);
        res.json(plan ?? null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/monitoring-plan — create new plan (draft)
router.post('/', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const {
            version, riskLevel, scope, sdvStrategy, sdvPercentage,
            onSiteFrequency, remoteFrequency, criticalDataFields,
            riskFactors, actionThresholds, notes,
        } = req.body;

        const [row] = await db.insert(monitoringPlans).values({
            studyId: req.studyId,
            version: version || '1.0',
            status: 'Draft',
            riskLevel: riskLevel || null,
            scope: scope || null,
            sdvStrategy: sdvStrategy || null,
            sdvPercentage: sdvPercentage ? parseInt(sdvPercentage) : null,
            onSiteFrequency: onSiteFrequency || null,
            remoteFrequency: remoteFrequency || null,
            criticalDataFields: criticalDataFields || [],
            riskFactors: riskFactors || [],
            actionThresholds: actionThresholds || {},
            notes: notes || null,
            createdBy: req.user.id, createdByName: req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'monitoring_plans', recordId: row.id, action: 'INSERT',
            newValue: JSON.stringify({ version, status: 'Draft' }),
            user: req.user, ipAddress: req.ip,
        });
        res.status(201).json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/monitoring-plan/:id — update plan
router.patch('/:id', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [existing] = await db.select().from(monitoringPlans)
            .where(and(eq(monitoringPlans.id, id), eq(monitoringPlans.studyId, req.studyId)));
        if (!existing) return res.status(404).json({ error: 'Plan not found' });
        if (existing.status === 'Approved') {
            return res.status(409).json({ error: 'Approved plan cannot be modified. Create a new version.' });
        }

        const allowed = ['version', 'riskLevel', 'scope', 'sdvStrategy', 'sdvPercentage',
                         'onSiteFrequency', 'remoteFrequency', 'criticalDataFields',
                         'riskFactors', 'actionThresholds', 'notes'];
        const updates = {};
        for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
        updates.updatedAt = new Date();

        const [updated] = await db.update(monitoringPlans).set(updates)
            .where(eq(monitoringPlans.id, id)).returning();
        await writeAudit(db, {
            tableName: 'monitoring_plans', recordId: id, action: 'UPDATE',
            reason: req.body.reason || 'Plan update',
            user: req.user, ipAddress: req.ip,
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/monitoring-plan/:id/approve — approve plan (admin/pi only)
router.post('/:id/approve', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [existing] = await db.select().from(monitoringPlans)
            .where(and(eq(monitoringPlans.id, id), eq(monitoringPlans.studyId, req.studyId)));
        if (!existing) return res.status(404).json({ error: 'Plan not found' });
        if (existing.status === 'Approved') return res.status(409).json({ error: 'Already approved' });

        // Supersede any currently approved plan
        await db.update(monitoringPlans)
            .set({ status: 'Superseded', updatedAt: new Date() })
            .where(and(eq(monitoringPlans.studyId, req.studyId), eq(monitoringPlans.status, 'Approved')));

        const now = new Date();
        const [updated] = await db.update(monitoringPlans)
            .set({
                status: 'Approved',
                approvedBy: req.user.id,
                approvedByName: req.user.name,
                approvedAt: now,
                updatedAt: now,
            })
            .where(eq(monitoringPlans.id, id)).returning();

        await writeAudit(db, {
            tableName: 'monitoring_plans', recordId: id, action: 'UPDATE',
            fieldName: 'status', oldValue: existing.status, newValue: 'Approved',
            reason: 'Monitoring plan approved',
            user: req.user, ipAddress: req.ip,
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
