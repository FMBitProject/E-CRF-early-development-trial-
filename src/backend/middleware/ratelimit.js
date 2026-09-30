import { client } from '../db/connection.js';
import { tokenDigest } from '../lib/security-crypto.js';

// PostgreSQL-backed atomic buckets are shared by all instances. Raw addresses and
// challenge values never become stored keys. Failure to check a limit fails closed.
async function consume(key, limit, windowMs) {
    const hashedKey = tokenDigest(key);
    const [bucket] = await client`
        INSERT INTO security_rate_limits (key, count, reset_at)
        VALUES (${hashedKey}, 1, ${new Date(Date.now() + windowMs).toISOString()})
        ON CONFLICT (key) DO UPDATE SET
            count = CASE WHEN security_rate_limits.reset_at <= NOW() THEN 1 ELSE security_rate_limits.count + 1 END,
            reset_at = CASE WHEN security_rate_limits.reset_at <= NOW() THEN EXCLUDED.reset_at ELSE security_rate_limits.reset_at END
        RETURNING count, reset_at
    `;
    if (Math.random() < 0.01) {
        await client`DELETE FROM security_rate_limits WHERE key IN
            (SELECT key FROM security_rate_limits WHERE reset_at < NOW() LIMIT 1000)`;
    }
    return { allowed: bucket.count <= limit, retryAfter: Math.max(1, Math.ceil((new Date(bucket.reset_at) - Date.now()) / 1000)) };
}

async function enforce(req, res, next, buckets) {
    try {
        for (const [key, limit, windowMs] of buckets) {
            const result = await consume(key, limit, windowMs);
            if (!result.allowed) {
                res.setHeader('Retry-After', result.retryAfter);
                return res.status(429).json({ error: 'Too many requests. Try again later.', retryAfter: result.retryAfter });
            }
        }
        next();
    } catch {
        res.status(503).json({ error: 'Security checks temporarily unavailable.' });
    }
}

export function rateLimitAuth(req, res, next) {
    const buckets = [[`auth:ip:${req.ip}`, 30, 15 * 60000]];
    const email = req.body?.email ?? req.body?.adminEmail;
    if (typeof email === 'string' && email.length <= 254) buckets.push([`auth:email:${email.trim().toLowerCase()}`, 10, 15 * 60000]);
    if (typeof req.body?.tempToken === 'string' && req.body.tempToken.length <= 128) {
        buckets.push([`auth:challenge:${req.body.tempToken}`, 5, 10 * 60000]);
    }
    return enforce(req, res, next, buckets);
}

export function rateLimitTenant(req, res, next) {
    return enforce(req, res, next, [[`tenant:${req.orgId ?? `ip:${req.ip}`}`, 600, 60000]]);
}
