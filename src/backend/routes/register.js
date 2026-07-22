import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { auth } from '../auth/better-auth.js';
import { db } from '../db/connection.js';
import { passwordMeta, user, organizations } from '../db/schemas/schema.js';
import { validatePassword } from '../lib/passwordpolicy.js';
import { getLicense } from '../lib/license.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// Version of the vendor License Agreement + Privacy Policy the first-run admin
// accepts during setup. Bump this when docs/legal/ terms change materially so
// the audit trail records which revision was agreed to.
const LICENSE_AGREEMENT_VERSION = '1.0';

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

// GET /api/register/config — lets the login page decide whether to show a
// "Register" link. Shown when self-registration is open, or on a fresh install
// with no users yet (so the first administrator can be bootstrapped). The
// bootstrap email itself is NOT returned (avoids leaking it before setup).
router.get('/config', async (_req, res) => {
    let bootstrapNeeded = false;
    try {
        const rows = await db.select({ id: user.id }).from(user).limit(1);
        bootstrapNeeded = rows.length === 0;
    } catch {
        bootstrapNeeded = false;
    }
    // On a fresh install the first admin must accept the License Agreement.
    // Expose only the non-sensitive license summary (name + expiry that appear
    // on the paper contract anyway) so the setup screen can name what is being
    // accepted. Nothing is returned once users exist.
    let license = null;
    if (bootstrapNeeded) {
        const lic = getLicense();
        license = {
            present:   lic.present,
            active:    lic.active,
            customer:  lic.customer,
            expiresAt: lic.expiresAt,
            agreementVersion: LICENSE_AGREEMENT_VERSION,
        };
    }
    res.json({ selfRegistration: SELF_REGISTRATION_OPEN, bootstrapNeeded, license });
});

// POST /api/register — validated signup (blocks privilege self-assignment)
router.post('/', async (req, res) => {
    const { name, email, password, role, acceptedLicense } = req.body;

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

    // The first-run administrator sets up the on-premise instance, so this is
    // the point at which the customer institution accepts the vendor License
    // Agreement & Privacy Policy. Require explicit acceptance and record it.
    if (isAdminBootstrap && acceptedLicense !== true) {
        return res.status(400).json({
            message: 'You must accept the License Agreement & Privacy Policy to set up this system.',
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
    } else if (isAdminBootstrap) {
        // The designated bootstrap email always becomes the admin of the default
        // organization, regardless of which role the form submitted (the register
        // form does not expose an "admin" option). This is the first-run admin.
        assignedRole = 'admin';
        assignedOrgId = await defaultOrgId();
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

            // Record the first-run admin's acceptance of the License Agreement &
            // Privacy Policy in the immutable audit trail (21 CFR Part 11 evidence
            // that the customer institution agreed to the vendor terms at setup).
            if (isAdminBootstrap) {
                try {
                    const lic = getLicense();
                    await writeAudit(db, {
                        tableName: 'license_acceptance',
                        recordId:  lic.customer || 'on-premise',
                        action:    'AGREE',   // audit_action enum; same value the agreements flow uses
                        fieldName: 'license_agreement',
                        newValue:  JSON.stringify({
                            agreementVersion: LICENSE_AGREEMENT_VERSION,
                            documents:        ['Terms & Conditions', 'Privacy Policy'],
                            licenseCustomer:  lic.customer,
                            licenseExpiresAt: lic.expiresAt,
                            licensePresent:   lic.present,
                            licenseActive:    lic.active,
                        }),
                        reason: 'First-run administrator accepted the License Agreement & Privacy Policy during setup.',
                        user:   { id: result.user.id, name, role: assignedRole, organizationId: assignedOrgId },
                        ipAddress: req.ip,
                    });
                } catch (auditErr) {
                    // Acceptance was given by the user; a failure to write the audit
                    // row must not silently pass. Surface it so setup can be retried.
                    console.error('License acceptance audit failed:', auditErr.message);
                    return res.status(500).json({ message: 'Could not record license acceptance. Please try again.' });
                }
            }
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
