import { Router } from 'express';
import { requireRole } from '../middleware/rbac.js';
import { getLicense, clearLicenseCache } from '../lib/license.js';

const router = Router();

// GET /api/license/status — license state for the admin UI banner.
router.get('/status', requireRole('admin', 'platform_owner'), (_req, res) => {
    const lic = getLicense();
    res.json({
        enforcement: process.env.LICENSE_ENFORCEMENT === 'true',
        present: lic.present,
        active: lic.active,
        expired: lic.expired,
        reason: lic.reason,
        customer: lic.customer,
        issuedAt: lic.issuedAt,
        expiresAt: lic.expiresAt,
        limits: lic.limits,
    });
});

// POST /api/license/refresh — re-read the license after installing a new key
// without restarting (admin only). The env var still must be updated + process
// reloaded for LICENSE_KEY changes; this clears the in-memory cache.
router.post('/refresh', requireRole('admin', 'platform_owner'), (_req, res) => {
    clearLicenseCache();
    res.json({ ok: true, license: getLicense() });
});

export default router;
