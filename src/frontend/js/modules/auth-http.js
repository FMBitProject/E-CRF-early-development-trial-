import { request, ApiError } from './http.js';

export async function authRequest(path, options) {
    // First deployment may need to finish schema upgrades before authentication.
    // Keep this bounded and never automatically resubmit credentials or codes.
    try { return await request(path, options, { timeoutMs: 120000 }); }
    catch (error) {
        if (error instanceof ApiError && error.code === 'TIMEOUT') {
            error.message = 'Sign-in is taking longer than expected. Wait a moment, then try signing in again.';
        }
        if (error instanceof ApiError && error.status === 401) {
            error.message = path.endsWith('/totp-verify')
                ? 'The code or sign-in session could not be verified. Check the code, or start sign-in again.'
                : 'Sign-in could not be verified. Check your email and password and try again.';
        }
        throw error;
    }
}
