// ============================================================
// System Validation — admin-only validation log
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function statusBadge(s) {
    const map = {
        Validated:   'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7',
        Pending:     'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A',
        Failed:      'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA',
    };
    const style = map[s] || map.Pending;
    return `<span class="badge" style="${style}">${esc(s)}</span>`;
}

function validationTypeBadge(t) {
    const map = {
        IQ:              'background:#EDE9FE;color:#5B21B6;border:1px solid #DDD6FE',
        OQ:              'background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE',
        PQ:              'background:#F0FDF4;color:#166534;border:1px solid #BBF7D0',
        'Re-validation': 'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A',
    };
    const style = map[t] || 'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1';
    return `<span class="badge" style="${style}">${esc(t)}</span>`;
}

const VAL_TYPES = ['IQ','OQ','PQ','Re-validation'];

export async function renderSysVal(container) {
    container.innerHTML = SPINNER;
    const user = api.getCurrentUser();
    if (user?.role !== 'admin') {
        container.innerHTML = `
        <div class="p-6">
            <div class="ph-card p-10 text-center border-slate-200">
                <i data-lucide="lock" class="w-12 h-12 mx-auto mb-4 text-slate-300"></i>
                <p class="text-sm font-semibold text-slate-600">Access Restricted</p>
                <p class="text-xs text-slate-400 mt-1">System Validation is accessible to administrators only.</p>
            </div>
        </div>`;
        lucide.createIcons();
        return;
    }

    let records = [];
    let sysInfo = {};
    try {
        records = await api.request('/api/sysval');
    } catch {}
    try {
        sysInfo = await api.request('/api/sysval/info');
    } catch {
        sysInfo = { appVersion: '1.0.0', environment: 'Production', validationStatus: 'Validated' };
    }

    const overallValidated = records.some(r => r.status === 'Validated');
    const overallStyle = overallValidated
        ? 'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7'
        : 'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A';

    container.innerHTML = `
    <div class="p-5 space-y-5">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">System Validation</h2>
                <p class="text-xs text-slate-500 mt-0.5">21 CFR Part 11 / Annex 11 compliance — IQ, OQ, PQ validation records</p>
            </div>
            <button onclick="openSysValForm()"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Add Validation Record
            </button>
        </div>

        <!-- System Info Card -->
        <div class="ph-card p-5">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                    <i data-lucide="server" class="w-4 h-4 text-blue-700"></i>
                </div>
                <p class="text-sm font-semibold text-slate-700">System Information</p>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">App Version</p>
                    <p class="text-sm font-bold text-slate-800 font-mono">${esc(sysInfo.appVersion || '1.0.0')}</p>
                </div>
                <div>
                    <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Environment</p>
                    <p class="text-sm font-semibold text-slate-700">${esc(sysInfo.environment || 'Production')}</p>
                </div>
                <div>
                    <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Current Date</p>
                    <p class="text-sm font-semibold text-slate-700">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
                <div>
                    <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Validation Status</p>
                    <span class="badge" style="${overallStyle}">${overallValidated ? 'Validated' : 'Pending'}</span>
                </div>
            </div>
        </div>

        <!-- Validation Log -->
        <div class="space-y-4" id="sysval-list">
            ${records.length
                ? records.map(r => sysValCard(r)).join('')
                : `<div class="ph-card py-16 text-center text-slate-400 text-sm">
                       <i data-lucide="shield-check" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                       <p>No validation records found.</p>
                   </div>`}
        </div>
    </div>`;

    lucide.createIcons();
}

function sysValCard(r) {
    return `
    <div class="ph-card p-5 space-y-3">
        <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="shield" class="w-4 h-4 text-slate-500"></i>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <p class="text-sm font-bold text-slate-900">v${esc(r.version)}</p>
                        ${validationTypeBadge(r.validationType)}
                        ${statusBadge(r.status)}
                    </div>
                    <p class="text-xs text-slate-400 mt-0.5">${fmtDate(r.validationDate)}</p>
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                ${r.status === 'Pending' ? `
                <button onclick="markSysValApproved(${r.id})"
                    class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition border border-emerald-200">
                    <i data-lucide="check-circle" class="w-3 h-3"></i> Mark Approved
                </button>` : ''}
            </div>
        </div>

        ${r.summary ? `<p class="text-sm text-slate-700">${esc(r.summary)}</p>` : ''}

        <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-slate-500">
            ${r.performedBy ? `<div><span class="font-semibold text-slate-600">Performed by:</span> ${esc(r.performedBy)}</div>` : ''}
            ${r.approvedBy  ? `<div><span class="font-semibold text-slate-600">Approved by:</span> ${esc(r.approvedBy)}</div>` : ''}
            ${r.changesSince ? `<div class="col-span-2 lg:col-span-1"><span class="font-semibold text-slate-600">Changes since last:</span> ${esc(r.changesSince)}</div>` : ''}
        </div>

        <div class="flex items-center gap-2 pt-1 border-t border-slate-100">
            <button onclick="openSysValForm(${r.id})"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
                <i data-lucide="pencil" class="w-3 h-3"></i> Edit
            </button>
            <button onclick="deleteSysValRecord(${r.id})"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition ml-auto">
                <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
            </button>
        </div>
    </div>`;
}

window.openSysValForm = async function(recordId = null) {
    const isEdit = recordId !== null;

    let rec = {};
    if (isEdit) {
        try { rec = await api.request(`/api/sysval/${recordId}`); } catch {}
    }

    showModal({
        title: isEdit ? 'Edit Validation Record' : 'Add Validation Record',
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Version <span class="text-red-500">*</span></label>
                    <input type="text" id="sv-version" value="${esc(rec.version)}" placeholder="e.g. 1.0.0"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Validation Date <span class="text-red-500">*</span></label>
                    <input type="date" id="sv-date" value="${rec.validationDate ? rec.validationDate.split('T')[0] : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Validation Type <span class="text-red-500">*</span></label>
                    <select id="sv-type" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        ${VAL_TYPES.map(t => `<option ${rec.validationType === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Status</label>
                    <select id="sv-status" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="Pending" ${rec.status === 'Pending' || !rec.status ? 'selected' : ''}>Pending</option>
                        <option value="Validated" ${rec.status === 'Validated' ? 'selected' : ''}>Validated</option>
                        <option value="Failed" ${rec.status === 'Failed' ? 'selected' : ''}>Failed</option>
                    </select>
                </div>
            </div>
            <div>
                <label class="ph-label">Summary <span class="text-red-500">*</span></label>
                <textarea id="sv-summary" rows="3" placeholder="Summary of validation activities performed…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(rec.summary)}</textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Performed By</label>
                    <input type="text" id="sv-performed-by" value="${esc(rec.performedBy)}" placeholder="Name / role"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Approved By</label>
                    <input type="text" id="sv-approved-by" value="${esc(rec.approvedBy)}" placeholder="Name / role"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div>
                <label class="ph-label">Changes Since Last Validation</label>
                <textarea id="sv-changes" rows="2" placeholder="Describe what changed since the previous validation…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(rec.changesSince)}</textarea>
            </div>
            ${isEdit ? `
            <div>
                <label class="ph-label">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="sv-rfc" placeholder="Required — explain what changed and why"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none">
            </div>` : ''}
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitSysValForm(${recordId})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-4 h-4"></i> ${isEdit ? 'Save Changes' : 'Add Record'}
        </button>`,
    });
};

window.submitSysValForm = async function(recordId) {
    const isEdit  = recordId !== null;
    const version = document.getElementById('sv-version').value.trim();
    const date    = document.getElementById('sv-date').value;
    const type    = document.getElementById('sv-type').value;
    const summary = document.getElementById('sv-summary').value.trim();
    if (!version || !date || !type || !summary) {
        showToast('Version, date, type, and summary are required.', 'error'); return;
    }

    const payload = {
        version,
        validationDate:  date,
        validationType:  type,
        status:          document.getElementById('sv-status').value,
        summary,
        performedBy:     document.getElementById('sv-performed-by').value.trim() || null,
        approvedBy:      document.getElementById('sv-approved-by').value.trim() || null,
        changesSince:    document.getElementById('sv-changes').value.trim() || null,
    };

    if (isEdit) {
        const rfc = document.getElementById('sv-rfc')?.value?.trim();
        if (!rfc) { showToast('Reason for change is required.', 'error'); return; }
        payload.reason = rfc;
    }

    try {
        if (isEdit) {
            await api.request(`/api/sysval/${recordId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        } else {
            await api.request('/api/sysval', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeModal();
        showToast(isEdit ? 'Validation record updated.' : 'Validation record added.', 'success');
        await renderSysVal(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.markSysValApproved = async function(recordId) {
    if (!confirm('Mark this validation record as Approved/Validated?')) return;
    try {
        await api.request(`/api/sysval/${recordId}/approve`, { method: 'PATCH', body: JSON.stringify({}) });
        showToast('Validation record approved.', 'success');
        await renderSysVal(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteSysValRecord = async function(recordId) {
    const reason = prompt('Reason for deletion (required):');
    if (!reason) return;
    try {
        await api.request(`/api/sysval/${recordId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
        showToast('Validation record deleted.', 'success');
        await renderSysVal(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};
