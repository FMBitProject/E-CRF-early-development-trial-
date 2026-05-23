// Essential Documents — ICH GCP E6(R3) §8
import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { essentialDocuments, sites } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// ICH E6(R3) §8 checklist — pre-defined document types per section
export const ESSENTIAL_DOC_TYPES = {
    '§8.2 — Before Trial': [
        'Investigator Brochure (IB)',
        'Protocol + Amendments (Signed)',
        'Informed Consent Form (ICF)',
        'IRB/IEC Approval (Protocol)',
        'IRB/IEC Approval (ICF)',
        'IRB/IEC Composition List',
        'Regulatory Authority Approval',
        'Investigator CV',
        'Co-Investigator CV',
        'Sub-Investigator CV',
        'Laboratory Normal Ranges',
        'Laboratory Certification / Accreditation',
        'Randomization Procedure',
        'IP Manufacturing Certificate',
        'IP Label',
        'IP Certificate of Analysis',
        'Monitoring Plan (RBMP)',
        'Data Management Plan',
        'Sample CRF',
        'Sponsor-Investigator Agreement',
    ],
    '§8.3 — During Trial': [
        'Updated IB',
        'Amendment (Protocol)',
        'Amendment (ICF)',
        'IRB/IEC Approval (Amendment)',
        'Regulatory Notification/Approval (Amendment)',
        'SAE Report (7-day)',
        'SAE Report (15-day)',
        'IP Receipt / Accountability Log',
        'IP Decoding Documents (Sealed)',
        'Completed CRF (Certified Copy)',
        'Subject Screening Log',
        'Enrollment Log',
        'Delegation Log',
        'Training Record',
        'Monitoring Visit Report',
        'Relevant Communications',
        'Site Staff Signature Log',
    ],
    '§8.4 — After Trial Completion': [
        'IP Destruction Certificate',
        'IP Return Documentation',
        'Final Subject Disposition Log',
        'Completed Patient Identification List',
        'Audit Certificate',
        'Final Database Lock Certificate',
        'Statistical Analysis Plan (Final)',
        'Clinical Study Report',
        'Regulatory Submission Documentation',
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

// GET /api/essential-docs/types — return checklist structure
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
        for (const [sec, types] of Object.entries(ESSENTIAL_DOC_TYPES)) {
            totals[sec] = { total: types.length, current: 0, pending: 0, na: 0 };
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
                expiryDate, status, notes, siteId } = req.body;
        if (!section || !documentType) {
            return res.status(400).json({ error: 'section and documentType are required' });
        }
        const [row] = await db.insert(essentialDocuments).values({
            studyId: req.studyId,
            siteId: siteId ? parseInt(siteId) : null,
            section, documentType,
            documentRef: documentRef || null,
            version: version || null,
            documentDate: documentDate || null,
            expiryDate: expiryDate || null,
            status: status || 'Pending',
            notes: notes || null,
            uploadedBy: req.user.id, uploadedByName: req.user.name,
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

        const allowed = ['documentRef', 'version', 'documentDate', 'expiryDate', 'status', 'notes'];
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
        await db.delete(essentialDocuments)
            .where(and(eq(essentialDocuments.id, id), eq(essentialDocuments.studyId, req.studyId)));
        await writeAudit(db, {
            tableName: 'essential_documents', recordId: id, action: 'DELETE',
            user: req.user, ipAddress: req.ip,
        });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
