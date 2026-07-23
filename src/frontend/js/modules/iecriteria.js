// Shared Inclusion/Exclusion criteria: the app default set + a small reusable
// editor used by Study Management. The enrollment flow (subjects.js) reads a
// study's configured criteria and falls back to DEFAULT_IE_CRITERIA when a
// study has none (studies.ie_criteria = NULL).

export const DEFAULT_IE_CRITERIA = {
    inclusion: [
        { key: 'inc_age',     label: 'Age 18–65 years at time of screening' },
        { key: 'inc_consent', label: 'Written informed consent obtained prior to any study procedure' },
        { key: 'inc_capable', label: 'Subject is capable of understanding and complying with protocol requirements' },
        { key: 'inc_health',  label: 'Medically stable as determined by the Investigator' },
    ],
    exclusion: [
        { key: 'exc_pregnant',  label: 'Pregnant, breastfeeding, or planning pregnancy during the study period' },
        { key: 'exc_allergy',   label: 'Known hypersensitivity or contraindication to the study drug or excipients' },
        { key: 'exc_renal',     label: 'Significant renal impairment (eGFR < 30 mL/min/1.73m²)' },
        { key: 'exc_hepatic',   label: 'Significant hepatic impairment (Child-Pugh B or C)' },
        { key: 'exc_trial',     label: 'Participation in another interventional clinical trial within 30 days' },
        { key: 'exc_infection', label: 'Active systemic infection or serious illness at time of screening' },
    ],
};

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

// True when a study's criteria object actually has at least one criterion.
export function hasCriteria(c) {
    return !!c && (Array.isArray(c.inclusion) && c.inclusion.length > 0 ||
                   Array.isArray(c.exclusion) && c.exclusion.length > 0);
}

// ── Editor (used inside the Add/Edit study modals) ──────────────────────────
// `prefix` namespaces element ids so the Add and Edit modals can each host one.

function rowHtml(label) {
    return `
    <div class="ie-row flex items-center gap-2 mb-1.5">
        <input type="text" value="${esc(label)}"
            class="ie-input flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <button type="button" class="ie-remove shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition" title="Remove">&times;</button>
    </div>`;
}

export function criteriaEditorHtml(prefix) {
    return `
    <div class="border-t border-slate-100 pt-3 mt-1">
        <p class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Inclusion / Exclusion Criteria</p>
        <p class="text-[11px] text-slate-400 mb-2">Shown when enrolling a subject in this study. Leave default if unsure.</p>

        <p class="text-[11px] font-bold text-emerald-700 uppercase tracking-wide mb-1">Inclusion — all must be met</p>
        <div id="${prefix}-inc-list"></div>
        <button type="button" id="${prefix}-inc-add" class="text-xs text-blue-600 hover:underline mb-3">+ Add inclusion criterion</button>

        <p class="text-[11px] font-bold text-red-700 uppercase tracking-wide mb-1">Exclusion — none must apply</p>
        <div id="${prefix}-exc-list"></div>
        <button type="button" id="${prefix}-exc-add" class="text-xs text-blue-600 hover:underline">+ Add exclusion criterion</button>
    </div>`;
}

// Populate both lists from a criteria object (falls back to the default set).
export function fillCriteriaEditor(prefix, criteria) {
    const c = hasCriteria(criteria) ? criteria : DEFAULT_IE_CRITERIA;
    const inc = document.getElementById(`${prefix}-inc-list`);
    const exc = document.getElementById(`${prefix}-exc-list`);
    if (inc) inc.innerHTML = (c.inclusion || []).map(x => rowHtml(x.label)).join('');
    if (exc) exc.innerHTML = (c.exclusion || []).map(x => rowHtml(x.label)).join('');
}

// Read the editor back into { inclusion:[{label}], exclusion:[{label}] }.
// Keys are assigned server-side by sanitizeIeCriteria, so we send labels only.
export function readCriteriaEditor(prefix) {
    const collect = listId => Array.from(
        document.querySelectorAll(`#${listId} .ie-input`)
    ).map(i => ({ label: i.value.trim() })).filter(x => x.label);
    return {
        inclusion: collect(`${prefix}-inc-list`),
        exclusion: collect(`${prefix}-exc-list`),
    };
}

// Attach add/remove behavior. Idempotent per prefix within a rendered modal.
export function wireCriteriaEditor(prefix) {
    document.getElementById(`${prefix}-inc-add`)?.addEventListener('click', () => {
        document.getElementById(`${prefix}-inc-list`)?.insertAdjacentHTML('beforeend', rowHtml(''));
    });
    document.getElementById(`${prefix}-exc-add`)?.addEventListener('click', () => {
        document.getElementById(`${prefix}-exc-list`)?.insertAdjacentHTML('beforeend', rowHtml(''));
    });
    // Remove buttons (event delegation so it covers dynamically added rows).
    for (const listId of [`${prefix}-inc-list`, `${prefix}-exc-list`]) {
        document.getElementById(listId)?.addEventListener('click', e => {
            const btn = e.target.closest('.ie-remove');
            if (btn) btn.closest('.ie-row')?.remove();
        });
    }
}
