import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { crfForms } from '../db/schemas/schema.js';

const router = Router();

// GET /api/forms — list all active CRF form templates
router.get('/', async (req, res) => {
    try {
        const rows = await db.select({
            id:          crfForms.id,
            name:        crfForms.name,
            description: crfForms.description,
            version:     crfForms.version,
            isActive:    crfForms.isActive,
        }).from(crfForms).where(eq(crfForms.isActive, true));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/forms/:id — single form with schema
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db.select().from(crfForms)
            .where(eq(crfForms.id, parseInt(req.params.id)));
        if (!row) return res.status(404).json({ error: 'Form not found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
