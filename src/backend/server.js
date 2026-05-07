import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/better-auth.js';
import { requireAuth } from './middleware/auth.js';
import { writeAudit } from './lib/audit.js';
import { db } from './db/connection.js';

import subjectsRouter from './routes/subjects.js';
import visitsRouter   from './routes/visits.js';
import formsRouter    from './routes/forms.js';
import entriesRouter  from './routes/entries.js';
import auditRouter    from './routes/audit.js';
import queriesRouter  from './routes/queries.js';

const app = express();

// CORS — allow the frontend origin
app.use(cors({
    origin:      process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    credentials: true,
}));

// Better Auth handles all /api/auth/* routes (sign-in, sign-out, session, etc.)
app.all('/api/auth/*', toNodeHandler(auth));

// Body parser for all other routes
app.use(express.json());

// Auth-required API routes
app.use('/api/subjects',          requireAuth, subjectsRouter);
app.use('/api/subjects/:sid/visits', requireAuth, visitsRouter);
app.use('/api/forms',             requireAuth, formsRouter);
app.use('/api/entries',           requireAuth, entriesRouter);
app.use('/api/audit',             requireAuth, auditRouter);
app.use('/api/queries',           requireAuth, queriesRouter);

// Health check (no auth)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
    const { default: path } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    app.use(express.static(path.join(__dirname, '../frontend')));
    app.get('*', (_req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    });
}

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
    console.log(`E-CRF Server running on http://localhost:${PORT}`);
    console.log(`Better Auth endpoint: http://localhost:${PORT}/api/auth`);
});
