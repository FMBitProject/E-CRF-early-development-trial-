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
        <button data-tab="missing"     class="dr-tab px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white">Missing Data</button>
        <button data-tab="quality"     class="dr-tab px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">Data Quality</button>
        <button data-tab="integrity"   class="dr-tab px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">Audit Integrity</button>
        <button data-tab="compliance"  class="dr-tab px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">Visit Windows</button>
        <button data-tab="aging"       class="dr-tab px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">Query Aging</button>
        <button data-tab="timeliness"  class="dr-tab px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">Data Timeliness</button>
        <button data-tab="critical"    class="dr-tab px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">Critical Data</button>
        <button data-tab="disposition" class="dr-tab px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">Disposition</button>
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
        const controls = document.getElementById('dr-missing-controls');
        controls.style.display = activeTab === 'missing' ? '' : 'none';
        try {
            if (activeTab === 'missing') {
                const data = await api.getMissingDataReport(activeGroup);
                renderMissingData(data, activeGroup, content);
            } else if (activeTab === 'quality') {
                const data = await api.getDataQualityReport();
                renderQualityData(data, content);
            } else if (activeTab === 'integrity') {
                const data = await api.getAuditIntegrityReport();
                renderIntegrityData(data, content);
            } else if (activeTab === 'compliance') {
                const data = await api.getVisitComplianceReport();
                renderVisitCompliance(data, content);
            } else if (activeTab === 'aging') {
                const data = await api.getQueryAgingReport();
                renderQueryAging(data, content);
            } else if (activeTab === 'timeliness') {
                const data = await api.getDataTimeliness();
                renderDataTimeliness(data, content);
            } else if (activeTab === 'critical') {
                const data = await api.getCriticalDataReport();
                renderCriticalData(data, content);
            } else if (activeTab === 'disposition') {
                const data = await api.getDispositionReport();
                renderDisposition(data, content);
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

function renderVisitCompliance(data, container) {
    const { summary, bySite } = data;
    const pct = summary.total > 0 ? Math.round(((summary.total - summary.outOfWindow) / summary.total) * 100) : 100;
    container.innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        ${[
          { label: 'Total Visits',   val: summary.total,       cls: 'text-slate-700' },
          { label: 'In Window',      val: summary.inWindow,    cls: 'text-emerald-600' },
          { label: 'Out of Window',  val: summary.outOfWindow, cls: 'text-red-600 font-bold' },
          { label: 'No Date Yet',    val: summary.noDate,      cls: 'text-amber-600' },
        ].map(c => `
        <div class="ph-card p-3 text-center">
          <p class="text-2xl font-bold ${c.cls}">${c.val}</p>
          <p class="text-xs text-slate-500 mt-0.5">${c.label}</p>
        </div>`).join('')}
      </div>
      ${bySite.length ? `
      <div class="ph-card overflow-auto">
        <table class="w-full text-xs">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>${['Site','Total','In Window','Out of Window','No Date','Compliance%'].map(h =>
                `<th class="px-3 py-2 text-left font-semibold text-slate-600">${h}</th>`).join('')}</tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${bySite.map(s => `
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 font-medium text-slate-700">${s.siteName} <span class="text-slate-400">(${s.siteCode})</span></td>
              <td class="px-3 py-2">${s.total}</td>
              <td class="px-3 py-2 text-emerald-600">${s.inWindow}</td>
              <td class="px-3 py-2 ${s.outOfWindow > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}">${s.outOfWindow}</td>
              <td class="px-3 py-2 text-amber-600">${s.noDate}</td>
              <td class="px-3 py-2">
                <div class="flex items-center gap-2">
                  <div class="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full rounded-full ${s.compliancePct >= 90 ? 'bg-emerald-500' : s.compliancePct >= 75 ? 'bg-amber-400' : 'bg-red-500'}"
                         style="width:${s.compliancePct}%"></div>
                  </div>
                  <span class="font-semibold ${s.compliancePct >= 90 ? 'text-emerald-600' : s.compliancePct >= 75 ? 'text-amber-600' : 'text-red-600'}">${s.compliancePct}%</span>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<p class="text-center text-slate-400 text-sm py-8">No visit data available.</p>'}
    </div>`;
}

function renderQueryAging(data, container) {
    container.innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        ${[
          { label: 'Total Queries', val: data.total,    cls: 'text-slate-700' },
          { label: 'Open',          val: data.open,     cls: 'text-amber-600 font-bold' },
          { label: 'Resolved',      val: data.resolved, cls: 'text-emerald-600' },
          { label: 'Avg Resolution',val: data.avgResolutionDays != null ? data.avgResolutionDays + 'd' : 'N/A', cls: 'text-blue-600' },
        ].map(c => `
        <div class="ph-card p-3 text-center">
          <p class="text-2xl font-bold ${c.cls}">${c.val}</p>
          <p class="text-xs text-slate-500 mt-0.5">${c.label}</p>
        </div>`).join('')}
      </div>
      ${data.brackets?.length ? `
      <div class="ph-card p-4">
        <h3 class="text-sm font-semibold text-slate-700 mb-3">Open Query Age Distribution</h3>
        <div class="space-y-2">
          ${data.brackets.map(b => {
            const pct = data.open > 0 ? Math.round((b.count / data.open) * 100) : 0;
            const color = b.label === '0-7d' ? 'bg-emerald-500' : b.label === '8-14d' ? 'bg-amber-400' : b.label === '15-30d' ? 'bg-orange-500' : 'bg-red-600';
            return `
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono w-14 text-slate-500">${b.label}</span>
              <div class="flex-1 h-5 bg-slate-100 rounded overflow-hidden relative">
                <div class="h-full ${color} transition-all" style="width:${pct}%"></div>
                <span class="absolute inset-0 flex items-center justify-end pr-2 text-xs font-semibold text-slate-700">${b.count}</span>
              </div>
            </div>`;
          }).join('')}
        </div>
        <p class="text-xs text-slate-400 mt-3">ICH GCP E6(R3) §5.0.7 — queries >30 days require escalation review</p>
      </div>` : ''}
    </div>`;
}

function renderDataTimeliness(data, container) {
    if (!data.length) {
        container.innerHTML = `<p class="text-center text-slate-400 text-sm py-12">No completed visit data with CRF entries yet.</p>`;
        return;
    }
    container.innerHTML = `
    <div class="ph-card overflow-auto">
      <div class="px-4 py-3 border-b border-slate-200">
        <p class="text-xs text-slate-500">ICH GCP E6(R3) §5.0.7 — data entry timeliness per site (days from visit date to first CRF entry)</p>
      </div>
      <table class="w-full text-xs">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>${['Site','Entries','Avg Days','Min','Max','> 3 Days','> 7 Days'].map(h =>
              `<th class="px-3 py-2 text-left font-semibold text-slate-600">${h}</th>`).join('')}</tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${data.map(r => `
          <tr class="hover:bg-slate-50">
            <td class="px-3 py-2 font-medium text-slate-700">${r.siteName} ${r.siteCode ? `<span class="text-slate-400">(${r.siteCode})</span>` : ''}</td>
            <td class="px-3 py-2">${r.totalEntries}</td>
            <td class="px-3 py-2 font-semibold ${r.avgDays != null && r.avgDays > 7 ? 'text-red-600' : r.avgDays > 3 ? 'text-amber-600' : 'text-emerald-600'}">${r.avgDays != null ? r.avgDays + 'd' : '—'}</td>
            <td class="px-3 py-2 text-slate-500">${r.minDays != null ? r.minDays + 'd' : '—'}</td>
            <td class="px-3 py-2 text-slate-500">${r.maxDays != null ? r.maxDays + 'd' : '—'}</td>
            <td class="px-3 py-2 ${r.over3Days > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}">${r.over3Days}</td>
            <td class="px-3 py-2 ${r.over7Days > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}">${r.over7Days}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderCriticalData(data, container) {
    const { critical, nonCritical } = data;
    const pctColor = (pct) => pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600';
    const barColor = (pct) => pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-500';
    container.innerHTML = `
    <div class="space-y-4">
      <p class="text-xs text-slate-500 ph-card p-3">
        ICH GCP E6(R3) §5.0.7 — Critical data fields (marked in Form Builder) must achieve higher completion rates.
        A form is "critical" if any of its fields has the Critical flag enabled.
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${[
          { label: 'Critical Data Fields', desc: `${critical.formCount} forms contain critical fields`, d: critical, border: 'border-red-200' },
          { label: 'Non-Critical Data Fields', desc: `${nonCritical.formCount} standard forms`, d: nonCritical, border: 'border-slate-200' },
        ].map(({ label, desc, d, border }) => `
        <div class="ph-card p-5 border ${border}">
          <h3 class="text-sm font-semibold text-slate-700 mb-1">${label}</h3>
          <p class="text-xs text-slate-400 mb-4">${desc}</p>
          <div class="flex items-end gap-3 mb-3">
            <span class="text-4xl font-bold ${pctColor(d.pct)}">${d.pct}%</span>
            <span class="text-xs text-slate-500 pb-1">complete</span>
          </div>
          <div class="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
            <div class="h-full rounded-full ${barColor(d.pct)}" style="width:${d.pct}%"></div>
          </div>
          <div class="flex gap-4 text-xs text-slate-500">
            <span>Expected: <strong class="text-slate-700">${d.expected}</strong></span>
            <span>Completed: <strong class="text-emerald-600">${d.completed}</strong></span>
            <span>Missing: <strong class="text-red-600">${d.expected - d.completed}</strong></span>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
}

function renderDisposition(data, container) {
    const funnel = [
        { label: 'Screened',       val: data.screened,      color: 'bg-blue-500',    pct: 100 },
        { label: 'Screen Failed',  val: data.screenFailed,  color: 'bg-red-400',     pct: data.screened > 0 ? Math.round((data.screenFailed / data.screened) * 100) : 0 },
        { label: 'Enrolled',       val: data.enrolled,      color: 'bg-emerald-500', pct: data.screened > 0 ? Math.round((data.enrolled / data.screened) * 100) : 0 },
        { label: 'Active',         val: data.active,        color: 'bg-teal-500',    pct: data.enrolled > 0 ? Math.round((data.active / data.enrolled) * 100) : 0 },
        { label: 'Completed',      val: data.completed,     color: 'bg-indigo-500',  pct: data.enrolled > 0 ? Math.round((data.completed / data.enrolled) * 100) : 0 },
        { label: 'Withdrawn',      val: data.withdrawn,     color: 'bg-amber-500',   pct: data.enrolled > 0 ? Math.round((data.withdrawn / data.enrolled) * 100) : 0 },
        { label: 'Discontinued',   val: data.discontinued,  color: 'bg-orange-500',  pct: data.enrolled > 0 ? Math.round((data.discontinued / data.enrolled) * 100) : 0 },
    ];
    container.innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div class="ph-card p-3 text-center">
          <p class="text-2xl font-bold text-blue-600">${data.completionRate}%</p>
          <p class="text-xs text-slate-500 mt-0.5">Completion Rate</p>
        </div>
        <div class="ph-card p-3 text-center">
          <p class="text-2xl font-bold text-emerald-600">${data.retentionRate}%</p>
          <p class="text-xs text-slate-500 mt-0.5">Retention Rate</p>
        </div>
        <div class="ph-card p-3 text-center">
          <p class="text-2xl font-bold text-slate-700">${data.enrolled}</p>
          <p class="text-xs text-slate-500 mt-0.5">Total Enrolled</p>
        </div>
      </div>
      <div class="ph-card p-5">
        <h3 class="text-sm font-semibold text-slate-700 mb-4">Subject Disposition Funnel — ICH GCP E6(R3) §5.18.4</h3>
        <div class="space-y-2">
          ${funnel.map(f => `
          <div class="flex items-center gap-3">
            <span class="text-xs text-slate-500 w-28 text-right">${f.label}</span>
            <div class="flex-1 h-7 bg-slate-100 rounded overflow-hidden relative">
              <div class="h-full ${f.color} opacity-80 transition-all" style="width:${f.pct}%"></div>
              <span class="absolute inset-0 flex items-center pl-3 text-xs font-semibold text-white mix-blend-normal">${f.val} (${f.pct}%)</span>
            </div>
          </div>`).join('')}
        </div>
      </div>
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
