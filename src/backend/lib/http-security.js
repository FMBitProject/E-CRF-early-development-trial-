export const asyncRoute = fn => (req, res, next) =>
    Promise.resolve().then(() => fn(req, res, next)).catch(next);

export function trustedOrigins() {
    const origins = [process.env.BETTER_AUTH_URL,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
        // The stable production domain differs from the deployment hostname.
        process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null];
    if (process.env.NODE_ENV !== 'production') origins.push('http://localhost:3000');
    return new Set(origins.filter(Boolean).map(value => new URL(value).origin));
}

export function checkOrigin(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/billing/webhook') return next();
    const origin = req.headers.origin;
    if ((origin && !trustedOrigins().has(origin)) || (!origin && req.headers['sec-fetch-site'] === 'cross-site')) {
        return res.status(403).json({ error: 'Origin not allowed', code: 'ORIGIN_NOT_ALLOWED' });
    }
    next();
}

export function validCredentials(body) {
    return body && typeof body.email === 'string' && body.email.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) &&
        typeof body.password === 'string' && body.password.length > 0 && body.password.length <= 256;
}
