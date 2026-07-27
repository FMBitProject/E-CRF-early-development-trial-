// Data Import wizard — upload a per-site / per-visit spreadsheet, auto-derive the
// CRF form, map columns, preview (dry-run), then commit. Reuses the backend
// /api/import endpoints; study-scoped and additive (no other flow is touched).

import { api } from './api.js';
import { showToast } from './utils.js';
import { parseCSVRecords } from '../../vendor/csvparse.js';

const TARGETS = [
    { v: 'skip',           t: '— skip —' },
    { v: 'subjectCode',    t: 'Subject Code' },
    { v: 'sex',            t: 'Sex' },
    { v: 'initials',       t: 'Initials' },
    { v: 'genderIdentity', t: 'Gender Identity' },
    { v: 'visitDate',      t: 'Visit Date (actual)' },
    { v: 'crf',            t: 'CRF field (auto-named)' },
    { v: 'vitalBP',        t: 'Vital: Blood Pressure (120/80)' },
    { v: 'vitalWeight',    t: 'Vital: Weight' },
    { v: 'vitalHeight',    t: 'Vital: Height' },
    { v: 'vitalBmi',       t: 'Vital: BMI' },
    { v: 'vitalHR',        t: 'Vital: Heart Rate' },
    { v: 'vitalTemp',      t: 'Vital: Temperature' },
    { v: 'vitalRR',        t: 'Vital: Resp. Rate' },
    { v: 'vitalSpO2',      t: 'Vital: O₂ Saturation' },
    { v: 'lab',            t: 'Lab: test value' },
    { v: 'labName',        t: 'Lab: laboratory name' },
    { v: 'labDate',        t: 'Lab: test date' },
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
    if (/\bsdv\b/.test(s))                                        return 'skip';
    // ── Vital signs ──
    if (/tekanan darah|blood pressure|\btd\b|\bbp\b|sistol|diastol/.test(s)) return 'vitalBP';
    if (/tinggi badan|height|\btb\b/.test(s))                    return 'vitalHeight';
    if (/berat badan|weight|\bbb\b/.test(s))                     return 'vitalWeight';
    if (/\bimt\b|\bbmi\b/.test(s))                               return 'vitalBmi';
    if (/nadi|heart rate|denyut|pulse|\bhr\b/.test(s))           return 'vitalHR';
    if (/suhu|temperature|\btemp\b/.test(s))                     return 'vitalTemp';
    if (/pernapasan|laju napas|respiratory|resp\.?\s*rate|\brr\b/.test(s)) return 'vitalRR';
    if (/saturasi|spo2|oksigen|o2\s*sat/.test(s))                return 'vitalSpO2';
    // ── Lab metadata ──
    if (/nama lab|laboratorium|lab name/.test(s))                return 'labName';
    if (/tanggal pemeriksaan|tanggal periksa|test date|tgl periksa/.test(s)) return 'labDate';
    // ── Lab tests (each becomes one lab_results row) ──
    if (/\bldl\b|\bhdl\b|kolesterol|cholesterol|trigliserida|\btg\b|\btc\b|non-?hdl|sgot|sgpt|\bast\b|\balt\b|kreatinin|creatinine|\bck\b|\bcpk\b|glukosa|glucose|gula darah|hba1c|ureum|urea|asam urat|uric|bilirubin|albumin|hemoglobin|\bhb\b|leukosit|trombosit|eritrosit|hematokrit|nilai lab|lab lain/.test(s)) return 'lab';
    if (/^\s*sae|serious adverse/.test(s))                         return 'aeSerious';
    if (/^\s*ae\b|adverse event/.test(s))                         return 'ae';
    return 'crf';
}

const st = {
    step: 1, visitName: '', siteId: '', sites: [],
    records: [], headerRow: 0,
    headers: [], rows: [], columnMap: {}, formId: null, schema: null,
    reason: '', preview: null, report: null,
};

// Guess the header row. Data rows are FULLER than header rows, so "most cells"
// is wrong. These sheets usually have a running "No." column, so data starts at
// the first row whose first cell is a plain integer — the header is the row above
// (merged sub-headers; blanks are filled from rows above in buildFromRecords).
// Fallback: the most-filled of the first three rows.
function detectHeaderRow(records) {
    for (let i = 1; i < Math.min(records.length, 10); i++) {
        if (/^\d+$/.test(String(records[i][0] ?? '').trim())) return Math.max(0, i - 1);
    }
    let best = 0, bestCount = -1;
    for (let i = 0; i < Math.min(records.length, 3); i++) {
        const n = records[i].filter(v => String(v).trim() !== '').length;
        if (n > bestCount) { bestCount = n; best = i; }
    }
    return best;
}

// Build unique, non-empty headers + data-row objects from raw records, using the
// chosen header-row index. Blank header cells get "Column N"; duplicates get a suffix.
function buildFromRecords(records, hi) {
    const raw = records[hi] || [];
    const width = Math.max(...records.slice(0, hi + 1).map(r => r.length), raw.length);
    const seen = {};
    const headers = Array.from({ length: width }, (_, idx) => {
        let name = String(raw[idx] ?? '').trim();
        // merged headers: a standalone column's name may live in a row ABOVE the
        // chosen header row (group titles span, sub-names sit below) — fill blanks
        // from the nearest non-empty cell above in the same column.
        if (!name) {
            for (let r = hi - 1; r >= 0; r--) {
                const up = String(records[r]?.[idx] ?? '').trim();
                if (up) { name = up; break; }
            }
        }
        if (!name) name = `Column ${idx + 1}`;
        if (seen[name] != null) { seen[name]++; name = `${name} (${seen[name]})`; } else seen[name] = 0;
        return name;
    });
    const rows = records.slice(hi + 1)
        .filter(rec => rec.some(v => String(v).trim() !== ''))
        .map(rec => Object.fromEntries(headers.map((h, idx) => [h, (rec[idx] ?? '').trim()])));
    return { headers, rows };
}

function applyHeaderRow(hi) {
    st.headerRow = hi;
    const { headers, rows } = buildFromRecords(st.records, hi);
    st.headers = headers; st.rows = rows;
    st.columnMap = Object.fromEntries(headers.map(h => [h, { target: autoTarget(h) }]));
    st.formId = null; st.schema = null;   // structure changed → re-derive form
}

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
                const records = parseCSVRecords(reader.result);
                if (records.length < 2) return err('The CSV appears empty.');
                st.records = records;
                applyHeaderRow(detectHeaderRow(records));
                if (!st.rows.length) return err('No data rows found below the header.');
                document.getElementById('di-file-info').innerHTML =
                    `<i data-lucide="check-circle" class="w-4 h-4 inline text-emerald-600"></i> ${st.rows.length} data rows, ${st.headers.length} columns (header row auto-detected as row ${st.headerRow + 1}). You can adjust the header row on the next step.`;
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
    const headerOpts = st.records.slice(0, 6).map((rec, i) =>
        `<option value="${i}" ${i === st.headerRow ? 'selected' : ''}>Row ${i + 1}: ${esc(rec.filter(v => String(v).trim()).slice(0, 4).join(' | ')).slice(0, 50)}</option>`).join('');
    document.getElementById('di-body').innerHTML = `
        <h2 class="text-lg font-semibold mb-1">Map columns</h2>
        <p class="text-sm text-slate-500 mb-3">Confirm where each column goes. CRF columns become fields of an auto-derived form (you can review it after).</p>
        <div class="flex items-center gap-2 mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-md">
            <label class="text-xs font-semibold text-slate-600">Header row:</label>
            <select id="di-headerrow" class="border border-slate-300 rounded px-2 py-1 text-xs bg-white">${headerOpts}</select>
            <span class="text-xs text-slate-400">Pick the row that has the real column names (not a group title).</span>
        </div>
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
    document.getElementById('di-headerrow').onchange = (e) => { applyHeaderRow(Number(e.target.value)); render(container); };
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
                    name: `Form ${st.visitName}`, headers: crfHeaders, rows: st.rows,
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
    return `${s.subjectsCreated} subjects · ${s.entriesCreated + s.entriesUpdated} CRF entries · ${s.vitalsCreated} vitals · ${s.labsCreated} labs · ${s.aeCreated} AEs · <span class="text-red-600 font-semibold">${s.errors} errors</span>`;
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
            : `<span class="text-emerald-600">${r.subjectAction === 'exists' ? 'update' : 'new'}</span>${r.vitals ? ' · vitals' : ''}${r.labs ? ` · ${r.labs} labs` : ''}${r.ae ? ` · ${r.ae}` : ''}`}</td>
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
