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
    // TODO: Validate the complete subject ID and bind this helper query to req.studyId; parseInt accepts trailing garbage.
    const [s] = await db.select({ siteId: subjects.siteId }).from(subjects)
        .where(eq(subjects.id, parseInt(subjectId)));
    return !!s && req.siteScope.includes(s.siteId);
}
