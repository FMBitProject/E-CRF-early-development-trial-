// Labels remain data, never executable inline JavaScript. Only named actions
// registered here can be dispatched; DOM attributes cannot name arbitrary functions.
export function escapeAttribute(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function actionAttributes(action, args) {
    return `data-safe-action="${escapeAttribute(action)}" data-safe-args="${escapeAttribute(JSON.stringify(args))}"`;
}

export function visitActionAttributes(action, id, name) {
    return actionAttributes(action, [id, name]);
}

export function dispatchSafeAction(element, host = globalThis.window) {
    const handlers = {
        select: (...args) => host.selectVisit(...args),
        unsign: (...args) => host.openUnsignVisitModal(...args),
        delete: (...args) => host.openDeleteVisitModal(...args),
        query: (...args) => host.openRowInlineQuery(...args),
        inlineQuery: (...args) => host.openInlineQueryModal(...args),
        unblind: (...args) => host.openUnblindModal(...args),
    };
    if (!Object.hasOwn(handlers, element.dataset.safeAction)) return false;
    let args;
    try { args = JSON.parse(element.dataset.safeArgs); } catch { return false; }
    if (!Array.isArray(args) || args.length > 4) return false;
    // TODO: Verify the resolved window handler is a function and handle handler failures without an uncaught TypeError.
    handlers[element.dataset.safeAction](...args);
    return true;
}

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', event => {
        const element = event.target.closest?.('[data-safe-action]');
        if (!element) return;
        if (element.tagName === 'TR' && event.target.closest('button, a, input, select, [onclick]')) return;
        event.preventDefault();
        event.stopPropagation();
        dispatchSafeAction(element);
    }, true);
}
