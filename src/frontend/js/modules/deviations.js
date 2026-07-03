// ============================================================
// Protocol Deviations View — ICH GCP E6(R3) §8.3
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

const TYPE_STYLE = {
    Major:     'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA',
    Minor:     'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A',
    Important: 'background:#EDE9FE;color:#5B21B6;border:1px solid #DDD6FE',
};
const STATUS_STYLE = {
    Open:                'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA',
    'CAPA Implemented':  'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A',
    Closed:              'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7',
};

const DEVIATION_CATEGORIES = [
    'Eligibility / Inclusion-Exclusion',
    'Informed Consent',
    'Protocol Procedure',
    'Visit Schedule / Window',
    'Medication / Dosing',
    'Prohibited Medication',
    'Laboratory / Assessments',
    'Randomization',
    'Data Collection',
    'Other',
];

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function typeBadge(t) {
    const style = TYPE_STYLE[t] || 'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1';
    return `<span class="badge" style="${style}">${esc(t)}</span>`;
}
function statusBadge(s) {
    const style = STATUS_STYLE[s] || STATUS_STYLE.Open;
    return `<span class="badge" style="${style}">${esc(s)}</span>`;
}

export async function renderDeviations(filters = {}) {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const user = api.getCurrentUser();
    let devs;
    try {
        devs = await api.getDeviations(filters);
    } catch (err) {
        content.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    const total  = devs.length;
    const open   = devs.filter(d => d.status === 'Open').length;
    const major  = devs.filter(d => d.deviationType === 'Major').length;
    const unreported = devs.filter(d => d.deviationType === 'Major' && !d.reportedToIrb && d.status !== 'Closed').length;

    const canCreate = ['investigator', 'pi', 'admin', 'crc'].includes(user.role);

    content.innerHTML = `
    <div class="p-5 space-y-4">

        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Protocol Deviations</h2>
                <p class="text-xs text-slate-500 mt-0.5">ICH GCP E6(R3) — deviations, root cause analysis, CAPA tracking</p>
            </div>
            ${canCreate ? `
            <button onclick="openDevForm()"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Record Deviation
            </button>` : ''}
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total</p>
                <p class="kpi-number text-slate-700">${total}</p>
            </div>
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Open</p>
                <p class="kpi-number text-red-600">${open}</p>
                <p class="text-xs text-slate-400 mt-1">Pending CAPA</p>
            </div>
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Major</p>
                <p class="kpi-number text-purple-700">${major}</p>
                <p class="text-xs text-slate-400 mt-1">Significant deviations</p>
            </div>
            <div class="ph-card p-4 ${unreported > 0 ? 'border-amber-300 bg-amber-50' : ''}">
                <p class="text-xs font-semibold ${unreported > 0 ? 'text-amber-700' : 'text-slate-500'} uppercase tracking-wide mb-2">IRB Not Reported</p>
                <p class="kpi-number ${unreported > 0 ? 'text-amber-700' : 'text-slate-400'}">${unreported}</p>
                <p class="text-xs ${unreported > 0 ? 'text-amber-600' : 'text-slate-400'} mt-1">Major deviations pending IRB</p>
            </div>
        </div>

        <!-- Filters -->
        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <select id="dev-type-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Types</option>
                    <option>Major</option>
                    <option>Minor</option>
                    <option>Important</option>
                </select>
                <select id="dev-status-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Statuses</option>
                    <option>Open</option>
                    <option value="CAPA Implemented">CAPA Implemented</option>
                    <option>Closed</option>
                </select>
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="dev-search" placeholder="Search by subject or description…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
        </div>

        <!-- Table -->
        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">#</th>
                            <th class="text-left">Subject</th>
                            <th class="text-left">Type / Category</th>
                            <th class="text-left">Description</th>
                            <th class="text-left">Deviation Date</th>
                            <th class="text-left">IRB</th>
                            <th class="text-left">Status</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="dev-tbody" class="ph-table-body">
                        ${renderDevRows(devs, user)}
                    </tbody>
                </table>
            </div>
            <div id="dev-empty" class="${devs.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="clipboard-check" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No protocol deviations recorded.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    function filterDevs() {
        const type   = document.getElementById('dev-type-filter').value;
        const status = document.getElementById('dev-status-filter').value;
        const search = document.getElementById('dev-search').value.toLowerCase();
        let filtered = devs;
        if (type)   filtered = filtered.filter(d => d.deviationType === type);
        if (status) filtered = filtered.filter(d => d.status === status);
        if (search) filtered = filtered.filter(d =>
            d.description?.toLowerCase().includes(search) ||
            d.subjectCode?.toLowerCase().includes(search) ||
            d.category?.toLowerCase().includes(search)
        );
        document.getElementById('dev-tbody').innerHTML = renderDevRows(filtered, user);
        document.getElementById('dev-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('dev-type-filter').addEventListener('change', filterDevs);
    document.getElementById('dev-status-filter').addEventListener('change', filterDevs);
    document.getElementById('dev-search').addEventListener('input', filterDevs);
}

function renderDevRows(devs, user) {
    if (!devs.length) return '';
    return devs.map(d => {
        const canEdit   = ['investigator','pi','admin','crc'].includes(user.role) && d.status !== 'Closed';
        const canIrb    = ['investigator','pi','admin'].includes(user.role) && d.deviationType === 'Major' && !d.reportedToIrb;
        const canAdvance = ['pi','admin'].includes(user.role) && d.status !== 'Closed';

        return `<tr>
            <td class="text-xs text-slate-400 font-mono">#${d.id}</td>
            <td>
                ${d.subjectCode
                    ? `<p class="text-xs font-semibold font-mono text-slate-800">${esc(d.subjectCode)}</p>`
                    : `<p class="text-xs text-slate-400 italic">Study-level</p>`}
                <p class="text-xs text-slate-400">${esc(d.createdByName)}</p>
            </td>
            <td>
                ${typeBadge(d.deviationType)}
                ${d.autoGenerated ? `<span class="badge mt-0.5" style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE">Auto</span>` : ''}
                <p class="text-xs text-slate-400 mt-0.5">${esc(d.category || '—')}</p>
            </td>
            <td class="max-w-[200px]">
                <p class="text-xs text-slate-700 line-clamp-2">${esc(d.description)}</p>
                ${d.capa ? `<p class="text-xs text-emerald-600 mt-0.5 line-clamp-1">CAPA: ${esc(d.capa)}</p>` : ''}
            </td>
            <td class="text-xs text-slate-600 whitespace-nowrap">${fmtDate(d.deviationDate)}</td>
            <td class="text-xs whitespace-nowrap">
                ${d.reportedToIrb
                    ? `<span class="badge" style="background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7">Reported</span>`
                    : (d.deviationType === 'Major'
                        ? `<span class="badge" style="background:#FEE2E2;color:#991B1B;border:1px solid #FECACA">Pending</span>`
                        : `<span class="text-slate-300">—</span>`)}
            </td>
            <td>${statusBadge(d.status)}</td>
            <td class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                    ${canEdit ? `<button onclick="openDevForm(${d.id})"
                        class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition" title="Edit">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                    ${canIrb ? `<button onclick="reportDevToIrb(${d.id})"
                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition border border-amber-200">
                        <i data-lucide="flag" class="w-3 h-3"></i> IRB
                    </button>` : ''}
                    ${canAdvance && d.status === 'Open' ? `<button onclick="advanceDevStatus(${d.id}, 'CAPA Implemented')"
                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition border border-purple-200">
                        <i data-lucide="check" class="w-3 h-3"></i> CAPA Done
                    </button>` : ''}
                    ${canAdvance && d.status === 'CAPA Implemented' ? `<button onclick="advanceDevStatus(${d.id}, 'Closed')"
                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
                        <i data-lucide="x-circle" class="w-3 h-3"></i> Close
                    </button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.openDevForm = function(devId = null) {
    const isEdit = devId !== null;
    showModal({
        title: isEdit ? 'Edit Protocol Deviation' : 'Record Protocol Deviation',
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#EBF2FD;border-color:#BFD7F5;color:#1554A0">
                <i data-lucide="info" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                ICH GCP E6(R3): Major deviations must be reported to IRB/EC and Sponsor. Root cause and CAPA documentation required.
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Subject Code</label>
                    <input type="text" id="dev-subject" placeholder="Leave blank for study-level"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Deviation Type <span class="text-red-500">*</span></label>
                    <select id="dev-type" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option>Major</option>
                        <option>Minor</option>
                        <option>Important</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Category</label>
                    <select id="dev-category" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        ${DEVIATION_CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Deviation Date</label>
                    <input type="date" id="dev-date" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Discovery Date</label>
                    <input type="date" id="dev-discovery" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Description <span class="text-red-500">*</span></label>
                <textarea id="dev-description" rows="3" placeholder="Describe what happened and how it deviated from the protocol…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Root Cause Analysis</label>
                <textarea id="dev-rootcause" rows="2" placeholder="Why did this deviation occur?"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Impact on Subject</label>
                <input type="text" id="dev-impact" placeholder="Describe any impact on subject safety or data integrity"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">CAPA (Corrective / Preventive Action)</label>
                <textarea id="dev-capa" rows="2" placeholder="Actions taken or planned to prevent recurrence…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>

            ${isEdit ? `
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="dev-rfc" placeholder="Required — explain what changed and why"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none">
            </div>` : ''}
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitDevForm(${devId})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-4 h-4"></i> ${isEdit ? 'Save Changes' : 'Record Deviation'}
        </button>`,
    });
};

window.submitDevForm = async function(devId) {
    const isEdit = devId !== null;
    const type   = document.getElementById('dev-type').value;
    const desc   = document.getElementById('dev-description').value.trim();
    if (!type || !desc) { showToast('Type and description are required.', 'error'); return; }

    const subjectCode = document.getElementById('dev-subject').value.trim();
    let subjectId = null;
    if (subjectCode && !isEdit) {
        try {
            const subjects = await api.getSubjects({ search: subjectCode });
            const match = subjects.find(s => s.subject_code === subjectCode);
            if (!match) { showToast(`Subject "${subjectCode}" not found.`, 'error'); return; }
            subjectId = match.id;
        } catch { showToast('Could not resolve subject.', 'error'); return; }
    }

    const payload = {
        subjectId,
        deviationType:   type,
        category:        document.getElementById('dev-category').value  || null,
        description:     desc,
        deviationDate:   document.getElementById('dev-date').value      || null,
        discoveryDate:   document.getElementById('dev-discovery').value || null,
        rootCause:       document.getElementById('dev-rootcause').value.trim() || null,
        impactOnSubject: document.getElementById('dev-impact').value.trim()    || null,
        capa:            document.getElementById('dev-capa').value.trim()       || null,
    };

    if (isEdit) {
        const rfc = document.getElementById('dev-rfc')?.value?.trim();
        if (!rfc) { showToast('Reason for change is required.', 'error'); return; }
        payload.reason = rfc;
    }

    try {
        isEdit ? await api.updateDeviation(devId, payload) : await api.createDeviation(payload);
        closeModal();
        showToast(isEdit ? 'Deviation updated.' : 'Deviation recorded.', 'success');
        await renderDeviations();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.reportDevToIrb = async function(devId) {
    if (!confirm('Confirm: this major deviation has been reported to the IRB/Ethics Committee?')) return;
    try {
        await api.reportDeviationToIrb(devId);
        showToast('Marked as reported to IRB.', 'success');
        await renderDeviations();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.advanceDevStatus = async function(devId, status) {
    const label = status === 'CAPA Implemented' ? 'mark CAPA as implemented' : 'close this deviation';
    if (!confirm(`Confirm: ${label}?`)) return;
    try {
        await api.advanceDeviationStatus(devId, status);
        showToast(`Status updated: ${status}`, 'success');
        await renderDeviations();
    } catch (err) {
        showToast(err.message, 'error');
    }
};
