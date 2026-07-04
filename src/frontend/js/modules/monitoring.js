// Monitoring Visit Reports & SDV — ICH GCP E6(R3) §5.18

import { api } from './api.js';
import { showToast } from './utils.js';

function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const VISIT_TYPES = [
    'Site Initiation', 'Routine Monitoring', 'Close-out', 'Remote',
];

const SDV_STATUSES = ['Verified', 'Discrepant', 'Not Reviewed', 'N/A'];

export async function renderMonitoring(container) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:3rem;">
        <span style="color:#6b7280;">Loading monitoring visits…</span></div>`;

    const user = api.getCurrentUser();
    const role = user?.role ?? '';

    const [visits, sites] = await Promise.all([
        api.getMonitoringVisits().catch(() => []),
        api.getSites().catch(() => []),
    ]);

    container.innerHTML = renderMonitoringPage(visits, sites, role);
    attachMonitoringEvents(container, role, sites);
}

function statusBadge(status) {
    const map = {
        'Draft':        'background:#f3f4f6;color:#374151',
        'Submitted':    'background:#dbeafe;color:#1e40af',
        'Acknowledged': 'background:#d1fae5;color:#065f46',
    };
    const style = map[status] || 'background:#f3f4f6;color:#374151';
    return `<span style="${style};padding:0.2rem 0.65rem;border-radius:999px;font-size:0.78rem;font-weight:600;">${status}</span>`;
}

function visitTypeIcon(type) {
    const icons = {
        'Site Initiation':   '🚀',
        'Routine Monitoring':'🔍',
        'Close-out':         '🔒',
        'Remote':            '💻',
    };
    return icons[type] || '📋';
}

function renderMonitoringPage(visits, sites, role) {
    const canCreate = ['admin', 'cra', 'pi', 'data_manager'].includes(role);
    const canAck    = ['admin', 'pi'].includes(role);

    const rows = visits.length === 0
        ? '<tr><td colspan="6" style="padding:2rem;text-align:center;color:#6b7280;">No monitoring visits yet.</td></tr>'
        : visits.map(v => `
            <tr>
                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;">
                    <div style="font-weight:600;font-size:0.88rem;">
                        ${visitTypeIcon(v.visitType)} ${v.visitType}
                    </div>
                    <div style="font-size:0.8rem;color:#6b7280;">${v.visitDate}</div>
                </td>
                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-size:0.88rem;">
                    ${v.siteName ?? '—'}
                </td>
                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-size:0.88rem;">
                    ${v.craName}
                </td>
                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;">
                    ${statusBadge(v.status)}
                </td>
                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-size:0.85rem;color:#6b7280;">
                    ${v.nextVisitDate ? `Next: ${v.nextVisitDate}` : '—'}
                </td>
                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;text-align:right;">
                    <div style="display:flex;gap:0.4rem;justify-content:flex-end;flex-wrap:wrap;">
                        <button class="btn-view-mvr" data-id="${v.id}"
                            style="background:#eff6ff;color:#2563eb;border:none;border-radius:6px;padding:0.3rem 0.65rem;cursor:pointer;font-size:0.8rem;">
                            View / SDV
                        </button>
                        ${canCreate && v.status === 'Draft' ? `
                        <button class="btn-submit-mvr" data-id="${v.id}"
                            style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:0.3rem 0.65rem;cursor:pointer;font-size:0.8rem;">
                            Submit
                        </button>` : ''}
                        ${canAck && v.status === 'Submitted' ? `
                        <button class="btn-ack-mvr" data-id="${v.id}"
                            style="background:#059669;color:#fff;border:none;border-radius:6px;padding:0.3rem 0.65rem;cursor:pointer;font-size:0.8rem;">
                            Acknowledge
                        </button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

    return `
        <div style="padding:2rem;max-width:1100px;margin:0 auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
                <div>
                    <h1 style="margin:0 0 0.25rem;font-size:1.5rem;">Monitoring Visit Reports</h1>
                    <p style="margin:0;color:#6b7280;font-size:0.9rem;">ICH GCP E6(R3) §5.18 — CRA site monitoring with source data verification (SDV)</p>
                </div>
                ${canCreate ? `
                <button id="btn-new-mvr"
                    style="background:#2563eb;color:#fff;border:none;border-radius:8px;padding:0.65rem 1.25rem;cursor:pointer;font-size:0.9rem;font-weight:600;">
                    + New Monitoring Visit
                </button>` : ''}
            </div>

            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <div style="padding:0.75rem 1rem;background:#f9fafb;display:flex;align-items:center;justify-content:space-between;">
                    <span style="font-weight:600;font-size:0.95rem;">Monitoring Visits</span>
                    <span style="font-size:0.8rem;color:#6b7280;">${visits.length} visits</span>
                </div>
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:#f9fafb;">
                            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.78rem;color:#6b7280;">Visit Type / Date</th>
                            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.78rem;color:#6b7280;">Site</th>
                            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.78rem;color:#6b7280;">CRA</th>
                            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.78rem;color:#6b7280;">Status</th>
                            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.78rem;color:#6b7280;">Next Visit</th>
                            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.78rem;color:#6b7280;"></th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        </div>

        ${renderNewMVRModal(sites)}
        ${renderViewMVRModal()}
        ${renderAckModal()}
    `;
}

function renderNewMVRModal(sites) {
    const siteOptions = sites.map(s =>
        `<option value="${s.id}">${s.code} — ${s.name}</option>`
    ).join('');

    const typeOptions = VISIT_TYPES.map(t =>
        `<option value="${t}">${t}</option>`
    ).join('');

    return `
        <div id="new-mvr-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
             z-index:10000;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:12px;padding:2rem;max-width:560px;width:90%;
                        max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <h2 style="margin:0 0 1rem;font-size:1.15rem;">New Monitoring Visit</h2>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.85rem;">
                    <div>
                        <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Visit Date *</label>
                        <input id="mvr-date" type="date"
                               style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Visit Type *</label>
                        <select id="mvr-type" style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                            <option value="">Select…</option>
                            ${typeOptions}
                        </select>
                    </div>
                </div>

                <div style="margin-bottom:0.85rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Site</label>
                    <select id="mvr-site" style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                        <option value="">Select site…</option>
                        ${siteOptions}
                    </select>
                </div>

                <div style="margin-bottom:0.85rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Findings</label>
                    <textarea id="mvr-findings" rows="3"
                              style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;
                                     box-sizing:border-box;resize:vertical;font-size:0.9rem;"
                              placeholder="Summary of monitoring visit findings, observations, and issues identified…"></textarea>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.85rem;">
                    <div>
                        <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Next Visit Date</label>
                        <input id="mvr-next-date" type="date"
                               style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Notes</label>
                        <input id="mvr-notes" type="text"
                               style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;font-size:0.9rem;"
                               placeholder="Additional notes…">
                    </div>
                </div>

                <div id="mvr-error" style="color:#dc2626;font-size:0.88rem;margin-bottom:0.75rem;display:none;"></div>
                <div style="display:flex;gap:0.75rem;">
                    <button id="mvr-cancel" style="flex:1;border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:0.65rem;cursor:pointer;">Cancel</button>
                    <button id="mvr-submit" style="flex:2;background:#2563eb;color:#fff;border:none;border-radius:8px;padding:0.65rem;cursor:pointer;font-weight:600;">Create Visit</button>
                </div>
            </div>
        </div>
    `;
}

function renderViewMVRModal() {
    const statusOptions = SDV_STATUSES.map(s =>
        `<option value="${s}">${s}</option>`
    ).join('');

    return `
        <div id="view-mvr-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
             z-index:10000;align-items:flex-start;justify-content:center;overflow-y:auto;padding:2rem 1rem;">
            <div style="background:#fff;border-radius:12px;padding:2rem;max-width:760px;width:100%;
                        box-shadow:0 20px 60px rgba(0,0,0,0.3);margin:auto;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
                    <h2 id="mvr-detail-title" style="margin:0;font-size:1.15rem;">Monitoring Visit Detail</h2>
                    <button id="mvr-detail-close"
                            style="border:none;background:#f3f4f6;border-radius:6px;padding:0.4rem 0.75rem;cursor:pointer;font-size:0.9rem;">
                        Close
                    </button>
                </div>
                <div id="mvr-detail-body" style="color:#6b7280;text-align:center;padding:1rem;">Loading…</div>

                <!-- SDV Entry Row -->
                <div id="mvr-sdv-entry" style="display:none;margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid #e5e7eb;">
                    <h3 style="margin:0 0 0.75rem;font-size:1rem;">Add / Update SDV Record</h3>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.6rem;margin-bottom:0.6rem;">
                        <input id="sdv-subject-code" type="text" placeholder="Subject Code *"
                               style="padding:0.55rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.88rem;">
                        <input id="sdv-visit-name" type="text" placeholder="Visit Name"
                               style="padding:0.55rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.88rem;">
                        <input id="sdv-form-name" type="text" placeholder="Form Name"
                               style="padding:0.55rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.88rem;">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 2fr;gap:0.6rem;margin-bottom:0.6rem;">
                        <select id="sdv-status-select" style="padding:0.55rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.88rem;">
                            ${statusOptions}
                        </select>
                        <input id="sdv-discrepancy" type="text" placeholder="Discrepancy note (if Discrepant)"
                               style="padding:0.55rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.88rem;">
                    </div>
                    <div id="sdv-error" style="color:#dc2626;font-size:0.85rem;margin-bottom:0.5rem;display:none;"></div>
                    <button id="btn-save-sdv"
                            style="background:#059669;color:#fff;border:none;border-radius:6px;padding:0.5rem 1.25rem;cursor:pointer;font-size:0.88rem;">
                        Save SDV Record
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderAckModal() {
    return `
        <div id="ack-mvr-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
             z-index:10000;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:12px;padding:2rem;max-width:440px;width:90%;
                        box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <h2 style="margin:0 0 0.5rem;font-size:1.1rem;">Acknowledge Monitoring Visit</h2>
                <p style="margin:0 0 1rem;font-size:0.85rem;color:#6b7280;">
                    As PI/Admin, confirm you have reviewed this monitoring visit report.
                </p>
                <div style="margin-bottom:1rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">PI Comments (optional)</label>
                    <textarea id="ack-pi-comments" rows="3"
                              style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;
                                     box-sizing:border-box;resize:vertical;font-size:0.9rem;"
                              placeholder="Response to CRA findings, action commitments…"></textarea>
                </div>
                <div id="ack-error" style="color:#dc2626;font-size:0.88rem;margin-bottom:0.75rem;display:none;"></div>
                <div style="display:flex;gap:0.75rem;">
                    <button id="ack-cancel" style="flex:1;border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:0.65rem;cursor:pointer;">Cancel</button>
                    <button id="ack-confirm" style="flex:2;background:#059669;color:#fff;border:none;border-radius:8px;padding:0.65rem;cursor:pointer;font-weight:600;">Acknowledge</button>
                </div>
            </div>
        </div>
    `;
}

function sdvStatusStyle(status) {
    const map = {
        'Verified':     'color:#065f46;background:#d1fae5',
        'Discrepant':   'color:#991b1b;background:#fee2e2',
        'Not Reviewed': 'color:#374151;background:#f3f4f6',
        'N/A':          'color:#6b7280;background:#f9fafb',
    };
    return map[status] || 'color:#374151;background:#f3f4f6';
}

async function loadMVRDetail(visitId, canWrite) {
    const bodyEl = document.getElementById('mvr-detail-body');
    const sdvEntry = document.getElementById('mvr-sdv-entry');
    bodyEl.innerHTML = '<p style="color:#6b7280;text-align:center;padding:1rem;">Loading…</p>';

    try {
        const visit = await api.getMonitoringVisit(visitId);
        document.getElementById('mvr-detail-title').textContent =
            `${visitTypeIcon(visit.visitType)} ${visit.visitType} — ${visit.visitDate}`;

        const actionItems = Array.isArray(visit.actionItems) ? visit.actionItems : [];
        const subjects    = Array.isArray(visit.subjectsReviewed) ? visit.subjectsReviewed : [];
        const sdvRows     = (visit.sdvRecords ?? []).map(r => `
            <tr>
                <td style="padding:0.5rem 0.6rem;border-bottom:1px solid #f3f4f6;font-size:0.85rem;font-weight:500;">${esc(r.subjectCode)}</td>
                <td style="padding:0.5rem 0.6rem;border-bottom:1px solid #f3f4f6;font-size:0.85rem;">${esc(r.visitName) || '—'}</td>
                <td style="padding:0.5rem 0.6rem;border-bottom:1px solid #f3f4f6;font-size:0.85rem;">${esc(r.formName) || '—'}</td>
                <td style="padding:0.5rem 0.6rem;border-bottom:1px solid #f3f4f6;">
                    <span style="${sdvStatusStyle(r.sdvStatus)};padding:0.15rem 0.55rem;border-radius:4px;font-size:0.78rem;font-weight:600;">${esc(r.sdvStatus)}</span>
                </td>
                <td style="padding:0.5rem 0.6rem;border-bottom:1px solid #f3f4f6;font-size:0.8rem;color:#6b7280;">${esc(r.discrepancyNote)}</td>
                <td style="padding:0.5rem 0.6rem;border-bottom:1px solid #f3f4f6;font-size:0.8rem;color:#9ca3af;">${esc(r.verifiedByName) || '—'}</td>
            </tr>
        `).join('');

        bodyEl.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.75rem;margin-bottom:1.25rem;font-size:0.88rem;">
                <div><span style="color:#6b7280;">CRA:</span><br><strong>${esc(visit.craName)}</strong></div>
                <div><span style="color:#6b7280;">Site:</span><br><strong>${esc(visit.siteName) || '—'}</strong></div>
                <div><span style="color:#6b7280;">Status:</span><br>${statusBadge(visit.status)}</div>
                <div><span style="color:#6b7280;">Next Visit:</span><br><strong>${esc(visit.nextVisitDate) || '—'}</strong></div>
                ${visit.acknowledgedAt ? `<div><span style="color:#6b7280;">Acknowledged by:</span><br><strong>${esc(visit.acknowledgedByName)}</strong></div>` : ''}
            </div>
            ${visit.findings ? `<div style="margin-bottom:1rem;"><strong style="font-size:0.88rem;">Findings:</strong><p style="margin:0.3rem 0 0;font-size:0.88rem;color:#374151;white-space:pre-wrap;">${esc(visit.findings)}</p></div>` : ''}
            ${visit.piComments ? `<div style="margin-bottom:1rem;background:#f0fdf4;border-radius:8px;padding:0.75rem;"><strong style="font-size:0.88rem;color:#065f46;">PI Response:</strong><p style="margin:0.3rem 0 0;font-size:0.88rem;color:#374151;">${esc(visit.piComments)}</p></div>` : ''}
            ${subjects.length ? `<div style="margin-bottom:1rem;font-size:0.88rem;"><strong>Subjects Reviewed:</strong> ${esc(subjects.join(', '))}</div>` : ''}
            ${actionItems.length ? `
            <div style="margin-bottom:1rem;">
                <strong style="font-size:0.88rem;">Action Items:</strong>
                <ul style="margin:0.35rem 0 0;padding-left:1.25rem;font-size:0.85rem;color:#374151;">
                    ${actionItems.map(a => `<li>${esc(typeof a === 'string' ? a : JSON.stringify(a))}</li>`).join('')}
                </ul>
            </div>` : ''}

            <!-- SDV Table -->
            <div style="margin-top:1rem;">
                <strong style="font-size:0.9rem;">Source Data Verification (SDV)</strong>
                ${visit.sdvRecords?.length ? `
                <div style="overflow-x:auto;margin-top:0.5rem;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:#f9fafb;">
                            <th style="padding:0.4rem 0.6rem;text-align:left;font-size:0.78rem;color:#6b7280;">Subject</th>
                            <th style="padding:0.4rem 0.6rem;text-align:left;font-size:0.78rem;color:#6b7280;">Visit</th>
                            <th style="padding:0.4rem 0.6rem;text-align:left;font-size:0.78rem;color:#6b7280;">Form</th>
                            <th style="padding:0.4rem 0.6rem;text-align:left;font-size:0.78rem;color:#6b7280;">SDV Status</th>
                            <th style="padding:0.4rem 0.6rem;text-align:left;font-size:0.78rem;color:#6b7280;">Discrepancy</th>
                            <th style="padding:0.4rem 0.6rem;text-align:left;font-size:0.78rem;color:#6b7280;">Verified By</th>
                        </tr></thead>
                        <tbody>${sdvRows}</tbody>
                    </table>
                </div>` : '<p style="font-size:0.85rem;color:#9ca3af;margin-top:0.4rem;">No SDV records yet.</p>'}
            </div>
        `;

        if (canWrite && visit.status !== 'Acknowledged') {
            sdvEntry.style.display = 'block';
            sdvEntry.dataset.visitId = visitId;
        } else {
            sdvEntry.style.display = 'none';
        }
    } catch (err) {
        bodyEl.innerHTML = `<p style="color:#dc2626;padding:1rem;">Failed to load: ${err.message}</p>`;
    }
}

function attachMonitoringEvents(container, role, sites) {
    const canCreate = ['admin', 'cra', 'pi', 'data_manager'].includes(role);
    const canAck    = ['admin', 'pi'].includes(role);

    // New visit modal
    document.getElementById('btn-new-mvr')?.addEventListener('click', () => {
        document.getElementById('new-mvr-modal').style.display = 'flex';
    });
    document.getElementById('mvr-cancel')?.addEventListener('click', () => {
        document.getElementById('new-mvr-modal').style.display = 'none';
    });
    document.getElementById('mvr-submit')?.addEventListener('click', async () => {
        const visitDate   = document.getElementById('mvr-date').value;
        const visitType   = document.getElementById('mvr-type').value;
        const siteId      = document.getElementById('mvr-site').value;
        const findings    = document.getElementById('mvr-findings').value.trim();
        const nextDate    = document.getElementById('mvr-next-date').value;
        const notes       = document.getElementById('mvr-notes').value.trim();
        const errEl       = document.getElementById('mvr-error');
        errEl.style.display = 'none';

        if (!visitDate || !visitType) {
            errEl.textContent = 'Visit date and type are required.';
            errEl.style.display = 'block';
            return;
        }
        try {
            await api.createMonitoringVisit({
                visitDate, visitType,
                siteId: siteId || null,
                findings: findings || null,
                nextVisitDate: nextDate || null,
                notes: notes || null,
            });
            showToast('Monitoring visit created', 'success');
            document.getElementById('new-mvr-modal').style.display = 'none';
            renderMonitoring(container);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
        }
    });

    // View / SDV modal
    document.getElementById('mvr-detail-close')?.addEventListener('click', () => {
        document.getElementById('view-mvr-modal').style.display = 'none';
    });
    container.querySelectorAll('.btn-view-mvr').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.getElementById('view-mvr-modal').style.display = 'flex';
            await loadMVRDetail(btn.dataset.id, canCreate);
        });
    });

    // Save SDV record
    document.getElementById('btn-save-sdv')?.addEventListener('click', async () => {
        const visitId        = document.getElementById('mvr-sdv-entry').dataset.visitId;
        const subjectCode    = document.getElementById('sdv-subject-code').value.trim();
        const visitName      = document.getElementById('sdv-visit-name').value.trim();
        const formName       = document.getElementById('sdv-form-name').value.trim();
        const sdvStatus      = document.getElementById('sdv-status-select').value;
        const discrepancyNote = document.getElementById('sdv-discrepancy').value.trim();
        const errEl          = document.getElementById('sdv-error');
        errEl.style.display  = 'none';

        if (!subjectCode) {
            errEl.textContent = 'Subject code is required.';
            errEl.style.display = 'block';
            return;
        }
        try {
            await api.upsertSDVRecord(visitId, {
                subjectCode,
                visitName: visitName || null,
                formName:  formName  || null,
                sdvStatus,
                discrepancyNote: discrepancyNote || null,
            });
            showToast('SDV record saved', 'success');
            document.getElementById('sdv-subject-code').value = '';
            document.getElementById('sdv-visit-name').value   = '';
            document.getElementById('sdv-form-name').value    = '';
            document.getElementById('sdv-discrepancy').value  = '';
            await loadMVRDetail(visitId, canCreate);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
        }
    });

    // Submit visit
    container.querySelectorAll('.btn-submit-mvr').forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                await api.submitMonitoringVisit(btn.dataset.id);
                showToast('Monitoring visit submitted for PI review', 'success');
                renderMonitoring(container);
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    });

    // Acknowledge visit modal
    let pendingAckId = null;
    container.querySelectorAll('.btn-ack-mvr').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingAckId = btn.dataset.id;
            document.getElementById('ack-pi-comments').value = '';
            document.getElementById('ack-error').style.display = 'none';
            document.getElementById('ack-mvr-modal').style.display = 'flex';
        });
    });
    document.getElementById('ack-cancel')?.addEventListener('click', () => {
        document.getElementById('ack-mvr-modal').style.display = 'none';
        pendingAckId = null;
    });
    document.getElementById('ack-confirm')?.addEventListener('click', async () => {
        const piComments = document.getElementById('ack-pi-comments').value.trim();
        const errEl = document.getElementById('ack-error');
        errEl.style.display = 'none';
        try {
            await api.acknowledgeMonitoringVisit(pendingAckId, piComments || null);
            showToast('Monitoring visit acknowledged', 'success');
            document.getElementById('ack-mvr-modal').style.display = 'none';
            pendingAckId = null;
            renderMonitoring(container);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
        }
    });
}

