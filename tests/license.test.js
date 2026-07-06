// Unit tests for on-premise licensing (lib/license.js + lib/licenseguard.js).
// Signs with an ephemeral Ed25519 key via the NODE_ENV=test public-key override,
// so no vendor private key is required to run the suite.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';

// Ephemeral vendor keypair for the tests.
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
process.env.LICENSE_PUBLIC_KEY_OVERRIDE = publicKey.export({ type: 'spki', format: 'pem' });

const { evaluateLicense, canonicalize } = await import('../src/backend/lib/license.js');

// Build a signed LICENSE_KEY blob for the given payload (canonicalization must
// match lib/license.js exactly).
function makeLicense(payload) {
    const sig = crypto.sign(null, Buffer.from(canonicalize(payload), 'utf8'), privateKey);
    const doc = { payload, signature: sig.toString('base64') };
    return Buffer.from(JSON.stringify(doc), 'utf8').toString('base64');
}

const futurePayload = {
    id: 'lic-1', customer: 'RS Contoh', issuedAt: '2026-01-01',
    expiresAt: '2027-12-31T23:59:59.999Z', maxUsers: 50,
};

test('valid, unexpired license is active', () => {
    process.env.LICENSE_KEY = makeLicense(futurePayload);
    const r = evaluateLicense(Date.parse('2026-07-06'));
    assert.equal(r.valid, true);
    assert.equal(r.expired, false);
    assert.equal(r.active, true);
    assert.equal(r.customer, 'RS Contoh');
    assert.equal(r.limits.maxUsers, 50);
});

test('valid but past expiry is expired and not active', () => {
    process.env.LICENSE_KEY = makeLicense(futurePayload);
    const r = evaluateLicense(Date.parse('2028-01-01'));
    assert.equal(r.valid, true);
    assert.equal(r.expired, true);
    assert.equal(r.active, false);
    assert.equal(r.reason, 'expired');
});

test('tampered payload fails signature verification', () => {
    const blob = makeLicense(futurePayload);
    const doc = JSON.parse(Buffer.from(blob, 'base64').toString('utf8'));
    doc.payload.expiresAt = '2099-12-31T23:59:59.999Z';   // attacker extends validity
    process.env.LICENSE_KEY = Buffer.from(JSON.stringify(doc), 'utf8').toString('base64');
    const r = evaluateLicense();
    assert.equal(r.valid, false);
    assert.equal(r.active, false);
    assert.equal(r.reason, 'bad-signature');
});

test('license signed by a different key is rejected', () => {
    const other = crypto.generateKeyPairSync('ed25519').privateKey;
    const sig = crypto.sign(null, Buffer.from(canonicalize(futurePayload), 'utf8'), other);
    const doc = { payload: futurePayload, signature: sig.toString('base64') };
    process.env.LICENSE_KEY = Buffer.from(JSON.stringify(doc), 'utf8').toString('base64');
    const r = evaluateLicense();
    assert.equal(r.reason, 'bad-signature');
    assert.equal(r.active, false);
});

test('garbage and missing licenses are inactive', () => {
    process.env.LICENSE_KEY = 'not-a-license';
    assert.equal(evaluateLicense().reason, 'unparsable');
    delete process.env.LICENSE_KEY;
    const r = evaluateLicense();
    assert.equal(r.present, false);
    assert.equal(r.reason, 'no-license');
    assert.equal(r.active, false);
});

test('licenseGuardCreate is a no-op when enforcement is off', async () => {
    delete process.env.LICENSE_ENFORCEMENT;
    delete process.env.LICENSE_KEY;   // no license at all
    const { licenseGuardCreate } = await import('../src/backend/lib/licenseguard.js');
    let called = false;
    licenseGuardCreate({}, { status: () => ({ json: () => {} }) }, () => { called = true; });
    assert.equal(called, true, 'next() should be called when enforcement is off');
});

test('licenseGuardCreate blocks creation when enforcement on and no active license', async () => {
    process.env.LICENSE_ENFORCEMENT = 'true';
    delete process.env.LICENSE_KEY;
    const { licenseGuardCreate } = await import('../src/backend/lib/licenseguard.js');
    const { clearLicenseCache } = await import('../src/backend/lib/license.js');
    clearLicenseCache();
    let status = null, body = null, nextCalled = false;
    const res = { status(code) { status = code; return { json(b) { body = b; } }; } };
    licenseGuardCreate({}, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false, 'next() must NOT be called when blocked');
    assert.equal(status, 403);
    assert.equal(body.error, 'license_required');
    delete process.env.LICENSE_ENFORCEMENT;
});

test('licenseGuardCreate allows creation when enforcement on and license active', async () => {
    process.env.LICENSE_ENFORCEMENT = 'true';
    process.env.LICENSE_KEY = makeLicense(futurePayload);
    const { licenseGuardCreate } = await import('../src/backend/lib/licenseguard.js');
    const { clearLicenseCache } = await import('../src/backend/lib/license.js');
    clearLicenseCache();
    let nextCalled = false;
    licenseGuardCreate({}, { status: () => ({ json: () => {} }) }, () => { nextCalled = true; });
    assert.equal(nextCalled, true, 'next() should be called for an active license');
    delete process.env.LICENSE_ENFORCEMENT;
    delete process.env.LICENSE_KEY;
    clearLicenseCache();
});
