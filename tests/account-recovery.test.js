import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

for (const [name, url, message] of [
    ['missing database configuration', '', /DATABASE_URL is missing/],
    ['invalid database URL', 'not-a-database-url', /DATABASE_URL is invalid/],
    ['wrong database protocol', 'https://example.test', /DATABASE_URL is invalid/],
]) {
    test(`operator recovery explains ${name} before connecting`, () => {
        const result = spawnSync(process.execPath, ['scripts/unlock-account.mjs'], {
            env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', timeout: 5000,
            input: JSON.stringify({ email: 'admin@example.test', reason: 'Verified recovery test' }),
        });
        assert.equal(result.status, 1);
        assert.match(result.stderr, message);
        assert.ok(!result.stderr.includes('not-a-database-url'));
        assert.equal(result.stdout, '');
    });
}
