// Opt-in: STARTUP_TEST_DATABASE_URL must be a disposable localhost PostgreSQL
// administrator connection. Each case creates and removes its own database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import crypto from 'node:crypto';
import postgres from 'postgres';

const enabled = !!process.env.STARTUP_TEST_DATABASE_URL;
const root = new URL('../', import.meta.url);
async function unusedPort() {
    const server = createServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = server.address().port;
    await new Promise(resolve => server.close(resolve));
    return port;
}

async function fixture(t, { legacy = false, missingKey = false } = {}) {
    const url = new URL(process.env.STARTUP_TEST_DATABASE_URL);
    assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'only isolated localhost PostgreSQL is allowed');
    const admin = postgres(url.toString(), { onnotice: () => {} });
    const name = `startup_test_${crypto.randomBytes(6).toString('hex')}`;
    await admin.unsafe(`CREATE DATABASE "${name}"`);
    url.pathname = '/' + name;
    const db = postgres(url.toString(), { onnotice: () => {} });
    let child;
    t.after(async () => {
        if (child && child.exitCode === null && child.signalCode === null) {
            const stopped = once(child, 'exit');
            child.kill('SIGTERM');
            await stopped;
        }
        await db.end();
        await admin.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
        await admin.end();
    });
    if (legacy) {
        const sql = await readFile(new URL('src/backend/db/migrations/0000_daffy_carnage.sql', root), 'utf8');
        for (const statement of sql.split('--> statement-breakpoint')) {
            if (statement.trim()) await db.unsafe(statement);
        }
        await db`INSERT INTO "user" (id, name, email, role) VALUES ('legacy-pi', 'Test PI', 'pi@example.test', 'pi')`;
        await db`INSERT INTO subjects (subject_code) VALUES ('LEGACY-KEEP')`;
    }
    const port = await unusedPort();
    const base = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, ['src/backend/server.js'], {
        cwd: root,
        env: { ...process.env, DATABASE_URL: url.toString(), PORT: String(port),
            NODE_ENV: 'development', BETTER_AUTH_URL: base,
            BETTER_AUTH_SECRET: crypto.randomBytes(32).toString('hex'),
            MFA_ENCRYPTION_KEY: missingKey ? '' : crypto.randomBytes(32).toString('hex'),
            LICENSE_ENFORCEMENT: 'false', SMTP_HOST: '', STRIPE_SECRET_KEY: '' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let logs = '';
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('isolated server failed to bind')), 10000);
        const capture = data => {
            logs += data.toString();
            if (logs.includes('E-CRF Server running')) { clearTimeout(timer); resolve(); }
        };
        child.stdout.on('data', capture);
        child.stderr.on('data', capture);
        child.once('error', error => { clearTimeout(timer); reject(error); });
        child.once('exit', () => { clearTimeout(timer); reject(new Error('isolated server exited before binding')); });
    });
    const get = (path, headers = {}) => fetch(base + path, { headers, signal: AbortSignal.timeout(20000) });
    return { db, get, logs: () => logs };
}

test('startup upgrade and API access on disposable PostgreSQL', { skip: !enabled }, async t => {
    for (const legacy of [false, true]) {
        await t.test(legacy ? 'legacy database keeps data and restores all module APIs' : 'fresh database initializes successfully', async t => {
            const { db, get } = await fixture(t, { legacy });
            const ready = await get('/api/ready');
            assert.equal(ready.status, 200);
            assert.deepEqual(await ready.json(), { status: 'ready', db: 'up' });
            if (!legacy) return;
            assert.equal((await db`SELECT * FROM subjects WHERE subject_code = 'LEGACY-KEEP'`).length, 1);
            assert.equal((await db`SELECT * FROM "user" WHERE id = 'legacy-pi'`).length, 1);
            const [org] = await db`INSERT INTO organizations (name, slug) VALUES ('Test Org', 'startup-test') RETURNING id`;
            const [study] = await db`INSERT INTO studies (title, protocol_no, organization_id) VALUES ('Test Study', 'STARTUP', ${org.id}) RETURNING id`;
            const [site] = await db`INSERT INTO sites (name, code, organization_id) VALUES ('Test Site', 'TEST', ${org.id}) RETURNING id`;
            await db`UPDATE "user" SET organization_id = ${org.id}, site_id = ${site.id} WHERE id = 'legacy-pi'`;
            await db`INSERT INTO study_users (study_id, user_id) VALUES (${study.id}, 'legacy-pi')`;
            await db`UPDATE subjects SET study_id = ${study.id}, site_id = ${site.id} WHERE subject_code = 'LEGACY-KEEP'`;
            const token = 'v1.' + crypto.randomBytes(32).toString('hex');
            const digest = 'sha256:' + crypto.createHash('sha256').update(token).digest('hex');
            await db`INSERT INTO session (id, user_id, token, expires_at) VALUES ('test-session', 'legacy-pi', ${digest}, NOW() + INTERVAL '1 hour')`;
            const headers = { Cookie: 'better-auth.session_token=' + token, 'X-Study-ID': String(study.id) };
            const paths = ['/api/dashboard/stats', '/api/subjects', '/api/screening', '/api/consents',
                '/api/randomization', '/api/medhistory', '/api/conmeds', '/api/vitalsigns', '/api/lab',
                '/api/ip', '/api/ae', '/api/deviations', '/api/queries', '/api/dblock/status',
                '/api/delegation', '/api/saereports', '/api/monitoring', '/api/essential-docs',
                '/api/monitoring-plan', '/api/security/password-status'];
            for (const path of paths) {
                const response = await get(path, headers);
                assert.equal(response.status, 200, path);
                await response.json();
            }
            assert.equal((await get('/api/subjects')).status, 401, 'anonymous access is still denied');
        });
    }
    await t.test('missing encryption key still blocks APIs and gives an actionable private log', async t => {
        const { get, logs } = await fixture(t, { missingKey: true });
        assert.equal((await get('/api/ready')).status, 503);
        assert.equal((await get('/api/register/config')).status, 503);
        assert.equal((await get('/api/health')).status, 200);
        assert.match(logs(), /Startup incomplete; requests remain blocked: MFA_ENCRYPTION_KEY/);
    });
});
