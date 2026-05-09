import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/better-auth.js';
import { requireAuth } from './middleware/auth.js';
import { client } from './db/connection.js';

import subjectsRouter   from './routes/subjects.js';
import visitsRouter     from './routes/visits.js';
import formsRouter      from './routes/forms.js';
import entriesRouter    from './routes/entries.js';
import auditRouter      from './routes/audit.js';
import queriesRouter    from './routes/queries.js';
import mfaRouter        from './routes/mfa.js';
import registerRouter   from './routes/register.js';
import sitesRouter      from './routes/sites.js';
import dashboardRouter  from './routes/dashboard.js';
import signaturesRouter from './routes/signatures.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir   = path.resolve(__dirname, '../../');

// ── Startup migration: add extended visit columns if missing ──
async function runMigrations() {
    const stmts = [
        // Visit extended columns
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_order integer`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_type text DEFAULT 'Scheduled'`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS planned_date text`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS actual_date text`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS window_days integer`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS study_day integer`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS window_compliance text`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS missed_reason text`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS notes text`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS created_by_name text`,
        // Feature: site-scoped user access
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS site_id integer`,
        // Feature: electronic signature — add 'Signed' enum value
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='Signed' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='entry_status')) THEN ALTER TYPE entry_status ADD VALUE 'Signed'; END IF; END $$`,
        // Feature: electronic signatures table
        `CREATE TABLE IF NOT EXISTS esignatures (
            id         SERIAL PRIMARY KEY,
            entry_id   INTEGER REFERENCES crf_data_entries(id) ON DELETE CASCADE,
            user_id    TEXT REFERENCES "user"(id),
            user_name  TEXT,
            user_role  TEXT,
            meaning    TEXT NOT NULL,
            ip_address TEXT,
            signed_at  TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Feature: inclusion/exclusion assessments table
        `CREATE TABLE IF NOT EXISTS ie_assessments (
            id               SERIAL PRIMARY KEY,
            subject_id       INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
            criteria_json    JSONB NOT NULL DEFAULT '[]',
            passed           BOOLEAN NOT NULL,
            assessed_by      TEXT REFERENCES "user"(id),
            assessed_by_name TEXT,
            assessed_at      TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Performance: index for audit trail ORDER BY created_at DESC
        `CREATE INDEX IF NOT EXISTS idx_audit_trails_created_at ON audit_trails (created_at DESC)`,
        // Performance: index for queries by status (dashboard open count)
        `CREATE INDEX IF NOT EXISTS idx_queries_status ON queries (status)`,
        // Performance: index for subjects by status (dashboard active count)
        `CREATE INDEX IF NOT EXISTS idx_subjects_status ON subjects (status)`,
    ];
    for (const stmt of stmts) {
        await client.unsafe(stmt);
    }
}
// Run migrations async — server starts immediately, migrations complete before first real request
runMigrations().catch(err => console.warn('Migration warning:', err.message));

const app = express();

app.use(cors({
    origin:      (_origin, cb) => cb(null, true),
    credentials: true,
}));

// Spoof Origin so Better Auth accepts requests from any deployment URL
const _trustedOrigin = process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
app.all('/api/auth/*', (req, _res, next) => {
    req.headers['origin'] = _trustedOrigin;
    next();
});

// Better Auth handles all /api/auth/* routes (sign-in, sign-out, session, etc.)
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

// Auth-required API routes
app.use('/api/subjects',             requireAuth, subjectsRouter);
app.use('/api/subjects/:subjectId/visits', requireAuth, visitsRouter);
app.use('/api/forms',                requireAuth, formsRouter);
app.use('/api/entries',              requireAuth, entriesRouter);
app.use('/api/audit',                requireAuth, auditRouter);
app.use('/api/queries',              requireAuth, queriesRouter);

app.use('/api/mfa',      mfaRouter);
app.use('/api/register', registerRouter);
app.use('/api/sites',       requireAuth, sitesRouter);
app.use('/api/dashboard',   requireAuth, dashboardRouter);
app.use('/api/signatures',  requireAuth, signaturesRouter);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Serve all static frontend files from project root
app.use(express.static(rootDir));
app.get('/', (_req, res) => res.sendFile(path.join(rootDir, 'login.html')));

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
    console.log(`E-CRF Server running on http://localhost:${PORT}`);
    console.log(`Better Auth endpoint: http://localhost:${PORT}/api/auth`);
});
