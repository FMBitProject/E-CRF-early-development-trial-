import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import {
    subjects, sites, visits, crfDataEntries, crfForms,
    adverseEvents, protocolDeviations, informedConsents,
    esignatures, labResults, vitalSigns,
} from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { buildOdmXml } from '../lib/odm.js';
import { buildCsv, withBom, INVALID_DOMAIN_ERROR, vitalsToRows } from '../lib/csv.js';

const router = Router();

// ── CDISC ODM-XML 1.3.2 Export ───────────────────────────────────────────────
// The serialiser itself lives in lib/odm.js so the exact bytes we ship to a
// regulator can be asserted in a unit test.

// GET /api/export/odm — CDISC ODM-XML 1.3.2 export (admin, cra)
router.get('/odm', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const sid = req.studyId;
        const [
            allSubjects,
            visitRows,
            entryRows,
            allFormsGlobal,
            allAE,
            allConsents,
            sigRows,
        ] = await Promise.all([
            db.select().from(subjects).leftJoin(sites, eq(subjects.siteId, sites.id)).where(eq(subjects.studyId, sid)),
            // visits/entries/signatures have no study_id — scope via the subject
            db.select({ row: visits }).from(visits)
                .innerJoin(subjects, eq(visits.subjectId, subjects.id))
                .where(eq(subjects.studyId, sid)),
            db.select({ row: crfDataEntries }).from(crfDataEntries)
                .innerJoin(subjects, eq(crfDataEntries.subjectId, subjects.id))
                .where(eq(subjects.studyId, sid)),
            db.select().from(crfForms),
            db.select().from(adverseEvents).where(eq(adverseEvents.studyId, sid)),
            db.select().from(informedConsents).where(eq(informedConsents.studyId, sid)),
            db.select({ row: esignatures }).from(esignatures)
                .innerJoin(crfDataEntries, eq(esignatures.entryId, crfDataEntries.id))
                .innerJoin(subjects, eq(crfDataEntries.subjectId, subjects.id))
                .where(eq(subjects.studyId, sid)),
        ]);
        const allVisits  = visitRows.map(r => r.row);
        const allEntries = entryRows.map(r => r.row);
        const allSigs    = sigRows.map(r => r.row);
        // Only emit metadata for forms actually used by this study's entries
        const usedFormIds = new Set(allEntries.map(e => e.formId));
        const allForms = allFormsGlobal.filter(f => usedFormIds.has(f.id));

        const xml = buildOdmXml({
            studyName: process.env.STUDY_NAME || 'E-CRF Clinical Study',
            studyOID:  process.env.STUDY_OID  || 'ECRF.STUDY.001',
            subjects:  allSubjects.map(r => ({ subject: r.subjects ?? r, site: r.sites ?? null })),
            visits:    allVisits,
            entries:   allEntries,
            forms:     allForms,
            adverseEvents: allAE,
            consents:  allConsents,
            signatures: allSigs,
        });

        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="study_export_${Date.now()}.xml"`);

        await writeAudit(db, {
            tableName: 'export', recordId: sid, action: 'EXPORT',
            fieldName: 'format', newValue: 'ODM-XML',
            reason: 'Data export performed',
            user: req.user, ipAddress: req.ip,
        });

        res.send(xml);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Comprehensive CSV Export ─────────────────────────────────────────────────

// GET /api/export/csv?domain=DM|AE|CRF|DEV — domain CSV (admin, cra)
router.get('/csv', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const domain = (req.query.domain || 'DM').toUpperCase();

        let headers = [];
        let rows    = [];

        const sid = req.studyId;
        if (domain === 'DM') {
            headers = ['SUBJID','SITEID','SITE_NAME','SEX','GENDER_IDENTITY','DOB','ENRLDTC','STATUS','WDRAWDTC','WDRAWREASON'];
            const data = await db.select().from(subjects).leftJoin(sites, eq(subjects.siteId, sites.id)).where(eq(subjects.studyId, sid));
            rows = data.map(r => {
                const s = r.subjects ?? r;
                const site = r.sites ?? null;
                return [
                    s.subjectCode, site?.code || '', site?.name || '',
                    s.sex || 'U', s.genderIdentity || '', s.dateOfBirth || '',
                    s.enrolledAt ? new Date(s.enrolledAt).toISOString().split('T')[0] : '',
                    s.status || '',
                    s.withdrawnAt ? new Date(s.withdrawnAt).toISOString().split('T')[0] : '',
                    s.withdrawReason || '',
                ];
            });
        } else if (domain === 'AE') {
            headers = ['SUBJID','AESEQ','AETERM','AEDECOD','AESOC','AESTDTC','AEENDTC','AESEV','AESER','AEREL','AEOUT','AEACN','AESTATUS','CREATED_BY','CREATED_AT'];
            const data = await db.select().from(adverseEvents)
                .leftJoin(subjects, eq(adverseEvents.subjectId, subjects.id))
                .where(eq(adverseEvents.studyId, sid))
                .orderBy(adverseEvents.subjectId, adverseEvents.id);
            rows = data.map(r => {
                const ae = r.adverse_events ?? r;
                const subj = r.subjects ?? null;
                return [
                    subj?.subjectCode || '', ae.id,
                    ae.aeTerm, ae.meddraPt || '', ae.meddraSoc || '',
                    ae.onsetDate || '', ae.resolutionDate || '',
                    ae.severity, ae.isSerious ? 'Y' : 'N',
                    ae.causality || '', ae.outcome || '', ae.actionTaken || '',
                    ae.reportStatus, ae.createdByName || '',
                    ae.createdAt ? new Date(ae.createdAt).toISOString() : '',
                ];
            });
        } else if (domain === 'DEV') {
            headers = ['DEVID','SUBJID','TYPE','CATEGORY','DESCRIPTION','DEVIATION_DATE','DISCOVERY_DATE','ROOT_CAUSE','IMPACT','CAPA','REPORTED_TO_IRB','STATUS','CREATED_BY','CREATED_AT'];
            const data = await db.select().from(protocolDeviations)
                .leftJoin(subjects, eq(protocolDeviations.subjectId, subjects.id))
                .where(eq(protocolDeviations.studyId, sid))
                .orderBy(protocolDeviations.id);
            rows = data.map(r => {
                const d = r.protocol_deviations ?? r;
                const subj = r.subjects ?? null;
                return [
                    d.id, subj?.subjectCode || '', d.deviationType, d.category || '',
                    d.description, d.deviationDate || '', d.discoveryDate || '',
                    d.rootCause || '', d.impactOnSubject || '', d.capa || '',
                    d.reportedToIrb ? 'Y' : 'N', d.status,
                    d.createdByName || '',
                    d.createdAt ? new Date(d.createdAt).toISOString() : '',
                ];
            });
        } else if (domain === 'IC') {
            headers = ['ICID','SUBJID','VERSION','DATE','TIME','TYPE','LANGUAGE','OBTAINED_BY','WITNESS','WITNESS_TYPE','ASSENT','ASSENT_DTC','COPY_PROVIDED','WITHDRAWN','WITHDRAWN_DTC','WITHDRAWN_REASON','CREATED_BY','CREATED_AT'];
            const data = await db.select().from(informedConsents)
                .leftJoin(subjects, eq(informedConsents.subjectId, subjects.id))
                .where(eq(informedConsents.studyId, sid))
                .orderBy(informedConsents.id);
            rows = data.map(r => {
                const c = r.informed_consents ?? r;
                const subj = r.subjects ?? null;
                return [
                    c.id, subj?.subjectCode || '', c.consentVersion, c.consentDate,
                    c.consentTime || '',
                    c.consentType, c.language, c.obtainedByName || '',
                    c.witnessName || '', c.witnessType || '',
                    c.assentObtained ? 'Y' : 'N', c.assentDate || '',
                    c.copyProvided ? 'Y' : 'N',
                    c.isWithdrawn ? 'Y' : 'N',
                    c.withdrawnAt ? new Date(c.withdrawnAt).toISOString().split('T')[0] : '',
                    c.withdrawnReason || '', c.createdByName || '',
                    c.createdAt ? new Date(c.createdAt).toISOString() : '',
                ];
            });
        } else if (domain === 'LB') {
            // Laboratory — SDTM-style long format (one row per test result), the
            // natural shape for SPSS / stats.
            headers = ['SUBJID','VISIT','LBTEST','LBORRES','LBORRESU','LBORNRLO','LBORNRHI','LBORNR','LBDTC','LBNAM'];
            const data = await db.select().from(labResults)
                .leftJoin(subjects, eq(labResults.subjectId, subjects.id))
                .leftJoin(visits, eq(labResults.visitId, visits.id))
                .where(eq(labResults.studyId, sid))
                .orderBy(labResults.subjectId, labResults.id);
            rows = data.map(r => {
                const l = r.lab_results ?? r;
                return [
                    r.subjects?.subjectCode || '', r.visits?.visitName || '',
                    l.testName, l.valueNumeric ?? l.valueText ?? '', l.unit || '',
                    l.refRangeLow ?? '', l.refRangeHigh ?? '', l.refRangeText || '',
                    l.assessmentDate || '', l.labName || '',
                ];
            });
        } else if (domain === 'VS') {
            // Vital Signs — SDTM-style long format (one row per measurement).
            headers = ['SUBJID','VISIT','VSTESTCD','VSTEST','VSORRES','VSORRESU','VSDTC'];
            const data = await db.select().from(vitalSigns)
                .leftJoin(subjects, eq(vitalSigns.subjectId, subjects.id))
                .leftJoin(visits, eq(vitalSigns.visitId, visits.id))
                .where(eq(vitalSigns.studyId, sid))
                .orderBy(vitalSigns.subjectId, vitalSigns.id);
            rows = data.flatMap(r => vitalsToRows(
                r.vital_signs ?? r,
                r.subjects?.subjectCode || '',
                r.visits?.visitName || '',
            ));
        } else if (domain === 'CRF') {
            // CRF form data — long format (one row per captured field), safe across
            // forms with different field sets.
            headers = ['SUBJID','VISIT','FORM','FIELD','VALUE'];
            const data = await db.select().from(crfDataEntries)
                .leftJoin(subjects, eq(crfDataEntries.subjectId, subjects.id))
                .leftJoin(visits, eq(crfDataEntries.visitId, visits.id))
                .leftJoin(crfForms, eq(crfDataEntries.formId, crfForms.id))
                .where(eq(subjects.studyId, sid))
                .orderBy(crfDataEntries.subjectId, crfDataEntries.id);
            rows = data.flatMap(r => {
                const e = r.crf_data_entries ?? r;
                const subj = r.subjects?.subjectCode || '';
                const vis = r.visits?.visitName || '';
                const form = r.crf_forms?.name || '';
                const dj = e.dataJson && typeof e.dataJson === 'object' ? e.dataJson : {};
                return Object.entries(dj).map(([field, value]) => [
                    subj, vis, form, field, Array.isArray(value) ? value.join('; ') : (value ?? ''),
                ]);
            });
        } else {
            return res.status(400).json({ error: INVALID_DOMAIN_ERROR });
        }

        const csv = buildCsv(headers, rows);
        res.set('Content-Type', 'text/csv; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="${domain}_${Date.now()}.csv"`);

        await writeAudit(db, {
            tableName: 'export', recordId: req.studyId, action: 'EXPORT',
            fieldName: 'domain', newValue: domain,
            reason: `CSV export — domain: ${domain}`,
            user: req.user, ipAddress: req.ip,
        });

        res.send(withBom(csv)); // BOM so Excel detects UTF-8
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
