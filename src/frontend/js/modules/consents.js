// ============================================================
// Informed Consent View — UU PDP No. 27/2022 + ICH GCP §4.8
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

const TYPE_STYLE = {
    'Initial':    'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7',
    'Re-consent': 'background:#DBEAFE;color:#1D4ED8;border:1px solid #93C5FD',
    'Withdrawal': 'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA',
};

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDT(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function typeBadge(t) {
    const style = TYPE_STYLE[t] || 'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1';
    return `<span class="badge" style="${style}">${esc(t)}</span>`;
}

export async function renderConsents(filters = {}) {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const user = api.getCurrentUser();
    let consents, stats;
    try {
        [consents, stats] = await Promise.all([
            api.getConsents(filters),
            api.getConsentStats(),
        ]);
    } catch (err) {
        content.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    const canCreate = ['investigator', 'admin'].includes(user.role);
    const withdrawn = consents.filter(c => c.isWithdrawn).length;

    content.innerHTML = `
    <div class="p-5 space-y-4">

        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Informed Consent Records</h2>
                <p class="text-xs text-slate-500 mt-0.5">UU PDP No. 27/2022 Pasal 20-26 — ICH GCP §4.8 consent documentation</p>
            </div>
            ${canCreate ? `
            <button onclick="openConsentForm()"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Record Consent
            </button>` : ''}
        </div>

        <!-- UU PDP Alert -->
        <div class="flex items-start gap-3 p-4 rounded-md border" style="background:#EFF6FF;border-color:#BFDBFE">
            <i data-lucide="shield" class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:#1D4ED8"></i>
            <div class="text-xs" style="color:#1D4ED8">
                <p class="font-semibold mb-0.5">UU Perlindungan Data Pribadi — Data Pribadi Bersifat Spesifik (Pasal 4 ayat 2)</p>
                <p>Health and clinical trial data requires explicit written consent. All consent records are permanently logged in the audit trail. Withdrawal of consent must be recorded and honored immediately.</p>
            </div>
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-3 gap-4">
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Active Subjects Consented</p>
                <p class="kpi-number text-emerald-600">${stats.consented}</p>
                <p class="text-xs text-slate-400 mt-1">of ${stats.totalActive} active</p>
            </div>
            <div class="ph-card p-4 ${stats.unconsented > 0 ? 'border-red-300' : ''}">
                <p class="text-xs font-semibold ${stats.unconsented > 0 ? 'text-red-600' : 'text-slate-500'} uppercase tracking-wide mb-2">Without Consent</p>
                <p class="kpi-number ${stats.unconsented > 0 ? 'text-red-700' : 'text-slate-400'}">${stats.unconsented}</p>
                <p class="text-xs ${stats.unconsented > 0 ? 'text-red-500' : 'text-slate-400'} mt-1">Active subjects missing consent</p>
            </div>
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Withdrawn</p>
                <p class="kpi-number text-slate-500">${withdrawn}</p>
                <p class="text-xs text-slate-400 mt-1">Consent withdrawn records</p>
            </div>
        </div>

        <!-- Filters -->
        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <select id="ic-type-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Types</option>
                    <option>Initial</option>
                    <option>Re-consent</option>
                    <option>Withdrawal</option>
                </select>
                <select id="ic-lang-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Languages</option>
                    <option>Indonesian</option>
                    <option>English</option>
                </select>
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="ic-search" placeholder="Search by subject or consent version…"
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
                            <th class="text-left">Type</th>
                            <th class="text-left">Version</th>
                            <th class="text-left">Date Signed</th>
                            <th class="text-left">Language / Witness</th>
                            <th class="text-left">Withdrawn</th>
                            <th class="text-left">Recorded By</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="ic-tbody" class="ph-table-body">
                        ${renderConsentRows(consents, user)}
                    </tbody>
                </table>
            </div>
            <div id="ic-empty" class="${consents.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="file-check" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No consent records found.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    function filterIC() {
        const type   = document.getElementById('ic-type-filter').value;
        const lang   = document.getElementById('ic-lang-filter').value;
        const search = document.getElementById('ic-search').value.toLowerCase();
        let filtered = consents;
        if (type)   filtered = filtered.filter(c => c.consentType === type);
        if (lang)   filtered = filtered.filter(c => c.language === lang);
        if (search) filtered = filtered.filter(c =>
            c.subjectCode?.toLowerCase().includes(search) ||
            c.consentVersion?.toLowerCase().includes(search)
        );
        document.getElementById('ic-tbody').innerHTML = renderConsentRows(filtered, user);
        document.getElementById('ic-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('ic-type-filter').addEventListener('change', filterIC);
    document.getElementById('ic-lang-filter').addEventListener('change', filterIC);
    document.getElementById('ic-search').addEventListener('input', filterIC);
}

function renderConsentRows(consents, user) {
    if (!consents.length) return '';
    return consents.map(c => {
        const canWithdraw = ['investigator','admin'].includes(user.role) && !c.isWithdrawn && c.consentType !== 'Withdrawal';

        return `<tr class="${c.isWithdrawn ? 'opacity-60' : ''}">
            <td class="text-xs text-slate-400 font-mono">#${c.id}</td>
            <td>
                <p class="text-xs font-semibold font-mono text-slate-800">${esc(c.subjectCode)}</p>
            </td>
            <td>${typeBadge(c.consentType)}</td>
            <td>
                <code class="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">${esc(c.consentVersion)}</code>
            </td>
            <td class="text-xs text-slate-700 whitespace-nowrap">${fmtDate(c.consentDate)}</td>
            <td>
                <p class="text-xs text-slate-600">${esc(c.language)}</p>
                ${c.witnessName ? `<p class="text-xs text-slate-400">Witness: ${esc(c.witnessName)}</p>` : ''}
            </td>
            <td class="text-xs whitespace-nowrap">
                ${c.isWithdrawn
                    ? `<span class="badge" style="background:#FEE2E2;color:#991B1B;border:1px solid #FECACA">Withdrawn</span>
                       <p class="text-xs text-slate-400 mt-0.5">${fmtDate(c.withdrawnAt)}</p>`
                    : `<span class="text-emerald-600 text-xs font-medium">Active</span>`}
            </td>
            <td>
                <p class="text-xs text-slate-600">${esc(c.createdByName)}</p>
                <p class="text-xs text-slate-400">${fmtDT(c.createdAt)}</p>
            </td>
            <td class="text-right">
                ${canWithdraw ? `
                <button onclick="openWithdrawModal(${c.id})"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition border border-red-200">
                    <i data-lucide="x" class="w-3 h-3"></i> Withdraw
                </button>` : ''}
            </td>
        </tr>`;
    }).join('');
}

window.openConsentForm = function(prefillSubjectCode = '') {
    showModal({
        title: 'Record Informed Consent',
        size: 'md',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#EFF6FF;border-color:#BFDBFE;color:#1D4ED8">
                <i data-lucide="shield" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                UU PDP Pasal 22: informed consent must be documented before any personal health data is collected or processed.
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Subject Code <span class="text-red-500">*</span></label>
                    <input type="text" id="ic-subject" value="${esc(prefillSubjectCode)}" placeholder="e.g. SITE01-001"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Consent Type <span class="text-red-500">*</span></label>
                    <select id="ic-type" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option>Initial</option>
                        <option>Re-consent</option>
                        <option>Withdrawal</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">ICF Version <span class="text-red-500">*</span></label>
                    <input type="text" id="ic-version" placeholder="e.g. v2.1 dated 2025-01-15"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Date Signed <span class="text-red-500">*</span></label>
                    <input type="date" id="ic-date" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Language</label>
                    <select id="ic-language" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option>Indonesian</option>
                        <option>English</option>
                        <option>Other</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Witness Name</label>
                    <input type="text" id="ic-witness" placeholder="Name of consent witness (if applicable)"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Notes</label>
                <textarea id="ic-notes" rows="2" placeholder="Any relevant notes about consent process…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitConsentForm()" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="file-check" class="w-4 h-4"></i> Record Consent
        </button>`,
    });
};

window.submitConsentForm = async function() {
    const subjectCode = document.getElementById('ic-subject').value.trim();
    const version     = document.getElementById('ic-version').value.trim();
    const date        = document.getElementById('ic-date').value;

    if (!subjectCode || !version || !date) {
        showToast('Subject code, ICF version, and date are required.', 'error'); return;
    }

    let subjectId;
    try {
        const subjects = await api.getSubjects({ search: subjectCode });
        const match = subjects.find(s => s.subject_code === subjectCode);
        if (!match) { showToast(`Subject "${subjectCode}" not found.`, 'error'); return; }
        subjectId = match.id;
    } catch { showToast('Could not resolve subject.', 'error'); return; }

    try {
        await api.createConsent({
            subjectId,
            consentVersion: version,
            consentDate:    date,
            consentType:    document.getElementById('ic-type').value,
            language:       document.getElementById('ic-language').value,
            witnessName:    document.getElementById('ic-witness').value.trim() || null,
            notes:          document.getElementById('ic-notes').value.trim()   || null,
        });
        closeModal();
        showToast('Informed consent recorded.', 'success');
        await renderConsents();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.openWithdrawModal = function(consentId) {
    showModal({
        title: 'Record Consent Withdrawal',
        size: 'md',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B">
                <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                UU PDP Pasal 26: Subject has the right to withdraw consent at any time. Upon withdrawal, further data processing must cease immediately.
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Reason for Withdrawal <span class="text-red-500">*</span></label>
                <textarea id="ic-withdraw-reason" rows="3" placeholder="Document the subject's stated reason for withdrawing consent…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitWithdrawal(${consentId})" class="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="x" class="w-4 h-4"></i> Record Withdrawal
        </button>`,
    });
};

window.submitWithdrawal = async function(consentId) {
    const reason = document.getElementById('ic-withdraw-reason').value.trim();
    if (!reason) { showToast('Withdrawal reason is required.', 'error'); return; }
    try {
        await api.withdrawConsent(consentId, reason);
        closeModal();
        showToast('Consent withdrawal recorded.', 'success');
        await renderConsents();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Inline section: render consent tab within subject detail
export async function renderSubjectConsentSection(subjectId, container) {
    container.innerHTML = SPINNER;
    try {
        const consents = await api.getConsents({ subjectId });
        const user = api.getCurrentUser();
        const canCreate = ['investigator','admin'].includes(user.role);

        container.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <p class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Consent Records</p>
                ${canCreate ? `<button onclick="openConsentForm()" class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition border border-blue-200">
                    <i data-lucide="plus" class="w-3 h-3"></i> Add
                </button>` : ''}
            </div>
            ${consents.length === 0
                ? `<p class="text-xs text-red-600 font-medium flex items-center gap-1.5">
                    <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>
                    No informed consent on record — UU PDP compliance risk
                   </p>`
                : consents.map(c => `
                <div class="flex items-start justify-between gap-3 p-3 border border-slate-200 rounded-md ${c.isWithdrawn ? 'opacity-60 bg-red-50' : 'bg-white'}">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            ${typeBadge(c.consentType)}
                            <code class="text-xs text-slate-500">${esc(c.consentVersion)}</code>
                        </div>
                        <p class="text-xs text-slate-600">${esc(c.language)} · Signed ${esc(c.consentDate)}</p>
                        ${c.witnessName ? `<p class="text-xs text-slate-400">Witness: ${esc(c.witnessName)}</p>` : ''}
                        ${c.isWithdrawn ? `<p class="text-xs text-red-600 font-medium">Withdrawn ${fmtDate(c.withdrawnAt)}: ${esc(c.withdrawnReason)}</p>` : ''}
                    </div>
                    ${!c.isWithdrawn && canCreate
                        ? `<button onclick="openWithdrawModal(${c.id})" class="flex-shrink-0 p-1 text-red-400 hover:text-red-700 rounded" title="Record withdrawal">
                            <i data-lucide="x-circle" class="w-3.5 h-3.5"></i>
                           </button>`
                        : ''}
                </div>`).join('')}
        </div>`;
        lucide.createIcons();
    } catch (err) {
        container.innerHTML = `<p class="text-xs text-red-600">${esc(err.message)}</p>`;
    }
}
