// SaaS subscription plans + usage metering (Phase 4).
//
// Plan limits are defined in code (not the DB) so they can be tuned without a
// migration; the organization only stores which plan it is on
// (organizations.plan). `null` limit = unlimited.
//
// Actual billing/charging is intentionally NOT implemented here — it requires a
// payment processor (Stripe/Xendit/etc.) and its API keys. The subscription
// state (plan, status, trial) is modelled so a processor webhook can drive it;
// see docs/MULTI_TENANCY_PLAN.md Phase 4.

import { client } from '../db/connection.js';

export const PLANS = {
    trial:      { label: 'Trial',      maxStudies: 1,    maxUsers: 5,    maxSubjects: 50 },
    standard:   { label: 'Standard',   maxStudies: 5,    maxUsers: 25,   maxSubjects: 1000 },
    enterprise: { label: 'Enterprise', maxStudies: null, maxUsers: null, maxSubjects: null },
};

export function planLimits(plan) {
    return PLANS[plan] ?? PLANS.standard;
}

// Live resource counts for a tenant.
export async function orgUsage(orgId) {
    const [studies]  = await client`SELECT count(*)::int AS c FROM studies WHERE organization_id = ${orgId}`;
    const [users]    = await client`SELECT count(*)::int AS c FROM "user" WHERE organization_id = ${orgId}`;
    const [subjects] = await client`
        SELECT count(*)::int AS c FROM subjects s
        JOIN studies st ON st.id = s.study_id
        WHERE st.organization_id = ${orgId}`;
    return { studies: studies.c, users: users.c, subjects: subjects.c };
}

const RESOURCE_TO_LIMIT = { studies: 'maxStudies', users: 'maxUsers', subjects: 'maxSubjects' };

// Check whether the tenant may add one more of `resource`.
// Returns { ok, limit, current }. Unlimited plans and platform-global
// (orgId null → platform_owner) always ok.
export async function checkLimit(orgId, resource) {
    if (orgId == null) return { ok: true, limit: null, current: null };
    const [org] = await client`SELECT plan FROM organizations WHERE id = ${orgId}`;
    const limit = planLimits(org?.plan)[RESOURCE_TO_LIMIT[resource]];
    if (limit == null) return { ok: true, limit: null, current: null };
    const usage = await orgUsage(orgId);
    const current = usage[resource];
    return { ok: current < limit, limit, current };
}
