// Screening Log — ICH GCP E6(R3) §8.3.20
import { api } from './api.js';
import { showToast } from './utils.js';

const DISPOSITION_COLOR = {
    Enrolled:       'bg-emerald-100 text-emerald-700',
    'Screen Failed':'bg-red-100 text-red-700',
    Pending:        'bg-amber-100 text-amber-700',
    Withdrawn:      'bg-slate-100 text-slate-600',
};

export async function renderScreeningLog(container) {
    container.innerHTML = `
    <div class="p-4 md:p-6 space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">Screening Log</h2>
          <p class="text-xs text-slate-500">ICH GCP E6(R3) §8.3.20 — All subjects screened for eligibility</p>
        </div>
        <button id="sl-add-btn" class="ph-btn ph-btn-primary text-xs flex items-center gap-1.5">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Screening Record
        </button>
      </div>

      <div id="sl-stats" class="grid grid-cols-2 md:grid-cols-4 gap-3"></div>

      <div class="ph-card p-3 flex flex-wrap gap-2 items-center">
        <input id="sl-search" type="text" placeholder="Search code or initials…"
               class="ph-input text-xs flex-1 min-w-[160px] max-w-xs">
        <select id="sl-filter" class="ph-input text-xs w-36">
          <option value="">All dispositions</option>
          <option>Enrolled</option>
          <option>Screen Failed</option>
          <option>Pending</option>
        </select>
      </div>

      <div id="sl-table-wrap" class="ph-card overflow-auto"></div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    await loadScreeningLog(container);

    document.getElementById('sl-add-btn')?.addEventListener('click', () => showScreeningModal(null, container));
    document.getElementById('sl-search')?.addEventListener('input', () => filterTable(container));
    document.getElementById('sl-filter')?.addEventListener('change', () => filterTable(container));
}

let _slData = [];

async function loadScreeningLog(container) {
    try {
        const [data, stats] = await Promise.all([
            api.getScreeningLog(),
            api.getScreeningStats(),
        ]);
        _slData = data;
        renderStats(stats);
        renderTable(data, container);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderStats(stats) {
    const el = document.getElementById('sl-stats');
    if (!el) return;
    el.innerHTML = [
        { label: 'Total Screened',  value: stats.total,        color: 'blue'    },
        { label: 'Enrolled',        value: stats.enrolled,     color: 'emerald' },
        { label: 'Screen Failures', value: stats.screenFailed, color: 'red'     },
        { label: 'Pending',         value: stats.pending,      color: 'amber'   },
    ].map(s => `
        <div class="ph-card p-3 text-center">
          <p class="text-2xl font-bold text-${s.color}-600">${s.value}</p>
          <p class="text-xs text-slate-500 mt-0.5">${s.label}</p>
        </div>`).join('');
}

function renderTable(data, container) {
    const wrap = document.getElementById('sl-table-wrap');
    if (!wrap) return;
    if (!data.length) {
        wrap.innerHTML = `<p class="text-center text-slate-400 text-sm py-12">No screening records yet.</p>`;
        return;
    }
    wrap.innerHTML = `
    <table class="w-full text-xs">
      <thead class="bg-slate-50 border-b border-slate-200">
        <tr>${['Date','Code','Initials','Site','Disposition','Fail Reason',''].map(h =>
            `<th class="px-3 py-2 text-left font-semibold text-slate-600">${h}</th>`).join('')}</tr>
      </thead>
      <tbody id="sl-tbody" class="divide-y divide-slate-100">
        ${data.map(r => `
        <tr class="hover:bg-slate-50 transition sl-row"
            data-code="${(r.screeningCode || '').toLowerCase()}"
            data-initials="${(r.subjectInitials || '').toLowerCase()}"
            data-disposition="${r.disposition}">
          <td class="px-3 py-2 whitespace-nowrap">${r.screeningDate || '—'}</td>
          <td class="px-3 py-2 font-mono font-semibold text-slate-700">${r.screeningCode}</td>
          <td class="px-3 py-2">${r.subjectInitials || '—'}</td>
          <td class="px-3 py-2 text-slate-500">${r.siteName || '—'}</td>
          <td class="px-3 py-2">
            <span class="px-2 py-0.5 rounded-full text-xs font-medium ${DISPOSITION_COLOR[r.disposition] || ''}">
              ${r.disposition}
            </span>
            ${r.enrolledCode ? `<span class="ml-1 text-emerald-600 font-mono">(${r.enrolledCode})</span>` : ''}
          </td>
          <td class="px-3 py-2 text-slate-500 max-w-xs truncate">${r.failReason || '—'}</td>
          <td class="px-3 py-2">
            <button onclick="window._slEdit(${r.id})"
                    class="text-blue-600 hover:text-blue-800 transition">Edit</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;

    window._slEdit = (id) => {
        const rec = _slData.find(r => r.id === id);
        if (rec) showScreeningModal(rec, container);
    };
}

function filterTable() {
    const search = (document.getElementById('sl-search')?.value || '').toLowerCase();
    const filter = document.getElementById('sl-filter')?.value || '';
    document.querySelectorAll('.sl-row').forEach(tr => {
        const code     = tr.dataset.code || '';
        const initials = tr.dataset.initials || '';
        const disp     = tr.dataset.disposition || '';
        const matchS   = !search || code.includes(search) || initials.includes(search);
        const matchF   = !filter || disp === filter;
        tr.style.display = matchS && matchF ? '' : 'none';
    });
}

function showScreeningModal(record, container) {
    const isEdit = !!record;
    const modalId = 'sl-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4';
    overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
      <div class="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 class="font-semibold text-slate-800">${isEdit ? 'Edit' : 'Add'} Screening Record</h3>
        <button onclick="document.getElementById('${modalId}').remove()"
                class="text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <div class="p-5 space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Screening Date *</label>
            <input id="sl-date" type="date" class="ph-input text-sm w-full"
                   value="${record?.screeningDate || new Date().toISOString().split('T')[0]}">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Screening Code *</label>
            <input id="sl-code" type="text" class="ph-input text-sm w-full"
                   placeholder="SCR-001" value="${record?.screeningCode || ''}"
                   ${isEdit ? 'readonly' : ''}>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Subject Initials</label>
            <input id="sl-initials" type="text" class="ph-input text-sm w-full"
                   maxlength="10" value="${record?.subjectInitials || ''}">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Disposition *</label>
            <select id="sl-disp" class="ph-input text-sm w-full">
              ${['Pending','Enrolled','Screen Failed','Withdrawn'].map(d =>
                `<option ${d === (record?.disposition || 'Pending') ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="sl-fail-wrap">
          <label class="block text-xs font-medium text-slate-600 mb-1">Fail Reason</label>
          <input id="sl-fail" type="text" class="ph-input text-sm w-full"
                 placeholder="e.g. Exclusion criterion #3: prior medication"
                 value="${record?.failReason || ''}">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <textarea id="sl-notes" rows="2" class="ph-input text-sm w-full"
                    placeholder="Additional notes…">${record?.notes || ''}</textarea>
        </div>
      </div>
      <div class="p-5 border-t border-slate-100 flex justify-end gap-2">
        <button onclick="document.getElementById('${modalId}').remove()"
                class="ph-btn ph-btn-ghost text-sm">Cancel</button>
        <button id="sl-save-btn" class="ph-btn ph-btn-primary text-sm">
          ${isEdit ? 'Save Changes' : 'Add Record'}
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);

    const dispSelect = document.getElementById('sl-disp');
    const failWrap   = document.getElementById('sl-fail-wrap');
    failWrap.style.display = dispSelect.value === 'Screen Failed' ? '' : 'none';
    dispSelect.addEventListener('change', () => {
        failWrap.style.display = dispSelect.value === 'Screen Failed' ? '' : 'none';
    });

    document.getElementById('sl-save-btn').addEventListener('click', async () => {
        const payload = {
            screeningDate:   document.getElementById('sl-date').value,
            screeningCode:   document.getElementById('sl-code').value.trim(),
            subjectInitials: document.getElementById('sl-initials').value.trim(),
            disposition:     document.getElementById('sl-disp').value,
            failReason:      document.getElementById('sl-fail').value.trim(),
            notes:           document.getElementById('sl-notes').value.trim(),
        };
        if (!payload.screeningDate || !payload.screeningCode) {
            showToast('Date and Code are required', 'error'); return;
        }
        try {
            if (isEdit) {
                await api.updateScreeningRecord(record.id, payload);
                showToast('Record updated', 'success');
            } else {
                await api.createScreeningRecord(payload);
                showToast('Screening record added', 'success');
            }
            overlay.remove();
            await loadScreeningLog(container);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}
