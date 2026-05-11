// Study Selector — shown when no study is selected in localStorage
// Auto-selects if only one study is accessible

import { api } from './api.js';
import { showToast } from './utils.js';

export async function ensureStudySelected() {
    const current = api.getCurrentStudy();

    let studies;
    try {
        studies = await api.getStudies();
    } catch {
        return; // if API fails, don't block the UI
    }

    if (studies.length === 0) {
        // No studies yet — admin needs to create one
        if (api.getCurrentUser()?.role === 'admin') {
            showStudyRequiredBanner();
        }
        return;
    }

    // Auto-select if only one study
    if (studies.length === 1 && !current) {
        api.setCurrentStudy(studies[0]);
        return;
    }

    // If current study is still in the list, keep it
    if (current && studies.find(s => s.id === current.id)) return;

    // Otherwise show picker
    showStudyPicker(studies);
}

function showStudyRequiredBanner() {
    const banner = document.createElement('div');
    banner.id = 'study-required-banner';
    banner.className = 'fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center';
    banner.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md mx-4 text-center">
            <div class="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <i data-lucide="flask-conical" class="w-7 h-7 text-amber-600"></i>
            </div>
            <h2 class="text-lg font-bold text-slate-900 mb-2">No Studies Configured</h2>
            <p class="text-sm text-slate-500 mb-5">No clinical studies have been created yet. As an administrator, please create a study before using the system.</p>
            <a href="#studymgmt" onclick="document.getElementById('study-required-banner').remove()"
               class="btn-primary px-6 py-2 rounded-lg text-sm font-semibold inline-block">
                Go to Study Management
            </a>
        </div>`;
    document.body.appendChild(banner);
    if (window.lucide) lucide.createIcons();
}

function showStudyPicker(studies) {
    document.getElementById('study-picker-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'study-picker-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center';

    const rows = studies.map(s => `
        <button class="study-pick-btn w-full text-left px-4 py-3.5 rounded-xl border-2 border-slate-100
                hover:border-blue-400 hover:bg-blue-50 transition group"
            data-id="${s.id}" data-title="${encodeURIComponent(s.title)}"
            data-protocol="${encodeURIComponent(s.protocolNo)}" data-status="${s.status}">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="flask-conical" class="w-4.5 h-4.5 text-blue-600"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <p class="font-semibold text-slate-900 text-sm truncate group-hover:text-blue-700">${s.title}</p>
                    <p class="text-xs text-slate-500 mt-0.5">${s.protocolNo} · ${s.phase ?? 'N/A'} · ${s.status}</p>
                </div>
                <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-blue-500 flex-shrink-0"></i>
            </div>
        </button>`).join('');

    overlay.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
            <div class="flex items-center gap-3 mb-5">
                <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                    <i data-lucide="layers" class="w-5 h-5 text-white"></i>
                </div>
                <div>
                    <h2 class="text-base font-bold text-slate-900">Select Study</h2>
                    <p class="text-xs text-slate-500">Choose the clinical trial to work in</p>
                </div>
            </div>
            <div class="space-y-2 max-h-80 overflow-y-auto pr-1">${rows}</div>
        </div>`;

    document.body.appendChild(overlay);
    if (window.lucide) lucide.createIcons();

    overlay.querySelectorAll('.study-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            api.setCurrentStudy({
                id:         parseInt(btn.dataset.id),
                title:      decodeURIComponent(btn.dataset.title),
                protocolNo: decodeURIComponent(btn.dataset.protocol),
                status:     btn.dataset.status,
            });
            overlay.remove();
            // Refresh sidebar to show study name
            window.dispatchEvent(new CustomEvent('study-changed'));
        });
    });
}

export function switchStudy() {
    api.getStudies().then(studies => {
        if (studies.length > 1) showStudyPicker(studies);
        else showToast('Only one study available', 'info');
    }).catch(() => {});
}
