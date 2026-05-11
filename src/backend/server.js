import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/better-auth.js';
import { requireAuth } from './middleware/auth.js';
import { client } from './db/connection.js';

import subjectsRouter      from './routes/subjects.js';
import visitsRouter        from './routes/visits.js';
import formsRouter         from './routes/forms.js';
import entriesRouter       from './routes/entries.js';
import auditRouter         from './routes/audit.js';
import queriesRouter       from './routes/queries.js';
import mfaRouter           from './routes/mfa.js';
import registerRouter      from './routes/register.js';
import sitesRouter         from './routes/sites.js';
import dashboardRouter     from './routes/dashboard.js';
import signaturesRouter    from './routes/signatures.js';
import adverseEventsRouter from './routes/adverseevents.js';
import deviationsRouter    from './routes/deviations.js';
import consentsRouter      from './routes/consents.js';
import randomizationRouter from './routes/randomization.js';
import exportRouter        from './routes/export.js';
import securityRouter      from './routes/security.js';
import dblockRouter        from './routes/dblock.js';
import delegationRouter    from './routes/delegation.js';
import saeReportsRouter    from './routes/saereports.js';
import monitoringRouter    from './routes/monitoring.js';
import studiesRouter       from './routes/studies.js';
import { requireStudy }    from './middleware/study.js';
import { rateLimitAuth }   from './middleware/ratelimit.js';

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
        // Tier 1 — Adverse Events / SAE
        `CREATE TABLE IF NOT EXISTS adverse_events (
            id                        SERIAL PRIMARY KEY,
            subject_id                INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            ae_term                   TEXT NOT NULL,
            meddra_pt                 TEXT,
            meddra_soc                TEXT,
            onset_date                TEXT,
            resolution_date           TEXT,
            outcome                   TEXT,
            severity                  TEXT NOT NULL,
            is_serious                BOOLEAN NOT NULL DEFAULT FALSE,
            serious_criteria          JSONB NOT NULL DEFAULT '[]',
            causality                 TEXT,
            action_taken              TEXT,
            narrative                 TEXT,
            report_status             TEXT NOT NULL DEFAULT 'Draft',
            reported_to_sponsor_at    TIMESTAMP,
            reported_to_irb_at        TIMESTAMP,
            requires_expedited_report BOOLEAN NOT NULL DEFAULT FALSE,
            expedited_deadline        TIMESTAMP,
            created_by                TEXT REFERENCES "user"(id),
            created_by_name           TEXT,
            created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by                TEXT REFERENCES "user"(id),
            updated_at                TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ae_subject ON adverse_events (subject_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ae_is_serious ON adverse_events (is_serious)`,
        // Tier 1 — Protocol Deviations
        `CREATE TABLE IF NOT EXISTS protocol_deviations (
            id                 SERIAL PRIMARY KEY,
            subject_id         INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
            deviation_type     TEXT NOT NULL,
            category           TEXT,
            description        TEXT NOT NULL,
            deviation_date     TEXT,
            discovery_date     TEXT,
            root_cause         TEXT,
            impact_on_subject  TEXT,
            capa               TEXT,
            reported_to_irb    BOOLEAN NOT NULL DEFAULT FALSE,
            reported_to_irb_at TIMESTAMP,
            status             TEXT NOT NULL DEFAULT 'Open',
            created_by         TEXT REFERENCES "user"(id),
            created_by_name    TEXT,
            created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by         TEXT REFERENCES "user"(id),
            updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_deviations_status ON protocol_deviations (status)`,
        // Tier 1 — Informed Consent (UU PDP)
        `CREATE TABLE IF NOT EXISTS informed_consents (
            id               SERIAL PRIMARY KEY,
            subject_id       INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            consent_version  TEXT NOT NULL,
            consent_date     TEXT NOT NULL,
            consent_type     TEXT NOT NULL DEFAULT 'Initial',
            language         TEXT NOT NULL DEFAULT 'Indonesian',
            witness_name     TEXT,
            notes            TEXT,
            is_withdrawn     BOOLEAN NOT NULL DEFAULT FALSE,
            withdrawn_at     TIMESTAMP,
            withdrawn_reason TEXT,
            created_by       TEXT REFERENCES "user"(id),
            created_by_name  TEXT,
            created_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_consents_subject ON informed_consents (subject_id)`,
        // Tier 1 — Randomization List
        `CREATE TABLE IF NOT EXISTS randomization_list (
            id            SERIAL PRIMARY KEY,
            rand_code     TEXT NOT NULL UNIQUE,
            treatment_arm TEXT NOT NULL,
            stratum       TEXT,
            is_used       BOOLEAN NOT NULL DEFAULT FALSE,
            uploaded_by   TEXT REFERENCES "user"(id),
            uploaded_at   TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Tier 1 — Subject Randomization Assignments
        `CREATE TABLE IF NOT EXISTS subject_randomization (
            id                SERIAL PRIMARY KEY,
            subject_id        INTEGER NOT NULL UNIQUE REFERENCES subjects(id),
            rand_code         TEXT NOT NULL UNIQUE,
            treatment_arm     TEXT NOT NULL,
            stratum           TEXT,
            is_blinded        BOOLEAN NOT NULL DEFAULT TRUE,
            unblinded_at      TIMESTAMP,
            unblinded_by      TEXT REFERENCES "user"(id),
            unblind_reason    TEXT,
            randomized_at     TIMESTAMP NOT NULL DEFAULT NOW(),
            randomized_by     TEXT REFERENCES "user"(id),
            randomized_by_name TEXT
        )`,
        // Tier 2 — Login attempts audit log
        `CREATE TABLE IF NOT EXISTS login_attempts (
            id           SERIAL PRIMARY KEY,
            email        TEXT NOT NULL,
            ip_address   TEXT,
            success      BOOLEAN NOT NULL DEFAULT FALSE,
            attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts (email)`,
        `CREATE INDEX IF NOT EXISTS idx_login_attempts_at ON login_attempts (attempted_at DESC)`,
        // Tier 2 — Account lockout
        `CREATE TABLE IF NOT EXISTS account_locks (
            id             SERIAL PRIMARY KEY,
            user_id        TEXT REFERENCES "user"(id),
            email          TEXT NOT NULL UNIQUE,
            failed_count   INTEGER NOT NULL DEFAULT 0,
            locked_at      TIMESTAMP,
            auto_unlock_at TIMESTAMP,
            unlocked_at    TIMESTAMP,
            unlocked_by    TEXT REFERENCES "user"(id),
            unlock_reason  TEXT
        )`,
        // Tier 2 — Password history (prevent reuse)
        `CREATE TABLE IF NOT EXISTS password_history (
            id            SERIAL PRIMARY KEY,
            user_id       TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            password_hash TEXT NOT NULL,
            created_at    TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history (user_id)`,
        // Tier 2 — Password metadata (expiry, must-change)
        `CREATE TABLE IF NOT EXISTS password_meta (
            user_id         TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
            last_changed_at TIMESTAMP,
            must_change     BOOLEAN NOT NULL DEFAULT FALSE
        )`,
        // Tier 2 — Study Database Lock workflow
        `CREATE TABLE IF NOT EXISTS study_db_lock (
            id                   SERIAL PRIMARY KEY,
            status               TEXT NOT NULL DEFAULT 'Pending Signatures',
            pre_check_json       JSONB,
            initiated_by         TEXT REFERENCES "user"(id),
            initiated_by_name    TEXT,
            initiated_at         TIMESTAMP,
            cra_signed           BOOLEAN NOT NULL DEFAULT FALSE,
            cra_signed_at        TIMESTAMP,
            cra_signed_by        TEXT REFERENCES "user"(id),
            cra_signed_by_name   TEXT,
            admin_signed         BOOLEAN NOT NULL DEFAULT FALSE,
            admin_signed_at      TIMESTAMP,
            admin_signed_by      TEXT REFERENCES "user"(id),
            admin_signed_by_name TEXT,
            locked_at            TIMESTAMP,
            notes                TEXT,
            created_at           TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Tier 2 — Delegation Log
        `CREATE TABLE IF NOT EXISTS delegation_log (
            id               SERIAL PRIMARY KEY,
            user_id          TEXT NOT NULL REFERENCES "user"(id),
            user_name        TEXT NOT NULL,
            user_role        TEXT,
            site_id          INTEGER,
            delegated_tasks  JSONB NOT NULL DEFAULT '[]',
            delegation_start TIMESTAMP NOT NULL,
            delegation_end   TIMESTAMP,
            status           TEXT NOT NULL DEFAULT 'Active',
            signed_at        TIMESTAMP,
            signed_by_name   TEXT,
            notes            TEXT,
            created_by       TEXT REFERENCES "user"(id),
            created_by_name  TEXT,
            created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_delegation_user ON delegation_log (user_id)`,
        // Tier 2 — Training Records
        `CREATE TABLE IF NOT EXISTS training_records (
            id               SERIAL PRIMARY KEY,
            user_id          TEXT NOT NULL REFERENCES "user"(id),
            user_name        TEXT NOT NULL,
            training_type    TEXT NOT NULL,
            training_date    TIMESTAMP NOT NULL,
            expiry_date      TIMESTAMP,
            certificate_ref  TEXT,
            notes            TEXT,
            recorded_by      TEXT REFERENCES "user"(id),
            recorded_by_name TEXT,
            recorded_at      TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_training_user ON training_records (user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_training_expiry ON training_records (expiry_date)`,
        // Tier 3 — SAE Expedited Reports (ICH E2A §4)
        `CREATE TABLE IF NOT EXISTS sae_reports (
            id                SERIAL PRIMARY KEY,
            ae_id             INTEGER NOT NULL REFERENCES adverse_events(id) ON DELETE CASCADE,
            report_type       TEXT NOT NULL,
            report_number     INTEGER NOT NULL DEFAULT 1,
            day0_date         TEXT NOT NULL,
            deadline_days     INTEGER NOT NULL,
            deadline_date     TIMESTAMP NOT NULL,
            submitted_at      TIMESTAMP,
            submission_ref    TEXT,
            submitted_to      TEXT,
            narrative         TEXT,
            status            TEXT NOT NULL DEFAULT 'Pending',
            submitted_by      TEXT REFERENCES "user"(id),
            submitted_by_name TEXT,
            created_by        TEXT REFERENCES "user"(id),
            created_by_name   TEXT,
            created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_sae_reports_ae ON sae_reports (ae_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sae_reports_status ON sae_reports (status)`,
        // Tier 3 — Monitoring Visits (ICH GCP E6(R3) §5.18)
        `CREATE TABLE IF NOT EXISTS monitoring_visits (
            id                    SERIAL PRIMARY KEY,
            visit_date            TEXT NOT NULL,
            site_id               INTEGER REFERENCES sites(id),
            site_name             TEXT,
            visit_type            TEXT NOT NULL,
            cra_id                TEXT REFERENCES "user"(id),
            cra_name              TEXT NOT NULL,
            findings              TEXT,
            action_items          JSONB DEFAULT '[]',
            subjects_reviewed     JSONB DEFAULT '[]',
            status                TEXT NOT NULL DEFAULT 'Draft',
            submitted_at          TIMESTAMP,
            acknowledged_by       TEXT REFERENCES "user"(id),
            acknowledged_by_name  TEXT,
            acknowledged_at       TIMESTAMP,
            pi_comments           TEXT,
            next_visit_date       TEXT,
            notes                 TEXT,
            created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_monitoring_visits_status ON monitoring_visits (status)`,
        // Tier 3 — SDV Records (Source Data Verification)
        `CREATE TABLE IF NOT EXISTS sdv_records (
            id                   SERIAL PRIMARY KEY,
            monitoring_visit_id  INTEGER NOT NULL REFERENCES monitoring_visits(id) ON DELETE CASCADE,
            subject_id           INTEGER REFERENCES subjects(id),
            subject_code         TEXT NOT NULL,
            visit_id             INTEGER REFERENCES visits(id),
            visit_name           TEXT,
            form_id              INTEGER REFERENCES crf_forms(id),
            form_name            TEXT,
            sdv_status           TEXT NOT NULL DEFAULT 'Not Reviewed',
            discrepancy_note     TEXT,
            verified_by          TEXT REFERENCES "user"(id),
            verified_by_name     TEXT,
            verified_at          TIMESTAMP,
            created_at           TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_sdv_monitoring ON sdv_records (monitoring_visit_id)`,
        // Tier 4 — Multi-study architecture
        `CREATE TABLE IF NOT EXISTS studies (
            id             INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            title          TEXT NOT NULL,
            protocol_no    TEXT NOT NULL UNIQUE,
            phase          TEXT,
            sponsor        TEXT,
            indication     TEXT,
            status         TEXT NOT NULL DEFAULT 'Active',
            start_date     TEXT,
            end_date       TEXT,
            created_by     TEXT REFERENCES "user"(id),
            created_by_name TEXT,
            created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS study_users (
            id           INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id     INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            assigned_at  TIMESTAMP NOT NULL DEFAULT NOW(),
            assigned_by  TEXT REFERENCES "user"(id),
            UNIQUE(study_id, user_id)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_study_users_study ON study_users (study_id)`,
        `CREATE INDEX IF NOT EXISTS idx_study_users_user  ON study_users (user_id)`,
        // Add study_id FK to all clinical tables
        `ALTER TABLE subjects           ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE adverse_events     ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE informed_consents  ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE randomization_list ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE study_db_lock      ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE delegation_log     ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE training_records   ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE monitoring_visits  ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE queries            ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        // Seed: create default study for pre-existing data (only if no studies exist)
        `INSERT INTO studies (title, protocol_no, phase, status)
         SELECT 'Default Study', 'DEFAULT-001', 'N/A', 'Active'
         WHERE NOT EXISTS (SELECT 1 FROM studies)`,
        // Assign all existing users to the default study (only if study_users is empty)
        `INSERT INTO study_users (study_id, user_id)
         SELECT s.id, u.id FROM studies s, "user" u
         WHERE s.protocol_no = 'DEFAULT-001'
           AND NOT EXISTS (SELECT 1 FROM study_users WHERE study_id = s.id AND user_id = u.id)
           AND NOT EXISTS (SELECT 1 FROM study_users LIMIT 1)`,
        // Backfill existing clinical records to the default study
        `UPDATE subjects            SET study_id = (SELECT id FROM studies WHERE protocol_no = 'DEFAULT-001' LIMIT 1) WHERE study_id IS NULL`,
        `UPDATE adverse_events      SET study_id = (SELECT id FROM studies WHERE protocol_no = 'DEFAULT-001' LIMIT 1) WHERE study_id IS NULL`,
        `UPDATE protocol_deviations SET study_id = (SELECT id FROM studies WHERE protocol_no = 'DEFAULT-001' LIMIT 1) WHERE study_id IS NULL`,
        `UPDATE informed_consents   SET study_id = (SELECT id FROM studies WHERE protocol_no = 'DEFAULT-001' LIMIT 1) WHERE study_id IS NULL`,
        `UPDATE randomization_list  SET study_id = (SELECT id FROM studies WHERE protocol_no = 'DEFAULT-001' LIMIT 1) WHERE study_id IS NULL`,
        `UPDATE study_db_lock       SET study_id = (SELECT id FROM studies WHERE protocol_no = 'DEFAULT-001' LIMIT 1) WHERE study_id IS NULL`,
        `UPDATE delegation_log      SET study_id = (SELECT id FROM studies WHERE protocol_no = 'DEFAULT-001' LIMIT 1) WHERE study_id IS NULL`,
        `UPDATE training_records    SET study_id = (SELECT id FROM studies WHERE protocol_no = 'DEFAULT-001' LIMIT 1) WHERE study_id IS NULL`,
        `UPDATE monitoring_visits   SET study_id = (SELECT id FROM studies WHERE protocol_no = 'DEFAULT-001' LIMIT 1) WHERE study_id IS NULL`,
        `UPDATE queries             SET study_id = (SELECT id FROM studies WHERE protocol_no = 'DEFAULT-001' LIMIT 1) WHERE study_id IS NULL`,
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
app.use('/api/mfa',      rateLimitAuth, mfaRouter);
app.use('/api/register', rateLimitAuth, registerRouter);
app.use('/api/sites',      requireAuth, sitesRouter);
app.use('/api/security',   requireAuth, securityRouter);
app.use('/api/studies',    requireAuth, studiesRouter);
app.use('/api/audit',      requireAuth, auditRouter);
app.use('/api/forms',      requireAuth, formsRouter);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Study-scoped routes — require both auth and X-Study-ID header
const studyAuth = [requireAuth, requireStudy];
app.use('/api/subjects',                  ...studyAuth, subjectsRouter);
app.use('/api/subjects/:subjectId/visits', ...studyAuth, visitsRouter);
app.use('/api/entries',                   ...studyAuth, entriesRouter);
app.use('/api/queries',                   ...studyAuth, queriesRouter);
app.use('/api/dashboard',                 ...studyAuth, dashboardRouter);
app.use('/api/signatures',                ...studyAuth, signaturesRouter);
app.use('/api/ae',                        ...studyAuth, adverseEventsRouter);
app.use('/api/deviations',                ...studyAuth, deviationsRouter);
app.use('/api/consents',                  ...studyAuth, consentsRouter);
app.use('/api/randomization',             ...studyAuth, randomizationRouter);
app.use('/api/export',                    ...studyAuth, exportRouter);
app.use('/api/dblock',                    ...studyAuth, dblockRouter);
app.use('/api/delegation',                ...studyAuth, delegationRouter);
app.use('/api/saereports',                ...studyAuth, saeReportsRouter);
app.use('/api/monitoring',                ...studyAuth, monitoringRouter);

// Serve all static frontend files from project root
app.use(express.static(rootDir));
app.get('/', (_req, res) => res.sendFile(path.join(rootDir, 'login.html')));

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
    console.log(`E-CRF Server running on http://localhost:${PORT}`);
    console.log(`Better Auth endpoint: http://localhost:${PORT}/api/auth`);
});
