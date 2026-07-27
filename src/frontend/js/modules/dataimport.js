// Data Import wizard — upload a per-site / per-visit spreadsheet, auto-derive the
// CRF form, map columns, preview (dry-run), then commit. Reuses the backend
// /api/import endpoints; study-scoped and additive (no other flow is touched).

import { api } from './api.js';
import { showToast } from './utils.js';
import { parseCSV } from '../../vendor/csvparse.js';

const TARGETS = [
    { v: 'skip',           t: '— skip —' },
    { v: 'subjectCode',    t: 'Subject Code' },
    { v: 'sex',            t: 'Sex' },
    { v: 'initials',       t: 'Initials' },
    { v: 'genderIdentity', t: 'Gender Identity' },
    { v: 'visitDate',      t: 'Visit Date (actual)' },
    { v: 'crf',            t: 'CRF field (auto-named)' },
    { v: 'ae',             t: 'Adverse Event' },
    { v: 'aeSerious',      t: 'Serious Adverse Event' },
];

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Best-guess target for a header.
function autoTarget(h) {
    const s = h.toLowerCase();
    if (/(^|\b)(id\s*subj|subjid|subject\s*id|id subjek)/.test(s)) return 'subjectCode';
    if (/gender identity|identitas gender/.test(s))                return 'genderIdentity';
    if (/jenis kelamin|kelamin|^sex$/.test(s))                    return 'sex';
    if (/inisial|initial/.test(s))                                return 'initials';
    if (/tanggal kedatangan|visit date|kedatangan/.test(s))       return 'visitDate';
    if (/\bimt\b|\bbmi\b|\bsdv\b/.test(s))                        return 'skip';
    if (/^\s*sae|serious adverse/.test(s))                         return 'aeSerious';
    if (/^\s*ae\b|adverse event/.test(s))                         return 'ae';
    return 'crf';
}

const st = {
    step: 1, visitName: '', siteId: '', sites: [],
    headers: [], rows: [], columnMap: {}, formId: null, schema: null,
    reason: '', preview: null, report: null,
};

export async function renderDataImport(container) {
    st.sites = await api.getSites().catch(() => []);
    st.step = 1;
    render(container);
}

function render(container) {
    const steps = ['Setup', 'Upload CSV', 'Map & Derive Form', 'Preview', 'Commit'];
    container.innerHTML = `
    <div class="max-w-5xl mx-auto p-4">
        <div class="flex items-center gap-2 mb-6 text-xs">
            ${steps.map((s, i) => `<div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full flex items-center justify-center font-bold ${i + 1 === st.step ? 'bg-blue-600 text-white' : i + 1 < st.step ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}">${i + 1}</span>
                <span class="${i + 1 === st.step ? 'font-semibold text-slate-800' : 'text-slate-400'}">${s}</span>
                ${i < steps.length - 1 ? '<span class="text-slate-300 mx-1">→</span>' : ''}
            </div>`).join('')}
        </div>
        <div id="di-body" class="bg-white border border-slate-200 rounded-xl p-6"></div>
        <div id="di-error" class="hidden mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"></div>
    </div>`;
    ({ 1: stepSetup, 2: stepUpload, 3: stepMap, 4: stepPreview, 5: stepCommit }[st.step])(container);
    if (window.lucide) window.lucide.createIcons();
}

function err(msg) { const e = document.getElementById('di-error'); if (e) { e.textContent = msg; e.classList.remove('hidden'); } }
function clearErr() { const e = document.getElementById('di-error'); if (e) e.classList.add('hidden'); }

// ── Step 1 — Setup ──────────────────────────────────────────────────────────
function stepSetup(container) {
    document.getElementById('di-body').innerHTML = `
        <h2 class="text-lg font-semibold mb-1">What are you importing?</h2>
        <p class="text-sm text-slate-500 mb-5">One spreadsheet per site, per visit. Pick the visit and the site this file belongs to.</p>
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Visit *</label>
                <input id="di-visit" type="text" list="di-visit-opts" value="${esc(st.visitName)}" placeholder="e.g. Week 0"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <datalist id="di-visit-opts"><option>Week 0</option><option>Week 12</option><option>Week 24</option></datalist>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Site *</label>
                <select id="di-site" class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select site —</option>
                    ${st.sites.map(s => `<option value="${s.id}" ${String(st.siteId) === String(s.id) ? 'selected' : ''}>${esc(s.site_code)} – ${esc(s.site_name)}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="flex justify-end mt-6">
            <button id="di-next1" class="btn-primary rounded-md px-5 py-2 text-sm font-semibold">Next: Upload CSV</button>
        </div>`;
    document.getElementById('di-next1').onclick = () => {
        st.visitName = document.getElementById('di-visit').value.trim();
        st.siteId = document.getElementById('di-site').value;
        clearErr();
        if (!st.visitName || !st.siteId) return err('Visit and site are required.');
        st.step = 2; render(container);
    };
}

// ── Step 2 — Upload ─────────────────────────────────────────────────────────
function stepUpload(container) {
    document.getElementById('di-body').innerHTML = `
        <h2 class="text-lg font-semibold mb-1">Upload the ${esc(st.visitName)} CSV</h2>
        <p class="text-sm text-slate-500 mb-5">The file is parsed in your browser — nothing is sent until you confirm the preview.</p>
        <input id="di-file" type="file" accept=".csv,text/csv"
            class="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100">
        <div id="di-file-info" class="mt-4 text-sm text-slate-500"></div>
        <div class="flex justify-between mt-6">
            <button id="di-back2" class="border border-slate-200 rounded-md px-4 py-2 text-sm hover:bg-slate-50">Back</button>
            <button id="di-next2" class="btn-primary rounded-md px-5 py-2 text-sm font-semibold disabled:opacity-50" disabled>Next: Map columns</button>
        </div>`;
    document.getElementById('di-back2').onclick = () => { st.step = 1; render(container); };
    document.getElementById('di-file').onchange = (e) => {
        const f = e.target.files[0]; if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const { headers, rows } = parseCSV(reader.result);
                if (!headers.length || !rows.length) return err('The CSV appears empty.');
                st.headers = headers; st.rows = rows;
                st.columnMap = Object.fromEntries(headers.map(h => [h, { target: autoTarget(h) }]));
                document.getElementById('di-file-info').innerHTML =
                    `<i data-lucide="check-circle" class="w-4 h-4 inline text-emerald-600"></i> ${rows.length} rows, ${headers.length} columns detected.`;
                document.getElementById('di-next2').disabled = false;
                if (window.lucide) window.lucide.createIcons();
                clearErr();
            } catch (ex) { err('Could not parse the CSV: ' + ex.message); }
        };
        reader.readAsText(f);
    };
    document.getElementById('di-next2').onclick = () => { st.step = 3; render(container); };
}

// ── Step 3 — Map columns + derive form ──────────────────────────────────────
function stepMap(container) {
    const sample = (h) => st.rows.slice(0, 2).map(r => r[h]).filter(v => v !== '').join(', ');
    document.getElementById('di-body').innerHTML = `
        <h2 class="text-lg font-semibold mb-1">Map columns</h2>
        <p class="text-sm text-slate-500 mb-4">Confirm where each column goes. CRF columns become fields of an auto-derived form (you can review it after).</p>
        <div class="overflow-x-auto border border-slate-100 rounded-md">
        <table class="w-full text-xs">
            <thead class="bg-slate-50 border-b"><tr>
                <th class="text-left px-3 py-2 font-semibold text-slate-600">Column</th>
                <th class="text-left px-3 py-2 font-semibold text-slate-600">Sample</th>
                <th class="text-left px-3 py-2 font-semibold text-slate-600">Import as</th>
            </tr></thead>
            <tbody>${st.headers.map(h => `<tr class="border-b border-slate-50">
                <td class="px-3 py-1.5 font-medium text-slate-700">${esc(h)}</td>
                <td class="px-3 py-1.5 text-slate-400">${esc(sample(h)).slice(0, 40)}</td>
                <td class="px-3 py-1.5"><select data-h="${esc(h)}" class="di-map border border-slate-200 rounded px-2 py-1 text-xs bg-white">
                    ${TARGETS.map(t => `<option value="${t.v}" ${st.columnMap[h]?.target === t.v ? 'selected' : ''}>${t.t}</option>`).join('')}
                </select></td></tr>`).join('')}</tbody>
        </table></div>
        <div class="flex justify-between mt-6">
            <button id="di-back3" class="border border-slate-200 rounded-md px-4 py-2 text-sm hover:bg-slate-50">Back</button>
            <button id="di-next3" class="btn-primary rounded-md px-5 py-2 text-sm font-semibold">Derive form &amp; preview</button>
        </div>`;
    container.querySelectorAll('.di-map').forEach(sel => {
        sel.onchange = () => { st.columnMap[sel.dataset.h] = { target: sel.value }; };
    });
    document.getElementById('di-back3').onclick = () => { st.step = 2; render(container); };
    document.getElementById('di-next3').onclick = () => deriveAndPreview(container);
}

async function deriveAndPreview(container) {
    clearErr();
    const map = st.columnMap;
    if (!Object.values(map).some(m => m.target === 'subjectCode')) return err('Map one column to Subject Code.');
    const crfHeaders = st.headers.filter(h => map[h].target === 'crf');
    const btn = document.getElementById('di-next3'); btn.disabled = true; btn.textContent = 'Deriving…';
    try {
        if (crfHeaders.length) {
            // Derive the form only the first time; reuse it for later site files
            // (all 25 sites share one layout, so one form serves them all).
            if (!st.formId || !st.schema) {
                const res = await api.deriveImportForm({
                    name: `Form ${st.visitName}`, headers: crfHeaders, rows: st.rows.slice(0, 100),
                });
                st.formId = res.formId; st.schema = res.schema;
            }
            // bind each CRF column to its field key (matched by label = header)
            for (const h of crfHeaders) {
                const f = st.schema.fields.find(x => x.label === h);
                if (f) map[h] = { target: 'crf', field: f.key };
            }
        } else if (!st.formId) {
            return err('No CRF columns mapped — map at least one column to "CRF field" (or nothing to import into forms).');
        }
        await runPreview(container);
    } catch (ex) {
        err(ex.message); btn.disabled = false; btn.textContent = 'Derive form & preview';
    }
}

// ── Step 4 — Preview (dry-run) ──────────────────────────────────────────────
async function runPreview(container) {
    st.report = null;
    st.preview = await api.importVisit(payload(true));
    st.step = 4; render(container);
}

function payload(dryRun) {
    return {
        siteId: Number(st.siteId), visitName: st.visitName, formId: st.formId,
        columnMap: st.columnMap, reason: st.reason || `Bulk import — ${st.visitName}`,
        rows: st.rows, dryRun,
    };
}

function summaryLine(s) {
    return `${s.subjectsCreated} subjects · ${s.entriesCreated} entries created / ${s.entriesUpdated} updated · ${s.aeCreated} AEs · <span class="text-red-600 font-semibold">${s.errors} errors</span>`;
}

function rowsTable(rows) {
    return `<div class="overflow-x-auto border border-slate-100 rounded-md max-h-80 overflow-y-auto">
    <table class="w-full text-xs"><thead class="bg-slate-50 border-b sticky top-0"><tr>
        <th class="text-left px-3 py-2">Row</th><th class="text-left px-3 py-2">Subject</th>
        <th class="text-left px-3 py-2">Status</th><th class="text-left px-3 py-2">Detail</th></tr></thead>
    <tbody>${rows.map(r => `<tr class="border-b border-slate-50">
        <td class="px-3 py-1">${r.line}</td><td class="px-3 py-1 font-mono">${esc(r.subjectCode || '—')}</td>
        <td class="px-3 py-1">${r.status === 'error'
            ? '<span class="text-red-600 font-semibold">error</span>'
            : `<span class="text-emerald-600">${r.subjectAction === 'exists' ? 'update' : 'new'}</span>${r.ae ? ` · ${r.ae}` : ''}`}</td>
        <td class="px-3 py-1 text-slate-500">${esc([...(r.messages || []), ...(r.warnings || [])].join('; ')).slice(0, 80)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

function stepPreview(container) {
    const p = st.preview;
    document.getElementById('di-body').innerHTML = `
        <h2 class="text-lg font-semibold mb-1">Preview — ${esc(st.visitName)}</h2>
        <p class="text-sm mb-2">${summaryLine(p.summary)}</p>
        <p class="text-xs text-slate-400 mb-4">Nothing has been saved yet. Rows with errors are skipped on commit.</p>
        ${st.formId ? `<a href="#" id="di-tpl" class="text-xs text-blue-600 hover:underline">↓ Download CSV template for this form</a>` : ''}
        ${rowsTable(p.rows)}
        <div class="mt-4">
            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Change reason (for any updates)</label>
            <input id="di-reason" type="text" value="${esc(st.reason)}" placeholder="Bulk import — ${esc(st.visitName)}"
                class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none">
        </div>
        <div class="flex justify-between mt-6">
            <button id="di-back4" class="border border-slate-200 rounded-md px-4 py-2 text-sm hover:bg-slate-50">Back</button>
            <button id="di-commit" class="btn-primary rounded-md px-5 py-2 text-sm font-semibold">Commit ${p.summary.errors ? `(skip ${p.summary.errors} errors)` : ''}</button>
        </div>`;
    const tpl = document.getElementById('di-tpl');
    if (tpl) tpl.onclick = (e) => { e.preventDefault(); api.downloadImportTemplate(st.formId).catch(ex => err(ex.message)); };
    document.getElementById('di-back4').onclick = () => { st.step = 3; render(container); };
    document.getElementById('di-commit').onclick = async () => {
        st.reason = document.getElementById('di-reason').value.trim();
        const b = document.getElementById('di-commit'); b.disabled = true; b.textContent = 'Committing…';
        try { st.report = await api.importVisit(payload(false)); st.step = 5; render(container); }
        catch (ex) { err(ex.message); b.disabled = false; b.textContent = 'Commit'; }
    };
}

// ── Step 5 — Commit report ──────────────────────────────────────────────────
function stepCommit(container) {
    const r = st.report;
    document.getElementById('di-body').innerHTML = `
        <div class="flex items-center gap-2 mb-2">
            <i data-lucide="check-circle" class="w-6 h-6 text-emerald-600"></i>
            <h2 class="text-lg font-semibold">Import complete — ${esc(st.visitName)}</h2>
        </div>
        <p class="text-sm mb-4">${summaryLine(r.summary)}</p>
        ${rowsTable(r.rows)}
        <div class="flex justify-end gap-2 mt-6">
            <button id="di-again" class="border border-slate-200 rounded-md px-4 py-2 text-sm hover:bg-slate-50">Import another site file</button>
            <button id="di-done" class="btn-primary rounded-md px-5 py-2 text-sm font-semibold">Done</button>
        </div>`;
    if (window.lucide) window.lucide.createIcons();
    showToast(`Imported: ${r.summary.subjectsCreated} subjects, ${r.summary.entriesCreated + r.summary.entriesUpdated} entries.`, r.summary.errors ? 'warning' : 'success');
    document.getElementById('di-again').onclick = () => {
        // keep visit + mapping + derived form; reset file/rows for the next site
        st.rows = []; st.headers = []; st.preview = null; st.report = null; st.step = 1; render(container);
    };
    document.getElementById('di-done').onclick = () => { window.location.hash = '#subjects'; };
}
