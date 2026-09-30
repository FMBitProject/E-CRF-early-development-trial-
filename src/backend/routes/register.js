import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { auth } from '../auth/better-auth.js';
import { db } from '../db/connection.js';
import { passwordMeta, user, organizations } from '../db/schemas/schema.js';
import { validatePassword } from '../lib/passwordpolicy.js';
import { asyncRoute, validCredentials } from '../lib/http-security.js';

const router = Router();
// Public registration is exclusively a development/demo convenience.
// Production users are provisioned by an administrator or verified tenant signup.
const selfRegistrationOpen = () => process.env.NODE_ENV !== 'production' && process.env.ALLOW_SELF_REGISTRATION === 'true';
const reservedEmails = () => [process.env.ADMIN_EMAIL, process.env.PLATFORM_OWNER_EMAIL]
    .filter(Boolean).map(value => value.trim().toLowerCase());

router.get('/config', (_req, res) => {
    res.json({ selfRegistration: selfRegistrationOpen(), bootstrapNeeded: false, license: null });
});

router.post('/', asyncRoute(async (req, res) => {
    if (!selfRegistrationOpen()) {
        return res.status(403).json({ message: 'Accounts are created by an administrator.' });
    }
    if (!validCredentials(req.body) || typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.length > 200) {
        return res.status(400).json({ message: 'Invalid registration input.' });
    }
    const { name, password } = req.body;
    const email = req.body.email.trim().toLowerCase();
    if (reservedEmails().includes(email)) {
        return res.status(403).json({ message: 'Use the local administrator provisioning command.' });
    }
    const details = validatePassword(password, email);
    if (details.length) return res.status(400).json({ message: 'Password does not meet security requirements.', details });
    const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, 'default'));
    if (!org) return res.status(503).json({ message: 'Organization setup is required.' });
    try {
        const result = await auth.api.signUpEmail({ body: { name: name.trim(), email, password } });
        if (!result?.user?.id) throw new Error('Signup failed');
        await db.transaction(async tx => {
            await tx.update(user).set({ role: 'investigator', organizationId: org.id, emailVerified: true })
                .where(eq(user.id, result.user.id));
            await tx.insert(passwordMeta).values({ userId: result.user.id, lastChangedAt: new Date(), mustChange: false })
                .onConflictDoNothing();
        });
        res.json({ ok: true });
    } catch (err) {
        if (/already|exist|duplicate/i.test(err.message || '')) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }
        throw err;
    }
}));

export default router;
