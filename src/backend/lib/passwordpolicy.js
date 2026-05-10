// ICH GCP E6(R3) Appendix C.4.3 — Password policy for pharmaceutical EDC systems

export const POLICY = {
    minLength:        12,
    expiryDays:       90,
    warningDays:      10,  // warn at 80 days (10 days before expiry)
    historyCount:     10,  // cannot reuse last 10 passwords
    maxFailedAttempts: 5,
    lockoutMinutes:   30,
};

/**
 * Validates a candidate password against the ICH GCP E6(R3) C.4.3 policy.
 * Returns an array of error strings; empty array = password is valid.
 */
export function validatePassword(password, email = '') {
    const errors = [];

    if (!password || password.length < POLICY.minLength) {
        errors.push(`Minimum ${POLICY.minLength} characters required (ICH E6(R3) C.4.3)`);
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Must contain at least one number');
    }
    if (!/[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]/.test(password)) {
        errors.push('Must contain at least one special character (!@#$%^&* etc.)');
    }
    // Must not contain email username
    if (email) {
        const localPart = email.split('@')[0].toLowerCase();
        if (localPart.length >= 4 && password.toLowerCase().includes(localPart)) {
            errors.push('Password cannot contain your email address');
        }
    }
    // Must not be entirely repeated characters
    if (/^(.)\1+$/.test(password)) {
        errors.push('Password cannot be a single repeated character');
    }

    return errors;
}

/**
 * Returns password strength score 0–4 and label.
 */
export function passwordStrength(password) {
    let score = 0;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    const colors = ['#DC2626', '#F59E0B', '#D97706', '#16A34A', '#065F46'];
    return { score: Math.min(score, 4), label: labels[Math.min(score, 4)], color: colors[Math.min(score, 4)] };
}

/**
 * Checks if the password expired based on lastChangedAt.
 * Returns { expired, daysLeft, warningSoon }.
 */
export function checkPasswordExpiry(lastChangedAt) {
    if (!lastChangedAt) return { expired: true, daysLeft: 0, warningSoon: true };
    const msSince = Date.now() - new Date(lastChangedAt).getTime();
    const daysSince = msSince / 86400000;
    const daysLeft = Math.floor(POLICY.expiryDays - daysSince);
    return {
        expired:     daysLeft < 0,
        daysLeft:    Math.max(0, daysLeft),
        warningSoon: daysLeft >= 0 && daysLeft <= POLICY.warningDays,
    };
}
