#!/usr/bin/env node
// Reset a user's password directly against the configured database — for
// operators/admins when email-based recovery is unavailable (e.g. on-prem
// installs without SMTP, or a forgotten bootstrap-admin password).
//
// Usage:
//   node scripts/reset-password.mjs --email user@example.com --password 'NewStrongPass1!'
//   node scripts/reset-password.mjs --email user@example.com            # generates one
//
// Uses Better Auth's own hasher via auth.$context, so the stored hash format
// matches exactly what the login flow expects. Reads DATABASE_URL /
// BETTER_AUTH_SECRET from .env like the server does.
import 'dotenv/config';
import crypto from 'node:crypto';

function arg(name, fallback = undefined) {
    const i = process.argv.indexOf(`--${name}`);
    return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const email = (arg('email') || '').trim().toLowerCase();
if (!email) {
    console.error('Error: --email is required.');
    console.error("Example: node scripts/reset-password.mjs --email admin@example.com --password 'NewStrongPass1!'");
    process.exit(1);
}
// Generate a policy-friendly password when none is given (upper+lower+digit+symbol).
const password = arg('password') || `Ecrf-${crypto.randomBytes(9).toString('base64url')}1!`;

const { auth } = await import('../src/backend/auth/better-auth.js');
const { db }   = await import('../src/backend/db/connection.js');
const { eq, and } = await import('drizzle-orm');
const { user, account, passwordMeta } = await import('../src/backend/db/schemas/schema.js');

const [u] = await db.select({ id: user.id, email: user.email, role: user.role })
    .from(user).where(eq(user.email, email));
if (!u) {
    console.error(`Error: no user found with email "${email}".`);
    process.exit(1);
}

const ctx = await auth.$context;
const hash = await ctx.password.hash(password);

const updated = await db.update(account)
    .set({ password: hash, updatedAt: new Date() })
    .where(and(eq(account.userId, u.id), eq(account.providerId, 'credential')))
    .returning({ id: account.id });
if (!updated.length) {
    console.error('Error: user has no credential (email/password) account to reset.');
    process.exit(1);
}

// Refresh password metadata so the policy clock restarts from this reset.
await db.insert(passwordMeta)
    .values({ userId: u.id, lastChangedAt: new Date(), mustChange: false })
    .onConflictDoUpdate({ target: passwordMeta.userId, set: { lastChangedAt: new Date(), mustChange: false } });

console.log(`\nPassword reset for ${u.email} (${u.role}).`);
console.log(`New password: ${password}`);
console.log('Ask the user to sign in and change it from the app afterwards.\n');
process.exit(0);
