import { Router } from 'express';
import crypto from 'node:crypto';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin, generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { verifyPassword, hashPassword } from '@better-auth/utils/password';
import { client, db } from '../db/connection.js';
import { POLICY } from '../lib/passwordpolicy.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimitAuth } from '../middleware/ratelimit.js';
import { writeAudit } from '../lib/audit.js';
import { asyncRoute, validCredentials } from '../lib/http-security.js';
import { encryptSecret, decryptSecret, backupDigest, tokenDigest, equalDigest, credentialFingerprint } from '../lib/security-crypto.js';
import { createSession, setSessionCookie, clearSessionCookie, readSessionToken } from '../lib/session.js';

const router = Router();
const totp = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() });
// Match password verification cost for unknown users without storing any credential.
let dummyHash;
const codeIsValidInput = code => typeof code === 'string' && /^[a-zA-Z0-9\s]{6,24}$/.test(code);
const validateLoginInput = (req, res, next) => validCredentials(req.body)
    ? next()
    : res.status(400).json({ error: 'Invalid email or password format.' });
const validateChallengeInput = (req, res, next) => {
    const { tempToken, totpCode } = req.body ?? {};
    return typeof tempToken === 'string' && /^[a-f0-9]{64}$/.test(tempToken) && codeIsValidInput(totpCode)
        ? next()
        : res.status(400).json({ error: 'Invalid verification input.' });
};

function jsonArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function lockEmail(tx, email) {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 19))`;
}

async function recordFailure(tx, email, userId, ip) {
    await tx`INSERT INTO login_attempts (email, ip_address, success) VALUES (${email}, ${ip || 'unknown'}, FALSE)`;
    const [row] = await tx`
        INSERT INTO account_locks (user_id, email, failed_count, unlocked_at) VALUES (${userId}, ${email}, 1, NOW())
        ON CONFLICT (email) DO UPDATE SET failed_count = account_locks.failed_count + 1,
            user_id = COALESCE(EXCLUDED.user_id, account_locks.user_id)
        RETURNING id, failed_count
    `;
    if (row.failed_count >= POLICY.maxFailedAttempts) {
        await tx`UPDATE account_locks SET locked_at = NOW(), unlocked_at = NULL,
            unlocked_by = NULL, unlock_reason = NULL,
            auto_unlock_at = ${new Date(Date.now() + POLICY.lockoutMinutes * 60000).toISOString()} WHERE id = ${row.id}`;
    }
}

async function resetFailures(tx, email, ip) {
    await tx`WITH reset AS (
        UPDATE account_locks SET failed_count = 0, auto_unlock_at = NULL,
            unlocked_at = NOW(), unlock_reason = 'Successful authentication' WHERE email = ${email}
    ) INSERT INTO login_attempts (email, ip_address, success) VALUES (${email}, ${ip || 'unknown'}, TRUE)`;
}

async function checkAccount(tx, userId) {
    const [user] = await tx`SELECT u.*, o.status AS org_status,
        l.locked_at, l.unlocked_at, l.auto_unlock_at FROM "user" u
        LEFT JOIN organizations o ON o.id = u.organization_id
        LEFT JOIN account_locks l ON l.email = u.email WHERE u.id = ${userId} FOR UPDATE OF u`;
    if (!user || !user.is_active || !user.email_verified ||
        (user.role !== 'platform_owner' && user.org_status !== 'Active')) return null;
    if (user.locked_at && !user.unlocked_at && (!user.auto_unlock_at || new Date(user.auto_unlock_at) > new Date())) return null;
    return user;
}

function publicUser(user) {
    return { id: user.id, name: user.name, displayName: user.display_name ?? null, role: user.role };
}

async function verifyTotp(code, row) {
    if (!codeIsValidInput(code)) return false;
    const secret = decryptSecret(row.secret, row.user_id); // decryption/configuration failures must propagate
    try { return (await totp.verify(code.replace(/\s/g, ''), { secret })).valid; }
    catch { return false; }
}

async function loginAudit(store, user, req, reason) {
    await writeAudit(store, {
        tableName: 'user', recordId: user.id, action: 'LOGIN', reason,
        user: { ...user, organizationId: user.organization_id }, ipAddress: req.ip,
    });
}

router.post('/initiate', validateLoginInput, rateLimitAuth, asyncRoute(async (req, res) => {
    const email = req.body.email.trim().toLowerCase();
    const result = await client.begin(async tx => {
        await lockEmail(tx, email);
        const [record] = await tx`SELECT u.id, a.password FROM "user" u JOIN account a ON a.user_id = u.id
            AND a.provider_id = 'credential' WHERE u.email = ${email}`;
        const [lock] = await tx`SELECT * FROM account_locks WHERE email = ${email}`;
        if (lock?.locked_at && !lock.unlocked_at) {
            if (!lock.auto_unlock_at || new Date(lock.auto_unlock_at) > new Date()) return { locked: true };
            await tx`UPDATE account_locks SET failed_count = 0, unlocked_at = NOW(), auto_unlock_at = NULL WHERE id = ${lock.id}`;
        }
        const passwordHash = record?.password || await (dummyHash ??= hashPassword(crypto.randomBytes(32).toString('hex')));
        const valid = await verifyPassword(passwordHash, req.body.password);
        if (!record || !valid) {
            await recordFailure(tx, email, record?.id ?? null, req.ip);
            return { invalid: true };
        }
        const user = await checkAccount(tx, record.id);
        if (!user) return { invalid: true };
        // Lock/read the current credential again to detect a concurrent password change.
        const [current] = await tx`SELECT a.password, m.is_enabled, m.secret FROM account a
            LEFT JOIN user_totp m ON m.user_id = a.user_id
            WHERE a.user_id = ${user.id} AND a.provider_id = 'credential'`;
        if (current?.password !== record.password) return { invalid: true };
        const mfa = current;
        if (mfa?.is_enabled) {
            decryptSecret(mfa.secret, user.id); // fail closed until legacy secrets have been migrated
            const tempToken = crypto.randomBytes(32).toString('hex');
            await tx`DELETE FROM verification WHERE identifier = ${`mfa:${user.id}`}`;
            await tx`INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at)
                VALUES (${tokenDigest(tempToken)}, ${`mfa:${user.id}`},
                    ${JSON.stringify({ userId: user.id, email, credential: credentialFingerprint(current.password), secretVersion: tokenDigest(mfa.secret), attempts: 0 })},
                    ${new Date(Date.now() + 10 * 60000).toISOString()}, NOW(), NOW())`;
            return { tempToken };
        }
        const token = await createSession(tx, user.id, req);
        await resetFailures(tx, email, req.ip);
        await loginAudit(tx, user, req, 'Successful login');
        return { token, user };
    });
    if (result.locked) return res.status(423).json({ error: 'Account temporarily locked.' });
    if (result.invalid) return res.status(401).json({ error: 'Invalid email or password.' });
    if (result.tempToken) return res.json({ status: 'totp_required', tempToken: result.tempToken });
    setSessionCookie(res, result.token);
    res.json({ status: 'authenticated', user: publicUser(result.user) });
}));

router.post('/totp-verify', validateChallengeInput, rateLimitAuth, asyncRoute(async (req, res) => {
    const { tempToken, totpCode } = req.body ?? {};
    const id = tokenDigest(tempToken);
    const result = await client.begin(async tx => {
        // Resolve only this indexed challenge; never scan all verification records.
        const [preview] = await tx`SELECT value FROM verification WHERE id = ${id} AND expires_at > NOW()`;
        if (!preview) return null;
        const context = JSON.parse(preview.value);
        await lockEmail(tx, context.email);
        const user = await checkAccount(tx, context.userId);
        if (!user) return null;
        const [challenge] = await tx`SELECT * FROM verification WHERE id = ${id} AND identifier = ${`mfa:${user.id}`}
            AND expires_at > NOW() FOR UPDATE`;
        if (!challenge) return null;
        const data = JSON.parse(challenge.value);
        const [credential] = await tx`SELECT password FROM account WHERE user_id = ${user.id} AND provider_id = 'credential'`;
        const [mfa] = await tx`SELECT * FROM user_totp WHERE user_id = ${user.id} FOR UPDATE`;
        if (data.attempts >= 5 || !credential || !mfa?.is_enabled ||
            !equalDigest(data.credential, credentialFingerprint(credential.password)) ||
            !equalDigest(data.secretVersion, tokenDigest(mfa.secret))) return null;
        let valid = await verifyTotp(totpCode, mfa);
        if (!valid) {
            const codes = jsonArray(mfa.backup_codes);
            const digest = backupDigest(totpCode, user.id);
            const match = codes.find(code => !code.used && equalDigest(code.digest, digest));
            if (match) {
                match.used = true;
                await tx`UPDATE user_totp SET backup_codes = ${JSON.stringify(codes)} WHERE user_id = ${user.id}`;
                valid = true;
            }
        }
        if (!valid) {
            data.attempts++;
            await tx`UPDATE verification SET value = ${JSON.stringify(data)} WHERE id = ${id}`;
            await recordFailure(tx, user.email, user.id, req.ip);
            return null;
        }
        await tx`DELETE FROM verification WHERE id = ${id}`;
        await resetFailures(tx, user.email, req.ip);
        const token = await createSession(tx, user.id, req);
        await loginAudit(tx, user, req, 'Successful login (TOTP verified)');
        return { token, user };
    });
    if (!result) return res.status(401).json({ error: 'Invalid or expired verification.' });
    setSessionCookie(res, result.token);
    res.json({ user: publicUser(result.user) });
}));

router.get('/totp/status', requireAuth, asyncRoute(async (req, res) => {
    const [row] = await client`SELECT * FROM user_totp WHERE user_id = ${req.user.id}`;
    res.json({ enabled: !!row?.is_enabled, enabledAt: row?.enabled_at ?? null,
        backupCodesRemaining: jsonArray(row?.backup_codes).filter(code => !code.used).length });
}));

router.post('/totp/setup', requireAuth, asyncRoute(async (req, res) => {
    const secret = generateSecret();
    const encrypted = encryptSecret(secret, req.user.id);
    const result = await client.begin(async tx => {
        await tx`SELECT id FROM "user" WHERE id = ${req.user.id} FOR UPDATE`;
        const [row] = await tx`INSERT INTO user_totp (user_id, secret, is_enabled)
            VALUES (${req.user.id}, ${encrypted}, FALSE)
            ON CONFLICT (user_id) DO UPDATE SET secret = EXCLUDED.secret, backup_codes = '[]', enabled_at = NULL
            WHERE user_totp.is_enabled = FALSE RETURNING id`;
        return row;
    });
    if (!result) return res.status(409).json({ error: 'Verify and disable the existing authenticator before replacing it.' });
    const otpauthUrl = generateURI({ type: 'totp', label: req.user.email, secret, issuer: 'E-CRF System' });
    res.json({ secret, otpauthUrl, qrDataUrl: await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 2 }) });
}));

router.post('/totp/enable', requireAuth, asyncRoute(async (req, res) => {
    if (!codeIsValidInput(req.body?.totpCode)) return res.status(400).json({ error: 'Invalid code.' });
    const result = await client.begin(async tx => {
        await tx`SELECT id FROM "user" WHERE id = ${req.user.id} FOR UPDATE`;
        const [row] = await tx`SELECT * FROM user_totp WHERE user_id = ${req.user.id} FOR UPDATE`;
        if (!row || row.is_enabled || !await verifyTotp(req.body.totpCode, row)) return null;
        const codes = Array.from({ length: 8 }, () => crypto.randomBytes(10).toString('hex').toUpperCase());
        await tx`UPDATE user_totp SET is_enabled = TRUE, enabled_at = NOW(),
            backup_codes = ${JSON.stringify(codes.map(code => ({ digest: backupDigest(code, req.user.id), used: false })))}
            WHERE user_id = ${req.user.id}`;
        await tx`DELETE FROM session WHERE user_id = ${req.user.id} AND token <> ${req.authTokenHash}`;
        await tx`DELETE FROM verification WHERE identifier = ${`mfa:${req.user.id}`}`;
        await writeAudit(tx, { tableName: 'user_totp', recordId: row.id, action: 'UPDATE',
            fieldName: 'is_enabled', newValue: 'true', reason: 'Enabled TOTP', user: req.user, ipAddress: req.ip });
        return { id: row.id, codes };
    });
    if (!result) return res.status(400).json({ error: 'Invalid code or authenticator already enabled.' });
    res.json({ enabled: true, backupCodes: result.codes });
}));

router.delete('/totp/disable', requireAuth, asyncRoute(async (req, res) => {
    if (!codeIsValidInput(req.body?.totpCode)) return res.status(400).json({ error: 'Invalid code.' });
    const row = await client.begin(async tx => {
        await tx`SELECT id FROM "user" WHERE id = ${req.user.id} FOR UPDATE`;
        const [mfa] = await tx`SELECT * FROM user_totp WHERE user_id = ${req.user.id} FOR UPDATE`;
        if (!mfa?.is_enabled || !await verifyTotp(req.body.totpCode, mfa)) return null;
        await tx`DELETE FROM user_totp WHERE user_id = ${req.user.id}`;
        await tx`DELETE FROM verification WHERE identifier = ${`mfa:${req.user.id}`}`;
        await tx`DELETE FROM session WHERE user_id = ${req.user.id} AND token <> ${req.authTokenHash}`;
        await writeAudit(tx, { tableName: 'user_totp', recordId: mfa.id, action: 'UPDATE',
            fieldName: 'is_enabled', newValue: 'false', reason: 'Disabled TOTP', user: req.user, ipAddress: req.ip });
        return mfa;
    });
    if (!row) return res.status(401).json({ error: 'Invalid code or authenticator disabled.' });
    res.json({ enabled: false });
}));

for (const path of ['/verify', '/direct-login', '/resend']) {
    router.post(path, (_req, res) => res.status(410).json({ error: 'Use /api/mfa/initiate and /api/mfa/totp-verify.' }));
}

// Logout also works for locked/deactivated users, and is idempotent.
export const logout = asyncRoute(async (req, res) => {
    const token = readSessionToken(req);
    if (token) {
        const rows = await client`DELETE FROM session WHERE token = ${tokenDigest(token)} RETURNING user_id`;
        if (rows.length) {
            try {
                await writeAudit(db, { tableName: 'user', recordId: rows[0].user_id, action: 'LOGOUT',
                    reason: 'Session revoked', user: null, ipAddress: req.ip });
            } catch (error) {
                console.error('Logout audit failed:', error.message);
            }
        }
    }
    clearSessionCookie(res);
    res.json({ ok: true });
});
router.post('/logout', logout);

export default router;
