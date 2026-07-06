// Self-service tenant signup — a new customer creates their own organization
// and becomes its admin, starting a gated 14-day trial. Disabled unless
// ALLOW_TENANT_SIGNUP=true. Never creates platform_owner or joins an existing
// org — always a fresh tenant. Email must be verified before login.

import { Router } from 'express';
import { eq, and, like, gt } from 'drizzle-orm';
import crypto from 'crypto';
import { auth } from '../auth/better-auth.js';
import { db } from '../db/connection.js';
import { organizations, user, passwordMeta, userAgreements, verification } from '../db/schemas/schema.js';
import { validatePassword } from '../lib/passwordpolicy.js';
import { sendVerificationEmail } from '../lib/email.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

const TRIAL_DAYS = 14;
const TOS_VERSION = 'ToS-DPA-v1';
const signupEnabled = () => process.env.ALLOW_TENANT_SIGNUP === 'true';
const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function uniqueSlug(base) {
    let slug = slugify(base) || 'org';
    for (let n = 1; ; n++) {
        const candidate = n === 1 ? slug : `${slug}-${n}`;
        const [hit] = await db.select({ id: organizations.id }).from(organizations)
            .where(eq(organizations.slug, candidate));
        if (!hit) return candidate;
    }
}

// GET /api/signup/config — whether self-service signup is open (for the UI).
router.get('/config', (_req, res) => {
    res.json({ enabled: signupEnabled(), trialDays: TRIAL_DAYS, tosVersion: TOS_VERSION });
});

// POST /api/signup — create a new tenant + its admin (trial), send verification.
router.post('/', async (req, res) => {
    if (!signupEnabled()) {
        return res.status(403).json({ message: 'Self-service signup is not available. Contact sales.' });
    }
    const { orgName, adminName, adminEmail, password, acceptTos } = req.body;
    if (!orgName || !adminName || !adminEmail || !password) {
        return res.status(400).json({ message: 'Organization name, your name, email, and password are required.' });
    }
    if (acceptTos !== true) {
        return res.status(400).json({ message: 'You must accept the Terms of Service and Data Processing Agreement.' });
    }
    const email = String(adminEmail).trim().toLowerCase();

    const policyErrors = validatePassword(password, email);
    if (policyErrors.length) {
        return res.status(400).json({ message: 'Password does not meet security requirements.', details: policyErrors });
    }

    const [dup] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
    if (dup) return res.status(409).json({ message: 'An account with this email already exists.' });

    try {
        const slug = await uniqueSlug(orgName);
        const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86400000);

        // 1. Tenant (trial).
        const [org] = await db.insert(organizations).values({
            name: String(orgName).trim(), slug, status: 'Active',
            plan: 'trial', subscriptionStatus: 'Trialing', trialEndsAt,
        }).returning();

        // 2. Admin account (unverified until the email is confirmed).
        const signUp = await auth.api.signUpEmail({
            body: { name: String(adminName).trim(), email, password },
        });
        if (!signUp?.user?.id) return res.status(400).json({ message: 'Signup failed. Please try again.' });
        const userId = signUp.user.id;

        await db.update(user)
            .set({ role: 'admin', organizationId: org.id, emailVerified: false })
            .where(eq(user.id, userId));
        await db.insert(passwordMeta)
            .values({ userId, lastChangedAt: new Date(), mustChange: false })
            .onConflictDoNothing();

        // 3. Record ToS/DPA acceptance (click-through consent).
        await db.insert(userAgreements).values({
            userId, agreementType: 'Data_Privacy', agreementVersion: TOS_VERSION,
            ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
        });

        // 4. Email-verification token (24h).
        const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomBytes(8).toString('hex');
        await db.insert(verification).values({
            id: crypto.randomUUID(),
            identifier: `email-verify:${email}`,
            value: token,
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        });

        const base = process.env.BETTER_AUTH_URL || `${req.protocol}://${req.get('host')}`;
        const verifyUrl = `${base}/api/signup/verify?token=${token}`;
        sendVerificationEmail(email, adminName, { verifyUrl, orgName }).catch(() => {});
        if (!process.env.SMTP_HOST) console.log(`[signup] verification link for ${email}: ${verifyUrl}`);

        await writeAudit(db, {
            tableName: 'organizations', recordId: String(org.id), action: 'INSERT',
            newValue: `Self-service trial signup: "${org.name}" (${slug}), admin <${email}>`,
            reason: 'Self-service tenant signup',
            user: { id: userId, name: adminName, role: 'admin', organizationId: org.id },
            ipAddress: req.ip,
        });

        res.status(201).json({ ok: true, message: 'Check your email to verify your address and activate your trial.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/signup/verify?token= — confirm email, then send to login.
router.get('/verify', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send('Missing token.');
    try {
        const [row] = await db.select().from(verification)
            .where(and(like(verification.identifier, 'email-verify:%'),
                       eq(verification.value, String(token)),
                       gt(verification.expiresAt, new Date())));
        if (!row) return res.redirect('/login.html?verify=expired');

        const email = row.identifier.slice('email-verify:'.length);
        await db.update(user).set({ emailVerified: true }).where(eq(user.email, email));
        await db.delete(verification).where(eq(verification.id, row.id));
        res.redirect('/login.html?verified=1');
    } catch (err) {
        res.status(500).send('Verification failed: ' + err.message);
    }
});

export default router;
