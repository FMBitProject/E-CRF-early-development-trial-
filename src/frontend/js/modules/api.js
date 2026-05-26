// ============================================================
// E-CRF API Module — calls real backend, no localStorage
// ============================================================

// ── Study context (localStorage) ───────────────────────────
function getStudyId() {
    return localStorage.getItem('ecrf_study_id') || null;
}

// ── HTTP helper ────────────────────────────────────────────
async function apiFetch(path, options = {}) {
    const studyId = getStudyId();
    const studyHeader = studyId ? { 'X-Study-ID': studyId } : {};
    const res = await fetch(path, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...studyHeader, ...(options.headers || {}) },
    });
    if (res.status === 401) {
        const sessionStr = localStorage.getItem('ecrf_session');
        if (sessionStr) {
            try {
                const s = JSON.parse(sessionStr);
                const ageMs = Date.now() - new Date(s.loginAt || 0).getTime();
                if (ageMs > 60000) {
                    localStorage.removeItem('ecrf_session');
                    window.location.href = 'login.html';
                    throw new Error('Session expired. Please log in again.');
                }
            } catch (e) {
                if (e.message === 'Session expired. Please log in again.') throw e;
            }
        }
        const err = await res.json().catch(() => ({ error: 'Unauthorized' }));
        throw new Error(err.error || 'Unauthorized');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}

async function apiDownload(path, filename, mimeType) {
    const studyId = getStudyId();
    const studyHeader = studyId ? { 'X-Study-ID': studyId } : {};
    const res = await fetch(path, {
        credentials: 'include',
        headers: { ...studyHeader },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Export failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(new Blob([await blob.arrayBuffer()], { type: mimeType }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

// ── Session (localStorage only for user info, auth via cookie) ──
function currentUser() {
    const s = localStorage.getItem('ecrf_session');
    return s ? JSON.parse(s) : null;
}

// ── Field-name mappers (backend camelCase → frontend snake_case) ──

function mapStudy(s) {
    return {
        ...s,
        startDate: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : null,
        endDate:   s.endDate   ? new Date(s.endDate).toISOString().split('T')[0]   : null,
    };
}
function mapSubject(s) {
    const enrolledDate = s.enrolledAt
        ? (typeof s.enrolledAt === 'string' ? s.enrolledAt : new Date(s.enrolledAt).toISOString()).split('T')[0]
        : null;
    const siteParts = [s.siteCode, s.siteName].filter(Boolean);
    return {
        id:              s.id,
        subject_code:    s.subjectCode,
        initial:         s.initials ?? '',
        sex:             s.sex ?? '',
        gender_identity: s.genderIdentity ?? '',
        dob:             s.dateOfBirth ?? null,
        enrollment_date: enrolledDate,
        site_id:         s.siteId ?? null,
        site_name:       siteParts.length ? siteParts.join(' — ') : 'Unknown',
        status:          s.status,
        withdrawn_at:    s.withdrawnAt  ?? null,
        withdraw_reason: s.withdrawReason ?? null,
    };
}

function mapVisit(v) {
    // backend enum 'Completed' → frontend 'Complete'
    const status = v.status === 'Completed' ? 'Complete' : (v.status ?? 'Scheduled');
    return {
        id:               v.id,
        subject_id:       v.subjectId,
        visit_order:      v.visitOrder  ?? 99,
        visit_name:       v.visitName,
        visit_type:       v.visitType   ?? 'Scheduled',
        planned_date:     v.plannedDate ?? null,
        actual_date:      v.actualDate  ?? null,
        window_days:      v.windowDays  ?? null,
        study_day:        v.studyDay    ?? null,
        window_compliance: v.windowCompliance ?? null,
        missed_reason:    v.missedReason ?? null,
        notes:            v.notes       ?? null,
        status,
        form_ids:         Array.isArray(v.formIds) ? v.formIds : [],
        created_by_name:  v.createdByName ?? '',
        created_at:       v.createdAt,
        updated_at:       v.updatedAt,
    };
}

function mapEntry(e) {
    // backend 'Saved' → frontend 'Submitted'; 'Draft' stays 'Draft'; 'Locked' stays 'Locked'
    const status = e.status === 'Saved' ? 'Submitted' : e.status;
    return {
        id:         e.id,
        subject_id: e.subjectId,
        visit_id:   e.visitId,
        form_id:    e.formId,
        data:       e.dataJson ?? {},
        status,
        form_name:  e.formName ?? 'Unknown',
        created_at: e.createdAt,
        updated_at: e.updatedAt,
    };
}

function mapForm(f) {
    return {
        id:          f.id,
        form_name:   f.name,
        version:     f.version,
        schema_json: f.schemaJson,
        is_active:   f.isActive,
    };
}

function mapAudit(a) {
    return {
        id:                a.id,
        action:            a.action,
        table_name:        a.tableName,
        record_id:         a.recordId,
        field_name:        a.fieldName,
        old_value:         a.oldValue,
        new_value:         a.newValue,
        reason_for_change: a.reason,
        user_id:           a.userId,
        user_name:         a.userName,
        user_role:         a.userRole,
        ip_address:        a.ipAddress,
        timestamp:         a.createdAt,
    };
}

function mapQuery(q) {
    return {
        id:              q.id,
        subject_id:      q.subjectId,
        subject_code:    q.subjectCode,
        visit_id:        q.visitId,
        visit_name:      q.visitName,
        form_id:         q.formId,
        form_name:       q.formName,
        entry_id:        q.entryId,
        field_key:       q.fieldKey,
        field_label:     q.fieldLabel,
        query_text:      q.queryText,
        status:          q.status,
        raised_by:       q.raisedBy,
        raised_by_name:  q.raisedByName,
        raised_at:       q.raisedAt,
        resolution_text: q.resolutionText,
        resolved_by_name: q.resolvedByName,
        resolved_at:     q.resolvedAt,
        closed_at:       q.closedAt,
    };
}

function mapSite(s) {
    return {
        id:        s.id,
        site_code: s.code,
        site_name: s.name,
        country:   s.country,
        pi_name:   s.piName,
        status:    s.status,
    };
}

// ── API Surface ────────────────────────────────────────────
export const api = {

    // ── Auth ───────────────────────────────────────────────
    getCurrentUser() { return currentUser(); },

    // ── Study context ──────────────────────────────────────
    getCurrentStudy() {
        const id  = localStorage.getItem('ecrf_study_id');
        const raw = localStorage.getItem('ecrf_study_meta');
        return id ? { id: parseInt(id), ...(raw ? JSON.parse(raw) : {}) } : null;
    },

    setCurrentStudy(study) {
        if (!study) {
            localStorage.removeItem('ecrf_study_id');
            localStorage.removeItem('ecrf_study_meta');
        } else {
            localStorage.setItem('ecrf_study_id', String(study.id));
            localStorage.setItem('ecrf_study_meta', JSON.stringify({ title: study.title, protocolNo: study.protocolNo, status: study.status }));
        }
    },

    // ── Study Management ───────────────────────────────────
    async getStudies() {
        const studies = await apiFetch('/api/studies');
        return studies.map(mapStudy);
    },

    async createStudy(payload) {
        const result = await apiFetch('/api/studies', { method: 'POST', body: JSON.stringify(payload) });
        return mapStudy(result);
    },

    async updateStudy(id, payload) {
        return apiFetch(`/api/studies/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },

    async getStudyUsers(studyId) {
        return apiFetch(`/api/studies/${studyId}/users`);
    },

    async assignUserToStudy(studyId, userId) {
        return apiFetch(`/api/studies/${studyId}/users`, { method: 'POST', body: JSON.stringify({ userId }) });
    },

    async removeUserFromStudy(studyId, userId) {
        return apiFetch(`/api/studies/${studyId}/users/${userId}`, { method: 'DELETE' });
    },

    async logout() {
        localStorage.removeItem('ecrf_session');
        localStorage.removeItem('ecrf_study_id');
        localStorage.removeItem('ecrf_study_meta');
        localStorage.removeItem('ecrf_site_context_id');
        localStorage.removeItem('ecrf_site_context_meta');
        // ICH E6(R3) C.4.3 — /api/mfa/logout writes LOGOUT to audit trail before sign-out
        try { await fetch('/api/mfa/logout', { method: 'POST', credentials: 'include' }); } catch {
            try { await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' }); } catch {}
        }
        window.location.href = 'login.html';
    },

    // ── Dashboard ──────────────────────────────────────────
    async getDashboardStats() {
        const stats = await apiFetch('/api/dashboard/stats');
        window._openQueryCount = stats.openQueries ?? 0;
        return {
            activeSubjects: stats.activeSubjects,
            totalSubjects:  stats.totalSubjects,
            pendingForms:   stats.pendingForms,
            openQueries:    stats.openQueries,
            totalVisits:    stats.totalVisits,
            recentAudit:    (stats.recentAudit || []).map(mapAudit),
        };
    },

    // ── Subjects ───────────────────────────────────────────
    async getSubjects(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.search) params.set('search', filters.search);
        const rows = await apiFetch(`/api/subjects?${params}`);
        return rows.map(mapSubject);
    },

    async getSubject(id) {
        const row = await apiFetch(`/api/subjects/${id}`);
        const subject = mapSubject(row);
        subject.visits = (row.visits || []).map(mapVisit);
        return subject;
    },

    async getSubjectStatusOverview() {
        return apiFetch('/api/subjects/status-overview');
    },

    async createSubject(payload) {
        // frontend snake_case → backend camelCase
        const body = {
            subjectCode: payload.subject_code,
            initials:    payload.initial,
            sex:            payload.sex ?? null,
            genderIdentity: payload.gender_identity || null,
            dateOfBirth: payload.dob,
            enrolledAt:  payload.enrollment_date,
            siteId:      payload.site_id ? Number(payload.site_id) : null,
        };
        const created = await apiFetch('/api/subjects', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        return mapSubject(created);
    },

    async updateSubjectStatus(id, status, reason) {
        const updated = await apiFetch(`/api/subjects/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, reason }),
        });
        return mapSubject(updated);
    },

    // ── Visits ─────────────────────────────────────────────
    async getVisits(subjectId) {
        const rows = await apiFetch(`/api/subjects/${subjectId}/visits`);
        return rows.map(mapVisit);
    },

    async createVisit(subjectId, payload) {
        // frontend snake_case → backend camelCase
        // frontend 'Complete' → backend 'Completed'
        const status = payload.status === 'Complete' ? 'Completed' : (payload.status ?? 'Scheduled');
        const body = {
            visitName:    payload.visit_name,
            visitOrder:   payload.visit_order,
            visitType:    payload.visit_type,
            plannedDate:  payload.planned_date,
            actualDate:   payload.actual_date,
            windowDays:   payload.window_days,
            status,
            missedReason: payload.missed_reason,
            notes:        payload.notes,
            formIds:      payload.formIds ?? [],
        };
        const created = await apiFetch(`/api/subjects/${subjectId}/visits`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
        return mapVisit(created);
    },

    async updateVisit(visitId, payload) {
        // Need subjectId — read it from the visit (visit has subject_id after mapVisit)
        // We use a PATCH /api/subjects/:subjectId/visits/:id route
        // subjectId comes from window._currentSubject set by subjects.js
        const subjectId = window._subjectId || window._currentSubject?.id;
        const status = payload.status === 'Complete' ? 'Completed' : payload.status;
        const body = {
            visitName:    payload.visit_name,
            visitOrder:   payload.visit_order,
            visitType:    payload.visit_type,
            plannedDate:  payload.planned_date,
            actualDate:   payload.actual_date,
            windowDays:   payload.window_days,
            status,
            missedReason: payload.missed_reason,
            notes:        payload.notes,
            reason:       payload._reason,
        };
        const updated = await apiFetch(`/api/subjects/${subjectId}/visits/${visitId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
        return mapVisit(updated);
    },

    async deleteVisit(visitId, reason) {
        const subjectId = window._subjectId || window._currentSubject?.id;
        await apiFetch(`/api/subjects/${subjectId}/visits/${visitId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        });
    },

    // ── CRF Forms (templates) ──────────────────────────────
    async getCRFForms() {
        const rows = await apiFetch('/api/forms');
        return rows.map(mapForm);
    },

    async getCRFForm(id) {
        const row = await apiFetch(`/api/forms/${id}`);
        return mapForm(row);
    },

    // ── CRF Data Entries ───────────────────────────────────
    async getDataEntries(subjectId, visitId) {
        const params = new URLSearchParams({ subjectId });
        if (visitId) params.set('visitId', visitId);
        const rows = await apiFetch(`/api/entries?${params}`);
        return rows.map(mapEntry);
    },

    async saveDataEntry({ subject_id, visit_id, form_id, data: formData, reason_for_change, status = 'Draft' }) {
        // frontend 'Submitted' → backend doesn't need status (always saves as 'Saved')
        // frontend 'Draft' → backend 'Draft'
        const backendStatus = status === 'Draft' ? 'Draft' : 'Saved';
        const body = {
            subjectId: Number(subject_id),
            visitId:   Number(visit_id),
            formId:    Number(form_id),
            dataJson:  formData,
            reason:    reason_for_change,
            status:    backendStatus,
        };
        const result = await apiFetch('/api/entries', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        return mapEntry(result.entry ?? result);
    },

    async lockDataEntry(id, reason) {
        const result = await apiFetch(`/api/entries/${id}/lock`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
        });
        return mapEntry(result);
    },

    async unlockDataEntry(id, reason) {
        const result = await apiFetch(`/api/entries/${id}/unlock`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
        });
        return mapEntry(result);
    },

    async signDataEntry(entryId, password, meaning) {
        return apiFetch('/api/signatures', {
            method: 'POST',
            body: JSON.stringify({ entryId, password, meaning }),
        });
    },

    async getSignatures(entryId) {
        return apiFetch(`/api/signatures?entryId=${entryId}`);
    },

    async submitIEAssessment(subjectId, criteriaJson, passed) {
        return apiFetch(`/api/subjects/${subjectId}/ie-assessment`, {
            method: 'POST',
            body: JSON.stringify({ criteriaJson, passed }),
        });
    },

    // ── Audit Trail ────────────────────────────────────────
    async getAuditTrail(filters = {}) {
        const params = new URLSearchParams();
        if (filters.action)     params.set('action', filters.action);
        if (filters.table_name) params.set('tableName', filters.table_name);
        if (filters.record_id)  params.set('search', filters.record_id);
        const rows = await apiFetch(`/api/audit?${params}`);
        return rows.map(mapAudit);
    },

    // ── Queries ────────────────────────────────────────────
    async getQueries(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        const rows = await apiFetch(`/api/queries?${params}`);
        const mapped = rows.map(mapQuery);
        window._openQueryCount = mapped.filter(q => q.status === 'Open').length;
        return mapped;
    },

    async raiseQuery({ data_entry_id, subject_id, visit_id, form_id, field_key, field_label, query_text }) {
        const created = await apiFetch('/api/queries', {
            method: 'POST',
            body: JSON.stringify({
                subjectId:  Number(subject_id),
                visitId:    visit_id  ? Number(visit_id)  : null,
                formId:     form_id   ? Number(form_id)   : null,
                entryId:    data_entry_id ? Number(data_entry_id) : null,
                fieldKey:   field_key,
                fieldLabel: field_label,
                queryText:  query_text,
            }),
        });
        return mapQuery(created);
    },

    async resolveQuery(id, resolution_text) {
        const updated = await apiFetch(`/api/queries/${id}/resolve`, {
            method: 'PATCH',
            body: JSON.stringify({ resolutionText: resolution_text }),
        });
        return mapQuery(updated);
    },

    async closeQuery(id) {
        const updated = await apiFetch(`/api/queries/${id}/close`, {
            method: 'PATCH',
            body: JSON.stringify({}),
        });
        return mapQuery(updated);
    },

    // ── Sites ──────────────────────────────────────────────
    async getSites() {
        const rows = await apiFetch('/api/sites');
        return rows.map(mapSite);
    },

    async createSite(payload) {
        return apiFetch('/api/sites', { method: 'POST', body: JSON.stringify(payload) });
    },

    async updateSite(id, payload) {
        return apiFetch(`/api/sites/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },

    // ── Adverse Events / SAE ───────────────────────────────
    async getAdverseEvents(filters = {}) {
        const params = new URLSearchParams();
        if (filters.subjectId) params.set('subjectId', filters.subjectId);
        if (filters.serious)   params.set('serious', filters.serious);
        if (filters.status)    params.set('status', filters.status);
        return apiFetch(`/api/ae?${params}`);
    },

    async getAEStats() {
        return apiFetch('/api/ae/stats');
    },

    async createAdverseEvent(payload) {
        return apiFetch('/api/ae', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async updateAdverseEvent(id, payload) {
        return apiFetch(`/api/ae/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    async reportAdverseEvent(id, { reportedToSponsor, reportedToIrb }) {
        return apiFetch(`/api/ae/${id}/report`, {
            method: 'PATCH',
            body: JSON.stringify({ reportedToSponsor, reportedToIrb }),
        });
    },

    async closeAdverseEvent(id) {
        return apiFetch(`/api/ae/${id}/close`, { method: 'PATCH', body: JSON.stringify({}) });
    },

    // ── Protocol Deviations ────────────────────────────────
    async getDeviations(filters = {}) {
        const params = new URLSearchParams();
        if (filters.subjectId) params.set('subjectId', filters.subjectId);
        if (filters.status)    params.set('status', filters.status);
        if (filters.type)      params.set('type', filters.type);
        return apiFetch(`/api/deviations?${params}`);
    },

    async getDeviationStats() {
        return apiFetch('/api/deviations/stats');
    },

    async createDeviation(payload) {
        return apiFetch('/api/deviations', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async updateDeviation(id, payload) {
        return apiFetch(`/api/deviations/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    async reportDeviationToIrb(id) {
        return apiFetch(`/api/deviations/${id}/report-irb`, { method: 'PATCH', body: JSON.stringify({}) });
    },

    async advanceDeviationStatus(id, status) {
        return apiFetch(`/api/deviations/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    // ── Informed Consents ──────────────────────────────────
    async getConsents(filters = {}) {
        const params = new URLSearchParams();
        if (filters.subjectId) params.set('subjectId', filters.subjectId);
        return apiFetch(`/api/consents?${params}`);
    },

    async getConsentStats() {
        return apiFetch('/api/consents/stats');
    },

    async createConsent(payload) {
        return apiFetch('/api/consents', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async withdrawConsent(id, reason) {
        return apiFetch(`/api/consents/${id}/withdraw`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
        });
    },

    // ── Randomization ──────────────────────────────────────
    async getRandomizationList() {
        return apiFetch('/api/randomization/list');
    },

    async uploadRandomizationList(entries) {
        return apiFetch('/api/randomization/list', {
            method: 'POST',
            body: JSON.stringify({ entries }),
        });
    },

    async getRandomization(filters = {}) {
        const params = new URLSearchParams();
        if (filters.subjectId) params.set('subjectId', filters.subjectId);
        return apiFetch(`/api/randomization?${params}`);
    },

    async getRandomizationStats() {
        return apiFetch('/api/randomization/stats');
    },

    async randomizeSubject(subjectId, stratum) {
        return apiFetch('/api/randomization', {
            method: 'POST',
            body: JSON.stringify({ subjectId, stratum }),
        });
    },

    async unblindSubject(id, reason) {
        return apiFetch(`/api/randomization/${id}/unblind`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
        });
    },

    // ── Export ─────────────────────────────────────────────
    async downloadODM() {
        await apiDownload('/api/export/odm', 'export-odm.xml', 'application/xml');
    },

    async downloadCSV(domain) {
        await apiDownload(`/api/export/csv?domain=${domain}`, `export-${domain}.csv`, 'text/csv');
    },

    // ── Security / Password ────────────────────────────────
    async getPasswordStatus() {
        return apiFetch('/api/security/password-status');
    },

    async changePassword(currentPassword, newPassword) {
        return apiFetch('/api/security/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },

    async getLockedAccounts() {
        return apiFetch('/api/security/locked-accounts');
    },

    async unlockAccount(userId, reason) {
        return apiFetch(`/api/security/unlock/${userId}`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    },

    async forcePasswordReset(userId) {
        return apiFetch(`/api/security/force-password-reset/${userId}`, { method: 'POST' });
    },

    async getSecurityUsers() {
        return apiFetch('/api/security/users');
    },

    async deleteUser(userId, reason) {
        return apiFetch(`/api/security/users/${userId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        });
    },

    async getLoginActivity(email) {
        const params = new URLSearchParams();
        if (email) params.set('email', email);
        return apiFetch(`/api/security/login-activity?${params}`);
    },

    // ── Database Lock ──────────────────────────────────────
    async getDblockStatus() {
        return apiFetch('/api/dblock/status');
    },

    async runDblockChecks() {
        return apiFetch('/api/dblock/check', { method: 'POST' });
    },

    async initiateDblock(notes) {
        return apiFetch('/api/dblock/initiate', {
            method: 'POST',
            body: JSON.stringify({ notes }),
        });
    },

    async signDblockCRA(id, password) {
        return apiFetch(`/api/dblock/${id}/sign-cra`, {
            method: 'POST',
            body: JSON.stringify({ password }),
        });
    },

    async signDblockAdmin(id, password) {
        return apiFetch(`/api/dblock/${id}/sign-admin`, {
            method: 'POST',
            body: JSON.stringify({ password }),
        });
    },

    // ── Delegation Log ─────────────────────────────────────
    async getDelegations(filters = {}) {
        const params = new URLSearchParams();
        if (filters.userId) params.set('userId', filters.userId);
        if (filters.status) params.set('status', filters.status);
        return apiFetch(`/api/delegation?${params}`);
    },

    async createDelegation(payload) {
        return apiFetch('/api/delegation', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async updateDelegation(id, payload) {
        return apiFetch(`/api/delegation/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    async signDelegation(id) {
        return apiFetch(`/api/delegation/${id}/sign`, { method: 'POST' });
    },

    // ── Training Records ───────────────────────────────────
    async getTrainingRecords(filters = {}) {
        const params = new URLSearchParams();
        if (filters.userId) params.set('userId', filters.userId);
        if (filters.trainingType) params.set('trainingType', filters.trainingType);
        return apiFetch(`/api/delegation/training/records?${params}`);
    },

    async createTrainingRecord(payload) {
        return apiFetch('/api/delegation/training/records', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async getExpiringTrainings(days = 30) {
        return apiFetch(`/api/delegation/training/expiring?days=${days}`);
    },

    // ── SAE Expedited Reports (ICH E2A) ────────────────────
    async getSAEReports(filters = {}) {
        const params = new URLSearchParams();
        if (filters.aeId)   params.set('aeId', filters.aeId);
        if (filters.status) params.set('status', filters.status);
        return apiFetch(`/api/saereports?${params}`);
    },

    async getOverdueSAEReports() {
        return apiFetch('/api/saereports/overdue');
    },

    async createSAEReport(payload) {
        return apiFetch('/api/saereports', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async submitSAEReport(id, payload) {
        return apiFetch(`/api/saereports/${id}/submit`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    async signSAEReport(id, payload) {
        return apiFetch(`/api/saereports/${id}/sign`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    // ── Monitoring Visits & SDV (ICH GCP §5.18) ───────────
    async getMonitoringVisits(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.siteId) params.set('siteId', filters.siteId);
        return apiFetch(`/api/monitoring?${params}`);
    },

    async getMonitoringVisit(id) {
        return apiFetch(`/api/monitoring/${id}`);
    },

    async createMonitoringVisit(payload) {
        return apiFetch('/api/monitoring', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async updateMonitoringVisit(id, payload) {
        return apiFetch(`/api/monitoring/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    async submitMonitoringVisit(id) {
        return apiFetch(`/api/monitoring/${id}/submit`, { method: 'POST' });
    },

    async acknowledgeMonitoringVisit(id, piComments) {
        return apiFetch(`/api/monitoring/${id}/acknowledge`, {
            method: 'POST',
            body: JSON.stringify({ piComments }),
        });
    },

    async getSDVRecords(visitId) {
        return apiFetch(`/api/monitoring/${visitId}/sdv`);
    },

    async upsertSDVRecord(visitId, payload) {
        return apiFetch(`/api/monitoring/${visitId}/sdv`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    // ── CRF Form Builder ────────────────────────────────────
    request(path, options = {}) {
        return apiFetch(path, options);
    },

    // ── Visit Schedule Templates ─────────────────────────────
    async getVisitTemplates() { return apiFetch('/api/visit-templates'); },
    async getVisitTemplate(id) { return apiFetch(`/api/visit-templates/${id}`); },
    async createVisitTemplate(payload) {
        return apiFetch('/api/visit-templates', { method: 'POST', body: JSON.stringify(payload) });
    },
    async updateVisitTemplate(id, payload) {
        return apiFetch(`/api/visit-templates/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    },
    async deleteVisitTemplate(id, reason) {
        return apiFetch(`/api/visit-templates/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
    },
    async generateVisitsFromTemplate(templateId, subjectId, payload) {
        return apiFetch(`/api/visit-templates/${templateId}/generate/${subjectId}`, {
            method: 'POST', body: JSON.stringify(payload),
        });
    },

    // ── User Management ─────────────────────────────────────
    async getUsers() { return apiFetch('/api/users'); },
    async getUser(id) { return apiFetch(`/api/users/${id}`); },
    async inviteUser(payload) {
        return apiFetch('/api/users/invite', { method: 'POST', body: JSON.stringify(payload) });
    },
    async changeUserRole(id, role, reason) {
        return apiFetch(`/api/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role, reason }) });
    },
    async changeUserSite(id, siteId, reason) {
        return apiFetch(`/api/users/${id}/site`, { method: 'PATCH', body: JSON.stringify({ siteId, reason }) });
    },
    async deactivateUser(id, reason) {
        return apiFetch(`/api/users/${id}/deactivate`, { method: 'PATCH', body: JSON.stringify({ reason }) });
    },

    // ── Notifications ────────────────────────────────────────
    async getNotifications() { return apiFetch('/api/notifications'); },

    // ── Screening Log (ICH E6(R3) §8.3.20) ──────────────────
    async getScreeningLog()            { return apiFetch('/api/screening'); },
    async getScreeningStats()          { return apiFetch('/api/screening/stats'); },
    async createScreeningRecord(data)  { return apiFetch('/api/screening', { method: 'POST', body: JSON.stringify(data) }); },
    async updateScreeningRecord(id, d) { return apiFetch(`/api/screening/${id}`, { method: 'PATCH', body: JSON.stringify(d) }); },
    async deleteScreeningRecord(id)    { return apiFetch(`/api/screening/${id}`, { method: 'DELETE' }); },

    // ── IP Accountability (ICH E6(R3) §8.3.19) ───────────────
    async getIPRecords(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/api/ip${qs ? '?' + qs : ''}`);
    },
    async getIPSummary()              { return apiFetch('/api/ip/summary'); },
    async createIPRecord(data)        { return apiFetch('/api/ip', { method: 'POST', body: JSON.stringify(data) }); },
    async updateIPRecord(id, data)    { return apiFetch(`/api/ip/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
    async deleteIPRecord(id)          { return apiFetch(`/api/ip/${id}`, { method: 'DELETE' }); },

    // ── Essential Documents (ICH E6(R3) §8) ─────────────────
    async getEssentialDocs(section)   { return apiFetch(`/api/essential-docs${section ? '?section=' + encodeURIComponent(section) : ''}`); },
    async getEssentialDocTypes()      { return apiFetch('/api/essential-docs/types'); },
    async getEssentialDocCompleteness(){ return apiFetch('/api/essential-docs/completeness'); },
    async createEssentialDoc(data)    { return apiFetch('/api/essential-docs', { method: 'POST', body: JSON.stringify(data) }); },
    async updateEssentialDoc(id, d)   { return apiFetch(`/api/essential-docs/${id}`, { method: 'PATCH', body: JSON.stringify(d) }); },
    async deleteEssentialDoc(id)      { return apiFetch(`/api/essential-docs/${id}`, { method: 'DELETE' }); },

    // ── SOP Agreements (ICH E6(R3) C.4.1) ───────────────────
    async getRequiredAgreements()     { return apiFetch('/api/agreements/required'); },
    async getAgreementText(type)      { return apiFetch(`/api/agreements/text/${type}`); },
    async submitAgreement(type)       { return apiFetch('/api/agreements', { method: 'POST', body: JSON.stringify({ agreementType: type }) }); },

    // ── Monitoring Plan / RBMP (ICH E6(R3) §5.18.3) ─────────
    async getMonitoringPlans()        { return apiFetch('/api/monitoring-plan'); },
    async getCurrentMonitoringPlan()  { return apiFetch('/api/monitoring-plan/current'); },
    async createMonitoringPlan(data)  { return apiFetch('/api/monitoring-plan', { method: 'POST', body: JSON.stringify(data) }); },
    async updateMonitoringPlan(id, d) { return apiFetch(`/api/monitoring-plan/${id}`, { method: 'PATCH', body: JSON.stringify(d) }); },
    async approveMonitoringPlan(id)   { return apiFetch(`/api/monitoring-plan/${id}/approve`, { method: 'POST' }); },

    // ── Reports ──────────────────────────────────────────────
    async getMissingDataReport(groupBy = 'site') { return apiFetch(`/api/reports/missing-data?groupBy=${groupBy}`); },
    async getDataQualityReport()      { return apiFetch('/api/reports/data-quality'); },
    async getAuditIntegrityReport()   { return apiFetch('/api/reports/audit-integrity'); },
    async getVisitComplianceReport()  { return apiFetch('/api/reports/visit-compliance'); },
    async getQueryAgingReport()       { return apiFetch('/api/reports/query-aging'); },
    async getDataTimeliness()         { return apiFetch('/api/reports/data-timeliness'); },
    async getCriticalDataReport()     { return apiFetch('/api/reports/critical-data'); },
    async getDispositionReport()      { return apiFetch('/api/reports/disposition'); },

    // ── SDV Summary & Monitoring Report ─────────────────────
    async getSDVSummary()             { return apiFetch('/api/monitoring/sdv-summary'); },
    async getMonitoringReport(id)     { return apiFetch(`/api/monitoring/${id}/report`); },

    // ── QTL Breach CAPA ──────────────────────────────────────
    async getQTLBreaches()            { return apiFetch('/api/qtl/breaches'); },
    async createQTLBreach(data)       { return apiFetch('/api/qtl/breaches', { method: 'POST', body: JSON.stringify(data) }); },
    async updateQTLBreach(id, data)   { return apiFetch(`/api/qtl/breaches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },

    // ── Periodic User Access Review (ICH E6(R3) C.4.2) ───────
    async getAccessReviews()          { return apiFetch('/api/access-review'); },
    async createAccessReview(data)    { return apiFetch('/api/access-review', { method: 'POST', body: JSON.stringify(data) }); },
    async certifyUserAccess(reviewId, userId, certified, certNotes) {
        return apiFetch(`/api/access-review/${reviewId}/certify`, { method: 'PATCH', body: JSON.stringify({ userId, certified, certNotes }) });
    },
    async completeAccessReview(id)    { return apiFetch(`/api/access-review/${id}/complete`, { method: 'POST' }); },

    // ── Amendment Re-consent Status ──────────────────────────
    async getAmendmentReconsentStatus(id) { return apiFetch(`/api/amendments/${id}/reconsent-status`); },

    // ── Subject-level Data Lock ───────────────────────────────
    async getSubjectLockStatus(subjectId) { return apiFetch(`/api/subjects/${subjectId}/lock-status`); },
    async lockSubject(subjectId, reason, visitId = null) {
        return apiFetch(`/api/subjects/${subjectId}/lock`, {
            method: 'POST',
            body: JSON.stringify({ reason, ...(visitId != null ? { visitId } : {}) }),
        });
    },
    async unlockSubject(subjectId, reason, visitId = null) {
        return apiFetch(`/api/subjects/${subjectId}/unlock`, {
            method: 'POST',
            body: JSON.stringify({ reason, ...(visitId != null ? { visitId } : {}) }),
        });
    },
};

window.api = api;
