// ============================================================
// Vital Signs — study-wide view
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

function bpClass(sys, dia) {
    if (!sys && !dia) return '';
    const s = Number(sys), d = Number(dia);
    if ((s && s > 140) || (d && d > 90) || (s && s < 90) || (d && d < 60)) {
        return 'text-amber-700 font-semibold';
    }
    return '';
}

let _allVitals = [];

export async function renderVitalSigns(container) {
    container.innerHTML = SPINNER;
    const user = api.getCurrentUser();
    const canWrite = ['investigator', 'admin', 'cra', 'data_entry'].includes(user?.role);

    let records = [];
    try {
        records = await api.request('/api/vitalsigns');
        _allVitals = records;
    } catch (err) {
        container.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    const visits = [];
    const visitSet = new Set();
    records.forEach(r => { if (r.visitName && !visitSet.has(r.visitName)) { visitSet.add(r.visitName); visits.push(r.visitName); } });

    container.innerHTML = `
    <div class="p-5 space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Vital Signs</h2>
                <p class="text-xs text-slate-500 mt-0.5">Physical measurements across all subjects and visits — abnormal BP highlighted in amber</p>
            </div>
            ${canWrite ? `
            <button onclick="openVitalForm()"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Add Vitals
            </button>` : ''}
        </div>

        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="vs-search" placeholder="Search by subject code…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <select id="vs-visit-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Visits</option>
                    ${visits.map(v => `<option>${esc(v)}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">Subject</th>
                            <th class="text-left">Date / Time</th>
                            <th class="text-left">Position</th>
                            <th class="text-left">BP (mmHg)</th>
                            <th class="text-left">HR</th>
                            <th class="text-left">RR</th>
                            <th class="text-left">Temp</th>
                            <th class="text-left">Weight</th>
                            <th class="text-left">BMI</th>
                            <th class="text-left">O₂ Sat</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="vs-tbody" class="ph-table-body">
                        ${renderVitalRows(records, user, canWrite)}
                    </tbody>
                </table>
            </div>
            <div id="vs-empty" class="${records.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="activity" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No vital signs recorded.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    function applyFilters() {
        const search = document.getElementById('vs-search').value.toLowerCase();
        const visit  = document.getElementById('vs-visit-filter').value;
        let filtered = _allVitals;
        if (search) filtered = filtered.filter(r => r.subjectCode?.toLowerCase().includes(search));
        if (visit)  filtered = filtered.filter(r => r.visitName === visit);
        document.getElementById('vs-tbody').innerHTML = renderVitalRows(filtered, user, canWrite);
        document.getElementById('vs-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('vs-search').addEventListener('input', applyFilters);
    document.getElementById('vs-visit-filter').addEventListener('change', applyFilters);
}

function renderVitalRows(records, user, canWrite) {
    if (!records.length) return '';
    return records.map(r => {
        const bpCls = bpClass(r.systolicBp, r.diastolicBp);
        const bpDisplay = (r.systolicBp || r.diastolicBp)
            ? `<span class="${bpCls}">${r.systolicBp ?? '?'}/${r.diastolicBp ?? '?'}</span>`
            : '—';
        return `
        <tr>
            <td>
                <p class="text-xs font-semibold font-mono text-slate-800">${esc(r.subjectCode || '—')}</p>
                ${r.visitName ? `<p class="text-xs text-slate-400">${esc(r.visitName)}</p>` : ''}
            </td>
            <td class="text-xs text-slate-600 whitespace-nowrap">
                ${fmtDate(r.assessmentDate)}
                ${r.assessmentTime ? `<br><span class="text-slate-400">${esc(r.assessmentTime)}</span>` : ''}
            </td>
            <td class="text-xs text-slate-600">${esc(r.position) || '—'}</td>
            <td class="text-xs whitespace-nowrap">${bpDisplay}</td>
            <td class="text-xs text-slate-600">${r.heartRate != null ? `${r.heartRate} bpm` : '—'}</td>
            <td class="text-xs text-slate-600">${r.respiratoryRate != null ? `${r.respiratoryRate} /min` : '—'}</td>
            <td class="text-xs text-slate-600 whitespace-nowrap">${r.temperature != null ? `${r.temperature} ${esc(r.temperatureUnit || '°C')}` : '—'}</td>
            <td class="text-xs text-slate-600 whitespace-nowrap">${r.weight != null ? `${r.weight} ${esc(r.weightUnit || 'kg')}` : '—'}</td>
            <td class="text-xs text-slate-600">${r.bmi != null ? parseFloat(r.bmi).toFixed(1) : '—'}</td>
            <td class="text-xs text-slate-600">${r.oxygenSaturation != null ? `${r.oxygenSaturation}%` : '—'}</td>
            <td class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                    ${canWrite ? `
                    <button onclick="openVitalForm(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition" title="Edit">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="deleteVital(${r.id})"
                        class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.openVitalForm = async function(recordId = null) {
    const isEdit = recordId !== null;

    let subjects = [];
    try { subjects = await api.getSubjects(); } catch {}

    let rec = {};
    if (isEdit) {
        try { rec = await api.request(`/api/vitalsigns/${recordId}`); } catch {}
    }

    const subjectOptions = subjects.map(s =>
        `<option value="${s.id}" ${rec.subjectId === s.id ? 'selected' : ''}>${esc(s.subject_code)}</option>`
    ).join('');

    showModal({
        title: isEdit ? 'Edit Vital Signs' : 'Record Vital Signs',
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Subject <span class="text-red-500">*</span></label>
                    <select id="vs-subject-id" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white" onchange="loadVisitsForSubject()">
                        <option value="">— Select Subject —</option>
                        ${subjectOptions}
                    </select>
                </div>
                <div>
                    <label class="ph-label">Visit</label>
                    <select id="vs-visit-id" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select after subject —</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="ph-label">Assessment Date <span class="text-red-500">*</span></label>
                    <input type="date" id="vs-date" value="${rec.assessmentDate ? rec.assessmentDate.split('T')[0] : ''}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Time</label>
                    <input type="time" id="vs-time" value="${esc(rec.assessmentTime)}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Position</label>
                    <select id="vs-position" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        ${['Supine','Sitting','Standing'].map(p =>
                            `<option ${rec.position === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Systolic BP (mmHg)</label>
                    <input type="number" id="vs-sys" value="${rec.systolicBp ?? ''}" placeholder="e.g. 120"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Diastolic BP (mmHg)</label>
                    <input type="number" id="vs-dia" value="${rec.diastolicBp ?? ''}" placeholder="e.g. 80"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Heart Rate (bpm)</label>
                    <input type="number" id="vs-hr" value="${rec.heartRate ?? ''}" placeholder="e.g. 72"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="ph-label">Respiratory Rate (/min)</label>
                    <input type="number" id="vs-rr" value="${rec.respiratoryRate ?? ''}" placeholder="e.g. 16"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="ph-label">Temperature</label>
                    <div class="flex gap-2">
                        <input type="number" step="0.1" id="vs-temp" value="${rec.temperature ?? ''}" placeholder="e.g. 36.8"
                            class="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                        <select id="vs-temp-unit" class="px-2 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                            <option ${rec.temperatureUnit === '°C' || !rec.temperatureUnit ? 'selected' : ''}>°C</option>
                            <option ${rec.temperatureUnit === '°F' ? 'selected' : ''}>°F</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="ph-label">O₂ Saturation (%)</label>
                    <input type="number" id="vs-o2" value="${rec.oxygenSaturation ?? ''}" placeholder="e.g. 98"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="ph-label">Weight</label>
                    <div class="flex gap-2">
                        <input type="number" step="0.1" id="vs-weight" value="${rec.weight ?? ''}" placeholder="e.g. 70"
                            class="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                        <select id="vs-weight-unit" class="px-2 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                            <option ${rec.weightUnit === 'kg' || !rec.weightUnit ? 'selected' : ''}>kg</option>
                            <option ${rec.weightUnit === 'lbs' ? 'selected' : ''}>lbs</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="ph-label">Height</label>
                    <div class="flex gap-2">
                        <input type="number" step="0.1" id="vs-height" value="${rec.height ?? ''}" placeholder="e.g. 175"
                            class="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                        <select id="vs-height-unit" class="px-2 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                            <option ${rec.heightUnit === 'cm' || !rec.heightUnit ? 'selected' : ''}>cm</option>
                            <option ${rec.heightUnit === 'in' ? 'selected' : ''}>in</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="ph-label">BMI</label>
                    <div class="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 text-slate-500 flex items-center">
                        <span class="text-xs italic">Auto-calculated from weight/height</span>
                    </div>
                </div>
            </div>
            <div>
                <label class="ph-label">Notes</label>
                <textarea id="vs-notes" rows="2" placeholder="Additional clinical notes…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(rec.notes)}</textarea>
            </div>
            ${isEdit ? `
            <div>
                <label class="ph-label">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="vs-rfc" placeholder="Required — explain what changed and why"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none">
            </div>` : ''}
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitVitalForm(${recordId})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-4 h-4"></i> ${isEdit ? 'Save Changes' : 'Save Vitals'}
        </button>`,
    });

    // Pre-load visits if editing
    if (isEdit && rec.subjectId) {
        try {
            const visits = await api.getVisits(rec.subjectId);
            const sel = document.getElementById('vs-visit-id');
            sel.innerHTML = `<option value="">— None —</option>` +
                visits.map(v => `<option value="${v.id}" ${rec.visitId === v.id ? 'selected' : ''}>${esc(v.visit_name)}</option>`).join('');
        } catch {}
    }
};

window.loadVisitsForSubject = async function() {
    const subjectId = document.getElementById('vs-subject-id').value;
    const sel = document.getElementById('vs-visit-id');
    if (!subjectId) { sel.innerHTML = '<option value="">— Select after subject —</option>'; return; }
    sel.innerHTML = '<option value="">Loading…</option>';
    try {
        const visits = await api.getVisits(Number(subjectId));
        sel.innerHTML = `<option value="">— None —</option>` +
            visits.map(v => `<option value="${v.id}">${esc(v.visit_name)}</option>`).join('');
    } catch {
        sel.innerHTML = '<option value="">— Error loading visits —</option>';
    }
};

window.submitVitalForm = async function(recordId) {
    const isEdit    = recordId !== null;
    const subjectId = document.getElementById('vs-subject-id').value;
    const date      = document.getElementById('vs-date').value;
    if (!subjectId || !date) { showToast('Subject and assessment date are required.', 'error'); return; }

    const weight = parseFloat(document.getElementById('vs-weight').value) || null;
    const height = parseFloat(document.getElementById('vs-height').value) || null;
    let bmi = null;
    if (weight && height) {
        const hm = document.getElementById('vs-height-unit').value === 'cm' ? height / 100 : height * 0.0254;
        const kg = document.getElementById('vs-weight-unit').value === 'kg' ? weight : weight * 0.453592;
        bmi = parseFloat((kg / (hm * hm)).toFixed(1));
    }

    const payload = {
        subjectId:       Number(subjectId),
        visitId:         document.getElementById('vs-visit-id').value ? Number(document.getElementById('vs-visit-id').value) : null,
        assessmentDate:  date,
        assessmentTime:  document.getElementById('vs-time').value || null,
        position:        document.getElementById('vs-position').value || null,
        systolicBp:      parseFloat(document.getElementById('vs-sys').value) || null,
        diastolicBp:     parseFloat(document.getElementById('vs-dia').value) || null,
        heartRate:       parseFloat(document.getElementById('vs-hr').value) || null,
        respiratoryRate: parseFloat(document.getElementById('vs-rr').value) || null,
        temperature:     parseFloat(document.getElementById('vs-temp').value) || null,
        temperatureUnit: document.getElementById('vs-temp-unit').value,
        weight,
        weightUnit:      document.getElementById('vs-weight-unit').value,
        height,
        heightUnit:      document.getElementById('vs-height-unit').value,
        bmi,
        oxygenSaturation: parseFloat(document.getElementById('vs-o2').value) || null,
        notes:           document.getElementById('vs-notes').value.trim() || null,
    };

    if (isEdit) {
        const rfc = document.getElementById('vs-rfc')?.value?.trim();
        if (!rfc) { showToast('Reason for change is required.', 'error'); return; }
        payload.reason = rfc;
    }

    try {
        if (isEdit) {
            await api.request(`/api/vitalsigns/${recordId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        } else {
            await api.request('/api/vitalsigns', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeModal();
        showToast(isEdit ? 'Vital signs updated.' : 'Vital signs recorded.', 'success');
        await renderVitalSigns(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteVital = async function(recordId) {
    const reason = prompt('Reason for deletion (required):');
    if (!reason) return;
    try {
        await api.request(`/api/vitalsigns/${recordId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
        showToast('Vital signs record deleted.', 'success');
        await renderVitalSigns(document.getElementById('main-content'));
    } catch (err) {
        showToast(err.message, 'error');
    }
};
