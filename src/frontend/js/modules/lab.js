// ============================================================
// Laboratory Results — study-wide view
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

function flagBadge(flag) {
    if (!flag || flag === 'Normal') return '<span class="text-slate-300">—</span>';
    const map = {
        H:  'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A',
        L:  'background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE',
        HH: 'background:#FEE2E2;color:#7F1D1D;border:1px solid #FECACA',
        LL: 'background:#FEE2E2;color:#7F1D1D;border:1px solid #FECACA',
        A:  'background:#FEF3C7;color:#78350F;border:1px solid #FDE68A',
    };
    const style = map[flag] || 'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1';
    const bold = (flag === 'HH' || flag === 'LL') ? 'font-weight:700' : '';
    return `<span class="badge" style="${style};${bold}">${esc(flag)}</span>`;
}

function csBadge(cs) {
    const map = {
        CS:  { style: 'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA', label: 'Clinically Significant' },
        NCS: { style: 'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7', label: 'NCS' },
        NA:  { style: 'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1', label: 'N/A' },
    };
    const def = map[cs];
    if (!def) return '<span class="text-slate-300">—</span>';
    return `<span class="badge" style="${def.style}">${def.label}</span>`;
}

function statusBadge(s) {
    const map = {
        Pending:  'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A',
        Verified: 'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7',
        Queried:  'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA',
    };
    const style = map[s] || map.Pending;
    return `<span class="badge" style="${style}">${esc(s || 'Pending')}</span>`;
}

const PANELS = ['Hematology','Chemistry','Urinalysis','Coagulation'];
let _allLab = [];

export async function renderLab(container) {
    container.innerHTML = SPINNER;
    const user = api.getCurrentUser();
    const canWrite   = ['investigator', 'admin', 'cra', 'data_entry'].includes(user?.role);
    const canVerify  = ['admin', 'cra', 'investigator'].includes(user?.role);

    let records = [];
    try {
        records = await api.request('/api/lab');
        _allLab = records;
    } catch (err) {
        container.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    container.innerHTML = `
    <div class="p-5 space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Laboratory Results</h2>
                <p class="text-xs text-slate-500 mt-0.5">Clinical laboratory data across all subjects, visits, and panels</p>
            </div>
            ${canWrite ? `
            <button onclick="openLabForm()"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Add Result
            </button>` : ''}
        </div>

        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="lab-search" placeholder="Search by subject or test name…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <select id="lab-panel-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Panels</option>
                    ${PANELS.map(p => `<option>${p}</option>`).join('')}
                </select>
                <select id="lab-status-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Statuses</option>
                    <option>Pending</option>
                    <option>Verified</option>
                    <option>Queried</option>
                </select>
            </div>
        </div>

        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">Subject</th>
                            <th class="text-left">Visit</th>
                            <th class="text-left">Panel</th>
                            <th class="text-left">Test</th>
                            <th class="text-left">Value</th>
                            <th class="text-left">Unit</th>
                            <th class="text-left">Ref Range</th>
                            <th class="text-left">Flag</th>
                            <th class="text-left">CS</th>
                            <th class="text-left">Status</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="lab-tbody" class="ph-table-body">
                        ${renderLabRows(records, user, canWrite, canVerify)}
                    </tbody>
                </table>
            </div>
            <div id="lab-empty" class="${records.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="flask-conical" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No laboratory results recorded.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    function applyFilters() {
        const search = document.getElementById('lab-search').value.toLowerCase();
        const panel  = document.getElementById('lab-panel-filter').value;
        const status = document.getElementById('lab-status-filter').value;
        let filtered = _allLab;
        if (search) filtered = filtered.filter(r =>
            r.subjectCode?.toLowerCase().includes(search) ||
            r.testName?.toLowerCase().includes(search)
        );
        if (panel)  filtered = filtered.filter(r => r.panel === panel);
        if (status) filtered = filtered.filter(r => r.status === status);
        document.getElementById('lab-tbody').innerHTML = renderLabRows(filtered, user, canWrite, canVerify);
        document.getElementById('lab-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('lab-search').addEventListener('input', applyFilters);
    document.getElementById('lab-panel-filter').addEventListener('change', applyFilters);
    document.getElementById('lab-status-filter').addEventListener('change', applyFilters);
}

function renderLabRows(records, user, canWrite, canVerify) {
    if (!records.length) return '';
    return records.map(r => `
        <tr>
            <td class="text-xs font-semibold font-mono text-slate-800">${esc(r.subjectCode || '—')}</td>
            <td class="text-xs text-slate-600">${esc(r.visitName) || '—'}</td>
            <td class="text-xs text-slate-600">${esc(r.panel) || '—'}</td>
            <td>
                <p class="text-xs font-medium text-slate-800">${esc(r.testName)}</p>
                ${r.testCode ? `<p class="text-xs font-mono text-slate-400">${esc(r.testCode)}</p>` : ''}
            </td>
            <td class="text-xs text-slate-700 font-medium">${r.valueNumeric != null ? r.valueNumeric : (esc(r.valueText) || '—')}</td>
            <td class="text-xs text-slate-500">${esc(r.unit) || '—'}</td>
            <td class="text-xs text-slate-500 whitespace-nowrap">${r.refRangeLow != null || r.refRangeHigh != null ? `${r.refRangeLow ?? '?'} – ${r.refRangeHigh ?? '?'}` : '—'}</td>
            <td>${flagBadge(r.abnormalityFlag)}</td>
            <td>${csBadge(r.clinicalSignificance)}</td>
            <td>${statusBadge(r.status)}</td>
            <td class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                    ${canVerify && r.status === 'Pending' ? `
                    <button onclick="verifyLabResult(${r.id})"
                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition border border-emerald-200">
                        <i data-lucide="check-circle" class="w-3 h-3"></i> Verify
                    </button>` : ''}
                    ${canWrite ? `
                    <button onclick="openLabForm(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition" title="Edit">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="deleteLabResult(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`).join('');
}

window.openLabForm = async function(recordId = null) {
    const isEdit = recordId !== null;

    let subjects = [];
    try { subjects = await api.getSubjects(); } catch {}

    let rec = {};
    if (isEdit) {
        try { rec = await api.request(`/api/lab/${recordId}`); } catch {}
    }

    const subjectOptions = subjects.map(s =>
        `<option value="${s.id}" ${rec.subjectId === s.id ? 'selected' : ''}>${esc(s.subject_code)}</option>`
    ).join('');

    showModal({
        title: isEdit ? 'Edit Lab Result' : 'Add Lab Result',
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Subject <span class="text-red-500">*</span></label>
                    <select id="lab-subject-id" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white" onchange="loadLabVisits()">
                        <option value="">— Select Subject —</option>
                        ${subjectOptions}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Visit</label>
                    <select id="lab-visit-id" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select after subject —</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Panel <span class="text-red-500">*</span></label>
                    <select id="lab-panel" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        ${PANELS.map(p => `<option ${rec.panel === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Test Name <span class="text-red-500">*</span></label>
                    <input type="text" id="lab-test-name" value="${esc(rec.testName)}" placeholder="e.g. Haemoglobin"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Test Code</label>
                    <input type="text" id="lab-test-code" value="${esc(rec.testCode)}" placeholder="e.g. HGB"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Specimen Type</label>
                    <input type="text" id="lab-specimen" value="${esc(rec.specimenType)}" placeholder="e.g. Whole blood"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Specimen Collected At</label>
                    <input type="datetime-local" id="lab-collected-at" value="${rec.specimenCollectedAt ? rec.specimenCollectedAt.replace('Z','') : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Lab Name</label>
                    <input type="text" id="lab-lab-name" value="${esc(rec.labName)}" placeholder="e.g. Central Lab"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="ph-label">Numeric Value</label>
                    <input type="number" step="any" id="lab-value-num" value="${rec.valueNumeric ?? ''}" placeholder="e.g. 12.5"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Text Value</label>
                    <input type="text" id="lab-value-text" value="${esc(rec.valueText)}" placeholder="e.g. Positive"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Unit</label>
                    <input type="text" id="lab-unit" value="${esc(rec.unit)}" placeholder="e.g. g/dL"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Ref Range Low</label>
                    <input type="number" step="any" id="lab-ref-low" value="${rec.refRangeLow ?? ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Ref Range High</label>
                    <input type="number" step="any" id="lab-ref-high" value="${rec.refRangeHigh ?? ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Abnormality Flag</label>
                    <select id="lab-flag" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        ${['Normal','L','H','LL','HH','A'].map(f =>
                            `<option ${rec.abnormalityFlag === f ? 'selected' : ''}>${f}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Is Abnormal</label>
                    <div class="pt-2">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="lab-abnormal" ${rec.isAbnormal ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300">
                            <span class="text-sm text-slate-700">Mark as Abnormal</span>
                        </label>
                    </div>
                </div>
            </div>
            <div>
                <label class="ph-label">Clinical Significance</label>
                <div class="flex items-center gap-6 pt-1">
                    ${['CS','NCS','NA'].map(cs => `
                    <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                        <input type="radio" name="lab-cs" value="${cs}" ${rec.clinicalSignificance === cs ? 'checked' : ''} class="w-3.5 h-3.5">
                        ${cs === 'CS' ? 'Clinically Significant' : cs === 'NCS' ? 'Not Clinically Significant' : 'N/A'}
                    </label>`).join('')}
                </div>
            </div>
            <div>
                <label class="ph-label">Notes</label>
                <textarea id="lab-notes" rows="2" placeholder="Additional notes…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(rec.notes)}</textarea>
            </div>
            ${isEdit ? `
            <div>
                <label class="ph-label">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="lab-rfc" placeholder="Required — explain what changed and why"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none">
            </div>` : ''}
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitLabForm(${recordId})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-4 h-4"></i> ${isEdit ? 'Save Changes' : 'Add Result'}
        </button>`,
    });

    if (isEdit && rec.subjectId) {
        try {
            const visits = await api.getVisits(rec.subjectId);
            const sel = document.getElementById('lab-visit-id');
            sel.innerHTML = `<option value="">— None —</option>` +
                visits.map(v => `<option value="${v.id}" ${rec.visitId === v.id ? 'selected' : ''}>${esc(v.visit_name)}</option>`).join('');
        } catch {}
    }
};

window.loadLabVisits = async function() {
    const subjectId = document.getElementById('lab-subject-id').value;
    const sel = document.getElementById('lab-visit-id');
    if (!subjectId) { sel.innerHTML = '<option value="">— Select after subject —</option>'; return; }
    sel.innerHTML = '<option value="">Loading…</option>';
    try {
        const visits = await api.getVisits(Number(subjectId));
        sel.innerHTML = `<option value="">— None —</option>` +
            visits.map(v => `<option value="${v.id}">${esc(v.visit_name)}</option>`).join('');
    } catch {
        sel.innerHTML = '<option value="">— Error —</option>';
    }
};

window.submitLabForm = async function(recordId) {
    const isEdit    = recordId !== null;
    const subjectId = document.getElementById('lab-subject-id').value;
    const testName  = document.getElementById('lab-test-name').value.trim();
    const panel     = document.getElementById('lab-panel').value;
    if (!subjectId || !testName || !panel) { showToast('Subject, panel, and test name are required.', 'error'); return; }

    const cs = document.querySelector('input[name="lab-cs"]:checked')?.value || null;

    const payload = {
        subjectId:          Number(subjectId),
        visitId:            document.getElementById('lab-visit-id').value ? Number(document.getElementById('lab-visit-id').value) : null,
        panel,
        testName,
        testCode:           document.getElementById('lab-test-code').value.trim() || null,
        specimenType:       document.getElementById('lab-specimen').value.trim() || null,
        specimenCollectedAt: document.getElementById('lab-collected-at').value || null,
        labName:            document.getElementById('lab-lab-name').value.trim() || null,
        valueNumeric:       parseFloat(document.getElementById('lab-value-num').value) || null,
        valueText:          document.getElementById('lab-value-text').value.trim() || null,
        unit:               document.getElementById('lab-unit').value.trim() || null,
        refRangeLow:        parseFloat(document.getElementById('lab-ref-low').value) || null,
        refRangeHigh:       parseFloat(document.getElementById('lab-ref-high').value) || null,
        abnormalityFlag:    document.getElementById('lab-flag').value || null,
        isAbnormal:         document.getElementById('lab-abnormal').checked,
        clinicalSignificance: cs,
        notes:              document.getElementById('lab-notes').value.trim() || null,
    };

    if (isEdit) {
        const rfc = document.getElementById('lab-rfc')?.value?.trim();
        if (!rfc) { showToast('Reason for change is required.', 'error'); return; }
        payload.reason = rfc;
    }

    try {
        if (isEdit) {
            await api.request(`/api/lab/${recordId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        } else {
            await api.request('/api/lab', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeModal();
        showToast(isEdit ? 'Lab result updated.' : 'Lab result added.', 'success');
        await renderLab(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.verifyLabResult = async function(recordId) {
    if (!confirm('Mark this lab result as Verified?')) return;
    try {
        await api.request(`/api/lab/${recordId}/verify`, { method: 'PATCH', body: JSON.stringify({}) });
        showToast('Lab result verified.', 'success');
        await renderLab(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteLabResult = async function(recordId) {
    const reason = prompt('Reason for deletion (required):');
    if (!reason) return;
    try {
        await api.request(`/api/lab/${recordId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
        showToast('Lab result deleted.', 'success');
        await renderLab(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};
