// Study Management — admin creates/edits studies and assigns users
// Multi-study isolation per Tier 4 architecture

import { api } from './api.js';
import { showToast } from './utils.js';
import { setSiteContext } from './study-select.js';

export async function renderStudyMgmt(container) {
    container.innerHTML = `<div class="flex items-center justify-center p-10 text-slate-400 text-sm">Loading studies…</div>`;
    try {
        const [studies, allUsers] = await Promise.all([api.getStudies(), api.getSecurityUsers()]);
        container.innerHTML = renderPage(studies);
        attachEvents(container, studies, allUsers);
    } catch (err) {
        container.innerHTML = `<div class="p-6 text-red-600 text-sm">Failed to load: ${err.message}</div>`;
    }
}

const PHASES = ['Phase I', 'Phase II', 'Phase III', 'Phase IV', 'N/A'];
const STATUSES = ['Active', 'Completed', 'Suspended', 'Terminated'];

function statusBadge(status) {
    const colors = {
        Active:     'bg-emerald-100 text-emerald-700',
        Completed:  'bg-blue-100 text-blue-700',
        Suspended:  'bg-amber-100 text-amber-700',
        Terminated: 'bg-red-100 text-red-700',
    };
    const cls = colors[status] ?? 'bg-slate-100 text-slate-500';
    return `<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cls}">${status}</span>`;
}

function renderPage(studies) {
    const current = api.getCurrentStudy();
    const rows = studies.length === 0
        ? `<tr><td colspan="6" class="py-10 text-center text-slate-400 text-sm">No studies yet. Create the first study to begin.</td></tr>`
        : studies.map(s => `
            <tr class="hover:bg-slate-50 transition ${current?.id === s.id ? 'bg-blue-50/60' : ''}">
                <td class="px-4 py-3">
                    <p class="text-sm font-semibold text-slate-900">${s.title}</p>
                    <p class="text-xs text-slate-400 font-mono mt-0.5">${s.protocolNo}</p>
                </td>
                <td class="px-4 py-3 text-sm text-slate-600">${s.phase ?? '—'}</td>
                <td class="px-4 py-3 text-sm text-slate-600">${s.sponsor ?? '—'}</td>
                <td class="px-4 py-3">${statusBadge(s.status)}</td>
                <td class="px-4 py-3 text-xs text-slate-500">${s.startDate ?? '—'}</td>
                <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button class="btn-switch-study text-xs font-medium px-2 py-1 rounded
                            ${current?.id === s.id ? 'bg-blue-600 text-white' : 'text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50'} transition"
                            data-id="${s.id}" data-title="${encodeURIComponent(s.title)}"
                            data-protocol="${encodeURIComponent(s.protocolNo)}" data-status="${s.status}">
                            ${current?.id === s.id ? 'Selected ✓' : 'Select'}
                        </button>
                        <button class="btn-users-study text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-2 py-1 rounded transition"
                            data-id="${s.id}" data-title="${encodeURIComponent(s.title)}">Users</button>
                        <button class="btn-edit-study text-xs font-medium text-slate-500 hover:text-slate-800 transition"
                            data-study='${JSON.stringify(s)}'>Edit</button>
                    </div>
                </td>
            </tr>`).join('');

    return `
        <div class="p-6 max-w-5xl mx-auto">
            <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h1 class="text-xl font-bold text-slate-900">Study Management</h1>
                    <p class="text-xs text-slate-500 mt-0.5">Create and manage clinical trials — each study isolates its own clinical data</p>
                </div>
                <button id="btn-add-study" class="flex items-center gap-2 btn-primary px-4 py-2 text-sm rounded-md">
                    <i data-lucide="plus" class="w-4 h-4"></i> New Study
                </button>
            </div>

            <!-- Stats strip -->
            <div class="grid grid-cols-3 gap-3 mb-6">
                <div class="ph-card p-4">
                    <p class="text-2xl font-bold text-slate-900">${studies.length}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Total Studies</p>
                </div>
                <div class="ph-card p-4">
                    <p class="text-2xl font-bold text-emerald-600">${studies.filter(s => s.status === 'Active').length}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Active</p>
                </div>
                <div class="ph-card p-4">
                    <p class="text-2xl font-bold text-blue-600">${studies.filter(s => s.status === 'Completed').length}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Completed</p>
                </div>
            </div>

            <div class="ph-card overflow-hidden">
                <table class="w-full border-collapse">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-100">
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Study / Protocol</th>
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Phase</th>
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Sponsor</th>
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Start</th>
                            <th class="px-4 py-2.5"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">${rows}</tbody>
                </table>
            </div>
        </div>

        ${renderAddModal()}
        ${renderEditModal()}
        ${renderUsersModal()}`;
}

function renderAddModal() {
    const phaseOptions = PHASES.map(p => `<option value="${p}">${p}</option>`).join('');
    return `
        <div id="add-study-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                <h2 class="text-lg font-semibold mb-4">Create New Study</h2>
                <div class="space-y-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Study Title *</label>
                        <input id="add-study-title" type="text" placeholder="e.g. Phase II Efficacy Study of Drug X"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Protocol No. *</label>
                            <input id="add-study-protocol" type="text" placeholder="e.g. DRUG-2024-II-001"
                                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Phase</label>
                            <select id="add-study-phase"
                                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                ${phaseOptions}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Sponsor</label>
                        <input id="add-study-sponsor" type="text" placeholder="e.g. PharmaCo Ltd"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Indication</label>
                        <input id="add-study-indication" type="text" placeholder="e.g. Type 2 Diabetes"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Start Date</label>
                            <input id="add-study-start" type="date"
                                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">End Date</label>
                            <input id="add-study-end" type="date"
                                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                </div>
                <p id="add-study-error" class="text-red-600 text-xs mt-3 hidden"></p>
                <div class="flex gap-2 mt-5">
                    <button id="add-study-cancel" class="flex-1 border border-slate-200 rounded-lg py-2 text-sm hover:bg-slate-50 transition">Cancel</button>
                    <button id="add-study-save" class="flex-2 btn-primary rounded-lg py-2 text-sm px-5 font-semibold">Create Study</button>
                </div>
            </div>
        </div>`;
}

function renderEditModal() {
    const phaseOptions = PHASES.map(p => `<option value="${p}">${p}</option>`).join('');
    const statusOptions = STATUSES.map(s => `<option value="${s}">${s}</option>`).join('');
    return `
        <div id="edit-study-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                <h2 class="text-lg font-semibold mb-4">Edit Study</h2>
                <div class="space-y-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Study Title *</label>
                        <input id="edit-study-title" type="text"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Phase</label>
                            <select id="edit-study-phase"
                                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                ${phaseOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Status</label>
                            <select id="edit-study-status"
                                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                ${statusOptions}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Sponsor</label>
                        <input id="edit-study-sponsor" type="text"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Indication</label>
                        <input id="edit-study-indication" type="text"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Start Date</label>
                            <input id="edit-study-start" type="date"
                                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">End Date</label>
                            <input id="edit-study-end" type="date"
                                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                </div>
                <p id="edit-study-error" class="text-red-600 text-xs mt-3 hidden"></p>
                <div class="flex gap-2 mt-5">
                    <button id="edit-study-cancel" class="flex-1 border border-slate-200 rounded-lg py-2 text-sm hover:bg-slate-50 transition">Cancel</button>
                    <button id="edit-study-save" class="flex-2 btn-primary rounded-lg py-2 text-sm px-5 font-semibold">Save Changes</button>
                </div>
            </div>
        </div>`;
}

function renderUsersModal() {
    return `
        <div id="users-study-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-semibold">Study Users — <span id="users-study-title" class="text-blue-600"></span></h2>
                    <button id="users-study-close" class="p-1.5 hover:bg-slate-100 rounded-lg transition">
                        <i data-lucide="x" class="w-4 h-4 text-slate-500"></i>
                    </button>
                </div>
                <div id="users-study-list" class="space-y-2 max-h-60 overflow-y-auto mb-4"></div>
                <div class="border-t border-slate-100 pt-4">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Assign User</label>
                    <div class="flex gap-2">
                        <select id="users-study-select" class="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">— Select user —</option>
                        </select>
                        <button id="users-study-assign" class="btn-primary rounded-lg px-4 py-2 text-sm font-semibold">Assign</button>
                    </div>
                </div>
            </div>
        </div>`;
}

function attachEvents(container, studies, allUsers) {
    let editingStudyId = null;
    let usersStudyId   = null;

    // ─── Add Study ───────────────────────────────────────────
    document.getElementById('btn-add-study')?.addEventListener('click', () => {
        ['add-study-title','add-study-protocol','add-study-sponsor','add-study-indication'].forEach(id => {
            document.getElementById(id).value = '';
        });
        document.getElementById('add-study-phase').value = 'N/A';
        document.getElementById('add-study-start').value = '';
        document.getElementById('add-study-end').value = '';
        document.getElementById('add-study-error').classList.add('hidden');
        document.getElementById('add-study-modal').classList.remove('hidden');
    });

    document.getElementById('add-study-cancel')?.addEventListener('click', () => {
        document.getElementById('add-study-modal').classList.add('hidden');
    });

    document.getElementById('add-study-save')?.addEventListener('click', async () => {
        const title      = document.getElementById('add-study-title').value.trim();
        const protocolNo = document.getElementById('add-study-protocol').value.trim().toUpperCase();
        const phase      = document.getElementById('add-study-phase').value;
        const sponsor    = document.getElementById('add-study-sponsor').value.trim();
        const indication = document.getElementById('add-study-indication').value.trim();
        const startDate  = document.getElementById('add-study-start').value;
        const endDate    = document.getElementById('add-study-end').value;
        const errEl      = document.getElementById('add-study-error');
        errEl.classList.add('hidden');

        if (!title || !protocolNo) {
            errEl.textContent = 'Study title and protocol number are required.';
            errEl.classList.remove('hidden');
            return;
        }

        try {
            const study = await api.createStudy({
                title, protocolNo, phase: phase || null,
                sponsor: sponsor || null, indication: indication || null,
                startDate: startDate || null, endDate: endDate || null,
            });
            // Auto-select newly created study if none selected
            if (!api.getCurrentStudy()) {
                api.setCurrentStudy(study);
                window.dispatchEvent(new CustomEvent('study-changed'));
            }
            showToast('Study created', 'success');
            document.getElementById('add-study-modal').classList.add('hidden');
            renderStudyMgmt(container);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
        }
    });

    // ─── Edit Study ──────────────────────────────────────────
    container.querySelectorAll('.btn-edit-study').forEach(btn => {
        btn.addEventListener('click', () => {
            const s = JSON.parse(btn.dataset.study);
            editingStudyId = s.id;
            document.getElementById('edit-study-title').value     = s.title;
            document.getElementById('edit-study-phase').value     = s.phase ?? 'N/A';
            document.getElementById('edit-study-status').value    = s.status;
            document.getElementById('edit-study-sponsor').value   = s.sponsor ?? '';
            document.getElementById('edit-study-indication').value = s.indication ?? '';
            document.getElementById('edit-study-start').value     = s.startDate ?? '';
            document.getElementById('edit-study-end').value       = s.endDate ?? '';
            document.getElementById('edit-study-error').classList.add('hidden');
            document.getElementById('edit-study-modal').classList.remove('hidden');
        });
    });

    document.getElementById('edit-study-cancel')?.addEventListener('click', () => {
        document.getElementById('edit-study-modal').classList.add('hidden');
        editingStudyId = null;
    });

    document.getElementById('edit-study-save')?.addEventListener('click', async () => {
        const title      = document.getElementById('edit-study-title').value.trim();
        const phase      = document.getElementById('edit-study-phase').value;
        const status     = document.getElementById('edit-study-status').value;
        const sponsor    = document.getElementById('edit-study-sponsor').value.trim();
        const indication = document.getElementById('edit-study-indication').value.trim();
        const startDate  = document.getElementById('edit-study-start').value;
        const endDate    = document.getElementById('edit-study-end').value;
        const errEl      = document.getElementById('edit-study-error');
        errEl.classList.add('hidden');

        if (!title) {
            errEl.textContent = 'Study title is required.';
            errEl.classList.remove('hidden');
            return;
        }

        try {
            await api.updateStudy(editingStudyId, {
                title, phase, status,
                sponsor: sponsor || null, indication: indication || null,
                startDate: startDate || null, endDate: endDate || null,
            });
            // Update cached study meta if it's the current study
            const current = api.getCurrentStudy();
            if (current?.id === editingStudyId) {
                api.setCurrentStudy({ ...current, title, status });
                window.dispatchEvent(new CustomEvent('study-changed'));
            }
            showToast('Study updated', 'success');
            document.getElementById('edit-study-modal').classList.add('hidden');
            editingStudyId = null;
            renderStudyMgmt(container);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
        }
    });

    // ─── Switch Study ────────────────────────────────────────
    container.querySelectorAll('.btn-switch-study').forEach(btn => {
        btn.addEventListener('click', () => {
            const newId = parseInt(btn.dataset.id);
            const current = api.getCurrentStudy();
            api.setCurrentStudy({
                id:         newId,
                title:      decodeURIComponent(btn.dataset.title),
                protocolNo: decodeURIComponent(btn.dataset.protocol),
                status:     btn.dataset.status,
            });
            // Clear site context when switching to a different study
            if (current?.id !== newId) {
                setSiteContext(null);
                window.dispatchEvent(new CustomEvent('site-context-changed'));
            }
            window.dispatchEvent(new CustomEvent('study-changed'));
            showToast('Study switched — please select a site', 'success');
            renderStudyMgmt(container);
        });
    });

    // ─── Manage Users ────────────────────────────────────────
    container.querySelectorAll('.btn-users-study').forEach(btn => {
        btn.addEventListener('click', async () => {
            usersStudyId = parseInt(btn.dataset.id);
            document.getElementById('users-study-title').textContent = decodeURIComponent(btn.dataset.title);
            document.getElementById('users-study-modal').classList.remove('hidden');
            await refreshUsersModal(usersStudyId, allUsers);
        });
    });

    document.getElementById('users-study-close')?.addEventListener('click', () => {
        document.getElementById('users-study-modal').classList.add('hidden');
        usersStudyId = null;
    });

    document.getElementById('users-study-assign')?.addEventListener('click', async () => {
        const select = document.getElementById('users-study-select');
        const userId = select.value;
        if (!userId) return showToast('Select a user first', 'error');
        try {
            await api.assignUserToStudy(usersStudyId, userId);
            showToast('User assigned', 'success');
            await refreshUsersModal(usersStudyId, allUsers);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    if (window.lucide) lucide.createIcons();
}

async function refreshUsersModal(studyId, allUsers) {
    const assignedUsers = await api.getStudyUsers(studyId).catch(() => []);
    const assignedIds = new Set(assignedUsers.map(u => u.userId));

    // User list
    const listEl = document.getElementById('users-study-list');
    if (assignedUsers.length === 0) {
        listEl.innerHTML = `<p class="text-sm text-slate-400 text-center py-3">No users assigned yet</p>`;
    } else {
        listEl.innerHTML = assignedUsers.map(u => `
            <div class="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                <div>
                    <p class="text-sm font-medium text-slate-800">${u.userName}</p>
                    <p class="text-xs text-slate-400">${u.userRole} · ${u.userEmail}</p>
                </div>
                <button class="btn-remove-user text-xs text-red-500 hover:text-red-700 transition"
                    data-userid="${u.userId}">Remove</button>
            </div>`).join('');

        listEl.querySelectorAll('.btn-remove-user').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    await api.removeUserFromStudy(studyId, btn.dataset.userid);
                    showToast('User removed', 'success');
                    await refreshUsersModal(studyId, allUsers);
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });
    }

    // Populate assign select with unassigned users
    const select = document.getElementById('users-study-select');
    const unassigned = allUsers.filter(u => !assignedIds.has(u.id));
    select.innerHTML = `<option value="">— Select user —</option>` +
        unassigned.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');

    if (window.lucide) lucide.createIcons();
}
