// ============================================================
// E-CRF Main App — Router, Sidebar, Breadcrumb
// ============================================================

import { api } from './modules/api.js';
import { showToast, showModal, closeModal } from './modules/utils.js';
import { getSiteContext, switchStudyAndSite } from './modules/study-select.js';
import { initSessionTimeout } from './modules/session.js';
import { checkAndShowAgreements } from './modules/agreements.js';

export { showToast, showModal, closeModal };

// ---- Auth Guard ----
const user = api.getCurrentUser();
if (!user) {
    window.location.href = 'login.html';
    throw new Error('Not authenticated');
}
// The platform operator has no study/site context — it belongs in the platform
// console, not the clinical SPA.
if (user.role === 'platform_owner') {
    window.location.href = 'platform.html';
    throw new Error('Platform operator redirected to console');
}

// ---- Navigation Config ----
const DM = 'data_manager';

const NAV_ITEMS = [
    { id: 'dashboard',      label: 'Dashboard',       icon: 'layout-dashboard', roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'subjects',       label: 'Subjects',        icon: 'users',            roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    // ── Phase 1: Core Clinical Modules ────────────────────────────────────────
    { id: 'medhistory',     label: 'Medical History', icon: 'file-heart',       roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'conmeds',        label: 'Con. Medications',icon: 'pill',             roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'vitalsigns',     label: 'Vital Signs',     icon: 'heart-pulse',      roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'lab',            label: 'Laboratory',      icon: 'test-tube-2',      roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    // ── Safety & Compliance ───────────────────────────────────────────────────
    { id: 'ae',             label: 'Adverse Events',  icon: 'activity',         roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'deviations',     label: 'Deviations',      icon: 'alert-triangle',   roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'consents',       label: 'Consent',         icon: 'file-check',       roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'randomization',  label: 'Randomization',   icon: 'shuffle',          roles: ['admin', 'investigator', 'pi'] },
    { id: 'queries',        label: 'Queries',         icon: 'message-square',   roles: ['admin', 'cra', 'investigator', 'pi', 'crc', DM] },
    // ── Phase 2: Regulatory ───────────────────────────────────────────────────
    { id: 'amendments',     label: 'Amendments',      icon: 'file-pen',         roles: ['admin', 'pi', 'cra', DM] },
    { id: 'bdreview',       label: 'Blind Review',    icon: 'eye-off',          roles: ['admin', 'cra', 'pi', DM] },
    // ── Operations ────────────────────────────────────────────────────────────
    { id: 'audit',          label: 'Audit Trail',     icon: 'shield-check',     roles: ['admin', 'cra', 'pi', DM] },
    { id: 'dblock',         label: 'DB Lock',         icon: 'lock',             roles: ['admin', 'cra', 'pi', DM] },
    { id: 'delegation',     label: 'Delegation',      icon: 'user-check',       roles: ['admin', 'cra', 'pi', DM] },
    { id: 'saereports',     label: 'SAE Reports',     icon: 'alert-octagon',    roles: ['admin', 'cra', 'pi', DM] },
    { id: 'monitoring',     label: 'Monitoring',      icon: 'clipboard-check',  roles: ['admin', 'cra', 'pi', DM] },
    { id: 'datastatus',     label: 'Data Status',     icon: 'table-2',          roles: ['admin', 'cra', 'pi', DM] },
    // ── Phase 3: Quality Management ───────────────────────────────────────────
    { id: 'csm',            label: 'CSM / KRI',         icon: 'bar-chart-3',      roles: ['admin', 'cra', 'pi', DM] },
    { id: 'qtl',            label: 'QTL Thresholds',    icon: 'sliders-horizontal',roles: ['admin', 'cra', 'pi', DM] },
    // ── ICH E6(R3) Gap Closure ───────────────────────────────────────────────────
    { id: 'screening',      label: 'Screening Log',   icon: 'clipboard-list',   roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'ipdispensing',   label: 'IP Accountability',icon: 'package',         roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'essentialdocs',  label: 'TMF / Ess. Docs', icon: 'folder-check',     roles: ['admin', 'cra', 'pi', DM] },
    { id: 'monitoringplan', label: 'Monitoring Plan', icon: 'map',              roles: ['admin', 'cra', 'pi', DM] },
    { id: 'missingdata',       label: 'Data Quality',    icon: 'bar-chart-2',    roles: ['admin', 'cra', 'pi', DM] },
    { id: 'reconsenttracking', label: 'Re-consent',      icon: 'file-check-2',   roles: ['admin', 'pi', 'cra', DM] },
    { id: 'accessreview',      label: 'Access Review',   icon: 'shield-check',   roles: ['admin'] },
    // ── Admin ─────────────────────────────────────────────────────────────────
    { id: 'sites',          label: 'Sites',           icon: 'building-2',       roles: ['admin'] },
    { id: 'studymgmt',      label: 'Studies',         icon: 'flask-conical',    roles: ['admin'] },
    { id: 'formbuilder',    label: 'Form Builder',    icon: 'clipboard-edit',   roles: ['admin'] },
    { id: 'visittemplates', label: 'Visit Templates', icon: 'calendar-check',   roles: ['admin', 'pi'] },
    { id: 'usermgmt',       label: 'Users',           icon: 'users-round',      roles: ['admin'] },
    { id: 'sysval',         label: 'System Validation',icon: 'shield-plus',     roles: ['admin'] },
];

const ROLE_CONFIG = {
    admin:        { label: 'Administrator',          cls: 'bg-indigo-600' },
    investigator: { label: 'Investigator',           cls: 'bg-blue-600' },
    pi:           { label: 'Principal Investigator', cls: 'bg-purple-600' },
    cra:          { label: 'CRA / Monitor',          cls: 'bg-amber-600' },
    crc:          { label: 'Study Coordinator',      cls: 'bg-emerald-600' },
    data_manager: { label: 'Data Manager',           cls: 'bg-teal-600' },
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
    const nav        = document.getElementById('sidebar-nav');
    const headerUser = document.getElementById('header-user');
    if (!nav) return;

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

    const siteChipEl = document.getElementById('sidebar-site-context');
    if (siteChipEl) siteChipEl.innerHTML = '';
    const userArea = document.getElementById('sidebar-user');
    if (userArea) userArea.innerHTML = '';

    nav.innerHTML = visible.map(item => {
        const isActive = currentRoute === item.id;
        const badge = item.id === 'queries' ? getOpenQueryBadge() : '';
        return `
        <a href="#${item.id}"
            class="nav-link flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition mb-0.5 ${
                isActive
                    ? 'nav-active text-white'
                    : 'text-blue-200 hover:text-white'
            }">
            <i data-lucide="${item.icon}" class="w-3.5 h-3.5 flex-shrink-0 opacity-75"></i>
            <span class="flex-1 tracking-wide">${item.label}</span>
            ${badge}
        </a>`;
    }).join('');

    const displayName = user.displayName || user.name;
    const firstName   = displayName.split(' ')[0];
    const initials    = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const rc      = ROLE_CONFIG[user.role] || { label: user.role, cls: 'bg-slate-500' };
    const siteCtx = getSiteContext();
    const study   = api.getCurrentStudy();

    if (headerUser) {
        const hasStudy = study && study.status === 'Active';
        const hasSite  = siteCtx && siteCtx.status !== 'Inactive';
        const siteFull = hasSite
            ? (siteCtx.siteCode && siteCtx.siteName ? `${siteCtx.siteCode} – ${siteCtx.siteName}` : siteCtx.siteName ?? siteCtx.siteCode)
            : '';
        const contextPart = (hasStudy || hasSite) ? `
            <div class="flex items-center gap-1.5 text-xs text-slate-500 leading-none">
                ${hasStudy ? `<i data-lucide="flask-conical" class="w-3 h-3 text-emerald-500 flex-shrink-0"></i><span class="font-medium text-slate-700">${study.title}</span>` : ''}
                ${hasStudy && hasSite ? `<span class="text-slate-300">·</span>` : ''}
                ${hasSite ? `<i data-lucide="building-2" class="w-3 h-3 text-blue-400 flex-shrink-0"></i><span>${siteFull}</span>` : ''}
                ${hasStudy && ['admin'].includes(user.role) ? `
                <button onclick="window.appSwitchStudy()" title="Switch Study"
                    class="ml-0.5 p-0.5 text-slate-400 hover:text-blue-600 rounded transition">
                    <i data-lucide="repeat-2" class="w-3 h-3"></i>
                </button>` : ''}
            </div>` : '';

        headerUser.innerHTML = `
        <div class="flex items-center gap-2.5">
            ${contextPart ? `<div class="text-right hidden md:flex flex-col gap-0.5 items-end">
                ${contextPart}
                <p class="text-[10px] text-slate-400 leading-none">${rc.label}</p>
            </div>` : `<p class="text-xs text-slate-500 hidden md:block">${rc.label}</p>`}
            <div class="w-7 h-7 rounded-md ${rc.cls} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 uppercase">${initials}</div>
            <div class="hidden lg:block">
                <p class="text-xs font-semibold text-slate-700 leading-tight">${firstName}</p>
            </div>
            <button onclick="window.appSecuritySettings()" title="Security Settings"
                class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition flex-shrink-0">
                <i data-lucide="shield" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="window.appLogout()" title="Sign Out"
                class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition flex-shrink-0">
                <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
            </button>
        </div>`;
    }

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

// ---- Study Status Banner ----
const _BANNER_CFG = {
    Terminated: { bg: 'bg-red-600',   icon: 'ban',          msg: 'Study TERMINATED — data entry and modifications are locked.' },
    Completed:  { bg: 'bg-slate-600', icon: 'lock',         msg: 'Study COMPLETED — data entry and modifications are locked.' },
    Suspended:  { bg: 'bg-amber-500', icon: 'pause-circle', msg: 'Study SUSPENDED — data entry and modifications are locked pending review.' },
};

function updateStudyStatusBanner() {
    const el  = document.getElementById('study-status-banner');
    if (!el) return;
    const study = api.getCurrentStudy();
    const cfg   = study ? _BANNER_CFG[study.status] : null;
    if (!cfg) {
        el.className = 'hidden flex-shrink-0';
        el.innerHTML = '';
        return;
    }
    el.className = `${cfg.bg} text-white flex-shrink-0 flex items-center gap-2.5 px-5 py-2 text-xs font-semibold`;
    el.innerHTML = `<i data-lucide="${cfg.icon}" class="w-3.5 h-3.5 flex-shrink-0"></i><span>${cfg.msg}</span>`;
    lucide.createIcons();
}

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
        const { renderDashboard } = await import('./modules/dashboard.js');
        await renderDashboard();
    },
    'subjects': async () => {
        renderBreadcrumb([{ label: 'Subjects', route: 'subjects' }]);
        const { renderSubjects } = await import('./modules/subjects.js');
        await renderSubjects();
    },
    'subjects/new': async () => {
        renderBreadcrumb([
            { label: 'Subjects', route: 'subjects' },
            { label: 'Enroll New Subject', route: 'subjects/new' },
        ]);
        const { renderSubjects } = await import('./modules/subjects.js');
        await renderSubjects({ showNewForm: true });
    },
    'subjects/:id': async (id) => {
        renderBreadcrumb([
            { label: 'Subjects', route: 'subjects' },
            { label: `Subject ${id}`, route: `subjects/${id}` },
        ]);
        const { renderSubjectDetail } = await import('./modules/subjects.js');
        await renderSubjectDetail(id);
    },
    'subjects/:id/visits/:vid/forms/:fid': async (id, vid, fid) => {
        renderBreadcrumb([
            { label: 'Subjects', route: 'subjects' },
            { label: `Subject ${id}`, route: `subjects/${id}` },
            { label: 'Data Entry', route: `subjects/${id}/visits/${vid}/forms/${fid}` },
        ]);
        const { renderDataEntry } = await import('./modules/forms.js');
        await renderDataEntry({ subjectId: id, visitId: vid, formId: fid });
    },
    // ── Phase 1: Core Clinical Modules ────────────────────────────────────────
    'medhistory': async () => {
        renderBreadcrumb([{ label: 'Medical History', route: 'medhistory' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderMedHistory } = await import('./modules/medhistory.js'); await renderMedHistory(el); }
    },
    'conmeds': async () => {
        renderBreadcrumb([{ label: 'Concomitant Medications', route: 'conmeds' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderConMeds } = await import('./modules/conmeds.js'); await renderConMeds(el); }
    },
    'vitalsigns': async () => {
        renderBreadcrumb([{ label: 'Vital Signs', route: 'vitalsigns' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderVitalSigns } = await import('./modules/vitalsigns.js'); await renderVitalSigns(el); }
    },
    'lab': async () => {
        renderBreadcrumb([{ label: 'Laboratory Results', route: 'lab' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderLab } = await import('./modules/lab.js'); await renderLab(el); }
    },
    // ── Phase 2: Regulatory ────────────────────────────────────────────────────
    'amendments': async () => {
        renderBreadcrumb([{ label: 'Protocol Amendments', route: 'amendments' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderAmendments } = await import('./modules/amendments.js'); await renderAmendments(el); }
    },
    'bdreview': async () => {
        renderBreadcrumb([{ label: 'Blind Data Review', route: 'bdreview' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderBDReview } = await import('./modules/bdreview.js'); await renderBDReview(el); }
    },
    // ── Phase 3: Quality Management ───────────────────────────────────────────
    'csm': async () => {
        renderBreadcrumb([{ label: 'Central Statistical Monitoring', route: 'csm' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderCSM } = await import('./modules/csm.js'); await renderCSM(el); }
    },
    'qtl': async () => {
        renderBreadcrumb([{ label: 'QTL Thresholds', route: 'qtl' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderQTL } = await import('./modules/qtl.js'); await renderQTL(el); }
    },
    'sysval': async () => {
        if (user.role !== 'admin') { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'System Validation', route: 'sysval' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderSysVal } = await import('./modules/sysval.js'); await renderSysVal(el); }
    },
    // ── ICH E6(R3) Gap Closure ──────────────────────────────────────────────────
    'screening': async () => {
        renderBreadcrumb([{ label: 'Screening Log', route: 'screening' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderScreeningLog } = await import('./modules/screening.js'); await renderScreeningLog(el); }
    },
    'ipdispensing': async () => {
        renderBreadcrumb([{ label: 'IP Accountability', route: 'ipdispensing' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderIPDispensing } = await import('./modules/ipdispensing.js'); await renderIPDispensing(el); }
    },
    'essentialdocs': async () => {
        renderBreadcrumb([{ label: 'Essential Documents', route: 'essentialdocs' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderEssentialDocs } = await import('./modules/essentialdocs.js'); await renderEssentialDocs(el); }
    },
    'monitoringplan': async () => {
        renderBreadcrumb([{ label: 'Monitoring Plan (RBMP)', route: 'monitoringplan' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderMonitoringPlan } = await import('./modules/monitoringplan.js'); await renderMonitoringPlan(el); }
    },
    'missingdata': async () => {
        renderBreadcrumb([{ label: 'Data Quality Report', route: 'missingdata' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderMissingDataReport } = await import('./modules/missingdata.js'); await renderMissingDataReport(el); }
    },
    'reconsenttracking': async () => {
        renderBreadcrumb([{ label: 'Amendment Re-consent Tracking', route: 'reconsenttracking' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderReconsentTracking } = await import('./modules/reconsenttracking.js'); await renderReconsentTracking(el); }
    },
    'accessreview': async () => {
        if (user.role !== 'admin') { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'Periodic User Access Review', route: 'accessreview' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderAccessReview } = await import('./modules/accessreview.js'); await renderAccessReview(el); }
    },
    'audit': async () => {
        renderBreadcrumb([{ label: 'Audit Trail', route: 'audit' }]);
        const { renderAuditTrail } = await import('./modules/audit.js');
        await renderAuditTrail();
    },
    'queries': async () => {
        renderBreadcrumb([{ label: 'Data Queries', route: 'queries' }]);
        const { renderQueries } = await import('./modules/queries.js');
        await renderQueries();
    },
    'ae': async () => {
        renderBreadcrumb([{ label: 'Adverse Events', route: 'ae' }]);
        const { renderAdverseEvents } = await import('./modules/adverseevents.js');
        await renderAdverseEvents();
    },
    'deviations': async () => {
        renderBreadcrumb([{ label: 'Protocol Deviations', route: 'deviations' }]);
        const { renderDeviations } = await import('./modules/deviations.js');
        await renderDeviations();
    },
    'consents': async () => {
        renderBreadcrumb([{ label: 'Informed Consent', route: 'consents' }]);
        const { renderConsents } = await import('./modules/consents.js');
        await renderConsents();
    },
    'randomization': async () => {
        renderBreadcrumb([{ label: 'Randomization', route: 'randomization' }]);
        const { renderRandomization } = await import('./modules/randomization.js');
        await renderRandomization();
    },
    'dblock': async () => {
        renderBreadcrumb([{ label: 'Database Lock', route: 'dblock' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderDblock } = await import('./modules/dblock.js'); await renderDblock(el); }
    },
    'delegation': async () => {
        renderBreadcrumb([{ label: 'Delegation &amp; Training', route: 'delegation' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderDelegation } = await import('./modules/delegation.js'); await renderDelegation(el); }
    },
    'saereports': async () => {
        renderBreadcrumb([{ label: 'SAE Reports', route: 'saereports' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderSAEReports } = await import('./modules/saereports.js'); await renderSAEReports(el); }
    },
    'monitoring': async () => {
        renderBreadcrumb([{ label: 'Monitoring Visits', route: 'monitoring' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderMonitoring } = await import('./modules/monitoring.js'); await renderMonitoring(el); }
    },
    'datastatus': async () => {
        renderBreadcrumb([{ label: 'Subject Data Status', route: 'datastatus' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderDataStatus } = await import('./modules/datastatus.js'); renderDataStatus(el); }
    },
    'sites': async () => {
        if (user.role !== 'admin') { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'Site Management', route: 'sites' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderSites } = await import('./modules/sites.js'); await renderSites(el); }
    },
    'studymgmt': async () => {
        if (user.role !== 'admin') { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'Study Management', route: 'studymgmt' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderStudyMgmt } = await import('./modules/studymgmt.js'); await renderStudyMgmt(el); }
    },
    'formbuilder': async () => {
        if (user.role !== 'admin') { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'Form Builder', route: 'formbuilder' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderFormBuilder } = await import('./modules/formbuilder.js'); await renderFormBuilder(el); }
    },
    'visittemplates': async () => {
        if (!['admin', 'pi'].includes(user.role)) { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'Visit Templates', route: 'visittemplates' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderVisitTemplates } = await import('./modules/visittemplates.js'); await renderVisitTemplates(el); }
    },
    'usermgmt': async () => {
        if (user.role !== 'admin') { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'Users', route: 'usermgmt' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderUserMgmt } = await import('./modules/usermgmt.js'); await renderUserMgmt(el); }
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
    updateStudyStatusBanner();

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
window.appSecuritySettings = async () => {
    const { renderSecuritySettings } = await import('./modules/security-settings.js');
    renderSecuritySettings();
};

// ── Notification Bell ─────────────────────────────────────────────────────────
let _notifOpen = false;

window.toggleNotifPanel = () => {
    _notifOpen = !_notifOpen;
    const panel = document.getElementById('notif-panel');
    if (panel) {
        panel.classList.toggle('hidden', !_notifOpen);
        if (_notifOpen) window.refreshNotifications();
    }
};

document.addEventListener('click', (e) => {
    if (_notifOpen && !document.getElementById('notif-bell-wrap')?.contains(e.target)) {
        _notifOpen = false;
        document.getElementById('notif-panel')?.classList.add('hidden');
    }
});

window.refreshNotifications = async () => {
    if (!api.getCurrentStudy()) return;
    try {
        const data   = await api.getNotifications();
        const alerts = data.alerts ?? [];
        const badge  = document.getElementById('notif-badge');
        const list   = document.getElementById('notif-list');

        // Update badge
        if (badge) {
            if (alerts.length > 0) {
                badge.textContent = alerts.length > 9 ? '9+' : String(alerts.length);
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        // Update panel list
        if (list) {
            if (!alerts.length) {
                list.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">No alerts — all clear ✓</p>`;
            } else {
                const COLOR_MAP = { danger: 'text-red-700 bg-red-50 border-red-100', warning: 'text-amber-700 bg-amber-50 border-amber-100', info: 'text-blue-700 bg-blue-50 border-blue-100' };
                const ICON_MAP  = { danger: 'alert-octagon', warning: 'alert-triangle', info: 'info' };
                list.innerHTML = alerts.map(a => `
                <a href="${a.link ?? '#dashboard'}" onclick="window.toggleNotifPanel()"
                   class="block px-4 py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0">
                  <div class="flex items-start gap-2.5">
                    <i data-lucide="${ICON_MAP[a.type] ?? 'bell'}" class="w-4 h-4 mt-0.5 flex-shrink-0 ${a.type === 'danger' ? 'text-red-500' : a.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}"></i>
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-slate-800 leading-tight">${a.title}</p>
                      <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">${a.body}</p>
                    </div>
                  </div>
                </a>`).join('');
                lucide.createIcons();
            }
        }
    } catch {}
};

// Poll notifications every 5 minutes if study is selected
setInterval(() => { if (api.getCurrentStudy()) window.refreshNotifications(); }, 5 * 60 * 1000);

window.addEventListener('hashchange', () => navigate(window.location.hash));

// Flag: true after the initial navigate() has been called
let _appReady = false;

function navigateByState() {
    const { hasStudy, hasSite } = getAppState();
    if (!hasStudy || !hasSite || !user.displayName) {
        window.location.replace('select.html');
        return;
    }
    navigate(window.location.hash || '#dashboard');
    refreshQueryCount();
}

// study-changed: fired when study is created, switched, or cleared
window.addEventListener('study-changed', () => {
    const basePath = parseRoute(window.location.hash).key.split('/')[0] || 'dashboard';
    renderSidebar(basePath);
    updateStudyStatusBanner();
    if (_appReady) {
        navigateByState();
        window.refreshNotifications();
    }
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

// If no study+site context, or display name not yet set → redirect to selection/name page
const _initState = getAppState();
if (!_initState.hasStudy || !_initState.hasSite || !user.displayName) {
    window.location.replace('select.html');
    throw new Error('Redirecting to study/site selection');
}

_appReady = true;
const _initBasePath = parseRoute(window.location.hash).key.split('/')[0] || 'dashboard';
renderSidebar(_initBasePath);

// ICH E6(R3) C.4.1 — check SOP agreements before allowing access
checkAndShowAgreements().then(() => {
    navigateByState();
});

// 21 CFR Part 11 §11.10(d) — 30-minute inactivity session timeout
initSessionTimeout();

// Initial notification load (after study is known)
setTimeout(() => window.refreshNotifications(), 1500);

// ── Shared Inline Query Modal — available globally from all modules ──────────
window.openRowInlineQuery = function (subjectId, visitId, fieldKey, fieldLabel) {
    window._inlineQueryCtx = { subjectId, visitId: visitId || null, entryId: null, formId: null };
    window.openInlineQueryModal(fieldKey, fieldLabel);
};

window.openInlineQueryModal = function (fieldKey, fieldLabel) {
    showModal({
        title: 'Raise Query',
        size:  'sm',
        body: `
        <div class="space-y-3">
            <div class="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                <i data-lucide="tag" class="w-4 h-4 text-slate-400 flex-shrink-0"></i>
                <span class="text-sm font-semibold text-slate-700">${fieldLabel}</span>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Query / Discrepancy <span class="text-red-500">*</span></label>
                <textarea id="inline-query-text" rows="4"
                    placeholder="Describe the discrepancy or question about this field value..."
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
                <p id="inline-query-err" class="text-xs text-red-500 mt-1 hidden"></p>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="confirmInlineQuery('${fieldKey.replace(/'/g, '&#39;')}', '${fieldLabel.replace(/'/g, '&#39;')}')"
            class="px-4 py-2 text-sm font-semibold text-white rounded-md transition flex items-center gap-2" style="background:#1554A0">
            <i data-lucide="message-circle" class="w-4 h-4"></i> Raise Query
        </button>`,
    });
};

window.confirmInlineQuery = async function (fieldKey, fieldLabel) {
    const queryText = document.getElementById('inline-query-text')?.value?.trim();
    const errEl     = document.getElementById('inline-query-err');
    if (!queryText) {
        errEl.textContent = 'Please describe the query.';
        errEl.classList.remove('hidden');
        return;
    }
    const ctx = window._inlineQueryCtx || {};
    try {
        await api.raiseQuery({
            data_entry_id: ctx.entryId  || null,
            subject_id:    ctx.subjectId,
            visit_id:      ctx.visitId  || null,
            form_id:       ctx.formId   || null,
            field_key:     fieldKey,
            field_label:   fieldLabel,
            query_text:    queryText,
        });
        closeModal();
        showToast('Query raised and recorded in audit trail.', 'success');
        // If context has formId, re-render CRF form to refresh query indicators
        if (ctx.subjectId && ctx.visitId && ctx.formId) {
            const { renderDataEntry } = await import('./modules/forms.js');
            await renderDataEntry({ subjectId: ctx.subjectId, visitId: ctx.visitId, formId: ctx.formId });
        }
    } catch (err) {
        if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
    }
};
