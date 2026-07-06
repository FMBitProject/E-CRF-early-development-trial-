/**
 * Seed script — run once to populate demo data.
 * Usage: npm run db:seed
 */
import 'dotenv/config';
import { eq, isNull } from 'drizzle-orm';
import { db } from './connection.js';
import { auth } from '../auth/better-auth.js';
import { organizations, sites, subjects, visits, crfForms, user } from './schemas/schema.js';

// ─── Sites ───────────────────────────────────────────────────────────────────
const seedSites = [
    { name: 'Jakarta General Hospital', code: 'JKT-001', country: 'Indonesia', piName: 'Dr. Budi Santoso' },
    { name: 'Surabaya Medical Center',  code: 'SBY-001', country: 'Indonesia', piName: 'Dr. Siti Rahayu' },
];

// ─── Demo users (Better Auth email/password) ─────────────────────────────────
const seedUsers = [
    { name: 'Admin User',       email: 'admin@ecrf.local',       password: 'Admin@123',       role: 'admin' },
    { name: 'Dr. Investigator', email: 'investigator@ecrf.local', password: 'Investigator@123', role: 'investigator' },
    { name: 'CRA Monitor',      email: 'cra@ecrf.local',         password: 'CRA@123456',      role: 'cra' },
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
            console.log(`   ~ ${u.email} already exists`);
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
    console.log('Demo accounts:');
    console.log('  admin@ecrf.local         / Admin@123');
    console.log('  investigator@ecrf.local  / Investigator@123');
    console.log('  cra@ecrf.local           / CRA@123456');

    process.exit(0);
}

main().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
