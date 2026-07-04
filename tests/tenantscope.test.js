// Unit tests for tenant-isolation helpers (lib/tenantscope.js).
// These pin the organization-boundary semantics every scoped route relies on.
// (End-to-end cross-tenant HTTP probes live in the OQ scripts, docs/validation.)

import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';

const { isPlatformOwner, effectiveOrgId, sameOrg, orgCondition, PLATFORM_ROLE } =
    await import('../src/backend/lib/tenantscope.js');

const orgUser = (orgId, role = 'admin') => ({ role, organizationId: orgId });

test('platform_owner is the only cross-tenant role', () => {
    assert.equal(PLATFORM_ROLE, 'platform_owner');
    assert.equal(isPlatformOwner({ role: 'platform_owner' }), true);
    for (const r of ['admin', 'pi', 'investigator', 'cra', 'crc', 'data_manager']) {
        assert.equal(isPlatformOwner({ role: r }), false, `${r} must not be platform`);
    }
});

test('a normal user is bounded to their own organization', () => {
    const req = { user: orgUser(7), orgId: 7 };
    assert.equal(sameOrg(req, 7), true);
    assert.equal(sameOrg(req, 8), false, 'must not see another org');
    assert.equal(sameOrg(req, null), false);
    assert.equal(effectiveOrgId(req), 7);
});

test('admin of org A cannot reach org B (the closed bypass)', () => {
    const adminA = { user: orgUser(1, 'admin'), orgId: 1 };
    assert.equal(sameOrg(adminA, 1), true);
    assert.equal(sameOrg(adminA, 2), false, 'admin bypass across tenants must be closed');
});

test('platform_owner global sees every org; scoped sees only the target', () => {
    const global = { user: { role: 'platform_owner', organizationId: null }, orgId: null };
    assert.equal(sameOrg(global, 1), true);
    assert.equal(sameOrg(global, 999), true);
    assert.equal(effectiveOrgId(global), null);

    const scoped = { user: { role: 'platform_owner', organizationId: null }, orgId: 5 };
    assert.equal(sameOrg(scoped, 5), true);
    assert.equal(sameOrg(scoped, 6), false);
    assert.equal(effectiveOrgId(scoped), 5);
});

test('orgCondition filters for tenants and is a no-op for platform-global', () => {
    const col = Symbol('organization_id');
    assert.ok(orgCondition({ user: orgUser(3), orgId: 3 }, col), 'tenant → condition');
    assert.equal(
        orgCondition({ user: { role: 'platform_owner', organizationId: null }, orgId: null }, col),
        undefined,
        'platform global → no filter',
    );
    assert.ok(
        orgCondition({ user: { role: 'platform_owner', organizationId: null }, orgId: 4 }, col),
        'platform scoped → condition',
    );
});
