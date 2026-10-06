import { request, ApiError } from './http.js';
import { clearSessionContext, readStored, readObject, writeStored } from './storage.js';

// Login/MFA requests use the raw HTTP helper: a rejected credential must stay
// on the login form. Protected API calls instead end an invalid local session.
export async function authenticatedRequest(path, options = {}, settings = {}) {
    try {
        return await request(path, options, settings);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            clearSessionContext();
            window.location.replace('/login.html?reason=session-expired');
        }
        throw error;
    }
}

// Browser metadata is a display cache, not proof of authentication.
export async function verifyStoredSession() {
    const snapshot = readStored('ecrf_session');
    const cached = readObject('ecrf_session', value => typeof value.id === 'string' && typeof value.role === 'string');
    if (!cached) return null;
    try {
        const result = await request('/api/auth/get-session');
        // A login completed while verification was pending. Leave that newer
        // session and its navigation to the login form's success handler.
        if (readStored('ecrf_session') !== snapshot) return null;
        if (!result?.user?.id || !result?.user?.role) {
            clearSessionContext();
            return null;
        }
        writeStored('ecrf_session', JSON.stringify({ ...cached, ...result.user }));
        return result.user;
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            if (readStored('ecrf_session') === snapshot) clearSessionContext();
            return null;
        }
        throw error;
    }
}
