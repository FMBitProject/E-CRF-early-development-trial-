// License verification for on-premise deployments.
//
// A license is a small JSON document signed with the vendor's Ed25519 PRIVATE
// key. The app ships only the matching PUBLIC key (below), so a customer can
// verify a license but cannot forge or alter one. Verification is fully offline
// — no network call, no phone-home.
//
// Enforcement (see lib/licenseguard.js): when a license is missing, invalid, or
// expired the app still runs and all READ / EXPORT operations continue — patient
// data is never locked. Only the creation of NEW records is blocked, so a trial
// cannot operate or grow without a valid license.
import crypto from 'node:crypto';
import fs from 'node:fs';

// Vendor public key (safe to ship). The matching private key is held only by the
// vendor and is used by scripts/sign-license.mjs to issue licenses.
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAKixq6bvJLFcCFEt3BGSjU/jAm0B6yQchLLN4cHJDoGs=
-----END PUBLIC KEY-----`;

// Canonical serialization used for BOTH signing and verifying. Keys are sorted
// so the byte sequence is identical on both sides regardless of property order.
export function canonicalize(payload) {
    return JSON.stringify(payload, Object.keys(payload).sort());
}

// Parse a license document (the { payload, signature } object) from a raw string.
function parseDocument(raw) {
    const text = raw.trim();
    // Accept either raw JSON or a base64-encoded JSON blob (env-var friendly).
    if (text.startsWith('{')) return JSON.parse(text);
    return JSON.parse(Buffer.from(text, 'base64').toString('utf8'));
}

// The public key to verify against. Production always uses the embedded key;
// a test-only override lets the unit tests sign with an ephemeral key without
// shipping the vendor private key. The override is ignored outside NODE_ENV=test.
function publicKey() {
    if (process.env.NODE_ENV === 'test' && process.env.LICENSE_PUBLIC_KEY_OVERRIDE) {
        return process.env.LICENSE_PUBLIC_KEY_OVERRIDE;
    }
    return PUBLIC_KEY_PEM;
}

// Verify a license document's signature against the embedded public key.
function verifySignature(doc) {
    if (!doc || typeof doc !== 'object' || !doc.payload || !doc.signature) return false;
    const message = Buffer.from(canonicalize(doc.payload), 'utf8');
    const signature = Buffer.from(doc.signature, 'base64');
    try {
        return crypto.verify(null, message, publicKey(), signature);
    } catch {
        return false;
    }
}

// Load the raw license string from LICENSE_KEY (inline) or LICENSE_FILE (path).
function loadRawLicense() {
    if (process.env.LICENSE_KEY && process.env.LICENSE_KEY.trim()) {
        return process.env.LICENSE_KEY;
    }
    const file = process.env.LICENSE_FILE && process.env.LICENSE_FILE.trim();
    if (file && fs.existsSync(file)) {
        return fs.readFileSync(file, 'utf8');
    }
    return null;
}

// Evaluate the current license. Returns a stable status object:
//   { present, valid, expired, reason, customer, issuedAt, expiresAt, limits }
// `active` (valid && !expired) is the single flag enforcement should consult.
export function evaluateLicense(nowMs = Date.now()) {
    const base = {
        present: false, valid: false, expired: false, active: false,
        reason: 'no-license', customer: null, issuedAt: null, expiresAt: null,
        limits: {},
    };

    const raw = loadRawLicense();
    if (!raw) return base;

    let doc;
    try {
        doc = parseDocument(raw);
    } catch {
        return { ...base, present: true, reason: 'unparsable' };
    }

    if (!verifySignature(doc)) {
        return { ...base, present: true, reason: 'bad-signature' };
    }

    const p = doc.payload;
    const expiresAt = p.expiresAt ? new Date(p.expiresAt) : null;
    const expired = !!(expiresAt && nowMs > expiresAt.getTime());

    return {
        present: true,
        valid: true,
        expired,
        active: !expired,
        reason: expired ? 'expired' : 'ok',
        customer: p.customer ?? null,
        issuedAt: p.issuedAt ?? null,
        expiresAt: p.expiresAt ?? null,
        limits: {
            maxUsers: p.maxUsers ?? null,
            maxSites: p.maxSites ?? null,
        },
    };
}

// Cached view refreshed lazily so verification runs at most once per interval
// (Ed25519 verify is cheap, but avoids re-reading the file on every request).
let cache = null;
let cacheAt = 0;
const TTL_MS = 60_000;

export function getLicense() {
    const now = Date.now();
    if (!cache || now - cacheAt > TTL_MS) {
        cache = evaluateLicense(now);
        cacheAt = now;
    }
    return cache;
}

// Force a re-read (used by tests and after installing a new license).
export function clearLicenseCache() {
    cache = null;
    cacheAt = 0;
}
