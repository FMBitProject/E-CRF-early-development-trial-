import { Router } from 'express';
import crypto from 'crypto';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin, generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';

// Singleton TOTP instance with bundled crypto/base32 plugins
const totp = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() });
import { db } from '../db/connection.js';
import { client } from '../db/connection.js';
import { verification, loginAttempts, accountLocks, user as userTable } from '../db/schemas/schema.js';
import { eq, gt } from 'drizzle-orm';
import { sendOTPEmail } from '../lib/email.js';
import { auth } from '../auth/better-auth.js';
import { POLICY } from '../lib/passwordpolicy.js';
import { requireAuth } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

const SESSION_COOKIE   = 'better-auth.session_token';
const SESSION_MAX_AGE  = 60 * 60 * 24 * 7;
const APP_NAME         = 'E-CRF System';

function generateOTP() {
    return crypto.randomInt(100000, 1000000).toString();
}

function hashOTP(otp) {
    return crypto.createHash('sha256').update(otp.trim()).digest('hex');
}

function generateBackupCodes(count = 8) {
    return Array.from({ length: count }, () =>
        crypto.randomBytes(5).toString('hex').toUpperCase()
    );
}

async function recordFailedAttempt(email, ipAddress) {
    try {
        const now = new Date();
        await db.insert(loginAttempts).values({ email, ipAddress: ipAddress || 'unknown', success: false });

        const [existing] = await db.select().from(accountLocks).where(eq(accountLocks.email, email));
        const newCount = (existing?.failedCount ?? 0) + 1;
        const shouldLock = newCount >= POLICY.maxFailedAttempts;
        const lockFields = shouldLock
            ? { lockedAt: now, autoUnlockAt: new Date(now.getTime() + POLICY.lockoutMinutes * 60000) }
            : {};

        if (existing) {
            await db.update(accountLocks)
                .set({ failedCount: newCount, ...lockFields })
                .where(eq(accountLocks.id, existing.id));
        } else {
            const [userRow] = await db.select({ id: userTable.id }).from(userTable)
                .where(eq(userTable.email, email));
            await db.insert(accountLocks).values({
                userId: userRow?.id ?? null, email, failedCount: newCount, ...lockFields,
            });
        }
    } catch (e) {
        console.warn('recordFailedAttempt skipped (migration pending):', e.message);
    }
}

// ── Helper: get TOTP row for a user ──────────────────────────────────────────
async function getTotpRow(userId) {
    try {
        const rows = await client.unsafe(
            `SELECT id, secret, is_enabled, enabled_at, backup_codes FROM user_totp WHERE user_id = $1`,
            [userId]
        );
        return rows[0] ?? null;
    } catch {
        return null;
    }
}

// ── POST /api/mfa/initiate — verify password; if TOTP enabled return totp_required, else authenticate directly ──
router.post('/initiate', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        const now = new Date();
        let lockRecord = null;
        try {
            [lockRecord] = await db.select().from(accountLocks)
                .where(eq(accountLocks.email, normalizedEmail));
        } catch { /* migration pending */ }

        if (lockRecord && !lockRecord.unlockedAt && lockRecord.lockedAt) {
            if (!lockRecord.autoUnlockAt || new Date(lockRecord.autoUnlockAt) > now) {
                try {
                    await db.insert(loginAttempts)
                        .values({ email: normalizedEmail, ipAddress: req.ip || 'unknown', success: false });
                } catch { /* migration pending */ }
                return res.status(423).json({
                    error: `Account locked after ${POLICY.maxFailedAttempts} failed attempts. ` +
                           `Auto-unlocks at ${lockRecord.autoUnlockAt?.toISOString() ?? 'N/A'} or contact your administrator.`,
                    lockedAt:      lockRecord.lockedAt,
                    autoUnlockAt:  lockRecord.autoUnlockAt,
                });
            }
        }

        let signIn;
        try {
            signIn = await auth.api.signInEmail({ body: { email: normalizedEmail, password } });
        } catch (authErr) {
            console.error('MFA auth error:', authErr.message);
            await recordFailedAttempt(normalizedEmail, req.ip);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (!signIn || !signIn.token) {
            await recordFailedAttempt(normalizedEmail, req.ip);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Reset lock state on success
        try {
            await db.insert(loginAttempts)
                .values({ email: normalizedEmail, ipAddress: req.ip || 'unknown', success: true });
            if (lockRecord && !lockRecord.unlockedAt) {
                await db.update(accountLocks)
                    .set({ unlockedAt: new Date(), unlockReason: 'Successful login' })
                    .where(eq(accountLocks.id, lockRecord.id));
            }
        } catch { /* migration pending */ }

        const { token, user } = signIn;

        // Deactivated accounts must not receive a session (ICH GCP E6(R3) C.4.2)
        let displayName = null;
        try {
            const [uRow] = await client.unsafe(
                `SELECT display_name, is_active FROM "user" WHERE id = $1`, [user.id]
            );
            if (uRow && uRow.is_active === false) {
                return res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
            }
            displayName = uRow?.display_name ?? null;
        } catch { /* column may not exist yet on first boot; safe to ignore */ }

        // Check if TOTP is enabled for this user
        const totpRow = await getTotpRow(user.id);
        if (totpRow?.is_enabled) {
            // Store temp token so the totp-verify endpoint can retrieve the auth token
            const tempToken = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            const existing = await db.select().from(verification)
                .where(eq(verification.identifier, `mfa:${normalizedEmail}`));
            for (const r of existing) await db.delete(verification).where(eq(verification.id, r.id));

            await db.insert(verification).values({
                id:         crypto.randomUUID(),
                identifier: `mfa:${normalizedEmail}`,
                value:      JSON.stringify({
                    tempToken,
                    authToken:   token,
                    userId:      user.id,
                    name:        user.name,
                    displayName,
                    role:        user.role ?? 'investigator',
                }),
                expiresAt,
            });

            return res.json({ status: 'totp_required', tempToken });
        }

        // No TOTP — authenticate directly
        const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
        res.cookie(SESSION_COOKIE, token, {
            httpOnly: true,
            secure:   isSecure,
            sameSite: 'lax',
            path:     '/',
            maxAge:   SESSION_MAX_AGE * 1000,
        });

        // ICH E6(R3) C.4.3 — log successful login to audit trail
        try {
            await writeAudit(db, {
                tableName: 'user', recordId: user.id, action: 'LOGIN',
                reason: 'Successful login (no MFA)',
                user: { id: user.id, name: user.name, role: user.role ?? 'investigator' },
                ipAddress: req.ip,
            });
        } catch (auditErr) {
            console.error('Audit trail write failed (login will proceed):', auditErr.message);
        }

        // Session token travels only in the httpOnly cookie — never in the body
        // (an XSS could otherwise exfiltrate it).
        res.json({
            status: 'authenticated',
            user: { id: user.id, name: user.name, displayName, role: user.role ?? 'investigator' },
        });

    } catch (err) {
        console.error('MFA initiate error:', err.message);
        res.status(500).json({ error: `Server error: ${err.message}` });
    }
});

// ── POST /api/mfa/totp-verify — verify TOTP code during login (uses tempToken) ──
router.post('/totp-verify', async (req, res) => {
    const { tempToken, totpCode } = req.body;
    if (!tempToken || !totpCode) {
        return res.status(400).json({ error: 'Verification token and TOTP code are required.' });
    }

    try {
        const now     = new Date();
        const records = await db.select().from(verification).where(gt(verification.expiresAt, now));

        const record = records.find(r => {
            try { return JSON.parse(r.value).tempToken === tempToken; } catch { return false; }
        });

        if (!record) {
            return res.status(401).json({ error: 'Session expired. Please sign in again.' });
        }

        const { authToken, userId, name, displayName, role } = JSON.parse(record.value);

        // Fetch TOTP secret
        const totpRow = await getTotpRow(userId);
        if (!totpRow || !totpRow.is_enabled) {
            return res.status(400).json({ error: 'TOTP is not enabled for this account.' });
        }

        // Verify TOTP code
        const codeClean = totpCode.replace(/\s/g, '');
        let valid = false;
        try {
            const r = await totp.verify(codeClean, { secret: totpRow.secret });
            valid = r.valid;
        } catch { valid = false; }

        // Fall back to backup codes
        if (!valid) {
            const backupCodes = Array.isArray(totpRow.backup_codes) ? totpRow.backup_codes : [];
            const matchIdx = backupCodes.findIndex(b => !b.used && b.code === codeClean.toUpperCase());
            if (matchIdx !== -1) {
                valid = true;
                backupCodes[matchIdx].used = true;
                await client.unsafe(
                    `UPDATE user_totp SET backup_codes = $1 WHERE user_id = $2`,
                    [JSON.stringify(backupCodes), userId]
                );
            }
        }

        if (!valid) {
            return res.status(401).json({ error: 'Invalid authenticator code. Please try again.' });
        }

        await db.delete(verification).where(eq(verification.id, record.id));

        const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
        res.cookie(SESSION_COOKIE, authToken, {
            httpOnly: true,
            secure:   isSecure,
            sameSite: 'lax',
            path:     '/',
            maxAge:   SESSION_MAX_AGE * 1000,
        });

        // ICH E6(R3) C.4.3 — log successful TOTP login to audit trail
        try {
            await writeAudit(db, {
                tableName: 'user', recordId: userId, action: 'LOGIN',
                reason: 'Successful login (TOTP verified)',
                user: { id: userId, name, role: role ?? 'investigator' },
                ipAddress: req.ip,
            });
        } catch (auditErr) {
            console.error('Audit trail write failed (TOTP login will proceed):', auditErr.message);
        }

        // Session token only in the httpOnly cookie — never in the body.
        res.json({ user: { id: userId, name, displayName: displayName ?? null, role: role ?? 'investigator' } });

    } catch (err) {
        console.error('TOTP verify error:', err.message);
        res.status(500).json({ error: 'Verification failed.' });
    }
});

// ── TOTP Management (requires session auth) ───────────────────────────────────

// GET /api/mfa/totp/status
router.get('/totp/status', requireAuth, async (req, res) => {
    try {
        const totpRow = await getTotpRow(req.user.id);
        const backupCodes = totpRow?.backup_codes ?? [];
        const unusedCount = Array.isArray(backupCodes)
            ? backupCodes.filter(b => !b.used).length
            : 0;
        res.json({
            enabled:     !!totpRow?.is_enabled,
            enabledAt:   totpRow?.enabled_at ?? null,
            backupCodesRemaining: unusedCount,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/mfa/totp/setup — generate secret & QR code (does NOT enable yet)
router.post('/totp/setup', requireAuth, async (req, res) => {
    try {
        const secret     = generateSecret();
        const otpauthUrl = generateURI({ type: 'totp', label: req.user.email, secret, issuer: APP_NAME });
        const qrDataUrl  = await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 2 });

        // Upsert a pending (not yet enabled) TOTP row
        await client.unsafe(
            `INSERT INTO user_totp (user_id, secret, is_enabled) VALUES ($1, $2, FALSE)
             ON CONFLICT (user_id) DO UPDATE SET secret = $2, is_enabled = FALSE, enabled_at = NULL, backup_codes = '[]'`,
            [req.user.id, secret]
        );

        res.json({ secret, otpauthUrl, qrDataUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/mfa/totp/enable — verify first code then enable
router.post('/totp/enable', requireAuth, async (req, res) => {
    const { totpCode } = req.body;
    if (!totpCode) return res.status(400).json({ error: 'TOTP code is required.' });

    try {
        const totpRow = await getTotpRow(req.user.id);
        if (!totpRow) return res.status(400).json({ error: 'Run /setup first.' });

        const codeClean = totpCode.replace(/\s/g, '');
        let valid = false;
        try { const r = await totp.verify(codeClean, { secret: totpRow.secret }); valid = r.valid; } catch { valid = false; }
        if (!valid) return res.status(400).json({ error: 'Invalid code. Make sure your authenticator clock is correct.' });

        const rawCodes   = generateBackupCodes(8);
        const backupObjs = rawCodes.map(code => ({ code, used: false }));

        await client.unsafe(
            `UPDATE user_totp SET is_enabled = TRUE, enabled_at = NOW(), backup_codes = $1 WHERE user_id = $2`,
            [JSON.stringify(backupObjs), req.user.id]
        );

        await writeAudit(db, {
            tableName: 'user_totp', recordId: totpRow.id, action: 'UPDATE',
            fieldName: 'is_enabled', oldValue: 'false', newValue: 'true',
            reason: 'User enabled TOTP authenticator',
            user: req.user, ipAddress: req.ip,
        });

        res.json({ enabled: true, backupCodes: rawCodes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/mfa/totp/disable — disable TOTP (must supply valid TOTP code)
router.delete('/totp/disable', requireAuth, async (req, res) => {
    const { totpCode } = req.body;
    if (!totpCode) return res.status(400).json({ error: 'TOTP code is required to disable 2FA.' });

    try {
        const totpRow = await getTotpRow(req.user.id);
        if (!totpRow?.is_enabled) return res.status(400).json({ error: 'TOTP is not enabled.' });

        const codeClean = totpCode.replace(/\s/g, '');
        let valid = false;
        try { const r = await totp.verify(codeClean, { secret: totpRow.secret }); valid = r.valid; } catch { valid = false; }
        if (!valid) return res.status(401).json({ error: 'Invalid authenticator code.' });

        await client.unsafe(
            `UPDATE user_totp SET is_enabled = FALSE, enabled_at = NULL, backup_codes = '[]' WHERE user_id = $1`,
            [req.user.id]
        );

        await writeAudit(db, {
            tableName: 'user_totp', recordId: totpRow.id, action: 'UPDATE',
            fieldName: 'is_enabled', oldValue: 'true', newValue: 'false',
            reason: 'User disabled TOTP authenticator',
            user: req.user, ipAddress: req.ip,
        });

        res.json({ enabled: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/mfa/verify — verify email OTP (legacy flow) ────────────────────
router.post('/verify', async (req, res) => {
    const { tempToken, otp } = req.body;
    if (!tempToken || !otp) {
        return res.status(400).json({ error: 'Verification token and code are required.' });
    }

    try {
        const now     = new Date();
        const records = await db.select().from(verification).where(gt(verification.expiresAt, now));

        const record = records.find(r => {
            try { return JSON.parse(r.value).tempToken === tempToken; } catch { return false; }
        });

        if (!record) {
            return res.status(401).json({ error: 'Session expired. Please sign in again.' });
        }

        const { otpHash, authToken, userId, name, role } = JSON.parse(record.value);

        if (hashOTP(otp) !== otpHash) {
            return res.status(401).json({ error: 'Invalid verification code. Please try again.' });
        }

        await db.delete(verification).where(eq(verification.id, record.id));

        const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
        res.cookie(SESSION_COOKIE, authToken, {
            httpOnly: true,
            secure:   isSecure,
            sameSite: 'lax',
            path:     '/',
            maxAge:   SESSION_MAX_AGE * 1000,
        });

        res.json({ token: authToken, user: { id: userId, name, role: role ?? 'investigator' } });

    } catch (err) {
        console.error('MFA verify error:', err.message);
        res.status(500).json({ error: 'Verification failed.' });
    }
});

// POST /api/mfa/direct-login — REMOVED. It authenticated with password only,
// bypassing a user's enabled TOTP and returning the session token in the body.
// All sign-ins must go through /initiate (+ /totp-verify when TOTP is enabled).
router.post('/direct-login', (_req, res) => {
    res.status(410).json({ error: 'This endpoint has been removed. Use /api/mfa/initiate.' });
});

// POST /api/mfa/resend
router.post('/resend', (_req, res) => {
    res.status(400).json({ error: 'Please go back and sign in again to get a new code.' });
});

// POST /api/mfa/logout — ICH E6(R3) C.4.3: audit logout then invalidate session
router.post('/logout', requireAuth, async (req, res) => {
    try {
        await writeAudit(db, {
            tableName: 'user', recordId: req.user.id, action: 'LOGOUT',
            reason: 'User signed out',
            user: req.user, ipAddress: req.ip,
        });
    } catch { /* non-fatal */ }

    try {
        await auth.api.signOut({ headers: req.headers });
    } catch { /* ignore */ }

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.clearCookie('better-auth.session_token', { path: '/', secure: isSecure, sameSite: 'lax' });
    res.json({ ok: true });
});

export default router;
