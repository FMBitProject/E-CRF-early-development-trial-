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
            const codes = jsonArray(row.backup_codes).map(code => code.digest
                ? code
                : { digest: backupDigest(code.code, row.user_id), used: !!code.used });
            await tx`UPDATE user_totp SET secret = ${encrypted ? row.secret : encryptSecret(row.secret, row.user_id)},
                backup_codes = ${JSON.stringify(codes)} WHERE id = ${row.id}`;
        }
        // Old bearer sessions cannot be safely grandfathered into the new protocol.
        await tx`DELETE FROM session WHERE token NOT LIKE 'sha256:%'`;
        await tx`DELETE FROM verification WHERE identifier LIKE 'mfa:%' AND id NOT LIKE 'sha256:%'`;
        // Required authorization/security schema must be queryable before readiness.
        await tx`SELECT user_id, failed_count, unlocked_at FROM account_locks LIMIT 0`;
        await tx`SELECT user_id, must_change FROM password_meta LIMIT 0`;
        await tx`SELECT user_id, study_id, site_id FROM user_sites LIMIT 0`;
        await tx`SELECT study_id, status FROM study_db_lock LIMIT 0`;
    });
}
