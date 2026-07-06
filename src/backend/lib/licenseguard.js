// License enforcement for on-premise deployments.
//
// Enforcement is OPT-IN via LICENSE_ENFORCEMENT=true (the on-prem docker-compose
// sets it; the hosted/dev deployment leaves it unset, so behaviour is unchanged
// and existing tests keep passing).
//
// When enforcement is on AND the license is not active (missing / invalid /
// expired), the guard blocks the creation of NEW clinical data at the growth
// chokepoints — enrolling subjects, and creating studies/sites. It deliberately
// does NOT touch reads, exports, edits to existing records, or safety reporting
// (adverse events / SAE), so patient data is never locked and safety events can
// always be recorded even if a license lapses mid-trial.
import { getLicense } from './license.js';

function enforcementOn() {
    return process.env.LICENSE_ENFORCEMENT === 'true';
}

// Express middleware — place FIRST on a create route: router.post('/', licenseGuardCreate, ...)
export function licenseGuardCreate(req, res, next) {
    if (!enforcementOn()) return next();

    const lic = getLicense();
    if (lic.active) return next();

    const expired = lic.reason === 'expired';
    return res.status(403).json({
        error: 'license_required',
        reason: lic.reason,
        message: expired
            ? 'Lisensi telah kedaluwarsa. Pembuatan data baru (enrollment/studi/site) dinonaktifkan hingga lisensi diperbarui. Data yang ada tetap dapat dibaca dan diekspor. Hubungi penyedia lisensi Anda.'
            : 'Lisensi belum dipasang atau tidak valid. Pembuatan data baru dinonaktifkan. Pasang LICENSE_KEY yang sah dari penyedia lisensi Anda.',
    });
}
