// Periodic User Access Review — ICH GCP E6(R3) C.4.2
import { api } from './api.js';
import { showToast } from './utils.js';

function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function renderAccessReview(container) {
    container.innerHTML = `
    <div class="p-4 md:p-6 space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">Periodic User Access Review</h2>
          <p class="text-xs text-slate-500">ICH GCP E6(R3) C.4.2 — user access rights must be reviewed periodically</p>
        </div>
        <button id="ar-new-btn" class="ph-btn ph-btn-primary text-xs flex items-center gap-1.5">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Initiate Review
        </button>
      </div>
      <div id="ar-content">
        <div class="text-center py-8 text-slate-400 text-sm">Loading…</div>
      </div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    await loadReviews();
    document.getElementById('ar-new-btn')?.addEventListener('click', showNewReviewModal);
}

async function loadReviews() {
    const content = document.getElementById('ar-content');
    if (!content) return;
    try {
        const reviews = await api.getAccessReviews();
        if (!reviews.length) {
            content.innerHTML = `
            <div class="ph-card p-8 text-center">
              <i data-lucide="shield-check" class="w-10 h-10 text-slate-300 mx-auto mb-3"></i>
              <p class="text-sm font-medium text-slate-600">No access reviews initiated yet.</p>
              <p class="text-xs text-slate-400 mt-1">Initiate a periodic review to certify all user roles.</p>
            </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }
        content.innerHTML = reviews.map(r => renderReviewCard(r)).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        content.innerHTML = `<p class="text-center text-red-500 text-sm py-8">${err.message}</p>`;
    }
}

function renderReviewCard(r) {
    const certs      = r.certifications ?? [];
    const certified  = certs.filter(c => c.certified).length;
    const total      = certs.length;
    const pct        = total > 0 ? Math.round((certified / total) * 100) : 0;
    const isDone     = r.status === 'Complete';
    const statusCls  = isDone ? 'border-emerald-200' : pct === 100 ? 'border-blue-200' : 'border-amber-200';

    return `
    <div class="ph-card p-5 border ${statusCls} mb-3">
      <div class="flex items-start justify-between flex-wrap gap-2 mb-3">
        <div>
          <h3 class="font-semibold text-slate-800">${r.review_period ?? r.reviewPeriod}</h3>
          <p class="text-xs text-slate-500">
            Initiated by ${r.initiated_by_name ?? r.initiatedByName ?? '—'} on
            ${r.initiated_at ? new Date(r.initiated_at).toLocaleDateString() : '—'}
          </p>
          ${isDone ? `<p class="text-xs text-emerald-600 mt-0.5">Completed ${r.completed_at ? new Date(r.completed_at).toLocaleDateString() : ''} by ${r.completed_by_name ?? '—'}</p>` : ''}
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${r.status ?? r.status}</span>
          ${!isDone && pct === 100 ? `
          <button onclick="window._arComplete(${r.id})"
                  class="ph-btn ph-btn-primary text-xs">Mark Complete</button>` : ''}
        </div>
      </div>

      <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
        <div class="h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}" style="width:${pct}%"></div>
      </div>
      <p class="text-xs text-slate-500 mb-3">${certified}/${total} users certified</p>

      ${!isDone && total > 0 ? `
      <div class="overflow-auto max-h-64 border border-slate-200 rounded-lg">
        <table class="w-full text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th class="px-3 py-2 text-left font-semibold text-slate-600">User</th>
              <th class="px-3 py-2 text-left font-semibold text-slate-600">Role</th>
              <th class="px-3 py-2 text-left font-semibold text-slate-600">Status</th>
              <th class="px-3 py-2 text-left font-semibold text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${certs.map(c => `
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 font-medium text-slate-700">${esc(c.userName)}</td>
              <td class="px-3 py-2 text-slate-500 capitalize">${c.role?.replace('_', ' ') ?? '—'}</td>
              <td class="px-3 py-2">
                ${c.certified
                    ? `<span class="text-emerald-600 font-semibold">✓ Certified</span>`
                    : `<span class="text-amber-600">Pending</span>`}
              </td>
              <td class="px-3 py-2 flex gap-1.5">
                ${!c.certified ? `
                <button onclick="window._arCertify(${r.id}, '${c.userId}', true)"
                        class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium hover:bg-emerald-200">Certify</button>
                <button onclick="window._arCertify(${r.id}, '${c.userId}', false)"
                        class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200">Flag</button>` : ''}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>`;
}

function showNewReviewModal() {
    const mid = 'ar-new-modal';
    document.getElementById(mid)?.remove();
    const now = new Date();
    const period = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;

    const overlay = document.createElement('div');
    overlay.id = mid;
    overlay.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4';
    overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <div class="p-5 border-b flex items-center justify-between">
        <h3 class="font-semibold text-slate-800">Initiate Access Review</h3>
        <button onclick="document.getElementById('${mid}').remove()">✕</button>
      </div>
      <div class="p-5 space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Review Period *</label>
          <input id="ar-period" type="text" value="${period}" placeholder="e.g. 2026-Q1 or January 2026"
                 class="ph-input text-sm w-full">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <textarea id="ar-notes" rows="2" placeholder="Optional notes…" class="ph-input text-sm w-full"></textarea>
        </div>
        <p class="text-xs text-slate-400">A snapshot of all active users will be captured for certification.</p>
      </div>
      <div class="p-5 border-t flex justify-end gap-2">
        <button onclick="document.getElementById('${mid}').remove()" class="ph-btn ph-btn-ghost text-sm">Cancel</button>
        <button id="ar-create-btn" class="ph-btn ph-btn-primary text-sm">Initiate Review</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);

    document.getElementById('ar-create-btn').addEventListener('click', async () => {
        const reviewPeriod = document.getElementById('ar-period').value.trim();
        const notes        = document.getElementById('ar-notes').value.trim();
        if (!reviewPeriod) { showToast('Review period is required', 'error'); return; }
        try {
            await api.createAccessReview({ reviewPeriod, notes: notes || null });
            overlay.remove();
            showToast('Access review initiated', 'success');
            await loadReviews();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

window._arCertify = async (reviewId, userId, certified) => {
    try {
        await api.certifyUserAccess(reviewId, userId, certified);
        showToast(certified ? 'User certified' : 'User flagged for review', certified ? 'success' : 'warning');
        await loadReviews();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window._arComplete = async (id) => {
    try {
        await api.completeAccessReview(id);
        showToast('Access review completed', 'success');
        await loadReviews();
    } catch (err) {
        showToast(err.message, 'error');
    }
};
