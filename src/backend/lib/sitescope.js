// Site-level data isolation — ICH GCP: site staff (PI, investigator, CRC)
// work with their own site's subjects only. Admin, CRA/monitor, and data
// manager operate across sites (monitoring/oversight functions).
//
// req.siteScope semantics (set by middleware/study.js):
//   null       — role is not site-bound, no site restriction
//   number[]   — allowed site ids; empty array = no sites assigned yet
//                (treated as unscoped for backward compatibility with
//                deployments that never assigned sites — see below)

import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { userSites, subjects } from '../db/schemas/schema.js';

export const SITE_BOUND_ROLES = ['pi', 'investigator', 'crc'];

// Compute the allowed site ids for a user within a study.
// Union of user_sites assignments (per study) and the legacy user.site_id.
// Returns null when the role is not site-bound OR the user has no site
// assignment at all (legacy accounts) — scoping only activates once sites
// are actually assigned, so enabling it cannot lock existing users out.
export async function computeSiteScope(user, studyId) {
    if (!SITE_BOUND_ROLES.includes(user.role)) return null;

    const ids = new Set();
    if (user.siteId) ids.add(user.siteId);
    try {
        const rows = await db.select({ siteId: userSites.siteId }).from(userSites)
            .where(and(eq(userSites.userId, user.id), eq(userSites.studyId, studyId)));
        for (const r of rows) ids.add(r.siteId);
    } catch { /* user_sites table may not exist yet — fall back to user.siteId */ }

    return ids.size > 0 ? [...ids] : null;
}

// Drizzle condition limiting a query (joined to subjects) to the caller's
// sites. Returns undefined when unscoped, for use inside and(...) chains.
export function siteCondition(req) {
    return Array.isArray(req.siteScope) ? inArray(subjects.siteId, req.siteScope) : undefined;
}

// True when the caller may access the given subject (by id).
// Study-level records (subjectId null) are visible to all study members.
export async function subjectInSiteScope(req, subjectId) {
    if (!Array.isArray(req.siteScope)) return true;
    if (subjectId === null || subjectId === undefined) return true;
    const [s] = await db.select({ siteId: subjects.siteId }).from(subjects)
        .where(eq(subjects.id, parseInt(subjectId)));
    return !!s && req.siteScope.includes(s.siteId);
}
