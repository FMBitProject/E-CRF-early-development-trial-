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

// Per-tenant API rate limit — a noisy or runaway tenant cannot exhaust
// capacity for others. Keyed by organization (falls back to IP pre-tenant).
// Generous ceiling so normal clinical use is never throttled.
const tenantStore = new Map();
const TENANT_WINDOW_MS = 60 * 1000;   // 1-minute window
const TENANT_MAX       = 600;          // 600 requests/min per tenant

export function rateLimitTenant(req, res, next) {
    const key = req.orgId != null ? `org:${req.orgId}` : `ip:${req.ip || 'unknown'}`;
    const now = Date.now();
    const rec = tenantStore.get(key);

    if (rec && rec.resetAt > now) {
        if (rec.count >= TENANT_MAX) {
            return res.status(429).json({
                error: 'Rate limit exceeded for your organization. Please slow down.',
                retryAfter: Math.ceil((rec.resetAt - now) / 1000),
            });
        }
        rec.count++;
    } else {
        tenantStore.set(key, { count: 1, resetAt: now + TENANT_WINDOW_MS });
    }

    if (tenantStore.size > 5000) {
        for (const [k, v] of tenantStore.entries()) {
            if (v.resetAt <= now) tenantStore.delete(k);
        }
    }

    next();
}
