// ============================================================
// E-CRF API Module — localStorage persistence layer
// All clinical data starts EMPTY. Sites and CRF form templates
// are the only bootstrap data (protocol-defined, not clinical).
// ============================================================

const STORAGE_KEY = 'ecrf_data';
const STORAGE_VER  = 4; // v4: purge all legacy dummy clinical data

// ---- Protocol Bootstrap Data (non-clinical) ----
// Sites and CRF form templates are defined at study setup, not entered per-subject
const BOOTSTRAP_DATA = {
    _version: 4,
    _nextId: { subjects: 1, visits: 1, crf_data_entries: 1, audit_trails: 1, queries: 1 },

    // ── Study Sites ───────────────────────────────────────────
    sites: [
        { id: 1, site_code: 'SITE-01', site_name: 'Clinical Research Site 01', country: 'Indonesia', pi_name: '', status: 'Active' },
        { id: 2, site_code: 'SITE-02', site_name: 'Clinical Research Site 02', country: 'Indonesia', pi_name: '', status: 'Active' },
    ],

    // ── CRF Form Templates (Protocol-defined) ─────────────────
    crf_forms: [
        {
            id: 1, form_name: 'Vital Signs', version: '1.2',
            schema_json: {
                fields: [
                    { key: 'visit_date',        label: 'Visit Date',                    type: 'date',     required: true,  grid: 'col-span-1' },
                    { key: 'visit_time',        label: 'Visit Time',                    type: 'time',     required: true,  grid: 'col-span-1' },
                    { key: 'heart_rate',        label: 'Heart Rate (bpm)',              type: 'number',   required: true,  grid: 'col-span-1',
                      validation: { hard_min: 20, hard_max: 300, soft_min: 40, soft_max: 120, unit: 'bpm' } },
                    { key: 'systolic_bp',       label: 'Systolic BP (mmHg)',            type: 'number',   required: true,  grid: 'col-span-1',
                      validation: { hard_min: 40, hard_max: 300, soft_min: 70, soft_max: 180, unit: 'mmHg' } },
                    { key: 'diastolic_bp',      label: 'Diastolic BP (mmHg)',           type: 'number',   required: true,  grid: 'col-span-1',
                      validation: { hard_min: 20, hard_max: 200, soft_min: 40, soft_max: 110, unit: 'mmHg' } },
                    { key: 'temperature',       label: 'Body Temperature (°C)',         type: 'number',   required: true,  grid: 'col-span-1',
                      validation: { hard_min: 32.0, hard_max: 45.0, soft_min: 35.5, soft_max: 38.5, step: '0.1', unit: '°C' } },
                    { key: 'respiratory_rate',  label: 'Respiratory Rate (/min)',       type: 'number',   required: true,  grid: 'col-span-1',
                      validation: { hard_min: 4, hard_max: 60, soft_min: 8, soft_max: 25, unit: '/min' } },
                    { key: 'oxygen_sat',        label: 'Oxygen Saturation SpO₂ (%)',   type: 'number',   required: true,  grid: 'col-span-1',
                      validation: { hard_min: 50, hard_max: 100, soft_min: 95, unit: '%' } },
                    { key: 'weight',            label: 'Body Weight (kg)',              type: 'number',   required: false, grid: 'col-span-1',
                      validation: { hard_min: 1, hard_max: 300, step: '0.1', unit: 'kg' } },
                    { key: 'height',            label: 'Height (cm)',                   type: 'number',   required: false, grid: 'col-span-1',
                      validation: { hard_min: 30, hard_max: 250, unit: 'cm' } },
                    { key: 'clinical_notes',    label: 'Clinical Notes',                type: 'textarea', required: false, grid: 'col-span-2' },
                ]
            }
        },
        {
            id: 2, form_name: 'Adverse Events', version: '1.0',
            schema_json: {
                fields: [
                    { key: 'ae_term',           label: 'AE Term / Description',                     type: 'text',     required: true,  grid: 'col-span-2' },
                    { key: 'onset_date',        label: 'Date of Onset',                              type: 'date',     required: true,  grid: 'col-span-1' },
                    { key: 'resolution_date',   label: 'Date of Resolution (if resolved)',           type: 'date',     required: false, grid: 'col-span-1' },
                    { key: 'severity',          label: 'Severity Grade (CTCAE v5.0)',                type: 'select',   required: true,  grid: 'col-span-1',
                      options: ['Grade 1 — Mild', 'Grade 2 — Moderate', 'Grade 3 — Severe', 'Grade 4 — Life-Threatening', 'Grade 5 — Fatal'] },
                    { key: 'causality',         label: 'Causality to Investigational Product',       type: 'select',   required: true,  grid: 'col-span-1',
                      options: ['Unrelated', 'Unlikely Related', 'Possibly Related', 'Probably Related', 'Definitely Related'] },
                    { key: 'serious',           label: 'Serious AE (SAE)?',                         type: 'radio',    required: true,  grid: 'col-span-2',
                      options: ['Yes', 'No'] },
                    { key: 'sae_criteria',      label: 'SAE Criteria (if SAE)',                     type: 'select',   required: false, grid: 'col-span-2',
                      options: ['Death', 'Life-Threatening', 'Requires Hospitalization', 'Prolonged Hospitalization', 'Persistent/Significant Disability', 'Congenital Anomaly', 'Other Important Medical Event'] },
                    { key: 'action_taken',      label: 'Action Taken re: Study Treatment',          type: 'select',   required: true,  grid: 'col-span-1',
                      options: ['None', 'Dose Reduced', 'Dose Interrupted Temporarily', 'Treatment Permanently Discontinued', 'Concomitant Medication Added', 'Other'] },
                    { key: 'outcome',           label: 'Outcome at Time of Report',                 type: 'select',   required: true,  grid: 'col-span-1',
                      options: ['Recovered / Resolved', 'Recovering / Resolving', 'Not Recovered / Not Resolved', 'Recovered with Sequelae', 'Fatal', 'Unknown'] },
                    { key: 'narrative',         label: 'Clinical Narrative',                        type: 'textarea', required: false, grid: 'col-span-2' },
                ]
            }
        },
        {
            id: 3, form_name: 'Concomitant Medications', version: '1.1',
            schema_json: {
                fields: [
                    { key: 'drug_name',         label: 'Drug Name (Generic / INN)',     type: 'text',     required: true,  grid: 'col-span-1' },
                    { key: 'brand_name',        label: 'Brand Name',                    type: 'text',     required: false, grid: 'col-span-1' },
                    { key: 'dose_strength',     label: 'Dose & Strength',               type: 'text',     required: true,  grid: 'col-span-1', },
                    { key: 'route',             label: 'Route of Administration',       type: 'select',   required: true,  grid: 'col-span-1',
                      options: ['Oral', 'Intravenous (IV)', 'Intramuscular (IM)', 'Subcutaneous (SC)', 'Topical', 'Inhaled', 'Intraocular', 'Rectal', 'Transdermal', 'Other'] },
                    { key: 'frequency',         label: 'Frequency',                     type: 'select',   required: true,  grid: 'col-span-1',
                      options: ['Once daily (QD)', 'Twice daily (BID)', 'Three times daily (TID)', 'Four times daily (QID)', 'As needed (PRN)', 'Once weekly', 'Biweekly', 'Monthly', 'Single dose', 'Other'] },
                    { key: 'indication',        label: 'Indication / Reason for Use',   type: 'text',     required: true,  grid: 'col-span-1' },
                    { key: 'start_date',        label: 'Start Date',                    type: 'date',     required: true,  grid: 'col-span-1' },
                    { key: 'end_date',          label: 'End Date',                      type: 'date',     required: false, grid: 'col-span-1' },
                    { key: 'ongoing',           label: 'Medication Ongoing at Time of Report?', type: 'radio', required: true, grid: 'col-span-2',
                      options: ['Yes', 'No'] },
                ]
            }
        },
        {
            id: 4, form_name: 'Medical History', version: '1.0',
            schema_json: {
                fields: [
                    { key: 'condition',         label: 'Medical Condition / Diagnosis',  type: 'text',    required: true,  grid: 'col-span-2' },
                    { key: 'onset_date',        label: 'Approximate Onset Date',         type: 'date',    required: false, grid: 'col-span-1' },
                    { key: 'resolution_date',   label: 'Resolution Date (if resolved)',  type: 'date',    required: false, grid: 'col-span-1' },
                    { key: 'status',            label: 'Current Status',                 type: 'select',  required: true,  grid: 'col-span-1',
                      options: ['Ongoing', 'Resolved', 'Resolved with Sequelae'] },
                    { key: 'relevant',          label: 'Clinically Relevant?',           type: 'radio',   required: true,  grid: 'col-span-1',
                      options: ['Yes', 'No'] },
                    { key: 'surgical_procedure',label: 'Previous Surgical Procedures',   type: 'textarea',required: false, grid: 'col-span-2' },
                    { key: 'notes',             label: 'Additional Notes',               type: 'textarea',required: false, grid: 'col-span-2' },
                ]
            }
        },
        {
            id: 5, form_name: 'Eligibility / Inclusion-Exclusion', version: '1.0',
            schema_json: {
                fields: [
                    { key: 'ic_signed',         label: 'Informed Consent signed and dated prior to any study procedure?', type: 'radio', required: true, grid: 'col-span-2', options: ['Yes', 'No'] },
                    { key: 'ic_date',           label: 'Date of Informed Consent',       type: 'date',    required: true,  grid: 'col-span-1' },
                    { key: 'inc_1',             label: 'Meets all Inclusion Criteria?',  type: 'radio',   required: true,  grid: 'col-span-2', options: ['Yes', 'No'] },
                    { key: 'exc_1',             label: 'Meets any Exclusion Criteria?',  type: 'radio',   required: true,  grid: 'col-span-2', options: ['Yes', 'No'] },
                    { key: 'eligible',          label: 'Subject is ELIGIBLE to participate?', type: 'radio', required: true, grid: 'col-span-2', options: ['Yes — Eligible', 'No — Screen Failure'] },
                    { key: 'screen_fail_reason',label: 'Screen Failure Reason (if applicable)', type: 'textarea', required: false, grid: 'col-span-2' },
                    { key: 'investigator_comments', label: 'Investigator Comments',      type: 'textarea',required: false, grid: 'col-span-2' },
                ]
            }
        },
    ],

    // ── Clinical data starts EMPTY ─────────────────────────────
    subjects:         [],
    visits:           [],
    crf_data_entries: [],
    audit_trails:     [],
    queries:          [],
};

// ---- Storage Helpers ----
function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        const init = JSON.parse(JSON.stringify(BOOTSTRAP_DATA));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
        return init;
    }
    const stored = JSON.parse(raw);
    // Migrate: purge all clinical data when version is behind
    if ((stored._version || 0) < STORAGE_VER) {
        const clean = JSON.parse(JSON.stringify(BOOTSTRAP_DATA));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
        // Also clear any stale session with old dummy names
        const OLD_NAMES = ['Dr. Admin User', 'Dr. Anya Sharma', 'Mr. Budi Santoso'];
        const sess = localStorage.getItem('ecrf_session');
        if (sess) {
            try {
                const s = JSON.parse(sess);
                if (OLD_NAMES.includes(s.name)) localStorage.removeItem('ecrf_session');
            } catch { localStorage.removeItem('ecrf_session'); }
        }
        return clean;
    }
    return stored;
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function nextId(data, entity) {
    const id = data._nextId[entity] || 1;
    data._nextId[entity] = id + 1;
    return id;
}

function delay(ms = 250) {
    return new Promise(r => setTimeout(r, ms));
}

function currentUser() {
    const s = localStorage.getItem('ecrf_session');
    return s ? JSON.parse(s) : null;
}

function addAudit(data, { table_name, record_id, action, field_name = null, old_value = null, new_value = null, reason_for_change }) {
    const user = currentUser();
    data.audit_trails.push({
        id: nextId(data, 'audit_trails'),
        table_name, record_id, action, field_name,
        old_value:  old_value  !== null ? String(old_value)  : null,
        new_value:  new_value  !== null ? String(new_value)  : null,
        reason_for_change: reason_for_change || null,
        user_id:    user?.id   || 0,
        user_name:  user?.name || 'System',
        user_role:  user?.role || 'system',
        timestamp:  new Date().toISOString(),
        ip_address: '127.0.0.1',
    });
}

// Study day: Day 1 = enrollment date
function calcStudyDay(enrollmentDate, actualDate) {
    if (!enrollmentDate || !actualDate) return null;
    const d1 = new Date(enrollmentDate);
    const d2 = new Date(actualDate);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return Math.round((d2 - d1) / 86400000) + 1;
}

// Window compliance
function calcWindowCompliance(plannedDate, actualDate, windowDays) {
    if (!plannedDate || !actualDate) return 'N/A';
    const p = new Date(plannedDate); p.setHours(0, 0, 0, 0);
    const a = new Date(actualDate);  a.setHours(0, 0, 0, 0);
    const diff = Math.round((a - p) / 86400000);
    const win  = windowDays ?? 0;
    if (diff === 0)           return 'On Schedule';
    if (Math.abs(diff) <= win) return diff < 0 ? `Early (${Math.abs(diff)}d)` : `Late (+${diff}d)`;
    if (diff < 0)              return `Early (${Math.abs(diff)}d) — Out of Window`;
    return `Late (+${diff}d) — Out of Window`;
}

// ============================================================
// API Surface
// ============================================================
export const api = {

    // ── Auth ───────────────────────────────────────────────────
    getCurrentUser() { return currentUser(); },
    logout() {
        localStorage.removeItem('ecrf_session');
        window.location.href = 'login.html';
    },

    // ── Dashboard ──────────────────────────────────────────────
    async getDashboardStats() {
        await delay(200);
        const data = loadData();
        return {
            activeSubjects: data.subjects.filter(s => s.status === 'Active').length,
            totalSubjects:  data.subjects.length,
            pendingForms:   data.crf_data_entries.filter(e => e.status === 'Draft').length,
            openQueries:    data.queries.filter(q => q.status === 'Open').length,
            totalVisits:    data.visits.length,
            recentAudit:    [...data.audit_trails]
                                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                .slice(0, 8),
        };
    },

    // ── Subjects ───────────────────────────────────────────────
    async getSubjects(filters = {}) {
        await delay(250);
        const data = loadData();
        let rows = [...data.subjects];
        if (filters.status) rows = rows.filter(s => s.status === filters.status);
        if (filters.search) {
            const q = filters.search.toLowerCase();
            rows = rows.filter(s =>
                s.subject_code.toLowerCase().includes(q) ||
                (s.initial || '').toLowerCase().includes(q) ||
                (s.site_name || '').toLowerCase().includes(q)
            );
        }
        return rows;
    },

    async getSubject(id) {
        await delay(200);
        const data = loadData();
        const subject = data.subjects.find(s => s.id === Number(id));
        if (!subject) throw new Error('Subject not found');
        const visits = data.visits
            .filter(v => v.subject_id === Number(id))
            .sort((a, b) => (a.visit_order ?? 999) - (b.visit_order ?? 999));
        return { ...subject, visits };
    },

    async createSubject(payload) {
        await delay(400);
        const data = loadData();
        if (data.subjects.find(s => s.subject_code === payload.subject_code)) {
            throw new Error(`Subject code "${payload.subject_code}" already exists.`);
        }
        const site = data.sites.find(s => s.id === Number(payload.site_id));
        const sub = {
            id:              nextId(data, 'subjects'),
            subject_code:    payload.subject_code,
            initial:         payload.initial,
            dob:             payload.dob,
            gender:          payload.gender,
            enrollment_date: payload.enrollment_date,
            site_id:         Number(payload.site_id),
            site_name:       site ? `${site.site_code} — ${site.site_name}` : 'Unknown',
            status:          'Active',
            created_at:      new Date().toISOString(),
        };
        data.subjects.push(sub);
        addAudit(data, {
            table_name: 'subjects', record_id: sub.id, action: 'INSERT',
            new_value: sub.subject_code, reason_for_change: 'Subject enrolled into study',
        });
        saveData(data);
        return sub;
    },

    async updateSubjectStatus(id, status, reason) {
        await delay(300);
        const data = loadData();
        const sub = data.subjects.find(s => s.id === Number(id));
        if (!sub) throw new Error('Subject not found');
        const old = sub.status;
        sub.status = status;
        if (status === 'Withdrawn') { sub.withdrawn_at = new Date().toISOString(); sub.withdraw_reason = reason; }
        addAudit(data, {
            table_name: 'subjects', record_id: sub.id, action: 'UPDATE',
            field_name: 'status', old_value: old, new_value: status,
            reason_for_change: reason,
        });
        saveData(data);
        return sub;
    },

    // ── Visits ─────────────────────────────────────────────────
    async getVisits(subjectId) {
        await delay(150);
        const data = loadData();
        return data.visits
            .filter(v => v.subject_id === Number(subjectId))
            .sort((a, b) => (a.visit_order ?? 999) - (b.visit_order ?? 999));
    },

    async createVisit(subjectId, payload) {
        await delay(400);
        const data = loadData();
        const sub = data.subjects.find(s => s.id === Number(subjectId));
        if (!sub) throw new Error('Subject not found');

        const study_day          = calcStudyDay(sub.enrollment_date, payload.actual_date);
        const window_compliance  = calcWindowCompliance(payload.planned_date, payload.actual_date, payload.window_days);

        const visit = {
            id:                 nextId(data, 'visits'),
            subject_id:         Number(subjectId),
            visit_order:        payload.visit_order ?? 99,
            visit_name:         payload.visit_name,
            visit_type:         payload.visit_type  || 'Scheduled',
            planned_date:       payload.planned_date || null,
            actual_date:        payload.actual_date  || null,
            window_days:        payload.window_days  ?? null,
            study_day,
            window_compliance,
            status:             payload.status       || 'Scheduled',
            missed_reason:      payload.missed_reason || null,
            notes:              payload.notes        || null,
            created_by_name:    currentUser()?.name  || 'Unknown',
            created_at:         new Date().toISOString(),
            updated_at:         new Date().toISOString(),
        };
        data.visits.push(visit);
        addAudit(data, {
            table_name: 'visits', record_id: visit.id, action: 'INSERT',
            new_value: visit.visit_name, reason_for_change: 'Visit added to subject schedule',
        });
        saveData(data);
        return visit;
    },

    async updateVisit(visitId, payload) {
        await delay(350);
        const data = loadData();
        const visit = data.visits.find(v => v.id === Number(visitId));
        if (!visit) throw new Error('Visit not found');
        const sub = data.subjects.find(s => s.id === visit.subject_id);

        if (payload.actual_date !== undefined) {
            payload.study_day         = calcStudyDay(sub?.enrollment_date, payload.actual_date);
            payload.window_compliance = calcWindowCompliance(
                payload.planned_date ?? visit.planned_date,
                payload.actual_date,
                payload.window_days  ?? visit.window_days
            );
        }

        const oldStatus = visit.status;
        const reason    = payload._reason || 'Visit record updated';
        delete payload._reason;

        Object.assign(visit, payload, { updated_at: new Date().toISOString() });

        addAudit(data, {
            table_name: 'visits', record_id: visit.id, action: 'UPDATE',
            field_name: 'status', old_value: oldStatus, new_value: visit.status,
            reason_for_change: reason,
        });
        saveData(data);
        return visit;
    },

    // ── CRF Forms (templates) ──────────────────────────────────
    async getCRFForms() {
        await delay(100);
        return loadData().crf_forms;
    },

    async getCRFForm(id) {
        await delay(100);
        return loadData().crf_forms.find(f => f.id === Number(id));
    },

    // ── CRF Data Entries ───────────────────────────────────────
    async getDataEntries(subjectId, visitId) {
        await delay(200);
        const data = loadData();
        let entries = data.crf_data_entries.filter(e => e.subject_id === Number(subjectId));
        if (visitId) entries = entries.filter(e => e.visit_id === Number(visitId));
        return entries.map(e => {
            const form = data.crf_forms.find(f => f.id === e.form_id);
            return { ...e, form_name: form?.form_name || 'Unknown' };
        });
    },

    async saveDataEntry({ subject_id, visit_id, form_id, data: formData, reason_for_change, status = 'Draft' }) {
        await delay(500);
        const store = loadData();
        const existing = store.crf_data_entries.find(
            e => e.subject_id === Number(subject_id) &&
                 e.visit_id   === Number(visit_id)   &&
                 e.form_id    === Number(form_id)
        );

        if (existing) {
            if (existing.status === 'Locked') throw new Error('This record is locked and cannot be modified.');
            if (!reason_for_change?.trim()) throw new Error('Reason for change is required when editing existing data (FDA 21 CFR Part 11).');
            for (const key of Object.keys(formData)) {
                const ov = existing.data[key];
                const nv = formData[key];
                if (String(ov ?? '') !== String(nv ?? '')) {
                    addAudit(store, {
                        table_name: 'crf_data_entries', record_id: existing.id,
                        action: 'UPDATE', field_name: key, old_value: ov, new_value: nv,
                        reason_for_change,
                    });
                }
            }
            existing.data       = { ...existing.data, ...formData };
            existing.status     = status;
            existing.updated_at = new Date().toISOString();
            saveData(store);
            return existing;
        }

        const entry = {
            id:              nextId(store, 'crf_data_entries'),
            subject_id:      Number(subject_id),
            visit_id:        Number(visit_id),
            form_id:         Number(form_id),
            data:            formData,
            status,
            created_by_name: currentUser()?.name || 'Unknown',
            created_at:      new Date().toISOString(),
            updated_at:      new Date().toISOString(),
        };
        store.crf_data_entries.push(entry);
        addAudit(store, {
            table_name: 'crf_data_entries', record_id: entry.id, action: 'INSERT',
            new_value: `form_id=${form_id}`, reason_for_change: reason_for_change || 'Initial data entry',
        });
        saveData(store);
        return entry;
    },

    async lockDataEntry(id, reason) {
        await delay(300);
        const data = loadData();
        const entry = data.crf_data_entries.find(e => e.id === Number(id));
        if (!entry) throw new Error('Entry not found');
        if (entry.status === 'Locked') throw new Error('Already locked');
        const old = entry.status;
        entry.status     = 'Locked';
        entry.updated_at = new Date().toISOString();
        addAudit(data, { table_name: 'crf_data_entries', record_id: entry.id, action: 'LOCK',
            field_name: 'status', old_value: old, new_value: 'Locked', reason_for_change: reason });
        saveData(data);
        return entry;
    },

    async unlockDataEntry(id, reason) {
        await delay(300);
        const data  = loadData();
        const entry = data.crf_data_entries.find(e => e.id === Number(id));
        if (!entry) throw new Error('Entry not found');
        if (entry.status !== 'Locked') throw new Error('Entry is not locked');
        entry.status     = 'Submitted';
        entry.updated_at = new Date().toISOString();
        addAudit(data, { table_name: 'crf_data_entries', record_id: entry.id, action: 'UNLOCK',
            field_name: 'status', old_value: 'Locked', new_value: 'Submitted', reason_for_change: reason });
        saveData(data);
        return entry;
    },

    // ── Audit Trail ────────────────────────────────────────────
    async getAuditTrail(filters = {}) {
        await delay(250);
        const data = loadData();
        let rows = [...data.audit_trails].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (filters.action)     rows = rows.filter(t => t.action     === filters.action);
        if (filters.table_name) rows = rows.filter(t => t.table_name === filters.table_name);
        if (filters.record_id)  rows = rows.filter(t => t.record_id  === Number(filters.record_id));
        return rows;
    },

    // ── Queries ────────────────────────────────────────────────
    async getQueries(filters = {}) {
        await delay(200);
        const data = loadData();
        let rows = [...data.queries].sort((a, b) => new Date(b.raised_at) - new Date(a.raised_at));
        if (filters.status) rows = rows.filter(q => q.status === filters.status);
        return rows;
    },

    async raiseQuery({ data_entry_id, field_key, field_label, query_text, subject_code, visit_name, form_name }) {
        await delay(400);
        const data = loadData();
        const user = currentUser();
        const q = {
            id: nextId(data, 'queries'),
            data_entry_id: Number(data_entry_id), subject_code, visit_name, form_name,
            field_key, field_label, query_text,
            status:          'Open',
            raised_by:       user?.id   || 0,
            raised_by_name:  user?.name || 'Unknown',
            raised_at:       new Date().toISOString(),
            resolved_by: null, resolved_by_name: null, resolved_at: null, resolution_text: null,
        };
        data.queries.push(q);
        saveData(data);
        return q;
    },

    async resolveQuery(id, resolution_text) {
        await delay(400);
        const data  = loadData();
        const user  = currentUser();
        const query = data.queries.find(q => q.id === Number(id));
        if (!query) throw new Error('Query not found');
        if (query.status !== 'Open') throw new Error('Only Open queries can be resolved');
        Object.assign(query, {
            status:           'Resolved',
            resolved_by:      user?.id   || 0,
            resolved_by_name: user?.name || 'Unknown',
            resolved_at:      new Date().toISOString(),
            resolution_text,
        });
        saveData(data);
        return query;
    },

    async closeQuery(id) {
        await delay(300);
        const data  = loadData();
        const query = data.queries.find(q => q.id === Number(id));
        if (!query) throw new Error('Query not found');
        if (query.status !== 'Resolved') throw new Error('Only Resolved queries can be closed');
        query.status    = 'Closed';
        query.closed_at = new Date().toISOString();
        saveData(data);
        return query;
    },

    // ── Sites ──────────────────────────────────────────────────
    async getSites() {
        await delay(100);
        return loadData().sites;
    },

    // ── Utility: clear clinical data (keep forms & sites) ──────
    clearClinicalData() {
        const data = loadData();
        data.subjects         = [];
        data.visits           = [];
        data.crf_data_entries = [];
        data.audit_trails     = [];
        data.queries          = [];
        data._nextId          = { subjects: 1, visits: 1, crf_data_entries: 1, audit_trails: 1, queries: 1 };
        saveData(data);
    },
};

window.api = api;
