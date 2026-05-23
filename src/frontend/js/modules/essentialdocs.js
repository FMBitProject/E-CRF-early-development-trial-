// Essential Documents Checklist — ICH GCP E6(R3) §8
import { api } from './api.js';
import { showToast } from './utils.js';

const STATUS_COLOR = {
    Current:           'bg-emerald-100 text-emerald-700',
    Received:          'bg-blue-100 text-blue-700',
    Pending:           'bg-amber-100 text-amber-700',
    Superseded:        'bg-slate-100 text-slate-500',
    'Not Applicable':  'bg-slate-50 text-slate-400',
};

export async function renderEssentialDocs(container) {
    container.innerHTML = `
    <div class="p-4 md:p-6 space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">Essential Documents</h2>
          <p class="text-xs text-slate-500">ICH GCP E6(R3) §8 — Mandatory trial documents checklist</p>
        </div>
        <button id="ed-add-btn" class="ph-btn ph-btn-primary text-xs flex items-center gap-1.5">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add / Update Document
        </button>
      </div>

      <!-- Section completeness bar -->
      <div id="ed-completeness" class="grid grid-cols-1 md:grid-cols-3 gap-3"></div>

      <!-- Section tabs -->
      <div class="flex gap-2 flex-wrap" id="ed-tabs"></div>

      <!-- Document list -->
      <div id="ed-list" class="space-y-2"></div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    await loadEssentialDocs(container);
    document.getElementById('ed-add-btn')?.addEventListener('click', () => showDocModal(null, container));
}

let _edTypes = {};
let _edDocs  = [];
let _edSection = null;

async function loadEssentialDocs(container) {
    try {
        const [docs, types, completeness] = await Promise.all([
            api.getEssentialDocs(),
            api.getEssentialDocTypes(),
            api.getEssentialDocCompleteness(),
        ]);
        _edTypes = types;
        _edDocs  = docs;
        _edSection = _edSection || Object.keys(types)[0];
        renderCompleteness(completeness, types);
        renderTabs(Object.keys(types), container);
        renderDocList(docs, container);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderCompleteness(completeness, types) {
    const el = document.getElementById('ed-completeness');
    if (!el) return;
    el.innerHTML = Object.entries(completeness).map(([sec, c]) => {
        const denominator = types[sec]?.length || c.total;
        const pct = denominator > 0 ? Math.round(((c.current + c.na) / denominator) * 100) : 0;
        return `
        <div class="ph-card p-3">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-semibold text-slate-600">${sec.split('—')[0].trim()}</span>
            <span class="text-xs font-bold text-slate-700">${pct}%</span>
          </div>
          <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-500 rounded-full transition-all"
                 style="width:${pct}%"></div>
          </div>
          <p class="text-xs text-slate-400 mt-1">${c.current} current · ${c.pending} pending · ${c.na} N/A</p>
        </div>`;
    }).join('');
}

function renderTabs(sections, container) {
    const el = document.getElementById('ed-tabs');
    if (!el) return;
    el.innerHTML = sections.map(sec => {
        const short = sec.split('—')[0].trim();
        const active = sec === _edSection;
        return `<button onclick="window._edTab('${sec}')"
                        class="px-3 py-1.5 rounded-lg text-xs font-medium transition
                               ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                  ${short}
                </button>`;
    }).join('');
    window._edTab = (sec) => { _edSection = sec; renderTabs(sections, container); renderDocList(_edDocs, container); };
}

function renderDocList(docs, container) {
    const el = document.getElementById('ed-list');
    if (!el) return;
    const types = _edTypes[_edSection] || [];
    if (!types.length) { el.innerHTML = ''; return; }

    const docMap = new Map();
    for (const d of docs.filter(d => d.section === _edSection)) {
        docMap.set(d.documentType, d);
    }

    el.innerHTML = `
    <div class="ph-card overflow-auto">
      <table class="w-full text-xs">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>${['Document','Version','Date','Expiry','Status','Reference',''].map(h =>
              `<th class="px-3 py-2 text-left font-semibold text-slate-600">${h}</th>`).join('')}</tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${types.map(docType => {
              const d = docMap.get(docType);
              return `
              <tr class="hover:bg-slate-50">
                <td class="px-3 py-2 font-medium text-slate-700">${docType}</td>
                <td class="px-3 py-2 text-slate-500">${d?.version || '—'}</td>
                <td class="px-3 py-2 text-slate-500">${d?.documentDate || '—'}</td>
                <td class="px-3 py-2 text-slate-500">${d?.expiryDate || '—'}</td>
                <td class="px-3 py-2">
                  ${d ? `<span class="px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[d.status] || ''}">
                           ${d.status}</span>` : '<span class="text-amber-500 font-medium">Missing</span>'}
                </td>
                <td class="px-3 py-2 text-slate-500 max-w-[180px] truncate">
                  ${d?.documentRef ? `<a href="${d.documentRef}" target="_blank"
                      class="text-blue-600 hover:underline">${d.documentRef.substring(0,40)}</a>` : '—'}
                </td>
                <td class="px-3 py-2">
                  <button onclick="window._edEdit('${encodeURIComponent(docType)}')"
                          class="text-blue-600 hover:text-blue-800">
                    ${d ? 'Edit' : 'Add'}
                  </button>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

    window._edEdit = (encodedType) => {
        const docType = decodeURIComponent(encodedType);
        const doc = docMap.get(docType) || null;
        showDocModal(doc, container, docType);
    };
}

function showDocModal(record, container, presetType = null) {
    const mid = 'ed-modal';
    document.getElementById(mid)?.remove();

    const isEdit = !!record;
    const currentSection = _edSection || Object.keys(_edTypes)[0] || '';
    const currentTypes = _edTypes[currentSection] || [];

    const overlay = document.createElement('div');
    overlay.id = mid;
    overlay.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4';
    overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
      <div class="p-5 border-b flex items-center justify-between">
        <h3 class="font-semibold text-slate-800">${isEdit ? 'Update' : 'Add'} Essential Document</h3>
        <button onclick="document.getElementById('${mid}').remove()">✕</button>
      </div>
      <div class="p-5 space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Section</label>
          <select id="ed-section-sel" class="ph-input text-sm w-full">
            ${Object.keys(_edTypes).map(s => `<option ${s === currentSection ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Document Type *</label>
          <select id="ed-type-sel" class="ph-input text-sm w-full"></select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Version</label>
            <input id="ed-version" type="text" class="ph-input text-sm w-full"
                   placeholder="e.g. v3.0" value="${record?.version || ''}">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Document Date</label>
            <input id="ed-docdate" type="date" class="ph-input text-sm w-full"
                   value="${record?.documentDate || ''}">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Expiry Date</label>
            <input id="ed-expiry" type="date" class="ph-input text-sm w-full"
                   value="${record?.expiryDate || ''}">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select id="ed-status" class="ph-input text-sm w-full">
              ${['Pending','Received','Current','Superseded','Not Applicable'].map(s =>
                `<option ${s === (record?.status || 'Pending') ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Document Reference / URL</label>
          <input id="ed-ref" type="text" class="ph-input text-sm w-full"
                 placeholder="File path, SharePoint URL, or document number"
                 value="${record?.documentRef || ''}">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <textarea id="ed-notes" rows="2" class="ph-input text-sm w-full">${record?.notes || ''}</textarea>
        </div>
      </div>
      <div class="p-5 border-t flex justify-end gap-2">
        <button onclick="document.getElementById('${mid}').remove()"
                class="ph-btn ph-btn-ghost text-sm">Cancel</button>
        <button id="ed-save-btn" class="ph-btn ph-btn-primary text-sm">
          ${isEdit ? 'Save Changes' : 'Add Document'}
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);

    // Populate type select based on section
    const sectionSel = document.getElementById('ed-section-sel');
    const typeSel    = document.getElementById('ed-type-sel');

    function populateTypes(section) {
        const types = _edTypes[section] || [];
        typeSel.innerHTML = types.map(t =>
            `<option ${t === (presetType || record?.documentType) ? 'selected' : ''}>${t}</option>`
        ).join('');
    }
    populateTypes(sectionSel.value);
    sectionSel.addEventListener('change', () => populateTypes(sectionSel.value));

    document.getElementById('ed-save-btn').addEventListener('click', async () => {
        const payload = {
            section:      sectionSel.value,
            documentType: typeSel.value,
            version:      document.getElementById('ed-version').value.trim() || null,
            documentDate: document.getElementById('ed-docdate').value || null,
            expiryDate:   document.getElementById('ed-expiry').value || null,
            status:       document.getElementById('ed-status').value,
            documentRef:  document.getElementById('ed-ref').value.trim() || null,
            notes:        document.getElementById('ed-notes').value.trim() || null,
        };
        try {
            if (isEdit) {
                await api.updateEssentialDoc(record.id, { ...payload, reason: 'Document status update' });
                showToast('Document updated', 'success');
            } else {
                await api.createEssentialDoc(payload);
                showToast('Document added', 'success');
            }
            _edSection = payload.section;
            overlay.remove();
            await loadEssentialDocs(container);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}
