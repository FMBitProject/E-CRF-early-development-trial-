import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/connection.js';
import { verification } from '../db/schemas/schema.js';
import { eq, gt } from 'drizzle-orm';
import { sendOTPEmail } from '../lib/email.js';
import { auth } from '../auth/better-auth.js';

const router = Router();

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
        // Verify credentials via Better Auth internal API
        const signIn = await auth.api.signInEmail({
            body: { email, password },
        });

        if (!signIn || !signIn.token) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const { token, user } = signIn;

        // Generate OTP and temp token
        const otp       = generateOTP();
        const tempToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Remove any existing pending OTP for this email
        const existing = await db.select().from(verification)
            .where(eq(verification.identifier, `mfa:${email.toLowerCase()}`));
        for (const r of existing) {
            await db.delete(verification).where(eq(verification.id, r.id));
        }

        // Store OTP in verification table
        await db.insert(verification).values({
            id:         crypto.randomUUID(),
            identifier: `mfa:${email.toLowerCase()}`,
            value:      JSON.stringify({ otpHash: hashOTP(otp), tempToken, authToken: token, userId: user.id, name: user.name }),
            expiresAt,
        });

        // Send OTP email
        await sendOTPEmail(email, user.name, otp);

        const masked = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(b.length) + c);
        res.json({ status: 'otp_sent', tempToken, maskedEmail: masked });

    } catch (err) {
        console.error('MFA initiate error:', err.message);
        res.status(500).json({ error: 'Failed to send verification code. Check SMTP configuration.' });
    }
});

// POST /api/mfa/verify — verify OTP, return auth token
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
            try {
                return JSON.parse(r.value).tempToken === tempToken;
            } catch { return false; }
        });

        if (!record) {
            return res.status(401).json({ error: 'Session expired. Please sign in again.' });
        }

        const { otpHash, authToken, userId, name } = JSON.parse(record.value);

        if (hashOTP(otp) !== otpHash) {
            return res.status(401).json({ error: 'Invalid verification code. Please try again.' });
        }

        // OTP valid — delete record and return auth token
        await db.delete(verification).where(eq(verification.id, record.id));

        res.json({ token: authToken, user: { id: userId, name } });

    } catch (err) {
        console.error('MFA verify error:', err.message);
        res.status(500).json({ error: 'Verification failed.' });
    }
});

// POST /api/mfa/resend — resend OTP (not implemented, return error)
router.post('/resend', (_req, res) => {
    res.status(400).json({ error: 'Please go back and sign in again to get a new code.' });
});

export default router;
