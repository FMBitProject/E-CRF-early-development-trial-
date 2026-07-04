// SAE Expedited Reports — ICH E2A §4
// 7-day: fatal/life-threatening | 15-day: other serious AEs

import { api } from './api.js';
import { showToast } from './utils.js';

function escSAE(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function renderSAEReports(container) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:3rem;">
        <span style="color:#6b7280;">Loading SAE reports…</span></div>`;

    const user = api.getCurrentUser();
    const role = user?.role ?? '';

    const [reports, overdue] = await Promise.all([
        api.getSAEReports().catch(() => []),
        api.getOverdueSAEReports().catch(() => []),
    ]);

    container.innerHTML = renderSAEPage(reports, overdue, role);
    attachSAEEvents(container, role);
}

function deadlineBadge(report) {
    if (report.status === 'Submitted') {
        return `<span style="background:#d1fae5;color:#065f46;padding:0.2rem 0.6rem;border-radius:999px;font-size:0.75rem;font-weight:600;">Submitted</span>`;
    }
    if (report.status === 'Late Submission') {
        return `<span style="background:#fef3c7;color:#92400e;padding:0.2rem 0.6rem;border-radius:999px;font-size:0.75rem;font-weight:600;">Late Submission</span>`;
    }
    const now = new Date();
    const deadline = new Date(report.deadlineDate);
    const daysLeft = Math.ceil((deadline - now) / 86400000);
    if (daysLeft < 0) {
        return `<span style="background:#fee2e2;color:#991b1b;padding:0.2rem 0.6rem;border-radius:999px;font-size:0.75rem;font-weight:600;">OVERDUE ${Math.abs(daysLeft)}d</span>`;
    }
    if (daysLeft <= 2) {
        return `<span style="background:#fef3c7;color:#92400e;padding:0.2rem 0.6rem;border-radius:999px;font-size:0.75rem;font-weight:600;">${daysLeft}d left</span>`;
    }
    return `<span style="background:#eff6ff;color:#1e40af;padding:0.2rem 0.6rem;border-radius:999px;font-size:0.75rem;font-weight:600;">${daysLeft}d left</span>`;
}

function signedBadge(report) {
    if (report.signedAt) {
        const d = new Date(report.signedAt).toLocaleDateString();
        return `<span style="background:#d1fae5;color:#065f46;padding:0.15rem 0.5rem;border-radius:999px;font-size:0.72rem;font-weight:600;" title="Signed by ${escSAE(report.signedByName)} on ${d}">&#10003; Signed</span>`;
    }
    return `<span style="background:#fee2e2;color:#991b1b;padding:0.15rem 0.5rem;border-radius:999px;font-size:0.72rem;font-weight:600;">Unsigned</span>`;
}

function timelineBar(report) {
    const day0 = new Date(report.day0Date);
    const deadline = new Date(report.deadlineDate);
    const now = new Date();
    const total = deadline - day0;
    const elapsed = Math.min(now - day0, total);
    const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
    const isSubmitted = report.status === 'Submitted' || report.status === 'Late Submission';
    const isOverdue = now > deadline && !isSubmitted;
    const barColor = isSubmitted ? '#16a34a' : isOverdue ? '#dc2626' : pct > 75 ? '#d97706' : '#2563eb';

    return `
        <div style="background:#f3f4f6;border-radius:4px;height:6px;width:100%;margin-top:0.4rem;overflow:hidden;">
            <div style="background:${barColor};height:100%;width:${isSubmitted ? 100 : pct}%;transition:width 0.3s;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:#9ca3af;margin-top:0.2rem;">
            <span>Day 0: ${new Date(report.day0Date).toLocaleDateString()}</span>
            <span>Deadline: ${deadline.toLocaleDateString()} (${report.deadlineDays}d)</span>
        </div>
    `;
}

function actionButtons(r, canWrite, canSign) {
    const isPending = r.status === 'Pending';
    if (!isPending || (!canWrite && !canSign)) return '';

    const signBtn = (!r.signedAt && canSign) ? `
        <button class="btn-sign-sae" data-id="${r.id}"
            style="background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:0.3rem 0.75rem;cursor:pointer;font-size:0.8rem;white-space:nowrap;">
            &#9998; Sign
        </button>` : '';

    const submitBtn = (r.signedAt && canWrite) ? `
        <button class="btn-submit-sae" data-id="${r.id}"
            style="background:#059669;color:#fff;border:none;border-radius:6px;padding:0.3rem 0.75rem;cursor:pointer;font-size:0.8rem;white-space:nowrap;">
            Mark Submitted
        </button>` : '';

    // Show unsigned warning hint if signed but submit not available
    const unsignedHint = (!r.signedAt && canWrite && !canSign) ? `
        <span style="font-size:0.75rem;color:#dc2626;">Requires investigator signature</span>` : '';

    return `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.35rem;">${signBtn}${submitBtn}${unsignedHint}</div>`;
}

function renderSAEPage(reports, overdue, role) {
    const canWrite = ['admin', 'cra', 'pi', 'data_manager'].includes(role);
    const canSign  = ['admin', 'pi', 'investigator'].includes(role);

    const overdueAlert = overdue.length > 0 ? `
        <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;
                    padding:1rem 1.25rem;margin-bottom:1.5rem;display:flex;gap:0.75rem;align-items:flex-start;">
            <span style="font-size:1.25rem;">&#128680;</span>
            <div>
                <strong style="color:#991b1b;">${overdue.length} SAE report${overdue.length !== 1 ? 's' : ''} OVERDUE</strong>
                <div style="margin-top:0.35rem;font-size:0.85rem;color:#7f1d1d;">
                    ${overdue.map(r => `${escSAE(r.subjectCode)} — ${escSAE(r.aeTerm)} (${escSAE(r.deadlineDays)}-day deadline passed)`).join('<br>')}
                </div>
            </div>
        </div>` : '';

    const rows = reports.length === 0
        ? '<tr><td colspan="8" style="padding:2rem;text-align:center;color:#6b7280;">No SAE reports yet.</td></tr>'
        : reports.map(r => `
            <tr style="cursor:pointer;" class="sae-row" data-id="${r.id}">
                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;">
                    <span style="font-size:0.75rem;color:#6b7280;font-family:monospace;">#${r.id}</span>
                </td>
                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;">
                    <div style="font-weight:600;font-size:0.88rem;">${escSAE(r.subjectCode) || '—'}</div>
                    <div style="font-size:0.8rem;color:#6b7280;">${escSAE(r.aeTerm) || '—'}</div>
                </td>
                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-size:0.88rem;">
                    ${r.reportType} #${r.reportNumber}
                </td>
                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-size:0.88rem;">
                    <strong style="color:#dc2626;">${r.deadlineDays}d</strong>
                    ${timelineBar(r)}
                </td>
                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;">
                    ${deadlineBadge(r)}
                </td>
                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;">
                    ${signedBadge(r)}
                    ${r.signedAt ? `<div style="font-size:0.72rem;color:#6b7280;margin-top:0.15rem;">${escSAE(r.signedByName)}</div>` : ''}
                </td>
                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-size:0.85rem;color:#6b7280;">
                    ${r.submittedTo ?? '—'}
                </td>
                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;text-align:right;">
                    ${actionButtons(r, canWrite, canSign)}
                </td>
            </tr>
        `).join('');

    return `
        <div style="padding:2rem;max-width:1200px;margin:0 auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
                <div>
                    <h1 style="margin:0 0 0.25rem;font-size:1.5rem;">SAE Expedited Reports</h1>
                    <p style="margin:0;color:#6b7280;font-size:0.9rem;">ICH E2A §4 — 7-day (fatal/life-threatening) and 15-day (other serious) reporting timelines</p>
                </div>
                ${canWrite ? `
                <button id="btn-new-sae-report"
                    style="background:#dc2626;color:#fff;border:none;border-radius:8px;padding:0.65rem 1.25rem;cursor:pointer;font-size:0.9rem;font-weight:600;">
                    + New SAE Report
                </button>` : ''}
            </div>

            ${overdueAlert}

            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <div style="padding:0.75rem 1rem;background:#f9fafb;display:flex;align-items:center;justify-content:space-between;">
                    <span style="font-weight:600;font-size:0.95rem;">All SAE Reports</span>
                    <span style="font-size:0.8rem;color:#6b7280;">${reports.length} reports — ${overdue.length} overdue</span>
                </div>
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:#f9fafb;">
                            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.78rem;color:#6b7280;">#</th>
                            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.78rem;color:#6b7280;">Subject / AE</th>
                            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.78rem;color:#6b7280;">Report Type</th>
                            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.78rem;color:#6b7280;">Timeline</th>
                            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.78rem;color:#6b7280;">Status</th>
                            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.78rem;color:#6b7280;">Signature</th>
                            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.78rem;color:#6b7280;">Submitted To</th>
                            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.78rem;color:#6b7280;"></th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        </div>

        ${renderNewSAEModal()}
        ${renderSubmitSAEModal()}
        ${renderSignSAEModal()}
    `;
}

function renderNewSAEModal() {
    return `
        <div id="new-sae-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
             z-index:10000;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:12px;padding:2rem;max-width:520px;width:90%;
                        max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <h2 style="margin:0 0 0.25rem;font-size:1.15rem;">New SAE Expedited Report</h2>
                <p style="margin:0 0 1rem;font-size:0.85rem;color:#6b7280;">ICH E2A §4 — enter details for the expedited regulatory notification</p>

                <div style="margin-bottom:0.85rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">AE ID (Serious AEs only) *</label>
                    <input id="sae-ae-id" type="number"
                           style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;font-size:0.9rem;"
                           placeholder="Enter AE ID number">
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.85rem;">
                    <div>
                        <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Report Type *</label>
                        <select id="sae-report-type" style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                            <option value="">Select…</option>
                            <option value="Initial">Initial</option>
                            <option value="Follow-up">Follow-up</option>
                            <option value="Final">Final</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Deadline *</label>
                        <select id="sae-deadline-days" style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                            <option value="">Select…</option>
                            <option value="7">7-day (fatal / life-threatening)</option>
                            <option value="15">15-day (other serious)</option>
                        </select>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.85rem;">
                    <div>
                        <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Day 0 Date (First Knowledge) *</label>
                        <input id="sae-day0" type="date"
                               style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Submit To</label>
                        <select id="sae-submitted-to" style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                            <option value="">Select…</option>
                            <option value="BPOM">BPOM</option>
                            <option value="IRB/IEC">IRB / IEC</option>
                            <option value="Sponsor">Sponsor</option>
                            <option value="All">All (BPOM + IRB + Sponsor)</option>
                        </select>
                    </div>
                </div>

                <div style="margin-bottom:1rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Narrative</label>
                    <textarea id="sae-narrative" rows="3"
                              style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;
                                     box-sizing:border-box;resize:vertical;font-size:0.9rem;"
                              placeholder="Brief description of the SAE and relevant clinical details…"></textarea>
                </div>

                <div id="sae-error" style="color:#dc2626;font-size:0.88rem;margin-bottom:0.75rem;display:none;"></div>
                <div style="display:flex;gap:0.75rem;">
                    <button id="sae-cancel" style="flex:1;border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:0.65rem;cursor:pointer;">Cancel</button>
                    <button id="sae-submit" style="flex:2;background:#dc2626;color:#fff;border:none;border-radius:8px;padding:0.65rem;cursor:pointer;font-weight:600;">Create SAE Report</button>
                </div>
            </div>
        </div>
    `;
}

function renderSubmitSAEModal() {
    return `
        <div id="submit-sae-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
             z-index:10000;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:12px;padding:2rem;max-width:440px;width:90%;
                        box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <h2 style="margin:0 0 0.5rem;font-size:1.1rem;">Mark Report as Submitted</h2>
                <p style="margin:0 0 1rem;font-size:0.85rem;color:#6b7280;">
                    Confirm that this SAE report has been submitted to the regulatory authority.
                </p>
                <div style="margin-bottom:0.85rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Submission Reference</label>
                    <input id="submit-sae-ref" type="text"
                           style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;font-size:0.9rem;"
                           placeholder="e.g. BPOM-2026-SAE-001">
                </div>
                <div id="submit-sae-error" style="color:#dc2626;font-size:0.88rem;margin-bottom:0.75rem;display:none;"></div>
                <div style="display:flex;gap:0.75rem;">
                    <button id="submit-sae-cancel" style="flex:1;border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:0.65rem;cursor:pointer;">Cancel</button>
                    <button id="submit-sae-confirm" style="flex:2;background:#059669;color:#fff;border:none;border-radius:8px;padding:0.65rem;cursor:pointer;font-weight:600;">Confirm Submission</button>
                </div>
            </div>
        </div>
    `;
}

function renderSignSAEModal() {
    return `
        <div id="sign-sae-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
             z-index:10000;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:12px;padding:2rem;max-width:460px;width:90%;
                        box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <h2 style="margin:0 0 0.25rem;font-size:1.1rem;">&#9998; Sign SAE Report</h2>
                <p style="margin:0 0 1rem;font-size:0.85rem;color:#6b7280;">
                    ICH GCP E6(R3) C.4.4 — Electronic signature by a qualified investigator is required before submission.
                </p>
                <div style="margin-bottom:0.85rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Signing Meaning *</label>
                    <select id="sign-sae-meaning" style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                        <option value="">Select meaning…</option>
                        <option value="I certify this SAE report is accurate, complete, and ready for regulatory submission">I certify this SAE report is accurate, complete, and ready for regulatory submission</option>
                        <option value="I have reviewed and approved this SAE report as the Principal Investigator">I have reviewed and approved this SAE report as the Principal Investigator</option>
                        <option value="I confirm this SAE narrative accurately reflects the clinical findings">I confirm this SAE narrative accurately reflects the clinical findings</option>
                    </select>
                </div>
                <div style="margin-bottom:1rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Password (e-signature verification) *</label>
                    <input id="sign-sae-password" type="password"
                           style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;font-size:0.9rem;"
                           placeholder="Enter your account password">
                </div>
                <div id="sign-sae-error" style="color:#dc2626;font-size:0.88rem;margin-bottom:0.75rem;display:none;"></div>
                <div style="display:flex;gap:0.75rem;">
                    <button id="sign-sae-cancel" style="flex:1;border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:0.65rem;cursor:pointer;">Cancel</button>
                    <button id="sign-sae-confirm" style="flex:2;background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:0.65rem;cursor:pointer;font-weight:600;">Apply Electronic Signature</button>
                </div>
            </div>
        </div>
    `;
}

function attachSAEEvents(container, role) {
    const canWrite = ['admin', 'cra', 'pi', 'data_manager'].includes(role);

    // New report modal
    document.getElementById('btn-new-sae-report')?.addEventListener('click', () => {
        document.getElementById('new-sae-modal').style.display = 'flex';
    });
    document.getElementById('sae-cancel')?.addEventListener('click', () => {
        document.getElementById('new-sae-modal').style.display = 'none';
    });
    document.getElementById('sae-submit')?.addEventListener('click', async () => {
        const aeId          = document.getElementById('sae-ae-id').value;
        const reportType    = document.getElementById('sae-report-type').value;
        const deadlineDays  = document.getElementById('sae-deadline-days').value;
        const day0Date      = document.getElementById('sae-day0').value;
        const submittedTo   = document.getElementById('sae-submitted-to').value;
        const narrative     = document.getElementById('sae-narrative').value.trim();
        const errEl         = document.getElementById('sae-error');
        errEl.style.display = 'none';

        if (!aeId || !reportType || !deadlineDays || !day0Date) {
            errEl.textContent = 'AE ID, report type, deadline, and Day 0 date are required.';
            errEl.style.display = 'block';
            return;
        }
        try {
            await api.createSAEReport({ aeId, reportType, deadlineDays, day0Date, submittedTo: submittedTo || null, narrative: narrative || null });
            showToast('SAE report created', 'success');
            document.getElementById('new-sae-modal').style.display = 'none';
            renderSAEReports(container);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
        }
    });

    // Sign report modal
    let pendingSignId = null;
    container.querySelectorAll('.btn-sign-sae').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            pendingSignId = btn.dataset.id;
            document.getElementById('sign-sae-meaning').value = '';
            document.getElementById('sign-sae-password').value = '';
            document.getElementById('sign-sae-error').style.display = 'none';
            document.getElementById('sign-sae-modal').style.display = 'flex';
        });
    });
    document.getElementById('sign-sae-cancel')?.addEventListener('click', () => {
        document.getElementById('sign-sae-modal').style.display = 'none';
        pendingSignId = null;
    });
    document.getElementById('sign-sae-confirm')?.addEventListener('click', async () => {
        const meaning  = document.getElementById('sign-sae-meaning').value;
        const password = document.getElementById('sign-sae-password').value;
        const errEl    = document.getElementById('sign-sae-error');
        errEl.style.display = 'none';

        if (!meaning || !password) {
            errEl.textContent = 'Signing meaning and password are required.';
            errEl.style.display = 'block';
            return;
        }
        try {
            await api.signSAEReport(pendingSignId, { password, meaning });
            showToast('SAE report signed successfully', 'success');
            document.getElementById('sign-sae-modal').style.display = 'none';
            pendingSignId = null;
            renderSAEReports(container);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
        }
    });

    // Submit report modal
    let pendingSubmitId = null;
    container.querySelectorAll('.btn-submit-sae').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            pendingSubmitId = btn.dataset.id;
            document.getElementById('submit-sae-ref').value = '';
            document.getElementById('submit-sae-error').style.display = 'none';
            document.getElementById('submit-sae-modal').style.display = 'flex';
        });
    });
    document.getElementById('submit-sae-cancel')?.addEventListener('click', () => {
        document.getElementById('submit-sae-modal').style.display = 'none';
        pendingSubmitId = null;
    });
    document.getElementById('submit-sae-confirm')?.addEventListener('click', async () => {
        const submissionRef = document.getElementById('submit-sae-ref').value.trim();
        const errEl = document.getElementById('submit-sae-error');
        errEl.style.display = 'none';
        try {
            await api.submitSAEReport(pendingSubmitId, { submissionRef: submissionRef || null });
            showToast('SAE report marked as submitted', 'success');
            document.getElementById('submit-sae-modal').style.display = 'none';
            pendingSubmitId = null;
            renderSAEReports(container);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
        }
    });
}
