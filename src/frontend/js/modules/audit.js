// ============================================================
// Audit Trail View — FDA 21 CFR Part 11 immutable log
// ============================================================

import { api } from './api.js';
import { showToast } from './utils.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

function fmtDT(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

const ACTION_CSS = {
    INSERT: 'badge badge-insert',
    UPDATE: 'badge badge-update',
    DELETE: 'badge badge-delete',
    LOCK:   'badge badge-lock',
    UNLOCK: 'badge badge-unlock',
};

const TABLE_LABEL = {
    crf_data_entries: 'CRF Data Entry',
    subjects: 'Subject',
    visits:   'Visit',
};

export async function renderAuditTrail(filters = {}) {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const trails = await api.getAuditTrail(filters);

    content.innerHTML = `
    <div class="p-5 space-y-4">

        <!-- Header -->
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Audit Trail</h2>
                <p class="text-xs text-slate-500 mt-0.5">Permanent, immutable log of all system actions · FDA 21 CFR Part 11</p>
            </div>
            <button onclick="exportAuditCSV()"
                class="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 rounded-md transition">
                <i data-lucide="download" class="w-4 h-4"></i> Export CSV
            </button>
        </div>

        <!-- Compliance Notice -->
        <div class="ph-card p-4 flex items-start gap-3" style="border-color:#BFD7F5;background:#EBF2FD">
            <i data-lucide="shield-check" class="w-5 h-5 flex-shrink-0 mt-0.5" style="color:#1554A0"></i>
            <div>
                <p class="text-sm font-semibold" style="color:#0A2E5C">21 CFR Part 11 Compliant Audit Trail</p>
                <p class="text-xs mt-0.5" style="color:#1554A0">Every insert, update, delete, lock, and unlock is recorded with timestamp, user identity, IP address, and reason. Records are immutable and cannot be deleted or altered.</p>
            </div>
        </div>

        <!-- Filters -->
        <div class="ph-card p-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Action</label>
                    <select id="filter-action" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">All Actions</option>
                        <option value="INSERT">INSERT</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                        <option value="LOCK">LOCK</option>
                        <option value="UNLOCK">UNLOCK</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Table</label>
                    <select id="filter-table" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">All Tables</option>
                        <option value="crf_data_entries">CRF Data Entries</option>
                        <option value="subjects">Subjects</option>
                        <option value="visits">Visits</option>
                        <option value="queries">Queries</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Search</label>
                    <div class="relative">
                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        <input type="text" id="filter-search" placeholder="Reason or user…"
                            class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    </div>
                </div>
            </div>
        </div>

        <!-- Count -->
        <div class="flex items-center justify-between">
            <p class="text-xs text-slate-500">
                Showing <span id="audit-count" class="font-semibold text-slate-800">${trails.length}</span> records
            </p>
            <p class="text-xs text-slate-400 flex items-center gap-1">
                <i data-lucide="lock" class="w-3.5 h-3.5"></i>
                Read-only · permanently stored
            </p>
        </div>

        <!-- Audit Table -->
        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left w-10">#</th>
                            <th class="text-left">Timestamp</th>
                            <th class="text-left">Action</th>
                            <th class="text-left">Table / Record</th>
                            <th class="text-left">Field Changed</th>
                            <th class="text-left">Reason</th>
                            <th class="text-left">User</th>
                            <th class="text-left">IP</th>
                        </tr>
                    </thead>
                    <tbody id="audit-tbody" class="ph-table-body text-sm">
                        ${renderAuditRows(trails)}
                    </tbody>
                </table>
            </div>
            <div id="audit-empty" class="${trails.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="shield-check" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No records match your filters.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    async function applyFilters() {
        const action = document.getElementById('filter-action').value;
        const table  = document.getElementById('filter-table').value;
        const search = document.getElementById('filter-search').value.toLowerCase();
        let filtered = await api.getAuditTrail({ action, table_name: table });
        if (search) {
            filtered = filtered.filter(t =>
                t.reason_for_change?.toLowerCase().includes(search) ||
                t.user_name?.toLowerCase().includes(search) ||
                t.field_name?.toLowerCase().includes(search)
            );
        }
        document.getElementById('audit-tbody').innerHTML = renderAuditRows(filtered);
        document.getElementById('audit-count').textContent = filtered.length;
        document.getElementById('audit-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('filter-action').addEventListener('change', applyFilters);
    document.getElementById('filter-table').addEventListener('change', applyFilters);
    document.getElementById('filter-search').addEventListener('input', applyFilters);

    window.exportAuditCSV = function () {
        const headers = ['ID', 'Timestamp', 'Action', 'Table', 'Record ID', 'Field', 'Old Value', 'New Value', 'Reason', 'User', 'IP'];
        const rows = trails.map(t => [
            t.id, t.timestamp, t.action, t.table_name, t.record_id,
            t.field_name || '', t.old_value || '', t.new_value || '',
            `"${(t.reason_for_change || '').replace(/"/g, '""')}"`,
            t.user_name, t.ip_address,
        ]);
        const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a    = document.createElement('a');
        a.href     = URL.createObjectURL(blob);
        a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        showToast('Audit trail exported as CSV.', 'success');
    };
}

function renderAuditRows(trails) {
    if (trails.length === 0) return '';
    return trails.map(t => `
    <tr class="${t.action === 'DELETE' ? 'bg-red-50' : ''}">
        <td class="text-xs text-slate-400 font-mono">#${t.id}</td>
        <td class="text-xs text-slate-600 whitespace-nowrap font-mono">${fmtDT(t.timestamp)}</td>
        <td><span class="${ACTION_CSS[t.action] || 'badge bg-slate-100 text-slate-600'}">${t.action}</span></td>
        <td>
            <p class="text-xs font-medium text-slate-700">${TABLE_LABEL[t.table_name] || t.table_name}</p>
            <p class="text-xs text-slate-400">#${t.record_id}</p>
        </td>
        <td class="text-xs">
            ${t.field_name ? `
            <p class="font-mono font-medium text-slate-700">${t.field_name}</p>
            ${t.old_value !== null ? `<p class="text-slate-400"><span class="text-red-500 line-through">${trunc(t.old_value, 18)}</span> → <span class="text-emerald-600">${trunc(t.new_value, 18)}</span></p>` : ''}
            ` : '<span class="text-slate-300">—</span>'}
        </td>
        <td class="text-xs text-slate-600 max-w-[160px]">
            <p class="truncate" title="${esc(t.reason_for_change)}">${esc(t.reason_for_change)}</p>
        </td>
        <td class="text-xs text-slate-600 whitespace-nowrap">${esc(t.user_name)}</td>
        <td class="text-xs text-slate-400 font-mono whitespace-nowrap">${t.ip_address || '—'}</td>
    </tr>`).join('');
}

function trunc(s, n) { if (!s) return ''; return s.length > n ? s.slice(0, n) + '…' : s; }
function esc(s)      { if (!s) return ''; return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
