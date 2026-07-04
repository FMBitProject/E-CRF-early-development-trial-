// SaaS tenant isolation — organization boundary (Phase 2).
//
// Every normal user belongs to exactly one organization (req.user.organizationId,
// mirrored to req.orgId by requireAuth). The `platform_owner` role is the only
// cross-tenant role (the SaaS operator); it has a NULL organization and may act
// globally, or scope into one tenant via the X-Org-ID header (→ req.orgId).
//
// Routes use:
//   - orgCondition(req, table.organizationId)  in list .where(...) chains
//   - sameOrg(req, row.organizationId)         to guard by-id reads/writes
//   - effectiveOrgId(req)                        when stamping new rows
// Cross-tenant access returns 404 (not 403) so one tenant cannot even probe
// the existence of another tenant's records.

import { eq } from 'drizzle-orm';

export const PLATFORM_ROLE = 'platform_owner';

export function isPlatformOwner(user) {
    return user?.role === PLATFORM_ROLE;
}

// The organization id a new row should be stamped with. For platform_owner this
// is whatever tenant they targeted via X-Org-ID (may be null if acting globally).
export function effectiveOrgId(req) {
    if (isPlatformOwner(req.user)) return req.orgId ?? null;
    return req.user?.organizationId ?? null;
}

// True when a row belonging to `rowOrgId` is visible to the caller.
export function sameOrg(req, rowOrgId) {
    if (isPlatformOwner(req.user)) {
        // Global mode sees everything; scoped mode sees only the targeted tenant.
        return req.orgId == null || rowOrgId === req.orgId;
    }
    return rowOrgId === req.user?.organizationId;
}

// Drizzle condition for list endpoints, e.g. .where(orgCondition(req, sites.organizationId)).
// Returns undefined when the caller is a platform_owner acting globally (no filter).
export function orgCondition(req, orgColumn) {
    if (isPlatformOwner(req.user) && req.orgId == null) return undefined;
    const target = isPlatformOwner(req.user) ? req.orgId : req.user?.organizationId;
    return eq(orgColumn, target);
}
