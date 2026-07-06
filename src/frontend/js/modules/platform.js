// Platform Console — tenant (organization) operations for the platform_owner.
// Consumes /api/organizations/* (Phases 3–4). No study/site context.

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Auth guard: platform console is platform_owner only ──────────────────────
const user = api.getCurrentUser();
if (!user) {
    window.location.href = 'login.html';
} else if (user.role !== 'platform_owner') {
    // A normal user landed here — send them to their study picker.
    window.location.href = 'select.html';
}

const STATUS_CLS = {
    Active:    'bg-emerald-100 text-emerald-700',
    Suspended: 'bg-amber-100 text-amber-700',
    Closed:    'bg-red-100 text-red-700',
};
const SUB_CLS = {
    Active:   'text-emerald-600',
    Trialing: 'text-blue-600',
    PastDue:  'text-amber-600',
    Canceled: 'text-red-600',
};

function usageBar(current, limit) {
    if (limit == null) return `<span class="text-xs text-slate-500">${current} / ∞</span>`;
    const pct = Math.min(100, Math.round((current / limit) * 100));
    const color = pct >= 100 ? '#dc2626' : pct >= 80 ? '#d97706' : '#1554A0';
    return `
        <div class="flex items-center gap-2">
            <div style="width:70px;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:${color};"></div>
            </div>
            <span class="text-xs ${pct >= 100 ? 'text-red-600 font-semibold' : 'text-slate-500'}">${current} / ${limit}</span>
        </div>`;
}

async function render() {
    const main = document.getElementById('platform-main');
    let overview;
    try {
        overview = await api.getPlatformOverview();
    } catch (err) {
        main.innerHTML = `<div class="ph-card p-6 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div>`;
        return;
    }

    const { tenants, plans } = overview;
    try { window._billing = await api.getBillingConfig(); } catch { window._billing = { enabled: false, plans: {} }; }
    const totals = tenants.reduce((a, t) => {
        a.studies += t.usage.studies; a.users += t.usage.users; a.subjects += t.usage.subjects;
        if (t.status === 'Active') a.active++;
        return a;
    }, { studies: 0, users: 0, subjects: 0, active: 0 });

    window._platformPlans = Object.keys(plans);

    main.innerHTML = `
        <div class="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div>
                <h1 class="text-xl font-bold text-slate-900">Tenants</h1>
                <p class="text-xs text-slate-500 mt-0.5">${tenants.length} organization${tenants.length === 1 ? '' : 's'} · ${totals.active} active</p>
            </div>
            <button onclick="openProvisionModal()"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Provision Tenant
            </button>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            ${[['Tenants', tenants.length], ['Active', totals.active], ['Total Studies', totals.studies], ['Total Subjects', totals.subjects]]
                .map(([label, val]) => `
                <div class="ph-card p-4">
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">${label}</p>
                    <p class="text-2xl font-bold text-slate-800">${val}</p>
                </div>`).join('')}
        </div>

        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                    <thead class="ph-table-head">
                        <tr>
                            ${['Organization', 'Status', 'Plan', 'Studies', 'Users', 'Subjects', 'Subscription', '']
                                .map(h => `<th class="text-left px-3 py-2 text-xs font-semibold text-slate-600">${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody class="ph-table-body">
                        ${tenants.length === 0
                            ? `<tr><td colspan="8" class="text-center py-10 text-slate-400">No tenants yet. Provision the first one.</td></tr>`
                            : tenants.map(t => `
                            <tr class="border-t border-slate-100">
                                <td class="px-3 py-2.5">
                                    <p class="font-semibold text-slate-800">${esc(t.name)}</p>
                                    <p class="text-xs text-slate-400 font-mono">${esc(t.slug)}</p>
                                </td>
                                <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[t.status] || ''}">${esc(t.status)}</span></td>
                                <td class="px-3 py-2.5 capitalize text-slate-600">${esc(t.plan || '—')}</td>
                                <td class="px-3 py-2.5">${usageBar(t.usage.studies, t.limits.maxStudies)}</td>
                                <td class="px-3 py-2.5">${usageBar(t.usage.users, t.limits.maxUsers)}</td>
                                <td class="px-3 py-2.5">${usageBar(t.usage.subjects, t.limits.maxSubjects)}</td>
                                <td class="px-3 py-2.5 text-xs font-medium ${SUB_CLS[t.subscriptionStatus] || 'text-slate-500'}">${esc(t.subscriptionStatus || '—')}</td>
                                <td class="px-3 py-2.5 text-right">
                                    <button onclick='openManageModal(${JSON.stringify(t.id)})'
                                        class="text-xs font-medium text-blue-700 hover:text-blue-900">Manage</button>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;

    document.getElementById('op-name').textContent = user.name || 'Platform Operator';
    if (window.lucide) lucide.createIcons();
    // stash for the manage modal
    window._tenants = Object.fromEntries(tenants.map(t => [t.id, t]));
}

// ── Provision a new tenant ───────────────────────────────────────────────────
window.openProvisionModal = function () {
    showModal({
        title: 'Provision New Tenant',
        size: 'md',
        body: `
        <div class="space-y-3">
            <p class="text-xs text-slate-500">Creates the organization and its first administrator (an invite with a temporary password is emailed).</p>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Organization Name *</label>
                <input id="prov-name" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none" placeholder="Acme Clinical Research">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Slug <span class="text-slate-400 normal-case font-normal">(optional — derived from name)</span></label>
                <input id="prov-slug" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none font-mono" placeholder="acme">
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Admin Name *</label>
                    <input id="prov-admin-name" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none" placeholder="Jane Doe">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Admin Email *</label>
                    <input id="prov-admin-email" type="email" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none" placeholder="jane@acme.org">
                </div>
            </div>
            <div id="prov-error" class="text-xs text-red-600"></div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitProvision()" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition">Provision</button>`,
    });
};

window.submitProvision = async function () {
    const name       = document.getElementById('prov-name')?.value.trim();
    const slug       = document.getElementById('prov-slug')?.value.trim();
    const adminName  = document.getElementById('prov-admin-name')?.value.trim();
    const adminEmail = document.getElementById('prov-admin-email')?.value.trim();
    const errBox     = document.getElementById('prov-error');
    errBox.textContent = '';
    if (!name || !adminName || !adminEmail) { errBox.textContent = 'Name, admin name, and admin email are required.'; return; }
    try {
        const r = await api.provisionOrganization({ name, slug: slug || undefined, adminName, adminEmail });
        closeModal();
        showToast(`Tenant "${r.organization.name}" provisioned. Admin invite sent to ${r.admin.email}.`, 'success');
        await render();
    } catch (err) {
        errBox.textContent = err.message;
    }
};

// ── Manage a tenant (plan, status, export) ───────────────────────────────────
window.openManageModal = function (id) {
    const t = window._tenants[id];
    if (!t) return;
    const planOptions = (window._platformPlans || ['trial', 'standard', 'enterprise'])
        .map(p => `<option value="${p}" ${t.plan === p ? 'selected' : ''}>${p}</option>`).join('');
    const subOptions = ['Trialing', 'Active', 'PastDue', 'Canceled']
        .map(s => `<option value="${s}" ${t.subscriptionStatus === s ? 'selected' : ''}>${s}</option>`).join('');
    const statusOptions = ['Active', 'Suspended', 'Closed']
        .map(s => `<option value="${s}" ${t.status === s ? 'selected' : ''}>${s}</option>`).join('');

    showModal({
        title: `Manage — ${esc(t.name)}`,
        size: 'md',
        body: `
        <div class="space-y-3">
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Lifecycle</label>
                    <select id="mng-status" class="w-full px-2 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">${statusOptions}</select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Plan</label>
                    <select id="mng-plan" class="w-full px-2 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white capitalize">${planOptions}</select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Subscription</label>
                    <select id="mng-sub" class="w-full px-2 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">${subOptions}</select>
                </div>
            </div>
            <div class="flex items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-200">
                <div class="text-xs text-slate-500">
                    <p class="font-semibold text-slate-700 mb-0.5">Billing</p>
                    ${window._billing?.enabled
                        ? `Send a checkout link for the selected plan (Stripe).`
                        : `Billing not configured. Set STRIPE_SECRET_KEY + price ids to enable checkout.`}
                </div>
                ${window._billing?.enabled
                    ? `<button onclick="startCheckout(${JSON.stringify(id)})" class="text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white transition whitespace-nowrap">Start checkout</button>`
                    : `<span class="text-xs text-slate-400 whitespace-nowrap">Disabled</span>`}
            </div>
            <div class="flex items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-200">
                <div class="text-xs text-slate-500">
                    <p class="font-semibold text-slate-700 mb-0.5">Data portability</p>
                    Export this tenant's data (GDPR / UU PDP). Clinical data stays under trial retention.
                </div>
                <button onclick="exportTenant(${JSON.stringify(id)})" class="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 transition whitespace-nowrap">Export JSON</button>
            </div>
            <div id="mng-error" class="text-xs text-red-600"></div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitManage(${JSON.stringify(id)})" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition">Save</button>`,
    });
};

window.submitManage = async function (id) {
    const status = document.getElementById('mng-status')?.value;
    const plan   = document.getElementById('mng-plan')?.value;
    const subscriptionStatus = document.getElementById('mng-sub')?.value;
    const errBox = document.getElementById('mng-error');
    errBox.textContent = '';
    try {
        await api.updateOrganization(id, { status, plan, subscriptionStatus });
        closeModal();
        showToast('Tenant updated.', 'success');
        await render();
    } catch (err) {
        errBox.textContent = err.message;
    }
};

window.exportTenant = async function (id) {
    const t = window._tenants[id];
    try {
        await api.exportOrganization(id, t?.slug || id);
        showToast('Export downloaded.', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.startCheckout = async function (id) {
    // Use the plan currently selected in the manage modal.
    const plan = document.getElementById('mng-plan')?.value || window._tenants[id]?.plan;
    try {
        const { url } = await api.startCheckout(id, plan);
        window.open(url, '_blank');   // Stripe-hosted checkout
    } catch (err) {
        const errBox = document.getElementById('mng-error');
        if (errBox) errBox.textContent = err.message; else showToast(err.message, 'error');
    }
};

// ── Logout ───────────────────────────────────────────────────────────────────
document.getElementById('btn-logout')?.addEventListener('click', async () => {
    try { await fetch('/api/mfa/logout', { method: 'POST', credentials: 'include' }); } catch {}
    localStorage.removeItem('ecrf_session');
    window.location.href = 'login.html';
});

if (user && user.role === 'platform_owner') render();
