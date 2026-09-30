# Perbaikan Security — Kode Lengkap per File

Dokumen ini memuat isi lengkap seluruh file yang diubah untuk menutup temuan CRITICAL, HIGH, dan MEDIUM. Setiap file berada dalam satu blok kode utuh.

## `.env.example`

````dotenv
# ─────────────────────────────────────────────────────────────────────────────
# Docker Compose deployment (docker compose up -d --build)
#
# Compose reads THIS file to fill in the placeholders in docker-compose.yml.
# The values marked REQUIRED have no default — compose refuses to start without
# them. If you run the app directly with `npm start` instead, skip this block
# and set DATABASE_URL below.
# ─────────────────────────────────────────────────────────────────────────────

# REQUIRED — password for the bundled PostgreSQL container.
POSTGRES_PASSWORD=
# Optional — database user/name inside the container.
POSTGRES_USER=ecrf
POSTGRES_DB=ecrf

# Port published on the host. Change if 3000 is already taken.
APP_PORT=3000

# Reserved admin email. Provision locally with scripts/provision-admin.js.
ADMIN_EMAIL=

# On-prem licence. Enforcement blocks creating NEW records when the licence is
# missing/expired; reads, edits, exports and safety reporting keep working.
LICENSE_ENFORCEMENT=true
LICENSE_KEY=

# ─────────────────────────────────────────────────────────────────────────────
# Direct (non-Docker) run — `npm start`
# ─────────────────────────────────────────────────────────────────────────────

# Database (use a TLS-enabled connection string in production, e.g. ?sslmode=require)
# Ignored under Docker Compose — compose builds this from POSTGRES_* above.
DATABASE_URL=postgresql://ecrf_user:ecrf_pass@localhost:5432/ecrf_db

# Better Auth — REQUIRED for both Docker and direct runs.
# Generate a strong secret: openssl rand -base64 48
BETTER_AUTH_SECRET=replace-with-a-long-random-secret-at-least-32-chars
BETTER_AUTH_URL=http://localhost:3000

# Server
PORT=3000
NODE_ENV=development

# Access control
# Self-registration is DISABLED by default (accounts are created by the
# Administrator). Set to "true" only for local dev/demo environments.
ALLOW_SELF_REGISTRATION=false

# Reserved platform operator email; public registration never grants this role.
PLATFORM_OWNER_EMAIL=

# Self-service tenant signup (public /api/signup + signup.html). When "true",
# anyone can create a NEW organization + admin and start a 14-day trial
# (email verification required). Real/regulated production use should still go
# through a plan upgrade + signed DPA. Default: disabled.
ALLOW_TENANT_SIGNUP=false

# CDISC export identifiers (optional)
STUDY_NAME=E-CRF Clinical Study
STUDY_OID=ECRF.STUDY.001

# IANA timezone the sites work in. Stored timestamps are instants; reducing one
# to a calendar day for an SDTM --DTC column has to be done in the site's own
# timezone or the exported date lands a day early. Set this to the country the
# study runs in — NOT to UTC, unless the sites really do work in UTC.
# An unrecognised name falls back to UTC and logs a warning at startup.
EXPORT_TZ=Asia/Jakarta

# Show every PostgreSQL NOTICE at startup, not just warnings and errors.
# The migration list is idempotent, so a normal boot emits ~157 "already
# exists, skipping" notices that are suppressed by default — they drown out
# the ones that matter. Turn this on when diagnosing a migration.
# PG_NOTICE_VERBOSE=true

# SMTP for notifications (optional — emails are fire-and-forget if unset)
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM="E-CRF <no-reply@example.org>"

# Billing (Stripe) — optional. Unset = billing disabled (app runs normally).
# STRIPE_SECRET_KEY enables checkout; STRIPE_WEBHOOK_SECRET verifies webhooks.
# Map each plan to a Stripe Price id so the webhook can set the tenant's plan.
# STRIPE_SECRET_KEY=sk_live_xxx
# STRIPE_WEBHOOK_SECRET=whsec_xxx
# STRIPE_PRICE_TRIAL=price_xxx
# STRIPE_PRICE_STANDARD=price_xxx
# STRIPE_PRICE_ENTERPRISE=price_xxx

# REQUIRED: independent 32-byte encryption key. Generate with openssl rand -hex 32.
# Keep this stable, private, and backed up separately from the database.
MFA_ENCRYPTION_KEY=
# Comma-separated actual reverse-proxy CIDRs; empty means direct connections only.
TRUST_PROXY_CIDRS=
# Development seed only. Credentials go to a new private file, never stdout.
ALLOW_DEMO_SEED=false
SEED_CREDENTIALS_FILE=
````

## `.env.onprem.example`

````dotenv
# =============================================================================
# E-CRF System — on-premise configuration (docker compose)
# =============================================================================
# 1. Copy this file to ".env" (same folder as docker-compose.yml):
#        cp .env.onprem.example .env
# 2. Fill in every value marked REQUIRED below.
# 3. Start the system:   docker compose up -d
#
# The .env file contains secrets — keep it on the server only, never commit it.
# =============================================================================

# --- Database ---------------------------------------------------------------
# The Postgres container is created with these credentials on first boot.
# POSTGRES_PASSWORD is REQUIRED (no default). Use a long random value.
#   Generate one:  openssl rand -base64 24
POSTGRES_USER=ecrf
POSTGRES_PASSWORD=CHANGE_ME_strong_db_password
POSTGRES_DB=ecrf

# --- Authentication ---------------------------------------------------------
# REQUIRED. Signing secret for sessions — at least 32 characters.
#   Generate one:  openssl rand -base64 48
BETTER_AUTH_SECRET=CHANGE_ME_long_random_secret_min_32_chars

# Public URL users reach the app on. For a local install keep localhost;
# behind a domain/reverse proxy use the real https URL (e.g. https://ecrf.rs.example).
BETTER_AUTH_URL=http://localhost:3000

# --- First-run administrator ------------------------------------------------
# Reserved admin email. Provision locally with scripts/provision-admin.js.
ADMIN_EMAIL=admin@your-hospital.example

# --- Licensing --------------------------------------------------------------
# Paste the LICENSE_KEY provided by your E-CRF vendor. Without a valid license,
# creating NEW records (enrolling subjects, new studies/sites) is blocked —
# reading, exporting, editing existing data and safety reporting keep working.
LICENSE_KEY=
# Keep enforcement on for a licensed deployment. Set to "false" only for an
# internal evaluation where no license enforcement is desired.
LICENSE_ENFORCEMENT=true

# --- Networking -------------------------------------------------------------
# Host port the app is published on (container always listens on 3000).
APP_PORT=3000

# --- Access control (leave as-is for a standard single-org install) ---------
# Keep both "false": accounts are created by the administrator inside the app.
ALLOW_SELF_REGISTRATION=false
ALLOW_TENANT_SIGNUP=false
# Leave empty unless you run the multi-tenant SaaS operator console.
PLATFORM_OWNER_EMAIL=

# --- Email notifications (optional) -----------------------------------------
# Leave SMTP_HOST empty to disable outgoing email (the app still runs; email
# steps are simply skipped). Fill these to enable notifications/verification.
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# REQUIRED: independent 32-byte encryption key. Generate with openssl rand -hex 32.
# Keep this stable, private, and backed up separately from the database.
MFA_ENCRYPTION_KEY=
# Comma-separated actual reverse-proxy CIDRs; empty means direct connections only.
TRUST_PROXY_CIDRS=
# Development seed only. Credentials go to a new private file, never stdout.
ALLOW_DEMO_SEED=false
SEED_CREDENTIALS_FILE=
````

## `docker-compose.yml`

````yaml
# E-CRF System — on-premise deployment (app + PostgreSQL).
# One command:  docker compose up -d
# Configure secrets in a .env file next to this file (see .env.example).

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER:     ${POSTGRES_USER:-ecrf}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in .env}
      POSTGRES_DB:       ${POSTGRES_DB:-ecrf}
    volumes:
      - ecrf_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-ecrf} -d ${POSTGRES_DB:-ecrf}"]
      interval: 10s
      timeout: 5s
      retries: 12

  app:
    build: .
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      # App → db over the internal Docker network (no TLS needed inside the host).
      DATABASE_URL: postgresql://${POSTGRES_USER:-ecrf}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-ecrf}
      MFA_ENCRYPTION_KEY: ${MFA_ENCRYPTION_KEY:?set MFA_ENCRYPTION_KEY in .env}
      TRUST_PROXY_CIDRS: ${TRUST_PROXY_CIDRS:-}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:?set BETTER_AUTH_SECRET in .env}
      BETTER_AUTH_URL:    ${BETTER_AUTH_URL:-http://localhost:3000}
      # Access control — self-service signup off by default for on-prem.
      ALLOW_SELF_REGISTRATION: ${ALLOW_SELF_REGISTRATION:-false}
      ALLOW_TENANT_SIGNUP:     ${ALLOW_TENANT_SIGNUP:-false}
      PLATFORM_OWNER_EMAIL:    ${PLATFORM_OWNER_EMAIL:-}
      # Reserved address; provision admins with the trusted local CLI.
      ADMIN_EMAIL:             ${ADMIN_EMAIL:-}
      # Licensing — on-prem enforces the license by default. When the license is
      # missing/expired, creating NEW records (enrollment/studies/sites) is
      # blocked; reads, exports, edits and safety reporting keep working.
      LICENSE_ENFORCEMENT: ${LICENSE_ENFORCEMENT:-true}
      LICENSE_KEY:         ${LICENSE_KEY:-}
      # SMTP (optional — email is skipped if SMTP_HOST is empty).
      SMTP_HOST:   ${SMTP_HOST:-}
      SMTP_PORT:   ${SMTP_PORT:-587}
      SMTP_SECURE: ${SMTP_SECURE:-false}
      SMTP_USER:   ${SMTP_USER:-}
      SMTP_PASS:   ${SMTP_PASS:-}
      SMTP_FROM:   ${SMTP_FROM:-}
    ports:
      - "${APP_PORT:-3000}:3000"

volumes:
  ecrf_pgdata:
````

## `package.json`

````json
{
  "name": "ecrf-system",
  "version": "1.0.0",
  "description": "Electronic Case Report Form System - FDA 21 CFR Part 11 Compliant",
  "type": "module",
  "main": "src/backend/server.js",
  "scripts": {
    "test": "node --test tests/",
    "start": "node src/backend/server.js",
    "dev": "node --watch src/backend/server.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "node src/backend/db/seed.js",
    "provision:admin": "node scripts/provision-admin.js"
  },
  "dependencies": {
    "better-auth": "^1.2.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "drizzle-orm": "^0.45.2",
    "express": "^4.21.2",
    "nodemailer": "^8.0.7",
    "otplib": "^13.4.0",
    "postgres": "^3.4.5",
    "qrcode": "^1.5.4"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.4"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
````

## `scripts/provision-admin.js`

````javascript
// Trusted local operation. Read one JSON object from stdin; never pass a password on the command line.
import 'dotenv/config';
import crypto from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { hashPassword } from '@better-auth/utils/password';
import { client, db } from '../src/backend/db/connection.js';
import { user, account, organizations, passwordMeta } from '../src/backend/db/schemas/schema.js';
import { writeAudit } from '../src/backend/lib/audit.js';
import { validatePassword } from '../src/backend/lib/passwordpolicy.js';
import { validCredentials } from '../src/backend/lib/http-security.js';

try {
    let input = '';
    for await (const chunk of process.stdin) {
        input += chunk;
        if (input.length > 4096) throw new Error('Input too large');
    }
    const data = JSON.parse(input);
    if (!validCredentials(data) || typeof data.name !== 'string' || !data.name.trim() || data.name.length > 200 ||
        !['admin', 'platform_owner'].includes(data.role) || data.acceptedLicense !== true) {
        throw new Error('Provide name, email, password, role (admin/platform_owner), and acceptedLicense: true');
    }
    const email = data.email.trim().toLowerCase();
    const errors = validatePassword(data.password, email);
    if (errors.length) throw new Error(errors.join('; '));
    const hash = await hashPassword(data.password);
    await db.transaction(async tx => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(918372)`);
        const [existing] = await tx.select({ id: user.id }).from(user).where(eq(user.email, email));
        if (existing) throw new Error('Account already exists; this command never promotes existing accounts');
        let organizationId = null;
        if (data.role === 'admin') {
            const [org] = await tx.insert(organizations).values({ name: 'Default Organization', slug: 'default' })
                .onConflictDoUpdate({ target: organizations.slug, set: { slug: 'default' } }).returning({ id: organizations.id });
            organizationId = org.id;
        }
        const id = crypto.randomUUID();
        await tx.insert(user).values({ id, name: data.name.trim(), email, emailVerified: true, role: data.role, organizationId });
        await tx.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: 'credential', userId: id, password: hash });
        await tx.insert(passwordMeta).values({ userId: id, lastChangedAt: new Date(), mustChange: false });
        await writeAudit(tx, {
            tableName: 'license_acceptance', recordId: id, action: 'AGREE', newValue: '1.0',
            reason: 'Trusted local administrator provisioning; terms and privacy policy accepted',
            user: { id, name: data.name.trim(), role: data.role, organizationId }, ipAddress: null,
        });
    });
    console.log('Administrator provisioned. Sign in using the supplied credentials.');
} catch (error) {
    console.error('Provisioning failed:', error.code || 'INVALID_INPUT_OR_DATABASE_OPERATION');
    process.exitCode = 1;
} finally {
    await client.end();
}
````

## `src/backend/auth/better-auth.js`

````javascript
import { trustedOrigins } from '../lib/http-security.js';
import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/connection.js';
import * as schema from '../db/schemas/schema.js';

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: 'pg',
        schema: {
            user:         schema.user,
            session:      schema.session,
            account:      schema.account,
            verification: schema.verification,
        },
    }),
    secret:  process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ||
             (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
    emailAndPassword: {
        enabled: true,
        autoSignIn: false,
    },
    user: {
        additionalFields: {
            // input: false — role/siteId must NEVER be client-assignable via the
            // sign-up body (privilege escalation). They are set server-side by
            // routes/register.js and routes/usermgmt.js via direct db.update.
            role: {
                type:         'string',
                required:     false,
                defaultValue: 'investigator',
                input:        false,
            },
            siteId: {
                type:     'number',
                required: false,
                input:    false,
            },
        },
    },
    trustedOrigins: [...trustedOrigins()],
});
````

## `src/backend/db/seed.js`

````javascript
import crypto from 'node:crypto';
import { writeFileSync } from 'node:fs';
/**
 * Seed script — run once to populate demo data.
 * Usage: npm run db:seed
 */
import 'dotenv/config';
import { eq, isNull } from 'drizzle-orm';
import { db } from './connection.js';
import { auth } from '../auth/better-auth.js';
import { organizations, sites, subjects, visits, crfForms, user } from './schemas/schema.js';

if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Demo seed is disabled. Only explicitly enabled development databases may be seeded.');
}
if (!process.env.SEED_CREDENTIALS_FILE) throw new Error('Set SEED_CREDENTIALS_FILE to a private, new file path');

// ─── Sites ───────────────────────────────────────────────────────────────────
const seedSites = [
    { name: 'Jakarta General Hospital', code: 'JKT-001', country: 'Indonesia', piName: 'Dr. Budi Santoso' },
    { name: 'Surabaya Medical Center',  code: 'SBY-001', country: 'Indonesia', piName: 'Dr. Siti Rahayu' },
];

// ─── Demo users (Better Auth email/password) ─────────────────────────────────
const seedUsers = [
    { name: 'Admin User',       email: 'admin@ecrf.local',       password: crypto.randomBytes(24).toString('base64url'),       role: 'admin' },
    { name: 'Dr. Investigator', email: 'investigator@ecrf.local', password: crypto.randomBytes(24).toString('base64url'), role: 'investigator' },
    { name: 'CRA Monitor',      email: 'cra@ecrf.local',         password: crypto.randomBytes(24).toString('base64url'),      role: 'cra' },
];

// ─── CRF Form templates ───────────────────────────────────────────────────────
const seedForms = [
    {
        name: 'Vital Signs',
        description: 'Blood pressure, heart rate, temperature, weight, height measurements',
        version: '1.0',
        schemaJson: {
            fields: [
                { key: 'visit_date',   label: 'Visit Date',       type: 'date',   required: true },
                { key: 'visit_time',   label: 'Visit Time',       type: 'time',   required: true },
                { key: 'systolic_bp',  label: 'Systolic BP (mmHg)', type: 'number', required: true,
                  validation: { hardMin: 50, hardMax: 300, softMin: 80, softMax: 200 } },
                { key: 'diastolic_bp', label: 'Diastolic BP (mmHg)', type: 'number', required: true,
                  validation: { hardMin: 30, hardMax: 200, softMin: 50, softMax: 130 } },
                { key: 'heart_rate',   label: 'Heart Rate (bpm)',  type: 'number', required: true,
                  validation: { hardMin: 20, hardMax: 300, softMin: 40, softMax: 180 } },
                { key: 'temperature',  label: 'Temperature (°C)',  type: 'number', required: false,
                  validation: { hardMin: 32, hardMax: 43, softMin: 35, softMax: 40 } },
                { key: 'weight_kg',    label: 'Weight (kg)',       type: 'number', required: false,
                  validation: { hardMin: 1, hardMax: 300, softMin: 20, softMax: 250 } },
                { key: 'height_cm',    label: 'Height (cm)',       type: 'number', required: false,
                  validation: { hardMin: 30, hardMax: 250, softMin: 100, softMax: 220 } },
                { key: 'notes',        label: 'Clinical Notes',   type: 'textarea', required: false },
            ],
        },
    },
    {
        name: 'Adverse Events',
        description: 'Adverse event reporting per ICH E2A guidelines',
        version: '1.0',
        schemaJson: {
            fields: [
                { key: 'ae_term',       label: 'AE Term',            type: 'text',   required: true },
                { key: 'onset_date',    label: 'Onset Date',         type: 'date',   required: true },
                { key: 'resolution_date', label: 'Resolution Date',  type: 'date',   required: false },
                { key: 'severity',      label: 'Severity',           type: 'select', required: true,
                  options: ['Mild', 'Moderate', 'Severe', 'Life-threatening', 'Fatal'] },
                { key: 'relationship',  label: 'Relationship to Study Drug', type: 'select', required: true,
                  options: ['Unrelated', 'Unlikely', 'Possible', 'Probable', 'Definite'] },
                { key: 'serious',       label: 'Serious AE?',        type: 'radio',  required: true,
                  options: ['Yes', 'No'] },
                { key: 'action_taken',  label: 'Action Taken',       type: 'select', required: true,
                  options: ['None', 'Dose Reduced', 'Drug Interrupted', 'Drug Discontinued', 'Other'] },
                { key: 'outcome',       label: 'Outcome',            type: 'select', required: false,
                  options: ['Recovered', 'Recovering', 'Not Recovered', 'Recovered with Sequelae', 'Fatal', 'Unknown'] },
                { key: 'description',   label: 'Detailed Description', type: 'textarea', required: false },
            ],
        },
    },
    {
        name: 'Concomitant Medications',
        description: 'Concurrent medications taken during the study',
        version: '1.0',
        schemaJson: {
            fields: [
                { key: 'drug_name',    label: 'Drug Name',      type: 'text',   required: true },
                { key: 'indication',   label: 'Indication',     type: 'text',   required: true },
                { key: 'dose',         label: 'Dose',           type: 'text',   required: true },
                { key: 'route',        label: 'Route',          type: 'select', required: true,
                  options: ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhalation', 'Other'] },
                { key: 'frequency',    label: 'Frequency',      type: 'select', required: true,
                  options: ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'As needed', 'Other'] },
                { key: 'start_date',   label: 'Start Date',     type: 'date',   required: true },
                { key: 'end_date',     label: 'End Date',       type: 'date',   required: false },
                { key: 'ongoing',      label: 'Ongoing?',       type: 'radio',  required: true,
                  options: ['Yes', 'No'] },
            ],
        },
    },
];

// ─── Demo subjects ────────────────────────────────────────────────────────────
const seedSubjects = [
    { subjectCode: 'JKT-001-001', initials: 'A.B.', sex: 'Male',   dateOfBirth: '1975-04-12' },
    { subjectCode: 'JKT-001-002', initials: 'C.D.', sex: 'Female', dateOfBirth: '1988-09-23' },
    { subjectCode: 'SBY-001-001', initials: 'E.F.', sex: 'Male',   dateOfBirth: '1962-01-07' },
];

async function main() {
    // Exclusive private file: never overwrite existing credentials or print passwords.
    writeFileSync(process.env.SEED_CREDENTIALS_FILE, JSON.stringify(seedUsers, null, 2), { flag: 'wx', mode: 0o600 });
    console.log('🌱 Seeding database...\n');

    // 0. Default organization (tenant that owns all seeded data)
    console.log('→ Organization');
    await db.insert(organizations)
        .values({ name: 'Default Organization', slug: 'default' })
        .onConflictDoNothing();
    const [defaultOrg] = await db.select().from(organizations).where(eq(organizations.slug, 'default'));
    console.log(`   default org id=${defaultOrg.id}\n`);

    // 1. Sites (owned by the default org)
    console.log('→ Sites');
    const insertedSites = await db.insert(sites)
        .values(seedSites.map(s => ({ ...s, organizationId: defaultOrg.id })))
        .onConflictDoNothing().returning();
    console.log(`   ${insertedSites.length} sites inserted\n`);

    // 2. Users via Better Auth (creates user + account + hashes password)
    console.log('→ Users');
    for (const u of seedUsers) {
        try {
            await auth.api.signUpEmail({ body: { name: u.name, email: u.email, password: u.password } });
            console.log(`   ✓ ${u.email} (${u.role})`);
        } catch (err) {
            // User might already exist
            console.log(`   ~ ${u.email} was not created; leaving existing privileges unchanged`);
            continue;
        }
        // role/siteId/org are input:false in Better Auth (privilege-escalation
        // guard) — assign them server-side after signup, and into the default org.
        await db.update(user)
            .set({ role: u.role, organizationId: defaultOrg.id, emailVerified: true })
            .where(eq(user.email, u.email.toLowerCase()));
    }
    // Safety net: any remaining untenanted users → default org
    await db.update(user).set({ organizationId: defaultOrg.id }).where(isNull(user.organizationId));
    console.log();

    // 3. CRF Forms (owned by the default org)
    console.log('→ CRF Form Templates');
    const insertedForms = await db.insert(crfForms)
        .values(seedForms.map(f => ({ ...f, organizationId: defaultOrg.id })))
        .onConflictDoNothing().returning();
    console.log(`   ${insertedForms.length} forms inserted\n`);

    // 4. Subjects (attach to first site)
    console.log('→ Subjects');
    const allSites = await db.select().from(sites);
    const siteMap  = Object.fromEntries(allSites.map(s => [s.code, s.id]));

    const subjectData = seedSubjects.map(s => ({
        ...s,
        siteId: s.subjectCode.startsWith('JKT') ? siteMap['JKT-001'] : siteMap['SBY-001'],
    }));
    const insertedSubjects = await db.insert(subjects).values(subjectData).onConflictDoNothing().returning();
    console.log(`   ${insertedSubjects.length} subjects inserted\n`);

    // 5. Visits for each subject
    console.log('→ Visits');
    const visitTemplates = ['Screening', 'Baseline (Day 1)', 'Week 4', 'Week 8', 'End of Study'];
    const allSubjects = await db.select().from(subjects);
    const visitData = allSubjects.flatMap(sub =>
        visitTemplates.map(name => ({ subjectId: sub.id, visitName: name }))
    );
    const insertedVisits = await db.insert(visits).values(visitData).onConflictDoNothing().returning();
    console.log(`   ${insertedVisits.length} visits inserted\n`);

    console.log('✅ Seed complete!\n');
    console.log('Generated demo credentials are in the private SEED_CREDENTIALS_FILE.');

    process.exit(0);
}

main().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
````

## `src/backend/lib/http-security.js`

````javascript
export const asyncRoute = fn => (req, res, next) =>
    Promise.resolve().then(() => fn(req, res, next)).catch(next);

export function trustedOrigins() {
    const origins = [process.env.BETTER_AUTH_URL,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null];
    if (process.env.NODE_ENV !== 'production') origins.push('http://localhost:3000');
    return new Set(origins.filter(Boolean).map(value => new URL(value).origin));
}

export function checkOrigin(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/billing/webhook') return next();
    const origin = req.headers.origin;
    if ((origin && !trustedOrigins().has(origin)) || (!origin && req.headers['sec-fetch-site'] === 'cross-site')) {
        return res.status(403).json({ error: 'Origin not allowed' });
    }
    next();
}

export function validCredentials(body) {
    return body && typeof body.email === 'string' && body.email.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) &&
        typeof body.password === 'string' && body.password.length > 0 && body.password.length <= 256;
}
````

## `src/backend/lib/passwordpolicy.js`

````javascript
// ICH GCP E6(R3) Appendix C.4.3 — Password policy for pharmaceutical EDC systems

export const POLICY = {
    minLength:        12,
    expiryDays:       90,
    warningDays:      10,  // warn at 80 days (10 days before expiry)
    historyCount:     10,  // cannot reuse last 10 passwords
    maxFailedAttempts: 5,
    lockoutMinutes:   30,
};

/**
 * Validates a candidate password against the ICH GCP E6(R3) C.4.3 policy.
 * Returns an array of error strings; empty array = password is valid.
 */
export function validatePassword(password, email = '') {
    const errors = [];
    if (typeof password !== 'string' || password.length > 256) return ['Password must be a string of at most 256 characters'];

    if (!password || password.length < POLICY.minLength) {
        errors.push(`Minimum ${POLICY.minLength} characters required (ICH E6(R3) C.4.3)`);
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Must contain at least one number');
    }
    if (!/[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]/.test(password)) {
        errors.push('Must contain at least one special character (!@#$%^&* etc.)');
    }
    // Must not contain email username
    if (email) {
        const localPart = email.split('@')[0].toLowerCase();
        if (localPart.length >= 4 && password.toLowerCase().includes(localPart)) {
            errors.push('Password cannot contain your email address');
        }
    }
    // Must not be entirely repeated characters
    if (/^(.)\1+$/.test(password)) {
        errors.push('Password cannot be a single repeated character');
    }

    return errors;
}

/**
 * Returns password strength score 0–4 and label.
 */
export function passwordStrength(password) {
    let score = 0;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    const colors = ['#DC2626', '#F59E0B', '#D97706', '#16A34A', '#065F46'];
    return { score: Math.min(score, 4), label: labels[Math.min(score, 4)], color: colors[Math.min(score, 4)] };
}

/**
 * Checks if the password expired based on lastChangedAt.
 * Returns { expired, daysLeft, warningSoon }.
 */
export function checkPasswordExpiry(lastChangedAt) {
    if (!lastChangedAt) return { expired: false, daysLeft: POLICY.expiryDays, warningSoon: false };
    const msSince = Date.now() - new Date(lastChangedAt).getTime();
    const daysSince = msSince / 86400000;
    const daysLeft = Math.floor(POLICY.expiryDays - daysSince);
    return {
        expired:     daysLeft < 0,
        daysLeft:    Math.max(0, daysLeft),
        warningSoon: daysLeft >= 0 && daysLeft <= POLICY.warningDays,
    };
}
````

## `src/backend/lib/security-crypto.js`

````javascript
import crypto from 'node:crypto';

export function securityKey() {
    const value = process.env.MFA_ENCRYPTION_KEY;
    if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
        throw new Error('MFA_ENCRYPTION_KEY must contain 32 random bytes encoded as hex');
    }
    return Buffer.from(value, 'hex');
}

export function encryptSecret(secret, userId) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', securityKey(), iv);
    cipher.setAAD(Buffer.from(`ecrf:totp:${userId}`));
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return ['enc1', iv.toString('hex'), cipher.getAuthTag().toString('hex'), encrypted.toString('hex')].join(':');
}

export function decryptSecret(value, userId) {
    const [version, iv, tag, ciphertext] = String(value).split(':');
    if (version !== 'enc1' || !iv || !tag || !ciphertext) throw new Error('MFA migration required');
    const decipher = crypto.createDecipheriv('aes-256-gcm', securityKey(), Buffer.from(iv, 'hex'));
    decipher.setAAD(Buffer.from(`ecrf:totp:${userId}`));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]).toString('utf8');
}

export function backupDigest(code, userId) {
    return crypto.createHmac('sha256', securityKey())
        .update(`ecrf:backup:${userId}:${code.replace(/\s/g, '').toUpperCase()}`).digest('hex');
}

export function tokenDigest(token) {
    return 'sha256:' + crypto.createHash('sha256').update(token).digest('hex');
}

export function equalDigest(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const left = Buffer.from(a), right = Buffer.from(b);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function credentialFingerprint(passwordHash) {
    return crypto.createHmac('sha256', securityKey()).update(`credential:${passwordHash}`).digest('hex');
}
````

## `src/backend/lib/security-migration.js`

````javascript
import { securityKey, encryptSecret, decryptSecret, backupDigest } from './security-crypto.js';

function jsonArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

// Runs after base migrations and before traffic is admitted. No plaintext fallback at runtime.
export async function migrateSecurity(client) {
    securityKey();
    await client.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(918373)`;
        await tx`CREATE TABLE IF NOT EXISTS security_rate_limits (
            key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at TIMESTAMPTZ NOT NULL)`;
        await tx`CREATE INDEX IF NOT EXISTS security_rate_limits_expiry ON security_rate_limits (reset_at)`;
        const rows = await tx`SELECT * FROM user_totp FOR UPDATE`;
        for (const row of rows) {
            const encrypted = row.secret.startsWith('enc1:');
            if (encrypted) decryptSecret(row.secret, row.user_id); // fail startup on wrong key
            const codes = jsonArray(row.backup_codes).map(code => code.digest
                ? code
                : { digest: backupDigest(code.code, row.user_id), used: !!code.used });
            await tx`UPDATE user_totp SET secret = ${encrypted ? row.secret : encryptSecret(row.secret, row.user_id)},
                backup_codes = ${JSON.stringify(codes)} WHERE id = ${row.id}`;
        }
        // Old bearer sessions cannot be safely grandfathered into the new protocol.
        await tx`DELETE FROM session WHERE token NOT LIKE 'sha256:%'`;
        await tx`DELETE FROM verification WHERE identifier LIKE 'mfa:%' AND id NOT LIKE 'sha256:%'`;
        // Required authorization/security schema must be queryable before readiness.
        await tx`SELECT user_id, failed_count, unlocked_at FROM account_locks LIMIT 0`;
        await tx`SELECT user_id, must_change FROM password_meta LIMIT 0`;
        await tx`SELECT user_id, study_id, site_id FROM user_sites LIMIT 0`;
        await tx`SELECT study_id, status FROM study_db_lock LIMIT 0`;
    });
}
````

## `src/backend/lib/session.js`

````javascript
import crypto from 'node:crypto';
import { tokenDigest } from './security-crypto.js';

export const SESSION_COOKIE = 'better-auth.session_token';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function sessionCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || process.env.BETTER_AUTH_URL?.startsWith('https://'),
        sameSite: 'lax',
        path: '/',
    };
}

export function readSessionToken(req) {
    try {
        const part = (req.headers.cookie || '').split(';').map(s => s.trim())
            .find(s => s.startsWith(`${SESSION_COOKIE}=`));
        if (!part) return null;
        const token = decodeURIComponent(part.slice(SESSION_COOKIE.length + 1));
        return /^v1\.[a-f0-9]{64}$/.test(token) ? token : null;
    } catch {
        return null;
    }
}

export async function createSession(tx, userId, req) {
    const token = `v1.${crypto.randomBytes(32).toString('hex')}`;
    await tx`
        INSERT INTO session (id, user_id, token, expires_at, created_at, updated_at, ip_address, user_agent)
        VALUES (${crypto.randomUUID()}, ${userId}, ${tokenDigest(token)},
                ${new Date(Date.now() + SESSION_MAX_AGE).toISOString()}, NOW(), NOW(),
                ${req.ip || null}, ${(req.headers['user-agent'] || '').slice(0, 512)})
    `;
    return token;
}

export function setSessionCookie(res, token) {
    res.cookie(SESSION_COOKIE, token, { ...sessionCookieOptions(), maxAge: SESSION_MAX_AGE });
}

export function clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
}
````

## `src/backend/lib/sitescope.js`

````javascript
// Site-level data isolation — ICH GCP: site staff (PI, investigator, CRC)
// work with their own site's subjects only. Admin, CRA/monitor, and data
// manager operate across sites (monitoring/oversight functions).
//
// null means an explicitly unrestricted role; [] means no assigned sites.

import { eq, and, inArray, sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { userSites, subjects } from '../db/schemas/schema.js';

export const SITE_BOUND_ROLES = ['pi', 'investigator', 'crc'];

// Site-bound roles must have an explicit assignment. Database errors propagate.
export async function computeSiteScope(user, studyId) {
    if (!SITE_BOUND_ROLES.includes(user.role)) return null;

    const ids = new Set();
    if (user.siteId) ids.add(user.siteId);
    {
        const rows = await db.select({ siteId: userSites.siteId }).from(userSites)
            .where(and(eq(userSites.userId, user.id), eq(userSites.studyId, studyId)));
        for (const r of rows) ids.add(r.siteId);
    }

    return [...ids];
}

// Drizzle condition limiting a query (joined to subjects) to the caller's
// sites. Returns undefined when unscoped, for use inside and(...) chains.
export function siteCondition(req) {
    if (req.siteScope === null) return undefined;
    if (!Array.isArray(req.siteScope) || !req.siteScope.length) return sql`false`;
    return inArray(subjects.siteId, req.siteScope);
}

// True when the caller may access the given subject (by id).
// Study-level records (subjectId null) are visible to all study members.
export async function subjectInSiteScope(req, subjectId) {
    if (req.siteScope === null) return true;
    if (!Array.isArray(req.siteScope) || !req.siteScope.length) return false;
    if (subjectId === null || subjectId === undefined) return true;
    const [s] = await db.select({ siteId: subjects.siteId }).from(subjects)
        .where(eq(subjects.id, parseInt(subjectId)));
    return !!s && req.siteScope.includes(s.siteId);
}
````

## `src/backend/middleware/auth.js`

````javascript
import { readSessionToken } from '../lib/session.js';
import { tokenDigest } from '../lib/security-crypto.js';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { session as sessionTable, user, accountLocks, passwordMeta, organizations } from '../db/schemas/schema.js';

// Paths still allowed while a forced password change is pending — the user
// must be able to change the password and read why they are blocked.
const MUST_CHANGE_ALLOWED = new Set([
    '/api/security/change-password',
    '/api/security/password-status',
    '/api/mfa/logout',
    '/api/auth/sign-out',
]);

export async function requireAuth(req, res, next) {
    const token = readSessionToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const [row] = await db
            .select({
                expiresAt:   sessionTable.expiresAt,
                userId:      user.id,
                name:        user.name,
                displayName: user.displayName,
                email:       user.email,
                role:        user.role,
                siteId:      user.siteId,
                organizationId: user.organizationId,
                orgStatus:   organizations.status,
                isActive:    user.isActive,
            })
            .from(sessionTable)
            .innerJoin(user, eq(sessionTable.userId, user.id))
            .leftJoin(organizations, eq(user.organizationId, organizations.id))
            .where(eq(sessionTable.token, tokenDigest(token)));

        if (!row || new Date(row.expiresAt) < new Date()) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Deactivated staff must not retain access (ICH GCP E6(R3) C.4.2) —
        // enforced here so every API route is covered even if a session survives.
        if (row.isActive === false) {
            return res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
        }

        // Tenant lifecycle: users of a suspended/closed organization lose access
        // (platform_owner has no org and is exempt). One level above isActive.
        if (row.role !== 'platform_owner' && row.orgStatus && row.orgStatus !== 'Active') {
            return res.status(403).json({ error: `Organization is ${row.orgStatus}. Contact your administrator.` });
        }

        // ICH GCP E6(R3) C.4.3 — reject requests from locked accounts
        // Fail closed if security tables cannot be checked.
        {
            const [lock] = await db.select().from(accountLocks)
                .where(eq(accountLocks.userId, row.userId));
            if (lock && !lock.unlockedAt && lock.lockedAt) {
                if (!lock.autoUnlockAt || new Date(lock.autoUnlockAt) > new Date()) {
                    return res.status(423).json({ error: 'Account is locked. Contact your administrator.' });
                }
            }
        }

        // Admin-forced password reset: block the API (not just the UI) until
        // the password is actually changed (ICH GCP E6(R3) C.4.3).
        {
            const url = (req.originalUrl || req.url || '').split('?')[0];
            if (!MUST_CHANGE_ALLOWED.has(url)) {
                const [meta] = await db.select({ mustChange: passwordMeta.mustChange })
                    .from(passwordMeta).where(eq(passwordMeta.userId, row.userId));
                if (meta?.mustChange) {
                    return res.status(403).json({
                        error: 'Password change required before continuing.',
                        mustChangePassword: true,
                    });
                }
            }
        }

        req.authTokenHash = tokenDigest(token);
        req.sessionExpiresAt = row.expiresAt;
        req.user = {
            id:          row.userId,
            name:        row.name,
            displayName: row.displayName ?? null,
            email:       row.email,
            role:        row.role,
            siteId:      row.siteId ?? null,
            organizationId: row.organizationId ?? null,
        };

        // Tenant the request acts within. Normal users are bound to their own
        // organization. platform_owner (cross-tenant SaaS operator) may target
        // a specific tenant via X-Org-ID, or act globally (null) without it.
        if (row.role === 'platform_owner') {
            const rawOrg = req.headers['x-org-id'];
            req.orgId = rawOrg && !isNaN(parseInt(rawOrg)) ? parseInt(rawOrg) : null;
        } else {
            req.orgId = row.organizationId ?? null;
        }

        next();
    } catch (err) {
        console.error('requireAuth error:', err.message);
        return res.status(503).json({ error: 'Authentication temporarily unavailable' });
    }
}
````

## `src/backend/middleware/ratelimit.js`

````javascript
import { client } from '../db/connection.js';
import { tokenDigest } from '../lib/security-crypto.js';

// PostgreSQL-backed atomic buckets are shared by all instances. Raw addresses and
// challenge values never become stored keys. Failure to check a limit fails closed.
async function consume(key, limit, windowMs) {
    const hashedKey = tokenDigest(key);
    const [bucket] = await client`
        INSERT INTO security_rate_limits (key, count, reset_at)
        VALUES (${hashedKey}, 1, ${new Date(Date.now() + windowMs).toISOString()})
        ON CONFLICT (key) DO UPDATE SET
            count = CASE WHEN security_rate_limits.reset_at <= NOW() THEN 1 ELSE security_rate_limits.count + 1 END,
            reset_at = CASE WHEN security_rate_limits.reset_at <= NOW() THEN EXCLUDED.reset_at ELSE security_rate_limits.reset_at END
        RETURNING count, reset_at
    `;
    if (Math.random() < 0.01) {
        await client`DELETE FROM security_rate_limits WHERE key IN
            (SELECT key FROM security_rate_limits WHERE reset_at < NOW() LIMIT 1000)`;
    }
    return { allowed: bucket.count <= limit, retryAfter: Math.max(1, Math.ceil((new Date(bucket.reset_at) - Date.now()) / 1000)) };
}

async function enforce(req, res, next, buckets) {
    try {
        for (const [key, limit, windowMs] of buckets) {
            const result = await consume(key, limit, windowMs);
            if (!result.allowed) {
                res.setHeader('Retry-After', result.retryAfter);
                return res.status(429).json({ error: 'Too many requests. Try again later.', retryAfter: result.retryAfter });
            }
        }
        next();
    } catch {
        res.status(503).json({ error: 'Security checks temporarily unavailable.' });
    }
}

export function rateLimitAuth(req, res, next) {
    const buckets = [[`auth:ip:${req.ip}`, 30, 15 * 60000]];
    const email = req.body?.email ?? req.body?.adminEmail;
    if (typeof email === 'string' && email.length <= 254) buckets.push([`auth:email:${email.trim().toLowerCase()}`, 10, 15 * 60000]);
    if (typeof req.body?.tempToken === 'string' && req.body.tempToken.length <= 128) {
        buckets.push([`auth:challenge:${req.body.tempToken}`, 5, 10 * 60000]);
    }
    return enforce(req, res, next, buckets);
}

export function rateLimitTenant(req, res, next) {
    return enforce(req, res, next, [[`tenant:${req.orgId ?? `ip:${req.ip}`}`, 600, 60000]]);
}
````

## `src/backend/middleware/study.js`

````javascript
// Study context middleware — validates X-Study-ID header and user access
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { studyUsers, studies, studyDbLock } from '../db/schemas/schema.js';
import { computeSiteScope } from '../lib/sitescope.js';
import { isPlatformOwner, sameOrg } from '../lib/tenantscope.js';

const CLOSED_STATUSES = new Set(['Terminated', 'Completed', 'Suspended']);

const EXEMPT_WRITE_PATTERNS = [
    /^\/api\/dblock\/\d+\/sign-cra$/,
    /^\/api\/dblock\/\d+\/sign-admin$/,
    /^\/api\/queries\/\d+\/resolve$/,
    /^\/api\/monitoring\/\d+\/acknowledge$/,
    /^\/api\/export\//,
];

export async function requireStudy(req, res, next) {
    const raw = req.headers['x-study-id'];
    if (!raw) return res.status(400).json({ error: 'X-Study-ID header is required' });

    const id = Number(raw);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid study ID' });

    try {
        const [study] = await db.select({ id: studies.id, status: studies.status, organizationId: studies.organizationId })
            .from(studies).where(eq(studies.id, id));
        if (!study) return res.status(404).json({ error: 'Study not found' });

        // TENANT BOUNDARY: the study must belong to the caller's organization.
        // Cross-tenant → 404 (never reveal that another tenant's study exists).
        // This replaces the old blanket admin bypass — admin is now org-scoped.
        if (!sameOrg(req, study.organizationId)) {
            return res.status(404).json({ error: 'Study not found' });
        }

        // Within the org: admin (and platform_owner) reach any study; other
        // roles must be explicitly assigned to it.
        if (req.user.role !== 'admin' && !isPlatformOwner(req.user)) {
            const [assignment] = await db.select({ id: studyUsers.id })
                .from(studyUsers)
                .where(and(eq(studyUsers.studyId, id), eq(studyUsers.userId, req.user.id)));
            if (!assignment) {
                return res.status(403).json({ error: 'You are not assigned to this study' });
            }
        }

        req.studyId     = id;
        req.studyStatus = study.status;

        // Site-level isolation: PI/investigator/CRC are limited to their
        // assigned sites' subjects (null = unscoped). Routes consume this via
        // lib/sitescope.js siteCondition()/subjectInSiteScope().
        req.siteScope = await computeSiteScope(req.user, id);

        if (req.method !== 'GET') {
            const url = req.originalUrl.split('?')[0];
            const isExempt = EXEMPT_WRITE_PATTERNS.some(p => p.test(url));
            if (!isExempt) {
                if (CLOSED_STATUSES.has(study.status)) {
                    return res.status(423).json({
                        error: `Study is ${study.status}. Data modifications are not permitted.`,
                        studyStatus: study.status,
                    });
                }
                // ICH GCP E6(R3) §5.5.7 — enforce database lock
                const [lock] = await db
                    .select({ status: studyDbLock.status })
                    .from(studyDbLock)
                    .where(and(eq(studyDbLock.studyId, id), eq(studyDbLock.status, 'Locked')))
                    .limit(1);
                if (lock) {
                    return res.status(423).json({
                        error: 'Database is locked. No data modifications are permitted (ICH GCP E6(R3) §5.5.7).',
                        dbLocked: true,
                    });
                }
            }
        }

        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
````

## `src/backend/routes/export.js`

````javascript
import { siteCondition } from '../lib/sitescope.js';
import { Router } from 'express';
import { eq, and, inArray, or, isNull, sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import {
    subjects, sites, visits, crfDataEntries, crfForms,
    adverseEvents, protocolDeviations, informedConsents,
    esignatures, labResults, vitalSigns,
} from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { buildOdmXml } from '../lib/odm.js';
import { isoDay, isoDateTime } from '../lib/isodate.js';
import { buildCsv, withBom, INVALID_DOMAIN_ERROR, vitalsToRows } from '../lib/csv.js';

const router = Router();

function exportSubjectScope(req, subjectColumn) {
    if (req.siteScope !== null && (!Array.isArray(req.siteScope) || !req.siteScope.length)) return sql`false`;
    const allowed = db.select({ id: subjects.id }).from(subjects)
        .where(and(eq(subjects.studyId, req.studyId), siteCondition(req)));
    // Study-level deviations have no subject; retain them for authorized study members.
    return or(isNull(subjectColumn), inArray(subjectColumn, allowed));
}

// ── CDISC ODM-XML 1.3.2 Export ───────────────────────────────────────────────
// The serialiser itself lives in lib/odm.js so the exact bytes we ship to a
// regulator can be asserted in a unit test.

// GET /api/export/odm — CDISC ODM-XML 1.3.2 export (admin, cra)
router.get('/odm', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const sid = req.studyId;
        const [
            allSubjects,
            visitRows,
            entryRows,
            allFormsGlobal,
            allAE,
            allConsents,
            sigRows,
        ] = await Promise.all([
            db.select().from(subjects).leftJoin(sites, eq(subjects.siteId, sites.id)).where(and(eq(subjects.studyId, sid), siteCondition(req))),
            // visits/entries/signatures have no study_id — scope via the subject
            db.select({ row: visits }).from(visits)
                .innerJoin(subjects, eq(visits.subjectId, subjects.id))
                .where(and(eq(subjects.studyId, sid), siteCondition(req))),
            db.select({ row: crfDataEntries }).from(crfDataEntries)
                .innerJoin(subjects, eq(crfDataEntries.subjectId, subjects.id))
                .where(and(eq(subjects.studyId, sid), siteCondition(req))),
            db.select().from(crfForms),
            db.select().from(adverseEvents).where(and(eq(adverseEvents.studyId, sid), exportSubjectScope(req, adverseEvents.subjectId))),
            db.select().from(informedConsents).where(and(eq(informedConsents.studyId, sid), exportSubjectScope(req, informedConsents.subjectId))),
            db.select({ row: esignatures }).from(esignatures)
                .innerJoin(crfDataEntries, eq(esignatures.entryId, crfDataEntries.id))
                .innerJoin(subjects, eq(crfDataEntries.subjectId, subjects.id))
                .where(and(eq(subjects.studyId, sid), siteCondition(req))),
        ]);
        const allVisits  = visitRows.map(r => r.row);
        const allEntries = entryRows.map(r => r.row);
        const allSigs    = sigRows.map(r => r.row);
        // Only emit metadata for forms actually used by this study's entries
        const usedFormIds = new Set(allEntries.map(e => e.formId));
        const allForms = allFormsGlobal.filter(f => usedFormIds.has(f.id));

        const xml = buildOdmXml({
            studyName: process.env.STUDY_NAME || 'E-CRF Clinical Study',
            studyOID:  process.env.STUDY_OID  || 'ECRF.STUDY.001',
            subjects:  allSubjects.map(r => ({ subject: r.subjects ?? r, site: r.sites ?? null })),
            visits:    allVisits,
            entries:   allEntries,
            forms:     allForms,
            adverseEvents: allAE,
            consents:  allConsents,
            signatures: allSigs,
        });

        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="study_export_${Date.now()}.xml"`);

        await writeAudit(db, {
            tableName: 'export', recordId: sid, action: 'EXPORT',
            fieldName: 'format', newValue: 'ODM-XML',
            reason: 'Data export performed',
            user: req.user, ipAddress: req.ip,
        });

        res.send(xml);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Comprehensive CSV Export ─────────────────────────────────────────────────

// GET /api/export/csv?domain=DM|AE|CRF|DEV — domain CSV (admin, cra)
router.get('/csv', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const domain = (req.query.domain || 'DM').toUpperCase();

        let headers = [];
        let rows    = [];

        const sid = req.studyId;
        if (domain === 'DM') {
            headers = ['SUBJID','SITEID','SITE_NAME','SEX','GENDER_IDENTITY','DOB','ENRLDTC','STATUS','WDRAWDTC','WDRAWREASON'];
            const data = await db.select().from(subjects).leftJoin(sites, eq(subjects.siteId, sites.id)).where(and(eq(subjects.studyId, sid), siteCondition(req)));
            rows = data.map(r => {
                const s = r.subjects ?? r;
                const site = r.sites ?? null;
                return [
                    s.subjectCode, site?.code || '', site?.name || '',
                    s.sex || 'U', s.genderIdentity || '', s.dateOfBirth || '',
                    isoDay(s.enrolledAt),
                    s.status || '',
                    isoDay(s.withdrawnAt),
                    s.withdrawReason || '',
                ];
            });
        } else if (domain === 'AE') {
            headers = ['SUBJID','AESEQ','AETERM','AEDECOD','AESOC','AESTDTC','AEENDTC','AESEV','AESER','AEREL','AEOUT','AEACN','AESTATUS','CREATED_BY','CREATED_AT'];
            const data = await db.select().from(adverseEvents)
                .leftJoin(subjects, eq(adverseEvents.subjectId, subjects.id))
                .where(and(eq(adverseEvents.studyId, sid), exportSubjectScope(req, adverseEvents.subjectId)))
                .orderBy(adverseEvents.subjectId, adverseEvents.id);
            rows = data.map(r => {
                const ae = r.adverse_events ?? r;
                const subj = r.subjects ?? null;
                return [
                    subj?.subjectCode || '', ae.id,
                    ae.aeTerm, ae.meddraPt || '', ae.meddraSoc || '',
                    ae.onsetDate || '', ae.resolutionDate || '',
                    ae.severity, ae.isSerious ? 'Y' : 'N',
                    ae.causality || '', ae.outcome || '', ae.actionTaken || '',
                    ae.reportStatus, ae.createdByName || '',
                    isoDateTime(ae.createdAt),
                ];
            });
        } else if (domain === 'DEV') {
            headers = ['DEVID','SUBJID','TYPE','CATEGORY','DESCRIPTION','DEVIATION_DATE','DISCOVERY_DATE','ROOT_CAUSE','IMPACT','CAPA','REPORTED_TO_IRB','STATUS','CREATED_BY','CREATED_AT'];
            const data = await db.select().from(protocolDeviations)
                .leftJoin(subjects, eq(protocolDeviations.subjectId, subjects.id))
                .where(and(eq(protocolDeviations.studyId, sid), exportSubjectScope(req, protocolDeviations.subjectId)))
                .orderBy(protocolDeviations.id);
            rows = data.map(r => {
                const d = r.protocol_deviations ?? r;
                const subj = r.subjects ?? null;
                return [
                    d.id, subj?.subjectCode || '', d.deviationType, d.category || '',
                    d.description, d.deviationDate || '', d.discoveryDate || '',
                    d.rootCause || '', d.impactOnSubject || '', d.capa || '',
                    d.reportedToIrb ? 'Y' : 'N', d.status,
                    d.createdByName || '',
                    isoDateTime(d.createdAt),
                ];
            });
        } else if (domain === 'IC') {
            headers = ['ICID','SUBJID','VERSION','DATE','TIME','TYPE','LANGUAGE','OBTAINED_BY','WITNESS','WITNESS_TYPE','ASSENT','ASSENT_DTC','COPY_PROVIDED','WITHDRAWN','WITHDRAWN_DTC','WITHDRAWN_REASON','CREATED_BY','CREATED_AT'];
            const data = await db.select().from(informedConsents)
                .leftJoin(subjects, eq(informedConsents.subjectId, subjects.id))
                .where(and(eq(informedConsents.studyId, sid), exportSubjectScope(req, informedConsents.subjectId)))
                .orderBy(informedConsents.id);
            rows = data.map(r => {
                const c = r.informed_consents ?? r;
                const subj = r.subjects ?? null;
                return [
                    c.id, subj?.subjectCode || '', c.consentVersion, c.consentDate,
                    c.consentTime || '',
                    c.consentType, c.language, c.obtainedByName || '',
                    c.witnessName || '', c.witnessType || '',
                    c.assentObtained ? 'Y' : 'N', c.assentDate || '',
                    c.copyProvided ? 'Y' : 'N',
                    c.isWithdrawn ? 'Y' : 'N',
                    isoDay(c.withdrawnAt),
                    c.withdrawnReason || '', c.createdByName || '',
                    isoDateTime(c.createdAt),
                ];
            });
        } else if (domain === 'LB') {
            // Laboratory — SDTM-style long format (one row per test result), the
            // natural shape for SPSS / stats.
            headers = ['SUBJID','VISIT','LBTEST','LBORRES','LBORRESU','LBORNRLO','LBORNRHI','LBORNR','LBDTC','LBNAM'];
            const data = await db.select().from(labResults)
                .leftJoin(subjects, eq(labResults.subjectId, subjects.id))
                .leftJoin(visits, eq(labResults.visitId, visits.id))
                .where(and(eq(labResults.studyId, sid), exportSubjectScope(req, labResults.subjectId)))
                .orderBy(labResults.subjectId, labResults.id);
            rows = data.map(r => {
                const l = r.lab_results ?? r;
                return [
                    r.subjects?.subjectCode || '', r.visits?.visitName || '',
                    l.testName, l.valueNumeric ?? l.valueText ?? '', l.unit || '',
                    l.refRangeLow ?? '', l.refRangeHigh ?? '', l.refRangeText || '',
                    l.assessmentDate || '', l.labName || '',
                ];
            });
        } else if (domain === 'VS') {
            // Vital Signs — SDTM-style long format (one row per measurement).
            headers = ['SUBJID','VISIT','VSTESTCD','VSTEST','VSORRES','VSORRESU','VSDTC'];
            const data = await db.select().from(vitalSigns)
                .leftJoin(subjects, eq(vitalSigns.subjectId, subjects.id))
                .leftJoin(visits, eq(vitalSigns.visitId, visits.id))
                .where(and(eq(vitalSigns.studyId, sid), exportSubjectScope(req, vitalSigns.subjectId)))
                .orderBy(vitalSigns.subjectId, vitalSigns.id);
            rows = data.flatMap(r => vitalsToRows(
                r.vital_signs ?? r,
                r.subjects?.subjectCode || '',
                r.visits?.visitName || '',
            ));
        } else if (domain === 'CRF') {
            // CRF form data — long format (one row per captured field), safe across
            // forms with different field sets.
            headers = ['SUBJID','VISIT','FORM','FIELD','VALUE'];
            const data = await db.select().from(crfDataEntries)
                .leftJoin(subjects, eq(crfDataEntries.subjectId, subjects.id))
                .leftJoin(visits, eq(crfDataEntries.visitId, visits.id))
                .leftJoin(crfForms, eq(crfDataEntries.formId, crfForms.id))
                .where(and(eq(subjects.studyId, sid), siteCondition(req)))
                .orderBy(crfDataEntries.subjectId, crfDataEntries.id);
            rows = data.flatMap(r => {
                const e = r.crf_data_entries ?? r;
                const subj = r.subjects?.subjectCode || '';
                const vis = r.visits?.visitName || '';
                const form = r.crf_forms?.name || '';
                const dj = e.dataJson && typeof e.dataJson === 'object' ? e.dataJson : {};
                return Object.entries(dj).map(([field, value]) => [
                    subj, vis, form, field, Array.isArray(value) ? value.join('; ') : (value ?? ''),
                ]);
            });
        } else {
            return res.status(400).json({ error: INVALID_DOMAIN_ERROR });
        }

        const csv = buildCsv(headers, rows);
        res.set('Content-Type', 'text/csv; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="${domain}_${Date.now()}.csv"`);

        await writeAudit(db, {
            tableName: 'export', recordId: req.studyId, action: 'EXPORT',
            fieldName: 'domain', newValue: domain,
            reason: `CSV export — domain: ${domain}`,
            user: req.user, ipAddress: req.ip,
        });

        res.send(withBom(csv)); // BOM so Excel detects UTF-8
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
````

## `src/backend/routes/mfa.js`

````javascript
import { Router } from 'express';
import crypto from 'node:crypto';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin, generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { verifyPassword, hashPassword } from '@better-auth/utils/password';
import { client, db } from '../db/connection.js';
import { POLICY } from '../lib/passwordpolicy.js';
import { requireAuth } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { asyncRoute, validCredentials } from '../lib/http-security.js';
import { encryptSecret, decryptSecret, backupDigest, tokenDigest, equalDigest, credentialFingerprint } from '../lib/security-crypto.js';
import { createSession, setSessionCookie, clearSessionCookie, readSessionToken } from '../lib/session.js';

const router = Router();
const totp = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() });
// Match password verification cost for unknown users without storing any credential.
let dummyHash;
const codeIsValidInput = code => typeof code === 'string' && /^[a-zA-Z0-9\s]{6,24}$/.test(code);

function jsonArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function lockEmail(tx, email) {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 19))`;
}

async function recordFailure(tx, email, userId, ip) {
    await tx`INSERT INTO login_attempts (email, ip_address, success) VALUES (${email}, ${ip || 'unknown'}, FALSE)`;
    const [row] = await tx`
        INSERT INTO account_locks (user_id, email, failed_count, unlocked_at) VALUES (${userId}, ${email}, 1, NOW())
        ON CONFLICT (email) DO UPDATE SET failed_count = account_locks.failed_count + 1,
            user_id = COALESCE(EXCLUDED.user_id, account_locks.user_id)
        RETURNING id, failed_count
    `;
    if (row.failed_count >= POLICY.maxFailedAttempts) {
        await tx`UPDATE account_locks SET locked_at = NOW(), unlocked_at = NULL,
            unlocked_by = NULL, unlock_reason = NULL,
            auto_unlock_at = ${new Date(Date.now() + POLICY.lockoutMinutes * 60000).toISOString()} WHERE id = ${row.id}`;
    }
}

async function resetFailures(tx, email, ip) {
    await tx`UPDATE account_locks SET failed_count = 0, auto_unlock_at = NULL,
        unlocked_at = NOW(), unlock_reason = 'Successful authentication' WHERE email = ${email}`;
    await tx`INSERT INTO login_attempts (email, ip_address, success) VALUES (${email}, ${ip || 'unknown'}, TRUE)`;
}

async function checkAccount(tx, userId) {
    const [user] = await tx`SELECT u.*, o.status AS org_status FROM "user" u
        LEFT JOIN organizations o ON o.id = u.organization_id WHERE u.id = ${userId} FOR UPDATE OF u`;
    if (!user || !user.is_active || !user.email_verified ||
        (user.role !== 'platform_owner' && user.org_status !== 'Active')) return null;
    const [lock] = await tx`SELECT * FROM account_locks WHERE email = ${user.email}`;
    if (lock?.locked_at && !lock.unlocked_at && (!lock.auto_unlock_at || new Date(lock.auto_unlock_at) > new Date())) return null;
    return user;
}

function publicUser(user) {
    return { id: user.id, name: user.name, displayName: user.display_name ?? null, role: user.role };
}

async function verifyTotp(code, row) {
    if (!codeIsValidInput(code)) return false;
    const secret = decryptSecret(row.secret, row.user_id); // decryption/configuration failures must propagate
    try { return (await totp.verify(code.replace(/\s/g, ''), { secret })).valid; }
    catch { return false; }
}

async function loginAudit(user, req, reason) {
    await writeAudit(db, {
        tableName: 'user', recordId: user.id, action: 'LOGIN', reason,
        user: { ...user, organizationId: user.organization_id }, ipAddress: req.ip,
    });
}

router.post('/initiate', asyncRoute(async (req, res) => {
    if (!validCredentials(req.body)) return res.status(400).json({ error: 'Invalid email or password format.' });
    const email = req.body.email.trim().toLowerCase();
    const result = await client.begin(async tx => {
        await lockEmail(tx, email);
        const [record] = await tx`SELECT u.id, a.password FROM "user" u JOIN account a ON a.user_id = u.id
            AND a.provider_id = 'credential' WHERE u.email = ${email}`;
        const [lock] = await tx`SELECT * FROM account_locks WHERE email = ${email}`;
        if (lock?.locked_at && !lock.unlocked_at) {
            if (!lock.auto_unlock_at || new Date(lock.auto_unlock_at) > new Date()) return { locked: true };
            await tx`UPDATE account_locks SET failed_count = 0, unlocked_at = NOW(), auto_unlock_at = NULL WHERE id = ${lock.id}`;
        }
        dummyHash ??= hashPassword(crypto.randomBytes(32).toString('hex'));
        const valid = await verifyPassword(record?.password || await dummyHash, req.body.password);
        if (!record || !valid) {
            await recordFailure(tx, email, record?.id ?? null, req.ip);
            return { invalid: true };
        }
        const user = await checkAccount(tx, record.id);
        if (!user) return { invalid: true };
        // Lock/read the current credential again to detect a concurrent password change.
        const [current] = await tx`SELECT password FROM account WHERE user_id = ${user.id} AND provider_id = 'credential'`;
        if (current?.password !== record.password) return { invalid: true };
        const [mfa] = await tx`SELECT * FROM user_totp WHERE user_id = ${user.id}`;
        if (mfa?.is_enabled) {
            decryptSecret(mfa.secret, user.id); // fail closed until legacy secrets have been migrated
            const tempToken = crypto.randomBytes(32).toString('hex');
            await tx`DELETE FROM verification WHERE identifier = ${`mfa:${user.id}`}`;
            await tx`INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at)
                VALUES (${tokenDigest(tempToken)}, ${`mfa:${user.id}`},
                    ${JSON.stringify({ userId: user.id, email, credential: credentialFingerprint(current.password), secretVersion: tokenDigest(mfa.secret), attempts: 0 })},
                    ${new Date(Date.now() + 10 * 60000).toISOString()}, NOW(), NOW())`;
            return { tempToken };
        }
        const token = await createSession(tx, user.id, req);
        await resetFailures(tx, email, req.ip);
        return { token, user };
    });
    if (result.locked) return res.status(423).json({ error: 'Account temporarily locked.' });
    if (result.invalid) return res.status(401).json({ error: 'Invalid email or password.' });
    if (result.tempToken) return res.json({ status: 'totp_required', tempToken: result.tempToken });
    await loginAudit(result.user, req, 'Successful login');
    setSessionCookie(res, result.token);
    res.json({ status: 'authenticated', user: publicUser(result.user) });
}));

router.post('/totp-verify', asyncRoute(async (req, res) => {
    const { tempToken, totpCode } = req.body ?? {};
    if (typeof tempToken !== 'string' || !/^[a-f0-9]{64}$/.test(tempToken) || !codeIsValidInput(totpCode)) {
        return res.status(400).json({ error: 'Invalid verification input.' });
    }
    const id = tokenDigest(tempToken);
    const result = await client.begin(async tx => {
        // Resolve only this indexed challenge; never scan all verification records.
        const [preview] = await tx`SELECT value FROM verification WHERE id = ${id} AND expires_at > NOW()`;
        if (!preview) return null;
        const context = JSON.parse(preview.value);
        await lockEmail(tx, context.email);
        const user = await checkAccount(tx, context.userId);
        if (!user) return null;
        const [challenge] = await tx`SELECT * FROM verification WHERE id = ${id} AND identifier = ${`mfa:${user.id}`}
            AND expires_at > NOW() FOR UPDATE`;
        if (!challenge) return null;
        const data = JSON.parse(challenge.value);
        const [credential] = await tx`SELECT password FROM account WHERE user_id = ${user.id} AND provider_id = 'credential'`;
        const [mfa] = await tx`SELECT * FROM user_totp WHERE user_id = ${user.id} FOR UPDATE`;
        if (data.attempts >= 5 || !credential || !mfa?.is_enabled ||
            !equalDigest(data.credential, credentialFingerprint(credential.password)) ||
            !equalDigest(data.secretVersion, tokenDigest(mfa.secret))) return null;
        let valid = await verifyTotp(totpCode, mfa);
        if (!valid) {
            const codes = jsonArray(mfa.backup_codes);
            const digest = backupDigest(totpCode, user.id);
            const match = codes.find(code => !code.used && equalDigest(code.digest, digest));
            if (match) {
                match.used = true;
                await tx`UPDATE user_totp SET backup_codes = ${JSON.stringify(codes)} WHERE user_id = ${user.id}`;
                valid = true;
            }
        }
        if (!valid) {
            data.attempts++;
            await tx`UPDATE verification SET value = ${JSON.stringify(data)} WHERE id = ${id}`;
            await recordFailure(tx, user.email, user.id, req.ip);
            return null;
        }
        await tx`DELETE FROM verification WHERE id = ${id}`;
        await resetFailures(tx, user.email, req.ip);
        return { token: await createSession(tx, user.id, req), user };
    });
    if (!result) return res.status(401).json({ error: 'Invalid or expired verification.' });
    await loginAudit(result.user, req, 'Successful login (TOTP verified)');
    setSessionCookie(res, result.token);
    res.json({ user: publicUser(result.user) });
}));

router.get('/totp/status', requireAuth, asyncRoute(async (req, res) => {
    const [row] = await client`SELECT * FROM user_totp WHERE user_id = ${req.user.id}`;
    res.json({ enabled: !!row?.is_enabled, enabledAt: row?.enabled_at ?? null,
        backupCodesRemaining: jsonArray(row?.backup_codes).filter(code => !code.used).length });
}));

router.post('/totp/setup', requireAuth, asyncRoute(async (req, res) => {
    const secret = generateSecret();
    const encrypted = encryptSecret(secret, req.user.id);
    const result = await client.begin(async tx => {
        await tx`SELECT id FROM "user" WHERE id = ${req.user.id} FOR UPDATE`;
        const [row] = await tx`INSERT INTO user_totp (user_id, secret, is_enabled)
            VALUES (${req.user.id}, ${encrypted}, FALSE)
            ON CONFLICT (user_id) DO UPDATE SET secret = EXCLUDED.secret, backup_codes = '[]', enabled_at = NULL
            WHERE user_totp.is_enabled = FALSE RETURNING id`;
        return row;
    });
    if (!result) return res.status(409).json({ error: 'Verify and disable the existing authenticator before replacing it.' });
    const otpauthUrl = generateURI({ type: 'totp', label: req.user.email, secret, issuer: 'E-CRF System' });
    res.json({ secret, otpauthUrl, qrDataUrl: await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 2 }) });
}));

router.post('/totp/enable', requireAuth, asyncRoute(async (req, res) => {
    if (!codeIsValidInput(req.body?.totpCode)) return res.status(400).json({ error: 'Invalid code.' });
    const result = await client.begin(async tx => {
        await tx`SELECT id FROM "user" WHERE id = ${req.user.id} FOR UPDATE`;
        const [row] = await tx`SELECT * FROM user_totp WHERE user_id = ${req.user.id} FOR UPDATE`;
        if (!row || row.is_enabled || !await verifyTotp(req.body.totpCode, row)) return null;
        const codes = Array.from({ length: 8 }, () => crypto.randomBytes(10).toString('hex').toUpperCase());
        await tx`UPDATE user_totp SET is_enabled = TRUE, enabled_at = NOW(),
            backup_codes = ${JSON.stringify(codes.map(code => ({ digest: backupDigest(code, req.user.id), used: false })))}
            WHERE user_id = ${req.user.id}`;
        await tx`DELETE FROM session WHERE user_id = ${req.user.id} AND token <> ${req.authTokenHash}`;
        await tx`DELETE FROM verification WHERE identifier = ${`mfa:${req.user.id}`}`;
        return { id: row.id, codes };
    });
    if (!result) return res.status(400).json({ error: 'Invalid code or authenticator already enabled.' });
    await writeAudit(db, { tableName: 'user_totp', recordId: result.id, action: 'UPDATE',
        fieldName: 'is_enabled', newValue: 'true', reason: 'Enabled TOTP', user: req.user, ipAddress: req.ip });
    res.json({ enabled: true, backupCodes: result.codes });
}));

router.delete('/totp/disable', requireAuth, asyncRoute(async (req, res) => {
    if (!codeIsValidInput(req.body?.totpCode)) return res.status(400).json({ error: 'Invalid code.' });
    const row = await client.begin(async tx => {
        await tx`SELECT id FROM "user" WHERE id = ${req.user.id} FOR UPDATE`;
        const [mfa] = await tx`SELECT * FROM user_totp WHERE user_id = ${req.user.id} FOR UPDATE`;
        if (!mfa?.is_enabled || !await verifyTotp(req.body.totpCode, mfa)) return null;
        await tx`DELETE FROM user_totp WHERE user_id = ${req.user.id}`;
        await tx`DELETE FROM verification WHERE identifier = ${`mfa:${req.user.id}`}`;
        await tx`DELETE FROM session WHERE user_id = ${req.user.id} AND token <> ${req.authTokenHash}`;
        return mfa;
    });
    if (!row) return res.status(401).json({ error: 'Invalid code or authenticator disabled.' });
    await writeAudit(db, { tableName: 'user_totp', recordId: row.id, action: 'UPDATE',
        fieldName: 'is_enabled', newValue: 'false', reason: 'Disabled TOTP', user: req.user, ipAddress: req.ip });
    res.json({ enabled: false });
}));

for (const path of ['/verify', '/direct-login', '/resend']) {
    router.post(path, (_req, res) => res.status(410).json({ error: 'Use /api/mfa/initiate and /api/mfa/totp-verify.' }));
}

// Logout also works for locked/deactivated users, and is idempotent.
export const logout = asyncRoute(async (req, res) => {
    const token = readSessionToken(req);
    if (token) {
        const rows = await client`DELETE FROM session WHERE token = ${tokenDigest(token)} RETURNING user_id`;
        if (rows.length) {
            try {
                await writeAudit(db, { tableName: 'user', recordId: rows[0].user_id, action: 'LOGOUT',
                    reason: 'Session revoked', user: null, ipAddress: req.ip });
            } catch (error) {
                console.error('Logout audit failed:', error.message);
            }
        }
    }
    clearSessionCookie(res);
    res.json({ ok: true });
});
router.post('/logout', logout);

export default router;
````

## `src/backend/routes/randomization.js`

````javascript
import { siteCondition } from '../lib/sitescope.js';
import { Router } from 'express';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { randomizationList, subjectRandomization, subjects } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import {
    BLINDED_LABEL, maskTreatmentArms, validateRandList, normalizeRandList,
    canRandomize, canUnblind, noSlotError, randomizationStats,
} from '../lib/randomrules.js';

const router = Router();

// GET /api/randomization/list — view the randomization list (admin only, shows arms)
router.get('/list', requireRole('admin'), async (req, res) => {
    try {
        const rows = await db.select().from(randomizationList)
            .where(eq(randomizationList.studyId, req.studyId))
            .orderBy(randomizationList.id);
        res.json(rows);
    } catch (err) {
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// POST /api/randomization/list — upload randomization list (admin only)
// Body: { entries: [{ randCode, treatmentArm, stratum }] }
router.post('/list', requireRole('admin'), async (req, res) => {
    try {
        const { entries } = req.body;
        const guard = validateRandList(entries);
        if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

        const values = normalizeRandList(entries).map(e => ({
            ...e,
            studyId:    req.studyId,
            uploadedBy: req.user.id,
        }));

        // Upsert — skip already existing codes
        const inserted = [];
        for (const v of values) {
            try {
                const [row] = await db.insert(randomizationList).values(v)
                    .onConflictDoNothing()
                    .returning();
                if (row) inserted.push(row);
            } catch {}
        }

        await writeAudit(db, {
            tableName: 'randomization_list', recordId: 0, action: 'INSERT',
            newValue: `${inserted.length} codes uploaded`,
            reason: `Randomization list uploaded by admin`,
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json({ uploaded: inserted.length, total: entries.length });
    } catch (err) {
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// GET /api/randomization — get assignment for ?subjectId= or all assignments
router.get('/', async (req, res) => {
    try {
        const { subjectId } = req.query;
        const conditions = [eq(subjects.studyId, req.studyId), siteCondition(req)];
        if (subjectId) {
            const sid = Number(subjectId);
            if (!Number.isSafeInteger(sid) || sid <= 0) {
                return res.status(400).json({ error: 'Invalid subjectId' });
            }
            conditions.push(eq(subjectRandomization.subjectId, sid));
        }

        const rows = await db
            .select({
                id:               subjectRandomization.id,
                subjectId:        subjectRandomization.subjectId,
                subjectCode:      subjects.subjectCode,
                randCode:         subjectRandomization.randCode,
                treatmentArm:     subjectRandomization.treatmentArm,
                stratum:          subjectRandomization.stratum,
                isBlinded:        subjectRandomization.isBlinded,
                unblindedAt:      subjectRandomization.unblindedAt,
                unblindReason:    subjectRandomization.unblindReason,
                randomizedAt:     subjectRandomization.randomizedAt,
                randomizedByName: subjectRandomization.randomizedByName,
            })
            .from(subjectRandomization)
            .leftJoin(subjects, eq(subjectRandomization.subjectId, subjects.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(subjectRandomization.randomizedAt);

        // Blind treatment arm for non-admin users
        res.json(maskTreatmentArms(rows, req.user.role));
    } catch (err) {
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// POST /api/randomization — assign next available slot to a subject (admin, investigator)
router.post('/', requireRole('admin', 'investigator', 'pi'), async (req, res) => {
    try {
        const { subjectId, stratum } = req.body;
        if (!subjectId) return res.status(400).json({ error: 'subjectId is required' });

        const sid = Number(subjectId);
        if (!Number.isSafeInteger(sid) || sid <= 0) {
            return res.status(400).json({ error: 'Invalid subjectId' });
        }

        const assignment = await db.transaction(async tx => {
            // Check subject exists in this study, is at the caller's site, and is Active
            const [subject] = await tx.select().from(subjects)
                .where(and(eq(subjects.id, sid), eq(subjects.studyId, req.studyId)))
                .for('update');
            const [existing] = await tx.select().from(subjectRandomization)
                .where(eq(subjectRandomization.subjectId, sid));

            const guard = canRandomize({ subject, existingAssignment: existing, siteScope: req.siteScope });
            if (!guard.ok) throw Object.assign(new Error(guard.error), { status: guard.status });

            // Find next available slot (matching stratum if provided, scoped to study)
            const listConditions = [eq(randomizationList.isUsed, false), eq(randomizationList.studyId, req.studyId)];
            if (stratum) listConditions.push(eq(randomizationList.stratum, stratum));

            const [slot] = await tx.select().from(randomizationList)
                .where(and(...listConditions))
                .orderBy(randomizationList.id)
                .limit(1).for('update', { skipLocked: true });

            if (!slot) throw Object.assign(new Error(noSlotError(stratum)), { status: 409 });

            // Mark slot as used
            await tx.update(randomizationList)
                .set({ isUsed: true })
                .where(eq(randomizationList.id, slot.id));

            // Create assignment
            const [assignment] = await tx.insert(subjectRandomization).values({
                subjectId:        sid,
                randCode:         slot.randCode,
                treatmentArm:     slot.treatmentArm,
                stratum:          slot.stratum ?? null,
                isBlinded:        true,
                randomizedBy:     req.user.id,
                randomizedByName: req.user.name,
            }).returning();

            await writeAudit(tx, {
                tableName: 'subject_randomization', recordId: assignment.id, action: 'INSERT',
                newValue: `Subject ${subject.subjectCode} → Code ${slot.randCode}`,
                reason: 'Subject randomized',
                user: req.user, ipAddress: req.ip,
            });

            return assignment;
        });

        res.status(201).json({
            ...assignment,
            treatmentArm: BLINDED_LABEL, // always blind at creation
        });
    } catch (err) {
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// PATCH /api/randomization/:id/unblind — emergency or final unblinding (admin only)
router.patch('/:id/unblind', requireRole('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'Invalid randomization id' });
        }
        const { reason } = req.body;

        const allowedSubjects = db.select({ id: subjects.id }).from(subjects)
            .where(and(eq(subjects.studyId, req.studyId), siteCondition(req)));
        const target = and(eq(subjectRandomization.id, id), inArray(subjectRandomization.subjectId, allowedSubjects));
        const [existing] = await db.select().from(subjectRandomization).where(target);
        const guard = canUnblind(existing, { reason });
        if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

        const [updated] = await db.update(subjectRandomization)
            .set({ isBlinded: false, unblindedAt: new Date(), unblindedBy: req.user.id, unblindReason: reason })
            .where(target)
            .returning();

        await writeAudit(db, {
            tableName: 'subject_randomization', recordId: id, action: 'UPDATE',
            fieldName: 'is_blinded', oldValue: 'true', newValue: 'false',
            reason: `Unblinding: ${reason}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// GET /api/randomization/stats
router.get('/stats', async (req, res) => {
    try {
        const allList = await db.select({ isUsed: randomizationList.isUsed }).from(randomizationList)
            .where(eq(randomizationList.studyId, req.studyId));
        const assignments = await db.select({ isBlinded: subjectRandomization.isBlinded })
            .from(subjectRandomization)
            .leftJoin(subjects, eq(subjectRandomization.subjectId, subjects.id))
            .where(and(eq(subjects.studyId, req.studyId), siteCondition(req)));

        res.json(randomizationStats(allList, assignments));
    } catch (err) {
        res.status([400, 404, 409].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

export default router;
````

## `src/backend/routes/register.js`

````javascript
import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { auth } from '../auth/better-auth.js';
import { db } from '../db/connection.js';
import { passwordMeta, user, organizations } from '../db/schemas/schema.js';
import { validatePassword } from '../lib/passwordpolicy.js';
import { asyncRoute, validCredentials } from '../lib/http-security.js';

const router = Router();
// Public registration is exclusively a development/demo convenience.
// Production users are provisioned by an administrator or verified tenant signup.
const selfRegistrationOpen = () => process.env.NODE_ENV !== 'production' && process.env.ALLOW_SELF_REGISTRATION === 'true';
const reservedEmails = () => [process.env.ADMIN_EMAIL, process.env.PLATFORM_OWNER_EMAIL]
    .filter(Boolean).map(value => value.trim().toLowerCase());

router.get('/config', (_req, res) => {
    res.json({ selfRegistration: selfRegistrationOpen(), bootstrapNeeded: false, license: null });
});

router.post('/', asyncRoute(async (req, res) => {
    if (!selfRegistrationOpen()) {
        return res.status(403).json({ message: 'Accounts are created by an administrator.' });
    }
    if (!validCredentials(req.body) || typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.length > 200) {
        return res.status(400).json({ message: 'Invalid registration input.' });
    }
    const { name, password } = req.body;
    const email = req.body.email.trim().toLowerCase();
    if (reservedEmails().includes(email)) {
        return res.status(403).json({ message: 'Use the local administrator provisioning command.' });
    }
    const details = validatePassword(password, email);
    if (details.length) return res.status(400).json({ message: 'Password does not meet security requirements.', details });
    const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, 'default'));
    if (!org) return res.status(503).json({ message: 'Organization setup is required.' });
    try {
        const result = await auth.api.signUpEmail({ body: { name: name.trim(), email, password } });
        if (!result?.user?.id) throw new Error('Signup failed');
        await db.transaction(async tx => {
            await tx.update(user).set({ role: 'investigator', organizationId: org.id, emailVerified: true })
                .where(eq(user.id, result.user.id));
            await tx.insert(passwordMeta).values({ userId: result.user.id, lastChangedAt: new Date(), mustChange: false })
                .onConflictDoNothing();
        });
        res.json({ ok: true });
    } catch (err) {
        if (/already|exist|duplicate/i.test(err.message || '')) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }
        throw err;
    }
}));

export default router;
````

## `src/backend/routes/security.js`

````javascript
import crypto from 'node:crypto';
import { tokenDigest } from '../lib/security-crypto.js';
import { setSessionCookie } from '../lib/session.js';
// Security management — ICH GCP E6(R3) Appendix C.4.3
// Password change, account lockout management, password expiry status

import { Router } from 'express';
import { eq, desc, and, gt, isNull } from 'drizzle-orm';
import { db, client } from '../db/connection.js';
import { user, account, accountLocks, loginAttempts, passwordHistory, passwordMeta, session, verification } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { validatePassword, POLICY, checkPasswordExpiry } from '../lib/passwordpolicy.js';
import { verifyPassword, hashPassword } from '@better-auth/utils/password';
import { orgCondition, sameOrg } from '../lib/tenantscope.js';

const router = Router();

// TENANT BOUNDARY: /unlock/:userId and /force-password-reset/:userId target a
// user by id — reject any user outside the caller's organization (404).
router.param('userId', async (req, res, next, userId) => {
    try {
        const [target] = await db.select({ organizationId: user.organizationId }).from(user)
            .where(eq(user.id, userId));
        if (!target || !sameOrg(req, target.organizationId)) {
            return res.status(404).json({ error: 'User not found' });
        }
        next();
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// GET /api/security/password-status — check expiry for current user
router.get('/password-status', async (req, res) => {
    try {
        let [meta] = await db.select().from(passwordMeta)
            .where(eq(passwordMeta.userId, req.user.id));
        // Auto-initialize for accounts created before password_meta existed
        if (!meta) {
            const now = new Date();
            await db.insert(passwordMeta)
                .values({ userId: req.user.id, lastChangedAt: now, mustChange: false })
                .onConflictDoNothing();
            meta = { lastChangedAt: now, mustChange: false };
        }
        const expiry = checkPasswordExpiry(meta.lastChangedAt);
        res.json({
            lastChangedAt: meta.lastChangedAt,
            mustChange:    meta.mustChange,
            ...expiry,
            policy: {
                minLength:   POLICY.minLength,
                expiryDays:  POLICY.expiryDays,
                historyCount: POLICY.historyCount,
            },
        });
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// POST /api/security/change-password — self-service password change
router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 256 || typeof newPassword !== 'string' || !newPassword) {
            return res.status(400).json({ error: 'currentPassword and newPassword are required' });
        }

        // Validate new password against policy
        const policyErrors = validatePassword(newPassword, req.user.email);
        if (policyErrors.length > 0) {
            return res.status(400).json({ error: 'Password does not meet policy requirements', details: policyErrors });
        }

        const replacementToken = 'v1.' + crypto.randomBytes(32).toString('hex');
        await db.transaction(async tx => {
            await tx.select({ id: user.id }).from(user).where(eq(user.id, req.user.id)).for('update');
            const [active] = await tx.select({ id: session.id }).from(session)
                .where(and(eq(session.userId, req.user.id), eq(session.token, req.authTokenHash)));
            if (!active) throw Object.assign(new Error('Session expired'), { status: 401 });
            // Verify current password
            const [acct] = await tx.select({ password: account.password }).from(account)
                .where(and(eq(account.userId, req.user.id), eq(account.providerId, 'credential')));
            if (!acct?.password) throw Object.assign(new Error('No credential account found'), { status: 400 });

            const valid = await verifyPassword(acct.password, currentPassword);
            if (!valid) throw Object.assign(new Error('Current password is incorrect'), { status: 401 });

            // Check password history
            const history = await tx.select({ passwordHash: passwordHistory.passwordHash })
                .from(passwordHistory)
                .where(eq(passwordHistory.userId, req.user.id))
                .orderBy(desc(passwordHistory.createdAt))
                .limit(POLICY.historyCount);

            for (const h of history) {
                if (await verifyPassword(h.passwordHash, newPassword)) {
                    throw Object.assign(new Error('Cannot reuse a recent password'), { status: 400 });
                }
            }

            // Hash and update password
            const newHash = await hashPassword(newPassword);
            await tx.update(account)
                .set({ password: newHash, updatedAt: new Date() })
                .where(and(eq(account.userId, req.user.id), eq(account.providerId, 'credential')));

            // Save to history
            await tx.insert(passwordHistory).values({
                userId: req.user.id,
                passwordHash: newHash,
            });

            // Trim history to last N
            const allHistory = await tx.select({ id: passwordHistory.id })
                .from(passwordHistory)
                .where(eq(passwordHistory.userId, req.user.id))
                .orderBy(desc(passwordHistory.createdAt));
            if (allHistory.length > POLICY.historyCount) {
                const toDelete = allHistory.slice(POLICY.historyCount).map(h => h.id);
                for (const id of toDelete) {
                    await tx.delete(passwordHistory).where(eq(passwordHistory.id, id));
                }
            }

            // Update password meta
            await tx.insert(passwordMeta)
                .values({ userId: req.user.id, lastChangedAt: new Date(), mustChange: false })
                .onConflictDoUpdate({
                    target: passwordMeta.userId,
                    set: { lastChangedAt: new Date(), mustChange: false },
                });

            await writeAudit(tx, {
                tableName: 'account', recordId: req.user.id, action: 'UPDATE',
                fieldName: 'password', newValue: '*** changed ***',
                reason: 'Self-service password change (ICH E6(R3) C.4.3)',
                user: req.user, ipAddress: req.ip,
            });

            await tx.delete(session).where(eq(session.userId, req.user.id));
            await tx.insert(session).values({ id: crypto.randomUUID(), userId: req.user.id,
                token: tokenDigest(replacementToken), expiresAt: req.sessionExpiresAt });
            await tx.delete(verification).where(eq(verification.identifier, 'mfa:' + req.user.id));
        });
        setSessionCookie(res, replacementToken);
        res.json({ ok: true, message: 'Password changed successfully' });
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// GET /api/security/locked-accounts — list locked accounts (admin only)
router.get('/locked-accounts', requireRole('admin'), async (req, res) => {
    try {
        const now = new Date();
        // Org-scoped: only locks for users in the caller's organization.
        // account_locks has no org column, so resolve tenancy through the user
        // (by id or email). NULL orgId = platform_owner global → all locks.
        const orgId = req.orgId ?? null;
        const locks = await client`
            SELECT al.id, al.user_id AS "userId", al.email, al.failed_count AS "failedCount",
                   al.locked_at AS "lockedAt", al.auto_unlock_at AS "autoUnlockAt",
                   al.unlocked_at AS "unlockedAt", al.unlock_reason AS "unlockReason"
            FROM account_locks al
            LEFT JOIN "user" u ON (u.id = al.user_id OR lower(u.email) = lower(al.email))
            WHERE al.unlocked_at IS NULL
              AND (${orgId}::int IS NULL OR u.organization_id = ${orgId})
            ORDER BY al.locked_at DESC`;

        // Separate still-locked from auto-unlocked
        const active = locks.filter(l => !l.autoUnlockAt || new Date(l.autoUnlockAt) > now);
        res.json(active);
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// POST /api/security/unlock/:userId — admin manually unlocks a user account
router.post('/unlock/:userId', requireRole('admin'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason }  = req.body;
        if (!reason) return res.status(400).json({ error: 'Unlock reason is required' });

        const [lock] = await db.select().from(accountLocks)
            .where(and(eq(accountLocks.userId, userId), isNull(accountLocks.unlockedAt)));
        if (!lock) return res.status(404).json({ error: 'No active lock found for this user' });

        await db.update(accountLocks)
            .set({ unlockedAt: new Date(), unlockedBy: req.user.id, unlockReason: reason, failedCount: 0, autoUnlockAt: null })
            .where(eq(accountLocks.id, lock.id));

        await writeAudit(db, {
            tableName: 'account_locks', recordId: lock.id, action: 'UPDATE',
            fieldName: 'unlocked_at', newValue: new Date().toISOString(),
            reason: `Admin manual unlock: ${reason}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ ok: true });
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// POST /api/security/force-password-reset/:userId — admin forces password reset on next login
router.post('/force-password-reset/:userId', requireRole('admin'), async (req, res) => {
    try {
        const { userId } = req.params;

        await db.insert(passwordMeta)
            .values({ userId, lastChangedAt: new Date(0), mustChange: true })
            .onConflictDoUpdate({
                target: passwordMeta.userId,
                set: { mustChange: true },
            });

        await writeAudit(db, {
            tableName: 'password_meta', recordId: userId, action: 'UPDATE',
            fieldName: 'must_change', newValue: 'true',
            reason: 'Admin-initiated forced password reset',
            user: req.user, ipAddress: req.ip,
        });

        res.json({ ok: true });
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// GET /api/security/users — all users with lock/expiry status (admin only)
router.get('/users', requireRole('admin'), async (req, res) => {
    try {
        const now = new Date();
        const [users, locks, metas] = await Promise.all([
            // Org-scoped: only the caller's organization's users.
            db.select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })
              .from(user).where(orgCondition(req, user.organizationId)),
            db.select().from(accountLocks).where(isNull(accountLocks.unlockedAt)),
            db.select().from(passwordMeta),
        ]);

        const lockMap = new Map(locks.map(l => [l.userId, l]));
        const metaMap = new Map(metas.map(m => [m.userId, m]));

        const enriched = users.map(u => {
            const lock = lockMap.get(u.id);
            const meta = metaMap.get(u.id);
            const expiry = checkPasswordExpiry(meta?.lastChangedAt ?? null);
            const isLocked = lock && (!lock.autoUnlockAt || new Date(lock.autoUnlockAt) > now);

            return {
                ...u,
                isLocked,
                failedAttempts:  lock?.failedCount  ?? 0,
                lockedAt:        lock?.lockedAt      ?? null,
                autoUnlockAt:    lock?.autoUnlockAt  ?? null,
                passwordExpired: expiry.expired,
                passwordDaysLeft: expiry.daysLeft,
                passwordWarn:    expiry.warningSoon,
                mustChangePassword: meta?.mustChange ?? false,
                lastPasswordChange: meta?.lastChangedAt ?? null,
            };
        });

        res.json(enriched);
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

// DELETE /api/security/users/:userId — REMOVED. It deleted active users
// directly, bypassing the deactivate-first control and the related-row cleanup
// that DELETE /api/users/:id performs. Use that route instead.

// GET /api/security/login-activity?email= — recent login attempts (admin only)
router.get('/login-activity', requireRole('admin'), async (req, res) => {
    try {
        const { email } = req.query;
        // Login activity may only be queried for a user in the caller's org.
        // Require an explicit email and verify it belongs to the org, otherwise
        // this endpoint would expose every tenant's login history.
        if (!email) return res.status(400).json({ error: 'email query parameter is required' });
        const [target] = await db.select({ organizationId: user.organizationId }).from(user)
            .where(eq(user.email, email.toLowerCase()));
        if (!target || !sameOrg(req, target.organizationId)) {
            return res.json([]);
        }
        const rows = await db.select().from(loginAttempts)
            .where(eq(loginAttempts.email, email.toLowerCase()))
            .orderBy(desc(loginAttempts.attemptedAt))
            .limit(100);
        res.json(rows);
    } catch (err) {
        res.status([400, 401].includes(err.status) ? err.status : 500).json({ error: err.message });
    }
});

export default router;
````

## `src/backend/routes/subjects.js`

````javascript
import { Router } from 'express';
import { eq, ilike, and, count, sql } from 'drizzle-orm';
import { db, client } from '../db/connection.js';
import { subjects, sites, visits, ieAssessments, crfDataEntries, queries, subjectRandomization, screeningLog, studies } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { licenseGuardCreate } from '../lib/licenseguard.js';
import { isUniqueViolation } from '../lib/dberrors.js';
import { writeAudit } from '../lib/audit.js';
import { siteCondition, subjectInSiteScope } from '../lib/sitescope.js';
import { effectiveOrgId } from '../lib/tenantscope.js';
import { checkLimit } from '../lib/plans.js';
import { plannedDateFor } from '../lib/visitschedule.js';

const router = Router();

// GET /api/subjects — list with optional ?status=&search=
router.get('/', async (req, res) => {
    try {
        const { status, search } = req.query;
        const conditions = [eq(subjects.studyId, req.studyId)];
        if (status) conditions.push(eq(subjects.status, status));
        if (search) conditions.push(ilike(subjects.subjectCode, `%${search}%`));
        // Site isolation: PI/investigator/CRC only see their assigned sites'
        // subjects (user_sites per study + legacy user.site_id).
        const siteCond = siteCondition(req);
        if (siteCond) conditions.push(siteCond);

        const rows = await db
            .select({
                id:             subjects.id,
                subjectCode:    subjects.subjectCode,
                initials:       subjects.initials,
                sex:            subjects.sex,
                genderIdentity: subjects.genderIdentity,
                dateOfBirth:    subjects.dateOfBirth,
                status:         subjects.status,
                enrolledAt:     subjects.enrolledAt,
                siteCode:       sites.code,
                siteName:       sites.name,
            })
            .from(subjects)
            .leftJoin(sites, eq(subjects.siteId, sites.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(subjects.enrolledAt);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/subjects/status-overview — PI/admin/CRA aggregate view: entries, signatures, queries, randomization per subject
router.get('/status-overview', requireRole('pi', 'admin', 'cra', 'data_manager'), async (req, res) => {
    try {
        const studySubjects = await db
            .select({
                id:          subjects.id,
                subjectCode: subjects.subjectCode,
                initials:    subjects.initials,
                status:      subjects.status,
                siteCode:    sites.code,
                siteName:    sites.name,
            })
            .from(subjects)
            .leftJoin(sites, eq(subjects.siteId, sites.id))
            .where(and(eq(subjects.studyId, req.studyId), siteCondition(req)))
            .orderBy(subjects.subjectCode);

        if (studySubjects.length === 0) return res.json([]);

        const subjectIds = studySubjects.map(s => s.id);

        // Entry counts grouped by subjectId + status
        const entryCounts = await db
            .select({
                subjectId: crfDataEntries.subjectId,
                status:    crfDataEntries.status,
                cnt:       count(),
            })
            .from(crfDataEntries)
            .where(sql`${crfDataEntries.subjectId} = ANY(${sql.raw(`ARRAY[${subjectIds.join(',')}]`)})`)
            .groupBy(crfDataEntries.subjectId, crfDataEntries.status);

        // Count signed entries per subject (join back to crfDataEntries)
        const signedPerSubject = await db
            .select({
                subjectId: crfDataEntries.subjectId,
                cnt:       count(),
            })
            .from(crfDataEntries)
            .where(sql`${crfDataEntries.subjectId} = ANY(ARRAY[${sql.raw(subjectIds.join(','))}])
                AND ${crfDataEntries.id} IN (SELECT entry_id FROM esignatures)`)
            .groupBy(crfDataEntries.subjectId);

        // Open query counts per subject
        const openQueries = await db
            .select({
                subjectId: queries.subjectId,
                cnt:       count(),
            })
            .from(queries)
            .where(sql`${queries.subjectId} = ANY(ARRAY[${sql.raw(subjectIds.join(','))}])
                AND ${queries.status} = 'Open'`)
            .groupBy(queries.subjectId);

        // Randomization status per subject
        const randRows = await db
            .select({
                subjectId:       subjectRandomization.subjectId,
                treatmentArm:    subjectRandomization.treatmentArm,
                randomizedAt:    subjectRandomization.randomizedAt,
            })
            .from(subjectRandomization)
            .where(sql`${subjectRandomization.subjectId} = ANY(ARRAY[${sql.raw(subjectIds.join(','))}])`);

        // Build lookup maps
        const entryMap = {};
        for (const row of entryCounts) {
            if (!entryMap[row.subjectId]) entryMap[row.subjectId] = {};
            entryMap[row.subjectId][row.status] = parseInt(row.cnt);
        }
        const signedMap = Object.fromEntries(signedPerSubject.map(r => [r.subjectId, parseInt(r.cnt)]));
        const queryMap  = Object.fromEntries(openQueries.map(r => [r.subjectId, parseInt(r.cnt)]));
        const randMap   = Object.fromEntries(randRows.map(r => [r.subjectId, r]));

        const result = studySubjects.map(s => {
            const entries = entryMap[s.id] ?? {};
            const totalEntries = Object.values(entries).reduce((a, b) => a + b, 0);
            const rand = randMap[s.id];
            return {
                id:            s.id,
                subjectCode:   s.subjectCode,
                initials:      s.initials,
                status:        s.status,
                siteCode:      s.siteCode,
                siteName:      s.siteName,
                totalEntries,
                draftCount:    entries['Draft']  ?? 0,
                savedCount:    entries['Saved']  ?? 0,
                signedCount:   signedMap[s.id]   ?? 0,
                lockedCount:   entries['Locked'] ?? 0,
                openQueries:   queryMap[s.id]    ?? 0,
                randomized:    !!rand,
                treatmentArm:  rand?.treatmentArm ?? null,
                randomizedAt:  rand?.randomizedAt ?? null,
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/subjects/:id — detail with visits
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db
            .select({
                id:             subjects.id,
                subjectCode:    subjects.subjectCode,
                siteId:         subjects.siteId,
                siteCode:       sites.code,
                siteName:       sites.name,
                initials:       subjects.initials,
                dateOfBirth:    subjects.dateOfBirth,
                sex:            subjects.sex,
                genderIdentity: subjects.genderIdentity,
                enrolledAt:     subjects.enrolledAt,
                status:         subjects.status,
                withdrawnAt:    subjects.withdrawnAt,
                withdrawReason: subjects.withdrawReason,
                enrolledBy:     subjects.enrolledBy,
            })
            .from(subjects)
            .leftJoin(sites, eq(subjects.siteId, sites.id))
            .where(and(eq(subjects.id, parseInt(req.params.id)), eq(subjects.studyId, req.studyId)));

        if (!row) return res.status(404).json({ error: 'Subject not found' });
        if (Array.isArray(req.siteScope) && !req.siteScope.includes(row.siteId)) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        const visitRows = await db.select().from(visits)
            .where(eq(visits.subjectId, parseInt(req.params.id)))
            .orderBy(visits.visitOrder, visits.createdAt);

        res.json({ ...row, visits: visitRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/subjects — enroll new subject (investigator, pi, admin, crc)
router.post('/', licenseGuardCreate, requireRole('investigator', 'pi', 'admin', 'crc'), async (req, res) => {
    try {
        const { subjectCode, siteId, initials, dateOfBirth, sex, genderIdentity, enrolledAt } = req.body;
        if (!subjectCode) return res.status(400).json({ error: 'subjectCode is required' });

        // Plan limit: number of enrolled subjects per organization.
        const limit = await checkLimit(effectiveOrgId(req), 'subjects');
        if (!limit.ok) {
            return res.status(402).json({
                error: `Plan limit reached: ${limit.current}/${limit.limit} subjects. Upgrade the plan to enroll more.`,
                limit: limit.limit, current: limit.current,
            });
        }

        // Site-bound staff may only enroll subjects at their own site(s)
        if (Array.isArray(req.siteScope) && !req.siteScope.includes(siteId ? parseInt(siteId) : null)) {
            return res.status(403).json({ error: 'You can only enroll subjects at your assigned site' });
        }

        const [created] = await db.insert(subjects).values({
            studyId:     req.studyId,
            subjectCode,
            siteId:      siteId ?? null,
            initials:       initials ?? null,
            dateOfBirth:    dateOfBirth ?? null,
            sex:            sex ?? null,
            genderIdentity: genderIdentity ?? null,
            enrolledAt:     enrolledAt ? new Date(enrolledAt) : new Date(),
            enrolledBy:  req.user.id,
        }).returning();

        await writeAudit(db, {
            tableName: 'subjects', recordId: created.id, action: 'INSERT',
            newValue: subjectCode, reason: 'Subject enrolled',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        if (isUniqueViolation(err)) {
            return res.status(409).json({ error: 'Subject number already exists in this study. Please use a different subject number.' });
        }
        console.error('Enroll subject failed:', err);
        res.status(500).json({ error: 'Could not enroll the subject due to a server error. Please try again or contact your administrator.' });
    }
});

// PATCH /api/subjects/:id/status — withdraw / complete (investigator, admin)
router.patch('/:id/status', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const { status, reason } = req.body;
        const allowedTransitions = ['Completed', 'Withdrawn', 'Screen Failed'];
        if (!allowedTransitions.includes(status)) {
            return res.status(400).json({ error: 'Invalid status transition' });
        }
        if (status === 'Withdrawn' && !reason) {
            return res.status(400).json({ error: 'Withdrawal reason is required' });
        }

        if (!(await subjectInSiteScope(req, req.params.id))) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        const updates = { status, updatedAt: new Date() };
        if (status === 'Withdrawn') {
            updates.withdrawnAt = new Date();
            updates.withdrawReason = reason;
        }

        const [updated] = await db.update(subjects)
            .set(updates)
            .where(and(eq(subjects.id, parseInt(req.params.id)), eq(subjects.studyId, req.studyId)))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Subject not found' });

        await writeAudit(db, {
            tableName: 'subjects', recordId: updated.id, action: 'UPDATE',
            fieldName: 'status', newValue: status, reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate the protocol visit schedule for a subject who passed screening,
// from the study's visit_schedule template. Planned dates are derived from the
// subject's enrollment date (Day 1 = enrollment; there is no Day 0).
// Skipped entirely when the study has no template, or when the subject already
// has visits (idempotent). Best-effort: never blocks the assessment.
async function generateProtocolVisits(subject, user, ip) {
    try {
        const [study] = await db.select({ visitSchedule: studies.visitSchedule })
            .from(studies).where(eq(studies.id, subject.studyId));
        const template = study?.visitSchedule;
        if (!Array.isArray(template) || template.length === 0) return;

        const [already] = await db.select({ id: visits.id })
            .from(visits).where(eq(visits.subjectId, subject.id)).limit(1);
        if (already) return;

        const enrolledOn = subject.enrolledAt ?? new Date();
        const rows = template.map(v => ({
            subjectId:   subject.id,
            visitName:   v.name,
            visitOrder:  v.order ?? null,
            visitType:   'Scheduled',
            plannedDate: plannedDateFor(enrolledOn, v.studyDay),
            windowDays:  v.windowDays ?? 0,
            studyDay:    v.studyDay,
            status:      'Scheduled',
            createdByName: user.name,
        }));
        if (rows.length === 0) return;

        await db.insert(visits).values(rows);
        await writeAudit(db, {
            tableName: 'visits', recordId: subject.id, action: 'INSERT',
            newValue: JSON.stringify({ generated: rows.length, subjectCode: subject.subjectCode }),
            reason: 'Auto-generated protocol visit schedule on enrollment',
            user, ipAddress: ip,
        });
    } catch (err) {
        console.warn('Protocol visit generation skipped (non-fatal):', err.message?.slice(0, 120));
    }
}

// Build a human-readable fail reason from an I/E criteria result set.
function summarizeFailedCriteria(criteria) {
    const reasons = [];
    for (const c of Array.isArray(criteria) ? criteria : []) {
        if (c.type === 'inclusion' && !c.met) reasons.push(`Inclusion not met: ${c.label}`);
        if (c.type === 'exclusion' &&  c.met) reasons.push(`Exclusion applies: ${c.label}`);
    }
    return reasons.join('; ') || 'Did not meet eligibility criteria';
}

// Mirror an enrollment screening decision into the GCP screening log
// (ICH E6(R3) §8.3.20). Idempotent per subject (keyed on enrolled_subject_id)
// so re-assessing updates the same row instead of duplicating it. Best-effort:
// a failure here must never block the enrollment/assessment itself.
async function upsertScreeningLog(subject, passed, criteriaJson, user, ip) {
    const disposition = passed ? 'Enrolled' : 'Screen Failed';
    const failReason  = passed ? null : summarizeFailedCriteria(criteriaJson);
    try {
        const [existing] = await db.select().from(screeningLog)
            .where(eq(screeningLog.enrolledSubjectId, subject.id));
        if (existing) {
            await db.update(screeningLog)
                .set({ disposition, failReason, updatedAt: new Date() })
                .where(eq(screeningLog.id, existing.id));
            return;
        }
        const [row] = await db.insert(screeningLog).values({
            studyId:           subject.studyId,
            siteId:            subject.siteId,
            screeningDate:     new Date().toISOString().slice(0, 10),
            screeningCode:     subject.subjectCode,
            subjectInitials:   subject.initials ?? null,
            disposition,
            failReason,
            enrolledSubjectId: subject.id,
            createdBy:         user.id,
            createdByName:     user.name,
        }).returning();
        await writeAudit(db, {
            tableName: 'screening_log', recordId: row.id, action: 'INSERT',
            newValue: JSON.stringify({ screeningCode: subject.subjectCode, disposition }),
            reason: 'Auto-logged from subject enrollment I/E assessment',
            user, ipAddress: ip,
        });
    } catch (err) {
        console.warn('Screening-log auto-write skipped (non-fatal):', err.message?.slice(0, 120));
    }
}

// POST /api/subjects/:id/ie-assessment — record I/E criteria assessment
router.post('/:id/ie-assessment', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const subjectId = parseInt(req.params.id);
        const { criteriaJson, passed } = req.body;
        if (!Array.isArray(criteriaJson) || typeof passed !== 'boolean') {
            return res.status(400).json({ error: 'Complete the inclusion/exclusion assessment and select its outcome before saving.' });
        }

        const [subject] = await db.select().from(subjects)
            .where(and(eq(subjects.id, subjectId), eq(subjects.studyId, req.studyId)));
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        if (Array.isArray(req.siteScope) && !req.siteScope.includes(subject.siteId)) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        const [assessment] = await db.insert(ieAssessments).values({
            subjectId,
            criteriaJson,
            passed,
            assessedBy:     req.user.id,
            assessedByName: req.user.name,
        }).returning();

        if (!passed) {
            await db.update(subjects)
                .set({ status: 'Screen Failed', updatedAt: new Date() })
                .where(eq(subjects.id, subjectId));

            await writeAudit(db, {
                tableName: 'subjects', recordId: subjectId, action: 'UPDATE',
                fieldName: 'status', oldValue: subject.status, newValue: 'Screen Failed',
                reason: 'Failed Inclusion/Exclusion criteria assessment',
                user: req.user, ipAddress: req.ip,
            });
        }

        // Keep the GCP screening log in sync with this screening decision.
        await upsertScreeningLog(subject, passed, criteriaJson, req.user, req.ip);

        // Subjects who pass screening get the protocol's visit schedule.
        if (passed) await generateProtocolVisits(subject, req.user, req.ip);

        res.status(201).json(assessment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/subjects/:id/ie-assessment — fetch I/E assessment history
router.get('/:id/ie-assessment', async (req, res) => {
    try {
        const rows = await db.select().from(ieAssessments)
            .where(eq(ieAssessments.subjectId, parseInt(req.params.id)))
            .orderBy(ieAssessments.assessedAt);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/subjects/:id/lock-status — per-visit entry lock breakdown
router.get('/:id/lock-status', async (req, res) => {
    try {
        const subjectId = parseInt(req.params.id);

        const [subject] = await db.select({ id: subjects.id, studyId: subjects.studyId })
            .from(subjects).where(eq(subjects.id, subjectId));
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        if (subject.studyId !== req.studyId) return res.status(403).json({ error: 'Forbidden' });

        // Counts per visit — COUNT(cde.id) avoids inflating total by 1 for visits with no entries
        const rows = await client`
            SELECT
                v.id                                                           AS visit_id,
                v.visit_name                                                   AS visit_name,
                v.visit_order                                                  AS visit_order,
                COUNT(cde.id)                                                  AS total,
                COUNT(cde.id) FILTER (WHERE cde.status = 'Locked')            AS locked,
                COUNT(cde.id) FILTER (WHERE cde.status IS DISTINCT FROM 'Locked') AS unlocked
            FROM visits v
            LEFT JOIN crf_data_entries cde ON cde.visit_id = v.id
            WHERE v.subject_id = ${subjectId}
            GROUP BY v.id, v.visit_name, v.visit_order
            ORDER BY v.visit_order
        `;

        // Recent lock actions for this subject
        const history = await client`
            SELECT * FROM subject_data_locks
            WHERE subject_id = ${subjectId}
            ORDER BY performed_at DESC
            LIMIT 20
        `;

        res.json({ visits: rows, history });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/subjects/:id/lock — bulk lock all lockable entries (optionally scoped to a visit)
router.post('/:id/lock', requireRole('pi', 'admin', 'cra', 'data_manager'), async (req, res) => {
    try {
        const subjectId = parseInt(req.params.id);
        const { reason, visitId } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required' });

        const [subject] = await db.select({ id: subjects.id, studyId: subjects.studyId })
            .from(subjects).where(eq(subjects.id, subjectId));
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        if (subject.studyId !== req.studyId) return res.status(403).json({ error: 'Forbidden' });

        const conditions = [
            eq(crfDataEntries.subjectId, subjectId),
            sql`${crfDataEntries.status} IN ('Saved', 'Draft')`,
        ];
        if (visitId) conditions.push(eq(crfDataEntries.visitId, parseInt(visitId)));

        const updated = await db.update(crfDataEntries)
            .set({ status: 'Locked', lockedAt: new Date(), lockedBy: req.user.id, lockReason: reason })
            .where(and(...conditions))
            .returning({ id: crfDataEntries.id });

        await client`
            INSERT INTO subject_data_locks
                (study_id, subject_id, visit_id, action, reason, entries_affected, performed_by, performed_by_name)
            VALUES
                (${req.studyId}, ${subjectId}, ${visitId ?? null}, 'Lock', ${reason}, ${updated.length},
                 ${req.user.id}, ${req.user.name})
        `;

        await writeAudit(db, {
            tableName: 'subjects', recordId: subjectId, action: 'LOCK',
            newValue: `Locked ${updated.length} entries${visitId ? ` for visit ${visitId}` : ''}`,
            reason, user: req.user, ipAddress: req.ip,
        });

        res.json({ locked: updated.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/subjects/:id/unlock — admin only bulk unlock
router.post('/:id/unlock', requireRole('admin'), async (req, res) => {
    try {
        const subjectId = parseInt(req.params.id);
        const { reason, visitId } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required' });

        const [subject] = await db.select({ id: subjects.id, studyId: subjects.studyId })
            .from(subjects).where(eq(subjects.id, subjectId));
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        if (subject.studyId !== req.studyId) return res.status(403).json({ error: 'Forbidden' });

        const conditions = [
            eq(crfDataEntries.subjectId, subjectId),
            eq(crfDataEntries.status, 'Locked'),
        ];
        if (visitId) conditions.push(eq(crfDataEntries.visitId, parseInt(visitId)));

        const updated = await db.update(crfDataEntries)
            .set({ status: 'Saved', unlockedAt: new Date(), unlockedBy: req.user.id, unlockReason: reason })
            .where(and(...conditions))
            .returning({ id: crfDataEntries.id });

        await client`
            INSERT INTO subject_data_locks
                (study_id, subject_id, visit_id, action, reason, entries_affected, performed_by, performed_by_name)
            VALUES
                (${req.studyId}, ${subjectId}, ${visitId ?? null}, 'Unlock', ${reason}, ${updated.length},
                 ${req.user.id}, ${req.user.name})
        `;

        await writeAudit(db, {
            tableName: 'subjects', recordId: subjectId, action: 'UNLOCK',
            newValue: `Unlocked ${updated.length} entries${visitId ? ` for visit ${visitId}` : ''}`,
            reason, user: req.user, ipAddress: req.ip,
        });

        res.json({ unlocked: updated.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
````

## `src/backend/server.js`

````javascript
import { safeErrorResponses, apiErrorHandler } from './middleware/errors.js';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { trustedOrigins, checkOrigin } from './lib/http-security.js';
import { migrateSecurity } from './lib/security-migration.js';
import { requireAuth } from './middleware/auth.js';
import { client } from './db/connection.js';

import subjectsRouter      from './routes/subjects.js';
import visitsRouter        from './routes/visits.js';
import formsRouter         from './routes/forms.js';
import entriesRouter       from './routes/entries.js';
import importRouter        from './routes/import.js';
import auditRouter         from './routes/audit.js';
import queriesRouter       from './routes/queries.js';
import mfaRouter, { logout } from './routes/mfa.js';
import registerRouter      from './routes/register.js';
import signupRouter        from './routes/signup.js';
import organizationsRouter from './routes/organizations.js';
import billingRouter, { handleBillingWebhook } from './routes/billing.js';
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
// ICH E6(R3) Gap Closure
import screeningRouter       from './routes/screening.js';
import ipDispensingRouter    from './routes/ipdispensing.js';
import essentialDocsRouter   from './routes/essentialdocs.js';
import agreementsRouter      from './routes/agreements.js';
import monitoringPlanRouter  from './routes/monitoringplan.js';
import reportRouter          from './routes/report.js';
import accessReviewRouter    from './routes/accessreview.js';
import licenseRouter        from './routes/license.js';
import { requireStudy }      from './middleware/study.js';
import { rateLimitAuth, rateLimitTenant } from './middleware/ratelimit.js';

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
        // Gender identity column (FDA 2023 / ICH E3). Migration 0002 adds this,
        // but the drizzle journal only registers 0000/0001, so migrate() skips it
        // on a fresh install — add it idempotently here so every DB (fresh or
        // existing) has the column the subjects query selects.
        `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS gender_identity varchar(50)`,
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
            delegation_start TEXT NOT NULL,          -- "YYYY-MM-DD"; see note in server migrations
            delegation_end   TEXT,
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
            training_date    TEXT NOT NULL,          -- "YYYY-MM-DD"
            expiry_date      TEXT,
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
        // Feature: user-chosen display name (shown as greeting in header; admin can reset)
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS display_name TEXT`,
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

        // ICH GCP E6(R3) §4.8 — consent record fields the initial schema omitted.
        // consent_time (§4.8.8): the date alone cannot evidence that consent
        // preceded a same-day screening procedure.
        // obtained_by (§4.1.5): who ran the consent discussion, as opposed to
        // created_by, which is only whoever keyed the record into the EDC.
        // witness_type (§4.8.9/§4.8.12): impartial witness vs. LAR vs. guardian.
        // assent_* (§4.8.12) and copy_provided (§4.8.11).
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS consent_time     TEXT`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS obtained_by      TEXT REFERENCES "user"(id)`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS obtained_by_name TEXT`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS witness_type     TEXT`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS assent_obtained  BOOLEAN NOT NULL DEFAULT FALSE`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS assent_date      TEXT`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS copy_provided    BOOLEAN NOT NULL DEFAULT FALSE`,

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

        // ICH E6(R3) — audit_action enum: add EXPORT, SIGN, AGREE values
        `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='EXPORT' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='audit_action'))
            THEN ALTER TYPE audit_action ADD VALUE 'EXPORT'; END IF; END $$`,
        `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='SIGN' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='audit_action'))
            THEN ALTER TYPE audit_action ADD VALUE 'SIGN'; END IF; END $$`,
        `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='AGREE' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='audit_action'))
            THEN ALTER TYPE audit_action ADD VALUE 'AGREE'; END IF; END $$`,

        // ICH E6(R3) — audit trail hash for tamper detection
        `ALTER TABLE audit_trails ADD COLUMN IF NOT EXISTS audit_hash TEXT`,
        `ALTER TABLE audit_trails ALTER COLUMN created_at SET DEFAULT NOW()`,

        // ICH E6(R3) §8.3.20 — Screening Log
        `CREATE TABLE IF NOT EXISTS screening_log (
            id                   INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id             INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            site_id              INTEGER REFERENCES sites(id),
            screening_date       TEXT NOT NULL,
            screening_code       VARCHAR(30) NOT NULL,
            subject_initials     VARCHAR(10),
            disposition          TEXT NOT NULL DEFAULT 'Pending',
            fail_reason          TEXT,
            eligibility_criteria TEXT,
            notes                TEXT,
            enrolled_subject_id  INTEGER REFERENCES subjects(id),
            created_by           TEXT REFERENCES "user"(id),
            created_by_name      TEXT,
            created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_screening_study ON screening_log (study_id)`,

        // ICH E6(R3) §8.3.19 — IP Accountability / Drug Dispensing
        `CREATE TABLE IF NOT EXISTS ip_accountability (
            id                 INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id           INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            site_id            INTEGER REFERENCES sites(id),
            subject_id         INTEGER REFERENCES subjects(id),
            record_type        TEXT NOT NULL,
            transaction_date   TEXT NOT NULL,
            drug_name          TEXT NOT NULL,
            batch_no           TEXT,
            quantity_in        TEXT,
            quantity_out       TEXT,
            unit               TEXT,
            expiry_date        TEXT,
            supplier_ref       TEXT,
            returned_quantity  TEXT,
            destroyed_quantity TEXT,
            destruction_ref    TEXT,
            balance            TEXT,
            notes              TEXT,
            created_by         TEXT REFERENCES "user"(id),
            created_by_name    TEXT,
            created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ip_study ON ip_accountability (study_id)`,

        // ICH E6(R3) §8 — Essential Documents Checklist
        `CREATE TABLE IF NOT EXISTS essential_documents (
            id               INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id         INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            site_id          INTEGER REFERENCES sites(id),
            section          TEXT NOT NULL,
            document_type    TEXT NOT NULL,
            document_ref     TEXT,
            version          TEXT,
            document_date    TEXT,
            expiry_date      TEXT,
            status           TEXT NOT NULL DEFAULT 'Pending',
            notes            TEXT,
            uploaded_by      TEXT REFERENCES "user"(id),
            uploaded_by_name TEXT,
            uploaded_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_esdoc_study ON essential_documents (study_id)`,

        // ICH E6(R3) C.4.1, §5.5.2 — User SOP/Training Agreements
        `CREATE TABLE IF NOT EXISTS user_agreements (
            id                INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            user_id           TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            agreement_type    TEXT NOT NULL DEFAULT 'SOP',
            agreement_version TEXT NOT NULL,
            agreed_at         TIMESTAMP NOT NULL DEFAULT NOW(),
            ip_address        TEXT,
            user_agent        TEXT
        )`,
        `CREATE INDEX IF NOT EXISTS idx_agreements_user ON user_agreements (user_id)`,

        // ICH E6(R3) §5.18.3 — Risk-Based Monitoring Plan
        `CREATE TABLE IF NOT EXISTS monitoring_plans (
            id                   INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id             INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            version              TEXT NOT NULL DEFAULT '1.0',
            status               TEXT NOT NULL DEFAULT 'Draft',
            risk_level           TEXT,
            scope                TEXT,
            sdv_strategy         TEXT,
            sdv_percentage       INTEGER,
            on_site_frequency    TEXT,
            remote_frequency     TEXT,
            critical_data_fields JSONB DEFAULT '[]',
            risk_factors         JSONB DEFAULT '[]',
            action_thresholds    JSONB DEFAULT '{}',
            approved_by          TEXT REFERENCES "user"(id),
            approved_by_name     TEXT,
            approved_at          TIMESTAMP,
            notes                TEXT,
            created_by           TEXT REFERENCES "user"(id),
            created_by_name      TEXT,
            created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_monplan_study ON monitoring_plans (study_id)`,

        // ICH GCP E6(R3) §5.0.7 — QTL breach CAPA workflow
        `CREATE TABLE IF NOT EXISTS qtl_breach_actions (
            id                INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id          INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            indicator         TEXT NOT NULL,
            indicator_label   TEXT,
            threshold         TEXT NOT NULL,
            actual_value      TEXT NOT NULL,
            breach_date       TIMESTAMP NOT NULL DEFAULT NOW(),
            capa_text         TEXT,
            capa_due_date     TEXT,
            status            TEXT NOT NULL DEFAULT 'Open',
            assigned_to       TEXT REFERENCES "user"(id),
            assigned_to_name  TEXT,
            resolved_at       TIMESTAMP,
            resolved_by       TEXT REFERENCES "user"(id),
            resolved_by_name  TEXT,
            notes             TEXT,
            created_by        TEXT REFERENCES "user"(id),
            created_by_name   TEXT,
            created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_qtl_breach_study ON qtl_breach_actions (study_id)`,

        // ICH GCP E6(R3) C.4.2 — Periodic user access review
        `CREATE TABLE IF NOT EXISTS access_reviews (
            id                 INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id           INTEGER REFERENCES studies(id),
            review_period      TEXT NOT NULL,
            status             TEXT NOT NULL DEFAULT 'In Progress',
            initiated_by       TEXT REFERENCES "user"(id),
            initiated_by_name  TEXT,
            initiated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
            completed_at       TIMESTAMP,
            completed_by       TEXT REFERENCES "user"(id),
            completed_by_name  TEXT,
            certifications     JSONB DEFAULT '[]',
            notes              TEXT,
            created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_access_review_study ON access_reviews (study_id)`,
        `CREATE TABLE IF NOT EXISTS subject_data_locks (
            id              INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id        INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            visit_id        INTEGER REFERENCES visits(id) ON DELETE SET NULL,
            action          TEXT NOT NULL CHECK (action IN ('Lock', 'Unlock')),
            reason          TEXT NOT NULL,
            entries_affected INTEGER NOT NULL DEFAULT 0,
            performed_by    TEXT REFERENCES "user"(id),
            performed_by_name TEXT,
            performed_at    TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_sdl_subject ON subject_data_locks (subject_id)`,
        // Add tmf_artifact_id column to essential_documents for DIA TMF Reference Model
        `ALTER TABLE essential_documents ADD COLUMN IF NOT EXISTS tmf_artifact_id TEXT`,
        `ALTER TABLE essential_documents ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT false`,
        // Migrate legacy section names to ICH GCP E6(R3) §8 correct numbering
        `UPDATE essential_documents SET section = '8.1 — Pre-trial'    WHERE section IN ('§8.2 — Before Trial', '8.1 Pre-trial', '8.1 — Before Trial')`,
        `UPDATE essential_documents SET section = '8.2 — Trial Conduct' WHERE section IN ('§8.3 — During Trial', '8.2 Trial Conduct', '8.2 — During Trial')`,
        `UPDATE essential_documents SET section = '8.3 — Post-trial'   WHERE section IN ('§8.4 — After Trial Completion', '8.3 Post-trial', '8.3 — After Completion')`,
        // ICH GCP E6(R3) §4.5.3 — visit window compliance: link auto-generated deviations to their visit
        `ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS visit_id INTEGER REFERENCES visits(id) ON DELETE SET NULL`,
        `ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false`,
        `CREATE INDEX IF NOT EXISTS idx_devs_visit ON protocol_deviations (visit_id)`,

        // ── SaaS Multi-Tenancy (Phase 1) — organizations + backfill ──────────
        // Top-level tenant boundary. Existing single-org data is folded into a
        // "default" organization so no data is lost; new columns stay nullable
        // (platform_owner rows are intentionally NULL — cross-tenant operator).
        `CREATE TABLE IF NOT EXISTS organizations (
            id         INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            name       TEXT NOT NULL,
            slug       TEXT NOT NULL UNIQUE,
            status     TEXT NOT NULL DEFAULT 'Active',
            plan       TEXT DEFAULT 'standard',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Seed the default tenant that absorbs all pre-existing data (idempotent).
        `INSERT INTO organizations (name, slug) VALUES ('Default Organization', 'default') ON CONFLICT (slug) DO NOTHING`,
        // Tenant column on the three tenant-root tables.
        `ALTER TABLE "user"  ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `ALTER TABLE studies ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `ALTER TABLE sites   ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        // Per-protocol I/E criteria (NULL = use the app default set).
        `ALTER TABLE studies ADD COLUMN IF NOT EXISTS ie_criteria JSONB`,
        // Per-protocol visit schedule template (NULL = no template, manual visits only).
        `ALTER TABLE studies ADD COLUMN IF NOT EXISTS visit_schedule JSONB`,
        // Backfill existing rows into the default org (only untenanted rows).
        `UPDATE "user"  SET organization_id = (SELECT id FROM organizations WHERE slug='default') WHERE organization_id IS NULL AND role <> 'platform_owner'`,
        `UPDATE studies SET organization_id = (SELECT id FROM organizations WHERE slug='default') WHERE organization_id IS NULL`,
        `UPDATE sites   SET organization_id = (SELECT id FROM organizations WHERE slug='default') WHERE organization_id IS NULL`,
        // Uniqueness becomes per-organization: drop the old global UNIQUE and
        // add a composite unique index so two tenants may reuse protocol/site codes.
        `DO $$
            DECLARE r record;
            BEGIN
                FOR r IN SELECT conname FROM pg_constraint
                    WHERE conrelid = 'studies'::regclass AND contype = 'u'
                      AND pg_get_constraintdef(oid) = 'UNIQUE (protocol_no)'
                LOOP EXECUTE format('ALTER TABLE studies DROP CONSTRAINT %I', r.conname); END LOOP;
            END $$`,
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_studies_org_protocol ON studies (organization_id, protocol_no)`,
        `DO $$
            DECLARE r record;
            BEGIN
                FOR r IN SELECT conname FROM pg_constraint
                    WHERE conrelid = 'sites'::regclass AND contype = 'u'
                      AND pg_get_constraintdef(oid) = 'UNIQUE (code)'
                LOOP EXECUTE format('ALTER TABLE sites DROP CONSTRAINT %I', r.conname); END LOOP;
            END $$`,
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_sites_org_code ON sites (organization_id, code)`,
        // Indexes for tenant-filtered lookups.
        `CREATE INDEX IF NOT EXISTS idx_user_org    ON "user" (organization_id)`,
        `CREATE INDEX IF NOT EXISTS idx_studies_org ON studies (organization_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sites_org   ON sites (organization_id)`,
        // Audit trail tenant column — so one tenant cannot read another's audit
        // rows. Backfill via the acting user, then fold any orphans into default.
        `ALTER TABLE audit_trails ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `UPDATE audit_trails a SET organization_id = u.organization_id
            FROM "user" u WHERE a.user_id = u.id AND a.organization_id IS NULL`,
        `UPDATE audit_trails SET organization_id = (SELECT id FROM organizations WHERE slug='default')
            WHERE organization_id IS NULL`,
        `CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_trails (organization_id)`,
        // CRF form template library becomes per-tenant (custom forms must not
        // leak between tenants). Existing templates fold into the default org.
        `ALTER TABLE crf_forms ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `UPDATE crf_forms SET organization_id = (SELECT id FROM organizations WHERE slug='default') WHERE organization_id IS NULL`,
        `CREATE INDEX IF NOT EXISTS idx_crf_forms_org ON crf_forms (organization_id)`,
        // Subscription state (Phase 4) — plan already exists; add billing status.
        `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'Active'`,
        `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP`,
        // Billing processor linkage (Stripe customer/subscription ids).
        `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_customer_id TEXT`,
        `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_subscription_id TEXT`,
        // Feature: Investigator Signed replaces the free-text visit notes field
        // with a lockable sign-off checkbox — once signed, the visit cannot be
        // edited until an admin unsigns it (mirrors crf_data_entries lock).
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_signed BOOLEAN NOT NULL DEFAULT false`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_signed_at TIMESTAMP`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_signed_by TEXT REFERENCES "user"(id)`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_signed_by_name TEXT`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_unsigned_at TIMESTAMP`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_unsigned_by TEXT REFERENCES "user"(id)`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_unsigned_by_name TEXT`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_unsign_reason TEXT`,
        `ALTER TABLE visits DROP COLUMN IF EXISTS notes`,

        // ── Delegation & training dates: TEXT "YYYY-MM-DD" ──────────────────
        // These columns were defined twice with different types: as text by the
        // drizzle-kit migration (0001, which matches schemas/schema.js) and as
        // TIMESTAMP by the CREATE TABLE above. Both are CREATE TABLE IF NOT
        // EXISTS, so whichever ran first won and the column type depended on
        // install order.
        //
        // Text is the correct one. consentrules.day() compares these by slicing
        // the first ten characters, so a timestamp read back as a Date yields
        // "Sat Aug 01" — and "Sat Aug 01" <= "2026-08-15" is false. Every
        // delegation-window check would silently deny everyone, and that check
        // decides who may take informed consent (ICH E6(R3) §4.1.5).
        //
        // Converts in place, keeping the calendar day. Nothing is dropped.
        `DO $$
         DECLARE
             r RECORD;
         BEGIN
             FOR r IN
                 SELECT table_name, column_name
                 FROM information_schema.columns
                 WHERE table_schema = current_schema()
                   AND data_type LIKE 'timestamp%'
                   AND (table_name, column_name) IN (
                       ('delegation_log',   'delegation_start'),
                       ('delegation_log',   'delegation_end'),
                       ('training_records', 'training_date'),
                       ('training_records', 'expiry_date')
                   )
             LOOP
                 EXECUTE format(
                     'ALTER TABLE %I ALTER COLUMN %I TYPE TEXT USING to_char(%I, ''YYYY-MM-DD'')',
                     r.table_name, r.column_name, r.column_name
                 );
                 RAISE WARNING 'converted %.% from timestamp to text (YYYY-MM-DD)', r.table_name, r.column_name;
             END LOOP;
         END $$`,

        // ── Training records are tenant data ────────────────────────────────
        // The table had neither an organization_id nor any filter on read, so
        // one tenant's admin could list another tenant's staff qualifications.
        // Backfilled from the person the record belongs to.
        `ALTER TABLE training_records ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `ALTER TABLE training_records ADD COLUMN IF NOT EXISTS study_id        INTEGER REFERENCES studies(id)`,
        `UPDATE training_records t
            SET organization_id = u.organization_id
            FROM "user" u
            WHERE u.id = t.user_id AND t.organization_id IS NULL`,
        `CREATE INDEX IF NOT EXISTS idx_training_org ON training_records (organization_id)`,
        `CREATE INDEX IF NOT EXISTS idx_training_study ON training_records (study_id)`,

        // One CRF entry per (subject, visit, form). Both the import route and
        // the data-entry route do "select, then insert if absent" with no lock,
        // and a SELECT ... FOR UPDATE takes no lock when the row does not exist
        // yet — so two concurrent saves both found nothing and both inserted.
        // The duplicate is invisible in the UI (the reader takes the first
        // match) but both are emitted to the ODM export, which is worse than
        // either outcome alone. Only the database can settle this.
        //
        // Creating the index outright would fail on any deployment that already
        // has duplicates, and the migration runner would swallow that as a
        // one-line warning. Deduplicating automatically is not an option
        // either: esignatures cascade-delete with the entry, so a well-meant
        // cleanup would destroy Part 11 signature records. So: create it when
        // the data is clean, and say plainly what to do when it is not.
        `DO $$
         DECLARE dupes integer;
         BEGIN
             -- Nothing to do once the index exists, and this runs on every
             -- boot: without the guard it is a full scan of crf_data_entries
             -- at every restart, forever. Checked against current_schema()
             -- rather than to_regclass, which resolves through search_path and
             -- would answer "absent" for an index sitting in a schema that is
             -- simply not on the path — then try to create a second one.
             IF EXISTS (
                 SELECT 1 FROM pg_indexes
                 WHERE indexname = 'idx_crf_entry_unique'
                   AND schemaname = current_schema()
             ) THEN
                 RETURN;
             END IF;
             SELECT count(*) INTO dupes FROM (
                 SELECT 1 FROM crf_data_entries
                 GROUP BY subject_id, visit_id, form_id HAVING count(*) > 1
             ) d;
             IF dupes = 0 THEN
                 CREATE UNIQUE INDEX IF NOT EXISTS idx_crf_entry_unique
                     ON crf_data_entries (subject_id, visit_id, form_id);
             ELSE
                 RAISE WARNING 'crf_data_entries has % duplicate (subject, visit, form) group(s); idx_crf_entry_unique was NOT created. Reconcile them, then restart. To list them: SELECT subject_id, visit_id, form_id, count(*), array_agg(id) FROM crf_data_entries GROUP BY 1,2,3 HAVING count(*) > 1;', dupes;
             END IF;
         END $$`,
    ];
    for (const stmt of stmts) {
        try {
            await client.unsafe(stmt);
        } catch (err) {
            // Log but continue — idempotent statements mean retries are safe
            console.warn('Migration stmt warning (non-fatal):', err.message?.slice(0, 120));
        }
    }
}
const app = express();
app.use(safeErrorResponses);

// Configure only the actual proxy CIDRs. Direct deployments do not trust forwarded IPs.
app.set('trust proxy', process.env.TRUST_PROXY_CIDRS?.split(',').map(s => s.trim()).filter(Boolean) || false);
app.disable('x-powered-by');

// Security headers (helmet-equivalent, no extra dependency).
// CSP notes: all JS/CSS is self-hosted (Tailwind/Lucide vendored under
// src/frontend/vendor); 'unsafe-inline' is required by the SPA's inline
// onclick handlers and Tailwind Play's injected styles.
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +   // unsafe-eval: Tailwind Play JIT
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "font-src 'self' data:; " +
        "connect-src 'self'; " +
        "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// Exact deployment origins only; do not normalize/overwrite the caller's Origin.
app.use(cors({ origin: (origin, cb) => cb(null, !origin || trustedOrigins().has(origin)), credentials: true }));
app.use('/api', checkOrigin);
let securityReady = false;
app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    if (!securityReady) return res.status(503).json({ error: 'Service initializing' });
    next();
});
// Compatibility endpoints use the same custom session protocol as /api/mfa.
app.post('/api/auth/sign-out', logout);
app.get('/api/auth/get-session', requireAuth, (req, res) => res.json({
    user: req.user, session: { expiresAt: req.sessionExpiresAt },
}));
app.all('/api/auth/*', (_req, res) => res.status(403).json({ error: 'Use /api/mfa for authentication.' }));

// Billing webhook needs the RAW body for Stripe signature verification — mount
// it before express.json() so the payload isn't parsed/re-serialized.
app.post('/api/billing/webhook', express.raw({ type: '*/*' }), handleBillingWebhook);

// Bulk data import posts a whole site's spreadsheet as JSON (hundreds of wide
// rows), so it needs a larger body limit. Mounted before the global parser; the
// global express.json() below is a no-op once the body is already parsed, so
// every other route keeps the default (small) limit.
app.use('/api/import', express.json({ limit: '25mb' }));

app.use(express.json());

// Auth-required API routes
app.use('/api/mfa',      rateLimitAuth, mfaRouter);
app.use('/api/register', rateLimitAuth, registerRouter);
app.use('/api/signup',   rateLimitAuth, signupRouter);   // public self-service tenant signup (gated by ALLOW_TENANT_SIGNUP)
app.use('/api/sites',      requireAuth, sitesRouter);
app.use('/api/security',   requireAuth, securityRouter);
app.use('/api/studies',    requireAuth, studiesRouter);
app.use('/api/audit',      requireAuth, auditRouter);
app.use('/api/forms',      requireAuth, formsRouter);
app.use('/api/users',         requireAuth, userMgmtRouter);
app.use('/api/organizations', requireAuth, organizationsRouter);   // platform_owner only (enforced in-router)
app.use('/api/billing',       requireAuth, billingRouter);          // config + checkout (webhook mounted above, raw)
app.use('/api/notifications', requireAuth, requireStudy, notificationsRouter);
// Liveness — process is up (cheap, no dependencies).
app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Readiness — includes a DB round-trip. Load balancers should route on this;
// returns 503 when the database is unreachable so unhealthy instances drain.
app.get('/api/ready', async (_req, res) => {
    try {
        await client`SELECT 1`;
        res.json({ status: 'ready', db: 'up' });
    } catch (err) {
        res.status(503).json({ status: 'not-ready', db: 'down', error: err.message });
    }
});

// Study-scoped routes — require both auth and X-Study-ID header
// requireAuth sets req.orgId, which rateLimitTenant keys on, before requireStudy.
const studyAuth = [requireAuth, rateLimitTenant, requireStudy];
app.use('/api/subjects',                  ...studyAuth, subjectsRouter);
app.use('/api/subjects/:subjectId/visits', ...studyAuth, visitsRouter);
app.use('/api/entries',                   ...studyAuth, entriesRouter);
app.use('/api/import',                     ...studyAuth, importRouter);
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
app.use('/api/license',                  requireAuth,  licenseRouter);
// ICH E6(R3) Gap Closure
app.use('/api/screening',                ...studyAuth, screeningRouter);
app.use('/api/ip',                       ...studyAuth, ipDispensingRouter);
app.use('/api/essential-docs',           ...studyAuth, essentialDocsRouter);
app.use('/api/agreements',               requireAuth,  agreementsRouter);
app.use('/api/monitoring-plan',          ...studyAuth, monitoringPlanRouter);
app.use('/api/reports',                  ...studyAuth, reportRouter);
app.use('/api/access-review',            ...studyAuth, accessReviewRouter);

app.use('/api', (_req, res) => res.status(404).json({ error: 'This service could not be found. Refresh the page and try again.' }));
app.use(apiErrorHandler);

// Serve ONLY the frontend assets — never the repo root, which would expose
// source code, docs with test credentials, and the .git directory.
app.use('/src/frontend', express.static(path.join(rootDir, 'src/frontend'), { dotfiles: 'deny' }));
for (const page of ['landing.html', 'login.html', 'index.html', 'register.html', 'select.html', 'platform.html', 'signup.html']) {
    app.get(`/${page}`, (_req, res) => res.sendFile(path.join(rootDir, page)));
}
app.get('/', (_req, res) => res.sendFile(path.join(rootDir, 'landing.html')));

const PORT = parseInt(process.env.PORT || '3000', 10);

// On a FRESH database (e.g. a new on-premise install) the core tables don't
// exist yet — apply the drizzle base migrations once to create them. On an
// existing install (core tables already present, possibly created via
// drizzle-kit push with no tracking table) we skip this so migrate() never
// tries to re-CREATE existing tables; runMigrations() then handles all
// incremental columns/tables on top.
async function ensureBaseSchema() {
    const [{ exists }] = await client`SELECT to_regclass('public."user"') AS exists`;
    if (exists) return;   // existing DB → leave the base schema alone
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    const { db } = await import('./db/connection.js');
    await migrate(db, { migrationsFolder: path.join(__dirname, 'db/migrations') });
    console.log('Base schema created (fresh database).');
}

// Bind the port for liveness; API traffic remains blocked until mandatory security migration succeeds.
app.listen(PORT, () => {
    console.log(`E-CRF Server running on http://localhost:${PORT}`);
    console.log(`Better Auth endpoint: http://localhost:${PORT}/api/auth`);
    if (process.env.LICENSE_ENFORCEMENT === 'true') {
        import('./lib/license.js').then(({ getLicense }) => {
            const lic = getLicense();
            if (lic.active) {
                console.log(`License: active for "${lic.customer}" (expires ${lic.expiresAt}).`);
            } else {
                console.warn(`License: NOT ACTIVE (${lic.reason}). New-record creation (enrollment/studies/sites) is blocked; reads/exports continue.`);
            }
        }).catch(() => {});
    }
    ensureBaseSchema()
        .then(runMigrations)
        .then(() => migrateSecurity(client))
        .then(() => { securityReady = true; console.log('DB and security migrations applied.'); })
        .catch(err => console.error('Startup incomplete; requests remain blocked:', err.code || err.message));
});
````

## `src/frontend/js/modules/adverseevents.js`

````javascript
import { actionAttributes } from './visit-actions.js';
// ============================================================
// Adverse Events / SAE View — ICH E2A / GCP pharmacovigilance
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

const SEVERITY_BADGE = {
    Mild:             'badge' ,
    Moderate:         'badge badge-saved',
    Severe:           'badge badge-open',
    'Life-threatening': 'badge' ,
    Fatal:            'badge badge-withdrawn',
};
const SEVERITY_STYLE = {
    Mild:               'background:#F0FDF4;color:#166534;border:1px solid #BBF7D0',
    Moderate:           'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A',
    Severe:             'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA',
    'Life-threatening': 'background:#7C3AED20;color:#5B21B6;border:1px solid #DDD6FE',
    Fatal:              'background:#1F2937;color:#F9FAFB;border:1px solid #4B5563',
};

const STATUS_STYLE = {
    Draft:    'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1',
    Reported: 'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7',
    Closed:   'background:#E0E7FF;color:#3730A3;border:1px solid #C7D2FE',
};

const SERIOUS_CRITERIA_OPTIONS = [
    { value: 'death',          label: 'Results in Death' },
    { value: 'life_threatening', label: 'Life-Threatening' },
    { value: 'hospitalization', label: 'Requires Hospitalization / Prolongation' },
    { value: 'disability',     label: 'Persistent/Significant Disability' },
    { value: 'congenital',     label: 'Congenital Anomaly / Birth Defect' },
    { value: 'medically_important', label: 'Other Medically Important Condition' },
];

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDT(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function severityBadge(sev) {
    const style = SEVERITY_STYLE[sev] || 'background:#F1F5F9;color:#475569';
    return `<span class="badge" style="${style}">${esc(sev)}</span>`;
}
function statusBadge(s) {
    const style = STATUS_STYLE[s] || STATUS_STYLE.Draft;
    return `<span class="badge" style="${style}">${esc(s)}</span>`;
}

function deadlineBadge(ae) {
    if (!ae.requiresExpeditedReport || ae.reportStatus === 'Closed') return '';
    if (!ae.expeditedDeadline) return '';
    const now  = new Date();
    const dead = new Date(ae.expeditedDeadline);
    const daysLeft = Math.ceil((dead - now) / 86400000);
    if (daysLeft < 0) {
        return `<span class="badge ml-1" style="background:#7F1D1D;color:#FCA5A5;border:1px solid #DC2626">OVERDUE ${Math.abs(daysLeft)}d</span>`;
    }
    if (daysLeft <= 2) {
        return `<span class="badge ml-1" style="background:#FEF3C7;color:#92400E;border:1px solid #FCD34D">${daysLeft}d left</span>`;
    }
    return `<span class="badge ml-1" style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE">${daysLeft}d left</span>`;
}

export async function renderAdverseEvents(filters = {}) {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const user = api.getCurrentUser();
    let aes;
    try {
        aes = await api.getAdverseEvents(filters);
    } catch (err) {
        content.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    const total   = aes.length;
    const serious = aes.filter(a => a.isSerious).length;
    const draft   = aes.filter(a => a.reportStatus === 'Draft').length;
    const overdue = aes.filter(a => {
        if (!a.requiresExpeditedReport || a.reportStatus === 'Closed' || !a.expeditedDeadline) return false;
        return new Date(a.expeditedDeadline) < new Date();
    }).length;

    const canCreate = ['investigator', 'pi', 'admin', 'crc'].includes(user.role);

    content.innerHTML = `
    <div class="p-5 space-y-4">

        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Adverse Events / SAE</h2>
                <p class="text-xs text-slate-500 mt-0.5">ICH E2A pharmacovigilance reporting — expedited SAE timelines enforced</p>
            </div>
            <div class="flex gap-2">
                ${canCreate ? `
                <button onclick="openAEForm()"
                    class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                    <i data-lucide="plus" class="w-4 h-4"></i> Report AE/SAE
                </button>` : ''}
            </div>
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total AEs</p>
                <p class="kpi-number text-slate-700">${total}</p>
            </div>
            <div class="ph-card p-4 cursor-pointer" onclick="aeFilter('serious')">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">SAE</p>
                <p class="kpi-number text-red-700">${serious}</p>
                <p class="text-xs text-slate-400 mt-1">Serious events</p>
            </div>
            <div class="ph-card p-4 cursor-pointer" onclick="aeFilter('draft')">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Unreported</p>
                <p class="kpi-number text-amber-600">${draft}</p>
                <p class="text-xs text-slate-400 mt-1">Draft / pending</p>
            </div>
            <div class="ph-card p-4 ${overdue > 0 ? 'border-red-300 bg-red-50' : ''}">
                <p class="text-xs font-semibold ${overdue > 0 ? 'text-red-600' : 'text-slate-500'} uppercase tracking-wide mb-2">Overdue</p>
                <p class="kpi-number ${overdue > 0 ? 'text-red-700' : 'text-slate-400'}">${overdue}</p>
                <p class="text-xs ${overdue > 0 ? 'text-red-500' : 'text-slate-400'} mt-1">Expedited report past deadline</p>
            </div>
        </div>

        <!-- Filter Bar -->
        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <select id="ae-status-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Reported">Reported</option>
                    <option value="Closed">Closed</option>
                </select>
                <select id="ae-serious-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Events</option>
                    <option value="true">SAE Only</option>
                    <option value="false">Non-Serious Only</option>
                </select>
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="ae-search" placeholder="Search by subject or AE term…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
        </div>

        <!-- Table -->
        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">#</th>
                            <th class="text-left">Subject</th>
                            <th class="text-left">AE Term / MedDRA PT</th>
                            <th class="text-left">Severity</th>
                            <th class="text-left">Onset</th>
                            <th class="text-left">Deadline</th>
                            <th class="text-left">Status</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="ae-tbody" class="ph-table-body">
                        ${renderAERows(aes, user)}
                    </tbody>
                </table>
            </div>
            <div id="ae-empty" class="${aes.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="activity" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No adverse events recorded.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    window.aeFilter = function(type) {
        if (type === 'serious') document.getElementById('ae-serious-filter').value = 'true';
        if (type === 'draft')   document.getElementById('ae-status-filter').value  = 'Draft';
        filterAEs();
    };

    function filterAEs() {
        const status  = document.getElementById('ae-status-filter').value;
        const serious = document.getElementById('ae-serious-filter').value;
        const search  = document.getElementById('ae-search').value.toLowerCase();
        let filtered  = aes;
        if (status)  filtered = filtered.filter(a => a.reportStatus === status);
        if (serious === 'true')  filtered = filtered.filter(a => a.isSerious);
        if (serious === 'false') filtered = filtered.filter(a => !a.isSerious);
        if (search)  filtered = filtered.filter(a =>
            a.aeTerm?.toLowerCase().includes(search) ||
            a.subjectCode?.toLowerCase().includes(search) ||
            a.meddraPt?.toLowerCase().includes(search)
        );
        document.getElementById('ae-tbody').innerHTML = renderAERows(filtered, user);
        document.getElementById('ae-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('ae-status-filter').addEventListener('change', filterAEs);
    document.getElementById('ae-serious-filter').addEventListener('change', filterAEs);
    document.getElementById('ae-search').addEventListener('input', filterAEs);
}

function renderAERows(aes, user) {
    if (!aes.length) return '';
    return aes.map(ae => {
        const canEdit    = ['investigator','pi','admin','crc'].includes(user.role) && ae.reportStatus !== 'Closed';
        const canReport  = ['investigator','pi','admin'].includes(user.role) && ae.isSerious && ae.reportStatus === 'Draft';
        const canClose   = ['pi','admin'].includes(user.role) && ae.reportStatus === 'Reported';
        const canQuery   = ['cra','admin'].includes(user.role);
        const saeTag     = ae.isSerious ? `<span class="badge ml-1" style="background:#FEE2E2;color:#991B1B;border:1px solid #FECACA;font-weight:700">SAE</span>` : '';

        return `<tr>
            <td class="text-xs text-slate-400 font-mono">#${ae.id}</td>
            <td>
                <p class="text-xs font-semibold font-mono text-slate-800">${esc(ae.subjectCode)}</p>
                <p class="text-xs text-slate-400">${esc(ae.createdByName)}</p>
            </td>
            <td>
                <div class="flex items-center gap-1 flex-wrap">
                    <p class="text-xs font-medium text-slate-800">${esc(ae.aeTerm)}</p>
                    ${saeTag}
                </div>
                ${ae.meddraPt ? `<p class="text-xs text-slate-400 mt-0.5 font-mono">PT: ${esc(ae.meddraPt)}${ae.meddraPtCode ? ` (${esc(ae.meddraPtCode)})` : ''}</p>` : ''}
                ${ae.meddraSoc ? `<p class="text-xs text-slate-400 font-mono">SOC: ${esc(ae.meddraSoc)}</p>` : ''}
                ${{Coded:'<span class="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Coded</span>','Pending Review':'<span class="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Pending Review</span>','Uncoded':'<span class="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">Uncoded</span>'}[ae.codingStatus] ?? ''}
            </td>
            <td>${severityBadge(ae.severity)}</td>
            <td class="text-xs text-slate-600 whitespace-nowrap">${fmtDate(ae.onsetDate)}</td>
            <td class="text-xs whitespace-nowrap">
                ${ae.requiresExpeditedReport
                    ? `<span class="text-slate-500">${fmtDate(ae.expeditedDeadline)}</span>${deadlineBadge(ae)}`
                    : '<span class="text-slate-300">—</span>'}
            </td>
            <td>${statusBadge(ae.reportStatus)}</td>
            <td class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                    ${canQuery ? `<button ${actionAttributes('query', [ae.subjectId, null, 'adverse_event', 'AE: ' + (ae.aeTerm || '')])}
                        class="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded transition" title="Raise Query">
                        <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                    ${canEdit ? `<button onclick="openAEForm(${ae.id})"
                        class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition" title="Edit">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                    ${canReport ? `<button onclick="openReportModal(${ae.id})"
                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition border border-emerald-200">
                        <i data-lucide="send" class="w-3 h-3"></i> Report
                    </button>` : ''}
                    ${canClose ? `<button onclick="closeAE(${ae.id})"
                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
                        <i data-lucide="x-circle" class="w-3 h-3"></i> Close
                    </button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.openAEForm = function(aeId = null) {
    const isEdit = aeId !== null;
    const title  = isEdit ? 'Edit Adverse Event' : 'Report Adverse Event / SAE';

    showModal({
        title,
        size: 'lg',
        body: `
        <div class="space-y-4">
            ${isEdit ? `
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#FEF3C7;border-color:#FDE68A;color:#92400E">
                <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                ICH GCP: reason for change is required when editing clinical data.
            </div>` : `
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#EBF2FD;border-color:#BFD7F5;color:#1554A0">
                <i data-lucide="info" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                SAEs must be reported to Sponsor within 7 days (fatal/life-threatening) or 15 days (other serious). Non-serious AEs are tracked for safety surveillance.
            </div>`}

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Subject Code <span class="text-red-500">*</span></label>
                    <input type="text" id="ae-subject" placeholder="e.g. SITE01-001"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">AE Verbatim Term <span class="text-red-500">*</span></label>
                    <input type="text" id="ae-term" placeholder="As reported by subject/investigator"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>

            <!-- MedDRA Structured Coding Panel -->
            <div class="border border-blue-100 bg-blue-50/60 rounded-xl p-3 space-y-2">
                <div class="flex items-center justify-between mb-1">
                    <p class="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                        <i data-lucide="code-2" class="w-3.5 h-3.5"></i> MedDRA Medical Coding
                    </p>
                    <div class="flex items-center gap-2">
                        <select id="ae-coding-status" class="text-xs border border-blue-200 rounded-md px-2 py-0.5 bg-white text-blue-700 font-medium">
                            <option value="Uncoded">Uncoded</option>
                            <option value="Coded">Coded</option>
                            <option value="Pending Review">Pending Review</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Preferred Term (PT)</label>
                        <input type="text" id="ae-meddra-pt" placeholder="e.g. Headache"
                            class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">PT Code</label>
                        <input type="text" id="ae-meddra-pt-code" placeholder="e.g. 10019211"
                            class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none font-mono">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">System Organ Class (SOC)</label>
                        <input type="text" id="ae-meddra-soc" placeholder="e.g. Nervous system disorders"
                            class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">SOC Code</label>
                        <input type="text" id="ae-meddra-soc-code" placeholder="e.g. 10029205"
                            class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none font-mono">
                    </div>
                </div>
                <div class="w-40">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">MedDRA Version</label>
                    <input type="text" id="ae-meddra-version" placeholder="e.g. 26.1"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <p class="text-xs text-blue-500 italic">MedDRA is a registered trademark of ICH. Coding requires a valid MedDRA license and trained medical coder.</p>
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Onset Date</label>
                    <input type="date" id="ae-onset" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Resolution Date</label>
                    <input type="date" id="ae-resolution" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Outcome</label>
                    <select id="ae-outcome" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option>Recovered/Resolved</option>
                        <option>Recovering/Resolving</option>
                        <option>Not Recovered/Not Resolved</option>
                        <option>Fatal</option>
                        <option>Unknown</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Severity (CTCAE) <span class="text-red-500">*</span></label>
                    <select id="ae-severity" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option>Mild</option>
                        <option>Moderate</option>
                        <option>Severe</option>
                        <option>Life-threatening</option>
                        <option>Fatal</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Causality</label>
                    <select id="ae-causality" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option>Related</option>
                        <option>Probably Related</option>
                        <option>Possibly Related</option>
                        <option>Unlikely Related</option>
                        <option>Not Related</option>
                        <option>Unknown</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Action Taken</label>
                    <select id="ae-action" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option>None</option>
                        <option>Dose Reduced</option>
                        <option>Drug Interrupted</option>
                        <option>Drug Withdrawn</option>
                        <option>Not Applicable</option>
                        <option>Unknown</option>
                    </select>
                </div>
            </div>

            <!-- Serious Event Section -->
            <div class="border border-red-200 rounded-md overflow-hidden">
                <div class="flex items-center gap-3 px-4 py-3 bg-red-50 border-b border-red-200">
                    <input type="checkbox" id="ae-is-serious" class="w-4 h-4 rounded border-slate-300 text-red-600">
                    <label for="ae-is-serious" class="text-sm font-semibold text-red-800">This is a Serious Adverse Event (SAE)</label>
                </div>
                <div id="sae-criteria-panel" class="hidden p-4 space-y-2 bg-red-50/50">
                    <p class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">SAE Criteria (check all that apply) <span class="text-red-500">*</span></p>
                    ${SERIOUS_CRITERIA_OPTIONS.map(c => `
                    <label class="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" name="sae-criteria" value="${c.value}" class="w-3.5 h-3.5 rounded border-slate-300 text-red-600">
                        ${esc(c.label)}
                    </label>`).join('')}
                </div>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Narrative / Description</label>
                <textarea id="ae-narrative" rows="3" placeholder="Clinical narrative describing the event, context, and management…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>

            ${isEdit ? `
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="ae-rfc" placeholder="Required — explain what changed and why"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none">
            </div>` : ''}
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitAEForm(${aeId})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-4 h-4"></i> ${isEdit ? 'Save Changes' : 'Submit Report'}
        </button>`,
    });

    // Toggle SAE criteria panel
    document.getElementById('ae-is-serious').addEventListener('change', function() {
        document.getElementById('sae-criteria-panel').classList.toggle('hidden', !this.checked);
    });

    // Pre-fill if editing
    if (isEdit) {
        const ae = _aes.find(a => a.id === aeId);
        if (ae) {
            const set = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
            set('ae-subject',       ae.subjectCode);
            set('ae-term',          ae.aeTerm);
            set('ae-meddra-pt',     ae.meddraPt);
            set('ae-meddra-pt-code',ae.meddraPtCode);
            set('ae-meddra-soc',    ae.meddraSoc);
            set('ae-meddra-soc-code',ae.meddraSocCode);
            set('ae-meddra-version',ae.meddraVersion);
            set('ae-coding-status', ae.codingStatus ?? 'Uncoded');
            set('ae-onset',         ae.onsetDate);
            set('ae-resolution',    ae.resolutionDate);
            set('ae-outcome',       ae.outcome);
            set('ae-severity',      ae.severity);
            set('ae-causality',     ae.causality);
            set('ae-action',        ae.actionTaken);
            set('ae-narrative',     ae.narrative);
            if (ae.isSerious) {
                document.getElementById('ae-is-serious').checked = true;
                document.getElementById('sae-criteria-panel').classList.remove('hidden');
                (ae.seriousCriteria ?? []).forEach(v => {
                    const cb = document.querySelector(`input[name="sae-criteria"][value="${v}"]`);
                    if (cb) cb.checked = true;
                });
            }
        }
    }
};

window.submitAEForm = async function(aeId) {
    const isEdit   = aeId !== null;
    const subjectEl = document.getElementById('ae-subject');
    const term      = document.getElementById('ae-term').value.trim();
    const severity  = document.getElementById('ae-severity').value;
    const isSerious = document.getElementById('ae-is-serious').checked;

    if (!term || !severity) {
        showToast('AE term and severity are required.', 'error'); return;
    }
    if (isSerious) {
        const criteria = [...document.querySelectorAll('input[name="sae-criteria"]:checked')].map(c => c.value);
        if (criteria.length === 0) { showToast('Select at least one SAE seriousness criterion.', 'error'); return; }
    }

    const seriousCriteria = [...document.querySelectorAll('input[name="sae-criteria"]:checked')].map(c => c.value);

    // Resolve subjectId from subjectCode
    let subjectId = null;
    if (!isEdit) {
        const subjectCode = subjectEl?.value?.trim();
        if (!subjectCode) { showToast('Subject code is required.', 'error'); return; }
        try {
            const subjects = await api.getSubjects({ search: subjectCode });
            const match = subjects.find(s => s.subject_code === subjectCode);
            if (!match) { showToast(`Subject "${subjectCode}" not found.`, 'error'); return; }
            subjectId = match.id;
        } catch { showToast('Could not resolve subject.', 'error'); return; }
    }

    const payload = {
        subjectId,
        aeTerm:        term,
        meddraPt:       document.getElementById('ae-meddra-pt')?.value.trim()       || null,
        meddraPtCode:   document.getElementById('ae-meddra-pt-code')?.value.trim()  || null,
        meddraSoc:      document.getElementById('ae-meddra-soc')?.value.trim()      || null,
        meddraSocCode:  document.getElementById('ae-meddra-soc-code')?.value.trim() || null,
        meddraVersion:  document.getElementById('ae-meddra-version')?.value.trim()  || null,
        codingStatus:   document.getElementById('ae-coding-status')?.value          || 'Uncoded',
        onsetDate:     document.getElementById('ae-onset').value      || null,
        resolutionDate:document.getElementById('ae-resolution').value || null,
        outcome:       document.getElementById('ae-outcome').value    || null,
        severity,
        isSerious,
        seriousCriteria,
        causality:     document.getElementById('ae-causality').value  || null,
        actionTaken:   document.getElementById('ae-action').value     || null,
        narrative:     document.getElementById('ae-narrative').value.trim() || null,
    };

    if (isEdit) {
        const rfc = document.getElementById('ae-rfc')?.value?.trim();
        if (!rfc) { showToast('Reason for change is required.', 'error'); return; }
        payload.reason = rfc;
    }

    try {
        if (isEdit) {
            await api.updateAdverseEvent(aeId, payload);
            showToast('Adverse event updated.', 'success');
        } else {
            await api.createAdverseEvent(payload);
            showToast(isSerious ? 'SAE recorded. Expedited reporting deadline set.' : 'Adverse event recorded.', 'success');
        }
        closeModal();
        await renderAdverseEvents();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.openReportModal = function(aeId) {
    showModal({
        title: 'Submit Expedited SAE Report',
        size: 'md',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B">
                <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                ICH E2A: SAEs must be reported within 7 days (fatal/life-threatening) or 15 days (other criteria). Confirm reporting below.
            </div>
            <div class="space-y-2">
                <label class="flex items-center gap-3 p-3 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" id="rpt-sponsor" class="w-4 h-4">
                    <div>
                        <p class="text-sm font-medium text-slate-700">Reported to Sponsor</p>
                        <p class="text-xs text-slate-400">Confirm expedited safety report sent to study sponsor</p>
                    </div>
                </label>
                <label class="flex items-center gap-3 p-3 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" id="rpt-irb" class="w-4 h-4">
                    <div>
                        <p class="text-sm font-medium text-slate-700">Reported to IRB/EC</p>
                        <p class="text-xs text-slate-400">Confirm report sent to Institutional Review Board / Ethics Committee</p>
                    </div>
                </label>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitReport(${aeId})" class="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="send" class="w-4 h-4"></i> Confirm Reporting
        </button>`,
    });
};

window.submitReport = async function(aeId) {
    const sponsor = document.getElementById('rpt-sponsor').checked;
    const irb     = document.getElementById('rpt-irb').checked;
    if (!sponsor && !irb) { showToast('Select at least one reporting target.', 'error'); return; }
    try {
        await api.reportAdverseEvent(aeId, { reportedToSponsor: sponsor, reportedToIrb: irb });
        closeModal();
        showToast('SAE reporting status updated.', 'success');
        await renderAdverseEvents();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.closeAE = async function(aeId) {
    if (!confirm('Close this adverse event? This action is final.')) return;
    try {
        await api.closeAdverseEvent(aeId);
        showToast('Adverse event closed.', 'success');
        await renderAdverseEvents();
    } catch (err) {
        showToast(err.message, 'error');
    }
};
````

## `src/frontend/js/modules/conmeds.js`

````javascript
import { actionAttributes } from './visit-actions.js';
// ============================================================
// Concomitant Medications — study-wide view
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let _allConMeds = [];

export async function renderConMeds(container) {
    container.innerHTML = SPINNER;
    const user = api.getCurrentUser();
    const canWrite = ['investigator', 'admin', 'cra'].includes(user?.role);

    let records = [];
    try {
        records = await api.request('/api/conmeds');
        _allConMeds = records;
    } catch (err) {
        container.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    container.innerHTML = `
    <div class="p-5 space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Concomitant Medications</h2>
                <p class="text-xs text-slate-500 mt-0.5">All concurrent medications taken by subjects during the study</p>
            </div>
            ${canWrite ? `
            <button onclick="openConMedForm()"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Add Medication
            </button>` : ''}
        </div>

        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="cm-search" placeholder="Search by subject or drug name…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <select id="cm-ongoing-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All</option>
                    <option value="ongoing">Ongoing Only</option>
                </select>
            </div>
        </div>

        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">Subject</th>
                            <th class="text-left">Drug Name</th>
                            <th class="text-left">WHO/ATC Code</th>
                            <th class="text-left">Indication</th>
                            <th class="text-left">Dose / Freq / Route</th>
                            <th class="text-left">Start</th>
                            <th class="text-left">Stop / Status</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="cm-tbody" class="ph-table-body">
                        ${renderConMedRows(records, user, canWrite)}
                    </tbody>
                </table>
            </div>
            <div id="cm-empty" class="${records.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="pill" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No concomitant medications recorded.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    function applyFilters() {
        const search  = document.getElementById('cm-search').value.toLowerCase();
        const ongoing = document.getElementById('cm-ongoing-filter').value;
        let filtered = _allConMeds;
        if (search)  filtered = filtered.filter(r =>
            r.subjectCode?.toLowerCase().includes(search) ||
            r.drugName?.toLowerCase().includes(search)
        );
        if (ongoing === 'ongoing') filtered = filtered.filter(r => r.isOngoing);
        document.getElementById('cm-tbody').innerHTML = renderConMedRows(filtered, user, canWrite);
        document.getElementById('cm-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('cm-search').addEventListener('input', applyFilters);
    document.getElementById('cm-ongoing-filter').addEventListener('change', applyFilters);
}

function renderConMedRows(records, user, canWrite) {
    if (!records.length) return '';
    const canQuery = ['cra', 'admin'].includes(user.role);
    return records.map(r => `
        <tr>
            <td class="text-xs font-semibold font-mono text-slate-800">${esc(r.subjectCode || '—')}</td>
            <td>
                <p class="text-xs font-medium text-slate-800">${esc(r.drugName)}</p>
                ${r.notes ? `<p class="text-xs text-slate-400 mt-0.5 line-clamp-1">${esc(r.notes)}</p>` : ''}
            </td>
            <td class="text-xs font-mono text-slate-500">${esc(r.atcCode) || '—'}</td>
            <td class="text-xs text-slate-600">${esc(r.indication) || '—'}</td>
            <td class="text-xs text-slate-600 whitespace-nowrap">
                ${r.dose ? `${esc(r.dose)} ${esc(r.doseUnit)}` : '—'}
                ${r.frequency ? ` · ${esc(r.frequency)}` : ''}
                ${r.route ? ` · ${esc(r.route)}` : ''}
            </td>
            <td class="text-xs text-slate-600 whitespace-nowrap">${fmtDate(r.startDate)}</td>
            <td class="text-xs whitespace-nowrap">
                ${r.isOngoing
                    ? `<span class="badge" style="background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7">Ongoing</span>`
                    : `<span class="text-slate-500">${fmtDate(r.stopDate)}</span>`}
            </td>
            <td class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                    ${canQuery ? `<button ${actionAttributes('query', [r.subjectId, null, 'con_medication', 'ConMed: ' + (r.drugName || '')])}
                        class="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded transition" title="Raise Query">
                        <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                    ${canWrite ? `
                    <button onclick="openConMedForm(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition" title="Edit">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="deleteConMed(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`).join('');
}

window.openConMedForm = async function(recordId = null) {
    const isEdit = recordId !== null;

    let subjects = [];
    try { subjects = await api.getSubjects(); } catch {}

    let rec = {};
    if (isEdit) {
        try { rec = await api.request(`/api/conmeds/${recordId}`); } catch {}
    }

    const subjectOptions = subjects.map(s =>
        `<option value="${s.id}" ${rec.subjectId === s.id ? 'selected' : ''}>${esc(s.subject_code)}</option>`
    ).join('');

    showModal({
        title: isEdit ? 'Edit Concomitant Medication' : 'Add Concomitant Medication',
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Subject <span class="text-red-500">*</span></label>
                    <select id="cm-subject-id" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select Subject —</option>
                        ${subjectOptions}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Drug Name <span class="text-red-500">*</span></label>
                    <input type="text" id="cm-drug-name" value="${esc(rec.drugName)}" placeholder="Generic or brand name"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">WHO/ATC Code</label>
                    <input type="text" id="cm-atc" value="${esc(rec.atcCode)}" placeholder="e.g. A10BA02"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Indication</label>
                    <input type="text" id="cm-indication" value="${esc(rec.indication)}" placeholder="Reason for taking"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="ph-label">Dose</label>
                    <input type="text" id="cm-dose" value="${esc(rec.dose)}" placeholder="e.g. 500"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Dose Unit</label>
                    <input type="text" id="cm-dose-unit" value="${esc(rec.doseUnit)}" placeholder="mg, mcg, IU…"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Frequency</label>
                    <select id="cm-frequency" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        ${['QD','BID','TID','QID','PRN','Other'].map(f =>
                            `<option ${rec.frequency === f ? 'selected' : ''}>${f}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="ph-label">Route</label>
                    <select id="cm-route" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        ${['Oral','IV','IM','SC','Topical','Inhaled','Other'].map(ro =>
                            `<option ${rec.route === ro ? 'selected' : ''}>${ro}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Start Date</label>
                    <input type="date" id="cm-start" value="${rec.startDate ? rec.startDate.split('T')[0] : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Stop Date</label>
                    <input type="date" id="cm-stop" value="${rec.stopDate ? rec.stopDate.split('T')[0] : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none"
                        ${rec.isOngoing ? 'disabled' : ''}>
                </div>
            </div>
            <div>
                <label class="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" id="cm-ongoing" ${rec.isOngoing ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300">
                    <span class="text-sm font-medium text-slate-700">Medication is Ongoing (no stop date)</span>
                </label>
            </div>
            <div>
                <label class="ph-label">Notes</label>
                <textarea id="cm-notes" rows="2" placeholder="Additional notes…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(rec.notes)}</textarea>
            </div>
            ${isEdit ? `
            <div>
                <label class="ph-label">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="cm-rfc" placeholder="Required — explain what changed and why"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none">
            </div>` : ''}
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitConMedForm(${recordId})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-4 h-4"></i> ${isEdit ? 'Save Changes' : 'Add Medication'}
        </button>`,
    });

    document.getElementById('cm-ongoing').addEventListener('change', function() {
        const stopEl = document.getElementById('cm-stop');
        stopEl.disabled = this.checked;
        if (this.checked) stopEl.value = '';
    });
};

window.submitConMedForm = async function(recordId) {
    const isEdit    = recordId !== null;
    const subjectId = document.getElementById('cm-subject-id').value;
    const drugName  = document.getElementById('cm-drug-name').value.trim();
    if (!subjectId || !drugName) { showToast('Subject and drug name are required.', 'error'); return; }

    const isOngoing = document.getElementById('cm-ongoing').checked;

    const payload = {
        subjectId:  Number(subjectId),
        drugName,
        atcCode:    document.getElementById('cm-atc').value.trim() || null,
        indication: document.getElementById('cm-indication').value.trim() || null,
        dose:       document.getElementById('cm-dose').value.trim() || null,
        doseUnit:   document.getElementById('cm-dose-unit').value.trim() || null,
        frequency:  document.getElementById('cm-frequency').value || null,
        route:      document.getElementById('cm-route').value || null,
        startDate:  document.getElementById('cm-start').value || null,
        stopDate:   isOngoing ? null : (document.getElementById('cm-stop').value || null),
        isOngoing,
        notes:      document.getElementById('cm-notes').value.trim() || null,
    };

    if (isEdit) {
        const rfc = document.getElementById('cm-rfc')?.value?.trim();
        if (!rfc) { showToast('Reason for change is required.', 'error'); return; }
        payload.reason = rfc;
    }

    try {
        if (isEdit) {
            await api.request(`/api/conmeds/${recordId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        } else {
            await api.request('/api/conmeds', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeModal();
        showToast(isEdit ? 'Medication updated.' : 'Medication added.', 'success');
        await renderConMeds(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteConMed = async function(recordId) {
    const reason = prompt('Reason for deletion (required):');
    if (!reason) return;
    try {
        await api.request(`/api/conmeds/${recordId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
        showToast('Medication record deleted.', 'success');
        await renderConMeds(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};
````

## `src/frontend/js/modules/lab.js`

````javascript
import { actionAttributes } from './visit-actions.js';
// ============================================================
// Laboratory Results — study-wide view with LOINC coding
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function flagBadge(flag) {
    if (!flag || flag === 'Normal') return '<span class="text-slate-300">—</span>';
    const map = {
        H:  'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A',
        L:  'background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE',
        HH: 'background:#FEE2E2;color:#7F1D1D;border:1px solid #FECACA',
        LL: 'background:#FEE2E2;color:#7F1D1D;border:1px solid #FECACA',
        A:  'background:#FEF3C7;color:#78350F;border:1px solid #FDE68A',
    };
    const style = map[flag] || 'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1';
    const bold = (flag === 'HH' || flag === 'LL') ? 'font-weight:700' : '';
    return `<span class="badge" style="${style};${bold}">${esc(flag)}</span>`;
}

function csBadge(cs) {
    const map = {
        CS:  { style: 'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA', label: 'CS' },
        NCS: { style: 'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7', label: 'NCS' },
        NA:  { style: 'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1', label: 'N/A' },
    };
    const def = map[cs];
    if (!def) return '<span class="text-slate-300">—</span>';
    return `<span class="badge" style="${def.style}">${def.label}</span>`;
}

function statusBadge(s) {
    const map = {
        Pending:  'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A',
        Verified: 'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7',
        Queried:  'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA',
    };
    const style = map[s] || map.Pending;
    return `<span class="badge" style="${style}">${esc(s || 'Pending')}</span>`;
}

function loincBadge(status) {
    if (status === 'LOINC')   return `<span class="badge" style="background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7;font-size:10px">LOINC</span>`;
    if (status === 'Custom')  return `<span class="badge" style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;font-size:10px">Custom</span>`;
    return `<span class="badge" style="background:#F1F5F9;color:#64748B;border:1px solid #CBD5E1;font-size:10px">Pending</span>`;
}

// ─── LOINC-coded test dictionary per panel ─────────────────────────────────
const LAB_TESTS = {
    Hematology: [
        { name: 'Hemoglobin',        loinc: '718-7',    specimen: 'Whole blood', unit: 'g/dL',          refLow: 12.0,  refHigh: 16.0 },
        { name: 'Hematocrit',        loinc: '4544-3',   specimen: 'Whole blood', unit: '%',             refLow: 36,    refHigh: 48   },
        { name: 'Red Blood Cells',   loinc: '789-8',    specimen: 'Whole blood', unit: '×10⁶/μL',       refLow: 3.8,   refHigh: 5.5  },
        { name: 'White Blood Cells', loinc: '6690-2',   specimen: 'Whole blood', unit: '×10³/μL',       refLow: 4.5,   refHigh: 11.0 },
        { name: 'Platelets',         loinc: '777-3',    specimen: 'Whole blood', unit: '×10³/μL',       refLow: 150,   refHigh: 400  },
        { name: 'Neutrophils',       loinc: '751-8',    specimen: 'Whole blood', unit: '×10³/μL',       refLow: 1.8,   refHigh: 7.7  },
        { name: 'Lymphocytes',       loinc: '731-0',    specimen: 'Whole blood', unit: '×10³/μL',       refLow: 1.0,   refHigh: 4.8  },
        { name: 'Monocytes',         loinc: '742-7',    specimen: 'Whole blood', unit: '×10³/μL',       refLow: 0.2,   refHigh: 0.8  },
        { name: 'Eosinophils',       loinc: '711-2',    specimen: 'Whole blood', unit: '×10³/μL',       refLow: 0.05,  refHigh: 0.5  },
        { name: 'Basophils',         loinc: '704-7',    specimen: 'Whole blood', unit: '×10³/μL',       refLow: 0,     refHigh: 0.1  },
        { name: 'MCV',               loinc: '787-2',    specimen: 'Whole blood', unit: 'fL',            refLow: 80,    refHigh: 100  },
        { name: 'MCH',               loinc: '785-6',    specimen: 'Whole blood', unit: 'pg',            refLow: 26,    refHigh: 34   },
        { name: 'MCHC',              loinc: '786-4',    specimen: 'Whole blood', unit: 'g/dL',          refLow: 31,    refHigh: 37   },
        { name: 'RDW',               loinc: '788-0',    specimen: 'Whole blood', unit: '%',             refLow: 11.5,  refHigh: 14.5 },
    ],
    Chemistry: [
        { name: 'Sodium',            loinc: '2951-2',   specimen: 'Serum', unit: 'mmol/L',       refLow: 135,   refHigh: 145  },
        { name: 'Potassium',         loinc: '2823-3',   specimen: 'Serum', unit: 'mmol/L',       refLow: 3.5,   refHigh: 5.0  },
        { name: 'Chloride',          loinc: '2075-0',   specimen: 'Serum', unit: 'mmol/L',       refLow: 98,    refHigh: 108  },
        { name: 'Bicarbonate',       loinc: '1963-8',   specimen: 'Serum', unit: 'mmol/L',       refLow: 21,    refHigh: 30   },
        { name: 'BUN',               loinc: '3094-0',   specimen: 'Serum', unit: 'mg/dL',        refLow: 7,     refHigh: 18   },
        { name: 'Creatinine',        loinc: '2160-0',   specimen: 'Serum', unit: 'mg/dL',        refLow: 0.6,   refHigh: 1.2  },
        { name: 'eGFR',              loinc: '62238-1',  specimen: 'Serum', unit: 'mL/min/1.73m²',refLow: 60,    refHigh: null },
        { name: 'Glucose',           loinc: '2345-7',   specimen: 'Serum', unit: 'mg/dL',        refLow: 70,    refHigh: 99   },
        { name: 'Calcium',           loinc: '17861-6',  specimen: 'Serum', unit: 'mg/dL',        refLow: 8.5,   refHigh: 10.5 },
        { name: 'Magnesium',         loinc: '19123-9',  specimen: 'Serum', unit: 'mg/dL',        refLow: 1.7,   refHigh: 2.2  },
        { name: 'Phosphorus',        loinc: '2777-1',   specimen: 'Serum', unit: 'mg/dL',        refLow: 2.5,   refHigh: 4.5  },
        { name: 'Total Protein',     loinc: '2885-2',   specimen: 'Serum', unit: 'g/dL',         refLow: 6.0,   refHigh: 8.3  },
        { name: 'Albumin',           loinc: '1751-7',   specimen: 'Serum', unit: 'g/dL',         refLow: 3.5,   refHigh: 5.0  },
        { name: 'Total Bilirubin',   loinc: '1975-2',   specimen: 'Serum', unit: 'mg/dL',        refLow: 0.2,   refHigh: 1.2  },
        { name: 'Direct Bilirubin',  loinc: '1968-7',   specimen: 'Serum', unit: 'mg/dL',        refLow: 0.0,   refHigh: 0.3  },
        { name: 'AST',               loinc: '1920-8',   specimen: 'Serum', unit: 'U/L',          refLow: 10,    refHigh: 40   },
        { name: 'ALT',               loinc: '1742-6',   specimen: 'Serum', unit: 'U/L',          refLow: 7,     refHigh: 56   },
        { name: 'ALP',               loinc: '6768-6',   specimen: 'Serum', unit: 'U/L',          refLow: 44,    refHigh: 147  },
        { name: 'GGT',               loinc: '2324-2',   specimen: 'Serum', unit: 'U/L',          refLow: 7,     refHigh: 50   },
        { name: 'LDH',               loinc: '2532-0',   specimen: 'Serum', unit: 'U/L',          refLow: 122,   refHigh: 222  },
        { name: 'Total Cholesterol', loinc: '2093-3',   specimen: 'Serum', unit: 'mg/dL',        refLow: null,  refHigh: 200  },
        { name: 'Triglycerides',     loinc: '2571-8',   specimen: 'Serum', unit: 'mg/dL',        refLow: null,  refHigh: 150  },
        { name: 'HDL Cholesterol',   loinc: '2085-9',   specimen: 'Serum', unit: 'mg/dL',        refLow: 40,    refHigh: null },
        { name: 'LDL Cholesterol',   loinc: '2089-1',   specimen: 'Serum', unit: 'mg/dL',        refLow: null,  refHigh: 100  },
        { name: 'HbA1c',             loinc: '4548-4',   specimen: 'Whole blood', unit: '%',      refLow: null,  refHigh: 5.7  },
        { name: 'TSH',               loinc: '3016-3',   specimen: 'Serum', unit: 'mIU/L',        refLow: 0.4,   refHigh: 4.0  },
        { name: 'Free T4',           loinc: '3024-7',   specimen: 'Serum', unit: 'ng/dL',        refLow: 0.8,   refHigh: 1.8  },
        { name: 'CRP',               loinc: '1988-5',   specimen: 'Serum', unit: 'mg/L',         refLow: null,  refHigh: 3.0  },
        { name: 'Uric Acid',         loinc: '3084-1',   specimen: 'Serum', unit: 'mg/dL',        refLow: 3.5,   refHigh: 7.2  },
    ],
    Coagulation: [
        { name: 'Prothrombin Time',  loinc: '5902-2',   specimen: 'Citrated plasma', unit: 's',          refLow: 11,   refHigh: 13  },
        { name: 'INR',               loinc: '6301-6',   specimen: 'Citrated plasma', unit: 'ratio',      refLow: 0.8,  refHigh: 1.2 },
        { name: 'aPTT',              loinc: '14979-9',  specimen: 'Citrated plasma', unit: 's',          refLow: 25,   refHigh: 35  },
        { name: 'Fibrinogen',        loinc: '3255-7',   specimen: 'Citrated plasma', unit: 'mg/dL',      refLow: 200,  refHigh: 400 },
        { name: 'D-Dimer',           loinc: '48065-7',  specimen: 'Citrated plasma', unit: 'ng/mL FEU',  refLow: null, refHigh: 500 },
        { name: 'Thrombin Time',     loinc: '3243-3',   specimen: 'Citrated plasma', unit: 's',          refLow: 14,   refHigh: 19  },
    ],
    Urinalysis: [
        { name: 'Urine pH',           loinc: '2756-5',  specimen: 'Urine', unit: 'pH',    refLow: 5.0,   refHigh: 8.0   },
        { name: 'Specific Gravity',   loinc: '2965-2',  specimen: 'Urine', unit: 'SG',    refLow: 1.003, refHigh: 1.030 },
        { name: 'Urine Protein',      loinc: '2888-6',  specimen: 'Urine', unit: 'mg/dL', refLow: null,  refHigh: null  },
        { name: 'Urine Glucose',      loinc: '25428-4', specimen: 'Urine', unit: 'mg/dL', refLow: null,  refHigh: null  },
        { name: 'Urine Ketones',      loinc: '2514-8',  specimen: 'Urine', unit: 'mg/dL', refLow: null,  refHigh: null  },
        { name: 'Urine Blood',        loinc: '5794-3',  specimen: 'Urine', unit: '',      refLow: null,  refHigh: null  },
        { name: 'Leukocyte Esterase', loinc: '5799-2',  specimen: 'Urine', unit: '',      refLow: null,  refHigh: null  },
        { name: 'Nitrite',            loinc: '5802-4',  specimen: 'Urine', unit: '',      refLow: null,  refHigh: null  },
        { name: 'Urine Bilirubin',    loinc: '5770-3',  specimen: 'Urine', unit: '',      refLow: null,  refHigh: null  },
        { name: 'Urobilinogen',       loinc: '5811-5',  specimen: 'Urine', unit: 'EU/dL', refLow: 0.1,   refHigh: 1.0   },
        { name: 'Urine RBC',          loinc: '13945-1', specimen: 'Urine', unit: '/HPF',  refLow: 0,     refHigh: 2     },
        { name: 'Urine WBC',          loinc: '5781-0',  specimen: 'Urine', unit: '/HPF',  refLow: 0,     refHigh: 5     },
        { name: 'Urine Casts',        loinc: '11277-1', specimen: 'Urine', unit: '/LPF',  refLow: 0,     refHigh: 2     },
        { name: 'Urine Creatinine',   loinc: '2161-8',  specimen: 'Urine', unit: 'mg/dL', refLow: null,  refHigh: null  },
        { name: 'Microalbumin',       loinc: '14957-5', specimen: 'Urine', unit: 'mg/L',  refLow: null,  refHigh: 30    },
    ],
};

const PANELS = Object.keys(LAB_TESTS);
let _allLab = [];

export async function renderLab(container) {
    container.innerHTML = SPINNER;
    const user = api.getCurrentUser();
    const canWrite  = ['investigator', 'pi', 'admin', 'crc'].includes(user?.role);
    const canVerify = ['investigator', 'pi', 'admin'].includes(user?.role);

    let records = [];
    try {
        records = await api.request('/api/lab');
        _allLab = records;
    } catch (err) {
        container.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    container.innerHTML = `
    <div class="p-5 space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Laboratory Results</h2>
                <p class="text-xs text-slate-500 mt-0.5">Clinical laboratory data across all subjects, visits, and panels</p>
            </div>
            ${canWrite ? `
            <button onclick="openLabForm()"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Add Result
            </button>` : ''}
        </div>

        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="lab-search" placeholder="Search by subject or test name…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <select id="lab-panel-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Panels</option>
                    ${PANELS.map(p => `<option>${p}</option>`).join('')}
                </select>
                <select id="lab-status-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Statuses</option>
                    <option>Pending</option>
                    <option>Verified</option>
                    <option>Queried</option>
                </select>
            </div>
        </div>

        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">Subject</th>
                            <th class="text-left">Visit</th>
                            <th class="text-left">Panel</th>
                            <th class="text-left">Test / LOINC</th>
                            <th class="text-left">Value</th>
                            <th class="text-left">Unit</th>
                            <th class="text-left">Ref Range</th>
                            <th class="text-left">Flag</th>
                            <th class="text-left">CS</th>
                            <th class="text-left">Status</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="lab-tbody" class="ph-table-body">
                        ${renderLabRows(records, user, canWrite, canVerify)}
                    </tbody>
                </table>
            </div>
            <div id="lab-empty" class="${records.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="flask-conical" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No laboratory results recorded.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    function applyFilters() {
        const search = document.getElementById('lab-search').value.toLowerCase();
        const panel  = document.getElementById('lab-panel-filter').value;
        const status = document.getElementById('lab-status-filter').value;
        let filtered = _allLab;
        if (search) filtered = filtered.filter(r =>
            r.subjectCode?.toLowerCase().includes(search) ||
            r.testName?.toLowerCase().includes(search) ||
            r.testCode?.toLowerCase().includes(search)
        );
        if (panel)  filtered = filtered.filter(r => r.panelName === panel);
        if (status) filtered = filtered.filter(r => r.status === status);
        document.getElementById('lab-tbody').innerHTML = renderLabRows(filtered, user, canWrite, canVerify);
        document.getElementById('lab-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('lab-search').addEventListener('input', applyFilters);
    document.getElementById('lab-panel-filter').addEventListener('change', applyFilters);
    document.getElementById('lab-status-filter').addEventListener('change', applyFilters);
}

function renderLabRows(records, user, canWrite, canVerify) {
    if (!records.length) return '';
    const canQuery = ['cra', 'admin'].includes(user.role);
    return records.map(r => `
        <tr>
            <td class="text-xs font-semibold font-mono text-slate-800">${esc(r.subjectCode || '—')}</td>
            <td class="text-xs text-slate-600">${esc(r.visitName) || '—'}</td>
            <td class="text-xs text-slate-600">${esc(r.panelName) || '—'}</td>
            <td>
                <p class="text-xs font-medium text-slate-800">${esc(r.testName)}</p>
                <div class="flex items-center gap-1 mt-0.5">
                    ${r.testCode ? `<span class="text-xs font-mono text-slate-400">${esc(r.testCode)}</span>` : ''}
                    ${loincBadge(r.loincCodingStatus)}
                </div>
            </td>
            <td class="text-xs text-slate-700 font-medium">${r.valueNumeric != null ? r.valueNumeric : (esc(r.valueText) || '—')}</td>
            <td class="text-xs text-slate-500">${esc(r.unit) || '—'}</td>
            <td class="text-xs text-slate-500 whitespace-nowrap">${r.refRangeLow != null || r.refRangeHigh != null ? `${r.refRangeLow ?? '?'} – ${r.refRangeHigh ?? '?'}` : (esc(r.refRangeText) || '—')}</td>
            <td>${flagBadge(r.abnormalityFlag)}</td>
            <td>${csBadge(r.clinicalSignificance)}</td>
            <td>${statusBadge(r.status)}</td>
            <td class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                    ${canVerify && r.status === 'Pending' ? `
                    <button onclick="verifyLabResult(${r.id})"
                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition border border-emerald-200">
                        <i data-lucide="check-circle" class="w-3 h-3"></i> Verify
                    </button>` : ''}
                    ${canQuery ? `<button ${actionAttributes('query', [r.subjectId, r.visitId || null, 'lab_result', 'Lab: ' + (r.testName || '')])}
                        class="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded transition" title="Raise Query">
                        <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                    ${canWrite ? `
                    <button onclick="openLabForm(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition" title="Edit">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="deleteLabResult(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`).join('');
}

// ─── Form ───────────────────────────────────────────────────────────────────

window.openLabForm = async function(recordId = null) {
    const isEdit = recordId !== null;

    let subjects = [];
    try { subjects = await api.getSubjects(); } catch {}

    let rec = {};
    if (isEdit) {
        try { rec = await api.request(`/api/lab/${recordId}`); } catch {}
    }

    const subjectOptions = subjects.map(s =>
        `<option value="${s.id}" ${rec.subjectId === s.id ? 'selected' : ''}>${esc(s.subject_code)}</option>`
    ).join('');

    showModal({
        title: isEdit ? 'Edit Lab Result' : 'Add Lab Result',
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Subject <span class="text-red-500">*</span></label>
                    <select id="lab-subject-id" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white" onchange="loadLabVisits()">
                        <option value="">— Select Subject —</option>
                        ${subjectOptions}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Visit</label>
                    <select id="lab-visit-id" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select after subject —</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Panel <span class="text-red-500">*</span></label>
                    <select id="lab-panel" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white" onchange="onLabPanelChange()">
                        <option value="">— Select —</option>
                        ${PANELS.map(p => `<option ${rec.panelName === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Test <span class="text-red-500">*</span></label>
                    <select id="lab-test-select" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white" onchange="onLabTestChange()">
                        <option value="">— Select panel first —</option>
                    </select>
                </div>
            </div>

            <div id="lab-custom-row" style="display:none" class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Custom Test Name <span class="text-red-500">*</span></label>
                    <input type="text" id="lab-test-name-custom" placeholder="e.g. Haemoglobin variant"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">LOINC Code (if known)</label>
                    <input type="text" id="lab-test-code-custom" placeholder="e.g. 718-7"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>

            <div id="lab-autofill-banner" style="display:none"
                class="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-blue-700 bg-blue-50 border border-blue-200">
                <i data-lucide="info" class="w-3.5 h-3.5 flex-shrink-0"></i>
                Specimen, unit, and reference range auto-filled from LOINC dictionary. Adjust if lab-specific values differ.
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Specimen Type</label>
                    <input type="text" id="lab-specimen" value="${esc(rec.specimenType)}" placeholder="e.g. Whole blood"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Specimen Collected At</label>
                    <input type="datetime-local" id="lab-collected-at" value="${rec.specimenCollectedAt ? rec.specimenCollectedAt.replace('Z','') : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>

            <div>
                <label class="ph-label">Lab Name</label>
                <input type="text" id="lab-lab-name" value="${esc(rec.labName)}" placeholder="e.g. Central Lab"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="ph-label">Numeric Value</label>
                    <input type="number" step="any" id="lab-value-num" value="${rec.valueNumeric ?? ''}" placeholder="e.g. 12.5"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Text Value</label>
                    <input type="text" id="lab-value-text" value="${esc(rec.valueText)}" placeholder="e.g. Negative"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Unit</label>
                    <input type="text" id="lab-unit" value="${esc(rec.unit)}" placeholder="e.g. g/dL"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Ref Range Low</label>
                    <input type="number" step="any" id="lab-ref-low" value="${rec.refRangeLow ?? ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Ref Range High</label>
                    <input type="number" step="any" id="lab-ref-high" value="${rec.refRangeHigh ?? ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>

            <div>
                <label class="ph-label">Ref Range (text) <span class="font-normal normal-case text-slate-400">— e.g. "&lt;100", "&gt;50", "3.5–5.0"; site-specific</span></label>
                <input type="text" id="lab-ref-text" value="${(rec.refRangeText ?? '').replace(/"/g, '&quot;')}"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Abnormality Flag</label>
                    <select id="lab-flag" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        ${['Normal','L','H','LL','HH','A'].map(f =>
                            `<option ${rec.abnormalityFlag === f ? 'selected' : ''}>${f}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Is Abnormal</label>
                    <div class="pt-2">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="lab-abnormal" ${rec.isAbnormal ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300">
                            <span class="text-sm text-slate-700">Mark as Abnormal</span>
                        </label>
                    </div>
                </div>
            </div>

            <div>
                <label class="ph-label">Clinical Significance</label>
                <div class="flex items-center gap-6 pt-1">
                    ${['CS','NCS','NA'].map(cs => `
                    <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                        <input type="radio" name="lab-cs" value="${cs}"
                            ${(rec.clinicalSignificance === cs || (!rec.clinicalSignificance && cs === 'NCS')) ? 'checked' : ''}
                            class="w-3.5 h-3.5">
                        ${cs === 'CS' ? 'Clinically Significant' : cs === 'NCS' ? 'Not Clinically Significant' : 'N/A'}
                    </label>`).join('')}
                </div>
            </div>

            <div>
                <label class="ph-label">Notes</label>
                <textarea id="lab-notes" rows="2" placeholder="Additional notes…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(rec.notes)}</textarea>
            </div>

            ${isEdit ? `
            <div>
                <label class="ph-label">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="lab-rfc" placeholder="Required — explain what changed and why (ICH GCP)"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none">
            </div>` : ''}
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitLabForm(${recordId})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-4 h-4"></i> ${isEdit ? 'Save Changes' : 'Add Result'}
        </button>`,
    });

    lucide.createIcons();

    // Pre-populate visits and test picker for edit mode
    if (isEdit && rec.subjectId) {
        try {
            const visits = await api.getVisits(rec.subjectId);
            const sel = document.getElementById('lab-visit-id');
            sel.innerHTML = `<option value="">— None —</option>` +
                visits.map(v => `<option value="${v.id}" ${rec.visitId === v.id ? 'selected' : ''}>${esc(v.visit_name)}</option>`).join('');
        } catch {}
    }

    if (rec.panelName) {
        onLabPanelChange();
        // Select the right test after panel is populated
        const testSel = document.getElementById('lab-test-select');
        if (rec.loincCodingStatus === 'Custom') {
            testSel.value = 'custom';
            document.getElementById('lab-custom-row').style.display = 'grid';
            const nameEl = document.getElementById('lab-test-name-custom');
            const codeEl = document.getElementById('lab-test-code-custom');
            if (nameEl) nameEl.value = rec.testName || '';
            if (codeEl) codeEl.value = rec.testCode || '';
        } else if (rec.testCode) {
            testSel.value = rec.testCode;
            if (testSel.value === rec.testCode) {
                document.getElementById('lab-autofill-banner').style.display = 'flex';
            }
        }
    }
};

window.onLabPanelChange = function() {
    const panel = document.getElementById('lab-panel').value;
    const testSel = document.getElementById('lab-test-select');
    const tests = LAB_TESTS[panel] || [];

    testSel.innerHTML = `<option value="">— Select test —</option>` +
        tests.map(t => `<option value="${t.loinc}">${esc(t.name)}</option>`).join('') +
        `<option value="custom">Custom…</option>`;

    document.getElementById('lab-custom-row').style.display = 'none';
    document.getElementById('lab-autofill-banner').style.display = 'none';
};

window.onLabTestChange = function() {
    const panel    = document.getElementById('lab-panel').value;
    const loincVal = document.getElementById('lab-test-select').value;
    const customRow    = document.getElementById('lab-custom-row');
    const autofillBanner = document.getElementById('lab-autofill-banner');

    if (loincVal === 'custom') {
        customRow.style.display = 'grid';
        autofillBanner.style.display = 'none';
        return;
    }
    customRow.style.display = 'none';

    const test = (LAB_TESTS[panel] || []).find(t => t.loinc === loincVal);
    if (!test) { autofillBanner.style.display = 'none'; return; }

    document.getElementById('lab-specimen').value  = test.specimen || '';
    document.getElementById('lab-unit').value      = test.unit     || '';
    document.getElementById('lab-ref-low').value   = test.refLow  != null ? test.refLow  : '';
    document.getElementById('lab-ref-high').value  = test.refHigh != null ? test.refHigh : '';
    autofillBanner.style.display = 'flex';
    lucide.createIcons();
};

window.loadLabVisits = async function() {
    const subjectId = document.getElementById('lab-subject-id').value;
    const sel = document.getElementById('lab-visit-id');
    if (!subjectId) { sel.innerHTML = '<option value="">— Select after subject —</option>'; return; }
    sel.innerHTML = '<option value="">Loading…</option>';
    try {
        const visits = await api.getVisits(Number(subjectId));
        sel.innerHTML = `<option value="">— None —</option>` +
            visits.map(v => `<option value="${v.id}">${esc(v.visit_name)}</option>`).join('');
    } catch {
        sel.innerHTML = '<option value="">— Error —</option>';
    }
};

window.submitLabForm = async function(recordId) {
    const isEdit    = recordId !== null;
    const subjectId = document.getElementById('lab-subject-id').value;
    const panelName = document.getElementById('lab-panel').value;
    const loincVal  = document.getElementById('lab-test-select').value;
    const isCustom  = loincVal === 'custom';

    let testName, testCode, loincCodingStatus;
    if (isCustom) {
        testName           = document.getElementById('lab-test-name-custom')?.value.trim() || '';
        testCode           = document.getElementById('lab-test-code-custom')?.value.trim() || null;
        loincCodingStatus  = 'Custom';
    } else {
        const test = (LAB_TESTS[panelName] || []).find(t => t.loinc === loincVal);
        testName           = test?.name || '';
        testCode           = loincVal || null;
        loincCodingStatus  = loincVal ? 'LOINC' : 'Pending';
    }

    if (!subjectId || !panelName || !testName) {
        showToast('Subject, panel, and test are required.', 'error');
        return;
    }

    const cs = document.querySelector('input[name="lab-cs"]:checked')?.value || 'NCS';

    const payload = {
        subjectId:            Number(subjectId),
        visitId:              document.getElementById('lab-visit-id').value ? Number(document.getElementById('lab-visit-id').value) : null,
        panelName,
        testName,
        testCode,
        loincCodingStatus,
        specimenType:         document.getElementById('lab-specimen').value.trim()    || null,
        specimenCollectedAt:  document.getElementById('lab-collected-at').value       || null,
        labName:              document.getElementById('lab-lab-name').value.trim()    || null,
        valueNumeric:         document.getElementById('lab-value-num').value !== '' ? parseFloat(document.getElementById('lab-value-num').value) : null,
        valueText:            document.getElementById('lab-value-text').value.trim() || null,
        unit:                 document.getElementById('lab-unit').value.trim()        || null,
        refRangeLow:          document.getElementById('lab-ref-low').value  !== '' ? parseFloat(document.getElementById('lab-ref-low').value)  : null,
        refRangeHigh:         document.getElementById('lab-ref-high').value !== '' ? parseFloat(document.getElementById('lab-ref-high').value) : null,
        refRangeText:         document.getElementById('lab-ref-text').value.trim()    || null,
        abnormalityFlag:      document.getElementById('lab-flag').value               || null,
        isAbnormal:           document.getElementById('lab-abnormal').checked,
        clinicalSignificance: cs,
        notes:                document.getElementById('lab-notes').value.trim()       || null,
    };

    if (isEdit) {
        const rfc = document.getElementById('lab-rfc')?.value?.trim();
        if (!rfc) { showToast('Reason for change is required.', 'error'); return; }
        payload.reason = rfc;
    }

    try {
        if (isEdit) {
            await api.request(`/api/lab/${recordId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        } else {
            await api.request('/api/lab', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeModal();
        showToast(isEdit ? 'Lab result updated.' : 'Lab result added.', 'success');
        await renderLab(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.verifyLabResult = async function(recordId) {
    if (!confirm('Mark this lab result as Verified?')) return;
    try {
        await api.request(`/api/lab/${recordId}/verify`, { method: 'PATCH', body: JSON.stringify({}) });
        showToast('Lab result verified.', 'success');
        await renderLab(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteLabResult = async function(recordId) {
    const reason = prompt('Reason for deletion (required — ICH GCP):');
    if (!reason) return;
    try {
        await api.request(`/api/lab/${recordId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
        showToast('Lab result deleted.', 'success');
        await renderLab(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};
````

## `src/frontend/js/modules/medhistory.js`

````javascript
import { actionAttributes } from './visit-actions.js';
// ============================================================
// Medical History — study-wide view
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';
import { ICD_VERSIONS } from './icd-codes.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function statusBadge(s) {
    const map = {
        Active:   'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA',
        Resolved: 'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7',
        Unknown:  'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1',
    };
    const style = map[s] || map.Unknown;
    return `<span class="badge" style="${style}">${esc(s || 'Unknown')}</span>`;
}
function severityBadge(s) {
    const map = {
        Mild:     'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7',
        Moderate: 'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A',
        Severe:   'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA',
        Unknown:  'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1',
    };
    const style = map[s] || map.Unknown;
    return `<span class="badge" style="${style}">${esc(s || 'Unknown')}</span>`;
}

let _allMedHist = [];

export async function renderMedHistory(container) {
    container.innerHTML = SPINNER;
    const user = api.getCurrentUser();
    const canWrite = ['investigator', 'admin', 'cra'].includes(user?.role);

    let records = [];
    try {
        records = await api.request('/api/medhistory');
        _allMedHist = records;
    } catch (err) {
        container.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    container.innerHTML = `
    <div class="p-5 space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Medical History</h2>
                <p class="text-xs text-slate-500 mt-0.5">Pre-existing conditions and relevant past medical history across all subjects</p>
            </div>
            ${canWrite ? `
            <button onclick="openMedHistForm()"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Add Record
            </button>` : ''}
        </div>

        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="mh-search" placeholder="Search by subject code…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <select id="mh-status-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Statuses</option>
                    <option>Active</option>
                    <option>Resolved</option>
                    <option>Unknown</option>
                </select>
            </div>
        </div>

        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">Subject Code</th>
                            <th class="text-left">Condition</th>
                            <th class="text-left">ICD Code</th>
                            <th class="text-left">Onset</th>
                            <th class="text-left">Status</th>
                            <th class="text-left">Severity</th>
                            <th class="text-left">Related to Indication</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="mh-tbody" class="ph-table-body">
                        ${renderMedHistRows(records, user, canWrite)}
                    </tbody>
                </table>
            </div>
            <div id="mh-empty" class="${records.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="clipboard-list" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No medical history records found.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    function applyFilters() {
        const search = document.getElementById('mh-search').value.toLowerCase();
        const status = document.getElementById('mh-status-filter').value;
        let filtered = _allMedHist;
        if (search) filtered = filtered.filter(r =>
            r.subjectCode?.toLowerCase().includes(search) ||
            r.condition?.toLowerCase().includes(search)
        );
        if (status) filtered = filtered.filter(r => r.status === status);
        document.getElementById('mh-tbody').innerHTML = renderMedHistRows(filtered, user, canWrite);
        document.getElementById('mh-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('mh-search').addEventListener('input', applyFilters);
    document.getElementById('mh-status-filter').addEventListener('change', applyFilters);
}

function renderMedHistRows(records, user, canWrite) {
    if (!records.length) return '';
    const canQuery = ['cra', 'admin'].includes(user.role);
    return records.map(r => `
        <tr>
            <td class="text-xs font-semibold font-mono text-slate-800">${esc(r.subjectCode || '—')}</td>
            <td>
                <p class="text-xs font-medium text-slate-800">${esc(r.condition)}</p>
                ${r.notes ? `<p class="text-xs text-slate-400 mt-0.5 line-clamp-1">${esc(r.notes)}</p>` : ''}
            </td>
            <td class="text-xs font-mono text-slate-600">${esc(r.icdCode) || '—'}${r.icdVersion ? ` <span class="text-slate-400">(${esc(r.icdVersion)})</span>` : ''}</td>
            <td class="text-xs text-slate-600 whitespace-nowrap">${fmtDate(r.onsetDate)}</td>
            <td>${statusBadge(r.status)}</td>
            <td>${severityBadge(r.severity)}</td>
            <td class="text-xs text-center">
                ${r.isRelatedToIndication
                    ? `<span class="badge" style="background:#EDE9FE;color:#5B21B6;border:1px solid #DDD6FE">Yes</span>`
                    : `<span class="text-slate-400">No</span>`}
            </td>
            <td class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                    ${canQuery ? `<button ${actionAttributes('query', [r.subjectId, null, 'medical_history', 'Med Hx: ' + (r.condition || '')])}
                        class="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded transition" title="Raise Query">
                        <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                    ${canWrite ? `
                    <button onclick="openMedHistForm(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition" title="Edit">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="deleteMedHist(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`).join('');
}

function initICDWidget(existingCode, existingVersion) {
    const searchEl  = document.getElementById('mh-icd-search');
    const hiddenEl  = document.getElementById('mh-icd-code');
    const dropdown  = document.getElementById('mh-icd-dropdown');
    const versionEl = document.getElementById('mh-icd-version');
    if (!searchEl || !hiddenEl || !dropdown || !versionEl) return;

    if (existingCode) {
        const codes = ICD_VERSIONS[existingVersion] || [];
        const found = codes.find(c => c.code === existingCode);
        searchEl.value = found ? `${found.code} — ${found.description}` : existingCode;
    }

    function getVersionCodes() {
        return ICD_VERSIONS[versionEl.value] || [];
    }

    function renderDropdown(filter) {
        const codes = getVersionCodes();
        if (!codes.length) {
            dropdown.innerHTML = `<p class="text-xs text-slate-400 text-center py-3 px-3">Select an ICD version first</p>`;
            dropdown.classList.remove('hidden');
            return;
        }
        const q = filter.toLowerCase().trim();
        const matches = q
            ? codes.filter(c => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)).slice(0, 60)
            : codes.slice(0, 60);
        if (!matches.length) {
            dropdown.innerHTML = `<p class="text-xs text-slate-400 text-center py-3">No codes match "${esc(filter)}"</p>`;
        } else {
            dropdown.innerHTML = matches.map(c => `
                <button type="button" data-code="${c.code.replace(/"/g,'&quot;')}" data-desc="${c.description.replace(/"/g,'&quot;')}"
                    class="w-full text-left px-3 py-2 hover:bg-blue-50 transition flex items-start gap-2 border-b border-slate-50 last:border-0">
                    <span class="font-mono font-semibold text-blue-700 shrink-0 w-16 text-xs">${c.code}</span>
                    <span class="text-slate-700 text-xs leading-snug">${c.description}</span>
                </button>`).join('');
        }
        dropdown.classList.remove('hidden');
    }

    function hideDropdown() { dropdown.classList.add('hidden'); }

    searchEl.addEventListener('focus', () => renderDropdown(searchEl.value));
    searchEl.addEventListener('input', () => {
        hiddenEl.value = '';
        renderDropdown(searchEl.value);
    });

    dropdown.addEventListener('mousedown', e => {
        const btn = e.target.closest('button[data-code]');
        if (!btn) return;
        e.preventDefault();
        const code = btn.dataset.code;
        const desc = btn.dataset.desc;
        hiddenEl.value = code;
        searchEl.value = `${code} — ${desc}`;
        const condEl = document.getElementById('mh-condition');
        if (condEl && !condEl.value.trim()) condEl.value = desc;
        hideDropdown();
    });

    searchEl.addEventListener('blur', () => setTimeout(hideDropdown, 150));

    versionEl.addEventListener('change', () => {
        hiddenEl.value = '';
        searchEl.value = '';
        hideDropdown();
    });
}

window.openMedHistForm = async function(recordId = null) {
    const isEdit = recordId !== null;

    let subjects = [];
    try { subjects = await api.getSubjects(); } catch {}

    let rec = {};
    if (isEdit) {
        try { rec = await api.request(`/api/medhistory/${recordId}`); } catch {}
    }

    const subjectOptions = subjects.map(s =>
        `<option value="${s.id}" ${rec.subjectId === s.id ? 'selected' : ''}>${esc(s.subject_code)}</option>`
    ).join('');

    showModal({
        title: isEdit ? 'Edit Medical History' : 'Add Medical History',
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Subject <span class="text-red-500">*</span></label>
                    <select id="mh-subject-id" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select Subject —</option>
                        ${subjectOptions}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Condition <span class="text-red-500">*</span></label>
                    <input type="text" id="mh-condition" value="${esc(rec.condition)}" placeholder="e.g. Type 2 Diabetes Mellitus"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">ICD Version</label>
                    <select id="mh-icd-version" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option ${rec.icdVersion === 'ICD-10' ? 'selected' : ''}>ICD-10</option>
                        <option ${rec.icdVersion === 'ICD-11' ? 'selected' : ''}>ICD-11</option>
                        <option ${rec.icdVersion === 'ICD-9' ? 'selected' : ''}>ICD-9</option>
                    </select>
                </div>
                <div>
                    <label class="ph-label">ICD Code</label>
                    <div class="relative" id="mh-icd-wrapper">
                        <input type="text" id="mh-icd-search" autocomplete="off"
                            placeholder="Search code or diagnosis…"
                            class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                        <input type="hidden" id="mh-icd-code" value="${esc(rec.icdCode || '')}">
                        <div id="mh-icd-dropdown"
                            class="hidden absolute z-[200] left-0 right-0 top-full mt-0.5 bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                        </div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Onset Date</label>
                    <input type="date" id="mh-onset" value="${rec.onsetDate ? rec.onsetDate.split('T')[0] : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Resolution Date</label>
                    <input type="date" id="mh-resolution" value="${rec.resolutionDate ? rec.resolutionDate.split('T')[0] : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Status</label>
                    <select id="mh-status" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option ${rec.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option ${rec.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                        <option ${rec.status === 'Unknown' ? 'selected' : ''}>Unknown</option>
                    </select>
                </div>
                <div>
                    <label class="ph-label">Severity</label>
                    <div class="flex items-center gap-4 pt-2">
                        ${['Mild','Moderate','Severe','Unknown'].map(sev => `
                        <label class="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                            <input type="radio" name="mh-severity" value="${sev}" ${rec.severity === sev ? 'checked' : ''} class="w-3.5 h-3.5">
                            ${sev}
                        </label>`).join('')}
                    </div>
                </div>
            </div>
            <div>
                <label class="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" id="mh-related" ${rec.isRelatedToIndication ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300">
                    <span class="text-sm font-medium text-slate-700">Related to Study Indication</span>
                </label>
            </div>
            <div>
                <label class="ph-label">Notes</label>
                <textarea id="mh-notes" rows="2" placeholder="Additional clinical notes…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(rec.notes)}</textarea>
            </div>
            ${isEdit ? `
            <div>
                <label class="ph-label">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="mh-rfc" placeholder="Required — explain what changed and why"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none">
            </div>` : ''}
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitMedHistForm(${recordId})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-4 h-4"></i> ${isEdit ? 'Save Changes' : 'Add Record'}
        </button>`,
    });

    initICDWidget(rec.icdCode || null, rec.icdVersion || null);
};

window.submitMedHistForm = async function(recordId) {
    const isEdit = recordId !== null;
    const subjectId = document.getElementById('mh-subject-id').value;
    const condition = document.getElementById('mh-condition').value.trim();
    if (!subjectId || !condition) { showToast('Subject and condition are required.', 'error'); return; }

    const severity = document.querySelector('input[name="mh-severity"]:checked')?.value || null;

    const payload = {
        subjectId: Number(subjectId),
        condition,
        icdCode:               (() => {
            const hidden = document.getElementById('mh-icd-code').value.trim();
            if (hidden) return hidden;
            const raw = (document.getElementById('mh-icd-search').value || '').split('—')[0].trim();
            return raw || null;
        })(),
        icdVersion:            document.getElementById('mh-icd-version').value || null,
        onsetDate:             document.getElementById('mh-onset').value || null,
        resolutionDate:        document.getElementById('mh-resolution').value || null,
        status:                document.getElementById('mh-status').value || null,
        severity,
        isRelatedToIndication: document.getElementById('mh-related').checked,
        notes:                 document.getElementById('mh-notes').value.trim() || null,
    };

    if (isEdit) {
        const rfc = document.getElementById('mh-rfc')?.value?.trim();
        if (!rfc) { showToast('Reason for change is required.', 'error'); return; }
        payload.reason = rfc;
    }

    try {
        if (isEdit) {
            await api.request(`/api/medhistory/${recordId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        } else {
            await api.request('/api/medhistory', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeModal();
        showToast(isEdit ? 'Medical history updated.' : 'Medical history record added.', 'success');
        await renderMedHistory(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteMedHist = async function(recordId) {
    const reason = prompt('Reason for deletion (required):');
    if (!reason) return;
    try {
        await api.request(`/api/medhistory/${recordId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
        showToast('Record deleted.', 'success');
        await renderMedHistory(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};
````

## `src/frontend/js/modules/randomization.js`

````javascript
import { actionAttributes } from './visit-actions.js';
// ============================================================
// Randomization Module — Blinded treatment assignment (Admin only)
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

function fmtDT(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export async function renderRandomization() {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const user = api.getCurrentUser();
    if (!['admin', 'pi', 'investigator'].includes(user.role)) {
        content.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200">
            <p class="text-sm font-semibold text-red-800 mb-1">Access Restricted</p>
            <p class="text-sm text-red-700">Randomization is restricted to Administrators, Principal Investigators, and Investigators to maintain trial integrity.</p>
        </div></div>`;
        return;
    }
    const isAdmin = user.role === 'admin';

    let assignments, stats, listRows;
    try {
        [assignments, stats, listRows] = await Promise.all([
            api.getRandomization(),
            api.getRandomizationStats(),
            // Full randomization list (with unblinded arms) is admin-only
            isAdmin ? api.getRandomizationList() : Promise.resolve(null),
        ]);
    } catch (err) {
        content.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    const armCounts = {};
    for (const a of assignments) {
        if (!a.isBlinded) {
            armCounts[a.treatmentArm] = (armCounts[a.treatmentArm] || 0) + 1;
        }
    }

    content.innerHTML = `
    <div class="p-5 space-y-5">

        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Randomization</h2>
                <p class="text-xs text-slate-500 mt-0.5">Blinded treatment assignment — ICH E9 / E9(R1) statistical principles</p>
            </div>
            <div class="flex gap-2">
                ${isAdmin ? `
                <button onclick="openUploadModal()"
                    class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded-md transition">
                    <i data-lucide="upload" class="w-4 h-4"></i> Upload List
                </button>` : ''}
                <button onclick="openRandomizeModal()"
                    class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition">
                    <i data-lucide="shuffle" class="w-4 h-4"></i> Randomize Subject
                </button>
            </div>
        </div>

        <!-- Blinding alert -->
        <div class="flex items-start gap-3 p-4 rounded-md border" style="background:#FEF3C7;border-color:#FCD34D">
            <i data-lucide="lock" class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:#92400E"></i>
            <div class="text-xs" style="color:#92400E">
                <p class="font-semibold mb-0.5">Blinding Control — Administrator Only</p>
                <p>Treatment arm assignments are blinded by default. Unblinding creates a permanent, time-stamped audit record. Emergency unblinding must be documented with clinical justification.</p>
            </div>
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total Slots</p>
                <p class="kpi-number text-slate-700">${stats.totalSlots}</p>
            </div>
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Available</p>
                <p class="kpi-number text-emerald-600">${stats.available}</p>
            </div>
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Randomized</p>
                <p class="kpi-number text-blue-700">${stats.randomized}</p>
            </div>
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Unblinded</p>
                <p class="kpi-number text-amber-600">${stats.unblinded}</p>
            </div>
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Used Slots</p>
                <p class="kpi-number text-slate-500">${stats.usedSlots}</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

            <!-- Assignments -->
            <div class="lg:col-span-2 ph-card overflow-hidden">
                <div class="ph-card-header">
                    <h3><i data-lucide="shuffle" class="w-4 h-4 text-slate-400"></i> Subject Assignments</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="ph-table-head">
                            <tr>
                                <th class="text-left">Subject</th>
                                <th class="text-left">Rand Code</th>
                                <th class="text-left">Treatment Arm</th>
                                <th class="text-left">Stratum</th>
                                <th class="text-left">Randomized</th>
                                <th class="text-right">Unblind</th>
                            </tr>
                        </thead>
                        <tbody class="ph-table-body">
                            ${assignments.length === 0
                                ? `<tr><td colspan="6" class="text-center py-8 text-sm text-slate-400">No subjects randomized yet.</td></tr>`
                                : assignments.map(a => `
                            <tr>
                                <td class="text-xs font-semibold font-mono text-slate-800">${esc(a.subjectCode)}</td>
                                <td><code class="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">${esc(a.randCode)}</code></td>
                                <td>
                                    ${a.isBlinded
                                        ? `<span class="badge" style="background:#F1F5F9;color:#94A3B8;border:1px solid #CBD5E1">
                                            <i class="inline-block w-3 h-3 mr-1">🔒</i> BLINDED
                                           </span>`
                                        : `<span class="badge" style="background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7">${esc(a.treatmentArm)}</span>
                                           <p class="text-xs text-amber-600 mt-0.5">Unblinded ${fmtDT(a.unblindedAt)}</p>`}
                                </td>
                                <td class="text-xs text-slate-500">${esc(a.stratum || '—')}</td>
                                <td class="text-xs text-slate-500 whitespace-nowrap">
                                    <p>${esc(a.randomizedByName)}</p>
                                    <p class="text-slate-400">${fmtDT(a.randomizedAt)}</p>
                                </td>
                                <td class="text-right">
                                    ${a.isBlinded ? (isAdmin ? `
                                    <button ${actionAttributes('unblind', [a.id, a.subjectCode])}
                                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition border border-amber-200">
                                        <i data-lucide="eye" class="w-3 h-3"></i> Unblind
                                    </button>` : `<span class="text-xs text-slate-300">🔒</span>`) : `<span class="text-xs text-slate-300">Unblinded</span>`}
                                </td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- List Preview (admin only — reveals treatment arms) -->
            ${isAdmin ? `
            <div class="ph-card overflow-hidden">
                <div class="ph-card-header">
                    <h3><i data-lucide="list" class="w-4 h-4 text-slate-400"></i> Randomization List</h3>
                    <span class="text-xs text-slate-400">${listRows.length} total</span>
                </div>
                <div class="max-h-64 overflow-y-auto">
                    ${listRows.length === 0
                        ? `<div class="p-4 text-center text-sm text-slate-400">No list uploaded yet.</div>`
                        : `<table class="min-w-full text-xs">
                            <thead class="ph-table-head sticky top-0">
                                <tr><th class="text-left">Code</th><th class="text-left">Arm</th><th class="text-left">Stratum</th><th class="text-left">Used</th></tr>
                            </thead>
                            <tbody class="ph-table-body">
                                ${listRows.map(r => `<tr class="${r.isUsed ? 'opacity-40' : ''}">
                                    <td><code class="font-mono">${esc(r.randCode)}</code></td>
                                    <td>${esc(r.treatmentArm)}</td>
                                    <td>${esc(r.stratum || '—')}</td>
                                    <td>${r.isUsed ? '✓' : ''}</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>`}
                </div>
            </div>` : `
            <div class="ph-card p-5">
                <p class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Randomization List</p>
                <p class="text-xs text-slate-400">The full randomization list (with treatment arms) is visible to Administrators only, to preserve blinding.</p>
            </div>`}
        </div>
    </div>`;

    lucide.createIcons();
}

window.openUploadModal = function() {
    showModal({
        title: 'Upload Randomization List',
        size: 'md',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#FEF3C7;border-color:#FDE68A;color:#92400E">
                <i data-lucide="lock" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                Upload a pre-generated randomization list. Each code maps to a blinded treatment arm. The list must be generated by a statistician per the study protocol.
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    JSON Randomization List <span class="text-red-500">*</span>
                </label>
                <p class="text-xs text-slate-400 mb-2">Format: array of <code class="bg-slate-100 px-1 rounded">{"randCode":"R001","treatmentArm":"Active","stratum":"Male"}</code></p>
                <textarea id="rand-list-json" rows="8" placeholder='[&#10;  {"randCode": "R001", "treatmentArm": "Active", "stratum": "Male"},&#10;  {"randCode": "R002", "treatmentArm": "Placebo", "stratum": "Male"}&#10;]'
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-xs ph-input outline-none font-mono resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitRandList()" class="px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="upload" class="w-4 h-4"></i> Upload
        </button>`,
    });
};

window.submitRandList = async function() {
    const raw = document.getElementById('rand-list-json').value.trim();
    if (!raw) { showToast('JSON list is required.', 'error'); return; }
    let entries;
    try {
        entries = JSON.parse(raw);
        if (!Array.isArray(entries)) throw new Error('Expected an array');
    } catch (e) {
        showToast(`Invalid JSON: ${e.message}`, 'error'); return;
    }
    try {
        const result = await api.uploadRandomizationList(entries);
        closeModal();
        showToast(`Uploaded ${result.uploaded} of ${result.total} entries.`, 'success');
        await renderRandomization();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.openRandomizeModal = function() {
    showModal({
        title: 'Randomize Subject',
        size: 'sm',
        body: `
        <div class="space-y-4">
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Subject Code <span class="text-red-500">*</span></label>
                <input type="text" id="rand-subject" placeholder="e.g. SITE01-001"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Stratum (optional)</label>
                <input type="text" id="rand-stratum" placeholder="e.g. Male, ≥65y, Site01"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                <p class="text-xs text-slate-400 mt-1">Assigns the next available slot matching this stratum.</p>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitRandomize()" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="shuffle" class="w-4 h-4"></i> Randomize
        </button>`,
    });
};

window.submitRandomize = async function() {
    const subjectCode = document.getElementById('rand-subject').value.trim();
    const stratum     = document.getElementById('rand-stratum').value.trim() || null;
    if (!subjectCode) { showToast('Subject code is required.', 'error'); return; }

    let subjectId;
    try {
        const subjects = await api.getSubjects({ search: subjectCode });
        const match = subjects.find(s => s.subject_code === subjectCode);
        if (!match) { showToast(`Subject "${subjectCode}" not found.`, 'error'); return; }
        subjectId = match.id;
    } catch { showToast('Could not resolve subject.', 'error'); return; }

    try {
        const result = await api.randomizeSubject(subjectId, stratum);
        closeModal();
        showToast(`Subject ${subjectCode} randomized — Code: ${result.randCode} (arm blinded)`, 'success');
        await renderRandomization();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.openUnblindModal = function(assignmentId, subjectCode) {
    showModal({
        title: 'Emergency Unblinding',
        size: 'md',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B">
                <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                <div>
                    <p class="font-semibold mb-0.5">Irreversible Action — Subject: ${esc(subjectCode)}</p>
                    <p>Unblinding creates a permanent audit record with timestamp, user identity, and stated reason. This action cannot be undone. Only proceed if clinically required (e.g. medical emergency, death, SAE).</p>
                </div>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Clinical Justification <span class="text-red-500">*</span></label>
                <textarea id="unblind-reason" rows="3" placeholder="State the specific clinical reason requiring unblinding (e.g. Serious adverse event — suspected drug toxicity; physician requires treatment arm for management)…"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitUnblind(${assignmentId})" class="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="eye" class="w-4 h-4"></i> Confirm Unblinding
        </button>`,
    });
};

window.submitUnblind = async function(assignmentId) {
    const reason = document.getElementById('unblind-reason').value.trim();
    if (!reason) { showToast('Clinical justification is required.', 'error'); return; }
    try {
        await api.unblindSubject(assignmentId, reason);
        closeModal();
        showToast('Unblinding recorded. Audit trail updated.', 'success');
        await renderRandomization();
    } catch (err) {
        showToast(err.message, 'error');
    }
};
````

## `src/frontend/js/modules/subjects.js`

````javascript
import { actionAttributes, visitActionAttributes } from './visit-actions.js';
import { saveEnrollment } from './enrollment-save.js';
// ============================================================
// Subjects View — List, Detail, GCP-compliant Study Visits
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';
import { DEFAULT_IE_CRITERIA, hasCriteria } from './iecriteria.js';

const STATUS_BADGE = {
    Active:          'badge badge-active',
    Locked:          'badge badge-locked',
    Withdrawn:       'badge badge-withdrawn',
    Completed:       'badge badge-completed',
    'Screen Failed': 'badge badge-withdrawn',
};

const VISIT_STATUS_BADGE = {
    Scheduled:    'badge bg-slate-100 text-slate-600',
    'In Progress':'badge badge-saved',
    Complete:     'badge badge-completed',
    Missed:       'badge badge-withdrawn',
};

// GCP Protocol Visit Templates — ICH E6 (R3)
const VISIT_TEMPLATES = [
    { code: 'V01', name: 'Screening',             order: 1,  study_day: -7,  window_days: 7,  type: 'Scheduled' },
    { code: 'V02', name: 'Baseline / Day 1',       order: 2,  study_day: 1,   window_days: 0,  type: 'Scheduled' },
    { code: 'V03', name: 'Week 2 (Day 14)',        order: 3,  study_day: 14,  window_days: 3,  type: 'Scheduled' },
    { code: 'V04', name: 'Week 4 (Day 28)',        order: 4,  study_day: 28,  window_days: 3,  type: 'Scheduled' },
    { code: 'V05', name: 'Week 8 (Day 56)',        order: 5,  study_day: 56,  window_days: 5,  type: 'Scheduled' },
    { code: 'V06', name: 'Week 12 (Day 84)',       order: 6,  study_day: 84,  window_days: 7,  type: 'Scheduled' },
    { code: 'V07', name: 'Month 6 (Day 180)',      order: 7,  study_day: 180, window_days: 7,  type: 'Scheduled' },
    { code: 'V08', name: 'Month 9 (Day 270)',      order: 8,  study_day: 270, window_days: 7,  type: 'Scheduled' },
    { code: 'V09', name: 'End of Study (Day 365)', order: 9,  study_day: 365, window_days: 7,  type: 'Scheduled' },
    { code: 'V10', name: 'Follow-up (Day 393)',    order: 10, study_day: 393, window_days: 14, type: 'Scheduled' },
    { code: 'UNS', name: 'Unscheduled Visit',      order: 99, study_day: null, window_days: null, type: 'Unscheduled' },
    { code: 'CUS', name: null,                     order: 98, study_day: null, window_days: null, type: 'Scheduled' },
];

function statusBadge(status, map = STATUS_BADGE) {
    const cls = map[status] || 'badge bg-slate-100 text-slate-600';
    return `<span class="${cls}">${esc(status || '—')}</span>`;
}

function complianceBadge(compliance) {
    if (!compliance || compliance === 'N/A') {
        return `<span class="badge bg-slate-100 text-slate-400">—</span>`;
    }
    if (compliance === 'On Schedule') {
        return `<span class="badge" style="background:#D1FAE5;color:#065F46;border:1px solid #A7F3D0">On Schedule</span>`;
    }
    if (compliance.includes('Out of Window')) {
        return `<span class="badge" style="background:#FEE2E2;color:#991B1B;border:1px solid #FECACA">${esc(compliance)}</span>`;
    }
    return `<span class="badge" style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A">${esc(compliance)}</span>`;
}

function fmt(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function plannedFromStudyDay(enrollmentDate, studyDay) {
    if (!enrollmentDate || studyDay == null) return '';
    const d = new Date(enrollmentDate);
    d.setDate(d.getDate() + (studyDay - 1));
    return d.toISOString().split('T')[0];
}

function esc(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

// ============================================================
// Subject List
// ============================================================
export async function renderSubjects({ showNewForm = false } = {}) {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const user     = api.getCurrentUser();
    const subjects = await api.getSubjects();

    content.innerHTML = `
    <div class="p-5 space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Study Subjects</h2>
                <p class="text-xs text-slate-500 mt-0.5">${subjects.length} subject${subjects.length !== 1 ? 's' : ''} enrolled across all sites</p>
            </div>
            ${['investigator', 'pi', 'admin', 'crc'].includes(user?.role) ? `
            <button onclick="openNewSubjectModal()"
                class="flex items-center gap-2 btn-primary px-4 py-2 text-sm rounded-md">
                <i data-lucide="user-plus" class="w-4 h-4"></i> Enroll Subject
            </button>` : ''}
        </div>

        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="subject-search" placeholder="Search subject code, initials, site…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <select id="status-filter"
                    class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Withdrawn">Withdrawn</option>
                    <option value="Screen Failed">Screen Failed</option>
                </select>
            </div>
        </div>

        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">Subject Code</th>
                            <th class="text-left">Site</th>
                            <th class="text-left">Demographics</th>
                            <th class="text-left">Enrolled (Day 1)</th>
                            <th class="text-left">Status</th>
                            <th class="text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody id="subject-table-body" class="ph-table-body">
                        ${renderSubjectRows(subjects)}
                    </tbody>
                </table>
            </div>
            <div id="no-results" class="${subjects.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="users" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p class="font-medium text-slate-500">No subjects enrolled yet.</p>
                <p class="mt-1 text-xs">Use "Enroll Subject" to add the first study participant.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    async function applyFilters() {
        const search = document.getElementById('subject-search').value;
        const status = document.getElementById('status-filter').value;
        const filtered = await api.getSubjects({ search, status });
        document.getElementById('subject-table-body').innerHTML = renderSubjectRows(filtered);
        document.getElementById('no-results').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('subject-search').addEventListener('input', applyFilters);
    document.getElementById('status-filter').addEventListener('change', applyFilters);

    if (showNewForm) openNewSubjectModal();
}

function renderSubjectRows(subjects) {
    if (subjects.length === 0) return '';
    return subjects.map(s => `
    <tr class="cursor-pointer" onclick="navigate('subjects/${s.id}')">
        <td>
            <p class="text-sm font-semibold text-slate-900 font-mono">${esc(s.subject_code)}</p>
            <p class="text-xs text-slate-400">Initials: ${esc(s.initial)}</p>
        </td>
        <td class="text-sm text-slate-600">${esc(s.site_name)}</td>
        <td class="text-sm text-slate-600">
            ${s.sex === 'M' ? 'Male' : s.sex === 'F' ? 'Female' : 'Unknown'}
            <span class="text-slate-400 ml-1 text-xs">· ${fmt(s.dob)}</span>
        </td>
        <td class="text-sm text-slate-600">${fmt(s.enrollment_date)}</td>
        <td>${statusBadge(s.status)}</td>
        <td class="text-right">
            <a href="#subjects/${s.id}" onclick="event.stopPropagation()"
                class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline transition">
                View <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </a>
        </td>
    </tr>`).join('');
}

// ============================================================
// New Subject Modal
// ============================================================
// ── I/E Criteria for the study currently being enrolled into ───────────────
// Resolved per study when the modal opens; falls back to the app default set
// (ICH E6 R3 compliant) when the study has none configured.
let _activeIeCriteria = DEFAULT_IE_CRITERIA;
let enrollmentSaving = false;
let enrollmentNeedsReview = false;

window.openNewSubjectModal = async function () {
    if (enrollmentSaving) return;
    enrollmentNeedsReview = false;
    const user = api.getCurrentUser();
    if (!['admin', 'investigator', 'pi', 'crc'].includes(user.role)) {
        showToast('You do not have permission to enroll subjects.', 'error');
        return;
    }
    // Load this study's configured criteria; fall back to the default set.
    window._consentData = null;   // fresh enrollment — no carried-over consent
    _activeIeCriteria = DEFAULT_IE_CRITERIA;
    const cur = api.getCurrentStudy();
    if (!cur?.id) { showToast('Select your study again before enrolling a subject.', 'error'); return; }
    if (cur?.id) {
        try {
            const study = await api.getStudy(cur.id);
            if (hasCriteria(study?.ieCriteria)) _activeIeCriteria = study.ieCriteria;
        } catch { showToast('Study criteria could not be loaded. Check your connection before enrolling a subject.', 'error'); return; }
    }
    openIECriteriaModal();
};

window.openIECriteriaModal = function openIECriteriaModal() {
    const inclusionHtml = _activeIeCriteria.inclusion.map(c => `
    <label class="flex items-start gap-3 p-3 rounded-md border border-slate-200 cursor-pointer hover:bg-green-50 hover:border-green-300 transition">
        <input type="checkbox" id="${c.key}" class="mt-0.5 w-4 h-4 accent-green-600 flex-shrink-0">
        <span class="text-sm text-slate-700">${esc(c.label)}</span>
    </label>`).join('');

    const exclusionHtml = _activeIeCriteria.exclusion.map(c => `
    <label class="flex items-start gap-3 p-3 rounded-md border border-slate-200 cursor-pointer hover:bg-red-50 hover:border-red-300 transition">
        <input type="checkbox" id="${c.key}" class="mt-0.5 w-4 h-4 accent-red-600 flex-shrink-0">
        <span class="text-sm text-slate-700">${esc(c.label)}</span>
    </label>`).join('');

    showModal({
        title: 'Step 1 of 3 — Inclusion / Exclusion Criteria',
        size: 'lg',
        body: `
        <div class="space-y-5">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#EBF2FD;border-color:#BFD7F5;color:#1554A0">
                <i data-lucide="info" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                Verify all criteria before enrolling the subject. Failed criteria will automatically set status to <strong>Screen Failed</strong> per ICH GCP E6(R3) §4.3.
            </div>
            <div>
                <p class="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Inclusion Criteria — all must be met
                </p>
                <div class="space-y-2">${inclusionHtml}</div>
            </div>
            <div>
                <p class="text-xs font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <i data-lucide="x-circle" class="w-3.5 h-3.5"></i> Exclusion Criteria — none must apply
                </p>
                <div class="space-y-2">${exclusionHtml}</div>
            </div>
            <div id="ie-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"></div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="proceedFromIE()" class="flex items-center gap-2 px-4 py-2 text-sm btn-primary rounded-md">
            Next: Subject Demographics <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </button>`,
    });
}

window.proceedFromIE = async function () {
    const errEl = document.getElementById('ie-error');
    errEl.classList.add('hidden');

    const results = {};
    let allInclusionMet = true;
    let anyExclusionMet = false;

    _activeIeCriteria.inclusion.forEach(c => {
        const checked = document.getElementById(c.key)?.checked;
        results[c.key] = { label: c.label, type: 'inclusion', met: !!checked };
        if (!checked) allInclusionMet = false;
    });
    _activeIeCriteria.exclusion.forEach(c => {
        const checked = document.getElementById(c.key)?.checked;
        results[c.key] = { label: c.label, type: 'exclusion', met: !!checked };
        if (checked) anyExclusionMet = true;
    });

    const passes = allInclusionMet && !anyExclusionMet;

    if (!passes) {
        const reasons = [];
        if (!allInclusionMet) reasons.push('Not all inclusion criteria are met');
        if (anyExclusionMet)  reasons.push('One or more exclusion criteria apply');
        errEl.innerHTML = `<strong>Subject does not qualify for enrollment:</strong><br>${reasons.join('<br>')}.<br><br>Proceeding will enroll with <strong>Screen Failed</strong> status.`;
        errEl.classList.remove('hidden');
    }

    window._ieCriteriaResults = Object.values(results);
    window._iePasses = passes;
    openConsentModal(passes);
};

// ── Step 2 of 3 — Informed Consent ─────────────────────────────────────────
// Consent is a real, documented event that must be obtained BEFORE any study
// procedure (ICH GCP E6(R3) §4.8). It is captured here by the coordinator — it
// is NEVER auto-generated. Required to enroll; optional for a screen failure.
window.openConsentModal = function openConsentModal() {
    const iePasses = window._iePasses !== false;
    const today = new Date().toISOString().split('T')[0];
    const prev  = window._consentData || {};

    const note = iePasses ? `
    <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#EBF2FD;border-color:#BFD7F5;color:#1554A0">
        <i data-lucide="info" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
        Enter the details of the <strong>signed</strong> informed consent. Consent must be obtained before any study procedure (ICH GCP E6(R3) §4.8).
    </div>` : `
    <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#FFFBEB;border-color:#FDE68A;color:#92400E">
        <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
        Optional for a screen failure — fill only if consent was obtained before screening.
    </div>`;

    showModal({
        title: 'Step 2 of 3 — Informed Consent',
        size: 'md',
        body: `
        <form id="consent-form" class="space-y-4" novalidate>
            ${note}
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">ICF Version ${iePasses ? '<span class="text-red-500">*</span>' : ''}</label>
                    <input type="text" id="cs-version" maxlength="60" value="${esc(prev.consentVersion ?? '')}" placeholder="e.g. ICF v2.0 (2026-01-15)"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Consent Date ${iePasses ? '<span class="text-red-500">*</span>' : ''}</label>
                    <input type="date" id="cs-date" max="${today}" value="${esc(prev.consentDate ?? '')}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Consent Time</label>
                    <input type="time" id="cs-time" value="${esc(prev.consentTime ?? '')}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    <p class="text-xs text-slate-400 mt-1">Needed when screening happens the same day.</p>
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Obtained By ${iePasses ? '<span class="text-red-500">*</span>' : ''}</label>
                    <div id="cs-obtained-slot">
                        <input type="text" id="cs-obtained-name" maxlength="120" value="${esc(prev.obtainedByName ?? '')}"
                            placeholder="Investigator/delegate who conducted the consent discussion"
                            class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Language</label>
                    <select id="cs-language" class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        ${['Indonesian','English','Other'].map(l => `<option ${(prev.language ?? 'Indonesian') === l ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Witness Name <span class="font-normal normal-case text-slate-400">(if applicable)</span></label>
                    <input type="text" id="cs-witness" maxlength="120" value="${esc(prev.witnessName ?? '')}" placeholder="Name of witness"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none"
                        oninput="document.getElementById('cs-witness-type-wrap').classList.toggle('hidden', !this.value.trim())">
                </div>
                <div class="col-span-2 ${prev.witnessName ? '' : 'hidden'}" id="cs-witness-type-wrap">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Witness Capacity <span class="text-red-500">*</span></label>
                    <select id="cs-witness-type" class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select capacity —</option>
                        ${['Impartial Witness (Illiterate Subject)','Legally Authorized Representative','Parent / Guardian']
                            .map(w => `<option ${prev.witnessType === w ? 'selected' : ''}>${w}</option>`).join('')}
                    </select>
                </div>
                <div class="col-span-2 space-y-2.5 p-3 rounded-md border border-slate-200 bg-slate-50">
                    <label class="flex items-start gap-2.5 cursor-pointer">
                        <input type="checkbox" id="cs-copy" ${prev.copyProvided ? 'checked' : ''} class="mt-0.5 w-4 h-4 rounded border-slate-300">
                        <span class="text-xs text-slate-700"><span class="font-semibold">Signed ICF copy given to the subject</span>
                        <span class="block text-slate-400">ICH GCP §4.8.11 — required.</span></span>
                    </label>
                    <label class="flex items-start gap-2.5 cursor-pointer">
                        <input type="checkbox" id="cs-assent" ${prev.assentObtained ? 'checked' : ''} class="mt-0.5 w-4 h-4 rounded border-slate-300"
                            onchange="document.getElementById('cs-assent-date-wrap').classList.toggle('hidden', !this.checked)">
                        <span class="text-xs text-slate-700"><span class="font-semibold">Assent obtained (minor / unable to fully consent)</span>
                        <span class="block text-slate-400">ICH GCP §4.8.12 — does not replace the guardian's consent.</span></span>
                    </label>
                    <div id="cs-assent-date-wrap" class="${prev.assentObtained ? '' : 'hidden'} pl-6">
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Assent Date</label>
                        <input type="date" id="cs-assent-date" max="${today}" value="${esc(prev.assentDate ?? '')}"
                            class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    </div>
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Notes <span class="font-normal normal-case text-slate-400">(optional)</span></label>
                    <textarea id="cs-notes" rows="2" class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">${esc(prev.notes ?? '')}</textarea>
                </div>
            </div>
            <div id="cs-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"></div>
        </form>`,
        footer: `
        <button onclick="openIECriteriaModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition flex items-center gap-1.5">
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Back
        </button>
        <button id="cs-next" disabled onclick="proceedFromConsent()" class="flex items-center gap-2 px-4 py-2 text-sm btn-primary rounded-md">
            Next: Demographics <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </button>`,
    });

    // Swap the free-text consent taker for a delegated-staff picker once the
    // Delegation Log loads (ICH GCP E6(R3) §4.1.5). The text input stays as the
    // fallback so an empty Delegation Log does not block enrolment.
    api.getConsentDelegates().then(info => {
        const slot = document.getElementById('cs-obtained-slot');
        const nextButton = document.getElementById('cs-next');
        if (nextButton) nextButton.disabled = false;
        const delegates = info?.delegates ?? [];
        if (!slot || !delegates.length) return;
        const me = api.getCurrentUser();
        const preselect = prev.obtainedBy ?? me?.id;
        slot.innerHTML = `
            <select id="cs-obtained-by" class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                <option value="">— Select staff —</option>
                ${delegates.map(d =>
                    `<option value="${esc(d.userId)}" data-name="${esc(d.userName)}" ${d.userId === preselect ? 'selected' : ''}>${esc(d.userName)} — ${esc(d.userRole)}</option>`
                ).join('')}
            </select>
            <p class="text-xs text-slate-400 mt-1">Only staff delegated for "Informed Consent Process".</p>`;
    }).catch(() => {
        const error = document.getElementById('cs-error');
        if (error) {
            error.textContent = 'Consent delegation could not be loaded. Go back and reopen this step to try again.';
            error.classList.remove('hidden');
        }
    });
};

window.proceedFromConsent = function () {
    if (document.getElementById('cs-next')?.disabled) return;
    const iePasses = window._iePasses !== false;
    const errEl = document.getElementById('cs-error');
    errEl.classList.add('hidden');

    const consentVersion = document.getElementById('cs-version').value.trim();
    const consentDate    = document.getElementById('cs-date').value;
    const consentTime    = document.getElementById('cs-time').value;
    const language       = document.getElementById('cs-language').value;
    const witnessName    = document.getElementById('cs-witness').value.trim();
    const witnessType    = document.getElementById('cs-witness-type').value;
    const notes          = document.getElementById('cs-notes').value.trim();

    const obtainedSel    = document.getElementById('cs-obtained-by');
    const obtainedBy     = obtainedSel?.value || null;
    const obtainedByName = obtainedSel
        ? (obtainedSel.options[obtainedSel.selectedIndex]?.dataset.name ?? '')
        : document.getElementById('cs-obtained-name').value.trim();

    const assentObtained = !!document.getElementById('cs-assent').checked;
    const assentDate     = assentObtained ? document.getElementById('cs-assent-date').value : null;
    const copyProvided   = !!document.getElementById('cs-copy').checked;

    const anyFilled = consentVersion || consentDate || witnessName || notes || obtainedByName;

    const fail = (msg) => { errEl.textContent = msg; errEl.classList.remove('hidden'); };

    // Enrolled subjects MUST have consent; screen failures only need it complete
    // if the coordinator started filling it in.
    if ((iePasses || anyFilled) && (!consentVersion || !consentDate)) {
        return fail(iePasses
            ? 'ICF version and consent date are required to enroll a subject.'
            : 'Provide both ICF version and consent date, or leave the consent fields empty.');
    }
    // The consent taker is part of the consent record, not an optional extra
    if ((iePasses || anyFilled) && !obtainedByName) {
        return fail('Record who conducted the consent discussion (ICH GCP E6(R3) §4.8).');
    }
    if (witnessName && !witnessType) {
        return fail('Select the witness capacity — impartial witness, legal representative, or parent/guardian.');
    }

    window._consentData = (consentVersion && consentDate)
        ? {
            consentVersion, consentDate,
            consentTime: consentTime || null,
            language,
            obtainedBy, obtainedByName,
            witnessName: witnessName || null,
            witnessType: witnessType || null,
            assentObtained, assentDate,
            copyProvided,
            notes,
          }
        : null;
    openSubjectDemographicsModal(iePasses);
};

async function openSubjectDemographicsModal(iePasses) {
    const sites = await api.getSites();
    const user  = api.getCurrentUser();
    const today = new Date().toISOString().split('T')[0];

    const failWarning = !iePasses ? `
    <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#FEF2F2;border-color:#FECACA;color:#991B1B">
        <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
        <strong>Screen Failure:</strong>&nbsp;Subject failed I/E criteria. They will be enrolled with status <strong>Screen Failed</strong> for documentation purposes per ICH GCP E6(R3) §8.3.
    </div>` : `
    <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#F0FDF4;border-color:#A7F3D0;color:#065F46">
        <i data-lucide="check-circle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
        All I/E criteria satisfied. Subject qualifies for enrollment.
    </div>`;

    showModal({
        title: 'Step 3 of 3 — Subject Demographics',
        size: 'md',
        body: `
        <form id="new-subject-form" class="space-y-4" novalidate>
            ${failWarning}
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Subject Code <span class="text-red-500">*</span></label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono">S-</span>
                        <input type="text" id="ns-code" placeholder="001" maxlength="20"
                            class="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none font-mono">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Patient Initials <span class="text-red-500">*</span></label>
                    <input type="text" id="ns-initial" placeholder="e.g. J.D." maxlength="10"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Sex at Birth <span class="text-red-500">*</span>
                        <span class="ml-1 font-normal normal-case text-slate-400">(CDISC SDTM)</span>
                    </label>
                    <select id="ns-sex"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option value="M">M — Male</option>
                        <option value="F">F — Female</option>
                        <option value="U">U — Unknown</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Gender Identity
                        <span class="ml-1 font-normal normal-case text-slate-400">(optional)</span>
                    </label>
                    <select id="ns-gender-identity"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Prefer not to answer —</option>
                        <option value="Man">Man</option>
                        <option value="Woman">Woman</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Date of Birth <span class="text-red-500">*</span></label>
                    <input type="date" id="ns-dob" max="${today}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Enrollment Date (Day 1) <span class="text-red-500">*</span></label>
                    <input type="date" id="ns-enroll" value="${today}" max="${today}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Study Site <span class="text-red-500">*</span></label>
                    <select id="ns-site"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select Site —</option>
                        ${sites.map(s => `<option value="${s.id}" ${user.siteId === s.id ? 'selected' : ''}>${esc(s.site_code)} – ${esc(s.site_name)}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="ns-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"></div>
        </form>`,
        footer: `
        <button onclick="openConsentModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition flex items-center gap-1.5">
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Back
        </button>
        <button id="ns-submit" onclick="submitNewSubject()" class="px-4 py-2 text-sm btn-primary rounded-md">${iePasses ? 'Enroll Subject' : 'Record Screen Failure'}</button>`,
    });
}

window.submitNewSubject = async function () {
    if (enrollmentSaving || enrollmentNeedsReview) return;
    const codeRaw         = document.getElementById('ns-code').value.trim();
    const initial         = document.getElementById('ns-initial').value.trim();
    const sex             = document.getElementById('ns-sex').value;
    const gender_identity = document.getElementById('ns-gender-identity').value;
    const dob             = document.getElementById('ns-dob').value;
    const enroll          = document.getElementById('ns-enroll').value;
    const site_id         = document.getElementById('ns-site').value;
    const errEl           = document.getElementById('ns-error');

    errEl.classList.add('hidden');
    if (!codeRaw || !initial || !sex || !dob || !enroll || !site_id) {
        errEl.textContent = 'All fields marked * are required.';
        errEl.classList.remove('hidden');
        return;
    }
    const subject_code = codeRaw.startsWith('S-') ? codeRaw : `S-${codeRaw}`;
    const iePasses = window._iePasses !== false;

    enrollmentSaving = true;
    const submitButton = document.getElementById('ns-submit');
    if (submitButton) submitButton.disabled = true;
    try {
        const { subject: created, unconfirmed } = await saveEnrollment(api,
            { subject_code, initial, sex, gender_identity, dob, enrollment_date: enroll, site_id },
            { criteria: window._ieCriteriaResults, passed: iePasses, consent: window._consentData });
        enrollmentNeedsReview = true; // creation succeeded; never repeat it from this form
        if (unconfirmed.length) {
            showModal({
                title: 'Subject saved — follow-up records need review',
                body: `<div role="alert" class="space-y-3">
                    <p>Subject <strong>${esc(subject_code)}</strong> was created. Saving the ${esc(unconfirmed.join(' and '))} could not be confirmed.</p>
                    <p>Do not enroll this subject again. Review the existing subject and consent records with your study administrator before adding missing information.</p>
                    <p>The assessment answers remain in this tab until you start another enrollment or reload.</p>
                </div>`,
                footer: `<a href="#subjects/${encodeURIComponent(created.id)}" onclick="closeModal()" class="px-4 py-2 btn-primary rounded-md">Review saved subject</a>
                    <a href="#consents" onclick="closeModal()" class="px-4 py-2 border rounded-md">Review consent records</a>`,
            });
            return;
        }
        closeModal();
        window._ieCriteriaResults = null;
        window._iePasses = null;
        window._consentData = null;
        showToast(iePasses ? `Subject ${subject_code} enrolled successfully.` : `Subject ${subject_code} recorded as Screen Failed.`, iePasses ? 'success' : 'warning');
        try { await renderSubjects(); }
        catch { showToast('Subject saved, but the list could not be refreshed. Reload the list before making more changes.', 'error'); }
    } catch (err) {
        // A disconnected or failed server response does not prove creation failed.
        enrollmentNeedsReview = !err.status || err.status >= 500 || err.code === 'INVALID_RESPONSE';
        errEl.textContent = err.message + (enrollmentNeedsReview ? ' Review the subject list before starting another enrollment.' : '');
        errEl.classList.remove('hidden');
    } finally {
        enrollmentSaving = false;
        if (submitButton) submitButton.disabled = enrollmentNeedsReview;
    }
};

// ============================================================
// Subject Detail
// ============================================================
export async function renderSubjectDetail(id) {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const [subject, forms] = await Promise.all([
        api.getSubject(id),
        api.getCRFForms(),
    ]);
    const allEntries    = await api.getDataEntries(id);
    const user          = api.getCurrentUser();
    const canManageVisit = ['investigator', 'pi', 'admin', 'crc'].includes(user.role);

    content.innerHTML = `
    <div class="p-5 space-y-4">

        <!-- Subject Header -->
        <div class="ph-card p-5">
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style="background:#EBF2FD">
                    <i data-lucide="user" class="w-6 h-6" style="color:#1554A0"></i>
                </div>
                <div class="flex-1">
                    <div class="flex items-center gap-3 flex-wrap mb-1">
                        <h2 class="text-xl font-bold text-slate-900 font-mono">${esc(subject.subject_code)}</h2>
                        ${statusBadge(subject.status)}
                    </div>
                    <div class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        <span>Initials: <strong class="text-slate-700">${esc(subject.initial)}</strong></span>
                        <span>Sex: <strong class="text-slate-700">${subject.sex === 'M' ? 'Male' : subject.sex === 'F' ? 'Female' : 'Unknown'}</strong></span>
                        ${subject.gender_identity ? `<span>Gender: <strong class="text-slate-700">${esc(subject.gender_identity)}</strong></span>` : ''}
                        <span>DOB: <strong class="text-slate-700">${fmt(subject.dob)}</strong></span>
                        <span>Site: <strong class="text-slate-700">${esc(subject.site_name)}</strong></span>
                        <span>Enrollment (Day 1): <strong class="text-slate-700">${fmt(subject.enrollment_date)}</strong></span>
                    </div>
                </div>
                ${['admin', 'pi', 'investigator'].includes(user.role) && subject.status === 'Active' ? `
                <button onclick="openWithdrawModal(${subject.id})"
                    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-md transition">
                    <i data-lucide="user-x" class="w-3.5 h-3.5"></i> Withdraw
                </button>` : ''}
            </div>
        </div>

        <!-- Protocol Visit Schedule -->
        <div class="ph-card overflow-hidden">
            <div class="ph-card-header" style="display:flex;align-items:center;justify-content:space-between">
                <h3 style="display:flex;align-items:center;gap:8px;margin:0">
                    <i data-lucide="calendar-check" class="w-4 h-4 text-slate-400"></i>
                    Protocol Visit Schedule
                    <span class="text-xs font-normal text-slate-400">(${subject.visits.length} visit${subject.visits.length !== 1 ? 's' : ''})</span>
                </h3>
                ${canManageVisit ? `
                <button onclick="openAddVisitModal()"
                    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-primary rounded-md">
                    <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Visit
                </button>` : ''}
            </div>

            ${subject.visits.length === 0 ? `
            <div class="py-16 text-center text-slate-400 text-sm">
                <i data-lucide="calendar-off" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p class="font-medium text-slate-500">No visits scheduled.</p>
                ${canManageVisit ? '<p class="mt-1 text-xs">Use "Add Visit" to schedule the first protocol visit for this subject.</p>' : ''}
            </div>` : `
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-center" style="width:36px">#</th>
                            <th class="text-left">Visit Name / Type</th>
                            <th class="text-left">Planned Date</th>
                            <th class="text-left">Actual Date</th>
                            <th class="text-center">Study Day</th>
                            <th class="text-left">Window Compliance</th>
                            <th class="text-left">Status</th>
                            <th class="text-center">CRFs</th>
                            <th class="text-center">Investigator Signed</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="visit-tbody" class="ph-table-body">
                        ${subject.visits.map(v => renderVisitRow(v, forms, allEntries, canManageVisit)).join('')}
                    </tbody>
                </table>
            </div>`}
        </div>

        <!-- CRF Forms Panel (hidden until visit selected) -->
        <div id="crf-panel" class="hidden ph-card overflow-hidden">
            <div class="ph-card-header" style="display:flex;align-items:center;justify-content:space-between">
                <h3 style="display:flex;align-items:center;gap:8px;margin:0">
                    <i data-lucide="file-text" class="w-4 h-4 text-slate-400"></i>
                    <span id="crf-panel-title">CRF Forms</span>
                </h3>
                <button onclick="closeCRFPanel()"
                    class="p-1 text-slate-400 hover:text-slate-600 rounded transition">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div id="crf-panel-body"></div>
        </div>

        <!-- Subject-level Data Lock (ICH GCP E6(R3) 8.3.3) -->
        ${['admin', 'pi', 'cra', 'data_manager'].includes(user.role) ? `
        <div class="ph-card overflow-hidden">
            <div class="ph-card-header" style="display:flex;align-items:center;justify-content:space-between">
                <h3 style="display:flex;align-items:center;gap:8px;margin:0">
                    <i data-lucide="lock" class="w-4 h-4 text-slate-400"></i>
                    Subject Data Lock
                    <span class="text-xs font-normal text-slate-400">ICH GCP E6(R3) §8.3.3</span>
                </h3>
                <div class="flex gap-2">
                    <button onclick="openSubjectLockModal(false)"
                        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded-md transition">
                        <i data-lucide="lock" class="w-3 h-3"></i> Lock All
                    </button>
                    ${user.role === 'admin' ? `
                    <button onclick="openSubjectLockModal(true)"
                        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-300 hover:bg-amber-50 rounded-md transition">
                        <i data-lucide="lock-open" class="w-3 h-3"></i> Unlock All
                    </button>` : ''}
                </div>
            </div>
            <div id="subject-lock-status" class="p-4 text-sm text-slate-400">Loading…</div>
        </div>` : ''}

        <!-- Recent Activity -->
        <div class="ph-card overflow-hidden">
            <div class="ph-card-header">
                <h3><i data-lucide="shield-check" class="w-4 h-4 text-slate-400"></i> Recent Activity</h3>
                <a href="#audit" class="text-xs text-blue-600 hover:underline">Full Audit Trail →</a>
            </div>
            <div id="subject-audit" class="p-4 text-sm text-slate-400">Loading…</div>
        </div>
    </div>`;

    lucide.createIcons();

    // Subject lock status (async, non-blocking)
    if (['admin', 'pi', 'cra', 'data_manager'].includes(user.role)) {
        api.getSubjectLockStatus(id).then(data => {
            const el = document.getElementById('subject-lock-status');
            if (!el) return;
            el.innerHTML = renderSubjectLockStatus(data);
            lucide.createIcons();
        }).catch(() => {
            const el = document.getElementById('subject-lock-status');
            if (el) el.innerHTML = '<p class="text-xs text-slate-400">Unable to load lock status.</p>';
        });
    }

    // Audit trail (async, non-blocking)
    api.getAuditTrail().then(trails => {
        const auditEl = document.getElementById('subject-audit');
        if (!auditEl) return;
        const recent = trails.slice(0, 5);
        auditEl.innerHTML = recent.length === 0
            ? '<p class="text-center py-4 text-slate-400 text-sm">No activity recorded.</p>'
            : `<div class="overflow-x-auto"><table class="min-w-full"><tbody class="ph-table-body">
                ${recent.map(t => `
                <tr>
                    <td class="py-2 pr-3"><span class="badge ${auditBadge(t.action)}">${esc(t.action)}</span></td>
                    <td class="py-2 pr-3 text-xs text-slate-600">${esc(t.reason_for_change || '—')}</td>
                    <td class="py-2 text-xs text-slate-400 whitespace-nowrap">${esc(t.user_name)} · ${new Date(t.timestamp).toLocaleString('en-GB')}</td>
                </tr>`).join('')}
               </tbody></table></div>`;
        lucide.createIcons();
    });

    // Module-level state for modals
    window._currentSubject = subject;
    window._availableForms = forms;
    window._allEntries     = allEntries;
    window._subjectId      = Number(id);

    // ── Select Visit → Show CRF Panel ─────────────────────────
    window.selectVisit = function (visitId, visitName) {
        document.querySelectorAll('.visit-row').forEach(r => {
            r.classList.toggle('bg-blue-50', r.dataset.visitId === String(visitId));
        });

        const panelEl = document.getElementById('crf-panel');
        const titleEl = document.getElementById('crf-panel-title');
        const bodyEl  = document.getElementById('crf-panel-body');
        const entries = (window._allEntries || []).filter(e => e.visit_id === Number(visitId));
        const u       = api.getCurrentUser();

        // Filter forms to only those assigned to this visit; fallback to all if none assigned
        const visit     = (window._currentSubject?.visits || []).find(v => v.id === Number(visitId));
        const assignedIds = visit?.form_ids?.length ? visit.form_ids : null;
        const allForms  = window._availableForms || [];
        const fms       = assignedIds ? allForms.filter(f => assignedIds.includes(f.id)) : allForms;

        titleEl.textContent = `${visitName} — Case Report Forms`;
        panelEl.classList.remove('hidden');

        const ENTRY_BADGE = {
            Locked:        'badge badge-locked',
            Signed:        'badge bg-violet-100 text-violet-700 border border-violet-300',
            Submitted:     'badge badge-saved',
            Draft:         'badge badge-draft',
            'Not Started': 'badge bg-slate-100 text-slate-500',
        };

        if (fms.length === 0) {
            bodyEl.innerHTML = `
            <div class="py-10 text-center text-slate-400 text-sm">
                <i data-lucide="clipboard-x" class="w-8 h-8 mx-auto mb-2 opacity-30"></i>
                <p class="font-medium text-slate-500">No CRF forms assigned to this visit.</p>
                <p class="text-xs mt-1">Assign forms via Visit Templates or the visit settings.</p>
            </div>`;
            lucide.createIcons();
            panelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        bodyEl.innerHTML = `<div class="overflow-x-auto">
        <table class="min-w-full">
            <thead class="ph-table-head"><tr>
                <th class="text-left">CRF Form</th>
                <th class="text-left">Version</th>
                <th class="text-left">Status</th>
                <th class="text-left">Last Modified</th>
                <th class="text-right">Actions</th>
            </tr></thead>
            <tbody class="ph-table-body">
            ${fms.map(form => {
                const entry       = entries.find(e => e.form_id === form.id);
                const entryStatus = entry?.status || 'Not Started';
                const canEdit     = entryStatus !== 'Locked' && entryStatus !== 'Signed' && ['investigator', 'pi', 'admin', 'crc'].includes(u.role);
                const canLock     = (entryStatus === 'Submitted' || entryStatus === 'Signed') && ['cra', 'pi', 'admin'].includes(u.role);
                return `<tr>
                    <td>
                        <div class="flex items-center gap-2.5">
                            <div class="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style="background:#EBF2FD">
                                <i data-lucide="file-text" class="w-3.5 h-3.5" style="color:#1554A0"></i>
                            </div>
                            <span class="text-sm font-medium text-slate-800">${esc(form.form_name)}</span>
                        </div>
                    </td>
                    <td class="text-xs text-slate-400 font-mono">v${esc(form.version)}</td>
                    <td><span class="${ENTRY_BADGE[entryStatus] || 'badge bg-slate-100 text-slate-500'}">${esc(entryStatus)}</span></td>
                    <td class="text-xs text-slate-400">${entry?.updated_at ? fmt(entry.updated_at) : '—'}</td>
                    <td class="text-right">
                        <div class="flex items-center justify-end gap-2">
                        ${canEdit ? `
                        <a href="#subjects/${window._subjectId}/visits/${visitId}/forms/${form.id}"
                            class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold btn-primary rounded-md">
                            <i data-lucide="${entry ? 'edit-2' : 'plus'}" class="w-3.5 h-3.5"></i>
                            ${entry ? 'Edit' : 'Enter Data'}
                        </a>` : ''}
                        ${canLock && entry ? `
                        <button onclick="openLockModal(${entry.id}, ${window._subjectId})"
                            class="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition">
                            <i data-lucide="lock" class="w-3.5 h-3.5"></i> Lock
                        </button>` : ''}
                        ${entryStatus === 'Locked' ? `
                        <span class="inline-flex items-center gap-1 text-xs text-slate-400">
                            <i data-lucide="lock" class="w-3 h-3"></i> Locked
                        </span>` : ''}
                        ${entryStatus === 'Not Started' && !canEdit ? `
                        <span class="text-xs text-slate-400">No data entered</span>` : ''}
                        </div>
                    </td>
                </tr>`;
            }).join('')}
            </tbody>
        </table></div>`;
        lucide.createIcons();
        panelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    window.closeCRFPanel = function () {
        document.getElementById('crf-panel')?.classList.add('hidden');
        document.querySelectorAll('.visit-row').forEach(r => r.classList.remove('bg-blue-50'));
    };
}

function renderVisitRow(v, forms, allEntries, canManageVisit) {
    const visitEntries   = allEntries.filter(e => e.visit_id === v.id);
    const visitForms     = v.form_ids?.length ? forms.filter(f => v.form_ids.includes(f.id)) : forms;
    const completedCount = visitEntries.filter(e => (e.status === 'Submitted' || e.status === 'Locked') && visitForms.some(f => f.id === e.form_id)).length;
    const total          = visitForms.length;
    const crfColor       = completedCount === 0
        ? 'text-slate-400'
        : completedCount === total
            ? 'text-emerald-600 font-semibold'
            : 'text-amber-600 font-semibold';

    const orderStr = v.visit_order != null ? String(v.visit_order).padStart(2, '0') : '—';
    const isUnsch  = v.visit_type === 'Unscheduled';
    const isAdmin  = api.getCurrentUser()?.role === 'admin';

    return `
    <tr class="visit-row cursor-pointer hover:bg-slate-50 transition" data-visit-id="${v.id}"
        ${visitActionAttributes('select', v.id, v.visit_name)}>
        <td class="text-xs text-slate-400 font-mono text-center">${orderStr}</td>
        <td>
            <p class="text-sm font-semibold text-slate-800">${esc(v.visit_name)}</p>
            <span class="text-xs px-1.5 py-0.5 rounded font-medium ${isUnsch ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}">
                ${isUnsch ? 'Unscheduled' : 'Scheduled'}
            </span>
        </td>
        <td class="text-xs text-slate-600 whitespace-nowrap">${fmt(v.planned_date)}</td>
        <td class="text-xs text-slate-600 whitespace-nowrap">${fmt(v.actual_date)}</td>
        <td class="text-center">
            ${v.study_day != null
                ? `<span class="text-xs font-mono font-semibold ${v.study_day < 0 ? 'text-amber-600' : 'text-slate-700'}">Day ${v.study_day}</span>`
                : '<span class="text-xs text-slate-300">—</span>'}
        </td>
        <td>${v.actual_date ? complianceBadge(v.window_compliance) : '<span class="text-xs text-slate-300">—</span>'}</td>
        <td>${statusBadge(v.status, VISIT_STATUS_BADGE)}</td>
        <td class="text-center">
            <span class="text-xs ${crfColor}">${completedCount} / ${total}</span>
        </td>
        <td class="text-center" onclick="event.stopPropagation()" title="${v.investigator_signed ? `Signed by ${esc(v.investigator_signed_by_name || '')} on ${fmt(v.investigator_signed_at)}` : ''}">
            ${v.investigator_signed
                ? `<span class="badge bg-emerald-50 text-emerald-700 inline-flex items-center gap-1"><i data-lucide="check-circle-2" class="w-3 h-3"></i> Signed</span>`
                : `<span class="badge bg-slate-100 text-slate-500">Unsigned</span>`}
            ${v.investigator_signed && isAdmin ? `
            <button ${visitActionAttributes('unsign', v.id, v.visit_name)}
                class="ml-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 underline">Unsign</button>` : ''}
        </td>
        <td class="text-right" onclick="event.stopPropagation()">
            <div class="flex items-center justify-end gap-1.5">
                <button ${visitActionAttributes('select', v.id, v.visit_name)}
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition border border-blue-100">
                    <i data-lucide="clipboard-list" class="w-3 h-3"></i> CRFs
                </button>
                ${canManageVisit && !v.investigator_signed ? `
                <button onclick="openEditVisitModal(${v.id})"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
                    <i data-lucide="edit-2" class="w-3 h-3"></i>
                </button>
                <button ${visitActionAttributes('delete', v.id, v.visit_name)}
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition border border-red-100">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                </button>` : ''}
            </div>
        </td>
    </tr>
    ${v.status === 'Missed' && v.missed_reason ? `
    <tr class="bg-red-50">
        <td colspan="10" class="px-4 py-1.5 text-xs text-red-600 italic border-t border-red-100">
            <i data-lucide="alert-circle" class="w-3 h-3 inline mr-1 align-text-bottom"></i>Missed: ${esc(v.missed_reason)}
        </td>
    </tr>` : ''}`;
}

// ============================================================
// Add Visit Modal
// ============================================================
window.openAddVisitModal = function () {
    const subject = window._currentSubject;
    if (!subject) return;

    const today = new Date().toISOString().split('T')[0];
    const tplOptions = VISIT_TEMPLATES.map(t => {
        if (t.code === 'CUS') return `<option value="CUS">Custom Visit (enter name manually)…</option>`;
        if (t.code === 'UNS') return `<option value="UNS">Unscheduled Visit</option>`;
        return `<option value="${t.code}">${t.code} — ${t.name}  (Day ${t.study_day >= 0 ? '+' : ''}${t.study_day}, ±${t.window_days}d)</option>`;
    }).join('');

    showModal({
        title: 'Add Protocol Visit',
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#EBF2FD;border-color:#BFD7F5;color:#1554A0">
                <i data-lucide="info" class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:#1554A0"></i>
                Select a protocol visit template. Planned dates are auto-calculated from the subject&#39;s enrollment date (Day 1 = ${fmt(subject.enrollment_date)}). All entries are audit-logged per ICH GCP E6 (R3).
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Protocol Visit Template <span class="text-red-500">*</span></label>
                <select id="av-template" onchange="applyVisitTemplate('${subject.enrollment_date}')"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">— Select Visit —</option>
                    ${tplOptions}
                </select>
            </div>

            <div id="av-name-row" class="hidden">
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Visit Name <span class="text-red-500">*</span></label>
                <input type="text" id="av-name" placeholder="e.g. Safety Follow-up Week 16"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Visit Type</label>
                    <select id="av-type"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="Scheduled">Scheduled</option>
                        <option value="Unscheduled">Unscheduled</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Window Tolerance (±days)</label>
                    <input type="number" id="av-window" min="0" max="30" placeholder="0"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    <p class="text-xs text-slate-400 mt-1">Protocol-defined acceptable deviation from planned date.</p>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Planned Visit Date</label>
                    <input type="date" id="av-planned"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    <p class="text-xs text-slate-400 mt-1">Auto-calculated from study day. Adjust if needed.</p>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Actual Visit Date</label>
                    <input type="date" id="av-actual" max="${today}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    <p class="text-xs text-slate-400 mt-1">Leave blank if visit has not yet occurred.</p>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Visit Status <span class="text-red-500">*</span></label>
                    <select id="av-status" onchange="toggleMissedReason()"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="Scheduled">Scheduled (upcoming)</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Complete">Complete</option>
                        <option value="Missed">Missed</option>
                    </select>
                </div>
                <div></div>
            </div>

            <div id="av-missed-row" class="hidden">
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason Visit Was Missed <span class="text-red-500">*</span></label>
                <textarea id="av-missed-reason" rows="2"
                    placeholder="Document clinical reason per GCP requirements (e.g., Subject withdrew consent, Subject hospitalised)…"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Assign CRF Forms</label>
                ${(() => {
                    const availForms = window._availableForms || [];
                    if (!availForms.length) return `<p class="text-xs text-slate-400 italic">No active CRF forms available. Create forms in Form Builder first.</p>`;
                    return `<div class="border border-slate-200 rounded-md overflow-hidden divide-y divide-slate-100 max-h-36 overflow-y-auto">
                        ${availForms.map(f => `
                        <label class="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
                            <input type="checkbox" name="av-form" value="${f.id}" class="rounded border-slate-300 text-blue-600">
                            <span class="flex-1 text-slate-700">${esc(f.form_name)}</span>
                            <span class="text-xs text-slate-400 font-mono">v${esc(f.version)}</span>
                        </label>`).join('')}
                    </div>
                    <p class="text-xs text-slate-400 mt-1">Leave all unchecked to show all available forms for this visit.</p>`;
                })()}
            </div>

            <div id="av-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"></div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitAddVisit()"
            class="px-4 py-2 text-sm font-semibold btn-primary rounded-md flex items-center gap-2">
            <i data-lucide="calendar-plus" class="w-4 h-4"></i> Add Visit
        </button>`,
    });
};

window.applyVisitTemplate = function (enrollmentDate) {
    const code = document.getElementById('av-template').value;
    const tpl  = VISIT_TEMPLATES.find(t => t.code === code);
    if (!tpl) return;

    const nameRow = document.getElementById('av-name-row');
    const typeEl  = document.getElementById('av-type');
    const winEl   = document.getElementById('av-window');
    const planEl  = document.getElementById('av-planned');

    if (code === 'CUS') {
        nameRow.classList.remove('hidden');
        typeEl.value = 'Scheduled';
        winEl.value  = '';
        planEl.value = '';
        return;
    }
    nameRow.classList.add('hidden');
    typeEl.value = tpl.type || 'Scheduled';
    winEl.value  = tpl.window_days != null ? tpl.window_days : '';
    planEl.value = (tpl.study_day != null && enrollmentDate)
        ? plannedFromStudyDay(enrollmentDate, tpl.study_day)
        : '';
};

window.toggleMissedReason = function () {
    const status  = document.getElementById('av-status')?.value;
    const missRow = document.getElementById('av-missed-row');
    if (missRow) missRow.classList.toggle('hidden', status !== 'Missed');
};

window.submitAddVisit = async function () {
    const subject = window._currentSubject;
    const errEl   = document.getElementById('av-error');
    errEl.classList.add('hidden');

    const code    = document.getElementById('av-template').value;
    const tpl     = VISIT_TEMPLATES.find(t => t.code === code);
    const nameIn  = document.getElementById('av-name')?.value.trim();
    const type    = document.getElementById('av-type').value;
    const winVal  = document.getElementById('av-window').value;
    const planned = document.getElementById('av-planned').value;
    const actual  = document.getElementById('av-actual').value;
    const status  = document.getElementById('av-status').value;
    const missedR = document.getElementById('av-missed-reason')?.value.trim();

    if (!code) {
        errEl.textContent = 'Please select a visit template.';
        errEl.classList.remove('hidden');
        return;
    }
    if (code === 'CUS' && !nameIn) {
        errEl.textContent = 'Visit name is required for custom visits.';
        errEl.classList.remove('hidden');
        return;
    }
    if (status === 'Missed' && !missedR) {
        errEl.textContent = 'Reason is required when visit status is Missed (ICH GCP E6 R3 requirement).';
        errEl.classList.remove('hidden');
        return;
    }

    const visit_name  = code === 'CUS' ? nameIn : (tpl?.name || 'Unscheduled Visit');
    const visit_order = tpl?.order ?? 99;
    const formIds     = [...document.querySelectorAll('input[name="av-form"]:checked')]
                            .map(el => Number(el.value));

    try {
        const result = await api.createVisit(subject.id, {
            visit_name,
            visit_order,
            visit_type:   type,
            planned_date: planned || null,
            actual_date:  actual  || null,
            window_days:  winVal !== '' ? Number(winVal) : null,
            status,
            missed_reason: missedR || null,
            formIds,
        });
        closeModal();
        if (result?.autoDeviationFiled) {
            showToast(`Visit "${visit_name}" added — out-of-window detected. Protocol deviation auto-filed.`, 'warning');
        } else {
            showToast(`Visit "${visit_name}" added to schedule.`, 'success');
        }
        await renderSubjectDetail(subject.id);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    }
};

// ============================================================
// Edit Visit Modal
// ============================================================
window.openEditVisitModal = function (visitId) {
    const subject = window._currentSubject;
    const v = subject?.visits?.find(vis => vis.id === visitId);
    if (!v) return;
    if (v.investigator_signed) {
        showToast('Visit is signed and cannot be edited. An admin must unsign it first.', 'error');
        return;
    }

    const today    = new Date().toISOString().split('T')[0];
    const isMissed = v.status === 'Missed';
    const canSign  = ['investigator', 'pi', 'admin'].includes(api.getCurrentUser()?.role);
    // First-time data entry (this scheduled visit has no actual date yet) is an
    // initial entry, not a change — 21 CFR Part 11 reason-for-change applies only
    // when modifying already-recorded data. The audit trail still logs it.
    const isFirstEntry = !v.actual_date;

    // Set context for inline query buttons
    window._inlineQueryCtx = { subjectId: subject.id, visitId, entryId: null, formId: null };

    const qBtn = (key, label) => `<button type="button"
        ${actionAttributes('inlineQuery', [key, label])}
        title="Raise a query on this field"
        class="inline-flex items-center justify-center w-4 h-4 rounded-full text-slate-300 hover:text-orange-500 hover:bg-orange-50 transition ml-1 border border-transparent hover:border-orange-200 flex-shrink-0">
        <i data-lucide="message-circle" class="w-3 h-3"></i>
    </button>`;

    showModal({
        title: `${isFirstEntry ? 'Record Visit' : 'Edit Visit'} — ${v.visit_name}`,
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <div class="flex items-center mb-1.5">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Visit Name <span class="text-red-500">*</span></label>
                        ${qBtn('visit_name', 'Visit Name')}
                    </div>
                    <input type="text" id="ev-name" value="${esc(v.visit_name)}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <div class="flex items-center mb-1.5">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Visit Type</label>
                        ${qBtn('visit_type', 'Visit Type')}
                    </div>
                    <select id="ev-type"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="Scheduled" ${v.visit_type === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="Unscheduled" ${v.visit_type === 'Unscheduled' ? 'selected' : ''}>Unscheduled</option>
                    </select>
                </div>
                <div>
                    <div class="flex items-center mb-1.5">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Window Tolerance (±days)</label>
                        ${qBtn('window_tolerance', 'Window Tolerance (±days)')}
                    </div>
                    <input type="number" id="ev-window" min="0" value="${v.window_days ?? ''}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <div class="flex items-center mb-1.5">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Planned Visit Date</label>
                        ${qBtn('planned_date', 'Planned Visit Date')}
                    </div>
                    <input type="date" id="ev-planned" value="${v.planned_date || ''}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <div class="flex items-center mb-1.5">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Actual Visit Date</label>
                        ${qBtn('actual_date', 'Actual Visit Date')}
                    </div>
                    <input type="date" id="ev-actual" value="${v.actual_date || ''}" max="${today}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <div class="flex items-center mb-1.5">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Visit Status <span class="text-red-500">*</span></label>
                        ${qBtn('visit_status', 'Visit Status')}
                    </div>
                    <select id="ev-status" onchange="toggleEditMissedReason()"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="Scheduled"   ${v.status === 'Scheduled'    ? 'selected' : ''}>Scheduled</option>
                        <option value="In Progress" ${v.status === 'In Progress'  ? 'selected' : ''}>In Progress</option>
                        <option value="Complete"    ${v.status === 'Complete'     ? 'selected' : ''}>Complete</option>
                        <option value="Missed"      ${v.status === 'Missed'       ? 'selected' : ''}>Missed</option>
                    </select>
                </div>
                <div></div>
            </div>

            <div id="ev-missed-row" class="${isMissed ? '' : 'hidden'}">
                <div class="flex items-center mb-1.5">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Reason Visit Was Missed <span class="text-red-500">*</span></label>
                    ${qBtn('missed_reason', 'Reason Visit Was Missed')}
                </div>
                <textarea id="ev-missed-reason" rows="2"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(v.missed_reason || '')}</textarea>
            </div>

            ${canSign ? `
            <div class="p-3 rounded-md border" style="background:#F0FDF4;border-color:#BBF7D0">
                <label class="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" id="ev-signed" class="mt-0.5 rounded border-slate-300 text-emerald-600">
                    <span>
                        <span class="text-sm font-semibold" style="color:#065F46">Investigator Signed</span>
                        <p class="text-xs mt-0.5" style="color:#047857">Check this only once the visit data is final — this locks the visit and prevents further changes. An admin must unsign it to make any edits after that.</p>
                    </span>
                </label>
            </div>` : ''}

            ${isFirstEntry ? `
            <div class="p-3 rounded-md border text-xs" style="background:#F0FDF4;border-color:#BBF7D0;color:#065F46">
                <i data-lucide="info" class="w-3.5 h-3.5 inline mr-1 align-text-bottom"></i>
                First-time entry — no change reason needed. This entry is still recorded in the audit trail.
            </div>` : `
            <div class="p-3 rounded-md border" style="background:#FFF7ED;border-color:#FED7AA">
                <label class="block text-xs font-semibold mb-1.5" style="color:#9A3412">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="ev-reason"
                    placeholder="Required per FDA 21 CFR Part 11 — document why this record is being updated"
                    class="w-full px-3 py-2.5 border border-orange-200 rounded-md text-sm outline-none" style="background:#fff">
                <p class="text-xs mt-1" style="color:#C2410C">This justification will be permanently stored in the audit trail.</p>
            </div>`}

            <div id="ev-window-preview" class="hidden p-2.5 rounded-md border text-xs font-medium"></div>
            <div id="ev-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"></div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitEditVisit(${visitId})"
            class="px-4 py-2 text-sm font-semibold btn-primary rounded-md flex items-center gap-2">
            <i data-lucide="save" class="w-4 h-4"></i> Save Changes
        </button>`,
    });
};

// Live compliance preview in edit-visit modal
function updateWindowPreview() {
    const preview  = document.getElementById('ev-window-preview');
    if (!preview) return;
    const planned  = document.getElementById('ev-planned')?.value;
    const actual   = document.getElementById('ev-actual')?.value;
    const winVal   = document.getElementById('ev-window')?.value;
    if (!planned || !actual) { preview.classList.add('hidden'); return; }
    const p    = new Date(planned); p.setHours(0, 0, 0, 0);
    const a    = new Date(actual);  a.setHours(0, 0, 0, 0);
    const diff = Math.round((a - p) / 86400000);
    const win  = winVal !== '' && winVal != null ? parseInt(winVal) : 0;
    let label, bg, border, color;
    if (diff === 0) {
        label = 'On Schedule'; bg = '#D1FAE5'; border = '#A7F3D0'; color = '#065F46';
    } else if (Math.abs(diff) <= win) {
        label = diff < 0 ? `Early (${Math.abs(diff)}d) — Within Window` : `Late (+${diff}d) — Within Window`;
        bg = '#FEF3C7'; border = '#FDE68A'; color = '#92400E';
    } else {
        label = diff < 0 ? `Early (${Math.abs(diff)}d) — OUT OF WINDOW ⚠ deviation will be auto-filed`
                         : `Late (+${diff}d) — OUT OF WINDOW ⚠ deviation will be auto-filed`;
        bg = '#FEE2E2'; border = '#FECACA'; color = '#991B1B';
    }
    preview.textContent = label;
    preview.style.cssText = `background:${bg};border-color:${border};color:${color}`;
    preview.classList.remove('hidden');
}

// Attach live preview listeners after modal DOM is ready
setTimeout(() => {
    ['ev-planned', 'ev-actual', 'ev-window'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', updateWindowPreview);
        document.getElementById(id)?.addEventListener('input',  updateWindowPreview);
    });
    updateWindowPreview();
}, 0);

window.toggleEditMissedReason = function () {
    const status  = document.getElementById('ev-status')?.value;
    const missRow = document.getElementById('ev-missed-row');
    if (missRow) missRow.classList.toggle('hidden', status !== 'Missed');
};

window.submitEditVisit = async function (visitId) {
    const errEl   = document.getElementById('ev-error');
    errEl.classList.add('hidden');

    const name    = document.getElementById('ev-name').value.trim();
    const type    = document.getElementById('ev-type').value;
    const winVal  = document.getElementById('ev-window').value;
    const planned = document.getElementById('ev-planned').value;
    const actual  = document.getElementById('ev-actual').value;
    const status  = document.getElementById('ev-status').value;
    const missedR = document.getElementById('ev-missed-reason')?.value.trim();
    // The reason field only exists when modifying already-recorded data; a
    // first-time entry has no reason field and needs none (audit still logs it).
    const reasonEl  = document.getElementById('ev-reason');
    const reason    = reasonEl ? reasonEl.value.trim() : '';
    const wantsSign = document.getElementById('ev-signed')?.checked ?? false;

    if (!name) {
        errEl.textContent = 'Visit name is required.';
        errEl.classList.remove('hidden');
        return;
    }
    if (reasonEl && !reason) {
        errEl.textContent = 'Reason for change is required (FDA 21 CFR Part 11).';
        errEl.classList.remove('hidden');
        return;
    }
    if (status === 'Missed' && !missedR) {
        errEl.textContent = 'Missed reason is required per ICH GCP E6 (R3).';
        errEl.classList.remove('hidden');
        return;
    }

    try {
        const result = await api.updateVisit(visitId, {
            visit_name:   name,
            visit_type:   type,
            planned_date: planned || null,
            actual_date:  actual  || null,
            window_days:  winVal !== '' ? Number(winVal) : null,
            status,
            missed_reason: missedR || null,
            _reason:       reason,
        });

        if (wantsSign) {
            await api.signVisit(visitId);
        }

        closeModal();
        if (result?.autoDeviationFiled) {
            showToast('Visit updated — out-of-window detected. Protocol deviation auto-filed.', 'warning');
        } else if (wantsSign) {
            showToast('Visit updated and signed. Visit is now locked from further edits.', 'success');
        } else {
            showToast('Visit updated. Change recorded in audit trail.', 'success');
        }
        await renderSubjectDetail(window._subjectId);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    }
};

// ============================================================
// Delete Visit Modal
// ============================================================
window.openDeleteVisitModal = function (visitId, visitName) {
    showModal({
        title: 'Delete Visit',
        size: 'sm',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-3 p-3 bg-red-50 rounded-md border border-red-200">
                <i data-lucide="alert-triangle" class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"></i>
                <div>
                    <p class="text-sm font-semibold text-red-700">Delete visit <em>${esc(visitName)}</em>?</p>
                    <p class="text-xs text-red-600 mt-0.5">This action is permanent and will be recorded in the Audit Trail per ICH GCP E6 (R3).</p>
                </div>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason for Deletion <span class="text-red-500">*</span></label>
                <textarea id="del-visit-reason" rows="3"
                    placeholder="e.g. Duplicate visit entry — created in error."
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
                <p id="del-visit-err" class="text-xs text-red-500 mt-1 hidden"></p>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="confirmDeleteVisit(${visitId})"
            class="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="trash-2" class="w-4 h-4"></i> Delete Visit
        </button>`,
    });
};

window.confirmDeleteVisit = async function (visitId) {
    const reason  = document.getElementById('del-visit-reason')?.value?.trim();
    const errEl   = document.getElementById('del-visit-err');
    if (!reason) {
        errEl.textContent = 'Please enter a reason for deletion.';
        errEl.classList.remove('hidden');
        return;
    }
    try {
        await api.deleteVisit(visitId, reason);
        closeModal();
        showToast('Visit deleted. Recorded in audit trail.', 'success');
        await renderSubjectDetail(window._subjectId);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    }
};

// ============================================================
// Unsign Visit Modal (Admin only)
// ============================================================
window.openUnsignVisitModal = function (visitId, visitName) {
    showModal({
        title: 'Unsign Visit',
        size: 'sm',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-3 p-3 bg-amber-50 rounded-md border border-amber-200">
                <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"></i>
                <p class="text-sm text-amber-800">Unsigning <em>${esc(visitName)}</em> will reopen it for editing. This is permanently recorded in the Audit Trail per FDA 21 CFR Part 11.</p>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason for Unsigning <span class="text-red-500">*</span></label>
                <textarea id="unsign-visit-reason" rows="3"
                    placeholder="Provide detailed clinical justification…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
                <p id="unsign-visit-err" class="text-xs text-red-500 mt-1 hidden"></p>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="confirmUnsignVisit(${visitId})"
            class="px-4 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="unlock" class="w-4 h-4"></i> Unsign Visit
        </button>`,
    });
};

window.confirmUnsignVisit = async function (visitId) {
    const reason = document.getElementById('unsign-visit-reason')?.value?.trim();
    const errEl  = document.getElementById('unsign-visit-err');
    if (!reason) {
        errEl.textContent = 'Please enter a reason for unsigning.';
        errEl.classList.remove('hidden');
        return;
    }
    try {
        await api.unsignVisit(visitId, reason);
        closeModal();
        showToast('Visit unsigned. Recorded in audit trail.', 'warning');
        await renderSubjectDetail(window._subjectId);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    }
};

// ============================================================
// Lock Entry Modal
// ============================================================
window.openLockModal = function (entryId, subjectId) {
    showModal({
        title: 'Lock Data Entry',
        size: 'sm',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                <i data-lucide="lock" class="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5"></i>
                <p class="text-sm text-slate-700">Once locked, this data entry cannot be edited without documented justification by an Admin. Permanently recorded in the Audit Trail per FDA 21 CFR Part 11.</p>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason for Locking <span class="text-red-500">*</span></label>
                <textarea id="lock-reason" rows="3"
                    placeholder="e.g. Data verified against source documents and approved for lock."
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="confirmLock(${entryId}, ${subjectId})"
            class="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="lock" class="w-4 h-4"></i> Confirm Lock
        </button>`,
    });
};

window.confirmLock = async function (entryId, subjectId) {
    const reason = document.getElementById('lock-reason').value.trim();
    if (!reason) { showToast('Reason for locking is required.', 'error'); return; }
    try {
        await api.lockDataEntry(entryId, reason);
        closeModal();
        showToast('Data entry locked. Audit trail entry created.', 'success');
        await renderSubjectDetail(subjectId);
    } catch (err) { showToast(err.message, 'error'); }
};

// ============================================================
// Withdraw Subject Modal
// ============================================================
window.openWithdrawModal = function (subjectId) {
    showModal({
        title: 'Withdraw Subject',
        size: 'sm',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-3 p-3 bg-red-50 rounded-md border border-red-200">
                <i data-lucide="alert-triangle" class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"></i>
                <p class="text-sm text-red-700">This will mark the subject as Withdrawn and permanently record the action in the Audit Trail. This action cannot be undone.</p>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason for Withdrawal <span class="text-red-500">*</span></label>
                <textarea id="withdraw-reason" rows="3"
                    placeholder="Enter clinical reason for withdrawal…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="confirmWithdraw(${subjectId})"
            class="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition">
            Confirm Withdrawal
        </button>`,
    });
};

window.confirmWithdraw = async function (subjectId) {
    const reason = document.getElementById('withdraw-reason').value.trim();
    if (!reason) { showToast('Reason for withdrawal is required.', 'error'); return; }
    try {
        await api.updateSubjectStatus(subjectId, 'Withdrawn', reason);
        closeModal();
        showToast('Subject withdrawn. Audit trail recorded.', 'warning');
        await renderSubjectDetail(subjectId);
    } catch (err) { showToast(err.message, 'error'); }
};

// ============================================================
// Subject-level Data Lock
// ============================================================
function renderSubjectLockStatus(data) {
    const visits  = data?.visits  ?? [];
    const history = data?.history ?? [];

    if (!visits.length) {
        return '<p class="text-xs text-slate-400 p-2">No visits found for this subject.</p>';
    }

    const visitRows = visits.map(v => {
        const total   = parseInt(v.total)   || 0;
        const locked  = parseInt(v.locked)  || 0;
        const pct     = total > 0 ? Math.round((locked / total) * 100) : 0;
        const allLocked = total > 0 && locked === total;
        return `
        <tr class="hover:bg-slate-50">
            <td class="px-3 py-2 text-xs font-medium text-slate-700">${esc(v.visit_name)}</td>
            <td class="px-3 py-2 text-xs text-slate-500">${locked}/${total}</td>
            <td class="px-3 py-2 w-32">
                <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full rounded-full ${allLocked ? 'bg-emerald-500' : 'bg-blue-500'}"
                         style="width:${pct}%"></div>
                </div>
            </td>
            <td class="px-3 py-2">
                <span class="text-xs ${allLocked ? 'text-emerald-600 font-semibold' : 'text-amber-600'}">${allLocked ? '✓ Fully Locked' : pct > 0 ? 'Partial' : 'Not Locked'}</span>
            </td>
            <td class="px-3 py-2 flex gap-1">
                ${!allLocked ? `
                <button onclick="openSubjectLockModal(false, ${v.visit_id})"
                    class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs">Lock Visit</button>` : ''}
                ${locked > 0 ? `
                <button onclick="openSubjectLockModal(true, ${v.visit_id})"
                    class="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded text-xs" id="unlock-visit-btn-${v.visit_id}">Unlock</button>` : ''}
            </td>
        </tr>`;
    }).join('');

    const historyRows = history.slice(0, 5).map(h => `
    <tr class="hover:bg-slate-50">
        <td class="px-3 py-1.5 text-xs">
            <span class="px-1.5 py-0.5 rounded text-xs font-semibold ${h.action === 'Lock' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-700'}">${h.action}</span>
        </td>
        <td class="px-3 py-1.5 text-xs text-slate-600">${esc(h.reason)}</td>
        <td class="px-3 py-1.5 text-xs text-slate-400">${esc(h.performed_by_name ?? '—')} · ${new Date(h.performed_at).toLocaleString('en-GB')}</td>
        <td class="px-3 py-1.5 text-xs text-slate-500">${h.entries_affected} entries</td>
    </tr>`).join('');

    return `
    <div class="overflow-x-auto border-b border-slate-100">
        <table class="w-full text-xs">
            <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th class="px-3 py-2 text-left font-semibold text-slate-600">Visit</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-600">Locked</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-600">Progress</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-600">Status</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-600">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">${visitRows}</tbody>
        </table>
    </div>
    ${history.length ? `
    <div class="p-3">
        <p class="text-xs font-semibold text-slate-500 mb-2">Lock History</p>
        <div class="overflow-x-auto">
            <table class="w-full text-xs">
                <tbody class="divide-y divide-slate-100">${historyRows}</tbody>
            </table>
        </div>
    </div>` : ''}`;
}

window.openSubjectLockModal = function (isUnlock, visitId = null) {
    const user = api.getCurrentUser();
    if (isUnlock && user.role !== 'admin') {
        showToast('Only admins can unlock subject data.', 'error');
        return;
    }
    const label = isUnlock ? 'Unlock' : 'Lock';
    const scope = visitId != null ? 'this visit' : 'all visits for this subject';
    showModal({
        title: `${label} Subject Data`,
        size: 'sm',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-3 p-3 ${isUnlock ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'} rounded-md border">
                <i data-lucide="${isUnlock ? 'lock-open' : 'lock'}" class="w-5 h-5 ${isUnlock ? 'text-amber-500' : 'text-slate-500'} flex-shrink-0 mt-0.5"></i>
                <p class="text-sm ${isUnlock ? 'text-amber-700' : 'text-slate-700'}">
                    ${isUnlock
                        ? `This will unlock all locked CRF entries for ${scope}. An unlock event will be permanently recorded in the Audit Trail.`
                        : `This will lock all Draft/Saved CRF entries for ${scope}. Locked entries cannot be edited without admin approval. Recorded in the Audit Trail per GCP.`}
                </p>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason <span class="text-red-500">*</span></label>
                <textarea id="subject-lock-reason" rows="3"
                    placeholder="${isUnlock ? 'e.g. Query response requires data correction — authorised by PI' : 'e.g. All CRF entries verified and approved for database lock'}"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="confirmSubjectLock(${isUnlock}, ${visitId ?? 'null'})"
            class="px-4 py-2 text-sm font-semibold ${isUnlock ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-800 hover:bg-slate-900'} text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isUnlock ? 'lock-open' : 'lock'}" class="w-4 h-4"></i> Confirm ${label}
        </button>`,
    });
};

window.confirmSubjectLock = async function (isUnlock, visitId) {
    const reason = document.getElementById('subject-lock-reason').value.trim();
    if (!reason) { showToast('Reason is required.', 'error'); return; }
    try {
        const vid = visitId === null || visitId === 'null' ? null : visitId;
        if (isUnlock) {
            const r = await api.unlockSubject(window._subjectId, reason, vid);
            showToast(`${r.unlocked} entries unlocked. Audit trail recorded.`, 'warning');
        } else {
            const r = await api.lockSubject(window._subjectId, reason, vid);
            showToast(`${r.locked} entries locked. Audit trail recorded.`, 'success');
        }
        closeModal();
        await renderSubjectDetail(window._subjectId);
    } catch (err) { showToast(err.message, 'error'); }
};

// ============================================================
// Helpers
// ============================================================
function auditBadge(action) {
    const map = {
        INSERT: 'badge-insert', UPDATE: 'badge-update',
        DELETE: 'badge-delete', LOCK:   'badge-lock', UNLOCK: 'badge-unlock',
    };
    return map[action] || 'bg-slate-100 text-slate-600';
}
````

## `src/frontend/js/modules/visit-actions.js`

````javascript
// Labels remain data, never executable inline JavaScript. Only named actions
// registered here can be dispatched; DOM attributes cannot name arbitrary functions.
export function escapeAttribute(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function actionAttributes(action, args) {
    return `data-safe-action="${escapeAttribute(action)}" data-safe-args="${escapeAttribute(JSON.stringify(args))}"`;
}

export function visitActionAttributes(action, id, name) {
    return actionAttributes(action, [id, name]);
}

export function dispatchSafeAction(element, host = globalThis.window) {
    const handlers = {
        select: (...args) => host.selectVisit(...args),
        unsign: (...args) => host.openUnsignVisitModal(...args),
        delete: (...args) => host.openDeleteVisitModal(...args),
        query: (...args) => host.openRowInlineQuery(...args),
        inlineQuery: (...args) => host.openInlineQueryModal(...args),
        unblind: (...args) => host.openUnblindModal(...args),
    };
    if (!Object.hasOwn(handlers, element.dataset.safeAction)) return false;
    let args;
    try { args = JSON.parse(element.dataset.safeArgs); } catch { return false; }
    if (!Array.isArray(args) || args.length > 4) return false;
    handlers[element.dataset.safeAction](...args);
    return true;
}

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', event => {
        const element = event.target.closest?.('[data-safe-action]');
        if (!element) return;
        if (element.tagName === 'TR' && event.target.closest('button, a, input, select, [onclick]')) return;
        event.preventDefault();
        event.stopPropagation();
        dispatchSafeAction(element);
    }, true);
}
````

## `src/frontend/js/modules/visittemplates.js`

````javascript
import { escapeAttribute } from './visit-actions.js';
// Visit Schedule Template UI — Study design / visit plan builder

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

let _templates = [];
let _forms     = [];
let _editTmpl  = null;
let _items     = [];

const VISIT_TYPES = ['Screening', 'Baseline', 'Treatment', 'Follow-up', 'End of Study', 'Unscheduled', 'Telephone'];

// ── Main render ──────────────────────────────────────────────────────────────
export async function renderVisitTemplates(container) {
    container.innerHTML = `
    <div class="p-4 md:p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">Visit Schedule Templates</h2>
          <p class="text-xs text-slate-500 mt-0.5">Define study visit plans — auto-generate visits for new subjects on enrollment</p>
        </div>
        <button onclick="window.vtNew()" class="ph-btn ph-btn-primary text-xs flex items-center gap-1.5">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> New Template
        </button>
      </div>
      <div id="vt-list"></div>
    </div>`;
    lucide.createIcons();
    await loadAll(container);
}

async function loadAll(container) {
    try {
        [_templates, _forms] = await Promise.all([
            api.request('/api/visit-templates'),
            api.request('/api/forms'),
        ]);
        renderList();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderList() {
    const el = document.getElementById('vt-list');
    if (!el) return;

    if (!_templates.length) {
        el.innerHTML = `
        <div class="text-center py-16 text-slate-400">
          <i data-lucide="calendar-check" class="w-10 h-10 mx-auto mb-3 opacity-40"></i>
          <p class="font-medium">No visit templates yet</p>
          <p class="text-sm mt-1">Create a visit schedule template to auto-generate visits during subject enrollment</p>
        </div>`;
        lucide.createIcons();
        return;
    }

    el.innerHTML = `
    <div class="space-y-3">
      ${_templates.map(t => `
        <div class="ph-card overflow-hidden">
          <div class="flex items-center justify-between p-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                <i data-lucide="calendar-days" class="w-4 h-4"></i>
              </div>
              <div>
                <p class="font-semibold text-slate-800 text-sm">${t.name}</p>
                <p class="text-xs text-slate-500">${t.visitCount ?? 0} visit${(t.visitCount ?? 0) === 1 ? '' : 's'}${t.description ? ' · ' + t.description : ''}</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <button onclick="window.vtView(${t.id})" class="ph-btn ph-btn-ghost text-xs" title="View visits">
                <i data-lucide="list" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="window.vtEdit(${t.id})" class="ph-btn ph-btn-secondary text-xs">
                <i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit
              </button>
              ${api.getCurrentUser()?.role === 'admin' ? `
              <button onclick="window.vtDelete(${t.id})" class="ph-btn ph-btn-ghost text-xs text-red-500">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>` : ''}
            </div>
          </div>
        </div>`).join('')}
    </div>`;
    lucide.createIcons();
}

// ── Builder Modal ─────────────────────────────────────────────────────────────
function openBuilderModal(tmpl = null) {
    _editTmpl = tmpl;
    _items    = tmpl ? JSON.parse(JSON.stringify(tmpl.items ?? [])) : [];

    const formOptions = _forms.map(f =>
        `<option value="${f.id}">${escapeAttribute(f.name)}</option>`
    ).join('');

    showModal({
        title: tmpl ? 'Edit Visit Schedule' : 'New Visit Schedule Template',
        size:  'xl',
        body: `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="ph-label">Template Name *</label>
            <input id="vt-name" class="ph-input" value="${tmpl?.name ?? ''}" placeholder="e.g. Phase III Treatment Schedule">
          </div>
          <div>
            <label class="ph-label">Description</label>
            <input id="vt-description" class="ph-input" value="${tmpl?.description ?? ''}" placeholder="Optional">
          </div>
        </div>
        <div class="border-t border-slate-100 pt-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-semibold text-slate-700">Visit Plan <span id="vt-item-count" class="text-xs text-slate-400 font-normal">(${_items.length})</span></p>
            <button onclick="window.vtAddItem()" class="ph-btn ph-btn-secondary text-xs flex items-center gap-1">
              <i data-lucide="plus" class="w-3 h-3"></i> Add Visit
            </button>
          </div>
          <div id="vt-items" class="space-y-2 max-h-80 overflow-y-auto pr-1"></div>
          <div id="vt-form-options" class="hidden">${formOptions}</div>
        </div>
        ${tmpl ? `
        <div>
          <label class="ph-label">Reason for Change *</label>
          <input id="vt-reason" class="ph-input" placeholder="Why is this template being updated?">
        </div>` : ''}
      </div>`,
        footer: `
          <button onclick="closeModal()" class="ph-btn ph-btn-ghost text-sm">Cancel</button>
          <button onclick="window.vtSave()" class="ph-btn ph-btn-primary text-sm flex items-center gap-1.5">
            <i data-lucide="save" class="w-3.5 h-3.5"></i> ${tmpl ? 'Save Changes' : 'Create Template'}
          </button>`,
    });

    renderItemList();
    lucide.createIcons();
}

function renderItemList() {
    const el  = document.getElementById('vt-items');
    const cnt = document.getElementById('vt-item-count');
    if (!el) return;
    if (cnt) cnt.textContent = `(${_items.length})`;

    if (!_items.length) {
        el.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">No visits yet. Click "Add Visit" to build the schedule.</p>`;
        return;
    }

    const formMap = Object.fromEntries(_forms.map(f => [f.id, f.name]));

    el.innerHTML = _items.map((it, i) => {
        const selectedForms = (it.formIds ?? []).map(id => formMap[id]).filter(Boolean);
        return `
        <div class="border border-slate-200 rounded-lg bg-slate-50 p-3 space-y-2">
          <div class="flex items-center gap-2">
            <div class="flex flex-col gap-0.5">
              <button onclick="window.vtMoveItem(${i},-1)" class="text-slate-300 hover:text-slate-600 leading-none" ${i === 0 ? 'disabled' : ''}>
                <i data-lucide="chevron-up" class="w-3 h-3"></i>
              </button>
              <button onclick="window.vtMoveItem(${i},1)" class="text-slate-300 hover:text-slate-600 leading-none" ${i === _items.length - 1 ? 'disabled' : ''}>
                <i data-lucide="chevron-down" class="w-3 h-3"></i>
              </button>
            </div>
            <span class="text-xs font-mono text-slate-400 w-6 text-center">${i + 1}</span>
            <div class="flex-1 grid grid-cols-4 gap-2">
              <div class="col-span-2">
                <label class="ph-label text-xs">Visit Name *</label>
                <input class="ph-input text-xs" value="${escapeAttribute(it.visitName ?? '')}" onchange="window.vtUpdateItem(${i},'visitName',this.value)" placeholder="e.g. Screening Visit">
              </div>
              <div>
                <label class="ph-label text-xs">Visit Type</label>
                <select class="ph-input text-xs" onchange="window.vtUpdateItem(${i},'visitType',this.value)">
                  ${VISIT_TYPES.map(t => `<option ${(it.visitType ?? 'Screening') === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="ph-label text-xs">Study Day</label>
                <input type="number" class="ph-input text-xs" value="${escapeAttribute(it.studyDay ?? '')}" onchange="window.vtUpdateItem(${i},'studyDay',this.value ? +this.value : null)" placeholder="e.g. 0">
              </div>
            </div>
            <button onclick="window.vtRemoveItem(${i})" class="text-red-400 hover:text-red-600 p-1 flex-shrink-0">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          </div>
          <div class="flex items-center gap-3 pl-8">
            <div class="flex items-center gap-1.5">
              <label class="ph-label text-xs mb-0">Window (±days)</label>
              <input type="number" class="ph-input text-xs w-16" value="${escapeAttribute(it.windowDaysBefore ?? 3)}" onchange="window.vtUpdateItem(${i},'windowDaysBefore',+this.value)" placeholder="3" min="0">
              <span class="text-xs text-slate-400">/</span>
              <input type="number" class="ph-input text-xs w-16" value="${escapeAttribute(it.windowDaysAfter ?? 3)}" onchange="window.vtUpdateItem(${i},'windowDaysAfter',+this.value)" placeholder="3" min="0">
            </div>
            <label class="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" ${it.isMandatory !== false ? 'checked' : ''} onchange="window.vtUpdateItem(${i},'isMandatory',this.checked)" class="rounded">
              Mandatory visit
            </label>
          </div>
          <div class="pl-8">
            <label class="ph-label text-xs">CRF Forms for this visit</label>
            <div class="flex flex-wrap gap-1.5 mt-1">
              ${_forms.map(f => `
                <label class="flex items-center gap-1 text-xs cursor-pointer bg-white border border-slate-200 rounded px-2 py-1 hover:border-blue-400 ${(it.formIds ?? []).includes(f.id) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'text-slate-600'}">
                  <input type="checkbox" class="hidden" ${(it.formIds ?? []).includes(f.id) ? 'checked' : ''}
                    onchange="window.vtToggleForm(${i},${f.id},this.checked)">
                  ${escapeAttribute(f.name)}
                </label>`).join('')}
              ${!_forms.length ? '<p class="text-xs text-slate-400 italic">No forms available — create forms first</p>' : ''}
            </div>
          </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

// ── Item operations ──────────────────────────────────────────────────────────
window.vtAddItem = () => {
    _items.push({
        visitName: '',
        visitOrder: _items.length + 1,
        visitType: 'Scheduled',
        studyDay: null,
        windowDaysBefore: 3,
        windowDaysAfter: 3,
        formIds: [],
        isMandatory: true,
    });
    renderItemList();
};

window.vtRemoveItem = (i) => {
    _items.splice(i, 1);
    _items.forEach((it, idx) => it.visitOrder = idx + 1);
    renderItemList();
};

window.vtMoveItem = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= _items.length) return;
    [_items[i], _items[j]] = [_items[j], _items[i]];
    _items.forEach((it, idx) => it.visitOrder = idx + 1);
    renderItemList();
};

window.vtUpdateItem = (i, key, value) => {
    _items[i] = { ..._items[i], [key]: value };
};

window.vtToggleForm = (i, formId, checked) => {
    const ids = _items[i].formIds ?? [];
    _items[i].formIds = checked ? [...ids, formId] : ids.filter(id => id !== formId);
    renderItemList();
};

// ── Save ─────────────────────────────────────────────────────────────────────
window.vtSave = async () => {
    const name        = document.getElementById('vt-name')?.value?.trim();
    const description = document.getElementById('vt-description')?.value?.trim();
    const reason      = document.getElementById('vt-reason')?.value?.trim();

    if (!name) return showToast('Template name is required', 'error');
    if (!_items.length) return showToast('At least one visit is required', 'error');
    for (let i = 0; i < _items.length; i++) {
        if (!_items[i].visitName?.trim()) return showToast(`Visit ${i + 1}: name is required`, 'error');
    }
    if (_editTmpl && !reason) return showToast('Reason for change is required', 'error');

    const items = _items.map((it, i) => ({ ...it, visitOrder: i + 1 }));

    try {
        if (_editTmpl) {
            await api.request(`/api/visit-templates/${_editTmpl.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name, description, items, reason }),
            });
            showToast('Template updated', 'success');
        } else {
            await api.request('/api/visit-templates', {
                method: 'POST',
                body: JSON.stringify({ name, description, items }),
            });
            showToast('Template created', 'success');
        }
        closeModal();
        [_templates] = await Promise.all([api.request('/api/visit-templates')]);
        renderList();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// ── Public handlers ──────────────────────────────────────────────────────────
window.vtNew = () => openBuilderModal(null);

window.vtEdit = async (id) => {
    try {
        const tmpl = await api.request(`/api/visit-templates/${id}`);
        openBuilderModal(tmpl);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.vtView = async (id) => {
    try {
        const tmpl = await api.request(`/api/visit-templates/${id}`);
        const formMap = Object.fromEntries(_forms.map(f => [f.id, f.name]));
        showModal({
            title: tmpl.name,
            size:  'lg',
            body: `
          <div class="space-y-2 max-h-96 overflow-y-auto">
            ${(tmpl.items ?? []).length ? (tmpl.items ?? []).map((it, i) => `
            <div class="border border-slate-200 rounded-lg p-3 bg-slate-50">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">${i + 1}</span>
                <p class="font-medium text-sm text-slate-800">${it.visit_name ?? it.visitName}</p>
                <span class="text-xs text-slate-400">${it.visit_type ?? it.visitType}</span>
                ${it.is_mandatory !== false ? '<span class="text-xs text-red-400">Required</span>' : '<span class="text-xs text-slate-300">Optional</span>'}
              </div>
              ${it.study_day != null || it.studyDay != null ? `<p class="text-xs text-slate-500 pl-8">Study Day ${it.study_day ?? it.studyDay} (window ±${it.window_days_before ?? it.windowDaysBefore ?? 3}/${it.window_days_after ?? it.windowDaysAfter ?? 3} days)</p>` : ''}
              ${(it.form_ids ?? it.formIds ?? []).length ? `<p class="text-xs text-blue-600 pl-8">Forms: ${(it.form_ids ?? it.formIds).map(id => formMap[id] ?? `Form #${id}`).join(', ')}</p>` : ''}
            </div>`).join('') : '<p class="text-xs text-slate-400 text-center py-8">No visits defined in this template.</p>'}
          </div>`,
            footer: `<button onclick="closeModal()" class="ph-btn ph-btn-ghost text-sm">Close</button>`,
        });
        lucide.createIcons();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.vtDelete = async (id) => {
    const tmpl = _templates.find(t => t.id === id);
    if (!confirm(`Delete template "${tmpl?.name}"?`)) return;
    const reason = prompt('Reason for deletion?');
    if (!reason) return;
    try {
        await api.request(`/api/visit-templates/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        });
        showToast('Template deleted', 'success');
        _templates = await api.request('/api/visit-templates');
        renderList();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// ── Generate visits for a subject from a template (called from subjects.js) ─
export async function generateVisitsFromTemplate(subjectId, subjectCode) {
    if (!_templates.length) {
        try { _templates = await api.request('/api/visit-templates'); } catch {}
    }
    if (!_templates.length) {
        showToast('No visit templates available for this study', 'warning');
        return;
    }

    const options = _templates.map(t =>
        `<option value="${t.id}">${t.name} (${t.visitCount ?? 0} visits)</option>`
    ).join('');

    showModal({
        title: 'Generate Visit Schedule',
        size:  'md',
        body: `
      <div class="space-y-4">
        <p class="text-xs text-slate-500">Subject: <span class="font-semibold text-slate-700">${subjectCode}</span></p>
        <div>
          <label class="ph-label">Visit Template *</label>
          <select id="vt-gen-template" class="ph-input">${options}</select>
        </div>
        <div>
          <label class="ph-label">Enrollment / Day 0 Date</label>
          <input type="date" id="vt-gen-date" class="ph-input" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" id="vt-gen-overwrite" class="rounded">
          Remove existing un-used scheduled visits first
        </label>
      </div>`,
        footer: `
          <button onclick="closeModal()" class="ph-btn ph-btn-ghost text-sm">Cancel</button>
          <button onclick="window._vtDoGenerate(${subjectId})" class="ph-btn ph-btn-primary text-sm flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> Generate Visits
          </button>`,
    });
    lucide.createIcons();
}

window._vtDoGenerate = async (subjectId) => {
    const templateId     = parseInt(document.getElementById('vt-gen-template')?.value);
    const enrollmentDate = document.getElementById('vt-gen-date')?.value;
    const overwrite      = document.getElementById('vt-gen-overwrite')?.checked;

    try {
        const result = await api.request(`/api/visit-templates/${templateId}/generate/${subjectId}`, {
            method: 'POST',
            body: JSON.stringify({ enrollmentDate, overwrite }),
        });
        closeModal();
        showToast(`${result.generated} visit${result.generated === 1 ? '' : 's'} generated successfully`, 'success');
        // Trigger page reload to show new visits
        window.dispatchEvent(new CustomEvent('visits-generated', { detail: { subjectId } }));
    } catch (err) {
        showToast(err.message, 'error');
    }
};
````

## `src/frontend/js/modules/vitalsigns.js`

````javascript
import { actionAttributes } from './visit-actions.js';
// ============================================================
// Vital Signs — study-wide view
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function bpClass(sys, dia) {
    if (!sys && !dia) return '';
    const s = Number(sys), d = Number(dia);
    if ((s && s > 140) || (d && d > 90) || (s && s < 90) || (d && d < 60)) {
        return 'text-amber-700 font-semibold';
    }
    return '';
}

let _allVitals = [];

export async function renderVitalSigns(container) {
    container.innerHTML = SPINNER;
    const user = api.getCurrentUser();
    const canWrite = ['investigator', 'admin', 'cra', 'data_entry'].includes(user?.role);

    let records = [];
    try {
        records = await api.request('/api/vitalsigns');
        _allVitals = records;
    } catch (err) {
        container.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    const visits = [];
    const visitSet = new Set();
    records.forEach(r => { if (r.visitName && !visitSet.has(r.visitName)) { visitSet.add(r.visitName); visits.push(r.visitName); } });

    container.innerHTML = `
    <div class="p-5 space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Vital Signs</h2>
                <p class="text-xs text-slate-500 mt-0.5">Physical measurements across all subjects and visits — abnormal BP highlighted in amber</p>
            </div>
            ${canWrite ? `
            <button onclick="openVitalForm()"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Add Vitals
            </button>` : ''}
        </div>

        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="vs-search" placeholder="Search by subject code…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <select id="vs-visit-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Visits</option>
                    ${visits.map(v => `<option>${esc(v)}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">Subject</th>
                            <th class="text-left">Date / Time</th>
                            <th class="text-left">Position</th>
                            <th class="text-left">BP (mmHg)</th>
                            <th class="text-left">HR</th>
                            <th class="text-left">RR</th>
                            <th class="text-left">Temp</th>
                            <th class="text-left">Weight</th>
                            <th class="text-left">BMI</th>
                            <th class="text-left">O₂ Sat</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="vs-tbody" class="ph-table-body">
                        ${renderVitalRows(records, user, canWrite)}
                    </tbody>
                </table>
            </div>
            <div id="vs-empty" class="${records.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="activity" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No vital signs recorded.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    function applyFilters() {
        const search = document.getElementById('vs-search').value.toLowerCase();
        const visit  = document.getElementById('vs-visit-filter').value;
        let filtered = _allVitals;
        if (search) filtered = filtered.filter(r => r.subjectCode?.toLowerCase().includes(search));
        if (visit)  filtered = filtered.filter(r => r.visitName === visit);
        document.getElementById('vs-tbody').innerHTML = renderVitalRows(filtered, user, canWrite);
        document.getElementById('vs-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('vs-search').addEventListener('input', applyFilters);
    document.getElementById('vs-visit-filter').addEventListener('change', applyFilters);
}

function renderVitalRows(records, user, canWrite) {
    if (!records.length) return '';
    const canQuery = ['cra', 'admin'].includes(user.role);
    return records.map(r => {
        const bpCls = bpClass(r.systolicBp, r.diastolicBp);
        const bpDisplay = (r.systolicBp || r.diastolicBp)
            ? `<span class="${bpCls}">${r.systolicBp ?? '?'}/${r.diastolicBp ?? '?'}</span>`
            : '—';
        return `
        <tr>
            <td>
                <p class="text-xs font-semibold font-mono text-slate-800">${esc(r.subjectCode || '—')}</p>
                ${r.visitName ? `<p class="text-xs text-slate-400">${esc(r.visitName)}</p>` : ''}
            </td>
            <td class="text-xs text-slate-600 whitespace-nowrap">
                ${fmtDate(r.assessmentDate)}
                ${r.assessmentTime ? `<br><span class="text-slate-400">${esc(r.assessmentTime)}</span>` : ''}
            </td>
            <td class="text-xs text-slate-600">${esc(r.position) || '—'}</td>
            <td class="text-xs whitespace-nowrap">${bpDisplay}</td>
            <td class="text-xs text-slate-600">${r.heartRate != null ? `${r.heartRate} bpm` : '—'}</td>
            <td class="text-xs text-slate-600">${r.respiratoryRate != null ? `${r.respiratoryRate} /min` : '—'}</td>
            <td class="text-xs text-slate-600 whitespace-nowrap">${r.temperature != null ? `${r.temperature} ${esc(r.temperatureUnit || '°C')}` : '—'}</td>
            <td class="text-xs text-slate-600 whitespace-nowrap">${r.weight != null ? `${r.weight} ${esc(r.weightUnit || 'kg')}` : '—'}</td>
            <td class="text-xs text-slate-600">${r.bmi != null ? parseFloat(r.bmi).toFixed(1) : '—'}</td>
            <td class="text-xs text-slate-600">${r.oxygenSaturation != null ? `${r.oxygenSaturation}%` : '—'}</td>
            <td class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                    ${canQuery ? `<button ${actionAttributes('query', [r.subjectId, r.visitId || null, 'vital_signs', 'Vital Signs — ' + (r.assessmentDate || '')])}
                        class="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded transition" title="Raise Query">
                        <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                    ${canWrite ? `
                    <button onclick="openVitalForm(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition" title="Edit">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="deleteVital(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.openVitalForm = async function(recordId = null) {
    const isEdit = recordId !== null;

    let subjects = [];
    try { subjects = await api.getSubjects(); } catch {}

    let rec = {};
    if (isEdit) {
        try { rec = await api.request(`/api/vitalsigns/${recordId}`); } catch {}
    }

    const subjectOptions = subjects.map(s =>
        `<option value="${s.id}" ${rec.subjectId === s.id ? 'selected' : ''}>${esc(s.subject_code)}</option>`
    ).join('');

    showModal({
        title: isEdit ? 'Edit Vital Signs' : 'Record Vital Signs',
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Subject <span class="text-red-500">*</span></label>
                    <select id="vs-subject-id" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white" onchange="loadVisitsForSubject()">
                        <option value="">— Select Subject —</option>
                        ${subjectOptions}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Visit</label>
                    <select id="vs-visit-id" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select after subject —</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="ph-label">Assessment Date <span class="text-red-500">*</span></label>
                    <input type="date" id="vs-date" value="${rec.assessmentDate ? rec.assessmentDate.split('T')[0] : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Time</label>
                    <input type="time" id="vs-time" value="${esc(rec.assessmentTime)}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Position</label>
                    <select id="vs-position" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        ${['Supine','Sitting','Standing'].map(p =>
                            `<option ${rec.position === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Systolic BP (mmHg)</label>
                    <input type="number" id="vs-sys" value="${rec.systolicBp ?? ''}" placeholder="e.g. 120"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Diastolic BP (mmHg)</label>
                    <input type="number" id="vs-dia" value="${rec.diastolicBp ?? ''}" placeholder="e.g. 80"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Heart Rate (bpm)</label>
                    <input type="number" id="vs-hr" value="${rec.heartRate ?? ''}" placeholder="e.g. 72"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Respiratory Rate (/min)</label>
                    <input type="number" id="vs-rr" value="${rec.respiratoryRate ?? ''}" placeholder="e.g. 16"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Temperature</label>
                    <div class="flex gap-2">
                        <input type="number" step="0.1" id="vs-temp" value="${rec.temperature ?? ''}" placeholder="e.g. 36.8"
                            class="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                        <select id="vs-temp-unit" class="px-2 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                            <option ${rec.temperatureUnit === '°C' || !rec.temperatureUnit ? 'selected' : ''}>°C</option>
                            <option ${rec.temperatureUnit === '°F' ? 'selected' : ''}>°F</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="ph-label">O₂ Saturation (%)</label>
                    <input type="number" id="vs-o2" value="${rec.oxygenSaturation ?? ''}" placeholder="e.g. 98"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="ph-label">Weight</label>
                    <div class="flex gap-2">
                        <input type="number" step="0.1" id="vs-weight" value="${rec.weight ?? ''}" placeholder="e.g. 70"
                            class="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                        <select id="vs-weight-unit" class="px-2 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                            <option ${rec.weightUnit === 'kg' || !rec.weightUnit ? 'selected' : ''}>kg</option>
                            <option ${rec.weightUnit === 'lbs' ? 'selected' : ''}>lbs</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="ph-label">Height</label>
                    <div class="flex gap-2">
                        <input type="number" step="0.1" id="vs-height" value="${rec.height ?? ''}" placeholder="e.g. 175"
                            class="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                        <select id="vs-height-unit" class="px-2 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                            <option ${rec.heightUnit === 'cm' || !rec.heightUnit ? 'selected' : ''}>cm</option>
                            <option ${rec.heightUnit === 'in' ? 'selected' : ''}>in</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="ph-label">BMI</label>
                    <div class="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 text-slate-500 flex items-center">
                        <span class="text-xs italic">Auto-calculated from weight/height</span>
                    </div>
                </div>
            </div>
            <div>
                <label class="ph-label">Notes</label>
                <textarea id="vs-notes" rows="2" placeholder="Additional clinical notes…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(rec.notes)}</textarea>
            </div>
            ${isEdit ? `
            <div>
                <label class="ph-label">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="vs-rfc" placeholder="Required — explain what changed and why"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none">
            </div>` : ''}
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitVitalForm(${recordId})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-4 h-4"></i> ${isEdit ? 'Save Changes' : 'Save Vitals'}
        </button>`,
    });

    // Pre-load visits if editing
    if (isEdit && rec.subjectId) {
        try {
            const visits = await api.getVisits(rec.subjectId);
            const sel = document.getElementById('vs-visit-id');
            sel.innerHTML = `<option value="">— None —</option>` +
                visits.map(v => `<option value="${v.id}" ${rec.visitId === v.id ? 'selected' : ''}>${esc(v.visit_name)}</option>`).join('');
        } catch {}
    }
};

window.loadVisitsForSubject = async function() {
    const subjectId = document.getElementById('vs-subject-id').value;
    const sel = document.getElementById('vs-visit-id');
    if (!subjectId) { sel.innerHTML = '<option value="">— Select after subject —</option>'; return; }
    sel.innerHTML = '<option value="">Loading…</option>';
    try {
        const visits = await api.getVisits(Number(subjectId));
        sel.innerHTML = `<option value="">— None —</option>` +
            visits.map(v => `<option value="${v.id}">${esc(v.visit_name)}</option>`).join('');
    } catch {
        sel.innerHTML = '<option value="">— Error loading visits —</option>';
    }
};

window.submitVitalForm = async function(recordId) {
    const isEdit    = recordId !== null;
    const subjectId = document.getElementById('vs-subject-id').value;
    const date      = document.getElementById('vs-date').value;
    if (!subjectId || !date) { showToast('Subject and assessment date are required.', 'error'); return; }

    const weight = parseFloat(document.getElementById('vs-weight').value) || null;
    const height = parseFloat(document.getElementById('vs-height').value) || null;
    let bmi = null;
    if (weight && height) {
        const hm = document.getElementById('vs-height-unit').value === 'cm' ? height / 100 : height * 0.0254;
        const kg = document.getElementById('vs-weight-unit').value === 'kg' ? weight : weight * 0.453592;
        bmi = parseFloat((kg / (hm * hm)).toFixed(1));
    }

    const payload = {
        subjectId:       Number(subjectId),
        visitId:         document.getElementById('vs-visit-id').value ? Number(document.getElementById('vs-visit-id').value) : null,
        assessmentDate:  date,
        assessmentTime:  document.getElementById('vs-time').value || null,
        position:        document.getElementById('vs-position').value || null,
        systolicBp:      parseFloat(document.getElementById('vs-sys').value) || null,
        diastolicBp:     parseFloat(document.getElementById('vs-dia').value) || null,
        heartRate:       parseFloat(document.getElementById('vs-hr').value) || null,
        respiratoryRate: parseFloat(document.getElementById('vs-rr').value) || null,
        temperature:     parseFloat(document.getElementById('vs-temp').value) || null,
        temperatureUnit: document.getElementById('vs-temp-unit').value,
        weight,
        weightUnit:      document.getElementById('vs-weight-unit').value,
        height,
        heightUnit:      document.getElementById('vs-height-unit').value,
        bmi,
        oxygenSaturation: parseFloat(document.getElementById('vs-o2').value) || null,
        notes:           document.getElementById('vs-notes').value.trim() || null,
    };

    if (isEdit) {
        const rfc = document.getElementById('vs-rfc')?.value?.trim();
        if (!rfc) { showToast('Reason for change is required.', 'error'); return; }
        payload.reason = rfc;
    }

    try {
        if (isEdit) {
            await api.request(`/api/vitalsigns/${recordId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        } else {
            await api.request('/api/vitalsigns', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeModal();
        showToast(isEdit ? 'Vital signs updated.' : 'Vital signs recorded.', 'success');
        await renderVitalSigns(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteVital = async function(recordId) {
    const reason = prompt('Reason for deletion (required):');
    if (!reason) return;
    try {
        await api.request(`/api/vitalsigns/${recordId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
        showToast('Vital signs record deleted.', 'success');
        await renderVitalSigns(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};
````

## `tests/security-hardening.test.js`

````javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import { encryptSecret, decryptSecret, backupDigest, equalDigest, tokenDigest } from '../src/backend/lib/security-crypto.js';
import { readSessionToken, sessionCookieOptions } from '../src/backend/lib/session.js';
import { trustedOrigins, validCredentials, checkOrigin, asyncRoute } from '../src/backend/lib/http-security.js';
import { visitActionAttributes, dispatchSafeAction } from '../src/frontend/js/modules/visit-actions.js';
import { safeErrorResponses, apiErrorHandler } from '../src/backend/middleware/errors.js';

process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.DATABASE_URL = 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.ALLOW_SELF_REGISTRATION = 'false';

function response() {
    return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
}

test('MFA encryption uses unique nonces and rejects tampering and another user', () => {
    const a = encryptSecret('TESTSECRET', 'user-a');
    const b = encryptSecret('TESTSECRET', 'user-a');
    assert.notEqual(a, b);
    assert.ok(!a.includes('TESTSECRET'));
    assert.equal(decryptSecret(a, 'user-a'), 'TESTSECRET');
    assert.throws(() => decryptSecret(a, 'user-b'));
    assert.throws(() => decryptSecret(a.slice(0, -1) + (a.endsWith('0') ? '1' : '0'), 'user-a'));
    assert.throws(() => decryptSecret('legacy-secret', 'user-a'));
});

test('backup codes are user-bound and comparisons reject different digests', () => {
    assert.equal(backupDigest('aa bb', 'a'), backupDigest('AABB', 'a'));
    assert.notEqual(backupDigest('AABB', 'a'), backupDigest('AABB', 'b'));
    assert.ok(equalDigest(backupDigest('AABB', 'a'), backupDigest('AABB', 'a')));
    assert.ok(!equalDigest(undefined, 'x'));
    assert.ok(!equalDigest('xx', 'xy'));
});

test('only new random session tokens are accepted, never stored digests or malformed cookies', () => {
    const token = 'v1.' + crypto.randomBytes(32).toString('hex');
    const read = value => readSessionToken({ headers: { cookie: `better-auth.session_token=${value}` } });
    assert.equal(read(token), token);
    assert.equal(read(tokenDigest(token)), null);
    assert.equal(read('old-bearer-token'), null);
    assert.equal(read('%'), null);
    assert.equal(readSessionToken({ headers: {} }), null);
});

test('production cookies are secure independently of request headers', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
        assert.equal(sessionCookieOptions().secure, true);
        assert.equal(sessionCookieOptions().httpOnly, true);
        assert.equal(sessionCookieOptions().sameSite, 'lax');
    } finally {
        if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
    }
});

test('credential validation rejects type confusion and excessive password lengths', () => {
    for (const email of [123, {}, [], null, 'bad']) assert.ok(!validCredentials({ email, password: 'x' }));
    assert.ok(!validCredentials({ email: 'a@b.test', password: 'x'.repeat(257) }));
    assert.ok(validCredentials({ email: 'a@b.test', password: 'StrongPassword!27' }));
});

test('unrelated Vercel origins fail both allowlist and mutation checks', () => {
    assert.ok(!trustedOrigins().has('https://untrusted-third-party.vercel.app'));
    const res = response();
    let called = false;
    checkOrigin({ method: 'POST', path: '/mfa/initiate', headers: { origin: 'https://untrusted-third-party.vercel.app' } }, res, () => called = true);
    assert.equal(res.statusCode, 403);
    assert.equal(called, false);
});

test('visit labels remain escaped data, including the original injection payload', () => {
    const attrs = visitActionAttributes('select', 1, `');globalThis.pwned=true;//"><img src=x onerror=alert(1)>`);
    assert.ok(!attrs.includes('onclick='));
    assert.ok(!attrs.includes('<img'));
    assert.ok(attrs.includes('&quot;'));
    assert.ok(attrs.includes('&#39;'));
});

test('malformed login and session inputs get controlled HTTP responses without a database', async t => {
    const { default: mfa } = await import('../src/backend/routes/mfa.js');
    const { default: register } = await import('../src/backend/routes/register.js');
    const { requireAuth } = await import('../src/backend/middleware/auth.js');
    const app = express();
    app.use(safeErrorResponses, express.json());
    app.use('/api/mfa', mfa);
    app.use('/api/register', register);
    app.get('/private', requireAuth, (_req, res) => res.json({ ok: true }));
    app.get('/throw', asyncRoute(async () => { throw new Error('private diagnostic'); }));
    app.use(apiErrorHandler);
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const email of [123, {}, [], null]) {
        const result = await fetch(base + '/api/mfa/initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'x' }) });
        assert.equal(result.status, 400);
    }
    const malformed = await fetch(base + '/private', { headers: { cookie: 'better-auth.session_token=%' } });
    assert.equal(malformed.status, 401);
    const signup = await fetch(base + '/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.ADMIN_EMAIL || 'admin@example.test', role: 'admin', password: 'Arbitrary!Password29', name: 'Caller', acceptedLicense: true }) });
    assert.equal(signup.status, 403);
    const error = await fetch(base + '/throw');
    assert.equal(error.status, 500);
    assert.ok(!(await error.text()).includes('private diagnostic'));
    const legacy = await fetch(base + '/api/mfa/verify', { method: 'POST' });
    assert.equal(legacy.status, 410);
});

test('safe action dispatch passes hostile labels as literal values, never evaluates them', () => {
    const label = "');globalThis.pwned = true;//";
    let received;
    assert.equal(dispatchSafeAction({ dataset: { safeAction: 'select', safeArgs: JSON.stringify([42, label]) } },
        { selectVisit: (...args) => received = args }), true);
    assert.deepEqual(received, [42, label]);
    assert.equal(globalThis.pwned, undefined);
    assert.equal(dispatchSafeAction({ dataset: { safeAction: 'inlineQuery', safeArgs: JSON.stringify(['field', label]) } },
        { openInlineQueryModal: (...args) => received = args }), true);
    assert.deepEqual(received, ['field', label]);
    assert.equal(dispatchSafeAction({ dataset: { safeAction: 'constructor', safeArgs: '[]' } }), false);
});
````

## `tests/security-integration.test.js`

````javascript
// Opt-in integration test for an isolated, migrated, disposable localhost DB/app.
// SECURITY_TEST_DATABASE_URL and SECURITY_TEST_BASE_URL must point to that instance.
// SECURITY_TEST_MFA_KEY must equal its MFA_ENCRYPTION_KEY.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import postgres from 'postgres';
import { hashPassword } from '@better-auth/utils/password';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';

const enabled = !!process.env.SECURITY_TEST_DATABASE_URL && !!process.env.SECURITY_TEST_BASE_URL;
test('security HTTP/SQL integration on disposable PostgreSQL', { skip: !enabled }, async t => {
    const url = new URL(process.env.SECURITY_TEST_DATABASE_URL);
    const base = process.env.SECURITY_TEST_BASE_URL;
    assert.equal(url.hostname, '127.0.0.1');
    assert.equal(new URL(base).hostname, '127.0.0.1');
    const sql = postgres(url.toString(), { max: 4, onnotice: () => {} });
    t.after(() => sql.end());
    const suffix = crypto.randomBytes(5).toString('hex');
    const password = 'Isolated-Test!Password28';
    const hash = await hashPassword(password);
    const [orgA, orgB] = await sql`INSERT INTO organizations (name, slug)
        VALUES ('Test A', ${'a-' + suffix}), ('Test B', ${'b-' + suffix}) RETURNING *`;
    const [studyA] = await sql`INSERT INTO studies (title, protocol_no, organization_id, status)
        VALUES ('Study A', ${'PA-' + suffix}, ${orgA.id}, 'Active') RETURNING id`;
    const [studyB] = await sql`INSERT INTO studies (title, protocol_no, organization_id, status)
        VALUES ('Study B', ${'PB-' + suffix}, ${orgB.id}, 'Active') RETURNING id`;
    const [siteA, siteA2] = await sql`INSERT INTO sites (name, code, organization_id)
        VALUES ('A1', ${'A1-' + suffix}, ${orgA.id}), ('A2', ${'A2-' + suffix}, ${orgA.id}) RETURNING id`;
    const [siteB] = await sql`INSERT INTO sites (name, code, organization_id)
        VALUES ('B', ${'B-' + suffix}, ${orgB.id}) RETURNING id`;
    const users = {};
    for (const [name, role, org] of [['admin', 'admin', orgA], ['pi', 'pi', orgA], ['other', 'admin', orgB]]) {
        const id = crypto.randomUUID(), email = `${name}-${suffix}@example.test`;
        await sql`INSERT INTO "user" (id, name, email, email_verified, role, organization_id)
            VALUES (${id}, ${name}, ${email}, TRUE, ${role}, ${org.id})`;
        await sql`INSERT INTO account (id, account_id, provider_id, user_id, password)
            VALUES (${crypto.randomUUID()}, ${id}, 'credential', ${id}, ${hash})`;
        users[name] = { id, email };
    }
    await sql`INSERT INTO study_users (study_id, user_id) VALUES (${studyA.id}, ${users.pi.id})`;
    await sql`INSERT INTO user_sites (user_id, site_id, study_id) VALUES (${users.pi.id}, ${siteA.id}, ${studyA.id})`;
    const [subjectA, subjectA2] = await sql`INSERT INTO subjects (study_id, site_id, subject_code)
        VALUES (${studyA.id}, ${siteA.id}, ${'SA-' + suffix}), (${studyA.id}, ${siteA2.id}, ${'SA2-' + suffix}) RETURNING *`;
    const [subjectB] = await sql`INSERT INTO subjects (study_id, site_id, subject_code)
        VALUES (${studyB.id}, ${siteB.id}, ${'SB-' + suffix}) RETURNING *`;
    const [assignmentB] = await sql`INSERT INTO subject_randomization (subject_id, rand_code, treatment_arm)
        VALUES (${subjectB.id}, ${'RB-' + suffix}, 'Secret B') RETURNING *`;

    async function request(path, { method = 'GET', body, cookie, study = studyA.id, origin } = {}) {
        const result = await fetch(base + path, { method, headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(cookie ? { cookie } : {}), ...(study ? { 'X-Study-ID': String(study) } : {}),
            ...(origin ? { origin } : {}),
        }, body: body ? JSON.stringify(body) : undefined });
        const text = await result.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }
        return { status: result.status, data, cookie: result.headers.get('set-cookie')?.split(';')[0] };
    }
    async function login(name = 'admin') {
        const result = await request('/api/mfa/initiate', { method: 'POST', body: { email: users[name].email, password } });
        assert.equal(result.status, 200, JSON.stringify(result.data));
        return result;
    }
    // This is a disposable test database only; reset shared buckets between scenarios.
    const resetLimits = () => sql`DELETE FROM security_rate_limits`;
    await resetLimits();
    let admin = await login(), pi = await login('pi');

    await t.test('login stores a hash, and both logout endpoints revoke replay', async () => {
        const [session] = await sql`SELECT token FROM session WHERE user_id = ${users.admin.id}`;
        assert.ok(session.token.startsWith('sha256:'));
        assert.ok(!admin.cookie.includes(session.token));
        assert.equal((await request('/api/auth/get-session', { cookie: admin.cookie })).status, 200);
        assert.equal((await request('/api/mfa/logout', { method: 'POST', cookie: admin.cookie })).status, 200);
        assert.equal((await request('/api/auth/get-session', { cookie: admin.cookie })).status, 401);
        admin = await login();
        assert.equal((await request('/api/auth/sign-out', { method: 'POST', cookie: admin.cookie })).status, 200);
        assert.equal((await request('/api/auth/get-session', { cookie: admin.cookie })).status, 401);
        admin = await login();
    });

    await t.test('randomization reads and unblind deny foreign tenant objects', async () => {
        assert.equal((await request('/api/randomization?subjectId=not-an-id', { cookie: admin.cookie })).status, 400);
        assert.equal((await request('/api/randomization/not-an-id/unblind', {
            method: 'PATCH', cookie: admin.cookie, body: { reason: 'Invalid id test' },
        })).status, 400);
        const all = await request('/api/randomization', { cookie: admin.cookie });
        assert.equal(all.status, 200);
        assert.ok(!all.data.some(row => row.id === assignmentB.id));
        const query = await request(`/api/randomization?subjectId=${subjectB.id}`, { cookie: admin.cookie });
        assert.deepEqual(query.data, []);
        const changed = await request(`/api/randomization/${assignmentB.id}/unblind`, { method: 'PATCH', cookie: admin.cookie, body: { reason: 'Integration test' } });
        assert.equal(changed.status, 404);
        const [row] = await sql`SELECT is_blinded FROM subject_randomization WHERE id = ${assignmentB.id}`;
        assert.equal(row.is_blinded, true);
    });

    await t.test('site scope covers overview, CSV and ODM; no sites means no subjects', async () => {
        const overview = await request('/api/subjects/status-overview', { cookie: pi.cookie });
        assert.equal(overview.status, 200);
        assert.deepEqual(overview.data.map(row => row.id), [subjectA.id]);
        for (const path of ['/api/export/csv?domain=DM', '/api/export/odm']) {
            const exported = await request(path, { cookie: pi.cookie });
            assert.equal(exported.status, 200, JSON.stringify(exported.data));
            assert.ok(exported.data.includes(subjectA.subject_code));
            assert.ok(!exported.data.includes(subjectA2.subject_code));
            assert.ok(!exported.data.includes(subjectB.subject_code));
        }
        await sql`DELETE FROM user_sites WHERE user_id = ${users.pi.id}`;
        assert.deepEqual((await request('/api/subjects', { cookie: pi.cookie })).data, []);
    });

    await t.test('concurrent randomization consumes exactly one slot per assignment', async () => {
        await sql`INSERT INTO randomization_list (study_id, rand_code, treatment_arm)
            VALUES (${studyA.id}, ${'R1-' + suffix}, 'A'), (${studyA.id}, ${'R2-' + suffix}, 'B')`;
        const results = await Promise.all([subjectA, subjectA2].map(subject => request('/api/randomization', {
            method: 'POST', cookie: admin.cookie, body: { subjectId: subject.id },
        })));
        assert.deepEqual(results.map(row => row.status), [201, 201], JSON.stringify(results));
        const rows = await sql`SELECT rand_code FROM subject_randomization WHERE subject_id IN (${subjectA.id}, ${subjectA2.id})`;
        assert.equal(new Set(rows.map(row => row.rand_code)).size, 2);
        const repeat = await request('/api/randomization', { method: 'POST', cookie: admin.cookie, body: { subjectId: subjectA.id } });
        assert.equal(repeat.status, 409);
    });

    await t.test('failed randomization insert rolls back slot consumption', async () => {
        const [subject] = await sql`INSERT INTO subjects (study_id, site_id, subject_code)
            VALUES (${studyA.id}, ${siteA.id}, ${'FAIL-' + suffix}) RETURNING id`;
        const [slot] = await sql`INSERT INTO randomization_list (study_id, rand_code, treatment_arm, stratum)
            VALUES (${studyA.id}, ${assignmentB.rand_code}, 'Test', ${'fail-' + suffix}) RETURNING id`;
        const result = await request('/api/randomization', { method: 'POST', cookie: admin.cookie,
            body: { subjectId: subject.id, stratum: 'fail-' + suffix } });
        assert.equal(result.status, 500);
        const [after] = await sql`SELECT is_used FROM randomization_list WHERE id = ${slot.id}`;
        assert.equal(after.is_used, false);
    });

    await t.test('MFA setup cannot overwrite an enabled factor; challenges and backup codes are single use', async () => {
        await resetLimits();
        const setup = await request('/api/mfa/totp/setup', { method: 'POST', cookie: admin.cookie });
        assert.equal(setup.status, 200, JSON.stringify(setup.data));
        const totp = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() });
        const code = await totp.generate({ secret: setup.data.secret });
        const enable = await request('/api/mfa/totp/enable', { method: 'POST', cookie: admin.cookie, body: { totpCode: code } });
        assert.equal(enable.status, 200, JSON.stringify(enable.data));
        const [stored] = await sql`SELECT * FROM user_totp WHERE user_id = ${users.admin.id}`;
        assert.ok(stored.secret.startsWith('enc1:'));
        assert.ok(!JSON.stringify(stored).includes(enable.data.backupCodes[0]));
        assert.equal((await request('/api/mfa/totp/setup', { method: 'POST', cookie: admin.cookie })).status, 409);
        const challenge = await login();
        assert.equal(challenge.data.status, 'totp_required');
        assert.equal(challenge.cookie, undefined);
        const [verification] = await sql`SELECT * FROM verification WHERE identifier = ${'mfa:' + users.admin.id}`;
        assert.ok(!JSON.stringify(verification).includes(challenge.data.tempToken));
        const concurrent = await Promise.all([1, 2].map(() => request('/api/mfa/totp-verify', { method: 'POST', body: {
            tempToken: challenge.data.tempToken, totpCode: enable.data.backupCodes[0],
        } })));
        assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 401]);
        const secondChallenge = await login();
        const replay = await request('/api/mfa/totp-verify', { method: 'POST', body: { tempToken: secondChallenge.data.tempToken, totpCode: enable.data.backupCodes[0] } });
        assert.equal(replay.status, 401);
        const success = await request('/api/mfa/totp-verify', { method: 'POST', body: { tempToken: secondChallenge.data.tempToken, totpCode: code } });
        assert.equal(success.status, 200, JSON.stringify(success.data));
        admin = success;
    });

    await t.test('database MFA failures fail closed instead of issuing a password-only session', async () => {
        await resetLimits();
        await sql`ALTER TABLE user_totp RENAME TO user_totp_test_hidden`;
        try {
            const result = await request('/api/mfa/initiate', { method: 'POST', body: { email: users.admin.email, password } });
            assert.equal(result.status, 500);
            assert.equal(result.cookie, undefined);
        } finally { await sql`ALTER TABLE user_totp_test_hidden RENAME TO user_totp`; }
    });

    await t.test('lockout works again after prior unlock and concurrent failures are counted', async () => {
        await resetLimits();
        await sql`INSERT INTO account_locks (user_id, email, failed_count, unlocked_at)
            VALUES (${users.other.id}, ${users.other.email}, 0, NOW()) ON CONFLICT (email)
            DO UPDATE SET failed_count = 0, unlocked_at = NOW()`;
        await Promise.all(Array.from({ length: 5 }, () => request('/api/mfa/initiate', { method: 'POST', body: { email: users.other.email, password: 'wrong' } })));
        const [row] = await sql`SELECT * FROM account_locks WHERE email = ${users.other.email}`;
        assert.equal(row.failed_count, 5);
        assert.equal(row.unlocked_at, null);
        assert.ok(row.locked_at);
        const blocked = await request('/api/mfa/initiate', { method: 'POST', body: { email: users.other.email, password } });
        assert.equal(blocked.status, 423);
    });

    await t.test('password change rotates current session and revokes other sessions and pending challenges', async () => {
        await resetLimits();
        const result = await request('/api/security/change-password', { method: 'POST', cookie: admin.cookie,
            body: { currentPassword: password, newPassword: 'New-Independent!Password83' } });
        assert.equal(result.status, 200, JSON.stringify(result.data));
        assert.ok(result.cookie && result.cookie !== admin.cookie);
        assert.equal((await request('/api/auth/get-session', { cookie: admin.cookie })).status, 401);
        assert.equal((await request('/api/auth/get-session', { cookie: result.cookie })).status, 200);
        const rows = await sql`SELECT id FROM session WHERE user_id = ${users.admin.id}`;
        assert.equal(rows.length, 1);
        const pending = await sql`SELECT id FROM verification WHERE identifier = ${'mfa:' + users.admin.id}`;
        assert.equal(pending.length, 0);
    });
    await t.test('legacy MFA material is migrated once and the same key is required afterwards', async () => {
        const userId = users.other.id;
        await sql`INSERT INTO user_totp (user_id, secret, is_enabled, backup_codes)
            VALUES (${userId}, 'JBSWY3DPEHPK3PXP', TRUE, ${sql.json([{ code: 'ABCDEF123456', used: false }])})`;
        process.env.MFA_ENCRYPTION_KEY = process.env.SECURITY_TEST_MFA_KEY;
        assert.match(process.env.MFA_ENCRYPTION_KEY || '', /^[a-f0-9]{64}$/i, 'provide the isolated server MFA key');
        const { migrateSecurity } = await import('../src/backend/lib/security-migration.js');
        process.env.DATABASE_URL = url.toString();
        const { client: migrationClient } = await import('../src/backend/db/connection.js');
        t.after(() => migrationClient.end());
        await migrateSecurity(migrationClient);
        const [first] = await sql`SELECT * FROM user_totp WHERE user_id = ${userId}`;
        assert.ok(first.secret.startsWith('enc1:'));
        assert.ok(first.backup_codes[0].digest);
        assert.equal(first.backup_codes[0].code, undefined);
        await migrateSecurity(migrationClient);
        const [second] = await sql`SELECT secret FROM user_totp WHERE user_id = ${userId}`;
        assert.equal(second.secret, first.secret);
        process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
        await assert.rejects(() => migrateSecurity(migrationClient));
        process.env.MFA_ENCRYPTION_KEY = process.env.SECURITY_TEST_MFA_KEY;
    });

    await t.test('local provisioning creates an admin and refuses to promote an existing account', async () => {
        const input = { email: 'provision-' + suffix + '@example.test', name: 'Provision test',
            password: 'Provision-Password!26', role: 'admin', acceptedLicense: true };
        const options = { env: { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: 'test' },
            input: JSON.stringify(input), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] };
        const output = execFileSync(process.execPath, ['scripts/provision-admin.js'], options);
        assert.ok(!output.includes(input.password));
        assert.throws(() => execFileSync(process.execPath, ['scripts/provision-admin.js'], options));
        const [created] = await sql`SELECT role FROM "user" WHERE email = ${input.email}`;
        assert.equal(created.role, 'admin');
    });

    await t.test('rate limiting uses database buckets and rejects requests after the shared IP ceiling', async () => {
        await resetLimits();
        const results = await Promise.all(Array.from({ length: 31 }, () => request('/api/mfa/direct-login', { method: 'POST' })));
        assert.equal(results.filter(result => result.status === 410).length, 30);
        assert.equal(results.filter(result => result.status === 429).length, 1);
        const rows = await sql`SELECT count FROM security_rate_limits`;
        assert.ok(rows.some(row => row.count === 31));
    });

});
````

## `tests/sitescope.test.js`

````javascript
// Unit tests for site-level isolation helpers (lib/sitescope.js).
// DB-dependent paths (user_sites lookups) are covered indirectly; these tests
// pin the scope semantics that every clinical route relies on.

import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';

const { siteCondition, subjectInSiteScope, SITE_BOUND_ROLES } =
    await import('../src/backend/lib/sitescope.js');

test('site-bound roles are exactly pi, investigator, crc', () => {
    assert.deepEqual([...SITE_BOUND_ROLES].sort(), ['crc', 'investigator', 'pi']);
});

test('siteCondition returns undefined when the request is unscoped', () => {
    assert.equal(siteCondition({ siteScope: null }), undefined);
    assert.ok(siteCondition({}), 'missing scope must fail closed');
    assert.ok(siteCondition({ siteScope: [] }));
});

test('siteCondition returns a SQL condition when scoped', () => {
    const cond = siteCondition({ siteScope: [1, 2] });
    assert.ok(cond, 'expected a drizzle condition object');
});

test('subjectInSiteScope allows everything when unscoped', async () => {
    assert.equal(await subjectInSiteScope({ siteScope: null }, 123), true);
    assert.equal(await subjectInSiteScope({}, 123), false);
    assert.equal(await subjectInSiteScope({ siteScope: [] }, 123), false);
});

test('subjectInSiteScope allows study-level records (no subject)', async () => {
    assert.equal(await subjectInSiteScope({ siteScope: [1] }, null), true);
    assert.equal(await subjectInSiteScope({ siteScope: [1] }, undefined), true);
});
````

## Changelog singkat

- Menutup pengambilalihan akun bootstrap: registrasi publik tidak dapat lagi memberikan role admin/platform owner; provisioning dipindahkan ke perintah lokal `npm run provision:admin`.
- Mengikat read dan unblind randomisasi pada study, tenant, dan site yang aktif; ID divalidasi ketat.
- Membuat alokasi randomisasi atomik dengan transaksi, row lock, `SKIP LOCKED`, dan rollback penuh.
- Menghilangkan sink stored XSS dari label kunjungan dan label klinis lain dengan dispatcher action berbasis data serta encoding atribut.
- Menambahkan validasi tipe dan panjang input autentikasi, wrapper async Express 4, dan respons error terkontrol.
- Mencegah setup MFA menimpa faktor aktif; challenge dibatasi percobaan, terikat pada credential dan secret, serta dikonsumsi atomik.
- Mengenkripsi secret TOTP menggunakan AES-256-GCM dan menyimpan backup code sebagai HMAC; migrasi startup mengubah data legacy dan gagal tertutup bila kunci salah.
- Mengganti bearer session di database dengan digest SHA-256, menyatukan dua endpoint logout, mencabut session lama saat password berubah, dan merotasi session aktif.
- Mengubah pemeriksaan lock, forced password change, MFA, study lock, dan site scope menjadi fail-closed.
- Mengubah scope site kosong menjadi tanpa akses serta menerapkan scope tersebut pada overview, ekspor CSV, dan ODM.
- Memperbaiki lockout setelah unlock dan serialisasi percobaan login; rate limit kini atomik dan dibagi antarinstance melalui PostgreSQL.
- Membatasi CORS pada origin deployment yang eksplisit dan menambahkan pemeriksaan Origin untuk request mutasi.
- Mengunci seed demo agar hanya berjalan bila diaktifkan eksplisit, membuat password acak, serta menyimpan kredensial ke file privat.
- Menambahkan pengujian keamanan unit dan integrasi PostgreSQL untuk tenant isolation, session replay, MFA, lockout, rate limit, XSS, provisioning, dan race condition.
- Review awal tidak memiliki temuan berlabel MINOR, sehingga tidak ada komentar `// TODO: ...` MINOR yang ditambahkan.
