// Once creation succeeds, never report a later failure as failed creation.
// Follow-up writes are not retried: a lost response may hide a committed write.
export async function saveEnrollment(api, payload, { criteria, passed, consent }) {
    const subject = await api.createSubject(payload);
    const unconfirmed = [];
    if (criteria?.length) {
        try { await api.submitIEAssessment(subject.id, criteria, passed); }
        catch { unconfirmed.push('inclusion/exclusion assessment'); }
    }
    if (consent) {
        try { await api.createConsent({ subjectId: subject.id, consentType: 'Initial', ...consent }); }
        catch { unconfirmed.push('consent record'); }
    }
    return { subject, unconfirmed };
}
