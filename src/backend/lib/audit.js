import { auditTrails } from '../db/schemas/schema.js';

/**
 * Write a single audit entry. Call this for every mutating operation.
 * @param {import('drizzle-orm/postgres-js').PostgresJsDatabase} db
 * @param {object} params
 * @param {string} params.tableName
 * @param {string|number} params.recordId
 * @param {'INSERT'|'UPDATE'|'DELETE'|'LOCK'|'UNLOCK'|'LOGIN'|'LOGOUT'} params.action
 * @param {string} [params.fieldName]
 * @param {string} [params.oldValue]
 * @param {string} [params.newValue]
 * @param {string} [params.reason]
 * @param {object} [params.user]   - req.user object
 * @param {string} [params.ipAddress]
 */
export async function writeAudit(db, {
    tableName, recordId, action,
    fieldName, oldValue, newValue, reason,
    user, ipAddress,
}) {
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
    });
}

/**
 * Diff two plain objects and write one audit row per changed field.
 */
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
