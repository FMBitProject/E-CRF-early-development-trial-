import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth/better-auth.js';

export async function requireAuth(req, res, next) {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = session.user;
    req.session = session.session;
    next();
}
