// ============================================================
// Concomitant Medications — study-wide view
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

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

let _allConMeds = [];

export async function renderConMeds(container) {
    container.innerHTML = SPINNER;
    const user = api.getCurrentUser();
    const canWrite = ['investigator', 'admin', 'cra'].includes(user?.role);

    let records = [];
    try {
        records = await api.request('/api/conmeds');
        _allConMeds = records;
    } catch (err) {
        container.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    container.innerHTML = `
    <div class="p-5 space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Concomitant Medications</h2>
                <p class="text-xs text-slate-500 mt-0.5">All concurrent medications taken by subjects during the study</p>
            </div>
            ${canWrite ? `
            <button onclick="openConMedForm()"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Add Medication
            </button>` : ''}
        </div>

        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="cm-search" placeholder="Search by subject or drug name…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <select id="cm-ongoing-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All</option>
                    <option value="ongoing">Ongoing Only</option>
                </select>
            </div>
        </div>

        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">Subject</th>
                            <th class="text-left">Drug Name</th>
                            <th class="text-left">WHO/ATC Code</th>
                            <th class="text-left">Indication</th>
                            <th class="text-left">Dose / Freq / Route</th>
                            <th class="text-left">Start</th>
                            <th class="text-left">Stop / Status</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="cm-tbody" class="ph-table-body">
                        ${renderConMedRows(records, user, canWrite)}
                    </tbody>
                </table>
            </div>
            <div id="cm-empty" class="${records.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="pill" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No concomitant medications recorded.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    function applyFilters() {
        const search  = document.getElementById('cm-search').value.toLowerCase();
        const ongoing = document.getElementById('cm-ongoing-filter').value;
        let filtered = _allConMeds;
        if (search)  filtered = filtered.filter(r =>
            r.subjectCode?.toLowerCase().includes(search) ||
            r.drugName?.toLowerCase().includes(search)
        );
        if (ongoing === 'ongoing') filtered = filtered.filter(r => r.isOngoing);
        document.getElementById('cm-tbody').innerHTML = renderConMedRows(filtered, user, canWrite);
        document.getElementById('cm-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('cm-search').addEventListener('input', applyFilters);
    document.getElementById('cm-ongoing-filter').addEventListener('change', applyFilters);
}

function renderConMedRows(records, user, canWrite) {
    if (!records.length) return '';
    return records.map(r => `
        <tr>
            <td class="text-xs font-semibold font-mono text-slate-800">${esc(r.subjectCode || '—')}</td>
            <td>
                <p class="text-xs font-medium text-slate-800">${esc(r.drugName)}</p>
                ${r.notes ? `<p class="text-xs text-slate-400 mt-0.5 line-clamp-1">${esc(r.notes)}</p>` : ''}
            </td>
            <td class="text-xs font-mono text-slate-500">${esc(r.atcCode) || '—'}</td>
            <td class="text-xs text-slate-600">${esc(r.indication) || '—'}</td>
            <td class="text-xs text-slate-600 whitespace-nowrap">
                ${r.dose ? `${esc(r.dose)} ${esc(r.doseUnit)}` : '—'}
                ${r.frequency ? ` · ${esc(r.frequency)}` : ''}
                ${r.route ? ` · ${esc(r.route)}` : ''}
            </td>
            <td class="text-xs text-slate-600 whitespace-nowrap">${fmtDate(r.startDate)}</td>
            <td class="text-xs whitespace-nowrap">
                ${r.isOngoing
                    ? `<span class="badge" style="background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7">Ongoing</span>`
                    : `<span class="text-slate-500">${fmtDate(r.stopDate)}</span>`}
            </td>
            <td class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                    <button onclick="openRowInlineQuery(${r.subjectId}, null, 'con_medication', 'ConMed: ${esc(r.drugName || '')}')"
                        class="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded transition" title="Raise Query">
                        <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                    </button>
                    ${canWrite ? `
                    <button onclick="openConMedForm(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition" title="Edit">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="deleteConMed(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`).join('');
}

window.openConMedForm = async function(recordId = null) {
    const isEdit = recordId !== null;

    let subjects = [];
    try { subjects = await api.getSubjects(); } catch {}

    let rec = {};
    if (isEdit) {
        try { rec = await api.request(`/api/conmeds/${recordId}`); } catch {}
    }

    const subjectOptions = subjects.map(s =>
        `<option value="${s.id}" ${rec.subjectId === s.id ? 'selected' : ''}>${esc(s.subject_code)}</option>`
    ).join('');

    showModal({
        title: isEdit ? 'Edit Concomitant Medication' : 'Add Concomitant Medication',
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Subject <span class="text-red-500">*</span></label>
                    <select id="cm-subject-id" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select Subject —</option>
                        ${subjectOptions}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Drug Name <span class="text-red-500">*</span></label>
                    <input type="text" id="cm-drug-name" value="${esc(rec.drugName)}" placeholder="Generic or brand name"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">WHO/ATC Code</label>
                    <input type="text" id="cm-atc" value="${esc(rec.atcCode)}" placeholder="e.g. A10BA02"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Indication</label>
                    <input type="text" id="cm-indication" value="${esc(rec.indication)}" placeholder="Reason for taking"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="ph-label">Dose</label>
                    <input type="text" id="cm-dose" value="${esc(rec.dose)}" placeholder="e.g. 500"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Dose Unit</label>
                    <input type="text" id="cm-dose-unit" value="${esc(rec.doseUnit)}" placeholder="mg, mcg, IU…"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Frequency</label>
                    <select id="cm-frequency" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        ${['QD','BID','TID','QID','PRN','Other'].map(f =>
                            `<option ${rec.frequency === f ? 'selected' : ''}>${f}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="ph-label">Route</label>
                    <select id="cm-route" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        ${['Oral','IV','IM','SC','Topical','Inhaled','Other'].map(ro =>
                            `<option ${rec.route === ro ? 'selected' : ''}>${ro}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Start Date</label>
                    <input type="date" id="cm-start" value="${rec.startDate ? rec.startDate.split('T')[0] : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Stop Date</label>
                    <input type="date" id="cm-stop" value="${rec.stopDate ? rec.stopDate.split('T')[0] : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none"
                        ${rec.isOngoing ? 'disabled' : ''}>
                </div>
            </div>
            <div>
                <label class="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" id="cm-ongoing" ${rec.isOngoing ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300">
                    <span class="text-sm font-medium text-slate-700">Medication is Ongoing (no stop date)</span>
                </label>
            </div>
            <div>
                <label class="ph-label">Notes</label>
                <textarea id="cm-notes" rows="2" placeholder="Additional notes…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(rec.notes)}</textarea>
            </div>
            ${isEdit ? `
            <div>
                <label class="ph-label">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="cm-rfc" placeholder="Required — explain what changed and why"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none">
            </div>` : ''}
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitConMedForm(${recordId})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-4 h-4"></i> ${isEdit ? 'Save Changes' : 'Add Medication'}
        </button>`,
    });

    document.getElementById('cm-ongoing').addEventListener('change', function() {
        const stopEl = document.getElementById('cm-stop');
        stopEl.disabled = this.checked;
        if (this.checked) stopEl.value = '';
    });
};

window.submitConMedForm = async function(recordId) {
    const isEdit    = recordId !== null;
    const subjectId = document.getElementById('cm-subject-id').value;
    const drugName  = document.getElementById('cm-drug-name').value.trim();
    if (!subjectId || !drugName) { showToast('Subject and drug name are required.', 'error'); return; }

    const isOngoing = document.getElementById('cm-ongoing').checked;

    const payload = {
        subjectId:  Number(subjectId),
        drugName,
        atcCode:    document.getElementById('cm-atc').value.trim() || null,
        indication: document.getElementById('cm-indication').value.trim() || null,
        dose:       document.getElementById('cm-dose').value.trim() || null,
        doseUnit:   document.getElementById('cm-dose-unit').value.trim() || null,
        frequency:  document.getElementById('cm-frequency').value || null,
        route:      document.getElementById('cm-route').value || null,
        startDate:  document.getElementById('cm-start').value || null,
        stopDate:   isOngoing ? null : (document.getElementById('cm-stop').value || null),
        isOngoing,
        notes:      document.getElementById('cm-notes').value.trim() || null,
    };

    if (isEdit) {
        const rfc = document.getElementById('cm-rfc')?.value?.trim();
        if (!rfc) { showToast('Reason for change is required.', 'error'); return; }
        payload.reason = rfc;
    }

    try {
        if (isEdit) {
            await api.request(`/api/conmeds/${recordId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        } else {
            await api.request('/api/conmeds', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeModal();
        showToast(isEdit ? 'Medication updated.' : 'Medication added.', 'success');
        await renderConMeds(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteConMed = async function(recordId) {
    const reason = prompt('Reason for deletion (required):');
    if (!reason) return;
    try {
        await api.request(`/api/conmeds/${recordId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
        showToast('Medication record deleted.', 'success');
        await renderConMeds(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};
