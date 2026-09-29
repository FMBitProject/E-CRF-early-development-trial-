import { randomUUID } from 'node:crypto';

const serverMessage = 'We could not complete the request. If you were saving, check whether your changes were saved before trying again. Contact support if this continues.';

// Legacy routes send their own 5xx JSON instead of forwarding to next(err).
// Enforce the public boundary here until those routes are migrated.
export function safeErrorResponses(req, res, next) {
    res.locals.requestId = randomUUID();
    res.setHeader('X-Request-ID', res.locals.requestId);
    const json = res.json;
    res.json = function (body) {
        if (res.statusCode >= 500) {
            // Never log the body: query parameters may contain participant data.
            // TODO: MINOR — Correlate request IDs with sanitized diagnostic codes in route logs.
            console.error('Request failed', { requestId: res.locals.requestId, status: res.statusCode, method: req.method });
            body = { error: serverMessage, code: 'SERVER_ERROR', requestId: res.locals.requestId };
        }
        return json.call(this, body);
    };
    next();
}

export function apiErrorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);
    const known = {
        'entity.parse.failed': [400, 'The submitted data could not be read. Reload the page and try again.'],
        'entity.too.large': [413, 'The upload is too large. Reduce its size and try again.'],
        'request.aborted': [400, 'The request was interrupted. Check your connection and try again.'],
    };
    const [status, message] = known[err.type] || [500, serverMessage];
    res.status(status).json({ error: message, requestId: res.locals.requestId });
}
