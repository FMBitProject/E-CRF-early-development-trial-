// Essential Documents — ICH GCP E6(R3) §8 / DIA TMF Reference Model
import { api } from './api.js';
import { showToast } from './utils.js';

const STATUS_COLOR = {
    Current:           'bg-emerald-100 text-emerald-700',
    Received:          'bg-blue-100 text-blue-700',
    Pending:           'bg-amber-100 text-amber-700',
    Superseded:        'bg-slate-100 text-slate-500',
    'Not Applicable':  'bg-slate-50 text-slate-400',
};

const SECTION_META = {
    '8.1 — Pre-trial':    { icon: 'file-plus',    color: 'text-blue-600',   bg: 'bg-blue-50',   label: '8.1', desc: 'Before the trial begins' },
    '8.2 — Trial Conduct':{ icon: 'activity',     color: 'text-amber-600',  bg: 'bg-amber-50',  label: '8.2', desc: 'During the trial' },
    '8.3 — Post-trial':   { icon: 'archive',      color: 'text-emerald-600',bg: 'bg-emerald-50',label: '8.3', desc: 'After completion' },
};

export async function renderEssentialDocs(container) {
    container.innerHTML = `
    <div class="p-4 md:p-6 space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">Trial Master File (TMF)</h2>
          <p class="text-xs text-slate-500">ICH GCP E6(R3) §8 · DIA TMF Reference Model artifact IDs</p>
        </div>
        <button id="ed-add-btn" class="ph-btn ph-btn-primary text-xs flex items-center gap-1.5">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add / Update Document
        </button>
      </div>

      <!-- Section completeness cards -->
      <div id="ed-completeness" class="grid grid-cols-1 md:grid-cols-3 gap-3"></div>

      <!-- Section tabs -->
      <div class="flex gap-2 flex-wrap" id="ed-tabs"></div>

      <!-- Filter row -->
      <div class="flex gap-2 items-center flex-wrap">
        <label class="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" id="ed-req-only" class="rounded accent-blue-600">
          Required only
        </label>
        <label class="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" id="ed-missing-only" class="rounded accent-red-500">
          Missing only
        </label>
        <div class="flex-1 text-right" id="ed-filter-info"></div>
      </div>

      <!-- Document list -->
      <div id="ed-list" class="space-y-2"></div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    await loadEssentialDocs(container);
    document.getElementById('ed-add-btn')?.addEventListener('click', () => showDocModal(null, container));
    document.getElementById('ed-req-only')?.addEventListener('change', () => renderDocList(_edDocs, container));
    document.getElementById('ed-missing-only')?.addEventListener('change', () => renderDocList(_edDocs, container));
}

let _edTypes   = {};
let _edDocs    = [];
let _edSection = null;

async function loadEssentialDocs(container) {
    try {
        const [docs, types, completeness] = await Promise.all([
            api.getEssentialDocs(),
            api.getEssentialDocTypes(),
            api.getEssentialDocCompleteness(),
        ]);
        _edTypes   = types;
        _edDocs    = docs;
        _edSection = _edSection || Object.keys(types)[0];
        renderCompleteness(completeness);
        renderTabs(Object.keys(types), container);
        renderDocList(docs, container);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderCompleteness(completeness) {
    const el = document.getElementById('ed-completeness');
    if (!el) return;
    el.innerHTML = Object.entries(completeness).map(([sec, c]) => {
        const meta = SECTION_META[sec] ?? {};
        const denom = c.total || 1;
        const reqDenom = c.required || 1;
        const pct = Math.round(((c.current + c.na) / denom) * 100);
        const reqPct = c.required > 0
            ? Math.round(Math.min(c.current, c.required) / reqDenom * 100)
            : 100;
        return `
        <div class="ph-card p-4 cursor-pointer hover:shadow-md transition" onclick="window._edTab('${sec}')">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg ${meta.bg ?? 'bg-slate-50'} flex items-center justify-center">
              <i data-lucide="${meta.icon ?? 'folder'}" class="w-4 h-4 ${meta.color ?? 'text-slate-400'}"></i>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-700">§${meta.label ?? sec}</p>
              <p class="text-xs text-slate-400">${meta.desc ?? ''}</p>
            </div>
            <span class="ml-auto text-sm font-bold text-slate-700">${pct}%</span>
          </div>
          <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1">
            <div class="h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'} rounded-full transition-all" style="width:${pct}%"></div>
          </div>
          <div class="flex gap-3 text-xs text-slate-500 mt-1.5">
            <span class="text-emerald-600">${c.current} current</span>
            <span class="text-amber-600">${c.pending} pending</span>
            <span class="text-slate-400">${c.na} N/A</span>
          </div>
          ${c.required > 0 ? `
          <div class="mt-2 pt-2 border-t border-slate-100">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-slate-500">Required docs</span>
              <span class="font-semibold ${reqPct === 100 ? 'text-emerald-600' : 'text-red-600'}">${reqPct}%</span>
            </div>
            <div class="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full ${reqPct === 100 ? 'bg-emerald-400' : 'bg-red-400'} rounded-full" style="width:${reqPct}%"></div>
            </div>
          </div>` : ''}
        </div>`;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderTabs(sections, container) {
    const el = document.getElementById('ed-tabs');
    if (!el) return;
    el.innerHTML = sections.map(sec => {
        const meta = SECTION_META[sec] ?? {};
        const active = sec === _edSection;
        return `<button onclick="window._edTab('${sec}')"
                        class="px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5
                               ${active ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                  <i data-lucide="${meta.icon ?? 'folder'}" class="w-3 h-3"></i>
                  §${meta.label ?? sec.split('—')[0].trim()}
                  <span class="${active ? 'text-blue-200' : 'text-slate-400'} font-normal">${meta.desc ?? ''}</span>
                </button>`;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
    window._edTab = (sec) => {
        _edSection = sec;
        renderTabs(sections, container);
        renderDocList(_edDocs, container);
    };
}

function renderDocList(docs, container) {
    const el = document.getElementById('ed-list');
    if (!el) return;

    const artifacts = _edTypes[_edSection] ?? [];
    const reqOnly     = document.getElementById('ed-req-only')?.checked ?? false;
    const missingOnly = document.getElementById('ed-missing-only')?.checked ?? false;

    const docMap = new Map();
    for (const d of docs.filter(d => d.section === _edSection)) {
        docMap.set(d.documentType, d);
    }

    let filtered = artifacts;
    if (reqOnly)     filtered = filtered.filter(a => a.required);
    if (missingOnly) filtered = filtered.filter(a => {
        const d = docMap.get(a.label);
        return !d || (d.status !== 'Current' && d.status !== 'Not Applicable');
    });

    const infoEl = document.getElementById('ed-filter-info');
    if (infoEl) {
        const missing = artifacts.filter(a => a.required && (!docMap.has(a.label) || (docMap.get(a.label)?.status !== 'Current' && docMap.get(a.label)?.status !== 'Not Applicable'))).length;
        infoEl.innerHTML = missing > 0
            ? `<span class="text-xs text-red-600 font-medium">${missing} required document${missing !== 1 ? 's' : ''} missing or pending</span>`
            : `<span class="text-xs text-emerald-600 font-medium">✓ All required documents filed</span>`;
    }

    if (!filtered.length) {
        el.innerHTML = `<div class="ph-card p-8 text-center text-slate-400 text-sm">No documents match the current filter.</div>`;
        return;
    }

    el.innerHTML = `
    <div class="ph-card overflow-auto">
      <table class="w-full text-xs">
        <thead class="bg-slate-50 border-b border-slate-200 sticky top-0">
          <tr>
            <th class="px-3 py-2 text-left font-semibold text-slate-600 w-8">Req</th>
            <th class="px-3 py-2 text-left font-semibold text-slate-500 w-24">Artifact ID</th>
            <th class="px-3 py-2 text-left font-semibold text-slate-600">Document</th>
            <th class="px-3 py-2 text-left font-semibold text-slate-600">Version</th>
            <th class="px-3 py-2 text-left font-semibold text-slate-600">Date</th>
            <th class="px-3 py-2 text-left font-semibold text-slate-600">Expiry</th>
            <th class="px-3 py-2 text-left font-semibold text-slate-600">Status</th>
            <th class="px-3 py-2 text-left font-semibold text-slate-600">Reference</th>
            <th class="px-3 py-2 w-16"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${filtered.map(artifact => {
              const d = docMap.get(artifact.label);
              const isMissing = !d || (d.status !== 'Current' && d.status !== 'Not Applicable');
              return `
              <tr class="hover:bg-slate-50 ${artifact.required && isMissing ? 'bg-red-50/30' : ''}">
                <td class="px-3 py-2 text-center">
                  ${artifact.required
                    ? `<span class="text-red-500 font-bold text-base" title="Required">*</span>`
                    : `<span class="text-slate-300 text-sm" title="Optional">○</span>`}
                </td>
                <td class="px-3 py-2 font-mono text-slate-400 text-xs">${artifact.artifactId}</td>
                <td class="px-3 py-2">
                  <p class="font-medium text-slate-700">${artifact.label}</p>
                  ${artifact.description ? `<p class="text-slate-400 text-xs">${artifact.description}</p>` : ''}
                </td>
                <td class="px-3 py-2 text-slate-500">${d?.version || '—'}</td>
                <td class="px-3 py-2 text-slate-500 whitespace-nowrap">${d?.documentDate || '—'}</td>
                <td class="px-3 py-2 text-slate-500 whitespace-nowrap">
                  ${d?.expiryDate
                    ? `<span class="${new Date(d.expiryDate) < new Date() ? 'text-red-600 font-semibold' : ''}">${d.expiryDate}</span>`
                    : '—'}
                </td>
                <td class="px-3 py-2">
                  ${d
                    ? `<span class="px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[d.status] ?? ''}">${d.status}</span>`
                    : `<span class="text-amber-600 font-semibold">Missing</span>`}
                </td>
                <td class="px-3 py-2 text-slate-500 max-w-[140px] truncate">
                  ${d?.documentRef
                    ? `<a href="${d.documentRef}" target="_blank" rel="noopener" class="text-blue-600 hover:underline text-xs">${d.documentRef.substring(0, 35)}</a>`
                    : '—'}
                </td>
                <td class="px-3 py-2 text-right">
                  <button onclick="window._edEdit('${encodeURIComponent(artifact.label)}')"
                          class="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap">
                    ${d ? 'Edit' : 'Add'}
                  </button>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

    window._edEdit = (encodedLabel) => {
        const label = decodeURIComponent(encodedLabel);
        const doc   = docMap.get(label) || null;
        showDocModal(doc, container, label);
    };
}

function showDocModal(record, container, presetType = null) {
    const mid = 'ed-modal';
    document.getElementById(mid)?.remove();

    const isEdit = !!record;
    const currentSection = _edSection || Object.keys(_edTypes)[0] || '';

    const overlay = document.createElement('div');
    overlay.id = mid;
    overlay.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4';

    const sectionOptions = Object.entries(_edTypes).map(([sec]) =>
        `<option ${sec === currentSection ? 'selected' : ''}>${sec}</option>`
    ).join('');

    overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
      <div class="p-5 border-b flex items-center justify-between">
        <h3 class="font-semibold text-slate-800">${isEdit ? 'Update' : 'Add'} TMF Document</h3>
        <button onclick="document.getElementById('${mid}').remove()" class="text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <div class="p-5 space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Section (ICH GCP §8)</label>
          <select id="ed-section-sel" class="ph-input text-sm w-full">${sectionOptions}</select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Document Type *</label>
          <select id="ed-type-sel" class="ph-input text-sm w-full"></select>
        </div>
        <div id="ed-artifact-badge" class="text-xs text-slate-500 font-mono"></div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Version</label>
            <input id="ed-version" type="text" class="ph-input text-sm w-full" placeholder="e.g. v3.0" value="${record?.version || ''}">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Document Date</label>
            <input id="ed-docdate" type="date" class="ph-input text-sm w-full" value="${record?.documentDate || ''}">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Expiry Date</label>
            <input id="ed-expiry" type="date" class="ph-input text-sm w-full" value="${record?.expiryDate || ''}">
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
          <label class="block text-xs font-medium text-slate-600 mb-1">Document Reference / Location</label>
          <input id="ed-ref" type="text" class="ph-input text-sm w-full"
                 placeholder="File path, SharePoint URL, or doc number"
                 value="${record?.documentRef || ''}">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <textarea id="ed-notes" rows="2" class="ph-input text-sm w-full">${record?.notes || ''}</textarea>
        </div>
      </div>
      <div class="p-5 border-t flex justify-end gap-2">
        <button onclick="document.getElementById('${mid}').remove()" class="ph-btn ph-btn-ghost text-sm">Cancel</button>
        <button id="ed-save-btn" class="ph-btn ph-btn-primary text-sm">${isEdit ? 'Save Changes' : 'Add Document'}</button>
      </div>
    </div>`;

    document.body.appendChild(overlay);

    const sectionSel = document.getElementById('ed-section-sel');
    const typeSel    = document.getElementById('ed-type-sel');
    const badgeEl    = document.getElementById('ed-artifact-badge');

    function populateTypes(section) {
        const artifacts = _edTypes[section] ?? [];
        typeSel.innerHTML = artifacts.map(a =>
            `<option value="${a.label}" ${a.label === (presetType || record?.documentType) ? 'selected' : ''}>${a.label}${a.required ? ' *' : ''}</option>`
        ).join('');
        updateBadge();
    }

    function updateBadge() {
        const section   = sectionSel.value;
        const artifacts = _edTypes[section] ?? [];
        const artifact  = artifacts.find(a => a.label === typeSel.value);
        if (artifact && badgeEl) {
            badgeEl.innerHTML = `
            <span class="inline-flex items-center gap-2 px-2 py-1 bg-slate-100 rounded text-xs">
              <span class="font-mono text-slate-600">DIA Artifact: ${artifact.artifactId}</span>
              ${artifact.required ? '<span class="text-red-500 font-semibold">Required</span>' : '<span class="text-slate-400">Optional</span>'}
            </span>
            ${artifact.description ? `<span class="ml-2 text-slate-400">${artifact.description}</span>` : ''}`;
        } else if (badgeEl) {
            badgeEl.innerHTML = '';
        }
    }

    populateTypes(sectionSel.value);
    sectionSel.addEventListener('change', () => populateTypes(sectionSel.value));
    typeSel.addEventListener('change', updateBadge);

    document.getElementById('ed-save-btn').addEventListener('click', async () => {
        const section   = sectionSel.value;
        const artifacts = _edTypes[section] ?? [];
        const artifact  = artifacts.find(a => a.label === typeSel.value) ?? {};
        const payload = {
            section,
            documentType:   typeSel.value,
            tmfArtifactId:  artifact.artifactId ?? null,
            isRequired:     artifact.required ?? false,
            version:        document.getElementById('ed-version').value.trim()  || null,
            documentDate:   document.getElementById('ed-docdate').value          || null,
            expiryDate:     document.getElementById('ed-expiry').value           || null,
            status:         document.getElementById('ed-status').value,
            documentRef:    document.getElementById('ed-ref').value.trim()       || null,
            notes:          document.getElementById('ed-notes').value.trim()     || null,
        };
        try {
            if (isEdit) {
                await api.updateEssentialDoc(record.id, { ...payload, reason: 'TMF document update' });
                showToast('Document updated', 'success');
            } else {
                await api.createEssentialDoc(payload);
                showToast('Document added to TMF', 'success');
            }
            _edSection = section;
            overlay.remove();
            await loadEssentialDocs(container);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}
