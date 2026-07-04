export function requireRole(...roles) {
    const middleware = (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient role' });
        }
        next();
    };
    // Exposed for automated RBAC tests (tests/rbac-matrix.test.js) — allows the
    // permission matrix to be read off the live route table without a database.
    middleware.allowedRoles = roles;
    return middleware;
}
