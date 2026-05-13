import { api } from './api.js';

const STATUS_BADGE = {
    'Active':       'bg-emerald-100 text-emerald-700',
    'Completed':    'bg-slate-100 text-slate-600',
    'Withdrawn':    'bg-red-100 text-red-700',
    'Screen Failed':'bg-orange-100 text-orange-700',
};

export function renderDataStatus(container) {
    container.innerHTML = `
    <div class="p-4 md:p-6 space-y-4">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">Subject Data Status</h2>
          <p class="text-xs text-slate-500 mt-0.5">Per-subject overview — CRF entries, signatures, open queries, and randomization status</p>
        </div>
        <button id="ds-refresh" class="ph-btn ph-btn-ghost text-xs flex items-center gap-1.5">
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
        </button>
      </div>

      <!-- Filters -->
      <div class="ph-card p-3 flex flex-wrap items-center gap-2">
        <div class="relative flex-1 min-w-[180px] max-w-xs">
          <i data-lucide="search" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"></i>
          <input id="ds-search" type="text" placeholder="Search by subject code…" class="ph-input pl-8 text-xs w-full">
        </div>
        <select id="ds-status-filter" class="ph-input text-xs w-40">
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Withdrawn">Withdrawn</option>
          <option value="Screen Failed">Screen Failed</option>
        </select>
        <div id="ds-summary" class="ml-auto flex items-center gap-3 text-xs text-slate-500"></div>
      </div>

      <!-- Legend -->
      <div class="flex items-center gap-4 text-xs text-slate-500 px-1">
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-amber-400 inline-block"></span>Draft</span>
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-blue-400 inline-block"></span>Saved</span>
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>Signed</span>
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-slate-400 inline-block"></span>Locked</span>
      </div>

      <!-- Table -->
      <div id="ds-table-wrap"></div>
    </div>`;

    lucide.createIcons();

    let allRows = [];

    async function load() {
        document.getElementById('ds-table-wrap').innerHTML = `
        <div class="ph-card p-8 flex items-center justify-center gap-3 text-slate-400">
          <div class="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0"></div>
          <span class="text-sm">Loading subject data…</span>
        </div>`;
        try {
            allRows = await api.getSubjectStatusOverview();
            renderTable();
        } catch (err) {
            document.getElementById('ds-table-wrap').innerHTML = `
            <div class="ph-card p-6 border-red-200 bg-red-50">
              <div class="flex items-center gap-2 text-red-700">
                <i data-lucide="alert-circle" class="w-4 h-4 flex-shrink-0"></i>
                <p class="text-sm font-medium">Failed to load subject data</p>
              </div>
              <p class="text-xs text-red-600 mt-1 ml-6">${err.message}</p>
            </div>`;
            lucide.createIcons();
        }
    }

    function renderTable() {
        const search      = (document.getElementById('ds-search')?.value ?? '').toLowerCase().trim();
        const statusFilter = document.getElementById('ds-status-filter')?.value ?? '';

        const rows = allRows.filter(r => {
            if (search && !r.subjectCode.toLowerCase().includes(search)) return false;
            if (statusFilter && r.status !== statusFilter) return false;
            return true;
        });

        // Update summary counts
        const summaryEl = document.getElementById('ds-summary');
        if (summaryEl) {
            const openQ   = rows.reduce((s, r) => s + (r.openQueries ?? 0), 0);
            const cleanN  = rows.filter(r => r.openQueries === 0 && r.totalEntries > 0).length;
            summaryEl.innerHTML = `
              <span>${rows.length} subject${rows.length !== 1 ? 's' : ''}</span>
              ${openQ > 0 ? `<span class="text-red-500 font-semibold">${openQ} open ${openQ === 1 ? 'query' : 'queries'}</span>` : ''}
              ${cleanN > 0 ? `<span class="text-emerald-600">${cleanN} clean</span>` : ''}`;
        }

        const wrap = document.getElementById('ds-table-wrap');
        if (!wrap) return;

        if (rows.length === 0) {
            wrap.innerHTML = `
            <div class="ph-card p-12 flex flex-col items-center text-center text-slate-400">
              <i data-lucide="table-2" class="w-10 h-10 mb-3 opacity-30"></i>
              <p class="font-medium text-slate-500">No subjects found</p>
              <p class="text-xs mt-1">${search || statusFilter ? 'Try adjusting your filters.' : 'Enroll subjects to see data status here.'}</p>
            </div>`;
            lucide.createIcons();
            return;
        }

        const tbody = rows.map(r => {
            const statusCls  = STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-600';
            const queryColor = r.openQueries > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600';
            const queryLabel = r.openQueries > 0 ? `${r.openQueries} open` : 'Clean';
            const randCell   = r.randomized
                ? `<span class="bg-blue-100 text-blue-700 text-xs font-medium px-1.5 py-0.5 rounded">${escHtml(r.treatmentArm ?? 'Randomized')}</span>`
                : `<span class="text-slate-300">—</span>`;
            const isClean = r.openQueries === 0 && r.totalEntries > 0;
            const cleanCell = isClean
                ? `<span class="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Clean</span>`
                : `<span class="text-slate-300 text-xs">—</span>`;

            return `<tr class="hover:bg-slate-50 transition">
                <td class="px-4 py-3">
                  <p class="font-semibold text-slate-800 text-sm">${escHtml(r.subjectCode)}</p>
                  ${r.initials ? `<p class="text-xs text-slate-400">${escHtml(r.initials)}</p>` : ''}
                </td>
                <td class="px-4 py-3 text-xs text-slate-600">${escHtml(r.siteCode ?? '—')}</td>
                <td class="px-4 py-3">
                  <span class="text-xs font-medium px-2 py-0.5 rounded-full ${statusCls}">${escHtml(r.status)}</span>
                </td>
                <td class="px-4 py-3 min-w-[140px]">
                  ${buildEntryBar(r)}
                </td>
                <td class="px-4 py-3 text-center text-sm text-slate-700">${r.signedCount ?? 0}</td>
                <td class="px-4 py-3 text-center text-xs ${queryColor}">${queryLabel}</td>
                <td class="px-4 py-3 text-center">${randCell}</td>
                <td class="px-4 py-3 text-center">${cleanCell}</td>
            </tr>`;
        }).join('');

        wrap.innerHTML = `
        <div class="ph-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b" style="background:#F0F3F8;border-color:#D8E0EE">
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Site</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">CRF Entries</th>
                  <th class="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Signed</th>
                  <th class="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Queries</th>
                  <th class="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Randomization</th>
                  <th class="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Data Clean</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">${tbody}</tbody>
            </table>
          </div>
          <div class="px-4 py-2.5 border-t text-xs text-slate-400" style="border-color:#D8E0EE;background:#F9FAFC">
            Showing ${rows.length} of ${allRows.length} subject${allRows.length !== 1 ? 's' : ''}
          </div>
        </div>`;

        lucide.createIcons();
    }

    function buildEntryBar(r) {
        const total = r.totalEntries ?? 0;
        if (total === 0) return `<span class="text-xs text-slate-400 italic">No entries</span>`;
        const segs = [
            { count: r.draftCount,  cls: 'bg-amber-400', label: 'Draft' },
            { count: r.savedCount,  cls: 'bg-blue-400',  label: 'Saved' },
            { count: r.signedCount, cls: 'bg-emerald-500', label: 'Signed' },
            { count: r.lockedCount, cls: 'bg-slate-400', label: 'Locked' },
        ].filter(s => s.count > 0);
        const bars = segs.map(s =>
            `<div class="${s.cls} h-full" style="width:${Math.round((s.count / total) * 100)}%" title="${s.label}: ${s.count}"></div>`
        ).join('');
        return `
        <div class="space-y-1">
          <div class="h-2 rounded-full overflow-hidden bg-slate-100 flex">${bars}</div>
          <p class="text-xs text-slate-400">${total} total</p>
        </div>`;
    }

    function escHtml(s) {
        return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    load();

    container.addEventListener('input',  e => { if (e.target.id === 'ds-search') renderTable(); });
    container.addEventListener('change', e => { if (e.target.id === 'ds-status-filter') renderTable(); });
    container.addEventListener('click',  e => { if (e.target.id === 'ds-refresh') load(); });
}
