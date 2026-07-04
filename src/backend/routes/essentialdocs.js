// Essential Documents — ICH GCP E6(R3) §8
import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { essentialDocuments, sites } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

/**
 * ICH GCP E6(R3) §8 essential documents mapped to DIA TMF Reference Model artifact IDs.
 * Structure: { [sectionKey]: [{ label, artifactId, required, description }] }
 * artifactId format: DIA zone.section[.subsection]
 */
export const ESSENTIAL_DOC_TYPES = {
    '8.1 — Pre-trial': [
        { label: 'Protocol (Signed)',                  artifactId: '01.004', required: true,  description: 'Final signed protocol version' },
        { label: 'Investigator Brochure (IB)',          artifactId: '02.001', required: true,  description: 'Current IB version at trial start' },
        { label: 'Informed Consent Form (ICF)',         artifactId: '06.001', required: true,  description: 'Approved ICF and any translated versions' },
        { label: 'IRB/IEC Approval — Protocol',        artifactId: '04.001', required: true,  description: 'Written approval of protocol' },
        { label: 'IRB/IEC Approval — ICF',             artifactId: '04.001', required: true,  description: 'Written approval of ICF' },
        { label: 'IRB/IEC Composition List',           artifactId: '04.002', required: true,  description: 'List of IRB/IEC members' },
        { label: 'Regulatory Authority Approval',      artifactId: '03.001', required: true,  description: 'CTA/IND or equivalent approval' },
        { label: 'Sponsor-Investigator Agreement',     artifactId: '01.003', required: true,  description: 'Signed agreement per ICH E6(R3) §8.1.13' },
        { label: 'Investigator CV',                    artifactId: '05.001', required: true,  description: 'Principal Investigator CV' },
        { label: 'Sub-Investigator CV(s)',             artifactId: '05.001', required: false, description: 'CVs for all sub-investigators' },
        { label: 'GCP Training Records',               artifactId: '01.014', required: true,  description: 'GCP training certificates for all staff' },
        { label: 'Delegation Log (Baseline)',           artifactId: '01.013', required: true,  description: 'Initial task delegation per ICH E6(R3) §5.6' },
        { label: 'Laboratory Normal Ranges',           artifactId: '10.002', required: true,  description: 'Current normal ranges for central lab' },
        { label: 'Laboratory Certification',           artifactId: '10.001', required: true,  description: 'Accreditation / certification of local lab' },
        { label: 'Randomization Procedure',            artifactId: '01.012', required: false, description: 'Randomization and blinding procedures' },
        { label: 'IP Manufacturing Certificate',       artifactId: '07.001', required: true,  description: 'Certificate of manufacture/analysis' },
        { label: 'IP Label (Sample)',                  artifactId: '07.002', required: true,  description: 'Approved IP label per regulations' },
        { label: 'IP Certificate of Analysis',        artifactId: '07.003', required: true,  description: 'CoA for each batch shipped to site' },
        { label: 'Monitoring Plan (RBMP)',             artifactId: '01.008', required: true,  description: 'Risk-based monitoring plan' },
        { label: 'Data Management Plan',              artifactId: '11.001', required: true,  description: 'DMP per ICH E6(R3) §5.5' },
        { label: 'Statistical Analysis Plan',         artifactId: '09.001', required: false, description: 'SAP (if available pre-trial)' },
        { label: 'Sample CRF',                        artifactId: '06.009', required: true,  description: 'Blank sample CRF for regulatory file' },
        { label: 'Financial Disclosure (Investigators)', artifactId: '01.002', required: false, description: 'Financial disclosure forms' },
    ],
    '8.2 — Trial Conduct': [
        { label: 'Updated Investigator Brochure',     artifactId: '02.001', required: false, description: 'Any IB updates issued during trial' },
        { label: 'Protocol Amendment(s)',             artifactId: '01.004', required: false, description: 'Signed amendments + rationale' },
        { label: 'ICF Amendment(s)',                  artifactId: '06.001', required: false, description: 'Updated ICF versions with IRB approval' },
        { label: 'IRB/IEC Approval — Amendment',     artifactId: '04.001', required: false, description: 'Approval of each protocol/ICF amendment' },
        { label: 'Regulatory Notification — Amendment', artifactId: '03.002', required: false, description: 'Regulatory submission/approval of amendments' },
        { label: 'SAE Report — Expedited (7-day)',    artifactId: '08.001', required: false, description: 'Expedited SAE reports to authority' },
        { label: 'SAE Report — Follow-up (15-day)',   artifactId: '08.001', required: false, description: 'Follow-up/final SAE reports' },
        { label: 'IP Accountability Log',             artifactId: '07.007', required: true,  description: 'Ongoing IP receipt, dispensing, return records' },
        { label: 'IP Blinding/Unblinding Records',   artifactId: '07.008', required: false, description: 'Decoding envelopes and unblinding records' },
        { label: 'Monitoring Visit Reports',          artifactId: '05.005', required: true,  description: 'All monitoring visit reports' },
        { label: 'Monitoring Follow-up Letters',      artifactId: '05.006', required: false, description: 'Follow-up correspondence from monitoring' },
        { label: 'Subject Screening Log',             artifactId: '05.012', required: true,  description: 'Screen failure log per ICH E6(R3) §8.2.20' },
        { label: 'Subject Enrollment Log',            artifactId: '05.011', required: true,  description: 'Enrollment/randomization log' },
        { label: 'Delegation Log (Updates)',          artifactId: '01.013', required: true,  description: 'Updated delegation throughout trial' },
        { label: 'Training Records (On-study)',       artifactId: '01.014', required: true,  description: 'Protocol-specific training records' },
        { label: 'Completed CRF (Certified Copy)',    artifactId: '06.009', required: true,  description: 'Copies of completed CRFs' },
        { label: 'Relevant Communications',           artifactId: '01.017', required: false, description: 'Sponsor-site communications, letters' },
        { label: 'Site Staff Signature Log',          artifactId: '05.003', required: true,  description: 'Signature/initials log for all staff' },
        { label: 'IP Decoding Documents (Sealed)',    artifactId: '07.004', required: false, description: 'Emergency unblinding codes (sealed)' },
    ],
    '8.3 — Post-trial': [
        { label: 'IP Destruction Certificate',        artifactId: '07.009', required: true,  description: 'Certificate of IP destruction' },
        { label: 'IP Return Documentation',           artifactId: '07.010', required: false, description: 'IP return records (if applicable)' },
        { label: 'Final Subject Disposition Log',     artifactId: '05.013', required: true,  description: 'Complete record of subject outcomes' },
        { label: 'Patient Identification List',       artifactId: '05.014', required: true,  description: 'Subject code ↔ identifier mapping (confidential)' },
        { label: 'Audit Certificate',                 artifactId: '01.019', required: false, description: 'GCP audit certificate (if audited)' },
        { label: 'Database Lock Certificate',         artifactId: '11.007', required: true,  description: 'Signed database lock documentation' },
        { label: 'Statistical Analysis Plan (Final)', artifactId: '09.001', required: true,  description: 'Final SAP version' },
        { label: 'Clinical Study Report (CSR)',       artifactId: '01.024', required: true,  description: 'Final CSR per ICH E3' },
        { label: 'End of Trial Notification',         artifactId: '03.010', required: true,  description: 'Regulatory notification of trial end' },
        { label: 'Regulatory Submission',             artifactId: '03.009', required: false, description: 'Final regulatory submission package' },
        { label: 'Archiving Notification',            artifactId: '01.025', required: true,  description: 'TMF archiving confirmation' },
    ],
};

// GET /api/essential-docs — list docs for study
router.get('/', async (req, res) => {
    try {
        const { section } = req.query;
        const conditions = [eq(essentialDocuments.studyId, req.studyId)];
        if (section) conditions.push(eq(essentialDocuments.section, section));

        const rows = await db
            .select({
                id:             essentialDocuments.id,
                section:        essentialDocuments.section,
                documentType:   essentialDocuments.documentType,
                tmfArtifactId:  essentialDocuments.tmfArtifactId,
                isRequired:     essentialDocuments.isRequired,
                documentRef:    essentialDocuments.documentRef,
                version:        essentialDocuments.version,
                documentDate:   essentialDocuments.documentDate,
                expiryDate:     essentialDocuments.expiryDate,
                status:         essentialDocuments.status,
                notes:          essentialDocuments.notes,
                siteId:         essentialDocuments.siteId,
                siteName:       sites.name,
                uploadedByName: essentialDocuments.uploadedByName,
                uploadedAt:     essentialDocuments.uploadedAt,
                updatedAt:      essentialDocuments.updatedAt,
            })
            .from(essentialDocuments)
            .leftJoin(sites, eq(essentialDocuments.siteId, sites.id))
            .where(and(...conditions))
            .orderBy(essentialDocuments.section, essentialDocuments.documentType);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/essential-docs/types — return checklist structure (array of objects per section)
router.get('/types', (_req, res) => {
    res.json(ESSENTIAL_DOC_TYPES);
});

// GET /api/essential-docs/completeness — section-level stats
router.get('/completeness', async (req, res) => {
    try {
        const rows = await db
            .select({ section: essentialDocuments.section, status: essentialDocuments.status })
            .from(essentialDocuments)
            .where(eq(essentialDocuments.studyId, req.studyId));

        const totals = {};
        for (const [sec, artifacts] of Object.entries(ESSENTIAL_DOC_TYPES)) {
            const required = artifacts.filter(a => a.required).length;
            totals[sec] = { total: artifacts.length, required, current: 0, pending: 0, na: 0 };
        }
        for (const r of rows) {
            if (totals[r.section]) {
                if (r.status === 'Current') totals[r.section].current++;
                else if (r.status === 'Not Applicable') totals[r.section].na++;
                else totals[r.section].pending++;
            }
        }
        res.json(totals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/essential-docs
router.post('/', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const { section, documentType, documentRef, version, documentDate,
                expiryDate, status, notes, siteId, tmfArtifactId, isRequired } = req.body;
        if (!section || !documentType) {
            return res.status(400).json({ error: 'section and documentType are required' });
        }
        const [row] = await db.insert(essentialDocuments).values({
            studyId:        req.studyId,
            siteId:         siteId ? parseInt(siteId) : null,
            section,
            documentType,
            tmfArtifactId:  tmfArtifactId  || null,
            isRequired:     isRequired      ?? false,
            documentRef:    documentRef    || null,
            version:        version        || null,
            documentDate:   documentDate   || null,
            expiryDate:     expiryDate     || null,
            status:         status         || 'Pending',
            notes:          notes          || null,
            uploadedBy:     req.user.id,
            uploadedByName: req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'essential_documents', recordId: row.id, action: 'INSERT',
            newValue: JSON.stringify({ documentType, status }),
            user: req.user, ipAddress: req.ip,
        });
        res.status(201).json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/essential-docs/:id
router.patch('/:id', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [existing] = await db.select().from(essentialDocuments)
            .where(and(eq(essentialDocuments.id, id), eq(essentialDocuments.studyId, req.studyId)));
        if (!existing) return res.status(404).json({ error: 'Document not found' });

        const allowed = ['documentRef', 'version', 'documentDate', 'expiryDate', 'status', 'notes', 'tmfArtifactId', 'isRequired'];
        const updates = {};
        for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
        updates.updatedAt = new Date();

        const [updated] = await db.update(essentialDocuments).set(updates)
            .where(eq(essentialDocuments.id, id)).returning();
        await writeAudit(db, {
            tableName: 'essential_documents', recordId: id, action: 'UPDATE',
            oldValue: existing.status, newValue: updated.status,
            reason: req.body.reason || 'Document status update',
            user: req.user, ipAddress: req.ip,
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/essential-docs/:id
router.delete('/:id', requireRole('admin', 'cra'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [deleted] = await db.delete(essentialDocuments)
            .where(and(eq(essentialDocuments.id, id), eq(essentialDocuments.studyId, req.studyId)))
            .returning();
        if (!deleted) return res.status(404).json({ error: 'Document not found' });
        await writeAudit(db, {
            tableName: 'essential_documents', recordId: id, action: 'DELETE',
            oldValue: deleted.title ?? deleted.docType ?? String(id),
            user: req.user, ipAddress: req.ip,
        });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
