import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { verifyPassword } from '@better-auth/utils/password';
import { db } from '../db/connection.js';
import { esignatures, crfDataEntries, account } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

async function checkPassword(userId, password) {
    const [acct] = await db
        .select({ password: account.password })
        .from(account)
        .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
    if (!acct?.password) return false;
    return verifyPassword(acct.password, password);
}

// POST /api/signatures — e-sign a saved data entry (investigator / admin)
router.post('/', requireRole('investigator', 'admin'), async (req, res) => {
    try {
        const { entryId, password, meaning } = req.body;
        if (!entryId || !password || !meaning) {
            return res.status(400).json({ error: 'entryId, password, and meaning are required' });
        }

        const [entry] = await db.select().from(crfDataEntries)
            .where(eq(crfDataEntries.id, parseInt(entryId)));
        if (!entry) return res.status(404).json({ error: 'Entry not found' });
        if (entry.status === 'Locked') return res.status(409).json({ error: 'Entry is locked' });
        if (entry.status === 'Signed') return res.status(409).json({ error: 'Entry already signed' });
        if (entry.status === 'Draft')  return res.status(400).json({ error: 'Save entry before signing' });

        const valid = await checkPassword(req.user.id, password);
        if (!valid) {
            return res.status(401).json({ error: 'Incorrect password — electronic signature rejected' });
        }

        const [sig] = await db.insert(esignatures).values({
            entryId:  parseInt(entryId),
            userId:   req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            meaning,
            ipAddress: req.ip,
        }).returning();

        await db.update(crfDataEntries)
            .set({ status: 'Signed', updatedAt: new Date(), updatedBy: req.user.id })
            .where(eq(crfDataEntries.id, parseInt(entryId)));

        await writeAudit(db, {
            tableName: 'crf_data_entries', recordId: parseInt(entryId), action: 'UPDATE',
            fieldName: 'status', oldValue: entry.status, newValue: 'Signed',
            reason: `Electronic signature applied — ${meaning}`,
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(sig);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/signatures?entryId=X — fetch signatures for an entry
router.get('/', async (req, res) => {
    try {
        const { entryId } = req.query;
        const rows = await db.select().from(esignatures)
            .where(entryId ? eq(esignatures.entryId, parseInt(entryId)) : undefined)
            .orderBy(esignatures.signedAt);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
