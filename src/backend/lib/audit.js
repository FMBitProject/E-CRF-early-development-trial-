import crypto from 'crypto';
import { auditTrails } from '../db/schemas/schema.js';

function computeHash(params, createdAt) {
    const raw = [
        params.tableName,
        String(params.recordId),
        params.action,
        params.fieldName  ?? '',
        params.oldValue   ?? '',
        params.newValue   ?? '',
        params.user?.id   ?? '',
        params.ipAddress  ?? '',
        createdAt.toISOString(),
    ].join('|');
    return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function writeAudit(db, {
    tableName, recordId, action,
    fieldName, oldValue, newValue, reason,
    user, ipAddress,
}) {
    const createdAt = new Date();
    const auditHash = computeHash(
        { tableName, recordId, action, fieldName, oldValue, newValue, user, ipAddress },
        createdAt,
    );
    await db.insert(auditTrails).values({
        tableName,
        recordId:  String(recordId),
        action,
        fieldName:  fieldName  ?? null,
        oldValue:   oldValue   ?? null,
        newValue:   newValue   ?? null,
        reason:     reason     ?? null,
        userId:     user?.id   ?? null,
        userName:   user?.name ?? null,
        userRole:   user?.role ?? null,
        ipAddress:  ipAddress  ?? null,
        auditHash,
        organizationId: user?.organizationId ?? null,   // tenant isolation of audit reads
        createdAt,
    });
}

export async function writeFieldDiffAudit(db, { tableName, recordId, oldData, newData, reason, user, ipAddress }) {
    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
    const writes = [];
    for (const key of allKeys) {
        const ov = String(oldData?.[key] ?? '');
        const nv = String(newData?.[key] ?? '');
        if (ov !== nv) {
            writes.push(writeAudit(db, {
                tableName, recordId, action: 'UPDATE',
                fieldName: key, oldValue: ov, newValue: nv,
                reason, user, ipAddress,
            }));
        }
    }
    await Promise.all(writes);
}
