// ============================================================
// Dashboard View — Pharma-grade overview
// ============================================================

import { api } from './api.js';

function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

const ACTION_BADGE = {
    INSERT: 'badge badge-insert',
    UPDATE: 'badge badge-update',
    DELETE: 'badge badge-delete',
    LOCK:   'badge badge-lock',
    UNLOCK: 'badge badge-unlock',
};

export async function renderDashboard() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="flex items-center justify-center h-32">
        <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
    </div>`;

    const stats = await api.getDashboardStats();
    const user  = api.getCurrentUser();
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    content.innerHTML = `
    <div class="p-5 space-y-5">

        <!-- Page Header -->
        <div class="flex items-end justify-between">
            <div>
                <p class="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">${today}</p>
                <h2 class="text-xl font-bold text-slate-900">Welcome, ${user.name.split(' ')[0]}</h2>
            </div>
            <span class="badge ${roleClass(user.role)} text-xs px-3 py-1">${roleLabel(user.role)}</span>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            ${kpiCard('Active Subjects',  stats.activeSubjects,  `${stats.totalSubjects} total enrolled`,  'users',          '#1554A0', '#EBF2FD')}
            ${kpiCard('Pending Forms',    stats.pendingForms,    'awaiting submission',                    'file-edit',      '#B45309', '#FEF3C7')}
            ${kpiCard('Open Queries',     stats.openQueries,     'requiring resolution',                   'message-square', '#991B1B', '#FEE2E2')}
            ${kpiCard('Total Visits',     stats.totalVisits,     'study visits recorded',                  'calendar-check', '#065F46', '#D1FAE5')}
        </div>

        <!-- Main Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

            <!-- Recent Audit Activity -->
            <div class="lg:col-span-2 ph-card overflow-hidden">
                <div class="ph-card-header">
                    <h3><i data-lucide="activity" class="w-4 h-4 text-slate-400"></i> Recent Audit Activity</h3>
                    <a href="#audit" class="text-xs text-blue-600 hover:underline font-medium">View full trail →</a>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="ph-table-head">
                            <tr>
                                <th class="text-left">Action</th>
                                <th class="text-left">Record</th>
                                <th class="text-left">Reason</th>
                                <th class="text-left">User</th>
                                <th class="text-left">Time</th>
                            </tr>
                        </thead>
                        <tbody class="ph-table-body">
                            ${stats.recentAudit.length === 0
                                ? `<tr><td colspan="5" class="text-center py-8 text-sm text-slate-400">No recent activity</td></tr>`
                                : stats.recentAudit.map(a => `
                                <tr>
                                    <td><span class="${ACTION_BADGE[a.action] || 'badge bg-slate-100 text-slate-600'}">${a.action}</span></td>
                                    <td class="text-xs font-medium text-slate-700">${a.table_name}<br><span class="text-slate-400 font-normal">#${a.record_id}</span></td>
                                    <td class="text-xs text-slate-600 max-w-[160px] truncate">${esc(a.reason_for_change)}</td>
                                    <td class="text-xs text-slate-600 whitespace-nowrap">${esc(a.user_name)}</td>
                                    <td class="text-xs text-slate-500 whitespace-nowrap font-mono">${fmt(a.timestamp)}</td>
                                </tr>`).join('')
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Right column -->
            <div class="space-y-4">

                <!-- Quick Actions -->
                <div class="ph-card">
                    <div class="ph-card-header">
                        <h3><i data-lucide="zap" class="w-4 h-4 text-slate-400"></i> Quick Actions</h3>
                    </div>
                    <div class="p-3 space-y-1.5">
                        <a href="#subjects" class="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-50 transition group text-sm text-slate-700 border border-transparent hover:border-slate-200">
                            <div class="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <i data-lucide="users" class="w-3.5 h-3.5 text-blue-600"></i>
                            </div>
                            <span class="font-medium text-xs">View All Subjects</span>
                            <i data-lucide="arrow-right" class="w-3.5 h-3.5 ml-auto text-slate-300 group-hover:text-slate-500 transition"></i>
                        </a>
                        ${(user.role === 'investigator' || user.role === 'admin') ? `
                        <a href="#subjects/new" class="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-50 transition group text-sm text-slate-700 border border-transparent hover:border-slate-200">
                            <div class="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                <i data-lucide="user-plus" class="w-3.5 h-3.5 text-emerald-600"></i>
                            </div>
                            <span class="font-medium text-xs">Enroll New Subject</span>
                            <i data-lucide="arrow-right" class="w-3.5 h-3.5 ml-auto text-slate-300 group-hover:text-slate-500 transition"></i>
                        </a>` : ''}
                        <a href="#queries" class="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-50 transition group text-sm text-slate-700 border border-transparent hover:border-slate-200">
                            <div class="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center flex-shrink-0">
                                <i data-lucide="message-square" class="w-3.5 h-3.5 text-amber-600"></i>
                            </div>
                            <span class="font-medium text-xs flex-1">Data Queries</span>
                            ${stats.openQueries > 0 ? `<span class="text-xs font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">${stats.openQueries}</span>` : ''}
                            <i data-lucide="arrow-right" class="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition"></i>
                        </a>
                    </div>
                </div>

                <!-- Compliance Status -->
                <div class="ph-card">
                    <div class="ph-card-header">
                        <h3><i data-lucide="shield-check" class="w-4 h-4 text-slate-400"></i> Compliance Status</h3>
                    </div>
                    <div class="p-4 space-y-3">
                        ${compItem('Audit Trail', 'Active & Immutable', true)}
                        ${compItem('Data Locking', 'Enabled', true)}
                        ${compItem('21 CFR Part 11', 'Compliant', true)}
                        ${compItem('ICH GCP E6 (R2)', 'Compliant', true)}
                        ${compItem('Reason for Change', 'Enforced on Edit', true)}
                        ${compItem('MFA', 'Not configured', false)}
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    lucide.createIcons();
}

function kpiCard(label, value, sub, icon, textColor, bgColor) {
    return `
    <div class="ph-card p-5">
        <div class="flex items-start justify-between mb-3">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">${label}</p>
            <div class="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style="background:${bgColor}">
                <i data-lucide="${icon}" class="w-4 h-4" style="color:${textColor}"></i>
            </div>
        </div>
        <p class="kpi-number" style="color:${textColor}">${value}</p>
        <p class="text-xs text-slate-400 mt-1.5">${sub}</p>
    </div>`;
}

function compItem(label, note, ok) {
    return `
    <div class="flex items-center gap-2.5">
        <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? 'bg-emerald-100' : 'bg-amber-100'}">
            <i data-lucide="${ok ? 'check' : 'alert-triangle'}" class="w-3 h-3 ${ok ? 'text-emerald-600' : 'text-amber-600'}"></i>
        </div>
        <div class="flex-1 min-w-0">
            <span class="text-xs font-medium text-slate-700">${label}</span>
        </div>
        <span class="text-xs ${ok ? 'text-emerald-600' : 'text-amber-600'} font-medium whitespace-nowrap">${note}</span>
    </div>`;
}

function roleClass(role) {
    return { admin: 'bg-indigo-100 text-indigo-800', investigator: 'bg-blue-100 text-blue-800', cra: 'bg-amber-100 text-amber-800', crc: 'bg-emerald-100 text-emerald-800' }[role] || 'bg-slate-100 text-slate-700';
}
function roleLabel(role) {
    return { admin: 'Administrator', investigator: 'Investigator', cra: 'CRA / Monitor', crc: 'CRC' }[role] || role;
}
function esc(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
