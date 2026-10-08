import { securityKey, encryptSecret, decryptSecret, backupDigest } from './security-crypto.js';

function jsonArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

// Runs after base migrations and before traffic is admitted. No plaintext fallback at runtime.
export async function migrateSecurity(client) {
    securityKey();
    await client.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(918373)`;
        await tx`CREATE TABLE IF NOT EXISTS security_rate_limits (
            key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at TIMESTAMPTZ NOT NULL)`;
        await tx`CREATE INDEX IF NOT EXISTS security_rate_limits_expiry ON security_rate_limits (reset_at)`;
        const rows = await tx`SELECT * FROM user_totp FOR UPDATE`;
        for (const row of rows) {
            const encrypted = row.secret.startsWith('enc1:');
            if (encrypted) decryptSecret(row.secret, row.user_id); // fail startup on wrong key
            const previousCodes = jsonArray(row.backup_codes);
            if (encrypted && previousCodes.every(code => code.digest)) continue;
            const codes = previousCodes.map(code => code.digest
                ? code
                : { digest: backupDigest(code.code, row.user_id), used: !!code.used });
            await tx`UPDATE user_totp SET secret = ${encrypted ? row.secret : encryptSecret(row.secret, row.user_id)},
                backup_codes = ${JSON.stringify(codes)} WHERE id = ${row.id}`;
        }
        // Old bearer sessions cannot be safely grandfathered into the new protocol.
        await tx`DELETE FROM session WHERE token NOT LIKE 'sha256:%'`;
        await tx`DELETE FROM verification WHERE identifier LIKE 'mfa:%' AND id NOT LIKE 'sha256:%'`;
        // Required authorization/security schema must be queryable before readiness.
        await tx`SELECT l.user_id, l.failed_count, l.unlocked_at,
            p.user_id, p.must_change, s.user_id, s.study_id, s.site_id, d.study_id, d.status
            FROM account_locks l CROSS JOIN password_meta p
            CROSS JOIN user_sites s CROSS JOIN study_db_lock d LIMIT 0`;
    });
}
