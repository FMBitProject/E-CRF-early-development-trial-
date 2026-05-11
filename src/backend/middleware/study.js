// Study context middleware — validates X-Study-ID header and user access
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { studyUsers, studies } from '../db/schemas/schema.js';

export async function requireStudy(req, res, next) {
    const raw = req.headers['x-study-id'];
    if (!raw) return res.status(400).json({ error: 'X-Study-ID header is required' });

    const id = parseInt(raw);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid study ID' });

    try {
        const [study] = await db.select({ id: studies.id, status: studies.status })
            .from(studies).where(eq(studies.id, id));
        if (!study) return res.status(404).json({ error: 'Study not found' });

        // Admin can access any study; others must be assigned
        if (req.user.role !== 'admin') {
            const [assignment] = await db.select({ id: studyUsers.id })
                .from(studyUsers)
                .where(and(eq(studyUsers.studyId, id), eq(studyUsers.userId, req.user.id)));
            if (!assignment) {
                return res.status(403).json({ error: 'You are not assigned to this study' });
            }
        }

        req.studyId = id;
        next();
    } catch (err) {
        // Table may not exist yet on first cold start — let admin through
        const missing = err?.code === '42P01' || err?.cause?.code === '42P01' ||
                        (err?.message || '').includes('does not exist') ||
                        (err?.cause?.message || '').includes('does not exist');
        if (missing && req.user?.role === 'admin') {
            req.studyId = id;
            return next();
        }
        res.status(500).json({ error: err.message });
    }
}
