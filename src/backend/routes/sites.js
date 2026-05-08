import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { sites } from '../db/schemas/schema.js';

const router = Router();

// GET /api/sites — list all active sites
router.get('/', async (req, res) => {
    try {
        const rows = await db.select().from(sites).where(eq(sites.status, 'Active'));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
