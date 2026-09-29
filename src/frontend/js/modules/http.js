// Shared by JSON requests and downloads. Never automatically retry a write.
// TODO: MINOR — Present support reference IDs consistently beside persistent errors.
export class ApiError extends Error {
    constructor(message, { status = 0, code, data = {}, requestId } = {}) {
        super(message);
        this.name = 'ApiError';
        Object.assign(this, { status, code, data, details: data.details, requestId });
    }
}

const fallback = {
    400: 'Check the information you entered and try again.',
    401: 'Your session could not be verified. Sign in again before continuing.',
    403: 'You do not have permission to do this. Contact your study administrator.',
    404: 'This item could not be found. Refresh the list and try again.',
    409: 'This information conflicts with an existing record. Refresh and review it before saving again.',
    413: 'The upload is too large. Reduce its size and try again.',
    422: 'Check the information you entered and try again.',
    423: 'This account or record is locked. Contact your study administrator.',
    429: 'Too many requests. Wait a moment before trying again.',
};
const pendingWrites = new Set();
const uncertain = 'If you were saving, check whether your changes were saved before trying again.';

export async function request(path, options = {}, { responseType = 'json', timeoutMs = 30000 } = {}) {
    const { signal, ...fetchOptions } = options;
    const method = (options.method || 'GET').toUpperCase();
    const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    // Guard identical in-flight JSON writes in this tab; this is not server idempotency.
    const writeKey = isWrite && (options.body == null || typeof options.body === 'string')
        ? JSON.stringify([path, method, new Headers(options.headers).get('X-Study-ID'), options.body ?? null]) : null;
    if (writeKey && pendingWrites.has(writeKey)) {
        throw new ApiError('This request is already being processed. Wait for the result before submitting again.', { code: 'REQUEST_PENDING' });
    }
    if (writeKey) pendingWrites.add(writeKey);
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
        const res = await fetch(path, { ...fetchOptions, credentials: 'include', signal: controller.signal });
        if (!res.ok) {
            let data = {};
            try { data = await res.json(); } catch (err) {
                if (controller.signal.aborted) throw err;
            }
            if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
            const serverFailure = res.status >= 500;
            const supplied = data.error || data.message;
            const message = res.status === 403 && data.mustChangePassword === true
                ? 'Change your password in Account Security before continuing.'
                : serverFailure
                ? `The service is temporarily unavailable. ${uncertain} Contact support if this continues.`
                : ([400, 409, 422].includes(res.status) && typeof supplied === 'string' && supplied.trim()
                    ? supplied : fallback[res.status] || 'We could not complete the request. Please try again.');
            throw new ApiError(message, {
                status: res.status, code: serverFailure ? 'SERVER_ERROR' : data.code,
                data: serverFailure ? {} : data,
                requestId: res.headers.get('X-Request-ID'),
            });
        }
        if (res.status === 204) return null;
        if (responseType === 'blob') return await res.blob();
        try { return await res.json(); } catch (err) {
            if (controller.signal.aborted) throw err;
            if (!(err instanceof SyntaxError)) throw err;
            throw new ApiError(`The service returned an unreadable response. ${uncertain}`, { code: 'INVALID_RESPONSE', status: res.status });
        }
    } catch (err) {
        if (err instanceof ApiError) throw err;
        if (controller.signal.aborted) {
            throw new ApiError(timedOut ? `The request took too long. ${uncertain}` : `The request was cancelled. ${uncertain}`, { code: timedOut ? 'TIMEOUT' : 'CANCELLED' });
        }
        throw new ApiError(`We could not connect to the service. Check your internet connection. ${uncertain}`, { code: 'NETWORK_ERROR' });
    } finally {
        if (writeKey) pendingWrites.delete(writeKey);
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
    }
}
