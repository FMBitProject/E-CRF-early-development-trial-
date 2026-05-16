// ============================================================
// Protocol Amendments — study-wide timeline view
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
        Draft:       'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A',
        Approved:    'background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE',
        Implemented: 'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7',
    };
    const style = map[s] || map.Draft;
    return `<span class="badge" style="${style}">${esc(s)}</span>`;
}

const STATUS_FLOW = { Draft: 'Approved', Approved: 'Implemented' };
const STATUS_BTN_LABEL = { Draft: 'Approve', Approved: 'Mark Implemented' };
const STATUS_BTN_STYLE = {
    Draft:    'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200',
    Approved: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200',
};

export async function renderAmendments(container) {
    container.innerHTML = SPINNER;
    const user = api.getCurrentUser();
    const canWrite   = ['admin', 'investigator'].includes(user?.role);
    const canAdvance = ['admin', 'investigator'].includes(user?.role);

    let records = [];
    try {
        records = await api.request('/api/amendments');
    } catch (err) {
        container.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    const cards = records.length
        ? records.map(r => amendmentCard(r, canWrite, canAdvance)).join('')
        : `<div class="py-16 text-center text-slate-400 text-sm">
               <i data-lucide="git-branch" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
               <p>No protocol amendments recorded.</p>
           </div>`;

    container.innerHTML = `
    <div class="p-5 space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Protocol Amendments</h2>
                <p class="text-xs text-slate-500 mt-0.5">All protocol modifications, IRB approvals, and re-consent requirements</p>
            </div>
            ${canWrite ? `
            <button onclick="openAmendmentForm()"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Add Amendment
            </button>` : ''}
        </div>

        <div class="space-y-4" id="amendments-list">
            ${cards}
        </div>
    </div>`;

    lucide.createIcons();
}

function amendmentCard(r, canWrite, canAdvance) {
    const nextStatus = STATUS_FLOW[r.status];
    const btnLabel   = STATUS_BTN_LABEL[r.status];
    const btnStyle   = STATUS_BTN_STYLE[r.status];

    return `
    <div class="ph-card p-5 space-y-3">
        <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="git-commit" class="w-4 h-4 text-blue-700"></i>
                </div>
                <div>
                    <p class="text-sm font-bold text-slate-900">Amendment ${esc(r.amendmentNo)}</p>
                    <p class="text-xs text-slate-500">Effective: ${fmtDate(r.effectiveDate)}</p>
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                ${r.requiresReconsent
                    ? `<span class="badge" style="background:#FEE2E2;color:#991B1B;border:1px solid #FECACA">Re-consent Required</span>`
                    : ''}
                ${statusBadge(r.status)}
            </div>
        </div>

        ${r.summary ? `<p class="text-sm text-slate-700">${esc(r.summary)}</p>` : ''}

        ${r.changes ? `
        <div class="p-3 rounded-md bg-slate-50 border border-slate-200">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Changes</p>
            <p class="text-xs text-slate-700 whitespace-pre-line">${esc(r.changes)}</p>
        </div>` : ''}

        ${r.requiresReconsent && r.reconsentReason ? `
        <div class="p-3 rounded-md bg-red-50 border border-red-200">
            <p class="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Re-consent Reason</p>
            <p class="text-xs text-red-700">${esc(r.reconsentReason)}</p>
        </div>` : ''}

        ${r.irbApprovalDate || r.irbRefNo ? `
        <div class="flex items-center gap-4 text-xs text-slate-500">
            <span class="flex items-center gap-1"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i> IRB Approved: ${fmtDate(r.irbApprovalDate)}</span>
            ${r.irbRefNo ? `<span class="flex items-center gap-1"><i data-lucide="hash" class="w-3.5 h-3.5"></i> ${esc(r.irbRefNo)}</span>` : ''}
        </div>` : ''}

        <div class="flex items-center gap-2 pt-1 border-t border-slate-100">
            ${canWrite ? `
            <button onclick="openAmendmentForm(${r.id})"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
                <i data-lucide="pencil" class="w-3 h-3"></i> Edit
            </button>` : ''}
            ${canAdvance && nextStatus ? `
            <button onclick="advanceAmendmentStatus(${r.id}, '${nextStatus}')"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold ${btnStyle} rounded-md transition">
                <i data-lucide="arrow-right" class="w-3 h-3"></i> ${btnLabel}
            </button>` : ''}
            ${canWrite ? `
            <button onclick="deleteAmendment(${r.id})"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition ml-auto">
                <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
            </button>` : ''}
        </div>
    </div>`;
}

window.openAmendmentForm = async function(recordId = null) {
    const isEdit = recordId !== null;

    let rec = {};
    if (isEdit) {
        try { rec = await api.request(`/api/amendments/${recordId}`); } catch {}
    }

    showModal({
        title: isEdit ? 'Edit Amendment' : 'Add Protocol Amendment',
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Amendment No. <span class="text-red-500">*</span></label>
                    <input type="text" id="am-no" value="${esc(rec.amendmentNo)}" placeholder="e.g. Amendment 1"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Effective Date <span class="text-red-500">*</span></label>
                    <input type="date" id="am-effective" value="${rec.effectiveDate ? rec.effectiveDate.split('T')[0] : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div>
                <label class="ph-label">Summary <span class="text-red-500">*</span></label>
                <textarea id="am-summary" rows="3" placeholder="Brief summary of this amendment…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(rec.summary)}</textarea>
            </div>
            <div>
                <label class="ph-label">Detailed Changes</label>
                <textarea id="am-changes" rows="4" placeholder="Describe specific protocol changes…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(rec.changes)}</textarea>
            </div>
            <div class="space-y-2">
                <label class="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" id="am-reconsent" ${rec.requiresReconsent ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300" onchange="toggleReconsentReason()">
                    <span class="text-sm font-medium text-slate-700">Requires Subject Re-consent</span>
                </label>
                <div id="am-reconsent-reason-wrap" class="${rec.requiresReconsent ? '' : 'hidden'}">
                    <label class="ph-label">Re-consent Reason</label>
                    <textarea id="am-reconsent-reason" rows="2" placeholder="Explain why re-consent is required…"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(rec.reconsentReason)}</textarea>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">IRB Approval Date</label>
                    <input type="date" id="am-irb-date" value="${rec.irbApprovalDate ? rec.irbApprovalDate.split('T')[0] : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">IRB Reference No.</label>
                    <input type="text" id="am-irb-ref" value="${esc(rec.irbRefNo)}" placeholder="e.g. IRB-2024-001"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            ${isEdit ? `
            <div>
                <label class="ph-label">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="am-rfc" placeholder="Required — explain what changed and why"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none">
            </div>` : ''}
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitAmendmentForm(${recordId})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-4 h-4"></i> ${isEdit ? 'Save Changes' : 'Add Amendment'}
        </button>`,
    });
};

window.toggleReconsentReason = function() {
    const checked = document.getElementById('am-reconsent').checked;
    document.getElementById('am-reconsent-reason-wrap').classList.toggle('hidden', !checked);
};

window.submitAmendmentForm = async function(recordId) {
    const isEdit       = recordId !== null;
    const amendmentNo  = document.getElementById('am-no').value.trim();
    const effectiveDate = document.getElementById('am-effective').value;
    const summary      = document.getElementById('am-summary').value.trim();
    if (!amendmentNo || !effectiveDate || !summary) { showToast('Amendment No., effective date, and summary are required.', 'error'); return; }

    const requiresReconsent = document.getElementById('am-reconsent').checked;

    const payload = {
        amendmentNo,
        effectiveDate,
        summary,
        changes:         document.getElementById('am-changes').value.trim() || null,
        requiresReconsent,
        reconsentReason: requiresReconsent ? (document.getElementById('am-reconsent-reason').value.trim() || null) : null,
        irbApprovalDate: document.getElementById('am-irb-date').value || null,
        irbRefNo:        document.getElementById('am-irb-ref').value.trim() || null,
    };

    if (isEdit) {
        const rfc = document.getElementById('am-rfc')?.value?.trim();
        if (!rfc) { showToast('Reason for change is required.', 'error'); return; }
        payload.reason = rfc;
    }

    try {
        if (isEdit) {
            await api.request(`/api/amendments/${recordId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        } else {
            await api.request('/api/amendments', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeModal();
        showToast(isEdit ? 'Amendment updated.' : 'Amendment added.', 'success');
        await renderAmendments(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.advanceAmendmentStatus = async function(recordId, newStatus) {
    const label = newStatus === 'Approved' ? 'approve this amendment' : 'mark this amendment as implemented';
    if (!confirm(`Confirm: ${label}?`)) return;
    try {
        await api.request(`/api/amendments/${recordId}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
        showToast(`Amendment status updated to ${newStatus}.`, 'success');
        await renderAmendments(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteAmendment = async function(recordId) {
    const reason = prompt('Reason for deletion (required):');
    if (!reason) return;
    try {
        await api.request(`/api/amendments/${recordId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
        showToast('Amendment deleted.', 'success');
        await renderAmendments(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};
