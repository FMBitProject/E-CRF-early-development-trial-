// ICH GCP E6(R3) Appendix C.4.3 — Rate limiting on authentication endpoints

const store = new Map(); // key → { count, resetAt }

const WINDOW_MS    = 15 * 60 * 1000; // 15-minute window
const MAX_ATTEMPTS = 10;              // 10 requests per window per IP

export function rateLimitAuth(req, res, next) {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const rec = store.get(key);

    if (rec && rec.resetAt > now) {
        if (rec.count >= MAX_ATTEMPTS) {
            return res.status(429).json({
                error: 'Too many authentication attempts. Please try again in 15 minutes.',
                retryAfter: Math.ceil((rec.resetAt - now) / 1000),
            });
        }
        rec.count++;
    } else {
        store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    }

    // Prune old entries every 100 calls to prevent memory leak
    if (store.size > 1000) {
        for (const [k, v] of store.entries()) {
            if (v.resetAt <= now) store.delete(k);
        }
    }

    next();
}
