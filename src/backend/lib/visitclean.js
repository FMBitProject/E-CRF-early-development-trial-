/**
 * Checks if a subject's data is "clean":
 *   - No open queries for the subject
 *   - At least one SDV record exists AND all SDV records are Verified or N/A
 * If clean, sends a notification email to PI and investigators at the subject's site.
 */
import { eq, and, count } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { queries, sdvRecords, subjects, sites, user } from '../db/schemas/schema.js';
import { sendVisitCleanEmail } from './email.js';

export async function checkAndNotifyVisitClean(studyId, subjectId) {
    try {
        // Count open queries for this subject
        const [{ openCount }] = await db
            .select({ openCount: count() })
            .from(queries)
            .where(and(
                eq(queries.studyId, studyId),
                eq(queries.subjectId, subjectId),
                eq(queries.status, 'Open'),
            ));

        if (Number(openCount) > 0) return; // still has open queries

        // Check SDV: must have at least one record and none in pending/discrepant state
        const sdvRows = await db
            .select({ sdvStatus: sdvRecords.sdvStatus })
            .from(sdvRecords)
            .where(eq(sdvRecords.subjectId, subjectId));

        if (sdvRows.length === 0) return; // no SDV done yet

        const hasPending = sdvRows.some(r =>
            r.sdvStatus === 'Not Reviewed' ||
            r.sdvStatus === 'Discrepant' ||
            r.sdvStatus === 'In Review'
        );
        if (hasPending) return; // SDV not 100% clean

        // Subject is clean — fetch subject + site info
        const [subjectRow] = await db
            .select({
                subjectCode: subjects.subjectCode,
                siteId:      subjects.siteId,
                siteName:    sites.name,
            })
            .from(subjects)
            .leftJoin(sites, eq(subjects.siteId, sites.id))
            .where(eq(subjects.id, subjectId));

        if (!subjectRow?.siteId) return;

        // Notify PI and investigators at this site
        const notifyUsers = await db
            .select({ email: user.email, name: user.name, role: user.role })
            .from(user)
            .where(eq(user.siteId, subjectRow.siteId));

        for (const u of notifyUsers) {
            if (!['pi', 'investigator'].includes(u.role)) continue;
            sendVisitCleanEmail(u.email, u.name, {
                subjectCode: subjectRow.subjectCode,
                siteName:    subjectRow.siteName,
            }).catch(() => {});
        }
    } catch (err) {
        console.error('checkAndNotifyVisitClean error:', err.message);
    }
}
