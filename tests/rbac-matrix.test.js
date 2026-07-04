// RBAC matrix test — verifies every core clinical route's role guard against
// the golden matrix in expected-permissions.js, in both directions:
//   1. every documented route exists with exactly the documented roles;
//   2. every live route is documented (no silent new/unguarded endpoints).
//
// Routers are imported directly; postgres-js connects lazily, so no database
// is needed. Run with: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPECTED, ROUTER_FILES } from './expected-permissions.js';

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';

const ROUTES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/backend/routes');

// Walk an Express router's stack and return { "METHOD /path": roles|null }.
function extractGuards(router) {
    const entries = {};
    for (const layer of router.stack) {
        if (!layer.route) continue;
        const routePath = layer.route.path;
        for (const rl of layer.route.stack) {
            const method = rl.method?.toUpperCase();
            if (!method) continue;
            const key = `${method} ${routePath}`;
            if (rl.handle.allowedRoles) {
                entries[key] = [...rl.handle.allowedRoles].sort();
            } else if (!(key in entries)) {
                entries[key] = null;
            }
        }
    }
    return entries;
}

for (const [mount, file] of Object.entries(ROUTER_FILES)) {
    test(`RBAC matrix: ${mount} (${file})`, async () => {
        const { default: router } = await import(path.join(ROUTES_DIR, file));
        const actual = extractGuards(router);
        const expected = EXPECTED[mount];

        // Direction 1: documented routes must exist with exactly these roles.
        for (const [route, roles] of Object.entries(expected)) {
            assert.ok(route in actual,
                `${mount}: documented route "${route}" not found in router — ` +
                `route removed/renamed without updating tests/expected-permissions.js`);
            assert.deepEqual(actual[route], roles,
                `${mount} ${route}: role guard drifted.\n` +
                `  expected: ${JSON.stringify(roles)}\n` +
                `  actual:   ${JSON.stringify(actual[route])}\n` +
                `If this change is intentional, update ROLE_MATRIX.md and tests/expected-permissions.js together.`);
        }

        // Direction 2: no undocumented routes.
        for (const route of Object.keys(actual)) {
            assert.ok(route in expected,
                `${mount}: route "${route}" exists in the router but is not documented in ` +
                `tests/expected-permissions.js — add it there (and to ROLE_MATRIX.md if role-guarded).`);
        }
    });
}
