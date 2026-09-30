import crypto from 'node:crypto';

export function securityKey() {
    const value = process.env.MFA_ENCRYPTION_KEY;
    if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
        throw new Error('MFA_ENCRYPTION_KEY must contain 32 random bytes encoded as hex');
    }
    return Buffer.from(value, 'hex');
}

export function encryptSecret(secret, userId) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', securityKey(), iv);
    cipher.setAAD(Buffer.from(`ecrf:totp:${userId}`));
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return ['enc1', iv.toString('hex'), cipher.getAuthTag().toString('hex'), encrypted.toString('hex')].join(':');
}

export function decryptSecret(value, userId) {
    const [version, iv, tag, ciphertext] = String(value).split(':');
    if (version !== 'enc1' || !iv || !tag || !ciphertext) throw new Error('MFA migration required');
    const decipher = crypto.createDecipheriv('aes-256-gcm', securityKey(), Buffer.from(iv, 'hex'));
    decipher.setAAD(Buffer.from(`ecrf:totp:${userId}`));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]).toString('utf8');
}

export function backupDigest(code, userId) {
    return crypto.createHmac('sha256', securityKey())
        .update(`ecrf:backup:${userId}:${code.replace(/\s/g, '').toUpperCase()}`).digest('hex');
}

export function tokenDigest(token) {
    return 'sha256:' + crypto.createHash('sha256').update(token).digest('hex');
}

export function equalDigest(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const left = Buffer.from(a), right = Buffer.from(b);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function credentialFingerprint(passwordHash) {
    return crypto.createHmac('sha256', securityKey()).update(`credential:${passwordHash}`).digest('hex');
}
