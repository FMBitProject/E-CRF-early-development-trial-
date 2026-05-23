// Aggregate Missing Data Report — ICH GCP E6(R3) QMS §5.0.7
import { api } from './api.js';
import { showToast } from './utils.js';

export async function renderMissingDataReport(container) {
    container.innerHTML = `
    <div class="p-4 md:p-6 space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">Data Quality Report</h2>
          <p class="text-xs text-slate-500">ICH GCP E6(R3) §5.0.7 — Missing data &amp; quality metrics for QTL monitoring</p>
        </div>
        <button id="dr-refresh" class="ph-btn ph-btn-ghost text-xs flex items-center gap-1.5">
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 flex-wrap border-b border-slate-200 pb-3" id="dr-tabs">
        <button data-tab="missing" class="dr-tab px-3 py-1.5 rounded-lg text-xs font-medium
                bg-blue-600 text-white">Missing Data</button>
        <button data-tab="quality" class="dr-tab px-3 py-1.5 rounded-lg text-xs font-medium
                bg-slate-100 text-slate-600">Data Quality</button>
        <button data-tab="integrity" class="dr-tab px-3 py-1.5 rounded-lg text-xs font-medium
                bg-slate-100 text-slate-600">Audit Integrity</button>
      </div>

      <!-- Missing data sub-controls -->
      <div id="dr-missing-controls" class="flex gap-2 items-center flex-wrap">
        <span class="text-xs text-slate-500">Group by:</span>
        ${['site','visit','form'].map(g => `
          <button data-group="${g}" class="dr-group px-3 py-1 rounded-full border text-xs font-medium
                  ${g === 'site' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}">
            ${g.charAt(0).toUpperCase()+g.slice(1)}
          </button>`).join('')}
      </div>

      <div id="dr-content"></div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    let activeTab = 'missing';
    let activeGroup = 'site';

    async function loadTab() {
        const content = document.getElementById('dr-content');
        content.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm">Loading…</div>`;
        try {
            if (activeTab === 'missing') {
                document.getElementById('dr-missing-controls').style.display = '';
                const data = await api.getMissingDataReport(activeGroup);
                renderMissingData(data, activeGroup, content);
            } else if (activeTab === 'quality') {
                document.getElementById('dr-missing-controls').style.display = 'none';
                const data = await api.getDataQualityReport();
                renderQualityData(data, content);
            } else if (activeTab === 'integrity') {
                document.getElementById('dr-missing-controls').style.display = 'none';
                const data = await api.getAuditIntegrityReport();
                renderIntegrityData(data, content);
            }
        } catch (err) {
            content.innerHTML = `<p class="text-center text-red-500 text-sm py-8">${err.message}</p>`;
        }
    }

    document.getElementById('dr-tabs')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.dr-tab');
        if (!btn) return;
        activeTab = btn.dataset.tab;
        document.querySelectorAll('.dr-tab').forEach(b => {
            b.className = b.dataset.tab === activeTab
                ? 'dr-tab px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white'
                : 'dr-tab px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600';
        });
        loadTab();
    });

    document.getElementById('dr-missing-controls')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.dr-group');
        if (!btn) return;
        activeGroup = btn.dataset.group;
        document.querySelectorAll('.dr-group').forEach(b => {
            b.className = b.dataset.group === activeGroup
                ? 'dr-group px-3 py-1 rounded-full border text-xs font-medium border-blue-500 bg-blue-50 text-blue-700'
                : 'dr-group px-3 py-1 rounded-full border text-xs font-medium border-slate-200 text-slate-600';
        });
        loadTab();
    });

    document.getElementById('dr-refresh')?.addEventListener('click', loadTab);
    await loadTab();
}

function renderMissingData(data, groupBy, container) {
    if (!data.length) {
        container.innerHTML = `<p class="text-center text-slate-400 text-sm py-12">No data available.</p>`;
        return;
    }
    const labelMap = { site: 'Site', visit: 'Visit', form: 'Form' };
    container.innerHTML = `
    <div class="ph-card overflow-auto">
      <table class="w-full text-xs">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>${[labelMap[groupBy] || 'Group', 'Expected', 'Completed', 'Draft', 'Missing', 'Completion%', 'Missing%'].map(h =>
              `<th class="px-3 py-2 text-left font-semibold text-slate-600">${h}</th>`).join('')}</tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${data.map(r => `
          <tr class="hover:bg-slate-50">
            <td class="px-3 py-2 font-medium text-slate-700">${r.label}</td>
            <td class="px-3 py-2 text-slate-600">${r.expected}</td>
            <td class="px-3 py-2 text-emerald-600">${r.completed}</td>
            <td class="px-3 py-2 text-amber-600">${r.draft}</td>
            <td class="px-3 py-2 text-red-600 font-semibold">${r.missing}</td>
            <td class="px-3 py-2">
              <div class="flex items-center gap-2">
                <div class="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden w-24">
                  <div class="h-full rounded-full transition-all ${r.completionPct >= 90 ? 'bg-emerald-500' : r.completionPct >= 70 ? 'bg-amber-400' : 'bg-red-500'}"
                       style="width:${r.completionPct}%"></div>
                </div>
                <span class="font-semibold ${r.completionPct >= 90 ? 'text-emerald-600' : r.completionPct >= 70 ? 'text-amber-600' : 'text-red-600'}">
                  ${r.completionPct}%</span>
              </div>
            </td>
            <td class="px-3 py-2">
              <span class="${r.missingPct > 10 ? 'text-red-600 font-semibold' : r.missingPct > 5 ? 'text-amber-600' : 'text-slate-500'}">
                ${r.missingPct}%</span>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderQualityData(data, container) {
    if (!data.length) {
        container.innerHTML = `<p class="text-center text-slate-400 text-sm py-12">No data available.</p>`;
        return;
    }
    container.innerHTML = `
    <div class="ph-card overflow-auto">
      <table class="w-full text-xs">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>${['Site','Subjects','Total Queries','Open Queries','Deviations','SAE','Query Rate','Open Q Rate','Dev Rate'].map(h =>
              `<th class="px-3 py-2 text-left font-semibold text-slate-600">${h}</th>`).join('')}</tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${data.map(s => `
          <tr class="hover:bg-slate-50">
            <td class="px-3 py-2 font-medium text-slate-700">${s.siteName} <span class="text-slate-400 font-mono">(${s.siteCode})</span></td>
            <td class="px-3 py-2">${s.subjects}</td>
            <td class="px-3 py-2">${s.totalQueries}</td>
            <td class="px-3 py-2 ${s.openQueries > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500'}">${s.openQueries}</td>
            <td class="px-3 py-2 ${s.deviations > 0 ? 'text-red-600 font-semibold' : 'text-slate-500'}">${s.deviations}</td>
            <td class="px-3 py-2 ${s.sae > 0 ? 'text-red-700 font-semibold' : 'text-slate-500'}">${s.sae}</td>
            <td class="px-3 py-2">${s.queryRate}</td>
            <td class="px-3 py-2 ${s.openQueryRate > 1 ? 'text-amber-600 font-semibold' : ''}">${s.openQueryRate}</td>
            <td class="px-3 py-2 ${s.deviationRate > 0.5 ? 'text-red-600 font-semibold' : ''}">${s.deviationRate}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderIntegrityData(data, container) {
    const ok = data.status === 'PASS';
    container.innerHTML = `
    <div class="space-y-4">
      <div class="ph-card p-5 text-center">
        <div class="text-5xl mb-3">${ok ? '✅' : '⚠️'}</div>
        <h3 class="text-lg font-bold ${ok ? 'text-emerald-700' : 'text-red-700'} mb-1">
          Audit Trail Integrity: ${data.status}
        </h3>
        <p class="text-sm text-slate-600">
          ${data.checked} entries checked · ${data.intact} intact · ${data.tampered} tampered
        </p>
        <p class="text-xs text-slate-400 mt-1">
          SHA-256 hash verification per ICH E6(R3) C.1 — tamper detection
        </p>
      </div>
      ${data.issues?.length ? `
      <div class="ph-card p-4 border-l-4 border-red-500">
        <p class="text-sm font-semibold text-red-700 mb-2">Tampered Entries Detected</p>
        ${data.issues.map(i => `<p class="text-xs font-mono text-red-600">ID ${i.id}: hash mismatch</p>`).join('')}
      </div>` : ''}
    </div>`;
}
