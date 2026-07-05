import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, client } from '../db/connection.js';
import { user, studyUsers, userSites, sites, studies, passwordMeta, session } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { sendUserInviteEmail } from '../lib/email.js';
import { auth } from '../auth/better-auth.js';
import { sameOrg, effectiveOrgId } from '../lib/tenantscope.js';
import { checkLimit } from '../lib/plans.js';
import crypto from 'crypto';

// Self-healing: ensure user_sites table exists
async function ensureUserSitesTable() {
    await client.unsafe(`
        CREATE TABLE IF NOT EXISTS user_sites (
            id          SERIAL PRIMARY KEY,
            user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            site_id     INTEGER NOT NULL,
            study_id    INTEGER NOT NULL,
            assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            assigned_by TEXT REFERENCES "user"(id),
            UNIQUE(user_id, site_id, study_id)
        )
    `);
}
ensureUserSitesTable().catch(() => {});

const router = Router();

const VALID_ROLES = ['admin', 'investigator', 'pi', 'cra', 'crc', 'data_manager'];

// TENANT BOUNDARY: in usermgmt every :id path segment is a target user id.
// This guard runs for all /:id* routes and rejects any user outside the
// caller's organization with 404 (cross-tenant existence stays hidden).
router.param('id', async (req, res, next, id) => {
    try {
        const [target] = await db.select({ organizationId: user.organizationId }).from(user)
            .where(eq(user.id, id));
        if (!target || !sameOrg(req, target.organizationId)) {
            return res.status(404).json({ error: 'User not found' });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/users/directory — slim active-staff directory.
// PI/CRA/DM need this to pick staff for delegation & training entries
// (ICH GCP §4.1.5) without the full admin user listing.
router.get('/directory', requireRole('admin', 'pi', 'cra', 'data_manager'), async (req, res) => {
    try {
        // Org-scoped: NULL orgId (platform_owner global) sees all; else own org.
        const orgId = req.orgId ?? null;
        const rows = await client`
            SELECT id, name, email, role FROM "user"
            WHERE COALESCE(is_active, true) = true
              AND (${orgId}::int IS NULL OR organization_id = ${orgId})
            ORDER BY name`;
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/users — list all users (admin only)
router.get('/', requireRole('admin'), async (req, res) => {
    try {
        // Self-healing: if is_active column doesn't exist yet (first startup race),
        // add it inline and retry rather than returning 500.
        // Org-scoped: NULL orgId (platform_owner global) sees all; else own org.
        const orgId = req.orgId ?? null;
        const fetchUsers = () => client`
            SELECT u.id, u.name, u.display_name AS "displayName", u.email, u.role,
                   u.site_id    AS "siteId",
                   u.created_at AS "createdAt",
                   u.is_active  AS "isActive"
            FROM "user" u
            WHERE (${orgId}::int IS NULL OR u.organization_id = ${orgId})
            ORDER BY u.created_at`;

        let users;
        try {
            users = await fetchUsers();
        } catch (colErr) {
            if ((colErr.message || '').includes('is_active')) {
                await client.unsafe(
                    `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`
                );
                users = await fetchUsers();
            } else {
                throw colErr;
            }
        }

        // Enrich with site name, study assignments, and multi-site assignments
        const allSites = await db.select({ id: sites.id, name: sites.name, code: sites.code }).from(sites);
        const siteMap = new Map(allSites.map(s => [s.id, s]));

        const allStudyUsers = await db.select({
            userId:  studyUsers.userId,
            studyId: studyUsers.studyId,
        }).from(studyUsers);

        const allStudies = await db.select({
            id:         studies.id,
            title:      studies.title,
            protocolNo: studies.protocolNo,
        }).from(studies);
        const studyMap = new Map(allStudies.map(s => [s.id, s]));

        // Fetch all user_sites assignments (multi-site support)
        const allUserSites = await client`
            SELECT us.id, us.user_id, us.site_id, us.study_id,
                   s.code AS site_code, s.name AS site_name,
                   st.title AS study_title, st.protocol_no AS protocol_no
            FROM user_sites us
            JOIN sites s  ON s.id  = us.site_id
            JOIN studies st ON st.id = us.study_id
            ORDER BY us.user_id, st.id, s.code
        `.catch(() => []);

        const enriched = users.map(u => {
            const site = u.siteId ? siteMap.get(u.siteId) : null;
            const studyAssignments = allStudyUsers
                .filter(su => su.userId === u.id)
                .map(su => studyMap.get(su.studyId))
                .filter(Boolean);
            const siteAssignments = allUserSites
                .filter(us => us.user_id === u.id)
                .map(us => ({
                    id:          us.id,
                    siteId:      us.site_id,
                    siteCode:    us.site_code,
                    siteName:    us.site_name,
                    studyId:     us.study_id,
                    studyTitle:  us.study_title,
                    protocolNo:  us.protocol_no,
                }));
            // Legacy siteName: use first assignment or old siteId column
            const legacySite = siteAssignments[0]
                ? `${siteAssignments[0].siteCode} – ${siteAssignments[0].siteName}`
                : (site ? `${site.code} – ${site.name}` : null);
            return {
                ...u,
                siteName:        legacySite,
                siteAssignments,
                studies:         studyAssignments,
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

        // Plan limit: number of users per organization.
        const limit = await checkLimit(effectiveOrgId(req), 'users');
        if (!limit.ok) {
            return res.status(402).json({
                error: `Plan limit reached: ${limit.current}/${limit.limit} users. Upgrade the plan to add more.`,
                limit: limit.limit, current: limit.current,
            });
        }

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

        // Set role, site, and organization. The invitee lands in the admin's
        // own organization (a tenant admin cannot create users elsewhere).
        await db.update(user).set({
            role:   role ?? 'investigator',
            siteId: siteId ? parseInt(siteId) : null,
            organizationId: effectiveOrgId(req),
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

// ── POST /api/users/:id/sites — add a site+study assignment (admin only)
router.post('/:id/sites', requireRole('admin'), async (req, res) => {
    try {
        const targetId = req.params.id;
        const { siteId, studyId, reason } = req.body;
        if (!siteId || !studyId) return res.status(400).json({ error: 'siteId and studyId are required' });
        if (!reason)             return res.status(400).json({ error: 'reason is required' });

        const [targetUser] = await db.select({ id: user.id }).from(user).where(eq(user.id, targetId));
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const [site] = await db.select({ id: sites.id, code: sites.code, name: sites.name, organizationId: sites.organizationId })
            .from(sites).where(eq(sites.id, parseInt(siteId)));
        if (!site || !sameOrg(req, site.organizationId)) return res.status(404).json({ error: 'Site not found' });

        const [study] = await db.select({ id: studies.id, title: studies.title, organizationId: studies.organizationId })
            .from(studies).where(eq(studies.id, parseInt(studyId)));
        if (!study || !sameOrg(req, study.organizationId)) return res.status(404).json({ error: 'Study not found' });

        const [row] = await client`
            INSERT INTO user_sites (user_id, site_id, study_id, assigned_by)
            VALUES (${targetId}, ${parseInt(siteId)}, ${parseInt(studyId)}, ${req.user.id})
            ON CONFLICT (user_id, site_id, study_id) DO NOTHING
            RETURNING *
        `;
        if (!row) return res.status(409).json({ error: 'Assignment already exists' });

        await writeAudit(db, {
            tableName: 'user_sites', recordId: String(row.id), action: 'INSERT',
            newValue: `User assigned to site "${site.code} – ${site.name}" for study "${study.title}"`,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json({
            id: row.id, siteId: site.id, siteCode: site.code, siteName: site.name,
            studyId: study.id, studyTitle: study.title,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/users/:id/sites/:assignmentId — remove a site assignment (admin only)
router.delete('/:id/sites/:assignmentId', requireRole('admin'), async (req, res) => {
    try {
        const targetId     = req.params.id;
        const assignmentId = parseInt(req.params.assignmentId);
        const { reason }   = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required' });

        const [row] = await client`
            SELECT us.*, s.code AS site_code, s.name AS site_name, st.title AS study_title
            FROM user_sites us
            JOIN sites s   ON s.id  = us.site_id
            JOIN studies st ON st.id = us.study_id
            WHERE us.id = ${assignmentId} AND us.user_id = ${targetId}
        `;
        if (!row) return res.status(404).json({ error: 'Assignment not found' });

        await client`DELETE FROM user_sites WHERE id = ${assignmentId}`;

        await writeAudit(db, {
            tableName: 'user_sites', recordId: String(assignmentId), action: 'DELETE',
            oldValue: `User removed from site "${row.site_code} – ${row.site_name}" for study "${row.study_title}"`,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ removed: true });
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
        if (isNaN(parseInt(studyId))) return res.status(400).json({ error: 'Invalid study ID' });

        const [targetUser] = await db.select({ id: user.id }).from(user).where(eq(user.id, targetId));
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const [study] = await db.select({ id: studies.id, title: studies.title, organizationId: studies.organizationId }).from(studies)
            .where(eq(studies.id, parseInt(studyId)));
        if (!study || !sameOrg(req, study.organizationId)) return res.status(404).json({ error: 'Study not found' });

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
        if (isNaN(studyId)) return res.status(400).json({ error: 'Invalid study ID' });

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

        const [existing] = await db.select({ id: user.id, isActive: user.isActive })
            .from(user).where(eq(user.id, targetId));
        if (!existing) return res.status(404).json({ error: 'User not found' });
        if (!existing.isActive) return res.status(409).json({ error: 'User is already deactivated' });

        // Deactivate via is_active flag (not emailVerified — that's for email verification only)
        await db.update(user).set({ isActive: false }).where(eq(user.id, targetId));

        // Invalidate all active sessions immediately
        await db.delete(session).where(eq(session.userId, targetId));

        await writeAudit(db, {
            tableName: 'user', recordId: targetId, action: 'UPDATE',
            fieldName: 'is_active', oldValue: 'true', newValue: 'false',
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ deactivated: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/users/:id — permanently erase a deactivated user (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        const targetId = req.params.id;
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required for user deletion' });
        if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

        const [target] = await db.select({ id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive })
            .from(user).where(eq(user.id, targetId));
        if (!target) return res.status(404).json({ error: 'User not found' });
        if (target.isActive !== false) {
            return res.status(409).json({ error: 'Deactivate the user before deleting' });
        }

        // Audit before deletion so the record is preserved
        await writeAudit(db, {
            tableName: 'user', recordId: targetId, action: 'DELETE',
            oldValue: `${target.name} | ${target.email} | ${target.role}`,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        // Remove in dependency order
        await db.delete(session).where(eq(session.userId, targetId));
        await client.unsafe(`DELETE FROM password_meta WHERE user_id = $1`, [targetId]).catch(() => {});
        await client.unsafe(`DELETE FROM user_sites  WHERE user_id = $1`, [targetId]).catch(() => {});
        await client.unsafe(`DELETE FROM user_totp   WHERE user_id = $1`, [targetId]).catch(() => {});
        await db.delete(studyUsers).where(eq(studyUsers.userId, targetId));
        await db.delete(user).where(eq(user.id, targetId));

        res.json({ deleted: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/users/me/profile — any authenticated user updates their own display name ──
router.patch('/me/profile', async (req, res) => {
    try {
        const { displayName } = req.body;
        if (!displayName || !displayName.trim()) {
            return res.status(400).json({ error: 'displayName is required' });
        }
        const trimmed = displayName.trim();
        if (trimmed.length > 120) return res.status(400).json({ error: 'Display name must be 120 characters or fewer' });

        await client.unsafe(
            `UPDATE "user" SET display_name = $1 WHERE id = $2`,
            [trimmed, req.user.id]
        );

        await writeAudit(db, {
            tableName: 'user', recordId: req.user.id, action: 'UPDATE',
            fieldName: 'display_name', oldValue: null, newValue: trimmed,
            reason: 'User set their display name',
            user: req.user, ipAddress: req.ip,
        });

        res.json({ displayName: trimmed });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/users/:id/display-name — admin resets a user's display name ──
router.delete('/:id/display-name', requireRole('admin'), async (req, res) => {
    try {
        const targetId = req.params.id;
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required' });

        const [target] = await db.select({ id: user.id, name: user.name }).from(user)
            .where(eq(user.id, targetId));
        if (!target) return res.status(404).json({ error: 'User not found' });

        await client.unsafe(
            `UPDATE "user" SET display_name = NULL WHERE id = $1`,
            [targetId]
        );

        await writeAudit(db, {
            tableName: 'user', recordId: targetId, action: 'UPDATE',
            fieldName: 'display_name', oldValue: '(set)', newValue: null,
            reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json({ reset: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
