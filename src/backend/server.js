import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir   = path.resolve(__dirname, '../../');

const app = express();

app.use(cors({
    origin:      (_origin, cb) => cb(null, true),
    credentials: true,
}));

// In dev: spoof Origin so Better Auth accepts requests from any public URL
if (process.env.NODE_ENV !== 'production') {
    const _trustedOrigin = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
    app.all('/api/auth/*', (req, _res, next) => {
        req.headers['origin'] = _trustedOrigin;
        next();
    });
}

// Better Auth handles all /api/auth/* routes (sign-in, sign-out, session, etc.)
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

// Auth-required API routes
app.use('/api/subjects',             requireAuth, subjectsRouter);
app.use('/api/subjects/:sid/visits', requireAuth, visitsRouter);
app.use('/api/forms',                requireAuth, formsRouter);
app.use('/api/entries',              requireAuth, entriesRouter);
app.use('/api/audit',                requireAuth, auditRouter);
app.use('/api/queries',              requireAuth, queriesRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Serve all static frontend files from project root
app.use(express.static(rootDir));
app.get('/', (_req, res) => res.sendFile(path.join(rootDir, 'login.html')));

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
    console.log(`E-CRF Server running on http://localhost:${PORT}`);
    console.log(`Better Auth endpoint: http://localhost:${PORT}/api/auth`);
});
