// Periodic User Access Review — ICH GCP E6(R3) C.4.2
import { Router } from 'express';
import { client, db } from '../db/connection.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

function isMissingTable(err) {
    return (err?.message || '').includes('does not exist') ||
           err?.code === '42P01' || err?.cause?.code === '42P01';
}

// GET /api/access-review — list reviews (admin only)
router.get('/', requireRole('admin'), async (req, res) => {
    try {
        const rows = await client`
            SELECT * FROM access_reviews
            WHERE study_id = ${req.studyId} OR study_id IS NULL
            ORDER BY created_at DESC
        `;
        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.json([]);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/access-review — initiate a new review (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
    try {
        const { reviewPeriod, notes } = req.body;
        if (!reviewPeriod) return res.status(400).json({ error: 'reviewPeriod is required' });

        // Collect all active users with their roles for the certifications scaffold
        const users = await client`
            SELECT id, name, role FROM "user" WHERE is_active = true ORDER BY name
        `;
        const certifications = users.map(u => ({
            userId: u.id, userName: u.name, role: u.role,
            certified: false, certifiedAt: null, notes: null,
        }));

        const [row] = await client`
            INSERT INTO access_reviews
                (study_id, review_period, status, initiated_by, initiated_by_name, certifications, notes)
            VALUES
                (${req.studyId}, ${reviewPeriod}, 'In Progress',
                 ${req.user.id}, ${req.user.name}, ${JSON.stringify(certifications)}, ${notes ?? null})
            RETURNING *
        `;

        await writeAudit(db, {
            tableName: 'access_reviews', recordId: row.id, action: 'INSERT',
            newValue: `Period: ${reviewPeriod} | Users: ${users.length}`,
            reason: 'Periodic user access review initiated per ICH GCP E6(R3) C.4.2',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(row);
    } catch (err) {
        if (isMissingTable(err)) return res.status(503).json({ error: 'access_reviews table not ready' });
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/access-review/:id/certify — certify (approve/flag) a single user's access
router.patch('/:id/certify', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { userId, certified, certNotes } = req.body;
        if (!userId || certified === undefined) {
            return res.status(400).json({ error: 'userId and certified are required' });
        }

        const [existing] = await client`
            SELECT id, certifications FROM access_reviews
            WHERE id = ${id} AND (study_id = ${req.studyId} OR study_id IS NULL)
        `;
        if (!existing) return res.status(404).json({ error: 'Review not found' });

        const certs = existing.certifications ?? [];
        const idx = certs.findIndex(c => c.userId === userId);
        if (idx === -1) return res.status(404).json({ error: 'User not found in review' });

        const wasCertified = certs[idx].certified;
        certs[idx] = {
            ...certs[idx],
            certified:    Boolean(certified),
            certifiedAt:  new Date().toISOString(),
            certifiedBy:  req.user.name,
            notes:        certNotes ?? certs[idx].notes,
        };

        const [updated] = await client`
            UPDATE access_reviews
            SET certifications = ${JSON.stringify(certs)}, updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        // Certification decisions are the core Part 11 artifact of the review —
        // each one must land in the audit trail.
        await writeAudit(db, {
            tableName: 'access_reviews', recordId: id, action: 'UPDATE',
            fieldName: 'certifications',
            oldValue: `${certs[idx].userName}: certified=${wasCertified}`,
            newValue: `${certs[idx].userName}: certified=${Boolean(certified)}${certNotes ? ` — ${certNotes}` : ''}`,
            reason: 'User access certification decision (ICH GCP E6(R3) C.4.2)',
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/access-review/:id/complete — mark review complete
router.post('/:id/complete', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [existing] = await client`
            SELECT id, status FROM access_reviews
            WHERE id = ${id} AND (study_id = ${req.studyId} OR study_id IS NULL)
        `;
        if (!existing) return res.status(404).json({ error: 'Review not found' });
        if (existing.status === 'Complete') return res.status(409).json({ error: 'Review already completed' });

        const [updated] = await client`
            UPDATE access_reviews
            SET status = 'Complete', completed_at = NOW(),
                completed_by = ${req.user.id}, completed_by_name = ${req.user.name}
            WHERE id = ${id}
            RETURNING *
        `;

        await writeAudit(db, {
            tableName: 'access_reviews', recordId: id, action: 'UPDATE',
            fieldName: 'status', oldValue: 'In Progress', newValue: 'Complete',
            reason: `Access review completed by ${req.user.name}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
