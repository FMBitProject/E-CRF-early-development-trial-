// Site Management — ICH GCP E6(R3) §4.1.1
// Sites must be formally registered before subject enrollment begins

import { api } from './api.js';
import { showToast } from './utils.js';

export async function renderSites(container) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:3rem;">
        <span style="color:#6b7280;">Loading sites…</span></div>`;

    const sites = await api.getSites().catch(() => []);
    container.innerHTML = renderSitesPage(sites);
    attachSiteEvents(container);
}

function statusBadge(status) {
    return status === 'Active'
        ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
               <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>Active
           </span>`
        : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
               <span class="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>Inactive
           </span>`;
}

function renderSitesPage(sites) {
    const rows = sites.length === 0
        ? `<tr><td colspan="6" class="text-center py-10 text-slate-400 text-sm">
               No sites registered yet. Add the first study site to enable subject enrollment.
           </td></tr>`
        : sites.map(s => `
            <tr class="hover:bg-slate-50 transition">
                <td class="px-4 py-3 font-mono text-sm font-semibold text-slate-800">${s.code ?? s.site_code ?? '—'}</td>
                <td class="px-4 py-3 text-sm text-slate-700 font-medium">${s.name ?? s.site_name ?? '—'}</td>
                <td class="px-4 py-3 text-sm text-slate-500">${s.country ?? '—'}</td>
                <td class="px-4 py-3 text-sm text-slate-600">${s.piName ?? s.pi_name ?? '—'}</td>
                <td class="px-4 py-3">${statusBadge(s.status)}</td>
                <td class="px-4 py-3 text-right">
                    <button class="btn-edit-site text-xs font-medium text-blue-600 hover:text-blue-800 transition"
                        data-id="${s.id}"
                        data-name="${s.name ?? s.site_name ?? ''}"
                        data-country="${s.country ?? ''}"
                        data-pi="${s.piName ?? s.pi_name ?? ''}"
                        data-status="${s.status}">
                        Edit
                    </button>
                </td>
            </tr>`).join('');

    return `
        <div class="p-6 max-w-5xl mx-auto">
            <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h1 class="text-xl font-bold text-slate-900">Study Sites</h1>
                    <p class="text-xs text-slate-500 mt-0.5">ICH GCP E6(R3) §4.1.1 — Sites must be formally registered before subject enrollment</p>
                </div>
                <button id="btn-add-site"
                    class="flex items-center gap-2 btn-primary px-4 py-2 text-sm rounded-md">
                    <i data-lucide="plus" class="w-4 h-4"></i> Register Site
                </button>
            </div>

            <!-- Stats strip -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div class="ph-card p-4">
                    <p class="text-2xl font-bold text-slate-900">${sites.length}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Total Sites</p>
                </div>
                <div class="ph-card p-4">
                    <p class="text-2xl font-bold text-emerald-600">${sites.filter(s => s.status === 'Active').length}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Active</p>
                </div>
                <div class="ph-card p-4">
                    <p class="text-2xl font-bold text-slate-400">${sites.filter(s => s.status !== 'Active').length}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Inactive</p>
                </div>
            </div>

            <div class="ph-card overflow-hidden">
                <table class="w-full border-collapse">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-100">
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Site Code</th>
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Site Name</th>
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Principal Investigator</th>
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                            <th class="px-4 py-2.5"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">${rows}</tbody>
                </table>
            </div>

            <p class="text-xs text-slate-400 mt-3">
                Sites cannot be deleted — set to Inactive to close enrollment. All changes are audit-trailed per ICH GCP E6(R3).
            </p>
        </div>

        ${renderAddModal()}
        ${renderEditModal()}
    `;
}

function renderAddModal() {
    return `
        <div id="add-site-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                <h2 class="text-lg font-semibold mb-1">Register Study Site</h2>
                <p class="text-xs text-slate-500 mb-4">Per ICH GCP E6(R3) §4.1.1 — site must be formally initiated before enrollment begins.</p>

                <div class="space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Site Code *</label>
                            <input id="add-site-code" type="text" placeholder="e.g. JKT-001"
                                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Country</label>
                            <input id="add-site-country" type="text" placeholder="e.g. Indonesia"
                                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Site Name *</label>
                        <input id="add-site-name" type="text" placeholder="e.g. Jakarta General Hospital"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Principal Investigator</label>
                        <input id="add-site-pi" type="text" placeholder="e.g. Dr. Budi Santoso"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>

                <p id="add-site-error" class="text-red-600 text-xs mt-3 hidden"></p>

                <div class="flex gap-2 mt-5">
                    <button id="add-site-cancel" class="flex-1 border border-slate-200 rounded-lg py-2 text-sm hover:bg-slate-50 transition">Cancel</button>
                    <button id="add-site-save" class="flex-2 btn-primary rounded-lg py-2 text-sm px-5 font-semibold">Register Site</button>
                </div>
            </div>
        </div>
    `;
}

function renderEditModal() {
    return `
        <div id="edit-site-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                <h2 class="text-lg font-semibold mb-4">Edit Site</h2>

                <div class="space-y-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Site Name *</label>
                        <input id="edit-site-name" type="text"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Country</label>
                        <input id="edit-site-country" type="text"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Principal Investigator</label>
                        <input id="edit-site-pi" type="text"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Status</label>
                        <select id="edit-site-status"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <p id="edit-site-error" class="text-red-600 text-xs mt-3 hidden"></p>

                <div class="flex gap-2 mt-5">
                    <button id="edit-site-cancel" class="flex-1 border border-slate-200 rounded-lg py-2 text-sm hover:bg-slate-50 transition">Cancel</button>
                    <button id="edit-site-save" class="flex-2 btn-primary rounded-lg py-2 text-sm px-5 font-semibold">Save Changes</button>
                </div>
            </div>
        </div>
    `;
}

function attachSiteEvents(container) {
    // Add site modal
    document.getElementById('btn-add-site')?.addEventListener('click', () => {
        ['add-site-code', 'add-site-name', 'add-site-country', 'add-site-pi'].forEach(id => {
            document.getElementById(id).value = '';
        });
        document.getElementById('add-site-error').classList.add('hidden');
        document.getElementById('add-site-modal').classList.remove('hidden');
    });
    document.getElementById('add-site-cancel')?.addEventListener('click', () => {
        document.getElementById('add-site-modal').classList.add('hidden');
    });
    document.getElementById('add-site-save')?.addEventListener('click', async () => {
        const code    = document.getElementById('add-site-code').value.trim().toUpperCase();
        const name    = document.getElementById('add-site-name').value.trim();
        const country = document.getElementById('add-site-country').value.trim();
        const piName  = document.getElementById('add-site-pi').value.trim();
        const errEl   = document.getElementById('add-site-error');
        errEl.classList.add('hidden');

        if (!code || !name) {
            errEl.textContent = 'Site code and name are required.';
            errEl.classList.remove('hidden');
            return;
        }
        try {
            await api.createSite({ code, name, country: country || null, piName: piName || null });
            showToast('Site registered successfully', 'success');
            document.getElementById('add-site-modal').classList.add('hidden');
            renderSites(container);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
        }
    });

    // Edit site modal
    let editingId = null;
    container.querySelectorAll('.btn-edit-site').forEach(btn => {
        btn.addEventListener('click', () => {
            editingId = btn.dataset.id;
            document.getElementById('edit-site-name').value    = btn.dataset.name;
            document.getElementById('edit-site-country').value = btn.dataset.country;
            document.getElementById('edit-site-pi').value      = btn.dataset.pi;
            document.getElementById('edit-site-status').value  = btn.dataset.status;
            document.getElementById('edit-site-error').classList.add('hidden');
            document.getElementById('edit-site-modal').classList.remove('hidden');
        });
    });
    document.getElementById('edit-site-cancel')?.addEventListener('click', () => {
        document.getElementById('edit-site-modal').classList.add('hidden');
        editingId = null;
    });
    document.getElementById('edit-site-save')?.addEventListener('click', async () => {
        const name    = document.getElementById('edit-site-name').value.trim();
        const country = document.getElementById('edit-site-country').value.trim();
        const piName  = document.getElementById('edit-site-pi').value.trim();
        const status  = document.getElementById('edit-site-status').value;
        const errEl   = document.getElementById('edit-site-error');
        errEl.classList.add('hidden');

        if (!name) {
            errEl.textContent = 'Site name is required.';
            errEl.classList.remove('hidden');
            return;
        }
        try {
            await api.updateSite(editingId, { name, country: country || null, piName: piName || null, status });
            showToast('Site updated', 'success');
            document.getElementById('edit-site-modal').classList.add('hidden');
            editingId = null;
            renderSites(container);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
        }
    });

    if (window.lucide) lucide.createIcons();
}
