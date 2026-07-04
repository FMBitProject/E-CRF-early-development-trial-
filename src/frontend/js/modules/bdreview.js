// ============================================================
// Blind Data Review (BDR) — pre-lock data review checklist
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

export async function renderBDReview(container) {
    container.innerHTML = SPINNER;
    const user = api.getCurrentUser();
    const canManage = ['admin', 'cra', 'pi', 'data_manager'].includes(user?.role);

    let bdrStatus = null;
    let lockStatus = null;
    let history    = [];
    let counts     = { queries: 0, openDeviations: 0, pendingSAE: 0 };

    try {
        lockStatus = await api.request('/api/dblock');
    } catch { lockStatus = null; }

    try {
        bdrStatus = await api.request('/api/bdreview/active');
    } catch { bdrStatus = null; }

    try {
        history = await api.request('/api/bdreview/history');
    } catch { history = []; }

    try {
        const q = await api.getQueries({ status: 'Open' });
        counts.queries = q.length;
    } catch {}
    try {
        const devs = await api.getDeviations({ status: 'Open' });
        counts.openDeviations = devs.length;
    } catch {}
    try {
        const aes = await api.getAdverseEvents({ serious: true, status: 'Draft' });
        counts.pendingSAE = aes.length;
    } catch {}

    const lockBadge = lockStatus?.status === 'Locked'
        ? `<span class="badge" style="background:#7F1D1D;color:#FCA5A5;border:1px solid #DC2626">DB Locked</span>`
        : lockStatus?.status === 'Initiated'
        ? `<span class="badge" style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A">Lock In Progress</span>`
        : `<span class="badge" style="background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7">Database Open</span>`;

    const bdrCompleted = bdrStatus?.status === 'Completed';
    const bdrActive    = bdrStatus && bdrStatus.status === 'In Progress';

    container.innerHTML = `
    <div class="p-5 space-y-5">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Blind Data Review</h2>
                <p class="text-xs text-slate-500 mt-0.5">Pre-lock review checklist — must be completed before database lock</p>
            </div>
            <div class="flex items-center gap-2">
                ${lockBadge}
                ${bdrCompleted
                    ? `<a href="#dblock" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shadow-sm">
                           Proceed to DB Lock <i data-lucide="arrow-right" class="w-4 h-4"></i>
                       </a>`
                    : ''}
            </div>
        </div>

        ${!bdrActive && !bdrCompleted ? `
        <div class="ph-card p-8 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-200">
            <i data-lucide="clipboard-check" class="w-12 h-12 text-slate-300"></i>
            <div class="text-center">
                <p class="text-sm font-semibold text-slate-700">No active Blind Data Review</p>
                <p class="text-xs text-slate-400 mt-1">Initiate a BDR to begin the pre-lock checklist process</p>
            </div>
            ${canManage ? `
            <button onclick="initiateBDR()"
                class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="play-circle" class="w-4 h-4"></i> Initiate Blind Data Review
            </button>` : ''}
        </div>` : ''}

        ${bdrActive || bdrCompleted ? `
        <div class="ph-card p-4 space-y-1">
            <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-slate-700">BDR ${bdrCompleted ? 'Completed' : 'In Progress'}</p>
                ${bdrStatus?.createdAt ? `<p class="text-xs text-slate-400">Started: ${fmtDate(bdrStatus.createdAt)}</p>` : ''}
            </div>
            ${bdrStatus?.completedAt ? `<p class="text-xs text-slate-500">Completed: ${fmtDate(bdrStatus.completedAt)}</p>` : ''}
        </div>

        <div class="space-y-3" id="bdr-checklist">
            ${checklistSection(1, 'queries-check', 'Outstanding Queries',
                `${counts.queries} open ${counts.queries === 1 ? 'query' : 'queries'}`,
                'All queries resolved or documented', counts.queries === 0,
                bdrStatus?.checks?.queriesResolved, bdrCompleted)}
            ${checklistSection(2, 'missing-data-check', 'Missing Critical Data',
                'Review all required fields',
                'No critical data fields missing', true,
                bdrStatus?.checks?.missingDataCleared, bdrCompleted)}
            ${checklistSection(3, 'deviations-check', 'Protocol Deviations',
                `${counts.openDeviations} open ${counts.openDeviations === 1 ? 'deviation' : 'deviations'}`,
                'All deviations reviewed', counts.openDeviations === 0,
                bdrStatus?.checks?.deviationsReviewed, bdrCompleted)}
            ${checklistSection(4, 'sae-check', 'SAE Status',
                `${counts.pendingSAE} pending SAE ${counts.pendingSAE === 1 ? 'report' : 'reports'}`,
                'All SAEs reported and followed up', counts.pendingSAE === 0,
                bdrStatus?.checks?.saeReviewed, bdrCompleted)}
            ${checklistSection(5, 'audit-check', 'Audit Trail Review',
                'Verify completeness of audit records',
                'Audit trail reviewed and complete', false,
                bdrStatus?.checks?.auditReviewed, bdrCompleted)}
            ${checklistSection(6, 'freeze-check', 'Database Freeze Readiness',
                'Confirm all sites have completed data entry',
                'All sites confirm data entry complete', false,
                bdrStatus?.checks?.freezeReady, bdrCompleted)}
        </div>

        ${!bdrCompleted && canManage ? `
        <div class="flex justify-end">
            <button id="bdr-complete-btn" onclick="completeBDR(${bdrStatus?.id})"
                class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                disabled>
                <i data-lucide="check-circle" class="w-4 h-4"></i> Complete Blind Data Review
            </button>
        </div>` : ''}` : ''}

        ${history.length > 0 ? `
        <div class="ph-card overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-100">
                <p class="text-sm font-semibold text-slate-700">BDR History</p>
            </div>
            <div class="divide-y divide-slate-100">
                ${history.map(h => `
                <div class="px-4 py-3 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold text-slate-700">BDR #${h.id}</p>
                        <p class="text-xs text-slate-400">${fmtDate(h.createdAt)} – ${fmtDate(h.completedAt)}</p>
                    </div>
                    <span class="badge" style="background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7">Completed</span>
                </div>`).join('')}
            </div>
        </div>` : ''}
    </div>`;

    lucide.createIcons();

    if (bdrActive) {
        const checkboxes = container.querySelectorAll('.bdr-item-check');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => updateBDRCompleteBtn());
        });
        updateBDRCompleteBtn();
    }
}

function checklistSection(num, id, title, subtitle, label, isGreen, checked, disabled) {
    const countStyle = isGreen
        ? 'text-emerald-600 bg-emerald-50 border border-emerald-200'
        : 'text-amber-700 bg-amber-50 border border-amber-200';
    return `
    <div class="ph-card p-4">
        <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span class="text-xs font-bold text-blue-700">${num}</span>
            </div>
            <div class="flex-1 space-y-2">
                <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-semibold text-slate-800">${title}</p>
                    <span class="text-xs px-2 py-0.5 rounded-full ${countStyle}">${subtitle}</span>
                </div>
                <label class="flex items-center gap-2.5 cursor-pointer ${disabled ? 'cursor-default' : ''}">
                    <input type="checkbox" id="${id}" class="bdr-item-check w-4 h-4 rounded border-slate-300"
                        ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
                    <span class="text-sm text-slate-700">${label}</span>
                </label>
            </div>
        </div>
    </div>`;
}

function updateBDRCompleteBtn() {
    const checkboxes = document.querySelectorAll('.bdr-item-check:not([disabled])');
    const allChecked = [...checkboxes].every(cb => cb.checked);
    const btn = document.getElementById('bdr-complete-btn');
    if (btn) btn.disabled = !allChecked;
}

window.initiateBDR = async function() {
    showModal({
        title: 'Initiate Blind Data Review',
        size: 'md',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#EBF2FD;border-color:#BFD7F5;color:#1554A0">
                <i data-lucide="info" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                Initiating a Blind Data Review (BDR) signals the start of the pre-lock review process. All team members should complete data entry before proceeding to database lock.
            </div>
            <div>
                <label class="ph-label">Notes (optional)</label>
                <textarea id="bdr-notes" rows="3" placeholder="Any special instructions or context for this review…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitInitiateBDR()" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="play-circle" class="w-4 h-4"></i> Initiate BDR
        </button>`,
    });
};

window.submitInitiateBDR = async function() {
    const notes = document.getElementById('bdr-notes').value.trim();
    try {
        await api.request('/api/bdreview', { method: 'POST', body: JSON.stringify({ notes: notes || null }) });
        closeModal();
        showToast('Blind Data Review initiated.', 'success');
        await renderBDReview(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.completeBDR = async function(bdrId) {
    const checkboxes = [...document.querySelectorAll('.bdr-item-check')];
    const checks = {
        queriesResolved:  document.getElementById('queries-check')?.checked  || false,
        missingDataCleared: document.getElementById('missing-data-check')?.checked || false,
        deviationsReviewed: document.getElementById('deviations-check')?.checked || false,
        saeReviewed:      document.getElementById('sae-check')?.checked      || false,
        auditReviewed:    document.getElementById('audit-check')?.checked    || false,
        freezeReady:      document.getElementById('freeze-check')?.checked   || false,
    };
    if (!Object.values(checks).every(Boolean)) {
        showToast('All checklist items must be ticked before completing the BDR.', 'error');
        return;
    }
    if (!confirm('Complete this Blind Data Review? This will enable database lock.')) return;
    try {
        await api.request(`/api/bdreview/${bdrId}/complete`, { method: 'PATCH', body: JSON.stringify({ checks }) });
        showToast('Blind Data Review completed. Database lock is now available.', 'success');
        await renderBDReview(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};
