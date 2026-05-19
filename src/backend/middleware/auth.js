import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { session as sessionTable, user, accountLocks } from '../db/schemas/schema.js';

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
            })
            .from(sessionTable)
            .innerJoin(user, eq(sessionTable.userId, user.id))
            .where(eq(sessionTable.token, token));

        if (!row || new Date(row.expiresAt) < new Date()) {
            return res.status(401).json({ error: 'Unauthorized' });
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

        req.user = {
            id:          row.userId,
            name:        row.name,
            displayName: row.displayName ?? null,
            email:       row.email,
            role:        row.role,
            siteId:      row.siteId ?? null,
        };
        next();
    } catch (err) {
        console.error('requireAuth error:', err.message);
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
