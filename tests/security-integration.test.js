// Opt-in integration test for an isolated, migrated, disposable localhost DB/app.
// SECURITY_TEST_DATABASE_URL and SECURITY_TEST_BASE_URL must point to that instance.
// SECURITY_TEST_MFA_KEY must equal its MFA_ENCRYPTION_KEY.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import postgres from 'postgres';
import { hashPassword } from '@better-auth/utils/password';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';

const enabled = !!process.env.SECURITY_TEST_DATABASE_URL && !!process.env.SECURITY_TEST_BASE_URL;
test('security HTTP/SQL integration on disposable PostgreSQL', { skip: !enabled }, async t => {
    const url = new URL(process.env.SECURITY_TEST_DATABASE_URL);
    const base = process.env.SECURITY_TEST_BASE_URL;
    assert.equal(url.hostname, '127.0.0.1');
    assert.equal(new URL(base).hostname, '127.0.0.1');
    const sql = postgres(url.toString(), { max: 4, onnotice: () => {} });
    t.after(() => sql.end());
    const suffix = crypto.randomBytes(5).toString('hex');
    const password = 'Isolated-Test!Password28';
    const hash = await hashPassword(password);
    const [orgA, orgB] = await sql`INSERT INTO organizations (name, slug)
        VALUES ('Test A', ${'a-' + suffix}), ('Test B', ${'b-' + suffix}) RETURNING *`;
    const [studyA] = await sql`INSERT INTO studies (title, protocol_no, organization_id, status)
        VALUES ('Study A', ${'PA-' + suffix}, ${orgA.id}, 'Active') RETURNING id`;
    const [studyB] = await sql`INSERT INTO studies (title, protocol_no, organization_id, status)
        VALUES ('Study B', ${'PB-' + suffix}, ${orgB.id}, 'Active') RETURNING id`;
    const [siteA, siteA2] = await sql`INSERT INTO sites (name, code, organization_id)
        VALUES ('A1', ${'A1-' + suffix}, ${orgA.id}), ('A2', ${'A2-' + suffix}, ${orgA.id}) RETURNING id`;
    const [siteB] = await sql`INSERT INTO sites (name, code, organization_id)
        VALUES ('B', ${'B-' + suffix}, ${orgB.id}) RETURNING id`;
    const users = {};
    for (const [name, role, org] of [['admin', 'admin', orgA], ['pi', 'pi', orgA], ['other', 'admin', orgB]]) {
        const id = crypto.randomUUID(), email = `${name}-${suffix}@example.test`;
        await sql`INSERT INTO "user" (id, name, email, email_verified, role, organization_id)
            VALUES (${id}, ${name}, ${email}, TRUE, ${role}, ${org.id})`;
        await sql`INSERT INTO account (id, account_id, provider_id, user_id, password)
            VALUES (${crypto.randomUUID()}, ${id}, 'credential', ${id}, ${hash})`;
        users[name] = { id, email };
    }
    await sql`INSERT INTO study_users (study_id, user_id) VALUES (${studyA.id}, ${users.pi.id})`;
    await sql`INSERT INTO user_sites (user_id, site_id, study_id) VALUES (${users.pi.id}, ${siteA.id}, ${studyA.id})`;
    const [subjectA, subjectA2] = await sql`INSERT INTO subjects (study_id, site_id, subject_code)
        VALUES (${studyA.id}, ${siteA.id}, ${'SA-' + suffix}), (${studyA.id}, ${siteA2.id}, ${'SA2-' + suffix}) RETURNING *`;
    const [subjectB] = await sql`INSERT INTO subjects (study_id, site_id, subject_code)
        VALUES (${studyB.id}, ${siteB.id}, ${'SB-' + suffix}) RETURNING *`;
    const [assignmentB] = await sql`INSERT INTO subject_randomization (subject_id, rand_code, treatment_arm)
        VALUES (${subjectB.id}, ${'RB-' + suffix}, 'Secret B') RETURNING *`;

    async function request(path, { method = 'GET', body, cookie, study = studyA.id, origin } = {}) {
        const result = await fetch(base + path, { method, headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(cookie ? { cookie } : {}), ...(study ? { 'X-Study-ID': String(study) } : {}),
            ...(origin ? { origin } : {}),
        }, body: body ? JSON.stringify(body) : undefined });
        const text = await result.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }
        return { status: result.status, data, cookie: result.headers.get('set-cookie')?.split(';')[0] };
    }
    async function login(name = 'admin') {
        const result = await request('/api/mfa/initiate', { method: 'POST', body: { email: users[name].email, password } });
        assert.equal(result.status, 200, JSON.stringify(result.data));
        return result;
    }
    // This is a disposable test database only; reset shared buckets between scenarios.
    const resetLimits = () => sql`DELETE FROM security_rate_limits`;
    await resetLimits();
    let admin = await login(), pi = await login('pi');

    await t.test('login stores a hash, and both logout endpoints revoke replay', async () => {
        const [session] = await sql`SELECT token FROM session WHERE user_id = ${users.admin.id}`;
        assert.ok(session.token.startsWith('sha256:'));
        assert.ok(!admin.cookie.includes(session.token));
        assert.equal((await request('/api/auth/get-session', { cookie: admin.cookie })).status, 200);
        assert.equal((await request('/api/mfa/logout', { method: 'POST', cookie: admin.cookie })).status, 200);
        assert.equal((await request('/api/auth/get-session', { cookie: admin.cookie })).status, 401);
        admin = await login();
        assert.equal((await request('/api/auth/sign-out', { method: 'POST', cookie: admin.cookie })).status, 200);
        assert.equal((await request('/api/auth/get-session', { cookie: admin.cookie })).status, 401);
        admin = await login();
    });

    await t.test('a non-platform session fails closed when its organization disappears', async () => {
        await sql`UPDATE "user" SET organization_id = NULL WHERE id = ${users.admin.id}`;
        try {
            const result = await request('/api/auth/get-session', { cookie: admin.cookie });
            assert.equal(result.status, 403);
        } finally {
            await sql`UPDATE "user" SET organization_id = ${orgA.id} WHERE id = ${users.admin.id}`;
        }
    });

    await t.test('page access immediately reflects password resets, account locks and study removal', async () => {
        await sql`INSERT INTO password_meta (user_id, must_change) VALUES (${users.pi.id}, TRUE)
            ON CONFLICT (user_id) DO UPDATE SET must_change = TRUE`;
        assert.equal((await request('/api/dashboard/stats', { cookie: pi.cookie })).status, 403);
        assert.equal((await request('/api/security/password-status', { cookie: pi.cookie })).status, 200);
        await sql`UPDATE password_meta SET must_change = FALSE WHERE user_id = ${users.pi.id}`;
        await sql`INSERT INTO account_locks (user_id, email, locked_at, unlocked_at)
            VALUES (${users.pi.id}, ${users.pi.email}, NOW(), NULL)
            ON CONFLICT (email) DO UPDATE SET locked_at = NOW(), unlocked_at = NULL, auto_unlock_at = NULL`;
        assert.equal((await request('/api/dashboard/stats', { cookie: pi.cookie })).status, 423);
        await sql`UPDATE account_locks SET unlocked_at = NOW() WHERE user_id = ${users.pi.id}`;
        { const result = await request('/api/dashboard/stats', { cookie: pi.cookie });
          assert.equal(result.status, 200, JSON.stringify(result.data)); }
        await sql`DELETE FROM study_users WHERE user_id = ${users.pi.id} AND study_id = ${studyA.id}`;
        assert.equal((await request('/api/dashboard/stats', { cookie: pi.cookie })).status, 403);
        await sql`INSERT INTO study_users (study_id, user_id) VALUES (${studyA.id}, ${users.pi.id})`;
        { const result = await request('/api/dashboard/stats', { cookie: pi.cookie });
          assert.equal(result.status, 200, JSON.stringify(result.data)); }
    });

    await t.test('randomization reads and unblind deny foreign tenant objects', async () => {
        assert.equal((await request('/api/randomization?subjectId=not-an-id', { cookie: admin.cookie })).status, 400);
        assert.equal((await request('/api/randomization/not-an-id/unblind', {
            method: 'PATCH', cookie: admin.cookie, body: { reason: 'Invalid id test' },
        })).status, 400);
        const all = await request('/api/randomization', { cookie: admin.cookie });
        assert.equal(all.status, 200);
        assert.ok(!all.data.some(row => row.id === assignmentB.id));
        const query = await request(`/api/randomization?subjectId=${subjectB.id}`, { cookie: admin.cookie });
        assert.deepEqual(query.data, []);
        const changed = await request(`/api/randomization/${assignmentB.id}/unblind`, { method: 'PATCH', cookie: admin.cookie, body: { reason: 'Integration test' } });
        assert.equal(changed.status, 404);
        const [row] = await sql`SELECT is_blinded FROM subject_randomization WHERE id = ${assignmentB.id}`;
        assert.equal(row.is_blinded, true);
    });

    await t.test('site scope covers overview, CSV and ODM; no sites means no subjects', async () => {
        const overview = await request('/api/subjects/status-overview', { cookie: pi.cookie });
        assert.equal(overview.status, 200);
        assert.deepEqual(overview.data.map(row => row.id), [subjectA.id]);
        for (const path of ['/api/export/csv?domain=DM', '/api/export/odm']) {
            const exported = await request(path, { cookie: pi.cookie });
            assert.equal(exported.status, 200, JSON.stringify(exported.data));
            assert.ok(exported.data.includes(subjectA.subject_code));
            assert.ok(!exported.data.includes(subjectA2.subject_code));
            assert.ok(!exported.data.includes(subjectB.subject_code));
        }
        await sql`DELETE FROM user_sites WHERE user_id = ${users.pi.id}`;
        assert.deepEqual((await request('/api/subjects', { cookie: pi.cookie })).data, []);
    });

    await t.test('concurrent randomization consumes exactly one slot per assignment', async () => {
        await sql`INSERT INTO randomization_list (study_id, rand_code, treatment_arm)
            VALUES (${studyA.id}, ${'R1-' + suffix}, 'A'), (${studyA.id}, ${'R2-' + suffix}, 'B')`;
        const results = await Promise.all([subjectA, subjectA2].map(subject => request('/api/randomization', {
            method: 'POST', cookie: admin.cookie, body: { subjectId: subject.id },
        })));
        assert.deepEqual(results.map(row => row.status), [201, 201], JSON.stringify(results));
        const rows = await sql`SELECT rand_code FROM subject_randomization WHERE subject_id IN (${subjectA.id}, ${subjectA2.id})`;
        assert.equal(new Set(rows.map(row => row.rand_code)).size, 2);
        const repeat = await request('/api/randomization', { method: 'POST', cookie: admin.cookie, body: { subjectId: subjectA.id } });
        assert.equal(repeat.status, 409);
    });

    await t.test('failed unblinding audit rolls back the irreversible state change', async () => {
        const [assignment] = await sql`SELECT id FROM subject_randomization WHERE subject_id = ${subjectA.id}`;
        await sql`ALTER TABLE audit_trails RENAME TO audit_trails_test_hidden`;
        try {
            const result = await request(`/api/randomization/${assignment.id}/unblind`, {
                method: 'PATCH', cookie: admin.cookie, body: { reason: 'Rollback test' },
            });
            assert.equal(result.status, 500);
        } finally {
            await sql`ALTER TABLE audit_trails_test_hidden RENAME TO audit_trails`;
        }
        const [after] = await sql`SELECT is_blinded FROM subject_randomization WHERE id = ${assignment.id}`;
        assert.equal(after.is_blinded, true);
    });

    await t.test('randomization codes are study-local and list uploads are atomic', async () => {
        const sharedCode = 'SHARED-' + suffix;
        const first = await request('/api/randomization/list', { method: 'POST', cookie: admin.cookie,
            body: { entries: [{ randCode: sharedCode, treatmentArm: 'A' }] } });
        assert.equal(first.status, 201, JSON.stringify(first.data));
        const duplicate = await request('/api/randomization/list', { method: 'POST', cookie: admin.cookie,
            body: { entries: [{ randCode: sharedCode, treatmentArm: 'B' }] } });
        assert.equal(duplicate.status, 409);
        const normalizedCode = sharedCode.toUpperCase();
        await sql`INSERT INTO randomization_list (study_id, rand_code, treatment_arm)
            VALUES (${studyB.id}, ${normalizedCode}, 'B')`;
        const rows = await sql`SELECT study_id FROM randomization_list WHERE rand_code = ${normalizedCode}`;
        assert.equal(rows.length, 2);
    });

    await t.test('failed randomization audit rolls back slot consumption and assignment', async () => {
        const [subject] = await sql`INSERT INTO subjects (study_id, site_id, subject_code)
            VALUES (${studyA.id}, ${siteA.id}, ${'FAIL-' + suffix}) RETURNING id`;
        const [slot] = await sql`INSERT INTO randomization_list (study_id, rand_code, treatment_arm, stratum)
            VALUES (${studyA.id}, ${'ROLLBACK-' + suffix}, 'Test', ${'fail-' + suffix}) RETURNING id`;
        await sql`ALTER TABLE audit_trails RENAME TO audit_trails_test_hidden`;
        try {
            const result = await request('/api/randomization', { method: 'POST', cookie: admin.cookie,
                body: { subjectId: subject.id, stratum: 'fail-' + suffix } });
            assert.equal(result.status, 500);
        } finally {
            await sql`ALTER TABLE audit_trails_test_hidden RENAME TO audit_trails`;
        }
        const [after] = await sql`SELECT is_used FROM randomization_list WHERE id = ${slot.id}`;
        assert.equal(after.is_used, false);
        const assignments = await sql`SELECT id FROM subject_randomization WHERE subject_id = ${subject.id}`;
        assert.equal(assignments.length, 0);
    });

    await t.test('MFA setup cannot overwrite an enabled factor; challenges and backup codes are single use', async () => {
        await resetLimits();
        const setup = await request('/api/mfa/totp/setup', { method: 'POST', cookie: admin.cookie });
        assert.equal(setup.status, 200, JSON.stringify(setup.data));
        const totp = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() });
        const code = await totp.generate({ secret: setup.data.secret });
        const enable = await request('/api/mfa/totp/enable', { method: 'POST', cookie: admin.cookie, body: { totpCode: code } });
        assert.equal(enable.status, 200, JSON.stringify(enable.data));
        const [stored] = await sql`SELECT * FROM user_totp WHERE user_id = ${users.admin.id}`;
        assert.ok(stored.secret.startsWith('enc1:'));
        assert.ok(!JSON.stringify(stored).includes(enable.data.backupCodes[0]));
        assert.equal((await request('/api/mfa/totp/setup', { method: 'POST', cookie: admin.cookie })).status, 409);
        const challenge = await login();
        assert.equal(challenge.data.status, 'totp_required');
        assert.equal(challenge.cookie, undefined);
        const [verification] = await sql`SELECT * FROM verification WHERE identifier = ${'mfa:' + users.admin.id}`;
        assert.ok(!JSON.stringify(verification).includes(challenge.data.tempToken));
        const concurrent = await Promise.all([1, 2].map(() => request('/api/mfa/totp-verify', { method: 'POST', body: {
            tempToken: challenge.data.tempToken, totpCode: enable.data.backupCodes[0],
        } })));
        assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 401]);
        const secondChallenge = await login();
        const replay = await request('/api/mfa/totp-verify', { method: 'POST', body: { tempToken: secondChallenge.data.tempToken, totpCode: enable.data.backupCodes[0] } });
        assert.equal(replay.status, 401);
        const success = await request('/api/mfa/totp-verify', { method: 'POST', body: { tempToken: secondChallenge.data.tempToken, totpCode: code } });
        assert.equal(success.status, 200, JSON.stringify(success.data));
        admin = success;
    });

    await t.test('database MFA failures fail closed instead of issuing a password-only session', async () => {
        await resetLimits();
        await sql`ALTER TABLE user_totp RENAME TO user_totp_test_hidden`;
        try {
            const result = await request('/api/mfa/initiate', { method: 'POST', body: { email: users.admin.email, password } });
            assert.equal(result.status, 500);
            assert.equal(result.cookie, undefined);
        } finally { await sql`ALTER TABLE user_totp_test_hidden RENAME TO user_totp`; }
    });

    await t.test('lockout works again after prior unlock and concurrent failures are counted', async () => {
        await resetLimits();
        await sql`INSERT INTO account_locks (user_id, email, failed_count, unlocked_at)
            VALUES (${users.other.id}, ${users.other.email}, 0, NOW()) ON CONFLICT (email)
            DO UPDATE SET failed_count = 0, unlocked_at = NOW()`;
        await Promise.all(Array.from({ length: 5 }, () => request('/api/mfa/initiate', { method: 'POST', body: { email: users.other.email, password: 'wrong' } })));
        const [row] = await sql`SELECT * FROM account_locks WHERE email = ${users.other.email}`;
        assert.equal(row.failed_count, 5);
        assert.equal(row.unlocked_at, null);
        assert.ok(row.locked_at);
        const blocked = await request('/api/mfa/initiate', { method: 'POST', body: { email: users.other.email, password } });
        assert.equal(blocked.status, 423);
    });

    await t.test('password change rotates current session and revokes other sessions and pending challenges', async () => {
        await resetLimits();
        const result = await request('/api/security/change-password', { method: 'POST', cookie: admin.cookie,
            body: { currentPassword: password, newPassword: 'New-Independent!Password83' } });
        assert.equal(result.status, 200, JSON.stringify(result.data));
        assert.ok(result.cookie && result.cookie !== admin.cookie);
        assert.equal((await request('/api/auth/get-session', { cookie: admin.cookie })).status, 401);
        assert.equal((await request('/api/auth/get-session', { cookie: result.cookie })).status, 200);
        const rows = await sql`SELECT id FROM session WHERE user_id = ${users.admin.id}`;
        assert.equal(rows.length, 1);
        const pending = await sql`SELECT id FROM verification WHERE identifier = ${'mfa:' + users.admin.id}`;
        assert.equal(pending.length, 0);
        const reused = await request('/api/security/change-password', { method: 'POST', cookie: result.cookie,
            body: { currentPassword: 'New-Independent!Password83', newPassword: password } });
        assert.equal(reused.status, 400);
        admin = result;
    });
    await t.test('legacy MFA material is migrated once and the same key is required afterwards', async () => {
        const userId = users.other.id;
        await sql`INSERT INTO user_totp (user_id, secret, is_enabled, backup_codes)
            VALUES (${userId}, 'JBSWY3DPEHPK3PXP', TRUE, ${sql.json([{ code: 'ABCDEF123456', used: false }])})`;
        process.env.MFA_ENCRYPTION_KEY = process.env.SECURITY_TEST_MFA_KEY;
        assert.match(process.env.MFA_ENCRYPTION_KEY || '', /^[a-f0-9]{64}$/i, 'provide the isolated server MFA key');
        const { migrateSecurity } = await import('../src/backend/lib/security-migration.js');
        process.env.DATABASE_URL = url.toString();
        const { client: migrationClient } = await import('../src/backend/db/connection.js');
        t.after(() => migrationClient.end());
        await migrateSecurity(migrationClient);
        const [first] = await sql`SELECT * FROM user_totp WHERE user_id = ${userId}`;
        assert.ok(first.secret.startsWith('enc1:'));
        assert.ok(first.backup_codes[0].digest);
        assert.equal(first.backup_codes[0].code, undefined);
        await migrateSecurity(migrationClient);
        const [second] = await sql`SELECT secret FROM user_totp WHERE user_id = ${userId}`;
        assert.equal(second.secret, first.secret);
        process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
        await assert.rejects(() => migrateSecurity(migrationClient));
        process.env.MFA_ENCRYPTION_KEY = process.env.SECURITY_TEST_MFA_KEY;
    });

    await t.test('local provisioning creates an admin and refuses to promote an existing account', async () => {
        const input = { email: 'provision-' + suffix + '@example.test', name: 'Provision test',
            password: 'Provision-Password!26', role: 'admin', acceptedLicense: true };
        const options = { env: { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: 'test' },
            input: JSON.stringify(input), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] };
        const output = execFileSync(process.execPath, ['scripts/provision-admin.js'], options);
        assert.ok(!output.includes(input.password));
        assert.throws(() => execFileSync(process.execPath, ['scripts/provision-admin.js'], options));
        const [created] = await sql`SELECT role FROM "user" WHERE email = ${input.email}`;
        assert.equal(created.role, 'admin');
    });

    await t.test('rate limiting uses database buckets and rejects requests after the shared IP ceiling', async () => {
        await resetLimits();
        const results = await Promise.all(Array.from({ length: 31 }, (_, index) => request('/api/mfa/initiate', {
            method: 'POST', body: { email: `rate-${index}-${suffix}@example.test`, password: 'Wrong-Password!27' },
        })));
        assert.equal(results.filter(result => result.status === 401).length, 30);
        assert.equal(results.filter(result => result.status === 429).length, 1);
        const rows = await sql`SELECT count FROM security_rate_limits`;
        assert.ok(rows.some(row => row.count === 31));
        assert.equal((await request('/api/mfa/logout', { method: 'POST', cookie: admin.cookie })).status, 200);
    });

});
