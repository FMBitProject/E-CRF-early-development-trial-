// ============================================================
// Subjects View — List, Detail, GCP-compliant Study Visits
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

const STATUS_BADGE = {
    Active:          'badge badge-active',
    Locked:          'badge badge-locked',
    Withdrawn:       'badge badge-withdrawn',
    Completed:       'badge badge-completed',
    'Screen Failed': 'badge badge-withdrawn',
};

const VISIT_STATUS_BADGE = {
    Scheduled:    'badge bg-slate-100 text-slate-600',
    'In Progress':'badge badge-saved',
    Complete:     'badge badge-completed',
    Missed:       'badge badge-withdrawn',
};

// GCP Protocol Visit Templates — ICH E6 (R2)
const VISIT_TEMPLATES = [
    { code: 'V01', name: 'Screening',             order: 1,  study_day: -7,  window_days: 7,  type: 'Scheduled' },
    { code: 'V02', name: 'Baseline / Day 1',       order: 2,  study_day: 1,   window_days: 0,  type: 'Scheduled' },
    { code: 'V03', name: 'Week 2 (Day 14)',        order: 3,  study_day: 14,  window_days: 3,  type: 'Scheduled' },
    { code: 'V04', name: 'Week 4 (Day 28)',        order: 4,  study_day: 28,  window_days: 3,  type: 'Scheduled' },
    { code: 'V05', name: 'Week 8 (Day 56)',        order: 5,  study_day: 56,  window_days: 5,  type: 'Scheduled' },
    { code: 'V06', name: 'Week 12 (Day 84)',       order: 6,  study_day: 84,  window_days: 7,  type: 'Scheduled' },
    { code: 'V07', name: 'Month 6 (Day 180)',      order: 7,  study_day: 180, window_days: 7,  type: 'Scheduled' },
    { code: 'V08', name: 'Month 9 (Day 270)',      order: 8,  study_day: 270, window_days: 7,  type: 'Scheduled' },
    { code: 'V09', name: 'End of Study (Day 365)', order: 9,  study_day: 365, window_days: 7,  type: 'Scheduled' },
    { code: 'V10', name: 'Follow-up (Day 393)',    order: 10, study_day: 393, window_days: 14, type: 'Scheduled' },
    { code: 'UNS', name: 'Unscheduled Visit',      order: 99, study_day: null, window_days: null, type: 'Unscheduled' },
    { code: 'CUS', name: null,                     order: 98, study_day: null, window_days: null, type: 'Scheduled' },
];

function statusBadge(status, map = STATUS_BADGE) {
    const cls = map[status] || 'badge bg-slate-100 text-slate-600';
    return `<span class="${cls}">${esc(status || '—')}</span>`;
}

function complianceBadge(compliance) {
    if (!compliance || compliance === 'N/A') {
        return `<span class="badge bg-slate-100 text-slate-400">—</span>`;
    }
    if (compliance === 'On Schedule') {
        return `<span class="badge" style="background:#D1FAE5;color:#065F46;border:1px solid #A7F3D0">On Schedule</span>`;
    }
    if (compliance.includes('Out of Window')) {
        return `<span class="badge" style="background:#FEE2E2;color:#991B1B;border:1px solid #FECACA">${esc(compliance)}</span>`;
    }
    return `<span class="badge" style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A">${esc(compliance)}</span>`;
}

function fmt(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function plannedFromStudyDay(enrollmentDate, studyDay) {
    if (!enrollmentDate || studyDay == null) return '';
    const d = new Date(enrollmentDate);
    d.setDate(d.getDate() + (studyDay - 1));
    return d.toISOString().split('T')[0];
}

function esc(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

// ============================================================
// Subject List
// ============================================================
export async function renderSubjects({ showNewForm = false } = {}) {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const user     = api.getCurrentUser();
    const subjects = await api.getSubjects();

    content.innerHTML = `
    <div class="p-5 space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Study Subjects</h2>
                <p class="text-xs text-slate-500 mt-0.5">${subjects.length} subject${subjects.length !== 1 ? 's' : ''} enrolled across all sites</p>
            </div>
            ${(user.role === 'investigator' || user.role === 'admin') ? `
            <button onclick="openNewSubjectModal()"
                class="flex items-center gap-2 btn-primary px-4 py-2 text-sm rounded-md">
                <i data-lucide="user-plus" class="w-4 h-4"></i> Enroll Subject
            </button>` : ''}
        </div>

        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="subject-search" placeholder="Search subject code, initials, site…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <select id="status-filter"
                    class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Withdrawn">Withdrawn</option>
                    <option value="Screen Failed">Screen Failed</option>
                </select>
            </div>
        </div>

        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">Subject Code</th>
                            <th class="text-left">Site</th>
                            <th class="text-left">Demographics</th>
                            <th class="text-left">Enrolled (Day 1)</th>
                            <th class="text-left">Status</th>
                            <th class="text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody id="subject-table-body" class="ph-table-body">
                        ${renderSubjectRows(subjects)}
                    </tbody>
                </table>
            </div>
            <div id="no-results" class="${subjects.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="users" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p class="font-medium text-slate-500">No subjects enrolled yet.</p>
                <p class="mt-1 text-xs">Use "Enroll Subject" to add the first study participant.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    async function applyFilters() {
        const search = document.getElementById('subject-search').value;
        const status = document.getElementById('status-filter').value;
        const filtered = await api.getSubjects({ search, status });
        document.getElementById('subject-table-body').innerHTML = renderSubjectRows(filtered);
        document.getElementById('no-results').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('subject-search').addEventListener('input', applyFilters);
    document.getElementById('status-filter').addEventListener('change', applyFilters);

    if (showNewForm) openNewSubjectModal();
}

function renderSubjectRows(subjects) {
    if (subjects.length === 0) return '';
    return subjects.map(s => `
    <tr class="cursor-pointer" onclick="navigate('subjects/${s.id}')">
        <td>
            <p class="text-sm font-semibold text-slate-900 font-mono">${esc(s.subject_code)}</p>
            <p class="text-xs text-slate-400">Initials: ${esc(s.initial)}</p>
        </td>
        <td class="text-sm text-slate-600">${esc(s.site_name)}</td>
        <td class="text-sm text-slate-600">
            ${s.gender === 'M' ? 'Male' : 'Female'}
            <span class="text-slate-400 ml-1 text-xs">· ${fmt(s.dob)}</span>
        </td>
        <td class="text-sm text-slate-600">${fmt(s.enrollment_date)}</td>
        <td>${statusBadge(s.status)}</td>
        <td class="text-right">
            <a href="#subjects/${s.id}" onclick="event.stopPropagation()"
                class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline transition">
                View <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </a>
        </td>
    </tr>`).join('');
}

// ============================================================
// New Subject Modal
// ============================================================
window.openNewSubjectModal = async function () {
    const user = api.getCurrentUser();
    if (!['admin', 'investigator'].includes(user.role)) {
        showToast('Only Investigators and Admins can enroll subjects.', 'error');
        return;
    }
    const sites = await api.getSites();
    showModal({
        title: 'Enroll New Subject',
        size: 'md',
        body: `
        <form id="new-subject-form" class="space-y-4" novalidate>
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Subject Code <span class="text-red-500">*</span></label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono">S-</span>
                        <input type="text" id="ns-code" placeholder="001" maxlength="20"
                            class="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none font-mono">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Patient Initials <span class="text-red-500">*</span></label>
                    <input type="text" id="ns-initial" placeholder="e.g. J.D." maxlength="10"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Sex <span class="text-red-500">*</span></label>
                    <select id="ns-gender"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Date of Birth <span class="text-red-500">*</span></label>
                    <input type="date" id="ns-dob" max="${new Date().toISOString().split('T')[0]}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Enrollment Date (Day 1) <span class="text-red-500">*</span></label>
                    <input type="date" id="ns-enroll" value="${new Date().toISOString().split('T')[0]}"
                        max="${new Date().toISOString().split('T')[0]}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Study Site <span class="text-red-500">*</span></label>
                    <select id="ns-site"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select Site —</option>
                        ${sites.map(s => `<option value="${s.id}">${esc(s.site_code)} – ${esc(s.site_name)}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="ns-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"></div>
        </form>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitNewSubject()" class="px-4 py-2 text-sm btn-primary rounded-md">Enroll Subject</button>`,
    });
};

window.submitNewSubject = async function () {
    const codeRaw = document.getElementById('ns-code').value.trim();
    const initial = document.getElementById('ns-initial').value.trim();
    const gender  = document.getElementById('ns-gender').value;
    const dob     = document.getElementById('ns-dob').value;
    const enroll  = document.getElementById('ns-enroll').value;
    const site_id = document.getElementById('ns-site').value;
    const errEl   = document.getElementById('ns-error');

    errEl.classList.add('hidden');
    if (!codeRaw || !initial || !gender || !dob || !enroll || !site_id) {
        errEl.textContent = 'All fields marked * are required.';
        errEl.classList.remove('hidden');
        return;
    }
    const subject_code = codeRaw.startsWith('S-') ? codeRaw : `S-${codeRaw}`;
    try {
        await api.createSubject({ subject_code, initial, gender, dob, enrollment_date: enroll, site_id });
        closeModal();
        showToast(`Subject ${subject_code} enrolled successfully.`, 'success');
        await renderSubjects();
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    }
};

// ============================================================
// Subject Detail
// ============================================================
export async function renderSubjectDetail(id) {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const [subject, forms] = await Promise.all([
        api.getSubject(id),
        api.getCRFForms(),
    ]);
    const allEntries    = await api.getDataEntries(id);
    const user          = api.getCurrentUser();
    const canManageVisit = user.role === 'investigator' || user.role === 'admin';
    const today         = new Date().toISOString().split('T')[0];

    content.innerHTML = `
    <div class="p-5 space-y-4">

        <!-- Subject Header -->
        <div class="ph-card p-5">
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style="background:#EBF2FD">
                    <i data-lucide="user" class="w-6 h-6" style="color:#1554A0"></i>
                </div>
                <div class="flex-1">
                    <div class="flex items-center gap-3 flex-wrap mb-1">
                        <h2 class="text-xl font-bold text-slate-900 font-mono">${esc(subject.subject_code)}</h2>
                        ${statusBadge(subject.status)}
                    </div>
                    <div class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        <span>Initials: <strong class="text-slate-700">${esc(subject.initial)}</strong></span>
                        <span>${subject.gender === 'M' ? 'Male' : 'Female'}</span>
                        <span>DOB: <strong class="text-slate-700">${fmt(subject.dob)}</strong></span>
                        <span>Site: <strong class="text-slate-700">${esc(subject.site_name)}</strong></span>
                        <span>Enrollment (Day 1): <strong class="text-slate-700">${fmt(subject.enrollment_date)}</strong></span>
                    </div>
                </div>
                ${(user.role === 'admin' || user.role === 'cra') && subject.status === 'Active' ? `
                <button onclick="openWithdrawModal(${subject.id})"
                    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-md transition">
                    <i data-lucide="user-x" class="w-3.5 h-3.5"></i> Withdraw
                </button>` : ''}
            </div>
        </div>

        <!-- Protocol Visit Schedule -->
        <div class="ph-card overflow-hidden">
            <div class="ph-card-header" style="display:flex;align-items:center;justify-content:space-between">
                <h3 style="display:flex;align-items:center;gap:8px;margin:0">
                    <i data-lucide="calendar-check" class="w-4 h-4 text-slate-400"></i>
                    Protocol Visit Schedule
                    <span class="text-xs font-normal text-slate-400">(${subject.visits.length} visit${subject.visits.length !== 1 ? 's' : ''})</span>
                </h3>
                ${canManageVisit ? `
                <button onclick="openAddVisitModal()"
                    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-primary rounded-md">
                    <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Visit
                </button>` : ''}
            </div>

            ${subject.visits.length === 0 ? `
            <div class="py-16 text-center text-slate-400 text-sm">
                <i data-lucide="calendar-off" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p class="font-medium text-slate-500">No visits scheduled.</p>
                ${canManageVisit ? '<p class="mt-1 text-xs">Use "Add Visit" to schedule the first protocol visit for this subject.</p>' : ''}
            </div>` : `
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-center" style="width:36px">#</th>
                            <th class="text-left">Visit Name / Type</th>
                            <th class="text-left">Planned Date</th>
                            <th class="text-left">Actual Date</th>
                            <th class="text-center">Study Day</th>
                            <th class="text-left">Window Compliance</th>
                            <th class="text-left">Status</th>
                            <th class="text-center">CRFs</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="visit-tbody" class="ph-table-body">
                        ${subject.visits.map(v => renderVisitRow(v, forms, allEntries, canManageVisit)).join('')}
                    </tbody>
                </table>
            </div>`}
        </div>

        <!-- CRF Forms Panel (hidden until visit selected) -->
        <div id="crf-panel" class="hidden ph-card overflow-hidden">
            <div class="ph-card-header" style="display:flex;align-items:center;justify-content:space-between">
                <h3 style="display:flex;align-items:center;gap:8px;margin:0">
                    <i data-lucide="file-text" class="w-4 h-4 text-slate-400"></i>
                    <span id="crf-panel-title">CRF Forms</span>
                </h3>
                <button onclick="closeCRFPanel()"
                    class="p-1 text-slate-400 hover:text-slate-600 rounded transition">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div id="crf-panel-body"></div>
        </div>

        <!-- Recent Activity -->
        <div class="ph-card overflow-hidden">
            <div class="ph-card-header">
                <h3><i data-lucide="shield-check" class="w-4 h-4 text-slate-400"></i> Recent Activity</h3>
                <a href="#audit" class="text-xs text-blue-600 hover:underline">Full Audit Trail →</a>
            </div>
            <div id="subject-audit" class="p-4 text-sm text-slate-400">Loading…</div>
        </div>
    </div>`;

    lucide.createIcons();

    // Audit trail (async, non-blocking)
    api.getAuditTrail().then(trails => {
        const auditEl = document.getElementById('subject-audit');
        if (!auditEl) return;
        const recent = trails.slice(0, 5);
        auditEl.innerHTML = recent.length === 0
            ? '<p class="text-center py-4 text-slate-400 text-sm">No activity recorded.</p>'
            : `<div class="overflow-x-auto"><table class="min-w-full"><tbody class="ph-table-body">
                ${recent.map(t => `
                <tr>
                    <td class="py-2 pr-3"><span class="badge ${auditBadge(t.action)}">${esc(t.action)}</span></td>
                    <td class="py-2 pr-3 text-xs text-slate-600">${esc(t.reason_for_change || '—')}</td>
                    <td class="py-2 text-xs text-slate-400 whitespace-nowrap">${esc(t.user_name)} · ${new Date(t.timestamp).toLocaleString('en-GB')}</td>
                </tr>`).join('')}
               </tbody></table></div>`;
        lucide.createIcons();
    });

    // Module-level state for modals
    window._currentSubject = subject;
    window._availableForms = forms;
    window._allEntries     = allEntries;
    window._subjectId      = Number(id);

    // ── Select Visit → Show CRF Panel ─────────────────────────
    window.selectVisit = function (visitId, visitName) {
        document.querySelectorAll('.visit-row').forEach(r => {
            r.classList.toggle('bg-blue-50', r.dataset.visitId === String(visitId));
        });

        const panelEl = document.getElementById('crf-panel');
        const titleEl = document.getElementById('crf-panel-title');
        const bodyEl  = document.getElementById('crf-panel-body');
        const entries = (window._allEntries || []).filter(e => e.visit_id === Number(visitId));
        const fms     = window._availableForms || [];
        const u       = api.getCurrentUser();

        titleEl.textContent = `${visitName} — Case Report Forms`;
        panelEl.classList.remove('hidden');

        const ENTRY_BADGE = {
            Locked:        'badge badge-locked',
            Submitted:     'badge badge-saved',
            Draft:         'badge badge-draft',
            'Not Started': 'badge bg-slate-100 text-slate-500',
        };

        bodyEl.innerHTML = `<div class="overflow-x-auto">
        <table class="min-w-full">
            <thead class="ph-table-head"><tr>
                <th class="text-left">CRF Form</th>
                <th class="text-left">Version</th>
                <th class="text-left">Status</th>
                <th class="text-left">Last Modified</th>
                <th class="text-right">Actions</th>
            </tr></thead>
            <tbody class="ph-table-body">
            ${fms.map(form => {
                const entry       = entries.find(e => e.form_id === form.id);
                const entryStatus = entry?.status || 'Not Started';
                const canEdit     = entryStatus !== 'Locked' && (u.role === 'investigator' || u.role === 'admin');
                const canLock     = entryStatus === 'Submitted' && (u.role === 'cra' || u.role === 'admin');
                return `<tr>
                    <td>
                        <div class="flex items-center gap-2.5">
                            <div class="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style="background:#EBF2FD">
                                <i data-lucide="file-text" class="w-3.5 h-3.5" style="color:#1554A0"></i>
                            </div>
                            <span class="text-sm font-medium text-slate-800">${esc(form.form_name)}</span>
                        </div>
                    </td>
                    <td class="text-xs text-slate-400 font-mono">v${esc(form.version)}</td>
                    <td><span class="${ENTRY_BADGE[entryStatus] || 'badge bg-slate-100 text-slate-500'}">${esc(entryStatus)}</span></td>
                    <td class="text-xs text-slate-400">${entry?.updated_at ? fmt(entry.updated_at) : '—'}</td>
                    <td class="text-right">
                        <div class="flex items-center justify-end gap-2">
                        ${canEdit ? `
                        <a href="#subjects/${window._subjectId}/visits/${visitId}/forms/${form.id}"
                            class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold btn-primary rounded-md">
                            <i data-lucide="${entry ? 'edit-2' : 'plus'}" class="w-3.5 h-3.5"></i>
                            ${entry ? 'Edit' : 'Enter Data'}
                        </a>` : ''}
                        ${canLock && entry ? `
                        <button onclick="openLockModal(${entry.id}, ${window._subjectId})"
                            class="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition">
                            <i data-lucide="lock" class="w-3.5 h-3.5"></i> Lock
                        </button>` : ''}
                        ${entryStatus === 'Locked' ? `
                        <span class="inline-flex items-center gap-1 text-xs text-slate-400">
                            <i data-lucide="lock" class="w-3 h-3"></i> Locked
                        </span>` : ''}
                        ${entryStatus === 'Not Started' && !canEdit ? `
                        <span class="text-xs text-slate-400">No data entered</span>` : ''}
                        </div>
                    </td>
                </tr>`;
            }).join('')}
            </tbody>
        </table></div>`;
        lucide.createIcons();
        panelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    window.closeCRFPanel = function () {
        document.getElementById('crf-panel')?.classList.add('hidden');
        document.querySelectorAll('.visit-row').forEach(r => r.classList.remove('bg-blue-50'));
    };
}

function renderVisitRow(v, forms, allEntries, canManageVisit) {
    const visitEntries   = allEntries.filter(e => e.visit_id === v.id);
    const completedCount = visitEntries.filter(e => e.status === 'Submitted' || e.status === 'Locked').length;
    const total          = forms.length;
    const crfColor       = completedCount === 0
        ? 'text-slate-400'
        : completedCount === total
            ? 'text-emerald-600 font-semibold'
            : 'text-amber-600 font-semibold';

    const orderStr = v.visit_order != null ? String(v.visit_order).padStart(2, '0') : '—';
    const isUnsch  = v.visit_type === 'Unscheduled';

    return `
    <tr class="visit-row cursor-pointer hover:bg-slate-50 transition" data-visit-id="${v.id}"
        onclick="selectVisit(${v.id}, '${esc(v.visit_name)}')">
        <td class="text-xs text-slate-400 font-mono text-center">${orderStr}</td>
        <td>
            <p class="text-sm font-semibold text-slate-800">${esc(v.visit_name)}</p>
            <span class="text-xs px-1.5 py-0.5 rounded font-medium ${isUnsch ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}">
                ${isUnsch ? 'Unscheduled' : 'Scheduled'}
            </span>
        </td>
        <td class="text-xs text-slate-600 whitespace-nowrap">${fmt(v.planned_date)}</td>
        <td class="text-xs text-slate-600 whitespace-nowrap">${fmt(v.actual_date)}</td>
        <td class="text-center">
            ${v.study_day != null
                ? `<span class="text-xs font-mono font-semibold ${v.study_day < 0 ? 'text-amber-600' : 'text-slate-700'}">Day ${v.study_day}</span>`
                : '<span class="text-xs text-slate-300">—</span>'}
        </td>
        <td>${v.actual_date ? complianceBadge(v.window_compliance) : '<span class="text-xs text-slate-300">—</span>'}</td>
        <td>${statusBadge(v.status, VISIT_STATUS_BADGE)}</td>
        <td class="text-center">
            <span class="text-xs ${crfColor}">${completedCount} / ${total}</span>
        </td>
        <td class="text-right" onclick="event.stopPropagation()">
            <div class="flex items-center justify-end gap-1.5">
                <button onclick="selectVisit(${v.id}, '${esc(v.visit_name)}')"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition border border-blue-100">
                    <i data-lucide="clipboard-list" class="w-3 h-3"></i> CRFs
                </button>
                ${canManageVisit ? `
                <button onclick="openEditVisitModal(${v.id})"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
                    <i data-lucide="edit-2" class="w-3 h-3"></i>
                </button>` : ''}
            </div>
        </td>
    </tr>
    ${v.status === 'Missed' && v.missed_reason ? `
    <tr class="bg-red-50">
        <td colspan="9" class="px-4 py-1.5 text-xs text-red-600 italic border-t border-red-100">
            <i data-lucide="alert-circle" class="w-3 h-3 inline mr-1 align-text-bottom"></i>Missed: ${esc(v.missed_reason)}
        </td>
    </tr>` : ''}`;
}

// ============================================================
// Add Visit Modal
// ============================================================
window.openAddVisitModal = function () {
    const subject = window._currentSubject;
    if (!subject) return;

    const today = new Date().toISOString().split('T')[0];
    const tplOptions = VISIT_TEMPLATES.map(t => {
        if (t.code === 'CUS') return `<option value="CUS">Custom Visit (enter name manually)…</option>`;
        if (t.code === 'UNS') return `<option value="UNS">Unscheduled Visit</option>`;
        return `<option value="${t.code}">${t.code} — ${t.name}  (Day ${t.study_day >= 0 ? '+' : ''}${t.study_day}, ±${t.window_days}d)</option>`;
    }).join('');

    showModal({
        title: 'Add Protocol Visit',
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#EBF2FD;border-color:#BFD7F5;color:#1554A0">
                <i data-lucide="info" class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:#1554A0"></i>
                Select a protocol visit template. Planned dates are auto-calculated from the subject&#39;s enrollment date (Day 1 = ${fmt(subject.enrollment_date)}). All entries are audit-logged per ICH GCP E6 (R2).
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Protocol Visit Template <span class="text-red-500">*</span></label>
                <select id="av-template" onchange="applyVisitTemplate('${subject.enrollment_date}')"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">— Select Visit —</option>
                    ${tplOptions}
                </select>
            </div>

            <div id="av-name-row" class="hidden">
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Visit Name <span class="text-red-500">*</span></label>
                <input type="text" id="av-name" placeholder="e.g. Safety Follow-up Week 16"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Visit Type</label>
                    <select id="av-type"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="Scheduled">Scheduled</option>
                        <option value="Unscheduled">Unscheduled</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Window Tolerance (±days)</label>
                    <input type="number" id="av-window" min="0" max="30" placeholder="0"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    <p class="text-xs text-slate-400 mt-1">Protocol-defined acceptable deviation from planned date.</p>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Planned Visit Date</label>
                    <input type="date" id="av-planned"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    <p class="text-xs text-slate-400 mt-1">Auto-calculated from study day. Adjust if needed.</p>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Actual Visit Date</label>
                    <input type="date" id="av-actual" max="${today}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    <p class="text-xs text-slate-400 mt-1">Leave blank if visit has not yet occurred.</p>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Visit Status <span class="text-red-500">*</span></label>
                    <select id="av-status" onchange="toggleMissedReason()"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="Scheduled">Scheduled (upcoming)</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Complete">Complete</option>
                        <option value="Missed">Missed</option>
                    </select>
                </div>
                <div></div>
            </div>

            <div id="av-missed-row" class="hidden">
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason Visit Was Missed <span class="text-red-500">*</span></label>
                <textarea id="av-missed-reason" rows="2"
                    placeholder="Document clinical reason per GCP requirements (e.g., Subject withdrew consent, Subject hospitalised)…"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Investigator Notes</label>
                <textarea id="av-notes" rows="2"
                    placeholder="Optional: clinical observations, protocol deviations noted, etc."
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>

            <div id="av-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"></div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitAddVisit()"
            class="px-4 py-2 text-sm font-semibold btn-primary rounded-md flex items-center gap-2">
            <i data-lucide="calendar-plus" class="w-4 h-4"></i> Add Visit
        </button>`,
    });
};

window.applyVisitTemplate = function (enrollmentDate) {
    const code = document.getElementById('av-template').value;
    const tpl  = VISIT_TEMPLATES.find(t => t.code === code);
    if (!tpl) return;

    const nameRow = document.getElementById('av-name-row');
    const typeEl  = document.getElementById('av-type');
    const winEl   = document.getElementById('av-window');
    const planEl  = document.getElementById('av-planned');

    if (code === 'CUS') {
        nameRow.classList.remove('hidden');
        typeEl.value = 'Scheduled';
        winEl.value  = '';
        planEl.value = '';
        return;
    }
    nameRow.classList.add('hidden');
    typeEl.value = tpl.type || 'Scheduled';
    winEl.value  = tpl.window_days != null ? tpl.window_days : '';
    planEl.value = (tpl.study_day != null && enrollmentDate)
        ? plannedFromStudyDay(enrollmentDate, tpl.study_day)
        : '';
};

window.toggleMissedReason = function () {
    const status  = document.getElementById('av-status')?.value;
    const missRow = document.getElementById('av-missed-row');
    if (missRow) missRow.classList.toggle('hidden', status !== 'Missed');
};

window.submitAddVisit = async function () {
    const subject = window._currentSubject;
    const errEl   = document.getElementById('av-error');
    errEl.classList.add('hidden');

    const code    = document.getElementById('av-template').value;
    const tpl     = VISIT_TEMPLATES.find(t => t.code === code);
    const nameIn  = document.getElementById('av-name')?.value.trim();
    const type    = document.getElementById('av-type').value;
    const winVal  = document.getElementById('av-window').value;
    const planned = document.getElementById('av-planned').value;
    const actual  = document.getElementById('av-actual').value;
    const status  = document.getElementById('av-status').value;
    const missedR = document.getElementById('av-missed-reason')?.value.trim();
    const notes   = document.getElementById('av-notes').value.trim();

    if (!code) {
        errEl.textContent = 'Please select a visit template.';
        errEl.classList.remove('hidden');
        return;
    }
    if (code === 'CUS' && !nameIn) {
        errEl.textContent = 'Visit name is required for custom visits.';
        errEl.classList.remove('hidden');
        return;
    }
    if (status === 'Missed' && !missedR) {
        errEl.textContent = 'Reason is required when visit status is Missed (ICH GCP E6 R2 requirement).';
        errEl.classList.remove('hidden');
        return;
    }

    const visit_name  = code === 'CUS' ? nameIn : (tpl?.name || 'Unscheduled Visit');
    const visit_order = tpl?.order ?? 99;

    try {
        await api.createVisit(subject.id, {
            visit_name,
            visit_order,
            visit_type:   type,
            planned_date: planned || null,
            actual_date:  actual  || null,
            window_days:  winVal !== '' ? Number(winVal) : null,
            status,
            missed_reason: missedR || null,
            notes:         notes   || null,
        });
        closeModal();
        showToast(`Visit "${visit_name}" added to schedule.`, 'success');
        await renderSubjectDetail(subject.id);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    }
};

// ============================================================
// Edit Visit Modal
// ============================================================
window.openEditVisitModal = function (visitId) {
    const subject = window._currentSubject;
    const v = subject?.visits?.find(vis => vis.id === visitId);
    if (!v) return;

    const today    = new Date().toISOString().split('T')[0];
    const isMissed = v.status === 'Missed';

    showModal({
        title: `Edit Visit — ${v.visit_name}`,
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Visit Name <span class="text-red-500">*</span></label>
                    <input type="text" id="ev-name" value="${esc(v.visit_name)}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Visit Type</label>
                    <select id="ev-type"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="Scheduled" ${v.visit_type === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="Unscheduled" ${v.visit_type === 'Unscheduled' ? 'selected' : ''}>Unscheduled</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Window Tolerance (±days)</label>
                    <input type="number" id="ev-window" min="0" value="${v.window_days ?? ''}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Planned Visit Date</label>
                    <input type="date" id="ev-planned" value="${v.planned_date || ''}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Actual Visit Date</label>
                    <input type="date" id="ev-actual" value="${v.actual_date || ''}" max="${today}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Visit Status <span class="text-red-500">*</span></label>
                    <select id="ev-status" onchange="toggleEditMissedReason()"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="Scheduled"   ${v.status === 'Scheduled'    ? 'selected' : ''}>Scheduled</option>
                        <option value="In Progress" ${v.status === 'In Progress'  ? 'selected' : ''}>In Progress</option>
                        <option value="Complete"    ${v.status === 'Complete'     ? 'selected' : ''}>Complete</option>
                        <option value="Missed"      ${v.status === 'Missed'       ? 'selected' : ''}>Missed</option>
                    </select>
                </div>
                <div></div>
            </div>

            <div id="ev-missed-row" class="${isMissed ? '' : 'hidden'}">
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason Visit Was Missed <span class="text-red-500">*</span></label>
                <textarea id="ev-missed-reason" rows="2"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(v.missed_reason || '')}</textarea>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Investigator Notes</label>
                <textarea id="ev-notes" rows="2"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(v.notes || '')}</textarea>
            </div>

            <div class="p-3 rounded-md border" style="background:#FFF7ED;border-color:#FED7AA">
                <label class="block text-xs font-semibold mb-1.5" style="color:#9A3412">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="ev-reason"
                    placeholder="Required per FDA 21 CFR Part 11 — document why this record is being updated"
                    class="w-full px-3 py-2.5 border border-orange-200 rounded-md text-sm outline-none" style="background:#fff">
                <p class="text-xs mt-1" style="color:#C2410C">This justification will be permanently stored in the audit trail.</p>
            </div>

            <div id="ev-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"></div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitEditVisit(${visitId})"
            class="px-4 py-2 text-sm font-semibold btn-primary rounded-md flex items-center gap-2">
            <i data-lucide="save" class="w-4 h-4"></i> Save Changes
        </button>`,
    });
};

window.toggleEditMissedReason = function () {
    const status  = document.getElementById('ev-status')?.value;
    const missRow = document.getElementById('ev-missed-row');
    if (missRow) missRow.classList.toggle('hidden', status !== 'Missed');
};

window.submitEditVisit = async function (visitId) {
    const errEl   = document.getElementById('ev-error');
    errEl.classList.add('hidden');

    const name    = document.getElementById('ev-name').value.trim();
    const type    = document.getElementById('ev-type').value;
    const winVal  = document.getElementById('ev-window').value;
    const planned = document.getElementById('ev-planned').value;
    const actual  = document.getElementById('ev-actual').value;
    const status  = document.getElementById('ev-status').value;
    const missedR = document.getElementById('ev-missed-reason')?.value.trim();
    const notes   = document.getElementById('ev-notes').value.trim();
    const reason  = document.getElementById('ev-reason').value.trim();

    if (!name) {
        errEl.textContent = 'Visit name is required.';
        errEl.classList.remove('hidden');
        return;
    }
    if (!reason) {
        errEl.textContent = 'Reason for change is required (FDA 21 CFR Part 11).';
        errEl.classList.remove('hidden');
        return;
    }
    if (status === 'Missed' && !missedR) {
        errEl.textContent = 'Missed reason is required per ICH GCP E6 (R2).';
        errEl.classList.remove('hidden');
        return;
    }

    try {
        await api.updateVisit(visitId, {
            visit_name:   name,
            visit_type:   type,
            planned_date: planned || null,
            actual_date:  actual  || null,
            window_days:  winVal !== '' ? Number(winVal) : null,
            status,
            missed_reason: missedR || null,
            notes:         notes   || null,
            _reason:       reason,
        });
        closeModal();
        showToast('Visit updated. Change recorded in audit trail.', 'success');
        await renderSubjectDetail(window._subjectId);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    }
};

// ============================================================
// Lock Entry Modal
// ============================================================
window.openLockModal = function (entryId, subjectId) {
    showModal({
        title: 'Lock Data Entry',
        size: 'sm',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                <i data-lucide="lock" class="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5"></i>
                <p class="text-sm text-slate-700">Once locked, this data entry cannot be edited without documented justification by an Admin. Permanently recorded in the Audit Trail per FDA 21 CFR Part 11.</p>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason for Locking <span class="text-red-500">*</span></label>
                <textarea id="lock-reason" rows="3"
                    placeholder="e.g. Data verified against source documents and approved for lock."
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="confirmLock(${entryId}, ${subjectId})"
            class="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="lock" class="w-4 h-4"></i> Confirm Lock
        </button>`,
    });
};

window.confirmLock = async function (entryId, subjectId) {
    const reason = document.getElementById('lock-reason').value.trim();
    if (!reason) { showToast('Reason for locking is required.', 'error'); return; }
    try {
        await api.lockDataEntry(entryId, reason);
        closeModal();
        showToast('Data entry locked. Audit trail entry created.', 'success');
        await renderSubjectDetail(subjectId);
    } catch (err) { showToast(err.message, 'error'); }
};

// ============================================================
// Withdraw Subject Modal
// ============================================================
window.openWithdrawModal = function (subjectId) {
    showModal({
        title: 'Withdraw Subject',
        size: 'sm',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-3 p-3 bg-red-50 rounded-md border border-red-200">
                <i data-lucide="alert-triangle" class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"></i>
                <p class="text-sm text-red-700">This will mark the subject as Withdrawn and permanently record the action in the Audit Trail. This action cannot be undone.</p>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason for Withdrawal <span class="text-red-500">*</span></label>
                <textarea id="withdraw-reason" rows="3"
                    placeholder="Enter clinical reason for withdrawal…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="confirmWithdraw(${subjectId})"
            class="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition">
            Confirm Withdrawal
        </button>`,
    });
};

window.confirmWithdraw = async function (subjectId) {
    const reason = document.getElementById('withdraw-reason').value.trim();
    if (!reason) { showToast('Reason for withdrawal is required.', 'error'); return; }
    try {
        await api.updateSubjectStatus(subjectId, 'Withdrawn', reason);
        closeModal();
        showToast('Subject withdrawn. Audit trail recorded.', 'warning');
        await renderSubjectDetail(subjectId);
    } catch (err) { showToast(err.message, 'error'); }
};

// ============================================================
// Helpers
// ============================================================
function auditBadge(action) {
    const map = {
        INSERT: 'badge-insert', UPDATE: 'badge-update',
        DELETE: 'badge-delete', LOCK:   'badge-lock', UNLOCK: 'badge-unlock',
    };
    return map[action] || 'bg-slate-100 text-slate-600';
}
