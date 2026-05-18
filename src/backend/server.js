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
import studiesRouter         from './routes/studies.js';
import visitTemplatesRouter  from './routes/visittemplates.js';
import userMgmtRouter        from './routes/usermgmt.js';
import notificationsRouter   from './routes/notifications.js';
// Phase 1 — Core Clinical Modules
import medHistoryRouter      from './routes/medhistory.js';
import conMedsRouter         from './routes/conmeds.js';
import vitalSignsRouter      from './routes/vitalsigns.js';
import labRouter             from './routes/lab.js';
// Phase 2 — Regulatory & Quality
import amendmentsRouter      from './routes/amendments.js';
import bdReviewRouter        from './routes/bdreview.js';
// Phase 3 — Quality Management & Validation
import qtlRouter             from './routes/qtl.js';
import sysValRouter          from './routes/sysval.js';
import { requireStudy }      from './middleware/study.js';
import { rateLimitAuth }     from './middleware/ratelimit.js';

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
        // Proper user deactivation flag (replaces emailVerified misuse)
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`,
        // Tier 5 — Visit Schedule Templates (Form Builder prerequisite)
        `CREATE TABLE IF NOT EXISTS visit_schedule_templates (
            id               SERIAL PRIMARY KEY,
            study_id         INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            name             TEXT NOT NULL,
            description      TEXT,
            is_active        BOOLEAN NOT NULL DEFAULT TRUE,
            created_by       TEXT REFERENCES "user"(id),
            created_by_name  TEXT,
            created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_visit_tmpl_study ON visit_schedule_templates (study_id)`,
        `CREATE TABLE IF NOT EXISTS visit_schedule_items (
            id                  SERIAL PRIMARY KEY,
            template_id         INTEGER NOT NULL REFERENCES visit_schedule_templates(id) ON DELETE CASCADE,
            visit_name          TEXT NOT NULL,
            visit_order         INTEGER NOT NULL,
            visit_type          TEXT NOT NULL DEFAULT 'Scheduled',
            study_day           INTEGER,
            window_days_before  INTEGER NOT NULL DEFAULT 3,
            window_days_after   INTEGER NOT NULL DEFAULT 3,
            form_ids            INTEGER[] NOT NULL DEFAULT '{}',
            is_mandatory        BOOLEAN NOT NULL DEFAULT TRUE,
            notes               TEXT
        )`,
        `CREATE INDEX IF NOT EXISTS idx_visit_items_tmpl ON visit_schedule_items (template_id)`,

        // ── Phase 1: Core Clinical Modules ──────────────────────────────────────
        `CREATE TABLE IF NOT EXISTS medical_history (
            id                       SERIAL PRIMARY KEY,
            study_id                 INTEGER REFERENCES studies(id),
            subject_id               INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            condition                TEXT NOT NULL,
            icd_code                 TEXT,
            icd_version              TEXT DEFAULT 'ICD-10',
            onset_date               TEXT,
            resolution_date          TEXT,
            status                   TEXT NOT NULL DEFAULT 'Active',
            severity                 TEXT,
            is_related_to_indication BOOLEAN NOT NULL DEFAULT FALSE,
            notes                    TEXT,
            created_by               TEXT REFERENCES "user"(id),
            created_by_name          TEXT,
            created_at               TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by               TEXT REFERENCES "user"(id),
            updated_at               TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_mh_subject ON medical_history (subject_id)`,

        `CREATE TABLE IF NOT EXISTS concomitant_meds (
            id             SERIAL PRIMARY KEY,
            study_id       INTEGER REFERENCES studies(id),
            subject_id     INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            drug_name      TEXT NOT NULL,
            who_drug_name  TEXT,
            who_drug_code  TEXT,
            atc_code       TEXT,
            indication     TEXT,
            dose           TEXT,
            dose_unit      TEXT,
            frequency      TEXT,
            route          TEXT,
            start_date     TEXT,
            stop_date      TEXT,
            is_ongoing     BOOLEAN NOT NULL DEFAULT TRUE,
            notes          TEXT,
            created_by     TEXT REFERENCES "user"(id),
            created_by_name TEXT,
            created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by     TEXT REFERENCES "user"(id),
            updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_cm_subject ON concomitant_meds (subject_id)`,

        `CREATE TABLE IF NOT EXISTS vital_signs (
            id                SERIAL PRIMARY KEY,
            study_id          INTEGER REFERENCES studies(id),
            subject_id        INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            visit_id          INTEGER REFERENCES visits(id),
            assessment_date   TEXT NOT NULL,
            assessment_time   TEXT,
            position          TEXT DEFAULT 'Sitting',
            systolic_bp       INTEGER,
            diastolic_bp      INTEGER,
            heart_rate        INTEGER,
            respiratory_rate  INTEGER,
            temperature       TEXT,
            temperature_unit  TEXT DEFAULT 'C',
            weight            TEXT,
            weight_unit       TEXT DEFAULT 'kg',
            height            TEXT,
            height_unit       TEXT DEFAULT 'cm',
            bmi               TEXT,
            oxygen_saturation TEXT,
            notes             TEXT,
            created_by        TEXT REFERENCES "user"(id),
            created_by_name   TEXT,
            created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by        TEXT REFERENCES "user"(id),
            updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_vs_subject ON vital_signs (subject_id)`,
        `CREATE INDEX IF NOT EXISTS idx_vs_visit   ON vital_signs (visit_id)`,

        `CREATE TABLE IF NOT EXISTS lab_results (
            id                    SERIAL PRIMARY KEY,
            study_id              INTEGER REFERENCES studies(id),
            subject_id            INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            visit_id              INTEGER REFERENCES visits(id),
            panel_name            TEXT,
            test_name             TEXT NOT NULL,
            test_code             TEXT,
            specimen_type         TEXT,
            specimen_collected_at TEXT,
            lab_name              TEXT,
            value_numeric         TEXT,
            value_text            TEXT,
            unit                  TEXT,
            ref_range_low         TEXT,
            ref_range_high        TEXT,
            ref_range_text        TEXT,
            abnormality_flag      TEXT,
            clinical_significance TEXT DEFAULT 'NCS',
            is_abnormal           BOOLEAN NOT NULL DEFAULT FALSE,
            assessed_by           TEXT REFERENCES "user"(id),
            assessed_by_name      TEXT,
            assessment_date       TEXT,
            status                TEXT NOT NULL DEFAULT 'Pending',
            notes                 TEXT,
            created_by            TEXT REFERENCES "user"(id),
            created_by_name       TEXT,
            created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by            TEXT REFERENCES "user"(id),
            updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_lab_subject ON lab_results (subject_id)`,
        `CREATE INDEX IF NOT EXISTS idx_lab_visit   ON lab_results (visit_id)`,
        `CREATE INDEX IF NOT EXISTS idx_lab_status  ON lab_results (status)`,

        // ── Phase 2: Regulatory & Quality ───────────────────────────────────────
        `CREATE TABLE IF NOT EXISTS protocol_amendments (
            id                  SERIAL PRIMARY KEY,
            study_id            INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            amendment_no        TEXT NOT NULL,
            effective_date      TEXT NOT NULL,
            summary             TEXT NOT NULL,
            changes             TEXT,
            requires_reconsent  BOOLEAN NOT NULL DEFAULT FALSE,
            reconsent_reason    TEXT,
            irb_approval_date   TEXT,
            irb_ref_no          TEXT,
            status              TEXT NOT NULL DEFAULT 'Draft',
            created_by          TEXT REFERENCES "user"(id),
            created_by_name     TEXT,
            created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_amendments_study ON protocol_amendments (study_id)`,

        `CREATE TABLE IF NOT EXISTS blind_data_reviews (
            id                SERIAL PRIMARY KEY,
            study_id          INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            review_date       TEXT NOT NULL,
            status            TEXT NOT NULL DEFAULT 'In Progress',
            checklist_json    JSONB NOT NULL DEFAULT '{}',
            open_queries      INTEGER DEFAULT 0,
            missing_critical  INTEGER DEFAULT 0,
            open_deviations   INTEGER DEFAULT 0,
            pending_saes      INTEGER DEFAULT 0,
            notes             TEXT,
            completed_by      TEXT REFERENCES "user"(id),
            completed_by_name TEXT,
            completed_at      TIMESTAMP,
            created_by        TEXT REFERENCES "user"(id),
            created_by_name   TEXT,
            created_at        TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_bdr_study ON blind_data_reviews (study_id)`,

        // ── Phase 3: Quality Management ─────────────────────────────────────────
        `CREATE TABLE IF NOT EXISTS quality_tolerance_limits (
            id          SERIAL PRIMARY KEY,
            study_id    INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            indicator   TEXT NOT NULL,
            label       TEXT NOT NULL,
            threshold   TEXT NOT NULL,
            unit        TEXT DEFAULT '%',
            alert_level TEXT DEFAULT 'warning',
            description TEXT,
            created_by  TEXT REFERENCES "user"(id),
            created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_qtl_study_indicator ON quality_tolerance_limits (study_id, indicator)`,

        // Phase 1 — LOINC coding status on lab_results
        `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS loinc_coding_status TEXT NOT NULL DEFAULT 'Custom'`,

        // ICH GCP E6(R3) C.4.4 — e-signature fields on sae_reports
        `ALTER TABLE sae_reports ADD COLUMN IF NOT EXISTS signed_by       TEXT REFERENCES "user"(id)`,
        `ALTER TABLE sae_reports ADD COLUMN IF NOT EXISTS signed_by_name  TEXT`,
        `ALTER TABLE sae_reports ADD COLUMN IF NOT EXISTS signed_at       TIMESTAMPTZ`,
        `ALTER TABLE sae_reports ADD COLUMN IF NOT EXISTS signing_meaning TEXT`,

        // ICH GCP E6(R3) 4.8 — link re-consent records to their triggering amendment
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS amendment_id INTEGER REFERENCES protocol_amendments(id)`,

        // Phase 2 — MedDRA structured coding fields on adverse_events
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS meddra_pt_code    TEXT`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS meddra_soc_code   TEXT`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS meddra_version     TEXT`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS coding_status      TEXT NOT NULL DEFAULT 'Uncoded'`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS coded_by           TEXT`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS coded_at           TIMESTAMP`,

        `CREATE TABLE IF NOT EXISTS system_validation_log (
            id               SERIAL PRIMARY KEY,
            version          TEXT NOT NULL,
            validation_date  TEXT NOT NULL,
            validation_type  TEXT NOT NULL,
            status           TEXT NOT NULL DEFAULT 'Pending',
            performed_by     TEXT,
            summary          TEXT,
            changes_since    TEXT,
            approved_by      TEXT,
            approved_at      TIMESTAMP,
            created_by       TEXT REFERENCES "user"(id),
            created_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,

        // Phase 3 — TOTP (authenticator app) per-user 2FA
        `CREATE TABLE IF NOT EXISTS user_totp (
            id           SERIAL PRIMARY KEY,
            user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            secret       TEXT NOT NULL,
            is_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
            enabled_at   TIMESTAMPTZ,
            backup_codes JSONB NOT NULL DEFAULT '[]',
            UNIQUE(user_id)
        )`,
    ];
    for (const stmt of stmts) {
        await client.unsafe(stmt);
    }
}
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
app.use('/api/users',         requireAuth, userMgmtRouter);
app.use('/api/notifications', requireAuth, requireStudy, notificationsRouter);
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
app.use('/api/visit-templates',           ...studyAuth, visitTemplatesRouter);
// Phase 1 — Core Clinical Modules
app.use('/api/medhistory',               ...studyAuth, medHistoryRouter);
app.use('/api/conmeds',                  ...studyAuth, conMedsRouter);
app.use('/api/vitalsigns',               ...studyAuth, vitalSignsRouter);
app.use('/api/lab',                      ...studyAuth, labRouter);
// Phase 2 — Regulatory & Quality
app.use('/api/amendments',               ...studyAuth, amendmentsRouter);
app.use('/api/bdreview',                 ...studyAuth, bdReviewRouter);
// Phase 3 — Quality Management & Validation
app.use('/api/qtl',                      ...studyAuth, qtlRouter);
app.use('/api/sysval',                   requireAuth,  sysValRouter);

// Serve all static frontend files from project root
app.use(express.static(rootDir));
app.get('/', (_req, res) => res.sendFile(path.join(rootDir, 'login.html')));

const PORT = parseInt(process.env.PORT || '3000', 10);

// Run migrations async — self-healing in each route handles any race on first boot.
runMigrations()
    .then(() => console.log('DB migrations applied.'))
    .catch(err => console.warn('Migration warning (non-fatal):', err.message));

app.listen(PORT, () => {
    console.log(`E-CRF Server running on http://localhost:${PORT}`);
    console.log(`Better Auth endpoint: http://localhost:${PORT}/api/auth`);
});
