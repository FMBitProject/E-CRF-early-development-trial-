// IP Accountability / Drug Dispensing — ICH GCP E6(R3) §8.3.19, §8.4.7
import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { ipAccountability, subjects, sites } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// GET /api/ip — list IP accountability records
router.get('/', async (req, res) => {
    try {
        const { type, subjectId } = req.query;
        const conditions = [eq(ipAccountability.studyId, req.studyId)];
        if (type)      conditions.push(eq(ipAccountability.recordType, type));
        if (subjectId) conditions.push(eq(ipAccountability.subjectId, parseInt(subjectId)));

        const rows = await db
            .select({
                id:                ipAccountability.id,
                recordType:        ipAccountability.recordType,
                transactionDate:   ipAccountability.transactionDate,
                drugName:          ipAccountability.drugName,
                batchNo:           ipAccountability.batchNo,
                quantityIn:        ipAccountability.quantityIn,
                quantityOut:       ipAccountability.quantityOut,
                unit:              ipAccountability.unit,
                balance:           ipAccountability.balance,
                expiryDate:        ipAccountability.expiryDate,
                supplierRef:       ipAccountability.supplierRef,
                returnedQuantity:  ipAccountability.returnedQuantity,
                destroyedQuantity: ipAccountability.destroyedQuantity,
                destructionRef:    ipAccountability.destructionRef,
                notes:             ipAccountability.notes,
                subjectId:         ipAccountability.subjectId,
                subjectCode:       subjects.subjectCode,
                siteId:            ipAccountability.siteId,
                siteName:          sites.name,
                createdByName:     ipAccountability.createdByName,
                createdAt:         ipAccountability.createdAt,
            })
            .from(ipAccountability)
            .leftJoin(subjects, eq(ipAccountability.subjectId, subjects.id))
            .leftJoin(sites, eq(ipAccountability.siteId, sites.id))
            .where(and(...conditions))
            .orderBy(desc(ipAccountability.transactionDate));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/ip/summary — running balance per drug/batch
router.get('/summary', async (req, res) => {
    try {
        const rows = await db
            .select({
                drugName:   ipAccountability.drugName,
                batchNo:    ipAccountability.batchNo,
                unit:       ipAccountability.unit,
                recordType: ipAccountability.recordType,
                quantityIn: ipAccountability.quantityIn,
                quantityOut:ipAccountability.quantityOut,
            })
            .from(ipAccountability)
            .where(eq(ipAccountability.studyId, req.studyId));

        const summary = {};
        for (const r of rows) {
            const key = `${r.drugName}|${r.batchNo || ''}`;
            if (!summary[key]) summary[key] = { drugName: r.drugName, batchNo: r.batchNo, unit: r.unit, in: 0, out: 0 };
            summary[key].in  += parseFloat(r.quantityIn  || 0);
            summary[key].out += parseFloat(r.quantityOut || 0);
        }
        res.json(Object.values(summary).map(s => ({ ...s, balance: s.in - s.out })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/ip
router.post('/', requireRole('admin', 'investigator', 'pi', 'crc', 'data_manager'), async (req, res) => {
    try {
        const { recordType, transactionDate, drugName, batchNo, quantityIn, quantityOut,
                unit, expiryDate, supplierRef, returnedQuantity, destroyedQuantity,
                destructionRef, balance, notes, subjectId, siteId } = req.body;
        if (!recordType || !transactionDate || !drugName) {
            return res.status(400).json({ error: 'recordType, transactionDate, and drugName are required' });
        }
        const [row] = await db.insert(ipAccountability).values({
            studyId: req.studyId,
            siteId: siteId ? parseInt(siteId) : null,
            subjectId: subjectId ? parseInt(subjectId) : null,
            recordType, transactionDate, drugName,
            batchNo: batchNo || null,
            quantityIn: quantityIn || null, quantityOut: quantityOut || null,
            unit: unit || null, expiryDate: expiryDate || null,
            supplierRef: supplierRef || null,
            returnedQuantity: returnedQuantity || null,
            destroyedQuantity: destroyedQuantity || null,
            destructionRef: destructionRef || null,
            balance: balance || null,
            notes: notes || null,
            createdBy: req.user.id, createdByName: req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'ip_accountability', recordId: row.id, action: 'INSERT',
            newValue: JSON.stringify({ recordType, drugName, batchNo }),
            user: req.user, ipAddress: req.ip,
        });
        res.status(201).json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/ip/:id
router.patch('/:id', requireRole('admin', 'investigator', 'pi', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [existing] = await db.select().from(ipAccountability)
            .where(and(eq(ipAccountability.id, id), eq(ipAccountability.studyId, req.studyId)));
        if (!existing) return res.status(404).json({ error: 'Record not found' });

        const allowed = ['transactionDate', 'drugName', 'batchNo', 'quantityIn', 'quantityOut',
                         'unit', 'expiryDate', 'supplierRef', 'returnedQuantity', 'destroyedQuantity',
                         'destructionRef', 'balance', 'notes'];
        const updates = {};
        for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
        updates.updatedAt = new Date();

        const [updated] = await db.update(ipAccountability).set(updates)
            .where(eq(ipAccountability.id, id)).returning();
        await writeAudit(db, {
            tableName: 'ip_accountability', recordId: id, action: 'UPDATE',
            reason: req.body.reason || 'Field update',
            user: req.user, ipAddress: req.ip,
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/ip/:id (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await db.delete(ipAccountability)
            .where(and(eq(ipAccountability.id, id), eq(ipAccountability.studyId, req.studyId)));
        await writeAudit(db, {
            tableName: 'ip_accountability', recordId: id, action: 'DELETE',
            user: req.user, ipAddress: req.ip,
        });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
