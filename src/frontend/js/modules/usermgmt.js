// User Management UI — Admin: invite, roles, site/study assignment

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

let _users   = [];
let _sites   = [];
let _studies = [];

const ROLE_CONFIG = {
    admin:        { label: 'Administrator',          cls: 'bg-indigo-100 text-indigo-700' },
    investigator: { label: 'Investigator',           cls: 'bg-blue-100 text-blue-700' },
    pi:           { label: 'Principal Investigator', cls: 'bg-purple-100 text-purple-700' },
    cra:          { label: 'CRA / Monitor',          cls: 'bg-amber-100 text-amber-700' },
    crc:          { label: 'Study Coordinator',      cls: 'bg-emerald-100 text-emerald-700' },
};

// ── Main render ──────────────────────────────────────────────────────────────
export async function renderUserMgmt(container) {
    container.innerHTML = `
    <div class="p-4 md:p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">User Management</h2>
          <p class="text-xs text-slate-500 mt-0.5">Invite team members, assign roles, sites and studies</p>
        </div>
        <button onclick="window.umInvite()" class="ph-btn ph-btn-primary text-xs flex items-center gap-1.5">
          <i data-lucide="user-plus" class="w-3.5 h-3.5"></i> Invite User
        </button>
      </div>
      <div id="um-filter" class="flex items-center gap-2">
        <input id="um-search" class="ph-input text-xs w-52" placeholder="Search name or email..." oninput="window.umFilter()">
        <select id="um-role-filter" class="ph-input text-xs w-40" onchange="window.umFilter()">
          <option value="">All roles</option>
          ${Object.entries(ROLE_CONFIG).map(([v, r]) => `<option value="${v}">${r.label}</option>`).join('')}
        </select>
      </div>
      <div id="um-list"></div>
    </div>`;
    lucide.createIcons();
    await loadAll();
}

async function loadAll() {
    try {
        [_users, _sites, _studies] = await Promise.all([
            api.request('/api/users'),
            api.request('/api/sites'),
            api.request('/api/studies'),
        ]);
        renderList(_users);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderList(users) {
    const el = document.getElementById('um-list');
    if (!el) return;

    if (!users.length) {
        el.innerHTML = `
        <div class="text-center py-14 text-slate-400">
          <i data-lucide="users" class="w-10 h-10 mx-auto mb-3 opacity-40"></i>
          <p class="font-medium">No users found</p>
        </div>`;
        lucide.createIcons();
        return;
    }

    el.innerHTML = `
    <div class="space-y-2">
      ${users.map(u => {
        const rc = ROLE_CONFIG[u.role] ?? { label: u.role, cls: 'bg-slate-100 text-slate-600' };
        const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const studyList = (u.studies ?? []).map(s => s.protocolNo).join(', ');
        return `
        <div class="ph-card p-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-full ${rc.cls.replace('text-', 'text-white bg-').replace(' ', ' ').replace('bg-', 'bg-').split(' ').find(c => c.startsWith('bg-')) ?? 'bg-slate-400'} bg-opacity-80 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              ${initials}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="font-semibold text-slate-800 text-sm truncate">${u.name}</p>
                <span class="text-xs px-1.5 py-0.5 rounded-full font-medium ${rc.cls}">${rc.label}</span>
                ${u.isActive === false ? '<span class="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Deactivated</span>' : ''}
              </div>
              <p class="text-xs text-slate-400 truncate">${u.email}</p>
              <div class="flex items-center gap-3 mt-0.5">
                ${u.siteName ? `<span class="text-xs text-slate-500 flex items-center gap-1"><i data-lucide="building-2" class="w-3 h-3"></i>${u.siteName}</span>` : '<span class="text-xs text-slate-300">No site</span>'}
                ${studyList ? `<span class="text-xs text-slate-500 flex items-center gap-1"><i data-lucide="flask-conical" class="w-3 h-3"></i>${studyList}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button onclick="window.umEditUser('${u.id}')" class="ph-btn ph-btn-secondary text-xs">
              <i data-lucide="settings" class="w-3.5 h-3.5"></i> Manage
            </button>
            ${u.isActive !== false
                ? `<button onclick="window.umDeactivate('${u.id}','${u.name.replace(/'/g, "\\'")}')" class="ph-btn ph-btn-ghost text-xs text-red-500" title="Deactivate">
                    <i data-lucide="user-x" class="w-3.5 h-3.5"></i>
                   </button>`
                : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
    lucide.createIcons();
}

// ── Filter ───────────────────────────────────────────────────────────────────
window.umFilter = () => {
    const q    = (document.getElementById('um-search')?.value ?? '').toLowerCase();
    const role = document.getElementById('um-role-filter')?.value ?? '';
    const filtered = _users.filter(u =>
        (!q    || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
        (!role || u.role === role)
    );
    renderList(filtered);
};

// ── Invite Modal ──────────────────────────────────────────────────────────────
window.umInvite = () => {
    const siteOptions = _sites.map(s =>
        `<option value="${s.id}">${s.code} – ${s.name}</option>`
    ).join('');

    showModal({
        title: 'Invite New User',
        size:  'md',
        body: `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="ph-label">Full Name *</label>
            <input id="um-inv-name" class="ph-input" placeholder="Dr. Jane Smith">
          </div>
          <div>
            <label class="ph-label">Email *</label>
            <input id="um-inv-email" class="ph-input" type="email" placeholder="jane@hospital.org">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="ph-label">Role *</label>
            <select id="um-inv-role" class="ph-input">
              ${Object.entries(ROLE_CONFIG).map(([v, r]) => `<option value="${v}">${r.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="ph-label">Assign to Site</label>
            <select id="um-inv-site" class="ph-input">
              <option value="">— No site —</option>
              ${siteOptions}
            </select>
          </div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          <p class="font-semibold mb-1">What happens next:</p>
          <ul class="list-disc pl-4 space-y-0.5">
            <li>Account is created immediately</li>
            <li>Temporary password sent to the email above</li>
            <li>User must change password on first login</li>
          </ul>
        </div>
      </div>`,
        footer: `
          <button onclick="closeModal()" class="ph-btn ph-btn-ghost text-sm">Cancel</button>
          <button onclick="window.umDoInvite()" class="ph-btn ph-btn-primary text-sm flex items-center gap-1.5">
            <i data-lucide="send" class="w-3.5 h-3.5"></i> Send Invite
          </button>`,
    });
    lucide.createIcons();
};

window.umDoInvite = async () => {
    const name   = document.getElementById('um-inv-name')?.value?.trim();
    const email  = document.getElementById('um-inv-email')?.value?.trim();
    const role   = document.getElementById('um-inv-role')?.value;
    const siteId = document.getElementById('um-inv-site')?.value || null;

    if (!name || !email) return showToast('Name and email are required', 'error');

    try {
        await api.request('/api/users/invite', {
            method: 'POST',
            body: JSON.stringify({ name, email, role, siteId }),
        });
        showToast(`Invite sent to ${email}`, 'success');
        closeModal();
        _users = await api.request('/api/users');
        renderList(_users);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// ── Edit / Manage user modal ─────────────────────────────────────────────────
window.umEditUser = async (userId) => {
    const u = _users.find(u => u.id === userId);
    if (!u) return;

    const siteOptions = _sites.map(s =>
        `<option value="${s.id}" ${u.siteId === s.id ? 'selected' : ''}>${s.code} – ${s.name}</option>`
    ).join('');

    const assignedStudyIds = (u.studies ?? []).map(s => s.id);
    const studyOptions = _studies.map(s => `
    <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1.5 rounded">
      <input type="checkbox" class="rounded" value="${s.id}" ${assignedStudyIds.includes(s.id) ? 'checked' : ''}
        onchange="window.umToggleStudy('${userId}',${s.id},this.checked)">
      <span>${s.title} <span class="text-xs text-slate-400 font-mono">${s.protocolNo}</span></span>
    </label>`).join('');

    showModal({
        title: u.name,
        size:  'lg',
        body: `
      <div class="space-y-5">
        <p class="text-xs text-slate-400">${u.email}</p>
        <!-- Role -->
        <div class="border border-slate-100 rounded-lg p-4 space-y-3">
          <p class="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <i data-lucide="shield" class="w-4 h-4 text-indigo-500"></i> Role
          </p>
          <div class="grid grid-cols-2 gap-2">
            ${Object.entries(ROLE_CONFIG).map(([v, r]) => `
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="um-role-${userId}" value="${v}" ${u.role === v ? 'checked' : ''} class="accent-indigo-600">
              <span class="${r.cls} text-xs px-2 py-0.5 rounded-full font-medium">${r.label}</span>
            </label>`).join('')}
          </div>
          <div class="flex items-center gap-2">
            <input id="um-role-reason" class="ph-input text-xs flex-1" placeholder="Reason for role change (required)">
            <button onclick="window.umChangeRole('${userId}')" class="ph-btn ph-btn-secondary text-xs whitespace-nowrap">
              <i data-lucide="check" class="w-3.5 h-3.5"></i> Apply
            </button>
          </div>
        </div>
        <!-- Site -->
        <div class="border border-slate-100 rounded-lg p-4 space-y-3">
          <p class="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <i data-lucide="building-2" class="w-4 h-4 text-emerald-500"></i> Site Assignment
          </p>
          <div class="flex items-center gap-2">
            <select id="um-site-select" class="ph-input text-xs flex-1">
              <option value="">— No site —</option>
              ${siteOptions}
            </select>
            <input id="um-site-reason" class="ph-input text-xs flex-1" placeholder="Reason (required)">
            <button onclick="window.umChangeSite('${userId}')" class="ph-btn ph-btn-secondary text-xs whitespace-nowrap">
              <i data-lucide="check" class="w-3.5 h-3.5"></i> Apply
            </button>
          </div>
        </div>
        <!-- Study Assignments -->
        <div class="border border-slate-100 rounded-lg p-4 space-y-2">
          <p class="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <i data-lucide="flask-conical" class="w-4 h-4 text-blue-500"></i> Study Access
          </p>
          ${studyOptions || '<p class="text-xs text-slate-400">No studies available</p>'}
        </div>
      </div>`,
        footer: `<button onclick="closeModal()" class="ph-btn ph-btn-ghost text-sm">Done</button>`,
    });
    lucide.createIcons();
};

// ── Role change ──────────────────────────────────────────────────────────────
window.umChangeRole = async (userId) => {
    const role   = document.querySelector(`input[name="um-role-${userId}"]:checked`)?.value;
    const reason = document.getElementById('um-role-reason')?.value?.trim();
    if (!role)   return showToast('Select a role', 'error');
    if (!reason) return showToast('Reason is required', 'error');

    try {
        await api.request(`/api/users/${userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role, reason }),
        });
        showToast('Role updated', 'success');
        _users = await api.request('/api/users');
        closeModal();
        renderList(_users);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// ── Site change ──────────────────────────────────────────────────────────────
window.umChangeSite = async (userId) => {
    const siteId = document.getElementById('um-site-select')?.value || null;
    const reason = document.getElementById('um-site-reason')?.value?.trim();
    if (!reason) return showToast('Reason is required', 'error');

    try {
        await api.request(`/api/users/${userId}/site`, {
            method: 'PATCH',
            body: JSON.stringify({ siteId, reason }),
        });
        showToast('Site assignment updated', 'success');
        _users = await api.request('/api/users');
        closeModal();
        renderList(_users);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// ── Study toggle ──────────────────────────────────────────────────────────────
window.umToggleStudy = async (userId, studyId, add) => {
    try {
        if (add) {
            await api.request(`/api/users/${userId}/studies`, {
                method: 'POST',
                body: JSON.stringify({ studyId }),
            });
            showToast('User assigned to study', 'success');
        } else {
            await api.request(`/api/users/${userId}/studies/${studyId}`, { method: 'DELETE' });
            showToast('User removed from study', 'success');
        }
        _users = await api.request('/api/users');
        renderList(_users);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// ── Deactivate ────────────────────────────────────────────────────────────────
window.umDeactivate = async (userId, userName) => {
    if (!confirm(`Deactivate "${userName}"? They will be immediately logged out and cannot log in.`)) return;
    const reason = prompt('Reason for deactivation (required):');
    if (!reason) return;
    try {
        await api.request(`/api/users/${userId}/deactivate`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
        });
        showToast(`${userName} deactivated`, 'success');
        _users = await api.request('/api/users');
        renderList(_users);
    } catch (err) {
        showToast(err.message, 'error');
    }
};
