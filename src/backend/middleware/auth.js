import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { session as sessionTable, user, accountLocks, passwordMeta, organizations } from '../db/schemas/schema.js';

// Paths still allowed while a forced password change is pending — the user
// must be able to change the password and read why they are blocked.
const MUST_CHANGE_ALLOWED = new Set([
    '/api/security/change-password',
    '/api/security/password-status',
    '/api/mfa/logout',
]);

function parseCookies(cookieHeader) {
    const cookies = {};
    (cookieHeader || '').split(';').forEach(pair => {
        const idx = pair.indexOf('=');
        if (idx < 0) return;
        const k = pair.slice(0, idx).trim();
        const v = pair.slice(idx + 1).trim();
        if (k) cookies[k] = decodeURIComponent(v);
    });
    return cookies;
}

export async function requireAuth(req, res, next) {
    const token = parseCookies(req.headers.cookie)['better-auth.session_token'];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const [row] = await db
            .select({
                expiresAt:   sessionTable.expiresAt,
                userId:      user.id,
                name:        user.name,
                displayName: user.displayName,
                email:       user.email,
                role:        user.role,
                siteId:      user.siteId,
                organizationId: user.organizationId,
                orgStatus:   organizations.status,
                isActive:    user.isActive,
            })
            .from(sessionTable)
            .innerJoin(user, eq(sessionTable.userId, user.id))
            .leftJoin(organizations, eq(user.organizationId, organizations.id))
            .where(eq(sessionTable.token, token));

        if (!row || new Date(row.expiresAt) < new Date()) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Deactivated staff must not retain access (ICH GCP E6(R3) C.4.2) —
        // enforced here so every API route is covered even if a session survives.
        if (row.isActive === false) {
            return res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
        }

        // Tenant lifecycle: users of a suspended/closed organization lose access
        // (platform_owner has no org and is exempt). One level above isActive.
        if (row.role !== 'platform_owner' && row.orgStatus && row.orgStatus !== 'Active') {
            return res.status(403).json({ error: `Organization is ${row.orgStatus}. Contact your administrator.` });
        }

        // ICH GCP E6(R3) C.4.3 — reject requests from locked accounts
        // try-catch: table may not exist before migration completes on first deploy
        try {
            const [lock] = await db.select().from(accountLocks)
                .where(eq(accountLocks.userId, row.userId));
            if (lock && !lock.unlockedAt && lock.lockedAt) {
                if (!lock.autoUnlockAt || new Date(lock.autoUnlockAt) > new Date()) {
                    return res.status(423).json({ error: 'Account is locked. Contact your administrator.' });
                }
            }
        } catch { /* migration pending — skip lock check */ }

        // Admin-forced password reset: block the API (not just the UI) until
        // the password is actually changed (ICH GCP E6(R3) C.4.3).
        try {
            const url = (req.originalUrl || req.url || '').split('?')[0];
            if (!MUST_CHANGE_ALLOWED.has(url)) {
                const [meta] = await db.select({ mustChange: passwordMeta.mustChange })
                    .from(passwordMeta).where(eq(passwordMeta.userId, row.userId));
                if (meta?.mustChange) {
                    return res.status(403).json({
                        error: 'Password change required before continuing.',
                        mustChangePassword: true,
                    });
                }
            }
        } catch { /* migration pending — skip must-change check */ }

        req.user = {
            id:          row.userId,
            name:        row.name,
            displayName: row.displayName ?? null,
            email:       row.email,
            role:        row.role,
            siteId:      row.siteId ?? null,
            organizationId: row.organizationId ?? null,
        };

        // Tenant the request acts within. Normal users are bound to their own
        // organization. platform_owner (cross-tenant SaaS operator) may target
        // a specific tenant via X-Org-ID, or act globally (null) without it.
        if (row.role === 'platform_owner') {
            const rawOrg = req.headers['x-org-id'];
            req.orgId = rawOrg && !isNaN(parseInt(rawOrg)) ? parseInt(rawOrg) : null;
        } else {
            req.orgId = row.organizationId ?? null;
        }

        next();
    } catch (err) {
        console.error('requireAuth error:', err.message);
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
