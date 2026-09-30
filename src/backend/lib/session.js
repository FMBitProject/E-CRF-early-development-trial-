import crypto from 'node:crypto';
import { tokenDigest } from './security-crypto.js';

export const SESSION_COOKIE = 'better-auth.session_token';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function sessionCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || process.env.BETTER_AUTH_URL?.startsWith('https://'),
        sameSite: 'lax',
        path: '/',
    };
}

export function readSessionToken(req) {
    try {
        const part = (req.headers.cookie || '').split(';').map(s => s.trim())
            .find(s => s.startsWith(`${SESSION_COOKIE}=`));
        if (!part) return null;
        const token = decodeURIComponent(part.slice(SESSION_COOKIE.length + 1));
        return /^v1\.[a-f0-9]{64}$/.test(token) ? token : null;
    } catch {
        return null;
    }
}

export async function createSession(tx, userId, req) {
    const token = `v1.${crypto.randomBytes(32).toString('hex')}`;
    await tx`
        INSERT INTO session (id, user_id, token, expires_at, created_at, updated_at, ip_address, user_agent)
        VALUES (${crypto.randomUUID()}, ${userId}, ${tokenDigest(token)},
                ${new Date(Date.now() + SESSION_MAX_AGE).toISOString()}, NOW(), NOW(),
                ${req.ip || null}, ${(req.headers['user-agent'] || '').slice(0, 512)})
    `;
    return token;
}

export function setSessionCookie(res, token) {
    res.cookie(SESSION_COOKIE, token, { ...sessionCookieOptions(), maxAge: SESSION_MAX_AGE });
}

export function clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
}
