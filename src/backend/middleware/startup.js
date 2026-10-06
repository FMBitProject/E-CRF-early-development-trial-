// Keep initialization within the API request lifetime on serverless hosts.
// All concurrent requests share one initialization; failures remain fail-closed.
export function createStartupGate(initialize, { onReady = () => {}, onError = () => {} } = {}) {
    let startup;
    return async (req, res, next) => {
        if (req.path === '/health') return next();
        startup ??= Promise.resolve().then(initialize).then(onReady).catch(error => {
            onError(error);
            throw error;
        });
        try {
            await startup;
        } catch {
            return res.status(503).json({ error: 'Service initialization failed' });
        }
        next();
    };
}
