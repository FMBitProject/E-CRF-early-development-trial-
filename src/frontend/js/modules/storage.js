// Browser storage contains display context only; authorization stays on the server.
function storageError() {
    const error = new Error('Browser storage is unavailable. Allow site storage, then sign in and select your study again.');
    error.code = 'STORAGE_UNAVAILABLE';
    return error;
}

export function readStored(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}

export function removeStored(key) {
    try { localStorage.removeItem(key); } catch { /* reads fail closed when storage is blocked */ }
}

export function writeStored(key, value) {
    try { localStorage.setItem(key, value); } catch { throw storageError(); }
}

export function readObject(key, validate = () => true) {
    const raw = readStored(key);
    if (raw === null) return null;
    try {
        const value = JSON.parse(raw);
        if (value && typeof value === 'object' && !Array.isArray(value) && validate(value)) return value;
    } catch { /* discard corrupt display context, never guess its contents */ }
    removeStored(key);
    return null;
}

export function readContext(prefix) {
    const rawId = readStored(`${prefix}_id`);
    const meta = readObject(`${prefix}_meta`);
    if (rawId === null && meta === null) return null;
    const id = Number(rawId);
    if (!/^\d+$/.test(rawId || '') || !Number.isSafeInteger(id) || id <= 0 || !meta) {
        removeStored(`${prefix}_id`);
        removeStored(`${prefix}_meta`);
        return null;
    }
    return { ...meta, id };
}

export function writeContext(prefix, value, meta) {
    // Clear the old context first so a failed write cannot select the wrong study.
    removeStored(`${prefix}_id`);
    removeStored(`${prefix}_meta`);
    if (!value) return;
    const id = Number(value.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Select a valid study or site before continuing.');
    try {
        writeStored(`${prefix}_meta`, JSON.stringify(meta));
        writeStored(`${prefix}_id`, String(id));
    } catch (err) {
        removeStored(`${prefix}_id`);
        removeStored(`${prefix}_meta`);
        throw err;
    }
}
