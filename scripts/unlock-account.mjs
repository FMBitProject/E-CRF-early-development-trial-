#!/usr/bin/env node
// Trusted operator recovery. Supply {"email":"...","reason":"..."} on stdin.
// Uses DATABASE_URL; never changes roles, passwords, MFA or tenant membership.
import 'dotenv/config';
import { client } from '../src/backend/db/connection.js';
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
    console.error('Recovery failed:', error.code ? 'DATABASE_OPERATION_FAILED' : error.message);
    process.exitCode = 1;
} finally {
    await client.end();
}
