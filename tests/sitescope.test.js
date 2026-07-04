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
    assert.equal(siteCondition({}), undefined);
});

test('siteCondition returns a SQL condition when scoped', () => {
    const cond = siteCondition({ siteScope: [1, 2] });
    assert.ok(cond, 'expected a drizzle condition object');
});

test('subjectInSiteScope allows everything when unscoped', async () => {
    assert.equal(await subjectInSiteScope({ siteScope: null }, 123), true);
    assert.equal(await subjectInSiteScope({}, 123), true);
});

test('subjectInSiteScope allows study-level records (no subject)', async () => {
    assert.equal(await subjectInSiteScope({ siteScope: [1] }, null), true);
    assert.equal(await subjectInSiteScope({ siteScope: [1] }, undefined), true);
});
