// Study + Site Onboarding — shown when no context is selected after login
// Flow: select study → select site → navigate to dashboard

import { api } from './api.js';

// ── Context helpers ─────────────────────────────────────────────────────────

export function getSiteContext() {
    const id  = localStorage.getItem('ecrf_site_context_id');
    const raw = localStorage.getItem('ecrf_site_context_meta');
    return id ? { id: parseInt(id), ...(raw ? JSON.parse(raw) : {}) } : null;
}

export function setSiteContext(site) {
    if (!site) {
        localStorage.removeItem('ecrf_site_context_id');
        localStorage.removeItem('ecrf_site_context_meta');
    } else {
        localStorage.setItem('ecrf_site_context_id', String(site.id));
        localStorage.setItem('ecrf_site_context_meta', JSON.stringify({
            siteCode: site.site_code ?? site.code ?? '',
            siteName: site.site_name ?? site.name ?? '',
            status:   site.status ?? 'Active',
        }));
    }
}

// ── Main entry point ────────────────────────────────────────────────────────

export async function ensureStudySelected() {
    let currentStudy = api.getCurrentStudy();
    const currentSite  = getSiteContext();
    const user = api.getCurrentUser();

    // Both already selected — always refresh site status from API in background
    // so changes made in Site Management are reflected without a full re-login
    if (currentStudy && currentSite) {
        api.getSites()
            .then(sites => {
                const fresh = Array.isArray(sites) ? sites.find(s => s.id === currentSite.id) : null;
                if (fresh && fresh.status !== currentSite.status) {
                    setSiteContext(fresh);
                    window.dispatchEvent(new Event('site-context-changed'));
                }
            })
            .catch(() => {});
        return;
    }

    let studies = [];
    try { studies = await api.getStudies(); } catch { /* table not yet migrated */ }

    if (studies.length === 0) {
        // Non-admin: not assigned to any study — show blocking message
        if (user?.role !== 'admin') {
            await showNoStudyMessage();
        }
        // Admin: no studies in system yet — app.js startup sequence handles redirect
        return;
    }

    // Validate stored study still exists (e.g. was deleted)
    if (currentStudy && !studies.find(s => s.id === currentStudy.id)) {
        api.setCurrentStudy(null);
        currentStudy = null;
    }

    // Determine which study to use
    let study = currentStudy;
    if (!study) {
        if (studies.length === 1) {
            study = studies[0];
            api.setCurrentStudy(study);
        } else {
            study = await pickStudy(studies);
            api.setCurrentStudy(study);
        }
    }

    // Now pick site
    if (!currentSite) {
        let sites = [];
        try { sites = await api.getSites(); } catch {}
        sites = sites.filter(s => s.status === 'Active' || s.status === 'active');

        if (sites.length === 0) {
            // Non-admin: not assigned to any (active) site — show blocking message
            if (user?.role !== 'admin') {
                await showNoSiteMessage();
            }
            // Admin: no sites yet — continue (admin can create sites)
            return;
        }

        // If only one site, auto-select
        if (sites.length === 1) {
            setSiteContext(sites[0]);
            return;
        }

        // Multiple sites — show picker
        await pickSite(study, sites);
    }
}

// ── No-assignment blocking overlays ─────────────────────────────────────────

function showNoStudyMessage() {
    return new Promise(() => {
        document.getElementById('onboarding-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[9999] flex items-center justify-center';
        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
                <div class="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-5">
                    <i data-lucide="flask-conical" class="w-8 h-8 text-amber-500"></i>
                </div>
                <h2 class="text-lg font-bold text-slate-900 mb-2">No Study Assigned</h2>
                <p class="text-sm text-slate-500 mb-6 leading-relaxed">
                    You have not been assigned to any clinical study.<br>
                    Please contact your administrator to request access.
                </p>
                <button id="no-study-logout"
                    class="w-full px-4 py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition flex items-center justify-center gap-2">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                    Sign Out
                </button>
            </div>`;
        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();
        overlay.querySelector('#no-study-logout').addEventListener('click', () => api.logout());
    });
}

function showNoSiteMessage() {
    return new Promise(() => {
        document.getElementById('onboarding-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[9999] flex items-center justify-center';
        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
                <div class="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-5">
                    <i data-lucide="building-2" class="w-8 h-8 text-amber-500"></i>
                </div>
                <h2 class="text-lg font-bold text-slate-900 mb-2">No Site Assigned</h2>
                <p class="text-sm text-slate-500 mb-6 leading-relaxed">
                    You have not been assigned to a clinical site.<br>
                    Please contact your administrator to request access.
                </p>
                <button id="no-site-logout"
                    class="w-full px-4 py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition flex items-center justify-center gap-2">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                    Sign Out
                </button>
            </div>`;
        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();
        overlay.querySelector('#no-site-logout').addEventListener('click', () => api.logout());
    });
}

// ── Study picker ─────────────────────────────────────────────────────────────

function pickStudy(studies) {
    return new Promise(resolve => {
        document.getElementById('onboarding-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[9999] flex items-center justify-center';

        const rows = studies.map(s => `
            <button class="study-pick-btn w-full text-left px-4 py-3.5 rounded-xl border-2 border-slate-100
                    hover:border-blue-400 hover:bg-blue-50/80 transition group"
                data-id="${s.id}" data-title="${encodeURIComponent(s.title)}"
                data-protocol="${encodeURIComponent(s.protocolNo)}" data-status="${s.status}">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="flask-conical" class="w-5 h-5 text-blue-600"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-semibold text-slate-900 text-sm truncate group-hover:text-blue-700">${s.title}</p>
                        <p class="text-xs text-slate-500 mt-0.5">${s.protocolNo} &nbsp;·&nbsp; ${s.phase ?? 'N/A'} &nbsp;·&nbsp;
                            <span class="${s.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}">${s.status}</span>
                        </p>
                    </div>
                    <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-blue-500 flex-shrink-0"></i>
                </div>
            </button>`).join('');

        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="layers" class="w-5 h-5 text-white"></i>
                    </div>
                    <div>
                        <p class="text-xs text-slate-400 font-medium uppercase tracking-widest">Step 1 of 2</p>
                        <h2 class="text-base font-bold text-slate-900 leading-tight">Select Clinical Study</h2>
                    </div>
                </div>
                <p class="text-xs text-slate-500 mb-4 ml-[52px]">Choose the trial you will work on in this session</p>
                <div class="space-y-2 max-h-72 overflow-y-auto pr-0.5">${rows}</div>
            </div>`;

        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();

        overlay.querySelectorAll('.study-pick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const s = {
                    id:         parseInt(btn.dataset.id),
                    title:      decodeURIComponent(btn.dataset.title),
                    protocolNo: decodeURIComponent(btn.dataset.protocol),
                    status:     btn.dataset.status,
                };
                overlay.remove();
                resolve(s);
            });
        });
    });
}

// ── Site picker ───────────────────────────────────────────────────────────────

function pickSite(study, sites) {
    return new Promise(resolve => {
        document.getElementById('onboarding-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[9999] flex items-center justify-center';

        const rows = sites.map(s => `
            <button class="site-pick-btn w-full text-left px-4 py-3.5 rounded-xl border-2 border-slate-100
                    hover:border-emerald-400 hover:bg-emerald-50/80 transition group"
                data-id="${s.id}"
                data-code="${encodeURIComponent(s.site_code ?? '')}"
                data-name="${encodeURIComponent(s.site_name ?? '')}">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="building-2" class="w-5 h-5 text-emerald-600"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-semibold text-slate-900 text-sm truncate group-hover:text-emerald-700">${s.site_name ?? '—'}</p>
                        <p class="text-xs text-slate-500 mt-0.5">${s.site_code ?? ''} &nbsp;·&nbsp; ${s.country ?? 'N/A'}
                            ${s.pi_name ? ` &nbsp;·&nbsp; PI: ${s.pi_name}` : ''}
                        </p>
                    </div>
                    <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-emerald-500 flex-shrink-0"></i>
                </div>
            </button>`).join('');

        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
                <div class="flex items-center gap-3 mb-1">
                    <div class="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="building-2" class="w-5 h-5 text-white"></i>
                    </div>
                    <div>
                        <p class="text-xs text-slate-400 font-medium uppercase tracking-widest">Step 2 of 2</p>
                        <h2 class="text-base font-bold text-slate-900 leading-tight">Select Study Site</h2>
                    </div>
                </div>
                <p class="text-xs text-slate-500 mb-4 ml-[52px]">
                    <span class="inline-flex items-center gap-1">
                        <i data-lucide="flask-conical" class="w-3 h-3 text-blue-500 inline"></i>
                        <span class="font-medium text-blue-700">${study.title}</span>
                    </span>
                    &nbsp;·&nbsp; Choose the site for this session
                </p>
                <div class="space-y-2 max-h-72 overflow-y-auto pr-0.5">${rows}</div>
            </div>`;

        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();

        overlay.querySelectorAll('.site-pick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const site = {
                    id:        parseInt(btn.dataset.id),
                    site_code: decodeURIComponent(btn.dataset.code),
                    site_name: decodeURIComponent(btn.dataset.name),
                };
                setSiteContext(site);
                overlay.remove();
                resolve(site);
            });
        });
    });
}

// ── Manual study/site switch (from sidebar or studymgmt) ─────────────────────

export function switchStudyAndSite() {
    api.setCurrentStudy(null);
    setSiteContext(null);
    window.location.href = 'select.html';
}
