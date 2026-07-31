// CRF Form Builder — Admin UI
// Create/Edit dynamic CRF form schemas with field validation rules

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';
import { renderField } from './forms.js';

const FIELD_TYPES = [
    { value: 'text',     label: 'Short text' },
    { value: 'textarea', label: 'Long text (paragraph)' },
    { value: 'number',   label: 'Number' },
    { value: 'date',     label: 'Date' },
    { value: 'datetime', label: 'Date & time' },
    { value: 'select',   label: 'Choose one (dropdown)' },
    { value: 'radio',    label: 'Choose one (buttons)' },
    { value: 'checkbox', label: 'Choose several' },
    { value: 'boolean',  label: 'Yes / No' },
];

const CHOICE_TYPES = ['select', 'radio', 'checkbox'];

// Form names and descriptions are operator-entered free text.
const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

let _forms     = [];
let _editForm  = null; // form being edited
let _fields    = [];   // current field list in builder
let _draftMeta = null; // header inputs held across a preview round-trip

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
              <p class="font-semibold text-slate-800 text-sm truncate">${esc(f.name)}</p>
              <p class="text-xs text-slate-500">v${esc(f.version)} · ${f.isActive ? '<span class="text-emerald-600 font-medium">Active</span>' : '<span class="text-slate-400">Inactive</span>'}</p>
              ${f.description ? `<p class="text-xs text-slate-400 truncate">${esc(f.description)}</p>` : ''}
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
// `meta` carries the header inputs back from the preview so nothing typed is
// lost. The question list is not passed back — `_fields` is module state that
// the preview never replaced, so it is already current.
function openBuilderModal(form = null, meta = null) {
    _editForm = form;
    if (!meta) {
        _fields = form ? JSON.parse(JSON.stringify(form.schemaJson?.fields ?? [])) : [];
    }

    showModal({
        title: form ? 'Edit CRF Form' : 'New CRF Form',
        size:  'xl',
        body: `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="ph-label">Form Name *</label>
            <input id="fb-name" class="ph-input" value="${esc(meta?.name ?? form?.name ?? '')}" placeholder="e.g. Vital Signs">
          </div>
          <div>
            <label class="ph-label">Version</label>
            <input id="fb-version" class="ph-input" value="${esc(meta?.version ?? form?.version ?? '1.0')}" placeholder="1.0">
          </div>
        </div>
        <div>
          <label class="ph-label">Description</label>
          <input id="fb-description" class="ph-input" value="${esc(meta?.description ?? form?.description ?? '')}" placeholder="Brief description (optional)">
        </div>
        <div class="border-t border-slate-100 pt-4">
          <div class="flex items-center justify-between mb-1">
            <p class="text-sm font-semibold text-slate-700">Questions <span id="fb-field-count" class="text-xs text-slate-400 font-normal">(${_fields.length})</span></p>
            <div class="flex items-center gap-1.5">
              <button onclick="window.fbPreviewDraft()" class="ph-btn ph-btn-ghost text-xs flex items-center gap-1" title="See this form the way the person filling it will see it">
                <i data-lucide="eye" class="w-3 h-3"></i> Preview
              </button>
              <button onclick="window.fbAddField()" class="ph-btn ph-btn-secondary text-xs flex items-center gap-1">
                <i data-lucide="plus" class="w-3 h-3"></i> Add Question
              </button>
            </div>
          </div>
          <p class="text-xs text-slate-400 mb-3">Each question becomes one box on the form. Use <span class="font-medium text-slate-500">Preview</span> at any time to see the result.</p>
          <div id="fb-fields" class="space-y-2 max-h-72 overflow-y-auto pr-1"></div>
        </div>
        ${form ? `
        <div>
          <label class="ph-label">Reason for Change *</label>
          <input id="fb-reason" class="ph-input" value="${esc(meta?.reason ?? '')}" placeholder="Describe what changed and why">
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
        el.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">No questions yet. Click "Add Question" to start building.</p>`;
        return;
    }

    // Replacing innerHTML resets the scroll box to the top and snaps every
    // Advanced panel shut. Changing the answer type on question 8 therefore
    // threw the designer back to question 1 with their export codes hidden.
    // Carry both across the rebuild. After a move or a delete the open panels
    // are matched by position rather than by question, which is close enough
    // to be unnoticeable and never wrong in a way that loses data.
    const scrollTop = el.scrollTop;
    const wasOpen = new Set();
    [...el.querySelectorAll('.fb-field-row')].forEach((row, i) => {
        if (row.querySelector('details')?.open) wasOpen.add(i);
    });

    el.innerHTML = _fields.map((f, i) => `
    <div class="fb-field-row border border-slate-200 rounded-lg bg-slate-50 p-3 space-y-2" data-index="${i}">
      <div class="flex items-center gap-2">
        <div class="flex flex-col gap-0.5">
          <button onclick="window.fbMoveField(${i},-1)" class="text-slate-300 hover:text-slate-600 leading-none" ${i === 0 ? 'disabled' : ''}>
            <i data-lucide="chevron-up" class="w-3 h-3"></i>
          </button>
          <button onclick="window.fbMoveField(${i},1)" class="text-slate-300 hover:text-slate-600 leading-none" ${i === _fields.length - 1 ? 'disabled' : ''}>
            <i data-lucide="chevron-down" class="w-3 h-3"></i>
          </button>
        </div>
        <div class="flex-1 grid grid-cols-2 gap-2">
          <div>
            <label class="ph-label text-xs">Question / Label *</label>
            <input class="fb-label-input ph-input text-xs" value="${esc(f.label)}" onchange="window.fbUpdateField(${i},'label',this.value)" placeholder="e.g. Serum Creatinine">
          </div>
          <div>
            <label class="ph-label text-xs">Answer Type *</label>
            <select class="ph-input text-xs" onchange="window.fbUpdateField(${i},'type',this.value)">
              ${FIELD_TYPES.map(t => `<option value="${t.value}" ${f.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <button onclick="window.fbRemoveField(${i})" class="text-red-400 hover:text-red-600 p-1 flex-shrink-0">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      </div>
      <div class="flex items-center gap-4 pl-6 flex-wrap">
        <label class="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer" title="The form cannot be saved while this question is blank">
          <input type="checkbox" ${f.required ? 'checked' : ''} onchange="window.fbUpdateField(${i},'required',this.checked)" class="rounded">
          Must be answered
        </label>
        <label class="flex items-center gap-1.5 text-xs text-red-600 cursor-pointer" title="ICH E6(R3) §5.0.5 — critical data is prioritised for source data verification by the monitor">
          <input type="checkbox" ${f.isCritical ? 'checked' : ''} onchange="window.fbUpdateField(${i},'isCritical',this.checked)" class="rounded accent-red-500">
          <span class="font-medium">Key result</span>
          <span class="text-slate-400 font-normal">(monitor checks this first)</span>
        </label>
        <div class="flex-1 min-w-40">
          <input class="ph-input text-xs" value="${esc(f.placeholder ?? '')}" onchange="window.fbUpdateField(${i},'placeholder',this.value)" placeholder="Hint shown inside the empty box (optional)">
        </div>
      </div>
      ${(f.type === 'number') ? `
      <div class="pl-6 space-y-2">
        <div class="flex items-end gap-2 flex-wrap">
          <div class="w-20">
            <label class="ph-label text-xs">Unit</label>
            <input class="ph-input text-xs" value="${esc(f.unit ?? '')}" onchange="window.fbUpdateField(${i},'unit',this.value)" placeholder="mmHg">
          </div>
          <div class="flex-1 min-w-48 rounded-md border border-red-200 bg-red-50/60 px-2 py-1.5">
            <p class="text-xs font-medium text-red-700">Impossible values — refuse to save</p>
            <div class="flex items-center gap-2 mt-1">
              <input type="number" class="ph-input text-xs" value="${esc(f.min ?? '')}" onchange="window.fbUpdateField(${i},'min',this.value ? +this.value : null)" placeholder="lowest">
              <span class="text-xs text-slate-400">to</span>
              <input type="number" class="ph-input text-xs" value="${esc(f.max ?? '')}" onchange="window.fbUpdateField(${i},'max',this.value ? +this.value : null)" placeholder="highest">
            </div>
          </div>
          <div class="flex-1 min-w-48 rounded-md border border-amber-200 bg-amber-50/60 px-2 py-1.5">
            <p class="text-xs font-medium text-amber-700">Unusual values — allow, but ask</p>
            <div class="flex items-center gap-2 mt-1">
              <input type="number" class="ph-input text-xs" value="${esc(f.softMin ?? '')}" onchange="window.fbUpdateField(${i},'softMin',this.value ? +this.value : null)" placeholder="lowest">
              <span class="text-xs text-slate-400">to</span>
              <input type="number" class="ph-input text-xs" value="${esc(f.softMax ?? '')}" onchange="window.fbUpdateField(${i},'softMax',this.value ? +this.value : null)" placeholder="highest">
            </div>
          </div>
        </div>
        <p class="text-xs text-slate-400">Leave a box empty for no limit. A value outside the <span class="text-red-600">red</span> range cannot be saved at all; one outside the <span class="text-amber-600">amber</span> range saves normally but raises a question for the site to confirm it.</p>
        <label class="flex items-center gap-1.5 text-xs text-amber-700 cursor-pointer">
          <input type="checkbox" ${f.autoQueryOnRangeViolation !== false ? 'checked' : ''} onchange="window.fbUpdateField(${i},'autoQueryOnRangeViolation',this.checked)" class="rounded accent-amber-500">
          <span>Raise that question automatically</span>
        </label>
      </div>` : ''}
      ${CHOICE_TYPES.includes(f.type) ? `
      <div class="pl-6 space-y-2">
        <div>
          <label class="ph-label text-xs">Answer choices — one per line *</label>
          <textarea class="ph-input text-xs" rows="3" onchange="window.fbUpdateOptions(${i},this.value)" placeholder="Option A&#10;Option B&#10;Option C">${esc((f.options ?? []).join('\n'))}</textarea>
        </div>
        <label class="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" ${f.closedCodelist ? 'checked' : ''} onchange="window.fbUpdateField(${i},'closedCodelist',this.checked)" class="rounded accent-blue-500">
          <span class="font-medium">Only these answers are allowed</span>
          <span class="text-slate-400">— reject anything else, including imported data</span>
        </label>
      </div>` : ''}
      <div class="pl-6">
        <details class="group" ${wasOpen.has(i) ? 'open' : ''}>
          <summary class="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none list-none flex items-center gap-1">
            <i data-lucide="chevron-right" class="w-3 h-3 transition-transform group-open:rotate-90"></i>
            Advanced <span class="text-slate-300">(optional — export codes &amp; conditional rules)</span>
            ${(f.cdashVar || f.sdtmDomain || f.sdtmVar || f.pattern || f.conditionalRequired?.ifField)
                ? `<span class="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">configured</span>` : ''}
          </summary>
          <div class="mt-2 space-y-3">
            <div class="flex items-center gap-2 flex-wrap">
              <div class="flex items-center gap-1" title="Internal field ID used in exports & queries. Auto-generated from the label.">
                <span class="text-xs text-slate-400 whitespace-nowrap">Field ID:</span>
                <input class="fb-key-input ph-input text-xs w-40 font-mono" value="${esc(f.key)}"
                       onchange="window.fbUpdateField(${i},'key',this.value)" placeholder="auto-generated">
              </div>
              <div class="flex items-center gap-1">
                <span class="text-xs text-slate-400 whitespace-nowrap" title="CDISC CDASH variable mapping (for standards-compliant export)">CDASH:</span>
                <input class="ph-input text-xs w-24" value="${esc(f.cdashVar ?? '')}"
                       onchange="window.fbUpdateField(${i},'cdashVar',this.value)"
                       placeholder="e.g. AESTDTC" title="CDASH variable name">
              </div>
              <div class="flex items-center gap-1">
                <span class="text-xs text-slate-400 whitespace-nowrap" title="CDISC SDTM domain.variable mapping (for standards-compliant export)">SDTM:</span>
                <input class="ph-input text-xs w-20" value="${esc(f.sdtmDomain ?? '')}"
                       onchange="window.fbUpdateField(${i},'sdtmDomain',this.value)"
                       placeholder="AE" title="SDTM domain (e.g. AE, CM, VS)">
                <span class="text-xs text-slate-300">.</span>
                <input class="ph-input text-xs w-24" value="${esc(f.sdtmVar ?? '')}"
                       onchange="window.fbUpdateField(${i},'sdtmVar',this.value)"
                       placeholder="AETERM" title="SDTM variable name">
              </div>
            </div>
            ${(f.type === 'text' || f.type === 'textarea') ? `
            <div class="flex gap-2">
              <div class="flex-1">
                <label class="ph-label text-xs">Input format rule (regex)</label>
                <input class="ph-input text-xs font-mono" value="${esc(f.pattern ?? '')}" onchange="window.fbUpdateField(${i},'pattern',this.value||null)" placeholder="e.g. ^[A-Z]{2}\\d{4}$">
              </div>
              <div class="flex-1">
                <label class="ph-label text-xs">Message shown when format is wrong</label>
                <input class="ph-input text-xs" value="${esc(f.patternMessage ?? '')}" onchange="window.fbUpdateField(${i},'patternMessage',this.value||null)" placeholder="e.g. Must be 2 letters + 4 digits">
              </div>
            </div>` : ''}
            <div>
              <p class="text-xs text-slate-500 mb-1">Conditionally required — make this field required only when another field has a certain answer
                ${f.conditionalRequired?.ifField ? `<span class="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">active</span>` : ''}</p>
              <div class="flex gap-2 items-end">
                <div class="flex-1">
                  <label class="ph-label text-xs">Required if field (Field ID)</label>
                  <input class="ph-input text-xs font-mono" value="${esc(f.conditionalRequired?.ifField ?? '')}"
                         onchange="window.fbUpdateConditional(${i},'ifField',this.value)"
                         placeholder="other_field_id">
                </div>
                <div class="flex items-center text-xs text-slate-400 pb-2">=</div>
                <div class="flex-1">
                  <label class="ph-label text-xs">equals value</label>
                  <input class="ph-input text-xs" value="${esc(f.conditionalRequired?.ifValue ?? '')}"
                         onchange="window.fbUpdateConditional(${i},'ifValue',this.value)"
                         placeholder="Yes">
                </div>
                <button onclick="window.fbClearConditional(${i})" class="pb-2 text-xs text-red-400 hover:text-red-600" title="Clear rule">✕</button>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>`).join('');
    el.scrollTop = scrollTop;
    lucide.createIcons();
}

// ── Field operations ─────────────────────────────────────────────────────────
window.fbAddField = () => {
    _fields.push({ key: '', label: '', type: 'text', required: false });
    renderFieldList();
    // The list sits in a short scroll box, so a new row lands out of sight once
    // there are a few questions — the click reads as "nothing happened" and
    // people click again. Bring it into view and put the cursor in it.
    const rows = document.querySelectorAll('#fb-fields .fb-field-row');
    const last = rows[rows.length - 1];
    if (!last) return;
    last.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    last.querySelector('.fb-label-input')?.focus();
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

// Derive a machine key from a human label ("Serum Creatinine" → "serum_creatinine")
// so form designers never have to know what snake_case is. Must produce a key
// matching FIELD_KEY_RE in backend/lib/formschema.js, which is the authority
// that rejects anything else.
// `excludeIndex` is the question being renamed — its own key must not count as
// taken, or every keystroke would bump the suffix.
function slugifyKey(label, excludeIndex = -1) {
    // An empty label has no key yet; fbSave stops the designer there anyway.
    if (!String(label ?? '').trim()) return '';

    const base = String(label)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    // A label written in a non-Latin script ("血压", "давление") strips to
    // nothing, and returning '' put the form in a state that could not be
    // saved while blaming a Field ID the designer never typed. Fall back to a
    // positional key: still valid, still unique, and editable under Advanced.
    const seed = base
        ? (/^[a-z_]/.test(base) ? base : `f_${base}`)
        : 'field';
    const taken = new Set(_fields.filter((_, n) => n !== excludeIndex).map(f => f.key).filter(Boolean));
    if (!taken.has(seed)) return seed;
    for (let n = 2; ; n++) {
        if (!taken.has(`${seed}_${n}`)) return `${seed}_${n}`;
    }
}

window.fbUpdateField = (i, key, value) => {
    const prev = _fields[i];
    // A handler left over from a render that has since shrunk the list would
    // otherwise throw on prev.key below, and an inline onchange has nowhere to
    // report that — the edit just silently stops working.
    if (!prev) return;
    _fields[i] = { ...prev, [key]: value };
    // Auto-generate the field key from the label unless the user customized it.
    // Two questions labelled the same would otherwise claim one storage slot;
    // deriveFieldKey suffixes the second (serum_creatinine_2).
    if (key === 'label' && (!prev.key || prev.key === slugifyKey(prev.label, i))) {
        _fields[i].key = slugifyKey(value, i);
        // Only the Field ID box shows the key, so only the Field ID box needs
        // updating. Rebuilding the whole list here was actively harmful:
        // onchange fires on blur, so clicking from the label into any other
        // control destroyed that control before the click reached it — the
        // dropdown simply refused to open the first time.
        const box = document.querySelector(`#fb-fields .fb-field-row[data-index="${i}"] .fb-key-input`);
        if (box) box.value = _fields[i].key;
    }
    if (key === 'type') renderFieldList(); // re-render for type-specific inputs
};

window.fbUpdateOptions = (i, text) => {
    _fields[i].options = text.split('\n').map(s => s.trim()).filter(Boolean);
};

window.fbUpdateConditional = (i, prop, value) => {
    if (!_fields[i].conditionalRequired) _fields[i].conditionalRequired = {};
    _fields[i].conditionalRequired[prop] = value !== '' ? value : null;
    const cr = _fields[i].conditionalRequired;
    if (!cr.ifField && (cr.ifValue === null || cr.ifValue === undefined)) {
        delete _fields[i].conditionalRequired;
    }
};

window.fbClearConditional = (i) => {
    delete _fields[i].conditionalRequired;
    renderFieldList();
};

// ── Save form ─────────────────────────────────────────────────────────────────
window.fbSave = async () => {
    const name        = document.getElementById('fb-name')?.value?.trim();
    const version     = document.getElementById('fb-version')?.value?.trim();
    const description = document.getElementById('fb-description')?.value?.trim();
    const reason      = document.getElementById('fb-reason')?.value?.trim();

    if (!name) return showToast('Form name is required', 'error');

    // Validate fields. The server re-checks all of this; catching it here just
    // saves a round-trip and lets the message name the question, not an index.
    const seenKeys = new Map();   // key → label of the question that claimed it
    for (let i = 0; i < _fields.length; i++) {
        const f  = _fields[i];
        const at = f.label ? `"${f.label}"` : `Question ${i + 1}`;
        if (!f.label) return showToast(`Question ${i + 1}: please fill in the question/label`, 'error');
        if (!f.key) f.key = slugifyKey(f.label, i);   // auto-derive — designers never type keys
        if (!f.type)  return showToast(`${at}: please choose an answer type`, 'error');
        if (!f.key.match(/^[a-z_][a-z0-9_]*$/))
            return showToast(`${at}: the Field ID (under Advanced) may only contain lowercase letters, digits and underscores`, 'error');
        if (seenKeys.has(f.key)) {
            return showToast(
                `${at} and "${seenKeys.get(f.key)}" share the Field ID "${f.key}" — their answers would overwrite each other. Change one under Advanced.`,
                'error',
            );
        }
        seenKeys.set(f.key, f.label);
        if (CHOICE_TYPES.includes(f.type) && !(f.options?.length))
            return showToast(`${at}: add at least one answer choice`, 'error');
    }

    if (_editForm && !reason) return showToast('Reason for change is required', 'error');

    // The builder only edits `fields`, but it is not the only thing that may
    // ever live in a schema. Rebuilding the object from scratch silently
    // dropped every other top-level property on save, so anything a future
    // version (or a hand-written schema) put there was destroyed by an admin
    // opening the form and clicking Save.
    const schemaJson = { ...(_editForm?.schemaJson ?? {}), fields: _fields };

    // The schema endpoints answer 422 with { error: 'Invalid schema', details: [...] },
    // where `details` is the part that says which question is wrong. Showing
    // only `error` left the designer with "Invalid schema" and nothing to act on.
    const explain = (err) => (err.details?.length
        ? `${err.message}: ${err.details.join(' · ')}`
        : err.message);

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
        showToast(explain(err), 'error');
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

// Show a form the way the person filling it will actually see it. This uses the
// data-entry renderer itself, so what you preview is what gets rendered on the
// visit — a preview drawn by separate code drifts and stops being evidence.
// `onBack` returns to the builder modal the preview was opened from.
function showFormPreview({ title, subtitle, fields, onBack = null }) {
    showModal({
        title,
        size: 'lg',
        body: `
      <div class="space-y-3">
        <div class="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
          <i data-lucide="eye" class="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0"></i>
          <p class="text-xs text-blue-800">This is how the form will look during data entry. You can type in it to try it out — nothing is saved.</p>
        </div>
        ${subtitle ? `<p class="text-xs text-slate-400">${esc(subtitle)}</p>` : ''}
        <div class="max-h-[60vh] overflow-y-auto pr-1">
          ${fields.length
            ? `<div class="grid grid-cols-2 gap-x-4 gap-y-3">
                 ${fields.map(f => renderField(f, {}, false, {}, { preview: true })).join('')}
               </div>`
            : '<p class="text-xs text-slate-400 text-center py-8">No questions yet — add one and preview again.</p>'}
        </div>
      </div>`,
        footer: onBack
            ? `<button onclick="window.fbBackToBuilder()" class="ph-btn ph-btn-secondary text-sm flex items-center gap-1.5">
                 <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Back to editing
               </button>`
            : `<button onclick="closeModal()" class="ph-btn ph-btn-ghost text-sm">Close</button>`,
    });
    lucide.createIcons();
}

// Preview the form currently open in the builder — including unsaved edits.
window.fbPreviewDraft = () => {
    // Capture the header inputs so returning to the builder does not lose them.
    _draftMeta = {
        name:        document.getElementById('fb-name')?.value ?? '',
        version:     document.getElementById('fb-version')?.value ?? '',
        description: document.getElementById('fb-description')?.value ?? '',
        reason:      document.getElementById('fb-reason')?.value ?? '',
    };
    const named = _fields.filter(f => f.label);
    showFormPreview({
        title:    `Preview — ${_draftMeta.name || 'Untitled form'}`,
        subtitle: named.length < _fields.length
            ? `${_fields.length - named.length} question(s) without a label are not shown.`
            : '',
        fields:   named,
        onBack:   true,
    });
};

window.fbBackToBuilder = () => {
    openBuilderModal(_editForm, _draftMeta);
};

// Preview a saved form from the list.
window.fbPreview = async (id) => {
    try {
        const full = await api.request(`/api/forms/${id}`);
        showFormPreview({
            title:    `${full.name} — v${full.version}`,
            subtitle: full.description || '',
            fields:   full.schemaJson?.fields ?? [],
        });
    } catch (err) {
        showToast(err.message, 'error');
    }
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
