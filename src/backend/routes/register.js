import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { auth } from '../auth/better-auth.js';
import { db } from '../db/connection.js';
import { passwordMeta, user } from '../db/schemas/schema.js';
import { validatePassword } from '../lib/passwordpolicy.js';

const router = Router();

const ADMIN_EMAIL  = 'renfael6@gmail.com';
const ALLOWED_ROLES = ['investigator', 'pi', 'cra', 'crc'];

// Per PANDUAN §1: "Semua akun dibuat oleh Administrator. Tidak ada registrasi
// mandiri." Self-registration is therefore disabled unless explicitly enabled
// (dev/demo). The bootstrap admin email is always allowed so a fresh deploy
// can create its first administrator.
const SELF_REGISTRATION_OPEN = process.env.ALLOW_SELF_REGISTRATION === 'true';

// POST /api/register — validated signup (blocks admin self-registration)
router.post('/', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!SELF_REGISTRATION_OPEN && normalizedEmail !== ADMIN_EMAIL) {
        return res.status(403).json({
            message: 'Self-registration is disabled. Accounts are created by the Administrator.',
        });
    }

    // Validate password against ICH GCP E6(R3) C.4.3 policy
    const policyErrors = validatePassword(password, normalizedEmail);
    if (policyErrors.length > 0) {
        return res.status(400).json({ message: 'Password does not meet security requirements.', details: policyErrors });
    }

    let assignedRole;
    if (role === 'admin') {
        if (normalizedEmail !== ADMIN_EMAIL) {
            return res.status(403).json({ message: 'Administrator role is not available for self-registration.' });
        }
        assignedRole = 'admin';
    } else if (ALLOWED_ROLES.includes(role)) {
        assignedRole = role;
    } else {
        assignedRole = 'investigator';
    }

    try {
        const result = await auth.api.signUpEmail({
            body: { name, email: normalizedEmail, password },
        });

        if (!result) {
            return res.status(400).json({ message: 'Registration failed. Please try again.' });
        }

        // Role is input:false in Better Auth (privilege-escalation guard), so it
        // must be assigned server-side after the account is created.
        if (result.user?.id) {
            await db.update(user).set({ role: assignedRole })
                .where(eq(user.id, result.user.id));

            // Initialize password metadata per ICH GCP E6(R3) C.4.3
            await db.insert(passwordMeta)
                .values({ userId: result.user.id, lastChangedAt: new Date(), mustChange: false })
                .onConflictDoNothing();
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        const msg = err.message || '';
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('duplicate')) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }
        console.error('Register error:', msg);
        return res.status(400).json({ message: msg || 'Registration failed. Please try again.' });
    }
});

export default router;
