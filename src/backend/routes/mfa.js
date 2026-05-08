import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/connection.js';
import { verification } from '../db/schemas/schema.js';
import { eq, gt } from 'drizzle-orm';
import { sendOTPEmail } from '../lib/email.js';
import { auth } from '../auth/better-auth.js';

const router = Router();

const SESSION_COOKIE   = 'better-auth.session_token';
const SESSION_MAX_AGE  = 60 * 60 * 24 * 7; // 7 days in seconds

function generateOTP() {
    return crypto.randomInt(100000, 1000000).toString();
}

function hashOTP(otp) {
    return crypto.createHash('sha256').update(otp.trim()).digest('hex');
}

// POST /api/mfa/initiate — verify password, send OTP
router.post('/initiate', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        let signIn;
        try {
            signIn = await auth.api.signInEmail({ body: { email, password } });
        } catch (authErr) {
            console.error('MFA auth error:', authErr.message);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (!signIn || !signIn.token) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const { token, user } = signIn;

        const otp       = generateOTP();
        const tempToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const existing = await db.select().from(verification)
            .where(eq(verification.identifier, `mfa:${email.toLowerCase()}`));
        for (const r of existing) {
            await db.delete(verification).where(eq(verification.id, r.id));
        }

        await db.insert(verification).values({
            id:         crypto.randomUUID(),
            identifier: `mfa:${email.toLowerCase()}`,
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
            await sendOTPEmail(email, user.name, otp);
        } catch (mailErr) {
            console.error('MFA email error:', mailErr.message);
            return res.status(500).json({ error: `Email failed: ${mailErr.message}` });
        }

        const masked = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(b.length) + c);
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
