// CRF Form Builder — Admin UI
// Create/Edit dynamic CRF form schemas with field validation rules

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

const FIELD_TYPES = [
    { value: 'text',     label: 'Text' },
    { value: 'number',   label: 'Number' },
    { value: 'date',     label: 'Date' },
    { value: 'datetime', label: 'Date & Time' },
    { value: 'textarea', label: 'Textarea (Long text)' },
    { value: 'select',   label: 'Dropdown (Select)' },
    { value: 'radio',    label: 'Radio Buttons' },
    { value: 'checkbox', label: 'Checkbox (Multi-select)' },
    { value: 'boolean',  label: 'Yes / No' },
];

let _forms    = [];
let _editForm = null; // form being edited
let _fields   = [];   // current field list in builder

// ── Main render ──────────────────────────────────────────────────────────────
export async function renderFormBuilder(container) {
    container.innerHTML = `
    <div class="p-4 md:p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">CRF Form Builder</h2>
          <p class="text-xs text-slate-500 mt-0.5">Create and manage electronic Case Report Form templates</p>
        </div>
        <button onclick="window.fbNewForm()" class="ph-btn ph-btn-primary text-xs flex items-center gap-1.5">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> New Form
        </button>
      </div>
      <div id="fb-list"></div>
    </div>`;
    lucide.createIcons();
    await loadForms(container);
}

async function loadForms(container) {
    try {
        _forms = await api.request('/api/forms?all=1');
        renderFormList(container);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderFormList(container) {
    const el = document.getElementById('fb-list');
    if (!el) return;

    if (!_forms.length) {
        el.innerHTML = `
        <div class="ph-card p-12 flex flex-col items-center text-center">
          <div class="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <i data-lucide="clipboard-list" class="w-8 h-8 text-blue-400"></i>
          </div>
          <p class="text-base font-semibold text-slate-700 mb-1">No CRF forms yet</p>
          <p class="text-sm text-slate-400 mb-5 max-w-xs">Design the electronic Case Report Forms that investigators will use to capture clinical trial data.</p>
          <button onclick="window.fbNewForm()" class="ph-btn ph-btn-primary text-sm flex items-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i> Create your first form
          </button>
        </div>`;
        lucide.createIcons();
        return;
    }

    el.innerHTML = `
    <div class="space-y-2">
      ${_forms.map(f => `
        <div class="ph-card p-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-md ${f.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'} flex items-center justify-center flex-shrink-0">
              <i data-lucide="clipboard-list" class="w-4 h-4"></i>
            </div>
            <div class="min-w-0">
              <p class="font-semibold text-slate-800 text-sm truncate">${f.name}</p>
              <p class="text-xs text-slate-500">v${f.version} · ${f.isActive ? '<span class="text-emerald-600 font-medium">Active</span>' : '<span class="text-slate-400">Inactive</span>'}</p>
              ${f.description ? `<p class="text-xs text-slate-400 truncate">${f.description}</p>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button onclick="window.fbPreview(${f.id})" class="ph-btn ph-btn-ghost text-xs" title="Preview schema">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="window.fbEdit(${f.id})" class="ph-btn ph-btn-secondary text-xs">
              <i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit
            </button>
            <button onclick="window.fbToggleStatus(${f.id}, ${!f.isActive})" class="ph-btn ph-btn-ghost text-xs ${f.isActive ? 'text-amber-600' : 'text-emerald-600'}">
              <i data-lucide="${f.isActive ? 'toggle-left' : 'toggle-right'}" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="window.fbDelete(${f.id})" class="ph-btn ph-btn-ghost text-xs text-red-500">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>`).join('')}
    </div>`;
    lucide.createIcons();
}

// ── Form Builder Modal ────────────────────────────────────────────────────────
function openBuilderModal(form = null) {
    _editForm = form;
    _fields   = form ? JSON.parse(JSON.stringify(form.schemaJson?.fields ?? [])) : [];

    showModal({
        title: form ? 'Edit CRF Form' : 'New CRF Form',
        size:  'xl',
        body: `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="ph-label">Form Name *</label>
            <input id="fb-name" class="ph-input" value="${form?.name ?? ''}" placeholder="e.g. Vital Signs">
          </div>
          <div>
            <label class="ph-label">Version</label>
            <input id="fb-version" class="ph-input" value="${form?.version ?? '1.0'}" placeholder="1.0">
          </div>
        </div>
        <div>
          <label class="ph-label">Description</label>
          <input id="fb-description" class="ph-input" value="${form?.description ?? ''}" placeholder="Brief description (optional)">
        </div>
        <div class="border-t border-slate-100 pt-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-semibold text-slate-700">Fields <span id="fb-field-count" class="text-xs text-slate-400 font-normal">(${_fields.length})</span></p>
            <button onclick="window.fbAddField()" class="ph-btn ph-btn-secondary text-xs flex items-center gap-1">
              <i data-lucide="plus" class="w-3 h-3"></i> Add Field
            </button>
          </div>
          <div id="fb-fields" class="space-y-2 max-h-72 overflow-y-auto pr-1"></div>
        </div>
        ${form ? `
        <div>
          <label class="ph-label">Reason for Change *</label>
          <input id="fb-reason" class="ph-input" placeholder="Describe what changed and why">
        </div>` : ''}
      </div>`,
        footer: `
          <button onclick="closeModal()" class="ph-btn ph-btn-ghost text-sm">Cancel</button>
          <button onclick="window.fbSave()" class="ph-btn ph-btn-primary text-sm flex items-center gap-1.5">
            <i data-lucide="save" class="w-3.5 h-3.5"></i> ${form ? 'Save Changes' : 'Create Form'}
          </button>`,
    });

    renderFieldList();
    lucide.createIcons();
}

function renderFieldList() {
    const el = document.getElementById('fb-fields');
    const cnt = document.getElementById('fb-field-count');
    if (!el) return;
    if (cnt) cnt.textContent = `(${_fields.length})`;

    if (!_fields.length) {
        el.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">No fields yet. Click "Add Field" to start building.</p>`;
        return;
    }

    el.innerHTML = _fields.map((f, i) => `
    <div class="border border-slate-200 rounded-lg bg-slate-50 p-3 space-y-2">
      <div class="flex items-center gap-2">
        <div class="flex flex-col gap-0.5">
          <button onclick="window.fbMoveField(${i},-1)" class="text-slate-300 hover:text-slate-600 leading-none" ${i === 0 ? 'disabled' : ''}>
            <i data-lucide="chevron-up" class="w-3 h-3"></i>
          </button>
          <button onclick="window.fbMoveField(${i},1)" class="text-slate-300 hover:text-slate-600 leading-none" ${i === _fields.length - 1 ? 'disabled' : ''}>
            <i data-lucide="chevron-down" class="w-3 h-3"></i>
          </button>
        </div>
        <div class="flex-1 grid grid-cols-3 gap-2">
          <div>
            <label class="ph-label text-xs">Key *</label>
            <input class="ph-input text-xs" value="${f.key}" onchange="window.fbUpdateField(${i},'key',this.value)" placeholder="snake_case">
          </div>
          <div>
            <label class="ph-label text-xs">Label *</label>
            <input class="ph-input text-xs" value="${f.label}" onchange="window.fbUpdateField(${i},'label',this.value)" placeholder="Display label">
          </div>
          <div>
            <label class="ph-label text-xs">Type *</label>
            <select class="ph-input text-xs" onchange="window.fbUpdateField(${i},'type',this.value)">
              ${FIELD_TYPES.map(t => `<option value="${t.value}" ${f.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <button onclick="window.fbRemoveField(${i})" class="text-red-400 hover:text-red-600 p-1 flex-shrink-0">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      </div>
      <div class="flex items-center gap-4 pl-6">
        <label class="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" ${f.required ? 'checked' : ''} onchange="window.fbUpdateField(${i},'required',this.checked)" class="rounded">
          Required
        </label>
        <div class="flex-1">
          <input class="ph-input text-xs" value="${f.placeholder ?? ''}" onchange="window.fbUpdateField(${i},'placeholder',this.value)" placeholder="Placeholder text (optional)">
        </div>
      </div>
      ${(f.type === 'number') ? `
      <div class="flex items-center gap-2 pl-6">
        <div class="flex-1">
          <label class="ph-label text-xs">Min</label>
          <input type="number" class="ph-input text-xs" value="${f.min ?? ''}" onchange="window.fbUpdateField(${i},'min',this.value ? +this.value : null)" placeholder="—">
        </div>
        <div class="flex-1">
          <label class="ph-label text-xs">Max</label>
          <input type="number" class="ph-input text-xs" value="${f.max ?? ''}" onchange="window.fbUpdateField(${i},'max',this.value ? +this.value : null)" placeholder="—">
        </div>
        <div class="flex-1">
          <label class="ph-label text-xs">Unit</label>
          <input class="ph-input text-xs" value="${f.unit ?? ''}" onchange="window.fbUpdateField(${i},'unit',this.value)" placeholder="e.g. mmHg">
        </div>
        <div class="flex-1">
          <label class="ph-label text-xs">Soft Min</label>
          <input type="number" class="ph-input text-xs" value="${f.softMin ?? ''}" onchange="window.fbUpdateField(${i},'softMin',this.value ? +this.value : null)" placeholder="—">
        </div>
        <div class="flex-1">
          <label class="ph-label text-xs">Soft Max</label>
          <input type="number" class="ph-input text-xs" value="${f.softMax ?? ''}" onchange="window.fbUpdateField(${i},'softMax',this.value ? +this.value : null)" placeholder="—">
        </div>
      </div>` : ''}
      ${(f.type === 'select' || f.type === 'radio' || f.type === 'checkbox') ? `
      <div class="pl-6">
        <label class="ph-label text-xs">Options (one per line) *</label>
        <textarea class="ph-input text-xs" rows="3" onchange="window.fbUpdateOptions(${i},this.value)" placeholder="Option A&#10;Option B&#10;Option C">${(f.options ?? []).join('\n')}</textarea>
      </div>` : ''}
    </div>`).join('');
    lucide.createIcons();
}

// ── Field operations ─────────────────────────────────────────────────────────
window.fbAddField = () => {
    _fields.push({ key: '', label: '', type: 'text', required: false });
    renderFieldList();
};

window.fbRemoveField = (i) => {
    _fields.splice(i, 1);
    renderFieldList();
};

window.fbMoveField = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= _fields.length) return;
    [_fields[i], _fields[j]] = [_fields[j], _fields[i]];
    renderFieldList();
};

window.fbUpdateField = (i, key, value) => {
    _fields[i] = { ..._fields[i], [key]: value };
    if (key === 'type') renderFieldList(); // re-render for type-specific inputs
};

window.fbUpdateOptions = (i, text) => {
    _fields[i].options = text.split('\n').map(s => s.trim()).filter(Boolean);
};

// ── Save form ─────────────────────────────────────────────────────────────────
window.fbSave = async () => {
    const name        = document.getElementById('fb-name')?.value?.trim();
    const version     = document.getElementById('fb-version')?.value?.trim();
    const description = document.getElementById('fb-description')?.value?.trim();
    const reason      = document.getElementById('fb-reason')?.value?.trim();

    if (!name) return showToast('Form name is required', 'error');

    // Validate fields
    for (let i = 0; i < _fields.length; i++) {
        const f = _fields[i];
        if (!f.key)   return showToast(`Field ${i + 1}: key is required`, 'error');
        if (!f.label) return showToast(`Field ${i + 1}: label is required`, 'error');
        if (!f.type)  return showToast(`Field ${i + 1}: type is required`, 'error');
        if (!f.key.match(/^[a-z_][a-z0-9_]*$/))
            return showToast(`Field ${i + 1}: key must be snake_case (lowercase letters, digits, underscores)`, 'error');
    }

    if (_editForm && !reason) return showToast('Reason for change is required', 'error');

    const schemaJson = { fields: _fields };

    try {
        if (_editForm) {
            await api.request(`/api/forms/${_editForm.id}`, {
                method: 'PUT',
                body:   JSON.stringify({ name, version, description, schemaJson, reason }),
            });
            showToast('Form updated successfully', 'success');
        } else {
            await api.request('/api/forms', {
                method: 'POST',
                body:   JSON.stringify({ name, version, description, schemaJson }),
            });
            showToast('Form created successfully', 'success');
        }
        closeModal();
        _forms = await api.request('/api/forms?all=1');
        renderFormList(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// ── Public handlers ──────────────────────────────────────────────────────────
window.fbNewForm = () => openBuilderModal(null);

window.fbEdit = async (id) => {
    try {
        const form = await api.request(`/api/forms/${id}`);
        openBuilderModal(form);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.fbPreview = async (id) => {
    const form = _forms.find(f => f.id === id) || await api.request(`/api/forms/${id}`);
    const full = await api.request(`/api/forms/${id}`);
    const fields = full.schemaJson?.fields ?? [];
    showModal({
        title:  `${form.name} — v${form.version}`,
        size:   'lg',
        body: `
      <div class="space-y-2 max-h-96 overflow-y-auto">
        ${fields.length ? fields.map(f => `
        <div class="border border-slate-200 rounded-lg p-3 bg-slate-50">
          <div class="flex items-center justify-between mb-1">
            <p class="text-sm font-medium text-slate-700">${f.label} ${f.required ? '<span class="text-red-500">*</span>' : ''}</p>
            <span class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">${f.type}</span>
          </div>
          <p class="text-xs text-slate-400 font-mono">key: ${f.key}</p>
          ${f.unit ? `<p class="text-xs text-slate-500">Unit: ${f.unit}</p>` : ''}
          ${f.min != null || f.max != null ? `<p class="text-xs text-slate-500">Range: ${f.min ?? '—'} – ${f.max ?? '—'}</p>` : ''}
          ${f.softMin != null || f.softMax != null ? `<p class="text-xs text-amber-600">Soft alert: ${f.softMin ?? '—'} – ${f.softMax ?? '—'}</p>` : ''}
          ${f.options?.length ? `<p class="text-xs text-slate-500">Options: ${f.options.join(' · ')}</p>` : ''}
        </div>`).join('') : '<p class="text-xs text-slate-400 text-center py-8">No fields defined in this form.</p>'}
      </div>`,
        footer: `<button onclick="closeModal()" class="ph-btn ph-btn-ghost text-sm">Close</button>`,
    });
    lucide.createIcons();
};

window.fbToggleStatus = async (id, activate) => {
    const reason = prompt(`Reason for ${activate ? 'activating' : 'deactivating'} this form?`);
    if (!reason) return;
    try {
        await api.request(`/api/forms/${id}/status`, {
            method: 'PATCH',
            body:   JSON.stringify({ isActive: activate, reason }),
        });
        showToast(`Form ${activate ? 'activated' : 'deactivated'}`, 'success');
        _forms = await api.request('/api/forms?all=1');
        renderFormList(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.fbDelete = async (id) => {
    const form = _forms.find(f => f.id === id);
    if (!confirm(`Delete form "${form?.name}"? This cannot be undone.`)) return;
    const reason = prompt('Reason for deletion?');
    if (!reason) return;
    try {
        await api.request(`/api/forms/${id}`, {
            method: 'DELETE',
            body:   JSON.stringify({ reason }),
        });
        showToast('Form deleted', 'success');
        _forms = await api.request('/api/forms?all=1');
        renderFormList(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};
