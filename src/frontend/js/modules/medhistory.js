// ============================================================
// Medical History — study-wide view
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';
import { ICD_VERSIONS } from './icd-codes.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function statusBadge(s) {
    const map = {
        Active:   'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA',
        Resolved: 'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7',
        Unknown:  'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1',
    };
    const style = map[s] || map.Unknown;
    return `<span class="badge" style="${style}">${esc(s || 'Unknown')}</span>`;
}
function severityBadge(s) {
    const map = {
        Mild:     'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7',
        Moderate: 'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A',
        Severe:   'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA',
        Unknown:  'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1',
    };
    const style = map[s] || map.Unknown;
    return `<span class="badge" style="${style}">${esc(s || 'Unknown')}</span>`;
}

let _allMedHist = [];

export async function renderMedHistory(container) {
    container.innerHTML = SPINNER;
    const user = api.getCurrentUser();
    const canWrite = ['investigator', 'admin', 'cra'].includes(user?.role);

    let records = [];
    try {
        records = await api.request('/api/medhistory');
        _allMedHist = records;
    } catch (err) {
        container.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    container.innerHTML = `
    <div class="p-5 space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Medical History</h2>
                <p class="text-xs text-slate-500 mt-0.5">Pre-existing conditions and relevant past medical history across all subjects</p>
            </div>
            ${canWrite ? `
            <button onclick="openMedHistForm()"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Add Record
            </button>` : ''}
        </div>

        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="mh-search" placeholder="Search by subject code…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <select id="mh-status-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Statuses</option>
                    <option>Active</option>
                    <option>Resolved</option>
                    <option>Unknown</option>
                </select>
            </div>
        </div>

        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">Subject Code</th>
                            <th class="text-left">Condition</th>
                            <th class="text-left">ICD Code</th>
                            <th class="text-left">Onset</th>
                            <th class="text-left">Status</th>
                            <th class="text-left">Severity</th>
                            <th class="text-left">Related to Indication</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="mh-tbody" class="ph-table-body">
                        ${renderMedHistRows(records, user, canWrite)}
                    </tbody>
                </table>
            </div>
            <div id="mh-empty" class="${records.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="clipboard-list" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No medical history records found.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    function applyFilters() {
        const search = document.getElementById('mh-search').value.toLowerCase();
        const status = document.getElementById('mh-status-filter').value;
        let filtered = _allMedHist;
        if (search) filtered = filtered.filter(r =>
            r.subjectCode?.toLowerCase().includes(search) ||
            r.condition?.toLowerCase().includes(search)
        );
        if (status) filtered = filtered.filter(r => r.status === status);
        document.getElementById('mh-tbody').innerHTML = renderMedHistRows(filtered, user, canWrite);
        document.getElementById('mh-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('mh-search').addEventListener('input', applyFilters);
    document.getElementById('mh-status-filter').addEventListener('change', applyFilters);
}

function renderMedHistRows(records, user, canWrite) {
    if (!records.length) return '';
    return records.map(r => `
        <tr>
            <td class="text-xs font-semibold font-mono text-slate-800">${esc(r.subjectCode || '—')}</td>
            <td>
                <p class="text-xs font-medium text-slate-800">${esc(r.condition)}</p>
                ${r.notes ? `<p class="text-xs text-slate-400 mt-0.5 line-clamp-1">${esc(r.notes)}</p>` : ''}
            </td>
            <td class="text-xs font-mono text-slate-600">${esc(r.icdCode) || '—'}${r.icdVersion ? ` <span class="text-slate-400">(${esc(r.icdVersion)})</span>` : ''}</td>
            <td class="text-xs text-slate-600 whitespace-nowrap">${fmtDate(r.onsetDate)}</td>
            <td>${statusBadge(r.status)}</td>
            <td>${severityBadge(r.severity)}</td>
            <td class="text-xs text-center">
                ${r.isRelatedToIndication
                    ? `<span class="badge" style="background:#EDE9FE;color:#5B21B6;border:1px solid #DDD6FE">Yes</span>`
                    : `<span class="text-slate-400">No</span>`}
            </td>
            <td class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                    <button onclick="openRowInlineQuery(${r.subjectId}, null, 'medical_history', 'Med Hx: ${esc(r.condition || '')}')"
                        class="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded transition" title="Raise Query">
                        <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                    </button>
                    ${canWrite ? `
                    <button onclick="openMedHistForm(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition" title="Edit">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="deleteMedHist(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`).join('');
}

function initICDWidget(existingCode, existingVersion) {
    const searchEl  = document.getElementById('mh-icd-search');
    const hiddenEl  = document.getElementById('mh-icd-code');
    const dropdown  = document.getElementById('mh-icd-dropdown');
    const versionEl = document.getElementById('mh-icd-version');
    if (!searchEl || !hiddenEl || !dropdown || !versionEl) return;

    if (existingCode) {
        const codes = ICD_VERSIONS[existingVersion] || [];
        const found = codes.find(c => c.code === existingCode);
        searchEl.value = found ? `${found.code} — ${found.description}` : existingCode;
    }

    function getVersionCodes() {
        return ICD_VERSIONS[versionEl.value] || [];
    }

    function renderDropdown(filter) {
        const codes = getVersionCodes();
        if (!codes.length) {
            dropdown.innerHTML = `<p class="text-xs text-slate-400 text-center py-3 px-3">Select an ICD version first</p>`;
            dropdown.classList.remove('hidden');
            return;
        }
        const q = filter.toLowerCase().trim();
        const matches = q
            ? codes.filter(c => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)).slice(0, 60)
            : codes.slice(0, 60);
        if (!matches.length) {
            dropdown.innerHTML = `<p class="text-xs text-slate-400 text-center py-3">No codes match "${filter}"</p>`;
        } else {
            dropdown.innerHTML = matches.map(c => `
                <button type="button" data-code="${c.code.replace(/"/g,'&quot;')}" data-desc="${c.description.replace(/"/g,'&quot;')}"
                    class="w-full text-left px-3 py-2 hover:bg-blue-50 transition flex items-start gap-2 border-b border-slate-50 last:border-0">
                    <span class="font-mono font-semibold text-blue-700 shrink-0 w-16 text-xs">${c.code}</span>
                    <span class="text-slate-700 text-xs leading-snug">${c.description}</span>
                </button>`).join('');
        }
        dropdown.classList.remove('hidden');
    }

    function hideDropdown() { dropdown.classList.add('hidden'); }

    searchEl.addEventListener('focus', () => renderDropdown(searchEl.value));
    searchEl.addEventListener('input', () => {
        hiddenEl.value = '';
        renderDropdown(searchEl.value);
    });

    dropdown.addEventListener('mousedown', e => {
        const btn = e.target.closest('button[data-code]');
        if (!btn) return;
        e.preventDefault();
        const code = btn.dataset.code;
        const desc = btn.dataset.desc;
        hiddenEl.value = code;
        searchEl.value = `${code} — ${desc}`;
        const condEl = document.getElementById('mh-condition');
        if (condEl && !condEl.value.trim()) condEl.value = desc;
        hideDropdown();
    });

    searchEl.addEventListener('blur', () => setTimeout(hideDropdown, 150));

    versionEl.addEventListener('change', () => {
        hiddenEl.value = '';
        searchEl.value = '';
        hideDropdown();
    });
}

window.openMedHistForm = async function(recordId = null) {
    const isEdit = recordId !== null;

    let subjects = [];
    try { subjects = await api.getSubjects(); } catch {}

    let rec = {};
    if (isEdit) {
        try { rec = await api.request(`/api/medhistory/${recordId}`); } catch {}
    }

    const subjectOptions = subjects.map(s =>
        `<option value="${s.id}" ${rec.subjectId === s.id ? 'selected' : ''}>${esc(s.subject_code)}</option>`
    ).join('');

    showModal({
        title: isEdit ? 'Edit Medical History' : 'Add Medical History',
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Subject <span class="text-red-500">*</span></label>
                    <select id="mh-subject-id" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select Subject —</option>
                        ${subjectOptions}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Condition <span class="text-red-500">*</span></label>
                    <input type="text" id="mh-condition" value="${esc(rec.condition)}" placeholder="e.g. Type 2 Diabetes Mellitus"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">ICD Version</label>
                    <select id="mh-icd-version" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option ${rec.icdVersion === 'ICD-10' ? 'selected' : ''}>ICD-10</option>
                        <option ${rec.icdVersion === 'ICD-11' ? 'selected' : ''}>ICD-11</option>
                        <option ${rec.icdVersion === 'ICD-9' ? 'selected' : ''}>ICD-9</option>
                    </select>
                </div>
                <div>
                    <label class="ph-label">ICD Code</label>
                    <div class="relative" id="mh-icd-wrapper">
                        <input type="text" id="mh-icd-search" autocomplete="off"
                            placeholder="Search code or diagnosis…"
                            class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                        <input type="hidden" id="mh-icd-code" value="${esc(rec.icdCode || '')}">
                        <div id="mh-icd-dropdown"
                            class="hidden absolute z-[200] left-0 right-0 top-full mt-0.5 bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                        </div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Onset Date</label>
                    <input type="date" id="mh-onset" value="${rec.onsetDate ? rec.onsetDate.split('T')[0] : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Resolution Date</label>
                    <input type="date" id="mh-resolution" value="${rec.resolutionDate ? rec.resolutionDate.split('T')[0] : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Status</label>
                    <select id="mh-status" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option ${rec.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option ${rec.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                        <option ${rec.status === 'Unknown' ? 'selected' : ''}>Unknown</option>
                    </select>
                </div>
                <div>
                    <label class="ph-label">Severity</label>
                    <div class="flex items-center gap-4 pt-2">
                        ${['Mild','Moderate','Severe','Unknown'].map(sev => `
                        <label class="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                            <input type="radio" name="mh-severity" value="${sev}" ${rec.severity === sev ? 'checked' : ''} class="w-3.5 h-3.5">
                            ${sev}
                        </label>`).join('')}
                    </div>
                </div>
            </div>
            <div>
                <label class="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" id="mh-related" ${rec.isRelatedToIndication ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300">
                    <span class="text-sm font-medium text-slate-700">Related to Study Indication</span>
                </label>
            </div>
            <div>
                <label class="ph-label">Notes</label>
                <textarea id="mh-notes" rows="2" placeholder="Additional clinical notes…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(rec.notes)}</textarea>
            </div>
            ${isEdit ? `
            <div>
                <label class="ph-label">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="mh-rfc" placeholder="Required — explain what changed and why"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none">
            </div>` : ''}
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitMedHistForm(${recordId})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-4 h-4"></i> ${isEdit ? 'Save Changes' : 'Add Record'}
        </button>`,
    });

    initICDWidget(rec.icdCode || null, rec.icdVersion || null);
};

window.submitMedHistForm = async function(recordId) {
    const isEdit = recordId !== null;
    const subjectId = document.getElementById('mh-subject-id').value;
    const condition = document.getElementById('mh-condition').value.trim();
    if (!subjectId || !condition) { showToast('Subject and condition are required.', 'error'); return; }

    const severity = document.querySelector('input[name="mh-severity"]:checked')?.value || null;

    const payload = {
        subjectId: Number(subjectId),
        condition,
        icdCode:               (() => {
            const hidden = document.getElementById('mh-icd-code').value.trim();
            if (hidden) return hidden;
            const raw = (document.getElementById('mh-icd-search').value || '').split('—')[0].trim();
            return raw || null;
        })(),
        icdVersion:            document.getElementById('mh-icd-version').value || null,
        onsetDate:             document.getElementById('mh-onset').value || null,
        resolutionDate:        document.getElementById('mh-resolution').value || null,
        status:                document.getElementById('mh-status').value || null,
        severity,
        isRelatedToIndication: document.getElementById('mh-related').checked,
        notes:                 document.getElementById('mh-notes').value.trim() || null,
    };

    if (isEdit) {
        const rfc = document.getElementById('mh-rfc')?.value?.trim();
        if (!rfc) { showToast('Reason for change is required.', 'error'); return; }
        payload.reason = rfc;
    }

    try {
        if (isEdit) {
            await api.request(`/api/medhistory/${recordId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        } else {
            await api.request('/api/medhistory', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeModal();
        showToast(isEdit ? 'Medical history updated.' : 'Medical history record added.', 'success');
        await renderMedHistory(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteMedHist = async function(recordId) {
    const reason = prompt('Reason for deletion (required):');
    if (!reason) return;
    try {
        await api.request(`/api/medhistory/${recordId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
        showToast('Record deleted.', 'success');
        await renderMedHistory(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};
