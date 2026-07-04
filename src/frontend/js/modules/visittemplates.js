// Visit Schedule Template UI — Study design / visit plan builder

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

let _templates = [];
let _forms     = [];
let _editTmpl  = null;
let _items     = [];

const VISIT_TYPES = ['Screening', 'Baseline', 'Treatment', 'Follow-up', 'End of Study', 'Unscheduled', 'Telephone'];

// ── Main render ──────────────────────────────────────────────────────────────
export async function renderVisitTemplates(container) {
    container.innerHTML = `
    <div class="p-4 md:p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">Visit Schedule Templates</h2>
          <p class="text-xs text-slate-500 mt-0.5">Define study visit plans — auto-generate visits for new subjects on enrollment</p>
        </div>
        <button onclick="window.vtNew()" class="ph-btn ph-btn-primary text-xs flex items-center gap-1.5">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> New Template
        </button>
      </div>
      <div id="vt-list"></div>
    </div>`;
    lucide.createIcons();
    await loadAll(container);
}

async function loadAll(container) {
    try {
        [_templates, _forms] = await Promise.all([
            api.request('/api/visit-templates'),
            api.request('/api/forms'),
        ]);
        renderList();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderList() {
    const el = document.getElementById('vt-list');
    if (!el) return;

    if (!_templates.length) {
        el.innerHTML = `
        <div class="text-center py-16 text-slate-400">
          <i data-lucide="calendar-check" class="w-10 h-10 mx-auto mb-3 opacity-40"></i>
          <p class="font-medium">No visit templates yet</p>
          <p class="text-sm mt-1">Create a visit schedule template to auto-generate visits during subject enrollment</p>
        </div>`;
        lucide.createIcons();
        return;
    }

    el.innerHTML = `
    <div class="space-y-3">
      ${_templates.map(t => `
        <div class="ph-card overflow-hidden">
          <div class="flex items-center justify-between p-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                <i data-lucide="calendar-days" class="w-4 h-4"></i>
              </div>
              <div>
                <p class="font-semibold text-slate-800 text-sm">${t.name}</p>
                <p class="text-xs text-slate-500">${t.visitCount ?? 0} visit${(t.visitCount ?? 0) === 1 ? '' : 's'}${t.description ? ' · ' + t.description : ''}</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <button onclick="window.vtView(${t.id})" class="ph-btn ph-btn-ghost text-xs" title="View visits">
                <i data-lucide="list" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="window.vtEdit(${t.id})" class="ph-btn ph-btn-secondary text-xs">
                <i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit
              </button>
              ${api.getCurrentUser()?.role === 'admin' ? `
              <button onclick="window.vtDelete(${t.id})" class="ph-btn ph-btn-ghost text-xs text-red-500">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>` : ''}
            </div>
          </div>
        </div>`).join('')}
    </div>`;
    lucide.createIcons();
}

// ── Builder Modal ─────────────────────────────────────────────────────────────
function openBuilderModal(tmpl = null) {
    _editTmpl = tmpl;
    _items    = tmpl ? JSON.parse(JSON.stringify(tmpl.items ?? [])) : [];

    const formOptions = _forms.map(f =>
        `<option value="${f.id}">${f.name}</option>`
    ).join('');

    showModal({
        title: tmpl ? 'Edit Visit Schedule' : 'New Visit Schedule Template',
        size:  'xl',
        body: `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="ph-label">Template Name *</label>
            <input id="vt-name" class="ph-input" value="${tmpl?.name ?? ''}" placeholder="e.g. Phase III Treatment Schedule">
          </div>
          <div>
            <label class="ph-label">Description</label>
            <input id="vt-description" class="ph-input" value="${tmpl?.description ?? ''}" placeholder="Optional">
          </div>
        </div>
        <div class="border-t border-slate-100 pt-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-semibold text-slate-700">Visit Plan <span id="vt-item-count" class="text-xs text-slate-400 font-normal">(${_items.length})</span></p>
            <button onclick="window.vtAddItem()" class="ph-btn ph-btn-secondary text-xs flex items-center gap-1">
              <i data-lucide="plus" class="w-3 h-3"></i> Add Visit
            </button>
          </div>
          <div id="vt-items" class="space-y-2 max-h-80 overflow-y-auto pr-1"></div>
          <div id="vt-form-options" class="hidden">${formOptions}</div>
        </div>
        ${tmpl ? `
        <div>
          <label class="ph-label">Reason for Change *</label>
          <input id="vt-reason" class="ph-input" placeholder="Why is this template being updated?">
        </div>` : ''}
      </div>`,
        footer: `
          <button onclick="closeModal()" class="ph-btn ph-btn-ghost text-sm">Cancel</button>
          <button onclick="window.vtSave()" class="ph-btn ph-btn-primary text-sm flex items-center gap-1.5">
            <i data-lucide="save" class="w-3.5 h-3.5"></i> ${tmpl ? 'Save Changes' : 'Create Template'}
          </button>`,
    });

    renderItemList();
    lucide.createIcons();
}

function renderItemList() {
    const el  = document.getElementById('vt-items');
    const cnt = document.getElementById('vt-item-count');
    if (!el) return;
    if (cnt) cnt.textContent = `(${_items.length})`;

    if (!_items.length) {
        el.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">No visits yet. Click "Add Visit" to build the schedule.</p>`;
        return;
    }

    const formMap = Object.fromEntries(_forms.map(f => [f.id, f.name]));

    el.innerHTML = _items.map((it, i) => {
        const selectedForms = (it.formIds ?? []).map(id => formMap[id]).filter(Boolean);
        return `
        <div class="border border-slate-200 rounded-lg bg-slate-50 p-3 space-y-2">
          <div class="flex items-center gap-2">
            <div class="flex flex-col gap-0.5">
              <button onclick="window.vtMoveItem(${i},-1)" class="text-slate-300 hover:text-slate-600 leading-none" ${i === 0 ? 'disabled' : ''}>
                <i data-lucide="chevron-up" class="w-3 h-3"></i>
              </button>
              <button onclick="window.vtMoveItem(${i},1)" class="text-slate-300 hover:text-slate-600 leading-none" ${i === _items.length - 1 ? 'disabled' : ''}>
                <i data-lucide="chevron-down" class="w-3 h-3"></i>
              </button>
            </div>
            <span class="text-xs font-mono text-slate-400 w-6 text-center">${i + 1}</span>
            <div class="flex-1 grid grid-cols-4 gap-2">
              <div class="col-span-2">
                <label class="ph-label text-xs">Visit Name *</label>
                <input class="ph-input text-xs" value="${it.visitName ?? ''}" onchange="window.vtUpdateItem(${i},'visitName',this.value)" placeholder="e.g. Screening Visit">
              </div>
              <div>
                <label class="ph-label text-xs">Visit Type</label>
                <select class="ph-input text-xs" onchange="window.vtUpdateItem(${i},'visitType',this.value)">
                  ${VISIT_TYPES.map(t => `<option ${(it.visitType ?? 'Screening') === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="ph-label text-xs">Study Day</label>
                <input type="number" class="ph-input text-xs" value="${it.studyDay ?? ''}" onchange="window.vtUpdateItem(${i},'studyDay',this.value ? +this.value : null)" placeholder="e.g. 0">
              </div>
            </div>
            <button onclick="window.vtRemoveItem(${i})" class="text-red-400 hover:text-red-600 p-1 flex-shrink-0">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          </div>
          <div class="flex items-center gap-3 pl-8">
            <div class="flex items-center gap-1.5">
              <label class="ph-label text-xs mb-0">Window (±days)</label>
              <input type="number" class="ph-input text-xs w-16" value="${it.windowDaysBefore ?? 3}" onchange="window.vtUpdateItem(${i},'windowDaysBefore',+this.value)" placeholder="3" min="0">
              <span class="text-xs text-slate-400">/</span>
              <input type="number" class="ph-input text-xs w-16" value="${it.windowDaysAfter ?? 3}" onchange="window.vtUpdateItem(${i},'windowDaysAfter',+this.value)" placeholder="3" min="0">
            </div>
            <label class="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" ${it.isMandatory !== false ? 'checked' : ''} onchange="window.vtUpdateItem(${i},'isMandatory',this.checked)" class="rounded">
              Mandatory visit
            </label>
          </div>
          <div class="pl-8">
            <label class="ph-label text-xs">CRF Forms for this visit</label>
            <div class="flex flex-wrap gap-1.5 mt-1">
              ${_forms.map(f => `
                <label class="flex items-center gap-1 text-xs cursor-pointer bg-white border border-slate-200 rounded px-2 py-1 hover:border-blue-400 ${(it.formIds ?? []).includes(f.id) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'text-slate-600'}">
                  <input type="checkbox" class="hidden" ${(it.formIds ?? []).includes(f.id) ? 'checked' : ''}
                    onchange="window.vtToggleForm(${i},${f.id},this.checked)">
                  ${f.name}
                </label>`).join('')}
              ${!_forms.length ? '<p class="text-xs text-slate-400 italic">No forms available — create forms first</p>' : ''}
            </div>
          </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

// ── Item operations ──────────────────────────────────────────────────────────
window.vtAddItem = () => {
    _items.push({
        visitName: '',
        visitOrder: _items.length + 1,
        visitType: 'Scheduled',
        studyDay: null,
        windowDaysBefore: 3,
        windowDaysAfter: 3,
        formIds: [],
        isMandatory: true,
    });
    renderItemList();
};

window.vtRemoveItem = (i) => {
    _items.splice(i, 1);
    _items.forEach((it, idx) => it.visitOrder = idx + 1);
    renderItemList();
};

window.vtMoveItem = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= _items.length) return;
    [_items[i], _items[j]] = [_items[j], _items[i]];
    _items.forEach((it, idx) => it.visitOrder = idx + 1);
    renderItemList();
};

window.vtUpdateItem = (i, key, value) => {
    _items[i] = { ..._items[i], [key]: value };
};

window.vtToggleForm = (i, formId, checked) => {
    const ids = _items[i].formIds ?? [];
    _items[i].formIds = checked ? [...ids, formId] : ids.filter(id => id !== formId);
    renderItemList();
};

// ── Save ─────────────────────────────────────────────────────────────────────
window.vtSave = async () => {
    const name        = document.getElementById('vt-name')?.value?.trim();
    const description = document.getElementById('vt-description')?.value?.trim();
    const reason      = document.getElementById('vt-reason')?.value?.trim();

    if (!name) return showToast('Template name is required', 'error');
    if (!_items.length) return showToast('At least one visit is required', 'error');
    for (let i = 0; i < _items.length; i++) {
        if (!_items[i].visitName?.trim()) return showToast(`Visit ${i + 1}: name is required`, 'error');
    }
    if (_editTmpl && !reason) return showToast('Reason for change is required', 'error');

    const items = _items.map((it, i) => ({ ...it, visitOrder: i + 1 }));

    try {
        if (_editTmpl) {
            await api.request(`/api/visit-templates/${_editTmpl.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name, description, items, reason }),
            });
            showToast('Template updated', 'success');
        } else {
            await api.request('/api/visit-templates', {
                method: 'POST',
                body: JSON.stringify({ name, description, items }),
            });
            showToast('Template created', 'success');
        }
        closeModal();
        [_templates] = await Promise.all([api.request('/api/visit-templates')]);
        renderList();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// ── Public handlers ──────────────────────────────────────────────────────────
window.vtNew = () => openBuilderModal(null);

window.vtEdit = async (id) => {
    try {
        const tmpl = await api.request(`/api/visit-templates/${id}`);
        openBuilderModal(tmpl);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.vtView = async (id) => {
    try {
        const tmpl = await api.request(`/api/visit-templates/${id}`);
        const formMap = Object.fromEntries(_forms.map(f => [f.id, f.name]));
        showModal({
            title: tmpl.name,
            size:  'lg',
            body: `
          <div class="space-y-2 max-h-96 overflow-y-auto">
            ${(tmpl.items ?? []).length ? (tmpl.items ?? []).map((it, i) => `
            <div class="border border-slate-200 rounded-lg p-3 bg-slate-50">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">${i + 1}</span>
                <p class="font-medium text-sm text-slate-800">${it.visit_name ?? it.visitName}</p>
                <span class="text-xs text-slate-400">${it.visit_type ?? it.visitType}</span>
                ${it.is_mandatory !== false ? '<span class="text-xs text-red-400">Required</span>' : '<span class="text-xs text-slate-300">Optional</span>'}
              </div>
              ${it.study_day != null || it.studyDay != null ? `<p class="text-xs text-slate-500 pl-8">Study Day ${it.study_day ?? it.studyDay} (window ±${it.window_days_before ?? it.windowDaysBefore ?? 3}/${it.window_days_after ?? it.windowDaysAfter ?? 3} days)</p>` : ''}
              ${(it.form_ids ?? it.formIds ?? []).length ? `<p class="text-xs text-blue-600 pl-8">Forms: ${(it.form_ids ?? it.formIds).map(id => formMap[id] ?? `Form #${id}`).join(', ')}</p>` : ''}
            </div>`).join('') : '<p class="text-xs text-slate-400 text-center py-8">No visits defined in this template.</p>'}
          </div>`,
            footer: `<button onclick="closeModal()" class="ph-btn ph-btn-ghost text-sm">Close</button>`,
        });
        lucide.createIcons();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.vtDelete = async (id) => {
    const tmpl = _templates.find(t => t.id === id);
    if (!confirm(`Delete template "${tmpl?.name}"?`)) return;
    const reason = prompt('Reason for deletion?');
    if (!reason) return;
    try {
        await api.request(`/api/visit-templates/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        });
        showToast('Template deleted', 'success');
        _templates = await api.request('/api/visit-templates');
        renderList();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// ── Generate visits for a subject from a template (called from subjects.js) ─
export async function generateVisitsFromTemplate(subjectId, subjectCode) {
    if (!_templates.length) {
        try { _templates = await api.request('/api/visit-templates'); } catch {}
    }
    if (!_templates.length) {
        showToast('No visit templates available for this study', 'warning');
        return;
    }

    const options = _templates.map(t =>
        `<option value="${t.id}">${t.name} (${t.visitCount ?? 0} visits)</option>`
    ).join('');

    showModal({
        title: 'Generate Visit Schedule',
        size:  'md',
        body: `
      <div class="space-y-4">
        <p class="text-xs text-slate-500">Subject: <span class="font-semibold text-slate-700">${subjectCode}</span></p>
        <div>
          <label class="ph-label">Visit Template *</label>
          <select id="vt-gen-template" class="ph-input">${options}</select>
        </div>
        <div>
          <label class="ph-label">Enrollment / Day 0 Date</label>
          <input type="date" id="vt-gen-date" class="ph-input" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" id="vt-gen-overwrite" class="rounded">
          Remove existing un-used scheduled visits first
        </label>
      </div>`,
        footer: `
          <button onclick="closeModal()" class="ph-btn ph-btn-ghost text-sm">Cancel</button>
          <button onclick="window._vtDoGenerate(${subjectId})" class="ph-btn ph-btn-primary text-sm flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> Generate Visits
          </button>`,
    });
    lucide.createIcons();
}

window._vtDoGenerate = async (subjectId) => {
    const templateId     = parseInt(document.getElementById('vt-gen-template')?.value);
    const enrollmentDate = document.getElementById('vt-gen-date')?.value;
    const overwrite      = document.getElementById('vt-gen-overwrite')?.checked;

    try {
        const result = await api.request(`/api/visit-templates/${templateId}/generate/${subjectId}`, {
            method: 'POST',
            body: JSON.stringify({ enrollmentDate, overwrite }),
        });
        closeModal();
        showToast(`${result.generated} visit${result.generated === 1 ? '' : 's'} generated successfully`, 'success');
        // Trigger page reload to show new visits
        window.dispatchEvent(new CustomEvent('visits-generated', { detail: { subjectId } }));
    } catch (err) {
        showToast(err.message, 'error');
    }
};
