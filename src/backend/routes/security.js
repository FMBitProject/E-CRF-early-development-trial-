// Security management — ICH GCP E6(R3) Appendix C.4.3
// Password change, account lockout management, password expiry status

import { Router } from 'express';
import { eq, desc, and, gt } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { user, account, accountLocks, loginAttempts, passwordHistory, passwordMeta } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { validatePassword, POLICY, checkPasswordExpiry } from '../lib/passwordpolicy.js';
import { verifyPassword, hashPassword } from '@better-auth/utils/password';

const router = Router();

// GET /api/security/password-status — check expiry for current user
router.get('/password-status', async (req, res) => {
    try {
        let [meta] = await db.select().from(passwordMeta)
            .where(eq(passwordMeta.userId, req.user.id));
        // Auto-initialize for accounts created before password_meta existed
        if (!meta) {
            const now = new Date();
            await db.insert(passwordMeta)
                .values({ userId: req.user.id, lastChangedAt: now, mustChange: false })
                .onConflictDoNothing();
            meta = { lastChangedAt: now, mustChange: false };
        }
        const expiry = checkPasswordExpiry(meta.lastChangedAt);
        res.json({
            lastChangedAt: meta.lastChangedAt,
            mustChange:    meta.mustChange,
            ...expiry,
            policy: {
                minLength:   POLICY.minLength,
                expiryDays:  POLICY.expiryDays,
                historyCount: POLICY.historyCount,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/security/change-password — self-service password change
router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'currentPassword and newPassword are required' });
        }

        // Validate new password against policy
        const policyErrors = validatePassword(newPassword, req.user.email);
        if (policyErrors.length > 0) {
            return res.status(400).json({ error: 'Password does not meet policy requirements', details: policyErrors });
        }

        // Verify current password
        const [acct] = await db.select({ password: account.password }).from(account)
            .where(and(eq(account.userId, req.user.id), eq(account.providerId, 'credential')));
        if (!acct?.password) return res.status(400).json({ error: 'No credential account found' });

        const valid = await verifyPassword(acct.password, currentPassword);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

        // Check password history
        const history = await db.select({ passwordHash: passwordHistory.passwordHash })
            .from(passwordHistory)
            .where(eq(passwordHistory.userId, req.user.id))
            .orderBy(desc(passwordHistory.createdAt))
            .limit(POLICY.historyCount);

        for (const h of history) {
            if (await verifyPassword(h.passwordHash, newPassword)) {
                return res.status(400).json({
                    error: `Cannot reuse any of your last ${POLICY.historyCount} passwords (ICH E6(R3) C.4.3)`,
                });
            }
        }

        // Hash and update password
        const newHash = await hashPassword(newPassword);
        await db.update(account)
            .set({ password: newHash, updatedAt: new Date() })
            .where(and(eq(account.userId, req.user.id), eq(account.providerId, 'credential')));

        // Save to history
        await db.insert(passwordHistory).values({
            userId: req.user.id,
            passwordHash: newHash,
        });

        // Trim history to last N
        const allHistory = await db.select({ id: passwordHistory.id })
            .from(passwordHistory)
            .where(eq(passwordHistory.userId, req.user.id))
            .orderBy(desc(passwordHistory.createdAt));
        if (allHistory.length > POLICY.historyCount) {
            const toDelete = allHistory.slice(POLICY.historyCount).map(h => h.id);
            for (const id of toDelete) {
                await db.delete(passwordHistory).where(eq(passwordHistory.id, id));
            }
        }

        // Update password meta
        await db.insert(passwordMeta)
            .values({ userId: req.user.id, lastChangedAt: new Date(), mustChange: false })
            .onConflictDoUpdate({
                target: passwordMeta.userId,
                set: { lastChangedAt: new Date(), mustChange: false },
            });

        await writeAudit(db, {
            tableName: 'account', recordId: req.user.id, action: 'UPDATE',
            fieldName: 'password', newValue: '*** changed ***',
            reason: 'Self-service password change (ICH E6(R3) C.4.3)',
            user: req.user, ipAddress: req.ip,
        });

        res.json({ ok: true, message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/security/locked-accounts — list locked accounts (admin only)
router.get('/locked-accounts', requireRole('admin'), async (req, res) => {
    try {
        const now = new Date();
        const locks = await db.select({
            id:           accountLocks.id,
            userId:       accountLocks.userId,
            email:        accountLocks.email,
            failedCount:  accountLocks.failedCount,
            lockedAt:     accountLocks.lockedAt,
            autoUnlockAt: accountLocks.autoUnlockAt,
            unlockedAt:   accountLocks.unlockedAt,
            unlockReason: accountLocks.unlockReason,
        }).from(accountLocks)
          .where(eq(accountLocks.unlockedAt, null))
          .orderBy(desc(accountLocks.lockedAt));

        // Separate still-locked from auto-unlocked
        const active = locks.filter(l => !l.autoUnlockAt || new Date(l.autoUnlockAt) > now);
        res.json(active);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/security/unlock/:userId — admin manually unlocks a user account
router.post('/unlock/:userId', requireRole('admin'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason }  = req.body;
        if (!reason) return res.status(400).json({ error: 'Unlock reason is required' });

        const [lock] = await db.select().from(accountLocks)
            .where(and(eq(accountLocks.userId, userId), eq(accountLocks.unlockedAt, null)));
        if (!lock) return res.status(404).json({ error: 'No active lock found for this user' });

        await db.update(accountLocks)
            .set({ unlockedAt: new Date(), unlockedBy: req.user.id, unlockReason: reason })
            .where(eq(accountLocks.id, lock.id));

        await writeAudit(db, {
            tableName: 'account_locks', recordId: lock.id, action: 'UPDATE',
            fieldName: 'unlocked_at', newValue: new Date().toISOString(),
            reason: `Admin manual unlock: ${reason}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/security/force-password-reset/:userId — admin forces password reset on next login
router.post('/force-password-reset/:userId', requireRole('admin'), async (req, res) => {
    try {
        const { userId } = req.params;

        await db.insert(passwordMeta)
            .values({ userId, lastChangedAt: new Date(0), mustChange: true })
            .onConflictDoUpdate({
                target: passwordMeta.userId,
                set: { mustChange: true },
            });

        await writeAudit(db, {
            tableName: 'password_meta', recordId: userId, action: 'UPDATE',
            fieldName: 'must_change', newValue: 'true',
            reason: 'Admin-initiated forced password reset',
            user: req.user, ipAddress: req.ip,
        });

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/security/users — all users with lock/expiry status (admin only)
router.get('/users', requireRole('admin'), async (req, res) => {
    try {
        const now = new Date();
        const [users, locks, metas] = await Promise.all([
            db.select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }).from(user),
            db.select().from(accountLocks).where(eq(accountLocks.unlockedAt, null)),
            db.select().from(passwordMeta),
        ]);

        const lockMap = new Map(locks.map(l => [l.userId, l]));
        const metaMap = new Map(metas.map(m => [m.userId, m]));

        const enriched = users.map(u => {
            const lock = lockMap.get(u.id);
            const meta = metaMap.get(u.id);
            const expiry = checkPasswordExpiry(meta?.lastChangedAt ?? null);
            const isLocked = lock && (!lock.autoUnlockAt || new Date(lock.autoUnlockAt) > now);

            return {
                ...u,
                isLocked,
                failedAttempts:  lock?.failedCount  ?? 0,
                lockedAt:        lock?.lockedAt      ?? null,
                autoUnlockAt:    lock?.autoUnlockAt  ?? null,
                passwordExpired: expiry.expired,
                passwordDaysLeft: expiry.daysLeft,
                passwordWarn:    expiry.warningSoon,
                mustChangePassword: meta?.mustChange ?? false,
                lastPasswordChange: meta?.lastChangedAt ?? null,
            };
        });

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/security/users/:userId — admin deletes a user account
router.delete('/users/:userId', requireRole('admin'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'Reason is required for audit trail' });
        if (userId === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

        const [target] = await db.select({ name: user.name, email: user.email, role: user.role })
            .from(user).where(eq(user.id, userId));
        if (!target) return res.status(404).json({ error: 'User not found' });

        await writeAudit(db, {
            tableName: 'user', recordId: userId, action: 'DELETE',
            oldValue: `${target.name} (${target.email}) — ${target.role}`,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        await db.delete(user).where(eq(user.id, userId));
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/security/login-activity?email= — recent login attempts (admin only)
router.get('/login-activity', requireRole('admin'), async (req, res) => {
    try {
        const { email } = req.query;
        const conditions = [];
        if (email) conditions.push(eq(loginAttempts.email, email.toLowerCase()));
        const rows = await db.select().from(loginAttempts)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(loginAttempts.attemptedAt))
            .limit(100);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
