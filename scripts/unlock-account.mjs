#!/usr/bin/env node
// Trusted operator recovery. Supply {"email":"...","reason":"..."} on stdin.
// Uses DATABASE_URL; never changes roles, passwords, MFA or tenant membership.
import 'dotenv/config';
let client;
import { writeAudit } from '../src/backend/lib/audit.js';

try {
    let input = '';
    for await (const chunk of process.stdin) {
        input += chunk;
        if (input.length > 4096) throw new Error('Input too large');
    }
    const data = JSON.parse(input);
    if (typeof data.email !== 'string' || !data.email.includes('@') || data.email.length > 254 ||
        typeof data.reason !== 'string' || data.reason.trim().length < 10 || data.reason.length > 1000) {
        throw new Error('Provide email and a recovery reason of 10–1000 characters');
    }
    if (!process.env.DATABASE_URL?.trim()) {
        throw new Error('DATABASE_URL is missing. Create a local .env containing the database URL used by your Vercel deployment, then run recovery again.');
    }
    try {
        const url = new URL(process.env.DATABASE_URL);
        if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) throw new Error();
    } catch {
        throw new Error('DATABASE_URL is invalid. Use the PostgreSQL connection URL from your database provider.');
    }
    ({ client } = await import('../src/backend/db/connection.js'));
    const email = data.email.trim().toLowerCase();
    const changed = await client.begin(async tx => {
        // Same lock order as sign-in: no racing failure can overwrite recovery.
        await tx`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 19))`;
        const [user] = await tx`SELECT * FROM "user" WHERE email = ${email} FOR UPDATE`;
        if (!user) throw new Error('Account not found');
        const rows = await tx`UPDATE account_locks SET failed_count = 0,
            unlocked_at = NOW(), auto_unlock_at = NULL, unlocked_by = NULL,
            unlock_reason = ${'Trusted operator recovery: ' + data.reason.trim()}
            WHERE email = ${email} RETURNING id`;
        if (!rows.length) return false;
        await writeAudit(tx, {
            tableName: 'account_locks', recordId: rows[0].id, action: 'UPDATE',
            fieldName: 'unlocked_at', newValue: new Date().toISOString(),
            reason: 'Trusted operator recovery: ' + data.reason.trim(),
            user: { name: 'Local recovery operator', role: 'system', organizationId: user.organization_id },
            ipAddress: null,
        });
        return true;
    });
    console.log(changed ? 'Account unlocked. Sign in again.' : 'No account lock found.');
} catch (error) {
    const databaseErrors = {
        ECONNREFUSED: 'Database connection refused. Check DATABASE_URL and whether the database is running.',
        ENOTFOUND: 'Database host could not be found. Check DATABASE_URL.',
        CONNECT_TIMEOUT: 'Database connection timed out. Check network access and the database connection URL.',
        ETIMEDOUT: 'Database connection timed out. Check network access and the database connection URL.',
        '28P01': 'Database credentials were rejected. Update DATABASE_URL from your database provider.',
        '3D000': 'The configured database does not exist. Check DATABASE_URL.',
        '42P01': 'Required application tables are missing. Check that DATABASE_URL targets the deployed application database.',
        '42501': 'The database user lacks permission to recover this account.',
    };
    // Database errors may include connection details; output only a safe code.
    console.error('Recovery failed:', error.code
        ? (databaseErrors[error.code] || `Database operation failed (code: ${String(error.code).replace(/[^a-zA-Z0-9_]/g, '')}).`)
        : error.message);
    process.exitCode = 1;
} finally {
    if (client) await client.end();
}
