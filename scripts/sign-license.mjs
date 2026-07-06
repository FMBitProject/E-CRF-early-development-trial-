#!/usr/bin/env node
// Issue (sign) an on-premise license — VENDOR ONLY.
//
// Uses the Ed25519 PRIVATE key in license-keys/private.pem (never commit it).
// The app verifies the result with the matching public key embedded in
// src/backend/lib/license.js.
//
// Usage:
//   node scripts/sign-license.mjs --customer "RS Contoh" --expires 2027-12-31 \
//        [--max-users 50] [--max-sites 10] [--out rs-contoh.license.json]
//
// Give the customer the printed LICENSE_KEY (or the .license.json file). They
// set LICENSE_KEY in .env (or LICENSE_FILE=/path/to/license.json), then restart.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY_PATH = path.join(__dirname, '..', 'license-keys', 'private.pem');

// --- parse args -------------------------------------------------------------
function arg(name, fallback = undefined) {
    const i = process.argv.indexOf(`--${name}`);
    return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const customer = arg('customer');
const expires  = arg('expires');           // YYYY-MM-DD
const maxUsers = arg('max-users');
const maxSites = arg('max-sites');
const outFile  = arg('out');

if (!customer || !expires) {
    console.error('Error: --customer and --expires (YYYY-MM-DD) are required.');
    console.error('Example: node scripts/sign-license.mjs --customer "RS Contoh" --expires 2027-12-31');
    process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || Number.isNaN(Date.parse(expires))) {
    console.error(`Error: --expires "${expires}" is not a valid YYYY-MM-DD date.`);
    process.exit(1);
}
if (!fs.existsSync(KEY_PATH)) {
    console.error(`Error: private key not found at ${KEY_PATH}`);
    console.error('This machine cannot issue licenses (private key is vendor-only).');
    process.exit(1);
}

// Canonicalization MUST match src/backend/lib/license.js exactly.
function canonicalize(payload) {
    return JSON.stringify(payload, Object.keys(payload).sort());
}

// End-of-day expiry so "2027-12-31" is valid through that whole day (UTC).
const payload = {
    id: crypto.randomUUID(),
    customer,
    issuedAt: new Date().toISOString().slice(0, 10),
    expiresAt: `${expires}T23:59:59.999Z`,
};
if (maxUsers) payload.maxUsers = Number(maxUsers);
if (maxSites) payload.maxSites = Number(maxSites);

const privateKey = fs.readFileSync(KEY_PATH, 'utf8');
const signature = crypto.sign(null, Buffer.from(canonicalize(payload), 'utf8'), privateKey);

const doc = { payload, signature: signature.toString('base64') };
const licenseKey = Buffer.from(JSON.stringify(doc), 'utf8').toString('base64');

console.log('\nLicense issued for:', customer);
console.log('Expires:', expires, maxUsers ? `| max-users ${maxUsers}` : '', maxSites ? `| max-sites ${maxSites}` : '');
console.log('\n--- LICENSE_KEY (paste into the customer .env) ---\n');
console.log(licenseKey);
console.log('');

if (outFile) {
    fs.writeFileSync(outFile, JSON.stringify(doc, null, 2));
    console.log(`Also written to ${outFile} (use with LICENSE_FILE=/path/to/${path.basename(outFile)})\n`);
}
