import { request, ApiError } from './http.js';

export async function authRequest(path, options) {
    try { return await request(path, options); }
    catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            error.message = path.endsWith('/totp-verify')
                ? 'The code or sign-in session could not be verified. Check the code, or start sign-in again.'
                : 'Sign-in could not be verified. Check your email and password and try again.';
        }
        throw error;
    }
}
