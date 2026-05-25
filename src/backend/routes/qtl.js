import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db, client } from '../db/connection.js';
import { qualityToleranceLimits, subjects, informedConsents } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// ─── QTL CRUD ────────────────────────────────────────────────────────────────

// GET /api/qtl — list QTLs for current study
router.get('/', async (req, res) => {
    try {
        const rows = await db
            .select()
            .from(qualityToleranceLimits)
            .where(eq(qualityToleranceLimits.studyId, req.studyId))
            .orderBy(desc(qualityToleranceLimits.createdAt));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/qtl/metrics — compute KRI metrics and compare against QTL thresholds
// NOTE: This route must be defined before /:id to avoid being shadowed
router.get('/metrics', async (req, res) => {
    try {
        const studyId = req.studyId;

        // Fetch all QTLs for this study (keyed by indicator)
        const qtls = await db
            .select()
            .from(qualityToleranceLimits)
            .where(eq(qualityToleranceLimits.studyId, studyId));

        const qtlByIndicator = {};
        for (const q of qtls) {
            qtlByIndicator[q.indicator] = q;
        }

        // --- Total and active subjects ---
        const [subjectCounts] = await client`
            SELECT
                COUNT(*) FILTER (WHERE status != 'Screen Failed')::int      AS total,
                COUNT(*) FILTER (WHERE status = 'Active')::int              AS active
            FROM subjects
            WHERE study_id = ${studyId}
        `;
        const totalSubjects  = subjectCounts?.total  ?? 0;
        const activeSubjects = subjectCounts?.active ?? 0;

        // --- Missing data rate: subjects with any incomplete mandatory visit ---
        // Approximation: subjects who have at least one visit with status 'Scheduled' or 'In Progress'
        // past their planned date, compared to all subjects with at least one visit
        const [missingDataRow] = await client`
            SELECT COUNT(DISTINCT s.id)::int AS count
            FROM subjects s
            INNER JOIN visits v ON v.subject_id = s.id
            WHERE s.study_id = ${studyId}
              AND s.status != 'Screen Failed'
              AND v.status IN ('Scheduled', 'In Progress')
              AND v.planned_date IS NOT NULL
              AND v.planned_date < CURRENT_DATE::text
        `;
        const subjectsWithMissingVisit = missingDataRow?.count ?? 0;
        const missingDataRate = totalSubjects > 0
            ? parseFloat(((subjectsWithMissingVisit / totalSubjects) * 100).toFixed(2))
            : 0;

        // --- Query rate: open queries / total subjects ---
        const [openQueriesRow] = await client`
            SELECT COUNT(*)::int AS count
            FROM queries
            WHERE study_id = ${studyId} AND status = 'Open'
        `;
        const openQueries = openQueriesRow?.count ?? 0;
        const queryRate = totalSubjects > 0
            ? parseFloat(((openQueries / totalSubjects) * 100).toFixed(2))
            : 0;

        // --- AE rate: total AEs / active subjects ---
        const [aeRow] = await client`
            SELECT COUNT(*)::int AS count
            FROM adverse_events
            WHERE study_id = ${studyId}
        `;
        const totalAes = aeRow?.count ?? 0;
        const aeRate = activeSubjects > 0
            ? parseFloat(((totalAes / activeSubjects) * 100).toFixed(2))
            : 0;

        // --- Deviation rate: open deviations / total subjects ---
        const [deviationRow] = await client`
            SELECT COUNT(*)::int AS count
            FROM protocol_deviations
            WHERE study_id = ${studyId} AND status = 'Open'
        `;
        const openDeviations = deviationRow?.count ?? 0;
        const deviationRate = totalSubjects > 0
            ? parseFloat(((openDeviations / totalSubjects) * 100).toFixed(2))
            : 0;

        // --- Consent rate: consented (non-withdrawn) subjects / active subjects ---
        const [consentRow] = await client`
            SELECT COUNT(DISTINCT subject_id)::int AS count
            FROM informed_consents
            WHERE study_id = ${studyId} AND is_withdrawn = false
        `;
        const consentedSubjects = consentRow?.count ?? 0;
        const consentRate = activeSubjects > 0
            ? parseFloat(((consentedSubjects / activeSubjects) * 100).toFixed(2))
            : 0;

        // --- Average data entry days: avg days from visit actual_date to first CRF entry audit ---
        // Joins via crf_data_entries.visit_id so there is no cartesian product
        let avgDataEntryDays = null;
        try {
            const [avgEntryRow] = await client`
                SELECT ROUND(AVG(diff_days), 2) AS avg_days
                FROM (
                    SELECT
                        v.id,
                        EXTRACT(EPOCH FROM (MIN(at2.created_at) - v.actual_date::date)) / 86400 AS diff_days
                    FROM visits v
                    INNER JOIN subjects s        ON s.id = v.subject_id
                    INNER JOIN crf_data_entries e ON e.visit_id = v.id
                    INNER JOIN audit_trails at2   ON at2.table_name = 'crf_data_entries'
                                                 AND at2.record_id = e.id::text
                                                 AND at2.action = 'INSERT'
                    WHERE s.study_id = ${studyId}
                      AND v.actual_date IS NOT NULL
                      AND v.status = 'Completed'
                    GROUP BY v.id, v.actual_date
                ) sub
                WHERE diff_days >= 0
            `;
            avgDataEntryDays = avgEntryRow?.avg_days != null
                ? parseFloat(parseFloat(avgEntryRow.avg_days).toFixed(2))
                : null;
        } catch { /* skip if audit_trails or crf_data_entries not joinable */ }

        // --- Compare each metric against QTL ---
        function evaluate(indicator, value) {
            const qtl = qtlByIndicator[indicator];
            if (!qtl) return { value, threshold: null, unit: '%', alertLevel: null, status: 'no_qtl' };
            const threshold = parseFloat(qtl.threshold);
            let status = 'ok';
            if (!isNaN(threshold)) {
                if (value > threshold) {
                    status = qtl.alertLevel === 'critical' ? 'critical' : 'warning';
                }
            }
            return { value, threshold: qtl.threshold, unit: qtl.unit, alertLevel: qtl.alertLevel, status };
        }

        res.json({
            studyId,
            computedAt: new Date().toISOString(),
            subjects: { total: totalSubjects, active: activeSubjects },
            metrics: {
                missingDataRate:   evaluate('missing_data_rate',  missingDataRate),
                queryRate:         evaluate('query_rate',         queryRate),
                aeRate:            evaluate('ae_rate',            aeRate),
                deviationRate:     evaluate('deviation_rate',     deviationRate),
                consentRate:       evaluate('consent_rate',       consentRate),
                avgDataEntryDays:  {
                    value:     avgDataEntryDays,
                    unit:      'days',
                    threshold: qtlByIndicator['avg_data_entry_days']?.threshold ?? null,
                    alertLevel: qtlByIndicator['avg_data_entry_days']?.alertLevel ?? null,
                    status: (() => {
                        const qtl = qtlByIndicator['avg_data_entry_days'];
                        if (!qtl || avgDataEntryDays === null) return 'no_qtl';
                        const t = parseFloat(qtl.threshold);
                        if (isNaN(t)) return 'no_qtl';
                        return avgDataEntryDays > t
                            ? (qtl.alertLevel === 'critical' ? 'critical' : 'warning')
                            : 'ok';
                    })(),
                },
            },
            rawCounts: {
                openQueries,
                openDeviations,
                totalAes,
                consentedSubjects,
                subjectsWithMissingVisit,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/qtl/breaches — list CAPA actions for QTL breaches
router.get('/breaches', async (req, res) => {
    try {
        const rows = await client`
            SELECT * FROM qtl_breach_actions
            WHERE study_id = ${req.studyId}
            ORDER BY breach_date DESC
        `;
        res.json(rows);
    } catch (err) {
        if ((err?.message || '').includes('does not exist')) return res.json([]);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/qtl/breaches — log a QTL breach and create CAPA
router.post('/breaches', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const { indicator, indicatorLabel, threshold, actualValue, capaText, capaDueDate, assignedToId, assignedToName, notes } = req.body;
        if (!indicator || !threshold || !actualValue) {
            return res.status(400).json({ error: 'indicator, threshold, and actualValue are required' });
        }
        const [row] = await client`
            INSERT INTO qtl_breach_actions
                (study_id, indicator, indicator_label, threshold, actual_value, capa_text, capa_due_date,
                 assigned_to, assigned_to_name, notes, created_by, created_by_name)
            VALUES
                (${req.studyId}, ${indicator}, ${indicatorLabel ?? null}, ${threshold}, ${actualValue},
                 ${capaText ?? null}, ${capaDueDate ?? null},
                 ${assignedToId ?? null}, ${assignedToName ?? null}, ${notes ?? null},
                 ${req.user.id}, ${req.user.name})
            RETURNING *
        `;
        await writeAudit(db, {
            tableName: 'qtl_breach_actions', recordId: row.id, action: 'INSERT',
            newValue: `${indicator} | actual=${actualValue} | threshold=${threshold}`,
            reason: 'QTL breach logged with CAPA per ICH GCP E6(R3) §5.0.7',
            user: req.user, ipAddress: req.ip,
        });
        res.status(201).json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/qtl/breaches/:bid — update CAPA status/text
router.patch('/breaches/:bid', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const bid = parseInt(req.params.bid);
        const { status, capaText, capaDueDate, notes } = req.body;
        const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
        }
        const resolvedAt   = status === 'Resolved' || status === 'Closed' ? new Date() : null;
        const resolvedBy   = resolvedAt ? req.user.id   : null;
        const resolvedByName = resolvedAt ? req.user.name : null;

        const [existing] = await client`SELECT id FROM qtl_breach_actions WHERE id = ${bid} AND study_id = ${req.studyId}`;
        if (!existing) return res.status(404).json({ error: 'Breach action not found' });

        const [updated] = await client`
            UPDATE qtl_breach_actions SET
                status           = COALESCE(${status ?? null}, status),
                capa_text        = COALESCE(${capaText ?? null}, capa_text),
                capa_due_date    = COALESCE(${capaDueDate ?? null}, capa_due_date),
                notes            = COALESCE(${notes ?? null}, notes),
                resolved_at      = COALESCE(${resolvedAt}, resolved_at),
                resolved_by      = COALESCE(${resolvedBy}, resolved_by),
                resolved_by_name = COALESCE(${resolvedByName}, resolved_by_name),
                updated_at       = NOW()
            WHERE id = ${bid}
            RETURNING *
        `;
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/qtl/:id
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db
            .select()
            .from(qualityToleranceLimits)
            .where(and(
                eq(qualityToleranceLimits.id, parseInt(req.params.id)),
                eq(qualityToleranceLimits.studyId, req.studyId),
            ));
        if (!row) return res.status(404).json({ error: 'Quality tolerance limit not found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/qtl — create QTL (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
    try {
        const { indicator, label, threshold, unit, alertLevel, description } = req.body;

        if (!indicator || !label || threshold === undefined) {
            return res.status(400).json({ error: 'indicator, label, and threshold are required' });
        }

        const validIndicators = [
            'missing_data_rate', 'query_rate', 'ae_rate',
            'deviation_rate', 'consent_rate', 'avg_data_entry_days',
        ];
        if (!validIndicators.includes(indicator)) {
            return res.status(400).json({ error: `indicator must be one of: ${validIndicators.join(', ')}` });
        }

        const validAlertLevels = ['warning', 'critical'];
        if (alertLevel && !validAlertLevels.includes(alertLevel)) {
            return res.status(400).json({ error: `alertLevel must be 'warning' or 'critical'` });
        }

        const [created] = await db.insert(qualityToleranceLimits).values({
            studyId:     req.studyId,
            indicator,
            label,
            threshold:   String(threshold),
            unit:        unit        ?? '%',
            alertLevel:  alertLevel  ?? 'warning',
            description: description ?? null,
            createdBy:   req.user.id,
        }).returning();

        await writeAudit(db, {
            tableName: 'quality_tolerance_limits', recordId: created.id, action: 'INSERT',
            newValue: `${indicator} | Threshold: ${threshold} | Alert: ${created.alertLevel}`,
            reason: 'Quality tolerance limit created',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/qtl/:id — update threshold (admin only)
router.patch('/:id', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason, ...fields } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for edits' });

        const [existing] = await db.select().from(qualityToleranceLimits)
            .where(and(
                eq(qualityToleranceLimits.id, id),
                eq(qualityToleranceLimits.studyId, req.studyId),
            ));
        if (!existing) return res.status(404).json({ error: 'Quality tolerance limit not found' });

        if (fields.alertLevel && !['warning', 'critical'].includes(fields.alertLevel)) {
            return res.status(400).json({ error: `alertLevel must be 'warning' or 'critical'` });
        }

        const updates = {
            label:       fields.label       ?? existing.label,
            threshold:   fields.threshold   !== undefined ? String(fields.threshold) : existing.threshold,
            unit:        fields.unit        ?? existing.unit,
            alertLevel:  fields.alertLevel  ?? existing.alertLevel,
            description: fields.description ?? existing.description,
            updatedAt:   new Date(),
        };

        const [updated] = await db.update(qualityToleranceLimits)
            .set(updates)
            .where(eq(qualityToleranceLimits.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'quality_tolerance_limits', recordId: id, action: 'UPDATE',
            fieldName: 'threshold',
            oldValue: existing.threshold,
            newValue: updated.threshold,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/qtl/:id — delete (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for deletion' });

        const [existing] = await db.select().from(qualityToleranceLimits)
            .where(and(
                eq(qualityToleranceLimits.id, id),
                eq(qualityToleranceLimits.studyId, req.studyId),
            ));
        if (!existing) return res.status(404).json({ error: 'Quality tolerance limit not found' });

        await db.delete(qualityToleranceLimits).where(eq(qualityToleranceLimits.id, id));

        await writeAudit(db, {
            tableName: 'quality_tolerance_limits', recordId: id, action: 'DELETE',
            oldValue: `${existing.indicator} | Threshold: ${existing.threshold}`,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ success: true, deleted: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
