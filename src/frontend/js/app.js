// ============================================================
// E-CRF Main App — Router, Sidebar, Breadcrumb
// ============================================================

import { api } from './modules/api.js';
import { showToast, showModal, closeModal } from './modules/utils.js';
import { renderDashboard } from './modules/dashboard.js';
import { renderSubjects, renderSubjectDetail } from './modules/subjects.js';
import { renderDataEntry } from './modules/forms.js';
import { renderAuditTrail } from './modules/audit.js';
import { renderQueries } from './modules/queries.js';
import { renderAdverseEvents } from './modules/adverseevents.js';
import { renderDeviations } from './modules/deviations.js';
import { renderConsents } from './modules/consents.js';
import { renderRandomization } from './modules/randomization.js';
import { renderDblock } from './modules/dblock.js';
import { renderDelegation } from './modules/delegation.js';
import { renderSAEReports } from './modules/saereports.js';
import { renderMonitoring } from './modules/monitoring.js';
import { renderSites } from './modules/sites.js';
import { renderStudyMgmt } from './modules/studymgmt.js';
import { getSiteContext, ensureStudySelected, switchStudyAndSite } from './modules/study-select.js';
import { initSessionTimeout } from './modules/session.js';

export { showToast, showModal, closeModal };

// ---- Auth Guard ----
const user = api.getCurrentUser();
if (!user) {
    window.location.href = 'login.html';
    throw new Error('Not authenticated');
}

// ---- Navigation Config ----
const NAV_ITEMS = [
    { id: 'dashboard',      label: 'Dashboard',     icon: 'layout-dashboard', roles: ['admin', 'investigator', 'pi', 'cra', 'crc'] },
    { id: 'subjects',       label: 'Subjects',      icon: 'users',            roles: ['admin', 'investigator', 'pi', 'cra', 'crc'] },
    { id: 'ae',             label: 'Adverse Events',icon: 'activity',         roles: ['admin', 'investigator', 'pi', 'cra'] },
    { id: 'deviations',     label: 'Deviations',    icon: 'alert-triangle',   roles: ['admin', 'investigator', 'pi', 'cra'] },
    { id: 'consents',       label: 'Consent',       icon: 'file-check',       roles: ['admin', 'investigator', 'pi', 'cra'] },
    { id: 'randomization',  label: 'Randomization', icon: 'shuffle',          roles: ['admin', 'investigator', 'pi'] },
    { id: 'queries',        label: 'Queries',       icon: 'message-square',   roles: ['admin', 'cra', 'investigator', 'pi'] },
    { id: 'audit',          label: 'Audit Trail',   icon: 'shield-check',     roles: ['admin', 'cra', 'pi'] },
    { id: 'dblock',         label: 'DB Lock',       icon: 'lock',             roles: ['admin', 'cra', 'pi'] },
    { id: 'delegation',     label: 'Delegation',    icon: 'user-check',       roles: ['admin', 'cra', 'pi'] },
    { id: 'saereports',     label: 'SAE Reports',   icon: 'alert-octagon',    roles: ['admin', 'cra', 'pi'] },
    { id: 'monitoring',     label: 'Monitoring',    icon: 'clipboard-check',  roles: ['admin', 'cra', 'pi'] },
    { id: 'sites',          label: 'Sites',         icon: 'building-2',       roles: ['admin'] },
    { id: 'studymgmt',     label: 'Studies',       icon: 'flask-conical',    roles: ['admin'] },
];

const ROLE_CONFIG = {
    admin:        { label: 'Administrator',        cls: 'bg-indigo-600' },
    investigator: { label: 'Investigator',         cls: 'bg-blue-600' },
    pi:           { label: 'Principal Investigator', cls: 'bg-purple-600' },
    cra:          { label: 'CRA / Monitor',        cls: 'bg-amber-600' },
    crc:          { label: 'CRC',                  cls: 'bg-emerald-600' },
};

// ---- App state helpers ----
function getAppState() {
    return {
        hasStudy: !!api.getCurrentStudy(),
        hasSite:  !!getSiteContext(),
    };
}

// ---- Sidebar ----
function renderSidebar(currentRoute) {
    const nav      = document.getElementById('sidebar-nav');
    const userArea = document.getElementById('sidebar-user');
    if (!nav || !userArea) return;

    const { hasStudy, hasSite } = getAppState();
    let visible;
    if (!hasStudy) {
        // No study selected: only show Studies tab (admin) — others see nothing
        visible = NAV_ITEMS.filter(item => item.id === 'studymgmt' && item.roles.includes(user.role));
    } else if (!hasSite) {
        // Study selected but no site: show Studies + Sites (admin can create site)
        visible = NAV_ITEMS.filter(item => ['studymgmt', 'sites'].includes(item.id) && item.roles.includes(user.role));
    } else {
        visible = NAV_ITEMS.filter(item => item.roles.includes(user.role));
    }

    nav.innerHTML = visible.map(item => {
        const isActive = currentRoute === item.id;
        const badge = item.id === 'queries' ? getOpenQueryBadge() : '';
        return `
        <a href="#${item.id}"
            class="nav-link flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition mb-0.5 ${
                isActive
                    ? 'nav-active text-white'
                    : 'text-blue-200 hover:text-white'
            }">
            <i data-lucide="${item.icon}" class="w-4 h-4 flex-shrink-0 opacity-80"></i>
            <span class="flex-1 tracking-wide">${item.label}</span>
            ${badge}
        </a>`;
    }).join('');

    const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const rc = ROLE_CONFIG[user.role] || { label: user.role, cls: 'bg-slate-500' };
    const siteCtx = getSiteContext();
    const siteLine = siteCtx
        ? `<p class="text-blue-400 text-xs leading-none mt-0.5 truncate flex items-center gap-1">
               <i data-lucide="building-2" class="w-2.5 h-2.5 inline flex-shrink-0"></i>${siteCtx.siteCode ? `${siteCtx.siteCode} – ${siteCtx.siteName}` : siteCtx.siteName}
           </p>`
        : '';

    const study = api.getCurrentStudy();
    const studyLine = study
        ? `<div class="mt-2 mx-2 mb-0 px-2 py-1.5 rounded-md bg-white/10 flex items-center gap-1.5 min-w-0">
               <i data-lucide="flask-conical" class="w-3 h-3 text-blue-300 flex-shrink-0"></i>
               <span class="text-blue-100 text-xs truncate flex-1 leading-tight font-medium">${study.title}</span>
               ${['admin'].includes(user.role) ? `<button onclick="window.appSwitchStudy()" title="Switch Study" class="p-0.5 text-blue-300 hover:text-white transition flex-shrink-0">
                   <i data-lucide="repeat-2" class="w-3 h-3"></i>
               </button>` : ''}
           </div>`
        : '';

    userArea.innerHTML = `
    <div class="px-2 pt-2">
        <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-md ${rc.cls} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 uppercase">
                ${initials}
            </div>
            <div class="min-w-0 flex-1">
                <p class="text-white text-xs font-semibold truncate leading-tight">${user.name}</p>
                <p class="text-blue-300 text-xs leading-none mt-0.5">${rc.label}</p>
                ${siteLine}
            </div>
            <button onclick="window.appLogout()" title="Sign Out"
                class="p-1.5 text-blue-300 hover:text-white hover:bg-white/10 rounded-md transition flex-shrink-0">
                <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
            </button>
        </div>
        ${studyLine}
    </div>
    `;

    lucide.createIcons();
}

function getOpenQueryBadge() {
    const open = window._openQueryCount || 0;
    if (!open) return '';
    return `<span class="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">${open}</span>`;
}

// Refresh open query count in background and update sidebar badge
function refreshQueryCount() {
    if (!api.getCurrentStudy()) return; // skip if no study selected — will get 400
    api.getQueries({ status: 'Open' })
        .then(qs => {
            const count = Array.isArray(qs) ? qs.length : 0;
            if (count !== window._openQueryCount) {
                window._openQueryCount = count;
                const basePath = parseRoute(window.location.hash).key.split('/')[0] || 'dashboard';
                renderSidebar(basePath);
            }
        })
        .catch(() => {});
}

window._openQueryCount = 0;

// ---- Breadcrumb ----
function renderBreadcrumb(segments) {
    const el = document.getElementById('breadcrumb');
    if (!el) return;
    el.innerHTML = [
        `<span class="text-blue-600 font-semibold text-xs uppercase tracking-widest">E-CRF</span>`,
        ...segments.map((seg, i) => {
            const isLast = i === segments.length - 1;
            const chevron = `<i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-300 mx-0.5"></i>`;
            if (isLast) return chevron + `<span class="font-semibold text-slate-700 text-sm">${seg.label}</span>`;
            return chevron + `<a href="#${seg.route}" class="text-sm text-slate-500 hover:text-blue-600 transition">${seg.label}</a>`;
        })
    ].join('');
    lucide.createIcons();
}

// ---- Route Handlers ----
const routes = {
    'dashboard': async () => {
        renderBreadcrumb([{ label: 'Dashboard', route: 'dashboard' }]);
        await renderDashboard();
    },
    'subjects': async () => {
        renderBreadcrumb([{ label: 'Subjects', route: 'subjects' }]);
        await renderSubjects();
    },
    'subjects/new': async () => {
        renderBreadcrumb([
            { label: 'Subjects', route: 'subjects' },
            { label: 'Enroll New Subject', route: 'subjects/new' },
        ]);
        await renderSubjects({ showNewForm: true });
    },
    'subjects/:id': async (id) => {
        renderBreadcrumb([
            { label: 'Subjects', route: 'subjects' },
            { label: `Subject ${id}`, route: `subjects/${id}` },
        ]);
        await renderSubjectDetail(id);
    },
    'subjects/:id/visits/:vid/forms/:fid': async (id, vid, fid) => {
        renderBreadcrumb([
            { label: 'Subjects', route: 'subjects' },
            { label: `Subject ${id}`, route: `subjects/${id}` },
            { label: 'Data Entry', route: `subjects/${id}/visits/${vid}/forms/${fid}` },
        ]);
        await renderDataEntry({ subjectId: id, visitId: vid, formId: fid });
    },
    'audit': async () => {
        renderBreadcrumb([{ label: 'Audit Trail', route: 'audit' }]);
        await renderAuditTrail();
    },
    'queries': async () => {
        renderBreadcrumb([{ label: 'Data Queries', route: 'queries' }]);
        await renderQueries();
    },
    'ae': async () => {
        renderBreadcrumb([{ label: 'Adverse Events', route: 'ae' }]);
        await renderAdverseEvents();
    },
    'deviations': async () => {
        renderBreadcrumb([{ label: 'Protocol Deviations', route: 'deviations' }]);
        await renderDeviations();
    },
    'consents': async () => {
        renderBreadcrumb([{ label: 'Informed Consent', route: 'consents' }]);
        await renderConsents();
    },
    'randomization': async () => {
        renderBreadcrumb([{ label: 'Randomization', route: 'randomization' }]);
        await renderRandomization();
    },
    'dblock': async () => {
        renderBreadcrumb([{ label: 'Database Lock', route: 'dblock' }]);
        const el = document.getElementById('main-content');
        if (el) await renderDblock(el);
    },
    'delegation': async () => {
        renderBreadcrumb([{ label: 'Delegation &amp; Training', route: 'delegation' }]);
        const el = document.getElementById('main-content');
        if (el) await renderDelegation(el);
    },
    'saereports': async () => {
        renderBreadcrumb([{ label: 'SAE Reports', route: 'saereports' }]);
        const el = document.getElementById('main-content');
        if (el) await renderSAEReports(el);
    },
    'monitoring': async () => {
        renderBreadcrumb([{ label: 'Monitoring Visits', route: 'monitoring' }]);
        const el = document.getElementById('main-content');
        if (el) await renderMonitoring(el);
    },
    'sites': async () => {
        renderBreadcrumb([{ label: 'Site Management', route: 'sites' }]);
        const el = document.getElementById('main-content');
        if (el) await renderSites(el);
    },
    'studymgmt': async () => {
        renderBreadcrumb([{ label: 'Study Management', route: 'studymgmt' }]);
        const el = document.getElementById('main-content');
        if (el) await renderStudyMgmt(el);
    },
};

// ---- Router ----
function parseRoute(hash) {
    const path = (hash || '').replace(/^#\/?/, '');
    if (!path) return { key: 'dashboard', params: [] };

    let m;
    m = path.match(/^subjects\/(\d+)\/visits\/(\d+)\/forms\/(\d+)$/);
    if (m) return { key: 'subjects/:id/visits/:vid/forms/:fid', params: [m[1], m[2], m[3]] };

    m = path.match(/^subjects\/new$/);
    if (m) return { key: 'subjects/new', params: [] };

    m = path.match(/^subjects\/(\d+)$/);
    if (m) return { key: 'subjects/:id', params: [m[1]] };

    if (routes[path]) return { key: path, params: [] };
    // Alias /adverse-events → ae for external links
    if (path === 'adverse-events') return { key: 'ae', params: [] };
    return { key: 'dashboard', params: [] };
}

async function navigate(hash) {
    const { key, params } = parseRoute(hash);
    const basePath = key.split('/')[0] || 'dashboard';
    renderSidebar(basePath);

    const handler = routes[key];
    const contentEl = document.getElementById('main-content');
    if (!contentEl) return;

    if (!handler) {
        contentEl.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="text-center">
                <p class="text-7xl font-bold text-slate-200 mb-3 tracking-tight">404</p>
                <p class="text-slate-500 text-sm mb-4">Page not found</p>
                <a href="#dashboard" class="text-blue-600 hover:underline text-sm font-medium">Return to Dashboard</a>
            </div>
        </div>`;
        return;
    }

    try {
        await handler(...params);
    } catch (err) {
        console.error('Route error:', err);
        contentEl.innerHTML = `
        <div class="p-6">
            <div class="ph-card p-5 border-red-200">
                <p class="text-sm font-semibold text-red-800 mb-1">Error loading page</p>
                <p class="text-sm text-red-700">${err.message}</p>
            </div>
        </div>`;
    }
}

window.navigate        = (path) => { window.location.hash = path; };
window.appLogout       = () => { api.logout(); };
window.appSwitchStudy  = () => { switchStudyAndSite(); };

window.addEventListener('hashchange', () => navigate(window.location.hash));

// Flag: true after the initial navigate() has been called
let _appReady = false;

function navigateByState() {
    const { hasStudy, hasSite } = getAppState();
    if (!hasStudy) {
        // No study: admin goes to study management; others see placeholder
        if (user.role === 'admin') {
            navigate('#studymgmt');
        } else {
            const el = document.getElementById('main-content');
            if (el) el.innerHTML = `
                <div class="flex items-center justify-center h-full">
                    <div class="text-center p-8 max-w-xs">
                        <i data-lucide="flask-conical" class="w-12 h-12 text-slate-300 mx-auto mb-4"></i>
                        <p class="font-semibold text-slate-600 mb-1">No study configured</p>
                        <p class="text-sm text-slate-400">Contact your administrator to set up a clinical study.</p>
                    </div>
                </div>`;
            if (window.lucide) lucide.createIcons();
        }
    } else if (!hasSite) {
        // Study set but no site: admin creates sites; others go to dashboard (site auto-selected)
        if (user.role === 'admin') {
            navigate('#sites');
        } else {
            navigate(window.location.hash || '#dashboard');
            refreshQueryCount();
        }
    } else {
        navigate(window.location.hash || '#dashboard');
        refreshQueryCount();
    }
}

// study-changed: fired when study is created, switched, or cleared
window.addEventListener('study-changed', () => {
    const basePath = parseRoute(window.location.hash).key.split('/')[0] || 'dashboard';
    renderSidebar(basePath);
    if (_appReady) navigateByState();
});

// site-context-changed: fired when site context is set (first site created or picked)
window.addEventListener('site-context-changed', () => {
    const basePath = parseRoute(window.location.hash).key.split('/')[0] || 'dashboard';
    renderSidebar(basePath);
    if (_appReady) {
        navigate(window.location.hash || '#dashboard');
        refreshQueryCount();
    }
});

// Await study selection before navigating — prevents 400 X-Study-ID errors on first render
await ensureStudySelected();
_appReady = true;
const _initBasePath = parseRoute(window.location.hash).key.split('/')[0] || 'dashboard';
renderSidebar(_initBasePath);
navigateByState();

// 21 CFR Part 11 §11.10(d) — 30-minute inactivity session timeout
initSessionTimeout();
