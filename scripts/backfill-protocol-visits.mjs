#!/usr/bin/env node
// One-time backfill: generate the protocol visit schedule for subjects that
// were enrolled BEFORE auto-generation existed.
//
// Only touches subjects that:
//   - belong to a study that HAS a visit_schedule template,
//   - are actively in the trial (status Active or Completed — screen failures
//     and withdrawals are skipped), and
//   - have NO visits yet (idempotent, safe to re-run).
//
// Usage (on-prem Docker):
//   docker compose exec app node scripts/backfill-protocol-visits.mjs
//   docker compose exec app node scripts/backfill-protocol-visits.mjs --dry-run
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, client } from '../src/backend/db/connection.js';
import { subjects, visits, studies } from '../src/backend/db/schemas/schema.js';
import { plannedDateFor } from '../src/backend/lib/visitschedule.js';

const DRY_RUN = process.argv.includes('--dry-run');
const ELIGIBLE_STATUS = new Set(['Active', 'Completed']);

async function main() {
    const allStudies = await db.select().from(studies);
    const scheduleByStudy = new Map(
        allStudies.map(s => [s.id, Array.isArray(s.visitSchedule) ? s.visitSchedule : null]),
    );

    const allSubjects = await db.select().from(subjects);
    let created = 0, skipped = 0, subjectsTouched = 0;

    for (const s of allSubjects) {
        const template = scheduleByStudy.get(s.studyId);
        if (!template || template.length === 0) { skipped++; continue; }
        if (!ELIGIBLE_STATUS.has(s.status))     { skipped++; continue; }

        const [already] = await db.select({ id: visits.id })
            .from(visits).where(eq(visits.subjectId, s.id)).limit(1);
        if (already) { skipped++; continue; }

        const enrolledOn = s.enrolledAt ?? new Date();
        const rows = template.map(v => ({
            subjectId:     s.id,
            visitName:     v.name,
            visitOrder:    v.order ?? null,
            visitType:     'Scheduled',
            plannedDate:   plannedDateFor(enrolledOn, v.studyDay),
            windowDays:    v.windowDays ?? 0,
            studyDay:      v.studyDay,
            status:        'Scheduled',
            createdByName: 'System (backfill)',
        }));

        console.log(`  + ${s.subjectCode}: ${rows.length} visit(s)` +
                    ` [${rows.map(r => `${r.visitName}@${r.plannedDate}`).join(', ')}]`);
        if (!DRY_RUN) await db.insert(visits).values(rows);
        created += rows.length;
        subjectsTouched++;
    }

    console.log(
        `\n${DRY_RUN ? '[DRY RUN] ' : ''}Backfill complete: ` +
        `${created} visit(s) for ${subjectsTouched} subject(s); ${skipped} subject(s) skipped ` +
        `(no template, not Active/Completed, or already had visits).`,
    );
}

main()
    .catch(err => { console.error('Backfill failed:', err.message); process.exitCode = 1; })
    .finally(() => client.end());
