// ============================================================
// Pure decision rules behind the informed-consent controls.
// Kept free of DB access so they can be unit-tested directly;
// lib/consentcheck.js supplies the rows and performs the writes.
// ============================================================

export const CONSENT_TASK = 'Informed Consent Process';

const day = (v) => (v == null ? null : String(v).slice(0, 10));

// ICH GCP E6(R3) §4.1.5 — consent may only be taken by someone delegated for it,
// and only within their delegation period.
export function isDelegatedForConsent(rows, userId, consentDate) {
    const d = day(consentDate);
    return (rows ?? []).some(r =>
        r.userId === userId &&
        r.status === 'Active' &&
        (Array.isArray(r.tasks) ? r.tasks : []).includes(CONSENT_TASK) &&
        (!r.start || day(r.start) <= d) &&
        (!r.end   || day(r.end)   >= d)
    );
}

// Staff eligible to appear in the "Obtained By" picker as of `today`.
// A not-yet-started delegation is still listed — the date check happens on save,
// against the consent date rather than today.
export function eligibleConsentTakers(rows, today) {
    const t = day(today);
    return (rows ?? []).filter(r =>
        r.status === 'Active' &&
        (Array.isArray(r.tasks) ? r.tasks : []).includes(CONSENT_TASK) &&
        (!r.end || day(r.end) >= t)
    );
}

// Earliest documented study procedure, from visit rows and screening-log rows.
// Returns { date, label } or null when nothing is on record yet.
export function earliestProcedure(visitRows, screenRows) {
    const candidates = [];
    for (const v of visitRows ?? []) {
        const d = v.actualDate || v.visitDate;
        if (d) candidates.push({ date: day(d), label: `visit "${v.visitName}"` });
    }
    for (const s of screenRows ?? []) {
        if (s.screeningDate) candidates.push({ date: day(s.screeningDate), label: 'screening' });
    }
    if (!candidates.length) return null;

    candidates.sort((a, b) => a.date.localeCompare(b.date));
    return candidates[0];
}

// ICH GCP E6(R3) §4.8.8 — consent must precede any study procedure.
//
// Same-day is deliberately NOT a violation: without procedure timestamps the
// date alone cannot prove the sequence was breached, and a false deviation on
// every same-day screening is worse than a missed one. consent_time is stored so
// a monitor can adjudicate those cases against the source.
export function isConsentLate(consentDate, procedureDate) {
    const c = day(consentDate);
    const p = day(procedureDate);
    if (!c || !p) return false;
    return c > p;
}
