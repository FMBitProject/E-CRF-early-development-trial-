// IP Management & Accountability / Drug Dispensing — ICH GCP E6(R3) §8.3.19
import { api } from './api.js';
import { showToast } from './utils.js';
import { buildIPInventory } from './ip-inventory.js';
import { getSiteContext } from './study-select.js';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const canCreate = () => ['admin', 'investigator', 'pi', 'crc', 'data_manager'].includes(api.getCurrentUser()?.role);
const canEdit = () => ['admin', 'investigator', 'pi', 'data_manager'].includes(api.getCurrentUser()?.role);

const TYPE_COLOR = {
    Receipt:     'bg-blue-100 text-blue-700',
    Dispensing:  'bg-emerald-100 text-emerald-700',
    Return:      'bg-amber-100 text-amber-700',
    Destruction: 'bg-red-100 text-red-700',
};

export async function renderIPDispensing(container) {
    container.innerHTML = `
    <div class="p-4 md:p-6 space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">IP Management &amp; Accountability</h2>
          <p class="text-xs text-slate-500">Investigational Product inventory, batch expiry, receipts, dispensing, returns &amp; destruction</p>
        </div>
        ${canCreate() ? `<button id="ip-add-btn" class="ph-btn ph-btn-primary text-xs flex items-center gap-1.5">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add IP Transaction
        </button>` : ''}
      </div>

      <div class="flex gap-2" role="tablist" aria-label="IP views">
        <button id="ip-management-tab" role="tab" aria-controls="ip-management-panel" aria-selected="true" class="ph-btn ph-btn-primary text-xs">IP Management</button>
        <button id="ip-accountability-tab" role="tab" aria-controls="ip-accountability-panel" aria-selected="false" class="ph-btn ph-btn-ghost text-xs">IP Accountability</button>
      </div>
      <div id="ip-management-panel" role="tabpanel" aria-labelledby="ip-management-tab" class="space-y-4">
        <div class="ph-card p-4">
          <h3 class="text-sm font-semibold text-slate-700">Batch Inventory &amp; Expiry Monitoring</h3>
          <p class="text-xs text-slate-500 mt-1">Stock is calculated from recorded quantities in and out, per site, drug, batch, and unit.</p>
          <input id="ip-inventory-search" type="search" placeholder="Search drug, batch, or site…" class="ph-input text-xs w-full max-w-sm mt-3">
        </div>
        <div id="ip-inventory-wrap" class="ph-card overflow-auto"></div>
      </div>
      <div id="ip-accountability-panel" role="tabpanel" aria-labelledby="ip-accountability-tab" class="space-y-4" hidden>
      <!-- Running Balance Summary -->
      <div id="ip-summary-wrap" class="ph-card p-4">
        <h3 class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <i data-lucide="package" class="w-4 h-4 text-slate-400"></i> Running Balance
        </h3>
        <div id="ip-summary-table"></div>
      </div>

      <!-- Filter row -->
      <div class="ph-card p-3 flex flex-wrap gap-2 items-center">
        <select id="ip-type-filter" class="ph-input text-xs w-36">
          <option value="">All types</option>
          <option>Receipt</option>
          <option>Dispensing</option>
          <option>Return</option>
          <option>Destruction</option>
        </select>
        <input id="ip-search" type="text" placeholder="Search drug or batch…"
               class="ph-input text-xs flex-1 min-w-[160px] max-w-xs">
      </div>

      <div id="ip-table-wrap" class="ph-card overflow-auto"></div>
      </div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    _ipData = [];
    await loadIPData(container);

    for (const view of ['management', 'accountability']) {
        document.getElementById(`ip-${view}-tab`).addEventListener('click', () => {
            for (const name of ['management', 'accountability']) {
                const selected = name === view;
                const tab = document.getElementById(`ip-${name}-tab`);
                tab.setAttribute('aria-selected', String(selected));
                tab.className = `ph-btn ${selected ? 'ph-btn-primary' : 'ph-btn-ghost'} text-xs`;
                document.getElementById(`ip-${name}-panel`).hidden = !selected;
            }
        });
    }
    document.getElementById('ip-inventory-search').addEventListener('input', renderInventory);
    document.getElementById('ip-add-btn')?.addEventListener('click', () => showIPModal(null, container));
    document.getElementById('ip-type-filter')?.addEventListener('change', () => filterIPTable());
    document.getElementById('ip-search')?.addEventListener('input', () => filterIPTable());
}

let _ipData = [];

async function loadIPData(container) {
    try {
        const data = await api.getIPRecords();
        const summary = buildIPInventory(data).map(batch => ({ ...batch, in: batch.quantityIn, out: batch.quantityOut }));
        _ipData = data;
        renderInventory();
        renderSummary(summary);
        renderIPTable(data, container);
        filterIPTable();
    } catch (err) {
        showToast(err.message, 'error');
        document.getElementById('ip-inventory-wrap').textContent = 'Unable to load IP inventory. Please reopen this page to retry.';
    }
}

function renderInventory() {
    const search = (document.getElementById('ip-inventory-search')?.value || '').toLowerCase();
    const inventory = buildIPInventory(_ipData).filter(batch =>
        [batch.drugName, batch.batchNo, batch.siteName].some(value => String(value || '').toLowerCase().includes(search)));
    const wrap = document.getElementById('ip-inventory-wrap');
    if (!wrap) return;
    if (!inventory.length) {
        wrap.innerHTML = '<p class="text-center text-slate-400 text-sm py-12">No matching IP inventory. Add a receipt to record stock.</p>';
        return;
    }
    wrap.innerHTML = `<table class="w-full text-xs"><thead class="bg-slate-50 border-b border-slate-200"><tr>
        ${['Drug', 'Batch', 'Site', 'Stock on Hand', 'Unit', 'Expiry', 'Supplier Reference', 'Last Transaction', 'Status'].map(label => `<th class="px-3 py-2 text-left font-semibold text-slate-600">${label}</th>`).join('')}
        </tr></thead><tbody class="divide-y divide-slate-100">${inventory.map(batch => `<tr>
        <td class="px-3 py-3 font-medium">${escapeHTML(batch.drugName)}</td>
        <td class="px-3 py-3">${escapeHTML(batch.batchNo || '—')}</td>
        <td class="px-3 py-3">${escapeHTML(batch.siteName || 'Unassigned')}</td>
        <td class="px-3 py-3 font-semibold">${batch.invalidQuantity ? 'Unknown' : batch.balance}</td>
        <td class="px-3 py-3">${escapeHTML(batch.unit || '—')}</td>
        <td class="px-3 py-3 whitespace-nowrap">${escapeHTML(batch.expiryDate || '—')}</td>
        <td class="px-3 py-3">${escapeHTML(batch.supplierRefs.join(', ') || '—')}</td>
        <td class="px-3 py-3 whitespace-nowrap">${escapeHTML(batch.lastTransaction || '—')}</td>
        <td class="px-3 py-3 ${batch.alerts.length ? 'text-amber-700' : 'text-emerald-700'}">${batch.alerts.join('; ') || 'In stock'}</td>
        </tr>`).join('')}</tbody></table>`;
}

function renderSummary(summary) {
    const el = document.getElementById('ip-summary-table');
    if (!el) return;
    if (!summary.length) {
        el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">No IP records yet.</p>';
        return;
    }
    el.innerHTML = `
    <table class="w-full text-xs">
      <thead class="text-left">
        <tr>${['Drug','Batch','Site','In','Out','Balance','Unit'].map(h =>
            `<th class="pb-2 font-semibold text-slate-500">${h}</th>`).join('')}</tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        ${summary.map(s => `
        <tr class="py-1">
          <td class="py-1.5 font-medium text-slate-700">${escapeHTML(s.drugName)}</td>
          <td class="py-1.5 text-slate-500 font-mono">${escapeHTML(s.batchNo || '—')}</td>
          <td class="py-1.5 text-slate-500">${escapeHTML(s.siteName || 'Unassigned')}</td>
          <td class="py-1.5 text-blue-600">${s.in}</td>
          <td class="py-1.5 text-amber-600">${s.out}</td>
          <td class="py-1.5 font-semibold ${s.balance < 0 ? 'text-red-600' : 'text-emerald-600'}">${s.invalidQuantity ? 'Unknown' : s.balance}</td>
          <td class="py-1.5 text-slate-400">${escapeHTML(s.unit || '—')}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderIPTable(data, _container) {
    const wrap = document.getElementById('ip-table-wrap');
    if (!wrap) return;
    if (!data.length) {
        wrap.innerHTML = `<p class="text-center text-slate-400 text-sm py-12">No IP accountability records.</p>`;
        return;
    }
    wrap.innerHTML = `
    <table class="w-full text-xs">
      <thead class="bg-slate-50 border-b border-slate-200">
        <tr>${['Date','Type','Drug','Batch','Site','In','Out','Recorded Balance','Unit','Expiry','Supplier Ref','Returned Qty','Destroyed Qty','Destruction Ref','Subject','Notes',''].map(h =>
            `<th class="px-3 py-2 text-left font-semibold text-slate-600">${h}</th>`).join('')}</tr>
      </thead>
      <tbody id="ip-tbody" class="divide-y divide-slate-100">
        ${data.map(r => `
        <tr class="hover:bg-slate-50 ip-row"
            data-type="${escapeHTML(r.recordType)}" data-drug="${escapeHTML((r.drugName||'').toLowerCase())}"
            data-batch="${escapeHTML((r.batchNo||'').toLowerCase())}">
          <td class="px-3 py-2 whitespace-nowrap">${escapeHTML(r.transactionDate || '—')}</td>
          <td class="px-3 py-2">
            <span class="px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[r.recordType] || ''}">
              ${escapeHTML(r.recordType)}</span>
          </td>
          <td class="px-3 py-2 font-medium">${escapeHTML(r.drugName)}</td>
          <td class="px-3 py-2 font-mono text-slate-500">${escapeHTML(r.batchNo || '—')}</td>
          <td class="px-3 py-2">${escapeHTML(r.siteName || 'Unassigned')}</td>
          <td class="px-3 py-2 text-blue-600">${escapeHTML(r.quantityIn ?? '—')}</td>
          <td class="px-3 py-2 text-amber-600">${escapeHTML(r.quantityOut ?? '—')}</td>
          <td class="px-3 py-2 font-semibold">${escapeHTML(r.balance ?? '—')}</td>
          <td class="px-3 py-2 text-slate-400">${escapeHTML(r.unit || '—')}</td>
          ${['expiryDate', 'supplierRef', 'returnedQuantity', 'destroyedQuantity', 'destructionRef'].map(field => `<td class="px-3 py-2">${escapeHTML(r[field] ?? '—')}</td>`).join('')}
          <td class="px-3 py-2 text-slate-500">${escapeHTML(r.subjectCode || '—')}</td>
          <td class="px-3 py-2 text-slate-400 max-w-[160px] truncate">${escapeHTML(r.notes || '—')}</td>
          <td class="px-3 py-2">
            ${canEdit() ? `<button onclick="window._ipEdit(${r.id})"
                    class="text-blue-600 hover:text-blue-800">Edit</button>` : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;

    window._ipEdit = (id) => {
        const rec = _ipData.find(r => r.id === id);
        if (rec) showIPModal(rec, _container);
    };
}

function filterIPTable() {
    const type   = document.getElementById('ip-type-filter')?.value || '';
    const search = (document.getElementById('ip-search')?.value || '').toLowerCase();
    document.querySelectorAll('.ip-row').forEach(tr => {
        const matchT = !type   || tr.dataset.type === type;
        const matchS = !search || tr.dataset.drug.includes(search) || tr.dataset.batch.includes(search);
        tr.style.display = matchT && matchS ? '' : 'none';
    });
}

function showIPModal(record, container) {
    const isEdit = !!record;
    const mid = 'ip-modal';
    document.getElementById(mid)?.remove();

    const fields = [
        ['ip-rtype',   'Record Type *',    'select', ['Receipt','Dispensing','Return','Destruction']],
        ['ip-date',    'Transaction Date *','date',   null],
        ['ip-drug',    'Drug Name *',       'text',   null],
        ['ip-batch',   'Batch No',          'text',   null],
        ['ip-qty-in',  'Qty Received (In)', 'number', null],
        ['ip-qty-out', 'Qty Used (Out)',    'number', null],
        ['ip-unit',    'Unit',              'text',   null],
        ['ip-expiry',  'Expiry Date',       'date',   null],
        ['ip-balance', 'Recorded Balance (optional)', 'number', null],
        ['ip-supplier', 'Supplier / Shipment Reference', 'text', null],
        ['ip-returned', 'Returned Quantity (reference)', 'number', null],
        ['ip-destroyed', 'Destroyed Quantity (reference)', 'number', null],
        ['ip-destruction', 'Destruction Reference', 'text', null],
        ['ip-notes',   'Notes',             'text',   null],
    ];

    const overlay = document.createElement('div');
    overlay.id = mid;
    overlay.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4';
    overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="p-5 border-b flex items-center justify-between">
        <h3 class="font-semibold text-slate-800">${isEdit ? 'Edit' : 'Add'} IP Record</h3>
        <button onclick="document.getElementById('${mid}').remove()">✕</button>
      </div>
      <div class="p-5 grid grid-cols-2 gap-3">
        ${fields.map(([id, label, type, opts]) => `
        <div class="${id === 'ip-notes' ? 'col-span-2' : ''}">
          <label class="block text-xs font-medium text-slate-600 mb-1">${label}</label>
          ${type === 'select'
            ? `<select id="${id}" class="ph-input text-sm w-full">
                ${opts.map(o => `<option ${o === (record?.recordType || 'Receipt') ? 'selected' : ''}>${o}</option>`).join('')}
               </select>`
            : `<input id="${id}" type="${type}" ${type === 'number' ? 'min="0" step="any"' : ''} class="ph-input text-sm w-full" value="">`}
        </div>`).join('')}
      </div>
      <p class="px-5 pb-4 text-xs text-slate-500">Enter stock movement in Qty Received or Qty Used. Returned and destroyed quantities are supporting details and are not counted again in stock totals.</p>
      <div class="p-5 border-t flex justify-end gap-2">
        <button onclick="document.getElementById('${mid}').remove()"
                class="ph-btn ph-btn-ghost text-sm">Cancel</button>
        <button id="ip-save-btn" class="ph-btn ph-btn-primary text-sm">
          ${isEdit ? 'Save' : 'Add Record'}
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);

    // Prefill date
    if (!isEdit) document.getElementById('ip-date').value = new Date().toISOString().split('T')[0];
    else document.getElementById('ip-date').value = record.transactionDate || '';

    document.getElementById('ip-drug').value    = record?.drugName   || '';
    document.getElementById('ip-batch').value   = record?.batchNo    || '';
    document.getElementById('ip-qty-in').value  = record?.quantityIn  ?? '';
    document.getElementById('ip-qty-out').value = record?.quantityOut ?? '';
    document.getElementById('ip-unit').value    = record?.unit        || '';
    document.getElementById('ip-expiry').value  = record?.expiryDate  || '';
    document.getElementById('ip-balance').value = record?.balance ?? '';
    document.getElementById('ip-supplier').value = record?.supplierRef ?? '';
    document.getElementById('ip-returned').value = record?.returnedQuantity ?? '';
    document.getElementById('ip-destroyed').value = record?.destroyedQuantity ?? '';
    document.getElementById('ip-destruction').value = record?.destructionRef ?? '';
    document.getElementById('ip-notes').value   = record?.notes       || '';

    document.getElementById('ip-save-btn').addEventListener('click', async () => {
        const payload = {
            recordType:      document.getElementById('ip-rtype').value,
            transactionDate: document.getElementById('ip-date').value,
            drugName:        document.getElementById('ip-drug').value.trim(),
            batchNo:         document.getElementById('ip-batch').value.trim(),
            quantityIn:      document.getElementById('ip-qty-in').value || null,
            quantityOut:     document.getElementById('ip-qty-out').value || null,
            unit:            document.getElementById('ip-unit').value.trim(),
            expiryDate:      document.getElementById('ip-expiry').value || null,
            balance: document.getElementById('ip-balance').value || null,
            supplierRef:     document.getElementById('ip-supplier').value.trim() || null,
            returnedQuantity: document.getElementById('ip-returned').value || null,
            destroyedQuantity: document.getElementById('ip-destroyed').value || null,
            destructionRef: document.getElementById('ip-destruction').value.trim() || null,
            notes:           document.getElementById('ip-notes').value.trim(),
        };
        if (!payload.transactionDate || !payload.drugName) {
            showToast('Date and Drug Name are required', 'error'); return;
        }
        for (const key of ['quantityIn', 'quantityOut', 'returnedQuantity', 'destroyedQuantity']) {
            if (payload[key] !== null && (!Number.isFinite(Number(payload[key])) || Number(payload[key]) < 0)) {
                showToast('Quantities must be valid non-negative numbers', 'error'); return;
            }
        }
        if (!isEdit) payload.siteId = getSiteContext()?.id || null;
        const saveButton = document.getElementById('ip-save-btn');
        saveButton.disabled = true;
        try {
            if (isEdit) {
                await api.updateIPRecord(record.id, payload);
                showToast('Record updated', 'success');
            } else {
                await api.createIPRecord(payload);
                showToast('IP record added', 'success');
            }
            overlay.remove();
            await loadIPData(container);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            saveButton.disabled = false;
        }
    });
}
