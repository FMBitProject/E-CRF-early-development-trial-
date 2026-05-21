// ============================================================
// Adverse Events / SAE View — ICH E2A / GCP pharmacovigilance
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

const SEVERITY_BADGE = {
    Mild:             'badge' ,
    Moderate:         'badge badge-saved',
    Severe:           'badge badge-open',
    'Life-threatening': 'badge' ,
    Fatal:            'badge badge-withdrawn',
};
const SEVERITY_STYLE = {
    Mild:               'background:#F0FDF4;color:#166534;border:1px solid #BBF7D0',
    Moderate:           'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A',
    Severe:             'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA',
    'Life-threatening': 'background:#7C3AED20;color:#5B21B6;border:1px solid #DDD6FE',
    Fatal:              'background:#1F2937;color:#F9FAFB;border:1px solid #4B5563',
};

const STATUS_STYLE = {
    Draft:    'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1',
    Reported: 'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7',
    Closed:   'background:#E0E7FF;color:#3730A3;border:1px solid #C7D2FE',
};

const SERIOUS_CRITERIA_OPTIONS = [
    { value: 'death',          label: 'Results in Death' },
    { value: 'life_threatening', label: 'Life-Threatening' },
    { value: 'hospitalization', label: 'Requires Hospitalization / Prolongation' },
    { value: 'disability',     label: 'Persistent/Significant Disability' },
    { value: 'congenital',     label: 'Congenital Anomaly / Birth Defect' },
    { value: 'medically_important', label: 'Other Medically Important Condition' },
];

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

function severityBadge(sev) {
    const style = SEVERITY_STYLE[sev] || 'background:#F1F5F9;color:#475569';
    return `<span class="badge" style="${style}">${esc(sev)}</span>`;
}
function statusBadge(s) {
    const style = STATUS_STYLE[s] || STATUS_STYLE.Draft;
    return `<span class="badge" style="${style}">${esc(s)}</span>`;
}

function deadlineBadge(ae) {
    if (!ae.requiresExpeditedReport || ae.reportStatus === 'Closed') return '';
    if (!ae.expeditedDeadline) return '';
    const now  = new Date();
    const dead = new Date(ae.expeditedDeadline);
    const daysLeft = Math.ceil((dead - now) / 86400000);
    if (daysLeft < 0) {
        return `<span class="badge ml-1" style="background:#7F1D1D;color:#FCA5A5;border:1px solid #DC2626">OVERDUE ${Math.abs(daysLeft)}d</span>`;
    }
    if (daysLeft <= 2) {
        return `<span class="badge ml-1" style="background:#FEF3C7;color:#92400E;border:1px solid #FCD34D">${daysLeft}d left</span>`;
    }
    return `<span class="badge ml-1" style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE">${daysLeft}d left</span>`;
}

export async function renderAdverseEvents(filters = {}) {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const user = api.getCurrentUser();
    let aes;
    try {
        aes = await api.getAdverseEvents(filters);
    } catch (err) {
        content.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    const total   = aes.length;
    const serious = aes.filter(a => a.isSerious).length;
    const draft   = aes.filter(a => a.reportStatus === 'Draft').length;
    const overdue = aes.filter(a => {
        if (!a.requiresExpeditedReport || a.reportStatus === 'Closed' || !a.expeditedDeadline) return false;
        return new Date(a.expeditedDeadline) < new Date();
    }).length;

    const canCreate = ['investigator', 'admin'].includes(user.role);

    content.innerHTML = `
    <div class="p-5 space-y-4">

        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Adverse Events / SAE</h2>
                <p class="text-xs text-slate-500 mt-0.5">ICH E2A pharmacovigilance reporting — expedited SAE timelines enforced</p>
            </div>
            <div class="flex gap-2">
                ${canCreate ? `
                <button onclick="openAEForm()"
                    class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                    <i data-lucide="plus" class="w-4 h-4"></i> Report AE/SAE
                </button>` : ''}
            </div>
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total AEs</p>
                <p class="kpi-number text-slate-700">${total}</p>
            </div>
            <div class="ph-card p-4 cursor-pointer" onclick="aeFilter('serious')">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">SAE</p>
                <p class="kpi-number text-red-700">${serious}</p>
                <p class="text-xs text-slate-400 mt-1">Serious events</p>
            </div>
            <div class="ph-card p-4 cursor-pointer" onclick="aeFilter('draft')">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Unreported</p>
                <p class="kpi-number text-amber-600">${draft}</p>
                <p class="text-xs text-slate-400 mt-1">Draft / pending</p>
            </div>
            <div class="ph-card p-4 ${overdue > 0 ? 'border-red-300 bg-red-50' : ''}">
                <p class="text-xs font-semibold ${overdue > 0 ? 'text-red-600' : 'text-slate-500'} uppercase tracking-wide mb-2">Overdue</p>
                <p class="kpi-number ${overdue > 0 ? 'text-red-700' : 'text-slate-400'}">${overdue}</p>
                <p class="text-xs ${overdue > 0 ? 'text-red-500' : 'text-slate-400'} mt-1">Expedited report past deadline</p>
            </div>
        </div>

        <!-- Filter Bar -->
        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <select id="ae-status-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Reported">Reported</option>
                    <option value="Closed">Closed</option>
                </select>
                <select id="ae-serious-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Events</option>
                    <option value="true">SAE Only</option>
                    <option value="false">Non-Serious Only</option>
                </select>
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="ae-search" placeholder="Search by subject or AE term…"
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
                            <th class="text-left">AE Term / MedDRA PT</th>
                            <th class="text-left">Severity</th>
                            <th class="text-left">Onset</th>
                            <th class="text-left">Deadline</th>
                            <th class="text-left">Status</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="ae-tbody" class="ph-table-body">
                        ${renderAERows(aes, user)}
                    </tbody>
                </table>
            </div>
            <div id="ae-empty" class="${aes.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="activity" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No adverse events recorded.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    window.aeFilter = function(type) {
        if (type === 'serious') document.getElementById('ae-serious-filter').value = 'true';
        if (type === 'draft')   document.getElementById('ae-status-filter').value  = 'Draft';
        filterAEs();
    };

    function filterAEs() {
        const status  = document.getElementById('ae-status-filter').value;
        const serious = document.getElementById('ae-serious-filter').value;
        const search  = document.getElementById('ae-search').value.toLowerCase();
        let filtered  = aes;
        if (status)  filtered = filtered.filter(a => a.reportStatus === status);
        if (serious === 'true')  filtered = filtered.filter(a => a.isSerious);
        if (serious === 'false') filtered = filtered.filter(a => !a.isSerious);
        if (search)  filtered = filtered.filter(a =>
            a.aeTerm?.toLowerCase().includes(search) ||
            a.subjectCode?.toLowerCase().includes(search) ||
            a.meddraPt?.toLowerCase().includes(search)
        );
        document.getElementById('ae-tbody').innerHTML = renderAERows(filtered, user);
        document.getElementById('ae-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('ae-status-filter').addEventListener('change', filterAEs);
    document.getElementById('ae-serious-filter').addEventListener('change', filterAEs);
    document.getElementById('ae-search').addEventListener('input', filterAEs);
}

function renderAERows(aes, user) {
    if (!aes.length) return '';
    return aes.map(ae => {
        const canEdit    = ['investigator','admin'].includes(user.role) && ae.reportStatus !== 'Closed';
        const canReport  = ['investigator','admin'].includes(user.role) && ae.isSerious && ae.reportStatus === 'Draft';
        const canClose   = ['cra','admin'].includes(user.role) && ae.reportStatus === 'Reported';
        const saeTag     = ae.isSerious ? `<span class="badge ml-1" style="background:#FEE2E2;color:#991B1B;border:1px solid #FECACA;font-weight:700">SAE</span>` : '';

        return `<tr>
            <td class="text-xs text-slate-400 font-mono">#${ae.id}</td>
            <td>
                <p class="text-xs font-semibold font-mono text-slate-800">${esc(ae.subjectCode)}</p>
                <p class="text-xs text-slate-400">${esc(ae.createdByName)}</p>
            </td>
            <td>
                <div class="flex items-center gap-1 flex-wrap">
                    <p class="text-xs font-medium text-slate-800">${esc(ae.aeTerm)}</p>
                    ${saeTag}
                </div>
                ${ae.meddraPt ? `<p class="text-xs text-slate-400 mt-0.5 font-mono">PT: ${esc(ae.meddraPt)}${ae.meddraPtCode ? ` (${esc(ae.meddraPtCode)})` : ''}</p>` : ''}
                ${ae.meddraSoc ? `<p class="text-xs text-slate-400 font-mono">SOC: ${esc(ae.meddraSoc)}</p>` : ''}
                ${{Coded:'<span class="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Coded</span>','Pending Review':'<span class="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Pending Review</span>','Uncoded':'<span class="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">Uncoded</span>'}[ae.codingStatus] ?? ''}
            </td>
            <td>${severityBadge(ae.severity)}</td>
            <td class="text-xs text-slate-600 whitespace-nowrap">${fmtDate(ae.onsetDate)}</td>
            <td class="text-xs whitespace-nowrap">
                ${ae.requiresExpeditedReport
                    ? `<span class="text-slate-500">${fmtDate(ae.expeditedDeadline)}</span>${deadlineBadge(ae)}`
                    : '<span class="text-slate-300">—</span>'}
            </td>
            <td>${statusBadge(ae.reportStatus)}</td>
            <td class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                    <button onclick="openRowInlineQuery(${ae.subjectId}, null, 'adverse_event', 'AE: ${esc(ae.aeTerm || '')}')"
                        class="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded transition" title="Raise Query">
                        <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                    </button>
                    ${canEdit ? `<button onclick="openAEForm(${ae.id})"
                        class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition" title="Edit">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                    ${canReport ? `<button onclick="openReportModal(${ae.id})"
                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition border border-emerald-200">
                        <i data-lucide="send" class="w-3 h-3"></i> Report
                    </button>` : ''}
                    ${canClose ? `<button onclick="closeAE(${ae.id})"
                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
                        <i data-lucide="x-circle" class="w-3 h-3"></i> Close
                    </button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.openAEForm = function(aeId = null) {
    const isEdit = aeId !== null;
    const title  = isEdit ? 'Edit Adverse Event' : 'Report Adverse Event / SAE';

    showModal({
        title,
        size: 'lg',
        body: `
        <div class="space-y-4">
            ${isEdit ? `
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#FEF3C7;border-color:#FDE68A;color:#92400E">
                <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                ICH GCP: reason for change is required when editing clinical data.
            </div>` : `
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#EBF2FD;border-color:#BFD7F5;color:#1554A0">
                <i data-lucide="info" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                SAEs must be reported to Sponsor within 7 days (fatal/life-threatening) or 15 days (other serious). Non-serious AEs are tracked for safety surveillance.
            </div>`}

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Subject Code <span class="text-red-500">*</span></label>
                    <input type="text" id="ae-subject" placeholder="e.g. SITE01-001"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">AE Verbatim Term <span class="text-red-500">*</span></label>
                    <input type="text" id="ae-term" placeholder="As reported by subject/investigator"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>

            <!-- MedDRA Structured Coding Panel -->
            <div class="border border-blue-100 bg-blue-50/60 rounded-xl p-3 space-y-2">
                <div class="flex items-center justify-between mb-1">
                    <p class="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                        <i data-lucide="code-2" class="w-3.5 h-3.5"></i> MedDRA Medical Coding
                    </p>
                    <div class="flex items-center gap-2">
                        <select id="ae-coding-status" class="text-xs border border-blue-200 rounded-md px-2 py-0.5 bg-white text-blue-700 font-medium">
                            <option value="Uncoded">Uncoded</option>
                            <option value="Coded">Coded</option>
                            <option value="Pending Review">Pending Review</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Preferred Term (PT)</label>
                        <input type="text" id="ae-meddra-pt" placeholder="e.g. Headache"
                            class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">PT Code</label>
                        <input type="text" id="ae-meddra-pt-code" placeholder="e.g. 10019211"
                            class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none font-mono">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">System Organ Class (SOC)</label>
                        <input type="text" id="ae-meddra-soc" placeholder="e.g. Nervous system disorders"
                            class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">SOC Code</label>
                        <input type="text" id="ae-meddra-soc-code" placeholder="e.g. 10029205"
                            class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none font-mono">
                    </div>
                </div>
                <div class="w-40">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">MedDRA Version</label>
                    <input type="text" id="ae-meddra-version" placeholder="e.g. 26.1"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <p class="text-xs text-blue-500 italic">MedDRA is a registered trademark of ICH. Coding requires a valid MedDRA license and trained medical coder.</p>
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Onset Date</label>
                    <input type="date" id="ae-onset" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Resolution Date</label>
                    <input type="date" id="ae-resolution" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Outcome</label>
                    <select id="ae-outcome" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option>Recovered/Resolved</option>
                        <option>Recovering/Resolving</option>
                        <option>Not Recovered/Not Resolved</option>
                        <option>Fatal</option>
                        <option>Unknown</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Severity (CTCAE) <span class="text-red-500">*</span></label>
                    <select id="ae-severity" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option>Mild</option>
                        <option>Moderate</option>
                        <option>Severe</option>
                        <option>Life-threatening</option>
                        <option>Fatal</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Causality</label>
                    <select id="ae-causality" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option>Related</option>
                        <option>Probably Related</option>
                        <option>Possibly Related</option>
                        <option>Unlikely Related</option>
                        <option>Not Related</option>
                        <option>Unknown</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Action Taken</label>
                    <select id="ae-action" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option>None</option>
                        <option>Dose Reduced</option>
                        <option>Drug Interrupted</option>
                        <option>Drug Withdrawn</option>
                        <option>Not Applicable</option>
                        <option>Unknown</option>
                    </select>
                </div>
            </div>

            <!-- Serious Event Section -->
            <div class="border border-red-200 rounded-md overflow-hidden">
                <div class="flex items-center gap-3 px-4 py-3 bg-red-50 border-b border-red-200">
                    <input type="checkbox" id="ae-is-serious" class="w-4 h-4 rounded border-slate-300 text-red-600">
                    <label for="ae-is-serious" class="text-sm font-semibold text-red-800">This is a Serious Adverse Event (SAE)</label>
                </div>
                <div id="sae-criteria-panel" class="hidden p-4 space-y-2 bg-red-50/50">
                    <p class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">SAE Criteria (check all that apply) <span class="text-red-500">*</span></p>
                    ${SERIOUS_CRITERIA_OPTIONS.map(c => `
                    <label class="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" name="sae-criteria" value="${c.value}" class="w-3.5 h-3.5 rounded border-slate-300 text-red-600">
                        ${esc(c.label)}
                    </label>`).join('')}
                </div>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Narrative / Description</label>
                <textarea id="ae-narrative" rows="3" placeholder="Clinical narrative describing the event, context, and management…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>

            ${isEdit ? `
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="ae-rfc" placeholder="Required — explain what changed and why"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none">
            </div>` : ''}
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitAEForm(${aeId})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-4 h-4"></i> ${isEdit ? 'Save Changes' : 'Submit Report'}
        </button>`,
    });

    // Toggle SAE criteria panel
    document.getElementById('ae-is-serious').addEventListener('change', function() {
        document.getElementById('sae-criteria-panel').classList.toggle('hidden', !this.checked);
    });

    // Pre-fill if editing
    if (isEdit) {
        const ae = _aes.find(a => a.id === aeId);
        if (ae) {
            const set = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
            set('ae-subject',       ae.subjectCode);
            set('ae-term',          ae.aeTerm);
            set('ae-meddra-pt',     ae.meddraPt);
            set('ae-meddra-pt-code',ae.meddraPtCode);
            set('ae-meddra-soc',    ae.meddraSoc);
            set('ae-meddra-soc-code',ae.meddraSocCode);
            set('ae-meddra-version',ae.meddraVersion);
            set('ae-coding-status', ae.codingStatus ?? 'Uncoded');
            set('ae-onset',         ae.onsetDate);
            set('ae-resolution',    ae.resolutionDate);
            set('ae-outcome',       ae.outcome);
            set('ae-severity',      ae.severity);
            set('ae-causality',     ae.causality);
            set('ae-action',        ae.actionTaken);
            set('ae-narrative',     ae.narrative);
            if (ae.isSerious) {
                document.getElementById('ae-is-serious').checked = true;
                document.getElementById('sae-criteria-panel').classList.remove('hidden');
                (ae.seriousCriteria ?? []).forEach(v => {
                    const cb = document.querySelector(`input[name="sae-criteria"][value="${v}"]`);
                    if (cb) cb.checked = true;
                });
            }
        }
    }
};

window.submitAEForm = async function(aeId) {
    const isEdit   = aeId !== null;
    const subjectEl = document.getElementById('ae-subject');
    const term      = document.getElementById('ae-term').value.trim();
    const severity  = document.getElementById('ae-severity').value;
    const isSerious = document.getElementById('ae-is-serious').checked;

    if (!term || !severity) {
        showToast('AE term and severity are required.', 'error'); return;
    }
    if (isSerious) {
        const criteria = [...document.querySelectorAll('input[name="sae-criteria"]:checked')].map(c => c.value);
        if (criteria.length === 0) { showToast('Select at least one SAE seriousness criterion.', 'error'); return; }
    }

    const seriousCriteria = [...document.querySelectorAll('input[name="sae-criteria"]:checked')].map(c => c.value);

    // Resolve subjectId from subjectCode
    let subjectId = null;
    if (!isEdit) {
        const subjectCode = subjectEl?.value?.trim();
        if (!subjectCode) { showToast('Subject code is required.', 'error'); return; }
        try {
            const subjects = await api.getSubjects({ search: subjectCode });
            const match = subjects.find(s => s.subject_code === subjectCode);
            if (!match) { showToast(`Subject "${subjectCode}" not found.`, 'error'); return; }
            subjectId = match.id;
        } catch { showToast('Could not resolve subject.', 'error'); return; }
    }

    const payload = {
        subjectId,
        aeTerm:        term,
        meddraPt:       document.getElementById('ae-meddra-pt')?.value.trim()       || null,
        meddraPtCode:   document.getElementById('ae-meddra-pt-code')?.value.trim()  || null,
        meddraSoc:      document.getElementById('ae-meddra-soc')?.value.trim()      || null,
        meddraSocCode:  document.getElementById('ae-meddra-soc-code')?.value.trim() || null,
        meddraVersion:  document.getElementById('ae-meddra-version')?.value.trim()  || null,
        codingStatus:   document.getElementById('ae-coding-status')?.value          || 'Uncoded',
        onsetDate:     document.getElementById('ae-onset').value      || null,
        resolutionDate:document.getElementById('ae-resolution').value || null,
        outcome:       document.getElementById('ae-outcome').value    || null,
        severity,
        isSerious,
        seriousCriteria,
        causality:     document.getElementById('ae-causality').value  || null,
        actionTaken:   document.getElementById('ae-action').value     || null,
        narrative:     document.getElementById('ae-narrative').value.trim() || null,
    };

    if (isEdit) {
        const rfc = document.getElementById('ae-rfc')?.value?.trim();
        if (!rfc) { showToast('Reason for change is required.', 'error'); return; }
        payload.reason = rfc;
    }

    try {
        if (isEdit) {
            await api.updateAdverseEvent(aeId, payload);
            showToast('Adverse event updated.', 'success');
        } else {
            await api.createAdverseEvent(payload);
            showToast(isSerious ? 'SAE recorded. Expedited reporting deadline set.' : 'Adverse event recorded.', 'success');
        }
        closeModal();
        await renderAdverseEvents();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.openReportModal = function(aeId) {
    showModal({
        title: 'Submit Expedited SAE Report',
        size: 'md',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B">
                <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                ICH E2A: SAEs must be reported within 7 days (fatal/life-threatening) or 15 days (other criteria). Confirm reporting below.
            </div>
            <div class="space-y-2">
                <label class="flex items-center gap-3 p-3 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" id="rpt-sponsor" class="w-4 h-4">
                    <div>
                        <p class="text-sm font-medium text-slate-700">Reported to Sponsor</p>
                        <p class="text-xs text-slate-400">Confirm expedited safety report sent to study sponsor</p>
                    </div>
                </label>
                <label class="flex items-center gap-3 p-3 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" id="rpt-irb" class="w-4 h-4">
                    <div>
                        <p class="text-sm font-medium text-slate-700">Reported to IRB/EC</p>
                        <p class="text-xs text-slate-400">Confirm report sent to Institutional Review Board / Ethics Committee</p>
                    </div>
                </label>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitReport(${aeId})" class="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="send" class="w-4 h-4"></i> Confirm Reporting
        </button>`,
    });
};

window.submitReport = async function(aeId) {
    const sponsor = document.getElementById('rpt-sponsor').checked;
    const irb     = document.getElementById('rpt-irb').checked;
    if (!sponsor && !irb) { showToast('Select at least one reporting target.', 'error'); return; }
    try {
        await api.reportAdverseEvent(aeId, { reportedToSponsor: sponsor, reportedToIrb: irb });
        closeModal();
        showToast('SAE reporting status updated.', 'success');
        await renderAdverseEvents();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.closeAE = async function(aeId) {
    if (!confirm('Close this adverse event? This action is final.')) return;
    try {
        await api.closeAdverseEvent(aeId);
        showToast('Adverse event closed.', 'success');
        await renderAdverseEvents();
    } catch (err) {
        showToast(err.message, 'error');
    }
};
