// ============================================================
// Central Statistical Monitoring (CSM) — KRIs + QTLs
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
function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusDot(value, threshold, alertLevel) {
    if (value == null || threshold == null) return '<span class="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block"></span>';
    const pct = (value / threshold) * 100;
    if (alertLevel === 'critical') {
        if (pct >= 100) return '<span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>';
        if (pct >= 75)  return '<span class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>';
        return '<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>';
    }
    if (pct >= 100) return '<span class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>';
    return '<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>';
}

function progressBar(value, threshold) {
    if (value == null || !threshold) return '';
    const pct = Math.min(100, Math.round((value / threshold) * 100));
    const color = pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500';
    return `<div class="w-full h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
        <div class="${color} h-1.5 rounded-full transition-all" style="width:${pct}%"></div>
    </div>`;
}

export async function renderCSM(container) {
    container.innerHTML = SPINNER;
    const user = api.getCurrentUser();
    const isAdmin = user?.role === 'admin';

    let metrics = { kris: [], qtls: [], sitePerformance: [] };
    try {
        metrics = await api.request('/api/qtl/metrics');
    } catch (err) {
        container.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    const kris = metrics.kris || [];
    const qtls = metrics.qtls || [];
    const sites = metrics.sitePerformance || [];

    container.innerHTML = `
    <div class="p-5 space-y-5">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Central Statistical Monitoring</h2>
                <p class="text-xs text-slate-500 mt-0.5">Live Key Risk Indicators (KRIs) and Quality Tolerance Limits (QTLs)</p>
            </div>
            ${isAdmin ? `
            <a href="#qtl"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="settings-2" class="w-4 h-4"></i> Manage QTLs
            </a>` : ''}
        </div>

        <!-- KRI Cards -->
        <div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Key Risk Indicators</p>
            <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
                ${kris.length ? kris.map(kri => kriCard(kri)).join('') : `
                <div class="col-span-3 py-8 text-center text-slate-400 text-sm">
                    <i data-lucide="bar-chart-2" class="w-8 h-8 mx-auto mb-2 opacity-20"></i>
                    <p>No KRI data available.</p>
                </div>`}
            </div>
        </div>

        <!-- Site Performance Table -->
        ${sites.length > 0 ? `
        <div class="ph-card overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <i data-lucide="map-pin" class="w-4 h-4 text-slate-400"></i>
                <p class="text-sm font-semibold text-slate-700">Site Performance</p>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">Site Code</th>
                            <th class="text-left">Site Name</th>
                            <th class="text-left">Active Subjects</th>
                            <th class="text-left">Open Queries</th>
                            <th class="text-left">AE Count</th>
                            <th class="text-left">Data Entry Timeliness</th>
                        </tr>
                    </thead>
                    <tbody class="ph-table-body">
                        ${sites.map(s => `
                        <tr>
                            <td class="text-xs font-mono font-semibold text-slate-700">${esc(s.siteCode)}</td>
                            <td class="text-xs text-slate-600">${esc(s.siteName)}</td>
                            <td class="text-xs text-slate-700 font-semibold">${s.activeSubjects ?? '—'}</td>
                            <td class="text-xs">
                                ${s.openQueries > 0
                                    ? `<span class="badge" style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A">${s.openQueries}</span>`
                                    : `<span class="text-slate-400">${s.openQueries ?? '0'}</span>`}
                            </td>
                            <td class="text-xs text-slate-600">${s.aeCount ?? '—'}</td>
                            <td class="text-xs">
                                ${s.dataEntryTimeliness != null
                                    ? timelinessCell(s.dataEntryTimeliness)
                                    : '<span class="text-slate-400">—</span>'}
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>` : ''}

        <!-- QTL List -->
        <div class="ph-card p-4 space-y-3">
            <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-slate-700">Quality Tolerance Limits (QTLs)</p>
            </div>
            ${qtls.length ? `
            <div class="space-y-2">
                ${qtls.map(q => `
                <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                        <p class="text-xs font-medium text-slate-700">${esc(q.label || q.indicator)}</p>
                        ${q.description ? `<p class="text-xs text-slate-400">${esc(q.description)}</p>` : ''}
                    </div>
                    <div class="text-right flex-shrink-0 ml-4">
                        <p class="text-xs font-semibold text-slate-700">Threshold: ${q.threshold != null ? `${q.threshold}%` : '—'}</p>
                        ${q.alertLevel ? `<span class="badge text-xs" style="${q.alertLevel === 'critical' ? 'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA' : 'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A'}">${esc(q.alertLevel)}</span>` : ''}
                    </div>
                </div>`).join('')}
            </div>` : `
            <p class="text-xs text-slate-400 py-4 text-center">No QTLs defined. Use "Manage QTLs" to configure thresholds.</p>`}
        </div>
    </div>`;

    lucide.createIcons();
}

function kriCard(kri) {
    const dot  = statusDot(kri.value, kri.threshold, kri.alertLevel);
    const bar  = progressBar(kri.value, kri.threshold);
    const val  = kri.value != null ? `${kri.value}%` : '—';
    const thr  = kri.threshold != null ? `${kri.threshold}%` : '—';
    return `
    <div class="ph-card p-4">
        <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">${esc(kri.label)}</p>
            ${dot}
        </div>
        <p class="text-2xl font-bold text-slate-900">${val}</p>
        <p class="text-xs text-slate-400 mt-0.5">Threshold: ${thr}</p>
        ${bar}
    </div>`;
}

function timelinessCell(pct) {
    const color = pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600';
    return `<span class="text-xs font-semibold ${color}">${pct}%</span>`;
}

// QTL management lives in the QTL module (#qtl) — its form matches the
// backend contract. The old modal here posted a payload shape and indicator
// keys the backend rejects, and clashed with qtl.js's window.openQTLManager.
