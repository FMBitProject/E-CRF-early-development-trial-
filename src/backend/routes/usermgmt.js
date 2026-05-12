import { Router } from 'express';
import { eq, and, ne } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { user, studyUsers, sites, studies, passwordMeta, session } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { sendUserInviteEmail } from '../lib/email.js';
import { auth } from '../auth/better-auth.js';
import crypto from 'crypto';

const router = Router();

const VALID_ROLES = ['admin', 'investigator', 'pi', 'cra', 'crc'];

// ── GET /api/users — list all users (admin only)
router.get('/', requireRole('admin'), async (req, res) => {
    try {
        const users = await db.select({
            id:            user.id,
            name:          user.name,
            email:         user.email,
            role:          user.role,
            siteId:        user.siteId,
            emailVerified: user.emailVerified,
            createdAt:     user.createdAt,
        }).from(user).orderBy(user.createdAt);

        // Enrich with site name and study assignments
        const allSites = await db.select({ id: sites.id, name: sites.name, code: sites.code }).from(sites);
        const siteMap = new Map(allSites.map(s => [s.id, s]));

        const allStudyUsers = await db.select().from(studyUsers);
        const allStudies = await db.select({ id: studies.id, title: studies.title, protocolNo: studies.protocolNo }).from(studies);
        const studyMap = new Map(allStudies.map(s => [s.id, s]));

        const enriched = users.map(u => {
            const site = u.siteId ? siteMap.get(u.siteId) : null;
            const studyAssignments = allStudyUsers
                .filter(su => su.userId === u.id)
                .map(su => studyMap.get(su.studyId))
                .filter(Boolean);
            return {
                ...u,
                siteName: site ? `${site.code} – ${site.name}` : null,
                studies: studyAssignments,
            };
        });

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/users/:id — single user profile (admin or self)
router.get('/:id', async (req, res) => {
    try {
        const targetId = req.params.id;
        if (req.user.role !== 'admin' && req.user.id !== targetId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const [u] = await db.select().from(user).where(eq(user.id, targetId));
        if (!u) return res.status(404).json({ error: 'User not found' });

        const siteRow = u.siteId
            ? await db.select().from(sites).where(eq(sites.id, u.siteId)).then(r => r[0])
            : null;

        const userStudies = await db
            .select({ studyId: studyUsers.studyId, assignedAt: studyUsers.assignedAt })
            .from(studyUsers)
            .where(eq(studyUsers.userId, targetId));

        const studyIds = userStudies.map(s => s.studyId);
        const studyList = studyIds.length
            ? await db.select({ id: studies.id, title: studies.title, protocolNo: studies.protocolNo, status: studies.status })
                .from(studies)
            : [];

        res.json({
            ...u,
            password: undefined,
            site: siteRow ?? null,
            studies: studyList.filter(s => studyIds.includes(s.id)),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/users/invite — invite a new user (admin only)
router.post('/invite', requireRole('admin'), async (req, res) => {
    try {
        const { name, email, role, siteId } = req.body;
        if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
        if (role && !VALID_ROLES.includes(role)) {
            return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
        }

        // Check for duplicate email
        const [existing] = await db.select({ id: user.id }).from(user)
            .where(eq(user.email, email.toLowerCase().trim()));
        if (existing) return res.status(409).json({ error: 'A user with this email already exists' });

        // Generate a secure temporary password
        const tempPassword = crypto.randomBytes(8).toString('hex');

        // Create user via Better Auth API (sign-up)
        const signUpResult = await auth.api.signUpEmail({
            body: {
                name:     name.trim(),
                email:    email.toLowerCase().trim(),
                password: tempPassword,
            },
        });

        if (!signUpResult?.user?.id) {
            return res.status(500).json({ error: 'Failed to create user account' });
        }

        const newUserId = signUpResult.user.id;

        // Set role and site
        await db.update(user).set({
            role:   role ?? 'investigator',
            siteId: siteId ? parseInt(siteId) : null,
        }).where(eq(user.id, newUserId));

        // Mark password as must-change
        await db.insert(passwordMeta).values({
            userId:        newUserId,
            lastChangedAt: new Date(),
            mustChange:    true,
        }).onConflictDoNothing();

        // Send invite email (fire-and-forget)
        sendUserInviteEmail(email, name, {
            tempPassword,
            role:     role ?? 'investigator',
            invitedBy: req.user.name,
            appUrl:   process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
        }).catch(() => {});

        await writeAudit(db, {
            tableName: 'user', recordId: newUserId, action: 'INSERT',
            newValue: `User "${name}" <${email}> invited with role "${role ?? 'investigator'}"`,
            reason: 'User invited by admin',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json({
            id:    newUserId,
            name,
            email: email.toLowerCase().trim(),
            role:  role ?? 'investigator',
            siteId: siteId ?? null,
            tempPasswordSent: true,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/users/:id/role — change user role (admin only)
router.patch('/:id/role', requireRole('admin'), async (req, res) => {
    try {
        const targetId = req.params.id;
        const { role, reason } = req.body;
        if (!role) return res.status(400).json({ error: 'role is required' });
        if (!VALID_ROLES.includes(role)) {
            return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
        }
        if (!reason) return res.status(400).json({ error: 'reason is required' });
        if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot change your own role' });

        const [existing] = await db.select({ id: user.id, role: user.role }).from(user)
            .where(eq(user.id, targetId));
        if (!existing) return res.status(404).json({ error: 'User not found' });

        const [updated] = await db.update(user).set({ role }).where(eq(user.id, targetId)).returning({
            id: user.id, name: user.name, email: user.email, role: user.role,
        });

        await writeAudit(db, {
            tableName: 'user', recordId: targetId, action: 'UPDATE',
            fieldName: 'role', oldValue: existing.role, newValue: role,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/users/:id/site — assign user to site (admin only)
router.patch('/:id/site', requireRole('admin'), async (req, res) => {
    try {
        const targetId = req.params.id;
        const { siteId, reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required' });

        const [existing] = await db.select({ id: user.id, siteId: user.siteId }).from(user)
            .where(eq(user.id, targetId));
        if (!existing) return res.status(404).json({ error: 'User not found' });

        if (siteId) {
            const [site] = await db.select({ id: sites.id }).from(sites).where(eq(sites.id, parseInt(siteId)));
            if (!site) return res.status(404).json({ error: 'Site not found' });
        }

        const [updated] = await db.update(user)
            .set({ siteId: siteId ? parseInt(siteId) : null })
            .where(eq(user.id, targetId))
            .returning({ id: user.id, name: user.name, email: user.email, role: user.role, siteId: user.siteId });

        await writeAudit(db, {
            tableName: 'user', recordId: targetId, action: 'UPDATE',
            fieldName: 'site_id',
            oldValue: String(existing.siteId ?? 'none'),
            newValue: String(siteId ?? 'none'),
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/users/:id/studies — assign user to a study (admin only)
router.post('/:id/studies', requireRole('admin'), async (req, res) => {
    try {
        const targetId = req.params.id;
        const { studyId } = req.body;
        if (!studyId) return res.status(400).json({ error: 'studyId is required' });

        const [targetUser] = await db.select({ id: user.id }).from(user).where(eq(user.id, targetId));
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const [study] = await db.select({ id: studies.id, title: studies.title }).from(studies)
            .where(eq(studies.id, parseInt(studyId)));
        if (!study) return res.status(404).json({ error: 'Study not found' });

        const [dup] = await db.select({ id: studyUsers.id }).from(studyUsers)
            .where(and(eq(studyUsers.userId, targetId), eq(studyUsers.studyId, parseInt(studyId))));
        if (dup) return res.status(409).json({ error: 'User already assigned to this study' });

        const [row] = await db.insert(studyUsers).values({
            studyId:    parseInt(studyId),
            userId:     targetId,
            assignedBy: req.user.id,
        }).returning();

        await writeAudit(db, {
            tableName: 'study_users', recordId: row.id, action: 'INSERT',
            newValue: `User assigned to study "${study.title}"`,
            reason: 'Study assignment by admin',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/users/:id/studies/:studyId — remove from study (admin only)
router.delete('/:id/studies/:studyId', requireRole('admin'), async (req, res) => {
    try {
        const targetId = req.params.id;
        const studyId  = parseInt(req.params.studyId);

        const [row] = await db.select().from(studyUsers)
            .where(and(eq(studyUsers.userId, targetId), eq(studyUsers.studyId, studyId)));
        if (!row) return res.status(404).json({ error: 'Assignment not found' });

        await db.delete(studyUsers)
            .where(and(eq(studyUsers.userId, targetId), eq(studyUsers.studyId, studyId)));

        await writeAudit(db, {
            tableName: 'study_users', recordId: row.id, action: 'DELETE',
            oldValue: `User removed from study ${studyId}`,
            reason: 'Study assignment removed by admin',
            user: req.user, ipAddress: req.ip,
        });

        res.json({ removed: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/users/:id/deactivate — deactivate user (admin only, cannot deactivate self)
router.patch('/:id/deactivate', requireRole('admin'), async (req, res) => {
    try {
        const targetId = req.params.id;
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required' });
        if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot deactivate your own account' });

        const [existing] = await db.select({ id: user.id, emailVerified: user.emailVerified })
            .from(user).where(eq(user.id, targetId));
        if (!existing) return res.status(404).json({ error: 'User not found' });

        // Deactivate by setting emailVerified = false (locks login) and flagging mustChange
        await db.update(user).set({ emailVerified: false }).where(eq(user.id, targetId));

        // Invalidate all active sessions
        await db.delete(session).where(eq(session.userId, targetId));

        await writeAudit(db, {
            tableName: 'user', recordId: targetId, action: 'UPDATE',
            fieldName: 'email_verified', oldValue: 'true', newValue: 'false',
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ deactivated: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
