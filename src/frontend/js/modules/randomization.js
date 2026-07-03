// ============================================================
// Randomization Module — Blinded treatment assignment (Admin only)
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

function fmtDT(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export async function renderRandomization() {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const user = api.getCurrentUser();
    if (!['admin', 'pi', 'investigator'].includes(user.role)) {
        content.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200">
            <p class="text-sm font-semibold text-red-800 mb-1">Access Restricted</p>
            <p class="text-sm text-red-700">Randomization is restricted to Administrators, Principal Investigators, and Investigators to maintain trial integrity.</p>
        </div></div>`;
        return;
    }
    const isAdmin = user.role === 'admin';

    let assignments, stats, listRows;
    try {
        [assignments, stats, listRows] = await Promise.all([
            api.getRandomization(),
            api.getRandomizationStats(),
            // Full randomization list (with unblinded arms) is admin-only
            isAdmin ? api.getRandomizationList() : Promise.resolve(null),
        ]);
    } catch (err) {
        content.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    const armCounts = {};
    for (const a of assignments) {
        if (!a.isBlinded) {
            armCounts[a.treatmentArm] = (armCounts[a.treatmentArm] || 0) + 1;
        }
    }

    content.innerHTML = `
    <div class="p-5 space-y-5">

        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Randomization</h2>
                <p class="text-xs text-slate-500 mt-0.5">Blinded treatment assignment — ICH E9 / E9(R1) statistical principles</p>
            </div>
            <div class="flex gap-2">
                ${isAdmin ? `
                <button onclick="openUploadModal()"
                    class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded-md transition">
                    <i data-lucide="upload" class="w-4 h-4"></i> Upload List
                </button>` : ''}
                <button onclick="openRandomizeModal()"
                    class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition">
                    <i data-lucide="shuffle" class="w-4 h-4"></i> Randomize Subject
                </button>
            </div>
        </div>

        <!-- Blinding alert -->
        <div class="flex items-start gap-3 p-4 rounded-md border" style="background:#FEF3C7;border-color:#FCD34D">
            <i data-lucide="lock" class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:#92400E"></i>
            <div class="text-xs" style="color:#92400E">
                <p class="font-semibold mb-0.5">Blinding Control — Administrator Only</p>
                <p>Treatment arm assignments are blinded by default. Unblinding creates a permanent, time-stamped audit record. Emergency unblinding must be documented with clinical justification.</p>
            </div>
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total Slots</p>
                <p class="kpi-number text-slate-700">${stats.totalSlots}</p>
            </div>
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Available</p>
                <p class="kpi-number text-emerald-600">${stats.available}</p>
            </div>
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Randomized</p>
                <p class="kpi-number text-blue-700">${stats.randomized}</p>
            </div>
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Unblinded</p>
                <p class="kpi-number text-amber-600">${stats.unblinded}</p>
            </div>
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Used Slots</p>
                <p class="kpi-number text-slate-500">${stats.usedSlots}</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

            <!-- Assignments -->
            <div class="lg:col-span-2 ph-card overflow-hidden">
                <div class="ph-card-header">
                    <h3><i data-lucide="shuffle" class="w-4 h-4 text-slate-400"></i> Subject Assignments</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="ph-table-head">
                            <tr>
                                <th class="text-left">Subject</th>
                                <th class="text-left">Rand Code</th>
                                <th class="text-left">Treatment Arm</th>
                                <th class="text-left">Stratum</th>
                                <th class="text-left">Randomized</th>
                                <th class="text-right">Unblind</th>
                            </tr>
                        </thead>
                        <tbody class="ph-table-body">
                            ${assignments.length === 0
                                ? `<tr><td colspan="6" class="text-center py-8 text-sm text-slate-400">No subjects randomized yet.</td></tr>`
                                : assignments.map(a => `
                            <tr>
                                <td class="text-xs font-semibold font-mono text-slate-800">${esc(a.subjectCode)}</td>
                                <td><code class="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">${esc(a.randCode)}</code></td>
                                <td>
                                    ${a.isBlinded
                                        ? `<span class="badge" style="background:#F1F5F9;color:#94A3B8;border:1px solid #CBD5E1">
                                            <i class="inline-block w-3 h-3 mr-1">🔒</i> BLINDED
                                           </span>`
                                        : `<span class="badge" style="background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7">${esc(a.treatmentArm)}</span>
                                           <p class="text-xs text-amber-600 mt-0.5">Unblinded ${fmtDT(a.unblindedAt)}</p>`}
                                </td>
                                <td class="text-xs text-slate-500">${esc(a.stratum || '—')}</td>
                                <td class="text-xs text-slate-500 whitespace-nowrap">
                                    <p>${esc(a.randomizedByName)}</p>
                                    <p class="text-slate-400">${fmtDT(a.randomizedAt)}</p>
                                </td>
                                <td class="text-right">
                                    ${a.isBlinded ? (isAdmin ? `
                                    <button onclick="openUnblindModal(${a.id}, '${esc(a.subjectCode)}')"
                                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition border border-amber-200">
                                        <i data-lucide="eye" class="w-3 h-3"></i> Unblind
                                    </button>` : `<span class="text-xs text-slate-300">🔒</span>`) : `<span class="text-xs text-slate-300">Unblinded</span>`}
                                </td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- List Preview (admin only — reveals treatment arms) -->
            ${isAdmin ? `
            <div class="ph-card overflow-hidden">
                <div class="ph-card-header">
                    <h3><i data-lucide="list" class="w-4 h-4 text-slate-400"></i> Randomization List</h3>
                    <span class="text-xs text-slate-400">${listRows.length} total</span>
                </div>
                <div class="max-h-64 overflow-y-auto">
                    ${listRows.length === 0
                        ? `<div class="p-4 text-center text-sm text-slate-400">No list uploaded yet.</div>`
                        : `<table class="min-w-full text-xs">
                            <thead class="ph-table-head sticky top-0">
                                <tr><th class="text-left">Code</th><th class="text-left">Arm</th><th class="text-left">Stratum</th><th class="text-left">Used</th></tr>
                            </thead>
                            <tbody class="ph-table-body">
                                ${listRows.map(r => `<tr class="${r.isUsed ? 'opacity-40' : ''}">
                                    <td><code class="font-mono">${esc(r.randCode)}</code></td>
                                    <td>${esc(r.treatmentArm)}</td>
                                    <td>${esc(r.stratum || '—')}</td>
                                    <td>${r.isUsed ? '✓' : ''}</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>`}
                </div>
            </div>` : `
            <div class="ph-card p-5">
                <p class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Randomization List</p>
                <p class="text-xs text-slate-400">The full randomization list (with treatment arms) is visible to Administrators only, to preserve blinding.</p>
            </div>`}
        </div>
    </div>`;

    lucide.createIcons();
}

window.openUploadModal = function() {
    showModal({
        title: 'Upload Randomization List',
        size: 'md',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#FEF3C7;border-color:#FDE68A;color:#92400E">
                <i data-lucide="lock" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                Upload a pre-generated randomization list. Each code maps to a blinded treatment arm. The list must be generated by a statistician per the study protocol.
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    JSON Randomization List <span class="text-red-500">*</span>
                </label>
                <p class="text-xs text-slate-400 mb-2">Format: array of <code class="bg-slate-100 px-1 rounded">{"randCode":"R001","treatmentArm":"Active","stratum":"Male"}</code></p>
                <textarea id="rand-list-json" rows="8" placeholder='[&#10;  {"randCode": "R001", "treatmentArm": "Active", "stratum": "Male"},&#10;  {"randCode": "R002", "treatmentArm": "Placebo", "stratum": "Male"}&#10;]'
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-xs ph-input outline-none font-mono resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitRandList()" class="px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="upload" class="w-4 h-4"></i> Upload
        </button>`,
    });
};

window.submitRandList = async function() {
    const raw = document.getElementById('rand-list-json').value.trim();
    if (!raw) { showToast('JSON list is required.', 'error'); return; }
    let entries;
    try {
        entries = JSON.parse(raw);
        if (!Array.isArray(entries)) throw new Error('Expected an array');
    } catch (e) {
        showToast(`Invalid JSON: ${e.message}`, 'error'); return;
    }
    try {
        const result = await api.uploadRandomizationList(entries);
        closeModal();
        showToast(`Uploaded ${result.uploaded} of ${result.total} entries.`, 'success');
        await renderRandomization();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.openRandomizeModal = function() {
    showModal({
        title: 'Randomize Subject',
        size: 'sm',
        body: `
        <div class="space-y-4">
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Subject Code <span class="text-red-500">*</span></label>
                <input type="text" id="rand-subject" placeholder="e.g. SITE01-001"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Stratum (optional)</label>
                <input type="text" id="rand-stratum" placeholder="e.g. Male, ≥65y, Site01"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                <p class="text-xs text-slate-400 mt-1">Assigns the next available slot matching this stratum.</p>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitRandomize()" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="shuffle" class="w-4 h-4"></i> Randomize
        </button>`,
    });
};

window.submitRandomize = async function() {
    const subjectCode = document.getElementById('rand-subject').value.trim();
    const stratum     = document.getElementById('rand-stratum').value.trim() || null;
    if (!subjectCode) { showToast('Subject code is required.', 'error'); return; }

    let subjectId;
    try {
        const subjects = await api.getSubjects({ search: subjectCode });
        const match = subjects.find(s => s.subject_code === subjectCode);
        if (!match) { showToast(`Subject "${subjectCode}" not found.`, 'error'); return; }
        subjectId = match.id;
    } catch { showToast('Could not resolve subject.', 'error'); return; }

    try {
        const result = await api.randomizeSubject(subjectId, stratum);
        closeModal();
        showToast(`Subject ${subjectCode} randomized — Code: ${result.randCode} (arm blinded)`, 'success');
        await renderRandomization();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.openUnblindModal = function(assignmentId, subjectCode) {
    showModal({
        title: 'Emergency Unblinding',
        size: 'md',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B">
                <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                <div>
                    <p class="font-semibold mb-0.5">Irreversible Action — Subject: ${esc(subjectCode)}</p>
                    <p>Unblinding creates a permanent audit record with timestamp, user identity, and stated reason. This action cannot be undone. Only proceed if clinically required (e.g. medical emergency, death, SAE).</p>
                </div>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Clinical Justification <span class="text-red-500">*</span></label>
                <textarea id="unblind-reason" rows="3" placeholder="State the specific clinical reason requiring unblinding (e.g. Serious adverse event — suspected drug toxicity; physician requires treatment arm for management)…"
                    class="w-full px-3 py-2 border border-red-200 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitUnblind(${assignmentId})" class="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="eye" class="w-4 h-4"></i> Confirm Unblinding
        </button>`,
    });
};

window.submitUnblind = async function(assignmentId) {
    const reason = document.getElementById('unblind-reason').value.trim();
    if (!reason) { showToast('Clinical justification is required.', 'error'); return; }
    try {
        await api.unblindSubject(assignmentId, reason);
        closeModal();
        showToast('Unblinding recorded. Audit trail updated.', 'success');
        await renderRandomization();
    } catch (err) {
        showToast(err.message, 'error');
    }
};
