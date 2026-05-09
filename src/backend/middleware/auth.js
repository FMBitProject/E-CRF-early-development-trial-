import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { session as sessionTable, user } from '../db/schemas/schema.js';

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
                expiresAt: sessionTable.expiresAt,
                userId:    user.id,
                name:      user.name,
                email:     user.email,
                role:      user.role,
                siteId:    user.siteId,
            })
            .from(sessionTable)
            .innerJoin(user, eq(sessionTable.userId, user.id))
            .where(eq(sessionTable.token, token));

        if (!row || new Date(row.expiresAt) < new Date()) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        req.user = {
            id:     row.userId,
            name:   row.name,
            email:  row.email,
            role:   row.role,
            siteId: row.siteId ?? null,
        };
        next();
    } catch (err) {
        console.error('requireAuth error:', err.message);
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
