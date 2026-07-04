// ============================================================
// Quality Tolerance Limits (QTL) — KRI metrics + threshold config
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const INDICATORS = [
    { value: 'missing_data_rate',  label: 'Missing Data Rate',  unit: '%',    icon: 'file-x',         key: 'missingDataRate'  },
    { value: 'query_rate',         label: 'Query Rate',          unit: '%',    icon: 'message-circle', key: 'queryRate'        },
    { value: 'ae_rate',            label: 'AE Rate',             unit: '%',    icon: 'activity',       key: 'aeRate'           },
    { value: 'deviation_rate',     label: 'Deviation Rate',      unit: '%',    icon: 'alert-triangle', key: 'deviationRate'    },
    { value: 'consent_rate',       label: 'Consent Rate',        unit: '%',    icon: 'file-check',     key: 'consentRate'      },
    { value: 'avg_data_entry_days',label: 'Avg Data Entry Days', unit: 'days', icon: 'clock',          key: 'avgDataEntryDays' },
];

function statusStyle(status) {
    if (status === 'critical') return { border: 'border-red-300',    bg: 'bg-red-50',    bar: 'bg-red-500',   badge: 'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA', badgeLabel: 'Critical' };
    if (status === 'warning')  return { border: 'border-amber-300',  bg: 'bg-amber-50',  bar: 'bg-amber-400', badge: 'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A', badgeLabel: 'Warning'  };
    if (status === 'ok')       return { border: 'border-emerald-200',bg: 'bg-white',     bar: 'bg-emerald-500',badge: 'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7', badgeLabel: 'OK'       };
    return                             { border: 'border-slate-200', bg: 'bg-white',     bar: 'bg-slate-300', badge: 'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1', badgeLabel: 'No QTL'   };
}

function kriCard(indDef, metric) {
    if (!metric) metric = { value: null, threshold: null, unit: indDef.unit, status: 'no_qtl' };
    const st = statusStyle(metric.status);
    const val = metric.value != null ? metric.value : null;
    const thr = metric.threshold != null ? parseFloat(metric.threshold) : null;
    const pct = (val != null && thr != null) ? Math.min(100, Math.round((val / thr) * 100)) : null;
    const isConsent = indDef.value === 'consent_rate';
    // Consent rate is inverted: higher is better, flag if BELOW threshold
    const displayPct = isConsent && pct != null ? Math.min(100, Math.round((thr / val) * 100)) : pct;

    return `
    <div class="ph-card p-4 border ${st.border} ${st.bg}">
        <div class="flex items-start justify-between gap-2 mb-3">
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="${indDef.icon}" class="w-4 h-4 text-slate-500"></i>
                </div>
                <p class="text-xs font-semibold text-slate-700 leading-tight">${indDef.label}</p>
            </div>
            <span class="badge flex-shrink-0 text-xs" style="${st.badge}">${st.badgeLabel}</span>
        </div>

        <div class="flex items-end gap-1.5 mb-1">
            <p class="text-2xl font-bold text-slate-900 leading-none">
                ${val != null ? val : '—'}
            </p>
            <p class="text-xs text-slate-400 mb-0.5">${esc(metric.unit || indDef.unit)}</p>
        </div>

        ${thr != null ? `<p class="text-xs text-slate-400">Threshold: ${thr} ${esc(metric.unit || indDef.unit)}</p>` : `<p class="text-xs text-slate-400">No threshold configured</p>`}

        ${displayPct != null ? `
        <div class="w-full h-1.5 rounded-full bg-slate-100 mt-3 overflow-hidden">
            <div class="${st.bar} h-1.5 rounded-full transition-all" style="width:${displayPct}%"></div>
        </div>` : `<div class="h-1.5 mt-3"></div>`}
    </div>`;
}

export async function renderQTL(container) {
    container.innerHTML = SPINNER;
    const user = api.getCurrentUser();
    const isAdmin = user?.role === 'admin';

    let metricsData = null;
    let qtls = [];

    try {
        [metricsData, qtls] = await Promise.all([
            api.request('/api/qtl/metrics'),
            api.request('/api/qtl'),
        ]);
    } catch (err) {
        container.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    const metrics = metricsData?.metrics || {};
    const subjects = metricsData?.subjects || {};
    const computedAt = metricsData?.computedAt ? new Date(metricsData.computedAt).toLocaleString('en-GB') : '—';

    container.innerHTML = `
    <div class="p-5 space-y-5">
        <div class="flex items-center justify-between gap-3 flex-wrap">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Quality Tolerance Limits</h2>
                <p class="text-xs text-slate-500 mt-0.5">
                    KRI metrics vs configured thresholds &nbsp;·&nbsp;
                    <span class="font-medium text-slate-600">${subjects.total ?? 0}</span> subjects
                    (<span class="font-medium text-slate-600">${subjects.active ?? 0}</span> active)
                </p>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="renderQTL(document.getElementById('main-content'))"
                    class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
                </button>
                ${isAdmin ? `
                <button onclick="openQTLForm()"
                    class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                    <i data-lucide="plus" class="w-4 h-4"></i> Add Threshold
                </button>` : ''}
            </div>
        </div>

        <!-- KRI Metric Cards -->
        <div>
            <div class="flex items-center justify-between mb-3">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Live KRI Metrics</p>
                <p class="text-xs text-slate-400">Last computed: ${computedAt}</p>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
                ${INDICATORS.map(ind => kriCard(ind, metrics[ind.key])).join('')}
            </div>
        </div>

        <!-- QTL Configuration Table -->
        <div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Threshold Configuration</p>
            <div class="ph-card overflow-hidden">
                ${qtls.length ? `
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="ph-table-head">
                            <tr>
                                <th class="text-left">Indicator</th>
                                <th class="text-left">Label</th>
                                <th class="text-left">Threshold</th>
                                <th class="text-left">Alert Level</th>
                                <th class="text-left">Description</th>
                                ${isAdmin ? '<th class="text-right">Actions</th>' : ''}
                            </tr>
                        </thead>
                        <tbody class="ph-table-body">
                            ${qtls.map(q => {
                                const indDef = INDICATORS.find(i => i.value === q.indicator);
                                const levelStyle = q.alertLevel === 'critical'
                                    ? 'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA'
                                    : 'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A';
                                return `
                                <tr>
                                    <td class="text-xs font-mono text-slate-500">${esc(q.indicator)}</td>
                                    <td>
                                        <div class="flex items-center gap-1.5">
                                            ${indDef ? `<i data-lucide="${indDef.icon}" class="w-3.5 h-3.5 text-slate-400 flex-shrink-0"></i>` : ''}
                                            <span class="text-xs font-medium text-slate-800">${esc(q.label)}</span>
                                        </div>
                                    </td>
                                    <td class="text-xs font-semibold text-slate-700">${esc(q.threshold)} ${esc(q.unit)}</td>
                                    <td><span class="badge text-xs" style="${levelStyle}">${esc(q.alertLevel)}</span></td>
                                    <td class="text-xs text-slate-500 max-w-xs truncate">${esc(q.description) || '—'}</td>
                                    ${isAdmin ? `
                                    <td class="text-right">
                                        <div class="flex items-center justify-end gap-1.5">
                                            <button onclick="openQTLForm(${q.id})"
                                                class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition" title="Edit">
                                                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                                            </button>
                                            <button onclick="deleteQTL(${q.id})"
                                                class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                            </button>
                                        </div>
                                    </td>` : ''}
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>` : `
                <div class="py-12 text-center text-slate-400 text-sm">
                    <i data-lucide="sliders-horizontal" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                    <p class="font-medium">No thresholds configured.</p>
                    ${isAdmin ? `<p class="mt-1 text-xs">Click <strong>Add Threshold</strong> to define QTLs for this study.</p>` : ''}
                </div>`}
            </div>
        </div>
    </div>`;

    lucide.createIcons();
}

// Make renderQTL accessible for Refresh button
window.renderQTL = renderQTL;

// ─── QTL Form ────────────────────────────────────────────────────────────────

window.openQTLForm = async function(qtlId = null) {
    const isEdit = qtlId !== null;
    let rec = {};
    if (isEdit) {
        try { rec = await api.request(`/api/qtl/${qtlId}`); } catch {}
    }

    const indicatorOptions = INDICATORS.map(i =>
        `<option value="${i.value}" ${rec.indicator === i.value ? 'selected' : ''}>${i.label}</option>`
    ).join('');

    showModal({
        title: isEdit ? 'Edit QTL Threshold' : 'Add QTL Threshold',
        size: 'md',
        body: `
        <div class="space-y-4">
            <div>
                <label class="ph-label">Indicator <span class="text-red-500">*</span></label>
                <select id="qtl-indicator" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white" ${isEdit ? 'disabled' : ''}>
                    <option value="">— Select —</option>
                    ${indicatorOptions}
                </select>
                ${isEdit ? `<input type="hidden" id="qtl-indicator-hidden" value="${esc(rec.indicator)}">` : ''}
            </div>
            <div>
                <label class="ph-label">Label <span class="text-red-500">*</span></label>
                <input type="text" id="qtl-label" value="${esc(rec.label)}"
                    placeholder="e.g. Missing Data Rate"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Threshold <span class="text-red-500">*</span></label>
                    <input type="number" step="any" id="qtl-threshold" value="${rec.threshold ?? ''}"
                        placeholder="e.g. 15"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Unit</label>
                    <input type="text" id="qtl-unit" value="${esc(rec.unit) || '%'}"
                        placeholder="% or days"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div>
                <label class="ph-label">Alert Level</label>
                <div class="flex items-center gap-6 pt-1">
                    <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                        <input type="radio" name="qtl-alert" value="warning"
                            ${(!rec.alertLevel || rec.alertLevel === 'warning') ? 'checked' : ''}
                            class="w-3.5 h-3.5">
                        Warning
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                        <input type="radio" name="qtl-alert" value="critical"
                            ${rec.alertLevel === 'critical' ? 'checked' : ''}
                            class="w-3.5 h-3.5">
                        Critical
                    </label>
                </div>
            </div>
            <div>
                <label class="ph-label">Description</label>
                <textarea id="qtl-desc" rows="2" placeholder="Optional explanation of this threshold…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(rec.description)}</textarea>
            </div>
            ${isEdit ? `
            <div>
                <label class="ph-label">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="qtl-reason" placeholder="Required — explain why the threshold is changing"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none">
            </div>` : ''}
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitQTLForm(${qtlId})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-4 h-4"></i> ${isEdit ? 'Save Changes' : 'Add Threshold'}
        </button>`,
    });
    lucide.createIcons();
};

window.submitQTLForm = async function(qtlId) {
    const isEdit    = qtlId !== null;
    const indicator = isEdit
        ? document.getElementById('qtl-indicator-hidden')?.value
        : document.getElementById('qtl-indicator')?.value;
    const label     = document.getElementById('qtl-label')?.value.trim();
    const threshold = document.getElementById('qtl-threshold')?.value;
    const unit      = document.getElementById('qtl-unit')?.value.trim() || '%';
    const alertLevel= document.querySelector('input[name="qtl-alert"]:checked')?.value || 'warning';
    const description = document.getElementById('qtl-desc')?.value.trim() || null;

    if (!indicator || !label || threshold === '') {
        showToast('Indicator, label, and threshold are required.', 'error');
        return;
    }

    const payload = { indicator, label, threshold: parseFloat(threshold), unit, alertLevel, description };

    if (isEdit) {
        const reason = document.getElementById('qtl-reason')?.value.trim();
        if (!reason) { showToast('Reason for change is required.', 'error'); return; }
        payload.reason = reason;
    }

    try {
        if (isEdit) {
            await api.request(`/api/qtl/${qtlId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        } else {
            await api.request('/api/qtl', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeModal();
        showToast(isEdit ? 'Threshold updated.' : 'Threshold added.', 'success');
        await renderQTL(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteQTL = async function(qtlId) {
    const reason = prompt('Reason for deleting this threshold (required):');
    if (!reason) return;
    try {
        await api.request(`/api/qtl/${qtlId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
        showToast('Threshold deleted.', 'success');
        await renderQTL(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Wire the CSM "Manage QTLs" button to navigate here
window.openQTLManager = () => { window.location.hash = '#qtl'; };
