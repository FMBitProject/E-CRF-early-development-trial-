import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { auth } from '../auth/better-auth.js';
import { db } from '../db/connection.js';
import { passwordMeta, user, organizations } from '../db/schemas/schema.js';
import { validatePassword } from '../lib/passwordpolicy.js';

const router = Router();

// First-run bootstrap admin (becomes an admin of the default organization).
// On-premise installs set ADMIN_EMAIL in their .env so the customer's own IT
// admin can register the first account. Falls back to the original hosted-
// deployment address for continuity when the variable is unset.
const ADMIN_EMAIL  = (process.env.ADMIN_EMAIL || 'renfael6@gmail.com').trim().toLowerCase();
// SaaS bootstrap: the platform operator. This email may self-register once as
// platform_owner (cross-tenant, no organization). Set in production env.
const PLATFORM_OWNER_EMAIL = (process.env.PLATFORM_OWNER_EMAIL || '').trim().toLowerCase();
const ALLOWED_ROLES = ['investigator', 'pi', 'cra', 'crc'];

// Per PANDUAN §1: accounts are created by an administrator. Self-registration
// is disabled unless explicitly enabled (dev/demo); the two bootstrap emails
// are always allowed so a fresh deploy can create its first operator/admin.
const SELF_REGISTRATION_OPEN = process.env.ALLOW_SELF_REGISTRATION === 'true';

// The default organization absorbs legacy/self-registered non-platform accounts.
async function defaultOrgId() {
    try {
        const [org] = await db.select({ id: organizations.id }).from(organizations)
            .where(eq(organizations.slug, 'default'));
        return org?.id ?? null;
    } catch {
        return null;
    }
}

// POST /api/register — validated signup (blocks privilege self-assignment)
router.post('/', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isPlatformBootstrap = PLATFORM_OWNER_EMAIL && normalizedEmail === PLATFORM_OWNER_EMAIL;
    const isAdminBootstrap    = normalizedEmail === ADMIN_EMAIL;

    if (!SELF_REGISTRATION_OPEN && !isPlatformBootstrap && !isAdminBootstrap) {
        return res.status(403).json({
            message: 'Self-registration is disabled. Accounts are created by the Administrator.',
        });
    }

    // Validate password against ICH GCP E6(R3) C.4.3 policy
    const policyErrors = validatePassword(password, normalizedEmail);
    if (policyErrors.length > 0) {
        return res.status(400).json({ message: 'Password does not meet security requirements.', details: policyErrors });
    }

    // Resolve the role + organization the new account will receive.
    let assignedRole;
    let assignedOrgId = null;   // null = platform_owner (cross-tenant)
    if (isPlatformBootstrap) {
        assignedRole = 'platform_owner';           // no organization
    } else if (role === 'admin' && isAdminBootstrap) {
        assignedRole = 'admin';
        assignedOrgId = await defaultOrgId();       // legacy single-tenant admin
    } else if (ALLOWED_ROLES.includes(role)) {
        assignedRole = role;
        assignedOrgId = await defaultOrgId();
    } else {
        assignedRole = 'investigator';
        assignedOrgId = await defaultOrgId();
    }

    try {
        const result = await auth.api.signUpEmail({
            body: { name, email: normalizedEmail, password },
        });

        if (!result) {
            return res.status(400).json({ message: 'Registration failed. Please try again.' });
        }

        // Role/org are input:false in Better Auth (privilege-escalation guard),
        // so they must be assigned server-side after the account is created.
        if (result.user?.id) {
            await db.update(user).set({ role: assignedRole, organizationId: assignedOrgId, emailVerified: true })
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
