// Validation/sanitization for per-study Inclusion/Exclusion criteria.
//
// Stored on studies.ie_criteria as { inclusion:[{key,label}], exclusion:[{key,label}] }.
// A study with NULL ie_criteria falls back to the app default set on the client,
// so this helper returns null whenever there is nothing meaningful to store —
// that keeps "no configured criteria" and "default criteria" the same thing.

const MAX_ITEMS_PER_LIST = 50;
const MAX_LABEL_LEN = 300;

function cleanList(raw, prefix) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    const usedKeys = new Set();
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const label = String(item.label ?? '').trim().slice(0, MAX_LABEL_LEN);
        if (!label) continue;                       // drop empty rows
        // Keep a provided slug-like key if unique; otherwise assign a stable one.
        let key = String(item.key ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!key || usedKeys.has(key)) key = `${prefix}_${out.length + 1}`;
        usedKeys.add(key);
        out.push({ key, label });
        if (out.length >= MAX_ITEMS_PER_LIST) break;
    }
    return out;
}

// Returns a normalized { inclusion, exclusion } object, or null when the input
// is absent/empty (→ study should use the default criteria set).
export function sanitizeIeCriteria(input) {
    if (input === null || input === undefined) return null;
    if (typeof input !== 'object') return null;

    const inclusion = cleanList(input.inclusion, 'inc');
    const exclusion = cleanList(input.exclusion, 'exc');

    if (inclusion.length === 0 && exclusion.length === 0) return null;
    return { inclusion, exclusion };
}
