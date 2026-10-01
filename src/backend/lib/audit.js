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
    const values = {
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
        organizationId: user?.organizationId ?? null,
        createdAt,
    };
    if (typeof db.insert === 'function') {
        await db.insert(auditTrails).values(values);
        return;
    }
    // postgres.js transaction objects are callable SQL tags. Supporting both
    // transaction types keeps the state change and its audit record atomic.
    if (typeof db === 'function') {
        await db`INSERT INTO audit_trails
            (table_name, record_id, action, field_name, old_value, new_value, reason,
             user_id, user_name, user_role, ip_address, audit_hash, organization_id, created_at)
            VALUES (${values.tableName}, ${values.recordId}, ${values.action}, ${values.fieldName},
                    ${values.oldValue}, ${values.newValue}, ${values.reason}, ${values.userId},
                    ${values.userName}, ${values.userRole}, ${values.ipAddress}, ${values.auditHash},
                    ${values.organizationId}, ${values.createdAt.toISOString()})`;
        return;
    }
    throw new TypeError('Unsupported audit database adapter');
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
