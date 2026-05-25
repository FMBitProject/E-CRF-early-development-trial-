// Amendment Re-consent Tracking — ICH GCP E6(R3) 4.8
import { api } from './api.js';
import { showToast } from './utils.js';

export async function renderReconsentTracking(container) {
    container.innerHTML = `
    <div class="p-4 md:p-6 space-y-4">
      <div>
        <h2 class="text-lg font-semibold text-slate-800">Amendment Re-consent Tracking</h2>
        <p class="text-xs text-slate-500">ICH GCP E6(R3) §4.8 — subjects enrolled before an amendment must re-consent when required</p>
      </div>
      <div id="reconsent-content">
        <div class="text-center py-8 text-slate-400 text-sm">Loading…</div>
      </div>
    </div>`;

    await loadReconsentData();
}

async function loadReconsentData() {
    const content = document.getElementById('reconsent-content');
    if (!content) return;
    try {
        const amendments = await api.request('/api/amendments');
        const requiresReconsent = amendments.filter(a => a.requiresReconsent);

        if (!requiresReconsent.length) {
            content.innerHTML = `
            <div class="ph-card p-8 text-center">
              <i data-lucide="check-circle-2" class="w-10 h-10 text-emerald-400 mx-auto mb-3"></i>
              <p class="text-sm font-medium text-slate-600">No amendments require re-consent.</p>
              <p class="text-xs text-slate-400 mt-1">All amendments have been reviewed and no subject re-consent is needed.</p>
            </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        // Fetch re-consent status for each amendment in parallel
        const statuses = await Promise.all(
            requiresReconsent.map(a =>
                api.getAmendmentReconsentStatus(a.id).catch(() => null)
            )
        );

        content.innerHTML = requiresReconsent.map((a, i) => {
            const st = statuses[i];
            const pending  = st?.pending      ?? [];
            const done     = st?.reconsentDone ?? [];
            const total    = pending.length + done.length;
            const donePct  = total > 0 ? Math.round((done.length / total) * 100) : 100;
            const statusCls = donePct === 100 ? 'border-emerald-200 bg-emerald-50' : donePct >= 50 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50';

            return `
            <div class="ph-card p-5 border ${statusCls}">
              <div class="flex items-start justify-between flex-wrap gap-2 mb-3">
                <div>
                  <h3 class="font-semibold text-slate-800">${a.amendmentNo}</h3>
                  <p class="text-xs text-slate-500">${a.summary ?? ''}</p>
                  <p class="text-xs text-slate-400 mt-0.5">Effective: ${a.effectiveDate ?? '—'} · Status: <span class="font-medium">${a.status}</span></p>
                </div>
                <div class="text-right">
                  <p class="text-2xl font-bold ${donePct === 100 ? 'text-emerald-600' : donePct >= 50 ? 'text-amber-600' : 'text-red-600'}">${donePct}%</p>
                  <p class="text-xs text-slate-500">re-consented</p>
                </div>
              </div>

              <div class="h-2 bg-white/60 rounded-full overflow-hidden mb-3 border border-white/40">
                <div class="h-full rounded-full transition-all ${donePct === 100 ? 'bg-emerald-500' : donePct >= 50 ? 'bg-amber-400' : 'bg-red-500'}"
                     style="width:${donePct}%"></div>
              </div>

              <div class="flex gap-4 text-xs text-slate-600 mb-3">
                <span>Total active: <strong>${total}</strong></span>
                <span class="text-emerald-600">Re-consented: <strong>${done.length}</strong></span>
                <span class="text-red-600">Pending: <strong>${pending.length}</strong></span>
              </div>

              ${pending.length ? `
              <details class="mt-2">
                <summary class="text-xs font-semibold text-red-600 cursor-pointer hover:text-red-700">
                  ${pending.length} subject${pending.length !== 1 ? 's' : ''} pending re-consent ▾
                </summary>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  ${pending.map(s => `
                  <span class="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-mono">${s.subjectCode}</span>`).join('')}
                </div>
              </details>` : `
              <p class="text-xs text-emerald-600 font-medium">✓ All subjects have re-consented for this amendment.</p>`}
            </div>`;
        }).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        content.innerHTML = `<p class="text-center text-red-500 text-sm py-8">${err.message}</p>`;
        showToast(err.message, 'error');
    }
}
