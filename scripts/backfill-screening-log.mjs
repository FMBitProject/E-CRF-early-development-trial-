#!/usr/bin/env node
// One-time backfill: create a GCP Screening Log row (ICH E6(R3) §8.3.20) for
// subjects that were enrolled BEFORE screening-log auto-logging existed.
//
// Idempotent — subjects that already have a screening_log row (matched on
// enrolled_subject_id) are skipped, so it is safe to run more than once.
//
// Disposition is derived from the subject's current status; when a subject
// failed screening, the reason is enriched from its latest I/E assessment.
//
// Usage (on-prem Docker):
//   docker compose exec app node scripts/backfill-screening-log.mjs
// Locally:
//   node scripts/backfill-screening-log.mjs
import 'dotenv/config';
import { eq, desc } from 'drizzle-orm';
import { db, client } from '../src/backend/db/connection.js';
import { subjects, ieAssessments, screeningLog } from '../src/backend/db/schemas/schema.js';

// subject_status → screening disposition
const DISPOSITION = {
    'Screen Failed': 'Screen Failed',
    'Withdrawn':     'Withdrawn',
    'Active':        'Enrolled',
    'Completed':     'Enrolled',
};

function summarizeFailedCriteria(criteria) {
    const reasons = [];
    for (const c of Array.isArray(criteria) ? criteria : []) {
        if (c.type === 'inclusion' && !c.met) reasons.push(`Inclusion not met: ${c.label}`);
        if (c.type === 'exclusion' &&  c.met) reasons.push(`Exclusion applies: ${c.label}`);
    }
    return reasons.join('; ') || 'Did not meet eligibility criteria';
}

async function main() {
    const allSubjects = await db.select().from(subjects);
    let created = 0, skipped = 0;

    for (const s of allSubjects) {
        const [existing] = await db.select().from(screeningLog)
            .where(eq(screeningLog.enrolledSubjectId, s.id));
        if (existing) { skipped++; continue; }

        const disposition = DISPOSITION[s.status] ?? 'Pending';

        let failReason = null;
        if (disposition === 'Screen Failed') {
            const [latest] = await db.select().from(ieAssessments)
                .where(eq(ieAssessments.subjectId, s.id))
                .orderBy(desc(ieAssessments.assessedAt))
                .limit(1);
            failReason = latest ? summarizeFailedCriteria(latest.criteriaJson) : 'Did not meet eligibility criteria';
        }

        const screeningDate = (s.enrolledAt ? new Date(s.enrolledAt) : new Date())
            .toISOString().slice(0, 10);

        await db.insert(screeningLog).values({
            studyId:           s.studyId,
            siteId:            s.siteId,
            screeningDate,
            screeningCode:     s.subjectCode,
            subjectInitials:   s.initials ?? null,
            disposition,
            failReason,
            enrolledSubjectId: s.id,
            createdBy:         s.createdBy ?? null,
            createdByName:     'System (backfill)',
        });
        created++;
        console.log(`  + ${s.subjectCode} → ${disposition}${failReason ? ` (${failReason})` : ''}`);
    }

    console.log(`\nBackfill complete: ${created} screening-log row(s) created, ${skipped} already present.`);
}

main()
    .catch(err => { console.error('Backfill failed:', err.message); process.exitCode = 1; })
    .finally(() => client.end());
