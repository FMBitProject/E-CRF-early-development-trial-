// ============================================================
// Query Management View — CRA ↔ Investigator workflow
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

function fmtDT(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function statusBadge(status) {
    const map = {
        Open:     'badge badge-open',
        Resolved: 'badge badge-resolved',
        Closed:   'badge badge-closed',
    };
    return `<span class="${map[status] || 'badge badge-closed'}">${status}</span>`;
}

export async function renderQueries(filters = {}) {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const user    = api.getCurrentUser();
    const queries = await api.getQueries(filters);

    const openCount     = queries.filter(q => q.status === 'Open').length;
    const resolvedCount = queries.filter(q => q.status === 'Resolved').length;
    const closedCount   = queries.filter(q => q.status === 'Closed').length;

    content.innerHTML = `
    <div class="p-5 space-y-4">

        <!-- Header -->
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Data Queries</h2>
                <p class="text-xs text-slate-500 mt-0.5">Discrepancy management between CRAs and Investigators</p>
            </div>
        </div>

        <!-- KPI row -->
        <div class="grid grid-cols-3 gap-4">
            <div class="ph-card p-4 cursor-pointer hover:shadow-sm transition" onclick="applyQueryFilter('Open')">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Open</p>
                <p class="kpi-number text-red-600">${openCount}</p>
                <p class="text-xs text-slate-400 mt-1.5">Requiring action</p>
            </div>
            <div class="ph-card p-4 cursor-pointer hover:shadow-sm transition" onclick="applyQueryFilter('Resolved')">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Resolved</p>
                <p class="kpi-number text-emerald-600">${resolvedCount}</p>
                <p class="text-xs text-slate-400 mt-1.5">Pending CRA review</p>
            </div>
            <div class="ph-card p-4 cursor-pointer hover:shadow-sm transition" onclick="applyQueryFilter('Closed')">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Closed</p>
                <p class="kpi-number text-slate-500">${closedCount}</p>
                <p class="text-xs text-slate-400 mt-1.5">Finalized</p>
            </div>
        </div>

        <!-- Filter Bar -->
        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <select id="query-status-filter"
                    class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                </select>
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="query-search" placeholder="Search by subject, field, or query text…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
        </div>

        <!-- Queries Table -->
        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">#</th>
                            <th class="text-left">Subject / Visit / Form</th>
                            <th class="text-left">Field</th>
                            <th class="text-left">Query</th>
                            <th class="text-left">Status</th>
                            <th class="text-left">Raised</th>
                            <th class="text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody id="query-tbody" class="ph-table-body">
                        ${renderQueryRows(queries, user)}
                    </tbody>
                </table>
            </div>
            <div id="query-empty" class="${queries.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="message-square" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No queries found.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    window.applyQueryFilter = async function (status) {
        document.getElementById('query-status-filter').value = status;
        await filterQueries();
    };

    async function filterQueries() {
        const status = document.getElementById('query-status-filter').value;
        const search = document.getElementById('query-search').value.toLowerCase();
        let filtered = await api.getQueries({ status });
        if (search) {
            filtered = filtered.filter(q =>
                q.query_text?.toLowerCase().includes(search) ||
                q.subject_code?.toLowerCase().includes(search) ||
                q.field_label?.toLowerCase().includes(search) ||
                q.form_name?.toLowerCase().includes(search)
            );
        }
        document.getElementById('query-tbody').innerHTML = renderQueryRows(filtered, user);
        document.getElementById('query-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('query-status-filter').addEventListener('change', filterQueries);
    document.getElementById('query-search').addEventListener('input', filterQueries);
}

function renderQueryRows(queries, user) {
    if (queries.length === 0) return '';
    return queries.map(q => {
        const canResolve = q.status === 'Open'     && (user.role === 'investigator' || user.role === 'admin');
        const canClose   = q.status === 'Resolved' && (user.role === 'cra'          || user.role === 'admin');

        return `<tr>
            <td class="text-xs text-slate-400 font-mono">#${q.id}</td>
            <td>
                <p class="text-xs font-semibold font-mono text-slate-800">${esc(q.subject_code)}</p>
                <p class="text-xs text-slate-400">${esc(q.visit_name)} · ${esc(q.form_name)}</p>
            </td>
            <td>
                <code class="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">${esc(q.field_key)}</code>
                <p class="text-xs text-slate-500 mt-0.5">${esc(q.field_label)}</p>
            </td>
            <td class="max-w-[200px]">
                <p class="text-xs text-slate-700 line-clamp-2">${esc(q.query_text)}</p>
                ${q.resolution_text ? `<p class="text-xs text-emerald-600 mt-1 line-clamp-1">↳ ${esc(q.resolution_text)}</p>` : ''}
            </td>
            <td>${statusBadge(q.status)}</td>
            <td class="text-xs text-slate-500 whitespace-nowrap">
                <p>${esc(q.raised_by_name)}</p>
                <p class="text-slate-400">${fmtDT(q.raised_at)}</p>
            </td>
            <td class="text-right">
                <div class="flex items-center justify-end gap-2">
                ${canResolve ? `
                <button onclick="openResolveModal(${q.id})"
                    class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition border border-emerald-200">
                    <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Resolve
                </button>` : ''}
                ${canClose ? `
                <button onclick="closeQueryAction(${q.id})"
                    class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
                    <i data-lucide="x-circle" class="w-3.5 h-3.5"></i> Close
                </button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.openResolveModal = function (queryId) {
    showModal({
        title: 'Resolve Query',
        size: 'md',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-sm" style="background:#EBF2FD;border-color:#BFD7F5;color:#1554A0">
                <i data-lucide="info" class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:#1554A0"></i>
                Provide a detailed resolution. This will be recorded and visible to the CRA for review and closure.
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Resolution / Response <span class="text-red-500">*</span></label>
                <textarea id="resolve-text" rows="4"
                    placeholder="Explain how this query has been addressed…"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitResolve(${queryId})" class="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="check-circle" class="w-4 h-4"></i> Submit Resolution
        </button>`,
    });
};

window.submitResolve = async function (queryId) {
    const text = document.getElementById('resolve-text').value.trim();
    if (!text) { showToast('Resolution text is required.', 'error'); return; }
    try {
        await api.resolveQuery(queryId, text);
        closeModal();
        showToast('Query resolved. CRA can now close it.', 'success');
        await renderQueries();
    } catch (err) { showToast(err.message, 'error'); }
};

window.closeQueryAction = async function (queryId) {
    if (!confirm('Close this query? This finalizes the resolution.')) return;
    try {
        await api.closeQuery(queryId);
        showToast('Query closed.', 'success');
        await renderQueries();
    } catch (err) { showToast(err.message, 'error'); }
};

function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
