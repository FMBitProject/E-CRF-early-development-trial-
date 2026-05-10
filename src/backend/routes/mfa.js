import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/connection.js';
import { verification, loginAttempts, accountLocks, user as userTable } from '../db/schemas/schema.js';
import { eq, gt } from 'drizzle-orm';
import { sendOTPEmail } from '../lib/email.js';
import { auth } from '../auth/better-auth.js';
import { POLICY } from '../lib/passwordpolicy.js';

const router = Router();

const SESSION_COOKIE   = 'better-auth.session_token';
const SESSION_MAX_AGE  = 60 * 60 * 24 * 7; // 7 days in seconds

function generateOTP() {
    return crypto.randomInt(100000, 1000000).toString();
}

function hashOTP(otp) {
    return crypto.createHash('sha256').update(otp.trim()).digest('hex');
}

async function recordFailedAttempt(email, ipAddress) {
    // Silently skip if Tier 2 tables haven't migrated yet
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

// POST /api/mfa/initiate — verify password, send OTP
router.post('/initiate', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        // Check account lock status — ICH GCP E6(R3) C.4.3
        // Wrapped in try-catch: tables may not exist on first deploy before migration completes
        const now = new Date();
        let lockRecord = null;
        try {
            [lockRecord] = await db.select().from(accountLocks)
                .where(eq(accountLocks.email, normalizedEmail));
        } catch {
            // migration pending — skip lock check
        }
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

        // Successful credential check — reset lock state
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

        const otp       = generateOTP();
        const tempToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const existing = await db.select().from(verification)
            .where(eq(verification.identifier, `mfa:${normalizedEmail}`));
        for (const r of existing) {
            await db.delete(verification).where(eq(verification.id, r.id));
        }

        await db.insert(verification).values({
            id:         crypto.randomUUID(),
            identifier: `mfa:${normalizedEmail}`,
            value:      JSON.stringify({
                otpHash:   hashOTP(otp),
                tempToken,
                authToken: token,
                userId:    user.id,
                name:      user.name,
                role:      user.role ?? 'investigator',
            }),
            expiresAt,
        });

        try {
            await sendOTPEmail(normalizedEmail, user.name, otp);
        } catch (mailErr) {
            console.error('MFA email error:', mailErr.message);
            return res.status(500).json({ error: `Email failed: ${mailErr.message}` });
        }

        const masked = normalizedEmail.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(b.length) + c);
        res.json({ status: 'otp_sent', tempToken, maskedEmail: masked });

    } catch (err) {
        console.error('MFA initiate error:', err.message);
        res.status(500).json({ error: `Server error: ${err.message}` });
    }
});

// POST /api/mfa/verify — verify OTP, set session cookie
router.post('/verify', async (req, res) => {
    const { tempToken, otp } = req.body;
    if (!tempToken || !otp) {
        return res.status(400).json({ error: 'Verification token and code are required.' });
    }

    try {
        const now     = new Date();
        const records = await db.select().from(verification)
            .where(gt(verification.expiresAt, now));

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

        // Set Better Auth session cookie so requireAuth works on subsequent API calls
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

// POST /api/mfa/resend
router.post('/resend', (_req, res) => {
    res.status(400).json({ error: 'Please go back and sign in again to get a new code.' });
});

export default router;
