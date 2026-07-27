// Spreadsheet Data Import tool. Study-scoped (mounted under studyAuth), additive —
// it reuses existing validation/audit/create logic and changes no other flow.
//
// Endpoints:
//   POST /api/import/derive-form  — infer a CRF form from a sheet's headers (admin)
//   POST /api/import/visit        — import one per-visit sheet (subject + visit + CRF + AE)
//   GET  /api/import/template     — download a CSV template for a form
import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { subjects, visits, crfForms, crfDataEntries, adverseEvents, sites, vitalSigns, labResults } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { licenseGuardCreate } from '../lib/licenseguard.js';
import { writeAudit, writeFieldDiffAudit } from '../lib/audit.js';
import { sameOrg, effectiveOrgId } from '../lib/tenantscope.js';
import { checkLimit } from '../lib/plans.js';
import { isUniqueViolation } from '../lib/dberrors.js';
import { createAutoQueries } from './entries.js';
import { deriveForm, planRow } from '../lib/importengine.js';

const router = Router();
const IMPORT_ROLES = ['admin', 'crc', 'data_manager', 'investigator', 'pi'];

// Same window-compliance formula as routes/visits.js (kept local to avoid a cycle).
function windowCompliance(plannedDate, actualDate, windowDays) {
    if (!plannedDate || !actualDate) return null;
    const p = new Date(plannedDate); p.setHours(0, 0, 0, 0);
    const a = new Date(actualDate);  a.setHours(0, 0, 0, 0);
    const diff = Math.round((a - p) / 86400000);
    const win = windowDays ?? 0;
    if (diff === 0) return 'On Schedule';
    if (Math.abs(diff) <= win) return diff < 0 ? `Early (${Math.abs(diff)}d)` : `Late (+${diff}d)`;
    return diff < 0 ? `Early (${Math.abs(diff)}d) — Out of Window` : `Late (+${diff}d) — Out of Window`;
}

// ── POST /api/import/derive-form ────────────────────────────────────────────
// Body: { name, headers:[], rows:[{header:value}], skip:[] } → creates a CRF form.
router.post('/derive-form', requireRole('admin'), async (req, res) => {
    try {
        const { name, headers, rows, skip } = req.body;
        if (!name || !Array.isArray(headers) || headers.length === 0) {
            return res.status(400).json({ error: 'name and headers[] are required' });
        }
        const schemaJson = deriveForm({ headers, rows: rows || [], skip: skip || [] });
        if (!schemaJson.fields.length) {
            return res.status(422).json({ error: 'No importable fields were derived from the headers' });
        }
        const [created] = await db.insert(crfForms).values({
            organizationId: effectiveOrgId(req),
            name: name.trim(),
            description: 'Auto-derived from spreadsheet import',
            version: '1.0',
            schemaJson,
            isActive: true,
        }).returning();
        await writeAudit(db, {
            tableName: 'crf_forms', recordId: created.id, action: 'INSERT',
            newValue: `Form "${name}" derived from import (${schemaJson.fields.length} fields)`,
            reason: 'CRF form auto-derived for data import', user: req.user, ipAddress: req.ip,
        });
        res.status(201).json({ formId: created.id, schema: schemaJson });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/import/visit ──────────────────────────────────────────────────
// Body: { siteId, visitName, formId, columnMap, reason, rows:[], dryRun }
router.post('/visit', licenseGuardCreate, requireRole(...IMPORT_ROLES), async (req, res) => {
    const { siteId, visitName, formId, columnMap, reason, rows, dryRun } = req.body;
    if (!visitName || !formId || !Array.isArray(rows) || !columnMap) {
        return res.status(400).json({ error: 'visitName, formId, columnMap and rows[] are required' });
    }
    const effSiteId = siteId != null ? parseInt(siteId) : null;
    if (Array.isArray(req.siteScope) && effSiteId != null && !req.siteScope.includes(effSiteId)) {
        return res.status(403).json({ error: 'You can only import into your assigned site.' });
    }

    try {
        const [form] = await db.select().from(crfForms).where(eq(crfForms.id, parseInt(formId)));
        if (!form || !sameOrg(req, form.organizationId)) return res.status(404).json({ error: 'Form not found' });
        const formFields = form.schemaJson?.fields ?? [];

        // Existing subjects in this study (for will-create vs exists + plan limit).
        const existingRows = await db.select({ id: subjects.id, code: subjects.subjectCode, siteId: subjects.siteId })
            .from(subjects).where(eq(subjects.studyId, req.studyId));
        const byCode = new Map(existingRows.map(s => [s.code, s]));

        // Batch-aware plan limit for the subjects that would be newly created.
        const planned = rows.map(r => planRow(r, columnMap, formFields));
        const newCodes = new Set(planned.filter(p => p.subjectCode && !byCode.has(p.subjectCode)).map(p => p.subjectCode));
        const limit = await checkLimit(effectiveOrgId(req), 'subjects');
        if (limit.limit != null && limit.current + newCodes.size > limit.limit) {
            return res.status(402).json({
                error: `Plan limit: importing ${newCodes.size} new subjects would exceed ${limit.limit} (currently ${limit.current}).`,
            });
        }

        const summary = { subjectsCreated: 0, visitsCreated: 0, visitsUpdated: 0, entriesCreated: 0, entriesUpdated: 0, aeCreated: 0, vitalsCreated: 0, labsCreated: 0, skipped: 0, errors: 0 };
        const results = [];
        const reasonText = reason || `Bulk import — ${visitName}`;

        for (let i = 0; i < rows.length; i++) {
            const plan = planned[i];
            const line = i + 2;   // human row number (header = line 1)
            const rr = { line, subjectCode: plan.subjectCode, warnings: plan.warnings };

            if (plan.errors.length) { rr.status = 'error'; rr.messages = plan.errors; summary.errors++; results.push(rr); continue; }

            const existing = plan.subjectCode ? byCode.get(plan.subjectCode) : null;
            rr.subjectAction = existing ? 'exists' : 'create';

            if (dryRun) {
                rr.status = 'ok';
                rr.visitDate = plan.visitDate;
                rr.crfFields = Object.keys(plan.crf).length;
                rr.ae = plan.ae ? (plan.ae.serious ? 'SAE' : 'AE') : null;
                rr.vitals = plan.vital ? 1 : 0;
                rr.labs = plan.labs.length;
                results.push(rr);
                continue;
            }

            // ── Commit path (per-row) ──────────────────────────────────────
            try {
                // 1. Subject upsert
                let subj = existing;
                if (!subj) {
                    if (Array.isArray(req.siteScope) && !req.siteScope.includes(effSiteId)) {
                        throw new Error('site not in your scope');
                    }
                    const [ins] = await db.insert(subjects).values({
                        studyId: req.studyId, subjectCode: plan.subjectCode, siteId: effSiteId,
                        initials: plan.subject.initials ?? null, sex: plan.subject.sex ?? null,
                        genderIdentity: plan.subject.genderIdentity ?? null,
                        enrolledAt: plan.visitDate ? new Date(plan.visitDate) : new Date(),
                        enrolledBy: req.user.id,
                    }).returning();
                    subj = { id: ins.id, code: ins.subjectCode, siteId: ins.siteId };
                    byCode.set(subj.code, subj);
                    summary.subjectsCreated++;
                    await writeAudit(db, { tableName: 'subjects', recordId: subj.id, action: 'INSERT', newValue: subj.code, reason: 'Subject created via import', user: req.user, ipAddress: req.ip });
                }

                // 2. Visit upsert (by name within subject)
                const vmatches = await db.select().from(visits).where(and(eq(visits.subjectId, subj.id), eq(visits.visitName, visitName)));
                if (vmatches.length > 1) throw new Error(`ambiguous: subject has ${vmatches.length} visits named "${visitName}"`);
                let visit = vmatches[0];
                if (!visit) {
                    const [iv] = await db.insert(visits).values({
                        subjectId: subj.id, visitName, visitType: 'Scheduled',
                        actualDate: plan.visitDate ?? null, status: plan.visitDate ? 'Completed' : 'Scheduled',
                        createdByName: req.user.name,
                    }).returning();
                    visit = iv; summary.visitsCreated++;
                    await writeAudit(db, { tableName: 'visits', recordId: visit.id, action: 'INSERT', newValue: `${visitName}${plan.visitDate ? ' @' + plan.visitDate : ''}`, reason: 'Visit created via import', user: req.user, ipAddress: req.ip });
                } else if (plan.visitDate && plan.visitDate !== visit.actualDate) {
                    const wc = windowCompliance(visit.plannedDate, plan.visitDate, visit.windowDays);
                    await db.update(visits).set({ actualDate: plan.visitDate, windowCompliance: wc, status: 'Completed', updatedAt: new Date() }).where(eq(visits.id, visit.id));
                    summary.visitsUpdated++;
                    await writeAudit(db, { tableName: 'visits', recordId: visit.id, action: 'UPDATE', fieldName: 'actual_date', oldValue: visit.actualDate, newValue: plan.visitDate, reason: reasonText, user: req.user, ipAddress: req.ip });
                }

                // 3. CRF entry upsert
                if (Object.keys(plan.crf).length) {
                    const [existEntry] = await db.select().from(crfDataEntries)
                        .where(and(eq(crfDataEntries.subjectId, subj.id), eq(crfDataEntries.visitId, visit.id), eq(crfDataEntries.formId, parseInt(formId))));
                    if (existEntry) {
                        if (existEntry.status === 'Locked') throw new Error('CRF entry is locked');
                        await db.update(crfDataEntries).set({ dataJson: plan.crf, status: 'Saved', updatedAt: new Date(), updatedBy: req.user.id }).where(eq(crfDataEntries.id, existEntry.id));
                        summary.entriesUpdated++;
                        await writeFieldDiffAudit(db, { tableName: 'crf_data_entries', recordId: existEntry.id, oldData: existEntry.dataJson, newData: plan.crf, reason: reasonText, user: req.user, ipAddress: req.ip });
                        await createAutoQueries(db, req, plan.validation.softViolations, existEntry.id, subj.id, visit.id, formId);
                    } else {
                        const [ie] = await db.insert(crfDataEntries).values({
                            subjectId: subj.id, visitId: visit.id, formId: parseInt(formId),
                            dataJson: plan.crf, status: 'Saved', createdBy: req.user.id,
                        }).returning();
                        summary.entriesCreated++;
                        await writeAudit(db, { tableName: 'crf_data_entries', recordId: ie.id, action: 'INSERT', newValue: `${Object.keys(plan.crf).length} fields via import`, reason: 'CRF entry created via import', user: req.user, ipAddress: req.ip });
                        await createAutoQueries(db, req, plan.validation.softViolations, ie.id, subj.id, visit.id, formId);
                    }
                }

                // 4. Adverse event (deduped by subject + term so re-imports don't duplicate)
                if (plan.ae && plan.ae.term) {
                  const [dupAe] = await db.select({ id: adverseEvents.id }).from(adverseEvents)
                    .where(and(eq(adverseEvents.subjectId, subj.id), eq(adverseEvents.aeTerm, plan.ae.term)));
                  if (!dupAe) {
                    const [ae] = await db.insert(adverseEvents).values({
                        studyId: req.studyId, subjectId: subj.id,
                        aeTerm: plan.ae.term, severity: 'Unknown', codingStatus: 'Uncoded',
                        isSerious: !!plan.ae.serious, seriousCriteria: [],
                        onsetDate: plan.ae.onsetDate ?? null, narrative: plan.ae.narrative ?? null,
                        reportStatus: 'Draft', requiresExpeditedReport: !!plan.ae.serious,
                        createdBy: req.user.id, createdByName: req.user.name,
                    }).returning();
                    summary.aeCreated++;
                    await writeAudit(db, { tableName: 'adverse_events', recordId: ae.id, action: 'INSERT', newValue: `${plan.ae.term} (import, needs coding/severity)`, reason: 'AE recorded via import', user: req.user, ipAddress: req.ip });
                  }
                }

                // 5. Vital signs (dedicated module) — one record per subject+visit
                if (plan.vital) {
                    const [dupV] = await db.select({ id: vitalSigns.id }).from(vitalSigns)
                        .where(and(eq(vitalSigns.subjectId, subj.id), eq(vitalSigns.visitId, visit.id)));
                    if (!dupV) {
                        const [vs] = await db.insert(vitalSigns).values({
                            studyId: req.studyId, subjectId: subj.id, visitId: visit.id,
                            assessmentDate: plan.visitDate || new Date().toISOString().slice(0, 10),
                            ...plan.vital, createdBy: req.user.id, createdByName: req.user.name,
                        }).returning();
                        summary.vitalsCreated++;
                        await writeAudit(db, { tableName: 'vital_signs', recordId: vs.id, action: 'INSERT', newValue: 'Vitals via import', reason: 'Vital signs recorded via import', user: req.user, ipAddress: req.ip });
                    }
                }

                // 6. Laboratory (dedicated module) — one row per test, deduped
                for (const l of plan.labs) {
                    const [dupL] = await db.select({ id: labResults.id }).from(labResults)
                        .where(and(eq(labResults.subjectId, subj.id), eq(labResults.visitId, visit.id), eq(labResults.testName, l.testName)));
                    if (dupL) continue;
                    const [lr] = await db.insert(labResults).values({
                        studyId: req.studyId, subjectId: subj.id, visitId: visit.id,
                        testName: l.testName, unit: l.unit ?? null,
                        valueNumeric: /^-?\d*\.?\d+$/.test(l.value) ? l.value : null,
                        valueText: /^-?\d*\.?\d+$/.test(l.value) ? null : l.value,
                        labName: l.labName ?? null, specimenCollectedAt: l.date ?? null, assessmentDate: l.date ?? null,
                        createdBy: req.user.id, createdByName: req.user.name,
                    }).returning();
                    summary.labsCreated++;
                    await writeAudit(db, { tableName: 'lab_results', recordId: lr.id, action: 'INSERT', newValue: `${l.testName}=${l.value}${l.unit ? ' ' + l.unit : ''} (import)`, reason: 'Lab result recorded via import', user: req.user, ipAddress: req.ip });
                }

                rr.status = 'ok';
                results.push(rr);
            } catch (rowErr) {
                if (isUniqueViolation(rowErr)) rr.messages = ['Subject code already exists'];
                else rr.messages = [rowErr.message];
                rr.status = 'error'; summary.errors++;
                results.push(rr);
            }
        }

        res.json({ dryRun: !!dryRun, summary, rows: results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/import/template?formId= ────────────────────────────────────────
router.get('/template', requireRole(...IMPORT_ROLES), async (req, res) => {
    try {
        const [form] = await db.select().from(crfForms).where(eq(crfForms.id, parseInt(req.query.formId)));
        if (!form || !sameOrg(req, form.organizationId)) return res.status(404).json({ error: 'Form not found' });
        const cols = ['ID Subjek', 'Tanggal Kedatangan', ...(form.schemaJson?.fields ?? []).map(f => f.label)];
        const csv = '﻿' + cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\r\n';
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="import_template_${form.id}.csv"`);
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
