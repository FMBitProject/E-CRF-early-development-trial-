// Risk-Based Monitoring Plan (RBMP) — ICH GCP E6(R3) §5.18.3
import { api } from './api.js';
import { showToast } from './utils.js';

const STATUS_COLOR = {
    Draft:      'bg-amber-100 text-amber-700',
    Approved:   'bg-emerald-100 text-emerald-700',
    Superseded: 'bg-slate-100 text-slate-500',
};

const RISK_COLOR = {
    Low:    'text-emerald-600',
    Medium: 'text-amber-600',
    High:   'text-red-600',
};

export async function renderMonitoringPlan(container) {
    container.innerHTML = `
    <div class="p-4 md:p-6 space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">Risk-Based Monitoring Plan</h2>
          <p class="text-xs text-slate-500">ICH GCP E6(R3) §5.18.3 — Documented RBMP with SDV strategy and risk factors</p>
        </div>
        <button id="mp-new-btn" class="ph-btn ph-btn-primary text-xs flex items-center gap-1.5">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> New Plan Version
        </button>
      </div>

      <!-- Current approved plan highlight -->
      <div id="mp-current-wrap"></div>

      <!-- All versions -->
      <div id="mp-list" class="space-y-3"></div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    await loadPlans(container);
    document.getElementById('mp-new-btn')?.addEventListener('click', () => showPlanModal(null, container));
}

async function loadPlans(container) {
    try {
        const plans = await api.getMonitoringPlans();
        renderCurrentPlan(plans.find(p => p.status === 'Approved'));
        renderPlanList(plans, container);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderCurrentPlan(plan) {
    const el = document.getElementById('mp-current-wrap');
    if (!el) return;
    if (!plan) {
        el.innerHTML = `<div class="ph-card p-4 border-l-4 border-amber-400">
          <p class="text-sm font-semibold text-amber-700">No Approved Monitoring Plan</p>
          <p class="text-xs text-amber-600 mt-1">
            An approved RBMP is required before monitoring activities. Create and approve a plan below.
          </p>
        </div>`;
        return;
    }
    el.innerHTML = `
    <div class="ph-card p-4 border-l-4 border-emerald-400">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              ACTIVE PLAN v${plan.version}</span>
            <span class="text-xs ${RISK_COLOR[plan.riskLevel] || 'text-slate-500'} font-semibold">
              ${plan.riskLevel || 'Risk: N/A'}</span>
          </div>
          <p class="text-sm font-semibold text-slate-800">
            SDV: ${plan.sdvStrategy || 'Not specified'}
            ${plan.sdvPercentage != null ? ` (${plan.sdvPercentage}%)` : ''}
          </p>
          <p class="text-xs text-slate-500 mt-0.5">
            On-site: ${plan.onSiteFrequency || '—'} · Remote: ${plan.remoteFrequency || '—'}
          </p>
          <p class="text-xs text-slate-400 mt-1">
            Approved by ${plan.approvedByName || '—'} on
            ${plan.approvedAt ? new Date(plan.approvedAt).toLocaleDateString() : '—'}
          </p>
        </div>
        <div class="flex flex-col gap-1 text-right text-xs text-slate-500">
          <span>${(plan.criticalDataFields || []).length} critical data fields</span>
          <span>${(plan.riskFactors || []).length} risk factors</span>
        </div>
      </div>
    </div>`;
}

function renderPlanList(plans, container) {
    const el = document.getElementById('mp-list');
    if (!el) return;
    if (!plans.length) {
        el.innerHTML = `<p class="text-center text-slate-400 text-sm py-12">No monitoring plans created yet.</p>`;
        return;
    }
    el.innerHTML = plans.map(plan => `
    <div class="ph-card p-4">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-semibold text-slate-800">v${plan.version}</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[plan.status] || ''}">
              ${plan.status}</span>
            ${plan.riskLevel ? `<span class="text-xs ${RISK_COLOR[plan.riskLevel] || ''} font-medium">
              ${plan.riskLevel} Risk</span>` : ''}
          </div>
          <div class="text-xs text-slate-600 space-y-0.5">
            ${plan.sdvStrategy ? `<p>SDV Strategy: <strong>${plan.sdvStrategy}</strong>${plan.sdvPercentage != null ? ` · ${plan.sdvPercentage}%` : ''}</p>` : ''}
            ${plan.onSiteFrequency ? `<p>On-site: ${plan.onSiteFrequency}</p>` : ''}
            ${plan.scope ? `<p class="text-slate-500 mt-1 line-clamp-2">${plan.scope}</p>` : ''}
          </div>
          <p class="text-xs text-slate-400 mt-1.5">
            Created by ${plan.createdByName || '—'} · ${new Date(plan.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          ${plan.status === 'Draft' ? `
            <button onclick="window._mpEdit(${plan.id})"
                    class="ph-btn ph-btn-ghost text-xs">Edit</button>
            <button onclick="window._mpApprove(${plan.id})"
                    class="ph-btn ph-btn-primary text-xs">Approve</button>` : ''}
          <button onclick="window._mpView(${plan.id})"
                  class="ph-btn ph-btn-ghost text-xs">View</button>
        </div>
      </div>
    </div>`).join('');

    window._mpEdit    = (id) => { const p = plans.find(x => x.id === id); if (p) showPlanModal(p, container); };
    window._mpApprove = async (id) => {
        if (!confirm('Approve this Monitoring Plan? Currently approved plan will be superseded.')) return;
        try {
            await api.approveMonitoringPlan(id);
            showToast('Monitoring plan approved', 'success');
            await loadPlans(container);
        } catch (err) { showToast(err.message, 'error'); }
    };
    window._mpView = (id) => { const p = plans.find(x => x.id === id); if (p) showPlanDetail(p); };
}

function showPlanDetail(plan) {
    const mid = 'mp-detail-modal';
    document.getElementById(mid)?.remove();

    const overlay = document.createElement('div');
    overlay.id = mid;
    overlay.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4';
    overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
      <div class="p-5 border-b flex items-center justify-between">
        <h3 class="font-semibold text-slate-800">Monitoring Plan v${plan.version}
          <span class="ml-2 text-xs font-normal px-2 py-0.5 rounded-full ${STATUS_COLOR[plan.status] || ''}">
            ${plan.status}</span>
        </h3>
        <button onclick="document.getElementById('${mid}').remove()">✕</button>
      </div>
      <div class="p-5 space-y-4 text-sm">
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <dt class="text-slate-500 font-medium">Risk Level</dt>
          <dd class="${RISK_COLOR[plan.riskLevel] || 'text-slate-700'} font-semibold">${plan.riskLevel || '—'}</dd>
          <dt class="text-slate-500 font-medium">SDV Strategy</dt>
          <dd>${plan.sdvStrategy || '—'} ${plan.sdvPercentage != null ? `(${plan.sdvPercentage}%)` : ''}</dd>
          <dt class="text-slate-500 font-medium">On-site Frequency</dt>
          <dd>${plan.onSiteFrequency || '—'}</dd>
          <dt class="text-slate-500 font-medium">Remote Frequency</dt>
          <dd>${plan.remoteFrequency || '—'}</dd>
        </dl>
        ${plan.scope ? `<div><p class="text-xs font-semibold text-slate-600 mb-1">Scope</p>
          <p class="text-xs text-slate-600">${plan.scope}</p></div>` : ''}
        ${(plan.criticalDataFields || []).length ? `
          <div><p class="text-xs font-semibold text-slate-600 mb-1">Critical Data Fields</p>
            <div class="flex flex-wrap gap-1">
              ${(plan.criticalDataFields).map(f => `<span class="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs">${f}</span>`).join('')}
            </div>
          </div>` : ''}
        ${(plan.riskFactors || []).length ? `
          <div><p class="text-xs font-semibold text-slate-600 mb-1">Risk Factors</p>
            <ul class="list-disc list-inside text-xs text-slate-600 space-y-0.5">
              ${(plan.riskFactors).map(f => `<li>${f}</li>`).join('')}
            </ul>
          </div>` : ''}
        ${plan.notes ? `<div><p class="text-xs font-semibold text-slate-600 mb-1">Notes</p>
          <p class="text-xs text-slate-600">${plan.notes}</p></div>` : ''}
        ${plan.approvedByName ? `<p class="text-xs text-slate-400">
          Approved by ${plan.approvedByName} on ${new Date(plan.approvedAt).toLocaleDateString()}</p>` : ''}
      </div>
    </div>`;
    document.body.appendChild(overlay);
}

function showPlanModal(record, container) {
    const isEdit = !!record;
    const mid = 'mp-modal';
    document.getElementById(mid)?.remove();

    // Prepare field values
    const criticalFields = (record?.criticalDataFields || []).join('\n');
    const riskFactors    = (record?.riskFactors || []).join('\n');

    const overlay = document.createElement('div');
    overlay.id = mid;
    overlay.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4';
    overlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
      <div class="p-5 border-b flex items-center justify-between">
        <h3 class="font-semibold text-slate-800">${isEdit ? 'Edit' : 'New'} Monitoring Plan</h3>
        <button onclick="document.getElementById('${mid}').remove()">✕</button>
      </div>
      <div class="p-5 space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Version</label>
            <input id="mp-version" type="text" class="ph-input text-sm w-full"
                   value="${record?.version || '1.0'}" placeholder="1.0">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Risk Level</label>
            <select id="mp-risk" class="ph-input text-sm w-full">
              <option value="">—</option>
              ${['Low','Medium','High'].map(r => `<option ${r === record?.riskLevel ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">SDV %</label>
            <input id="mp-pct" type="number" min="0" max="100" class="ph-input text-sm w-full"
                   value="${record?.sdvPercentage ?? ''}">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">SDV Strategy</label>
            <select id="mp-strategy" class="ph-input text-sm w-full">
              <option value="">—</option>
              ${['100%','Risk-Based','Remote','Centralized'].map(s =>
                `<option ${s === record?.sdvStrategy ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">On-site Frequency</label>
            <input id="mp-onsite" type="text" class="ph-input text-sm w-full"
                   placeholder="e.g. Every 6 weeks"
                   value="${record?.onSiteFrequency || ''}">
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Remote Monitoring Frequency</label>
          <input id="mp-remote" type="text" class="ph-input text-sm w-full"
                 placeholder="e.g. Weekly centralized review"
                 value="${record?.remoteFrequency || ''}">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Scope &amp; Objectives</label>
          <textarea id="mp-scope" rows="2" class="ph-input text-sm w-full"
                    placeholder="Describe monitoring scope…">${record?.scope || ''}</textarea>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">
            Critical Data Fields <span class="text-slate-400">(one per line)</span>
          </label>
          <textarea id="mp-critical" rows="3" class="ph-input text-sm w-full font-mono"
                    placeholder="AESTDTC&#10;AESER&#10;RFSTDTC">${criticalFields}</textarea>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">
            Risk Factors <span class="text-slate-400">(one per line)</span>
          </label>
          <textarea id="mp-risks" rows="3" class="ph-input text-sm w-full"
                    placeholder="New investigator site&#10;Complex protocol…">${riskFactors}</textarea>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <textarea id="mp-notes" rows="2" class="ph-input text-sm w-full">${record?.notes || ''}</textarea>
        </div>
      </div>
      <div class="p-5 border-t flex justify-end gap-2">
        <button onclick="document.getElementById('${mid}').remove()"
                class="ph-btn ph-btn-ghost text-sm">Cancel</button>
        <button id="mp-save-btn" class="ph-btn ph-btn-primary text-sm">
          ${isEdit ? 'Save Changes' : 'Create Plan'}
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);

    document.getElementById('mp-save-btn').addEventListener('click', async () => {
        const payload = {
            version:           document.getElementById('mp-version').value.trim(),
            riskLevel:         document.getElementById('mp-risk').value || null,
            sdvStrategy:       document.getElementById('mp-strategy').value || null,
            sdvPercentage:     document.getElementById('mp-pct').value ? parseInt(document.getElementById('mp-pct').value) : null,
            onSiteFrequency:   document.getElementById('mp-onsite').value.trim() || null,
            remoteFrequency:   document.getElementById('mp-remote').value.trim() || null,
            scope:             document.getElementById('mp-scope').value.trim() || null,
            criticalDataFields:document.getElementById('mp-critical').value.split('\n').map(s=>s.trim()).filter(Boolean),
            riskFactors:       document.getElementById('mp-risks').value.split('\n').map(s=>s.trim()).filter(Boolean),
            notes:             document.getElementById('mp-notes').value.trim() || null,
        };
        try {
            if (isEdit) {
                await api.updateMonitoringPlan(record.id, payload);
                showToast('Plan updated', 'success');
            } else {
                await api.createMonitoringPlan(payload);
                showToast('Monitoring plan created', 'success');
            }
            overlay.remove();
            await loadPlans(container);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}
