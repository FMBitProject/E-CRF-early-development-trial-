// Database Lock (DBL) UI — ICH GCP E6(R3) §5.5.7
// Dual-signature workflow: CRA initiates + signs → Admin signs → Locked

import { api } from './api.js';
import { showToast } from './toast.js';

export async function renderDblock(container) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:3rem;">
        <span style="color:#6b7280;">Loading database lock status…</span></div>`;

    let statusData;
    try {
        statusData = await api.getDblockStatus();
    } catch (err) {
        container.innerHTML = `<div style="padding:2rem;color:#dc2626;">Failed to load: ${err.message}</div>`;
        return;
    }

    const user = JSON.parse(sessionStorage.getItem('ecrf_user') || '{}');
    const role = user.role ?? '';

    container.innerHTML = renderDblockPage(statusData, role);
    attachDblockEvents(container, statusData, role);
}

function statusBadge(status) {
    const map = {
        'Locked':             'background:#dc2626;color:#fff',
        'Pending Approval':   'background:#d97706;color:#fff',
        'Pending Signatures': 'background:#2563eb;color:#fff',
    };
    const style = map[status] || 'background:#6b7280;color:#fff';
    return `<span style="${style};padding:0.3rem 0.8rem;border-radius:999px;font-size:0.8rem;font-weight:600;">${status}</span>`;
}

function checkIcon(passed) {
    return passed
        ? `<span style="color:#16a34a;font-size:1.1rem;">✓</span>`
        : `<span style="color:#dc2626;font-size:1.1rem;">✗</span>`;
}

function renderPreChecks(preCheck) {
    if (!preCheck?.checks) return '';
    const rows = preCheck.checks.map(c => `
        <tr>
            <td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f3f4f6;">${checkIcon(c.passed)}</td>
            <td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f3f4f6;font-weight:500;">${c.label}</td>
            <td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:0.85rem;">${c.detail}</td>
            <td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f3f4f6;color:#9ca3af;font-size:0.78rem;">${c.ref}</td>
        </tr>
    `).join('');
    const runAt = preCheck.runAt ? new Date(preCheck.runAt).toLocaleString() : '';
    const allBg = preCheck.allPassed ? '#f0fdf4' : '#fef2f2';
    const allColor = preCheck.allPassed ? '#16a34a' : '#dc2626';
    return `
        <div style="margin-top:1.25rem;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <div style="padding:0.75rem 1rem;background:${allBg};display:flex;align-items:center;gap:0.5rem;">
                <span style="color:${allColor};font-weight:600;">
                    ${preCheck.allPassed ? '✓ All pre-lock checks passed' : '✗ Pre-lock checks failed — lock cannot proceed'}
                </span>
                ${runAt ? `<span style="margin-left:auto;font-size:0.8rem;color:#6b7280;">Run at ${runAt}</span>` : ''}
            </div>
            <table style="width:100%;border-collapse:collapse;background:#fff;">
                <thead>
                    <tr style="background:#f9fafb;">
                        <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;"></th>
                        <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Check</th>
                        <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Detail</th>
                        <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Reference</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function renderCurrentLock(current, role) {
    if (!current) return '';

    const actions = [];

    if (current.status === 'Pending Signatures' && !current.craSigned && ['cra', 'admin'].includes(role)) {
        actions.push(`<button id="btn-sign-cra" class="dbl-action-btn"
            style="background:#2563eb;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.25rem;cursor:pointer;font-size:0.9rem;">
            Sign as CRA (Electronic Signature)
        </button>`);
    }

    if (current.status === 'Pending Approval' && !current.adminSigned && role === 'admin') {
        actions.push(`<button id="btn-sign-admin" class="dbl-action-btn"
            style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.25rem;cursor:pointer;font-size:0.9rem;">
            Sign as Admin &amp; Lock Database
        </button>`);
    }

    return `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem;">
            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
                <h3 style="margin:0;font-size:1.05rem;">Current Lock Request</h3>
                ${statusBadge(current.status)}
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.75rem;font-size:0.9rem;">
                <div><span style="color:#6b7280;">Initiated by:</span><br><strong>${current.initiatedByName ?? '—'}</strong></div>
                <div><span style="color:#6b7280;">Initiated at:</span><br><strong>${current.initiatedAt ? new Date(current.initiatedAt).toLocaleString() : '—'}</strong></div>
                <div><span style="color:#6b7280;">CRA Signature:</span><br><strong>${current.craSigned ? `✓ ${current.craSignedByName} (${new Date(current.craSignedAt).toLocaleDateString()})` : '⏳ Pending'}</strong></div>
                <div><span style="color:#6b7280;">Admin Signature:</span><br><strong>${current.adminSigned ? `✓ ${current.adminSignedByName} (${new Date(current.adminSignedAt).toLocaleDateString()})` : '⏳ Pending'}</strong></div>
                ${current.lockedAt ? `<div><span style="color:#6b7280;">Locked at:</span><br><strong style="color:#dc2626;">${new Date(current.lockedAt).toLocaleString()}</strong></div>` : ''}
                ${current.notes ? `<div style="grid-column:1/-1;"><span style="color:#6b7280;">Notes:</span><br>${current.notes}</div>` : ''}
            </div>
            ${current.preCheckJson ? renderPreChecks(current.preCheckJson) : ''}
            ${actions.length ? `<div style="display:flex;gap:0.75rem;margin-top:1.25rem;flex-wrap:wrap;">${actions.join('')}</div>` : ''}
        </div>
    `;
}

function renderDblockPage(statusData, role) {
    const { isLocked, current, history } = statusData;

    const lockedBanner = isLocked ? `
        <div style="background:#dc2626;color:#fff;padding:1rem 1.5rem;border-radius:10px;margin-bottom:1.5rem;
                    display:flex;align-items:center;gap:0.75rem;">
            <span style="font-size:1.5rem;">🔒</span>
            <div>
                <strong>Database Locked</strong> — No further data entry is permitted.
                Locked at: ${current?.lockedAt ? new Date(current.lockedAt).toLocaleString() : ''}
                &nbsp;|&nbsp; CRA: ${current?.craSignedByName ?? '—'}
                &nbsp;|&nbsp; Admin: ${current?.adminSignedByName ?? '—'}
            </div>
        </div>
    ` : '';

    const initiateBtn = (!isLocked && current?.status !== 'Pending Signatures' && current?.status !== 'Pending Approval' && ['cra', 'admin'].includes(role))
        ? `<button id="btn-initiate-dbl"
                style="background:#059669;color:#fff;border:none;border-radius:8px;
                       padding:0.7rem 1.5rem;cursor:pointer;font-size:0.95rem;font-weight:600;">
                Initiate Database Lock
           </button>`
        : '';

    const checkBtn = ['cra', 'admin'].includes(role) && !isLocked
        ? `<button id="btn-run-checks"
                style="background:#f59e0b;color:#fff;border:none;border-radius:8px;
                       padding:0.7rem 1.5rem;cursor:pointer;font-size:0.95rem;">
                Run Pre-Lock Compliance Checks
           </button>`
        : '';

    const checkResults = `<div id="dbl-check-results"></div>`;

    const historyRows = (history ?? []).filter(h => h.id !== current?.id).map(h => `
        <tr>
            <td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f3f4f6;">${new Date(h.createdAt).toLocaleDateString()}</td>
            <td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f3f4f6;">${statusBadge(h.status)}</td>
            <td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f3f4f6;">${h.initiatedByName ?? '—'}</td>
            <td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f3f4f6;">${h.lockedAt ? new Date(h.lockedAt).toLocaleString() : '—'}</td>
        </tr>
    `).join('');

    return `
        <div style="padding:2rem;max-width:960px;margin:0 auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
                <div>
                    <h1 style="margin:0 0 0.25rem;font-size:1.5rem;">Database Lock</h1>
                    <p style="margin:0;color:#6b7280;font-size:0.9rem;">ICH GCP E6(R3) §5.5.7 — Dual-signature electronic database lock workflow</p>
                </div>
                <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                    ${checkBtn}
                    ${initiateBtn}
                </div>
            </div>

            ${lockedBanner}
            ${checkResults}
            ${current ? renderCurrentLock(current, role) : '<p style="color:#6b7280;margin-bottom:1.5rem;">No active lock request.</p>'}

            ${historyRows ? `
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <div style="padding:0.75rem 1rem;background:#f9fafb;font-weight:600;font-size:0.9rem;">Lock History</div>
                <table style="width:100%;border-collapse:collapse;">
                    <thead><tr style="background:#f9fafb;">
                        <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Date</th>
                        <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Status</th>
                        <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Initiated By</th>
                        <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Locked At</th>
                    </tr></thead>
                    <tbody>${historyRows}</tbody>
                </table>
            </div>` : ''}
        </div>

        ${renderSignatureModal()}
        ${renderInitiateModal()}
    `;
}

function renderSignatureModal() {
    return `
        <div id="dbl-sig-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
             z-index:10000;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:12px;padding:2rem;max-width:480px;width:90%;
                        box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <h2 id="dbl-sig-title" style="margin:0 0 0.5rem;font-size:1.2rem;">Electronic Signature</h2>
                <p style="margin:0 0 0.25rem;color:#6b7280;font-size:0.9rem;">
                    21 CFR Part 11 §11.100 — Re-enter your password to apply your electronic signature.
                </p>
                <p id="dbl-sig-meaning" style="margin:0 0 1rem;font-size:0.85rem;color:#374151;font-style:italic;"></p>
                <div style="margin-bottom:1rem;">
                    <label style="display:block;margin-bottom:0.35rem;font-size:0.9rem;font-weight:500;">Password</label>
                    <input id="dbl-sig-password" type="password" autocomplete="current-password"
                           style="width:100%;padding:0.65rem;border:1px solid #d1d5db;border-radius:8px;
                                  box-sizing:border-box;font-size:0.95rem;" placeholder="Enter your password">
                </div>
                <div id="dbl-sig-error" style="color:#dc2626;font-size:0.88rem;margin-bottom:0.75rem;display:none;"></div>
                <div style="display:flex;gap:0.75rem;">
                    <button id="dbl-sig-cancel"
                            style="flex:1;border:1px solid #d1d5db;background:#fff;border-radius:8px;
                                   padding:0.65rem;cursor:pointer;">Cancel</button>
                    <button id="dbl-sig-submit"
                            style="flex:2;background:#2563eb;color:#fff;border:none;border-radius:8px;
                                   padding:0.65rem;cursor:pointer;font-weight:600;">Apply Signature</button>
                </div>
            </div>
        </div>
    `;
}

function renderInitiateModal() {
    return `
        <div id="dbl-initiate-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
             z-index:10000;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:12px;padding:2rem;max-width:500px;width:90%;
                        box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <h2 style="margin:0 0 0.5rem;font-size:1.2rem;">Initiate Database Lock</h2>
                <p style="margin:0 0 1rem;color:#6b7280;font-size:0.9rem;">
                    Per ICH GCP E6(R3) §5.5.7, all pre-lock compliance checks must pass.
                    This action will run automated checks and begin the dual-signature process.
                </p>
                <div style="margin-bottom:1rem;">
                    <label style="display:block;margin-bottom:0.35rem;font-size:0.9rem;font-weight:500;">
                        Notes (optional)
                    </label>
                    <textarea id="dbl-initiate-notes" rows="3"
                              style="width:100%;padding:0.65rem;border:1px solid #d1d5db;border-radius:8px;
                                     box-sizing:border-box;font-size:0.9rem;resize:vertical;"
                              placeholder="Add context about this database lock request…"></textarea>
                </div>
                <div id="dbl-initiate-error" style="color:#dc2626;font-size:0.88rem;margin-bottom:0.75rem;display:none;"></div>
                <div style="display:flex;gap:0.75rem;">
                    <button id="dbl-initiate-cancel"
                            style="flex:1;border:1px solid #d1d5db;background:#fff;border-radius:8px;
                                   padding:0.65rem;cursor:pointer;">Cancel</button>
                    <button id="dbl-initiate-submit"
                            style="flex:2;background:#059669;color:#fff;border:none;border-radius:8px;
                                   padding:0.65rem;cursor:pointer;font-weight:600;">Run Checks &amp; Initiate</button>
                </div>
            </div>
        </div>
    `;
}

function showSigModal(title, meaning) {
    const modal = document.getElementById('dbl-sig-modal');
    document.getElementById('dbl-sig-title').textContent = title;
    document.getElementById('dbl-sig-meaning').textContent = meaning;
    document.getElementById('dbl-sig-password').value = '';
    document.getElementById('dbl-sig-error').style.display = 'none';
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('dbl-sig-password').focus(), 50);
}

function hideSigModal() {
    document.getElementById('dbl-sig-modal').style.display = 'none';
}

function attachDblockEvents(container, statusData, role) {
    const { current } = statusData;

    // Run pre-lock checks
    document.getElementById('btn-run-checks')?.addEventListener('click', async () => {
        const resultsDiv = document.getElementById('dbl-check-results');
        resultsDiv.innerHTML = '<p style="color:#6b7280;padding:0.5rem 0;">Running compliance checks…</p>';
        try {
            const result = await api.runDblockChecks();
            resultsDiv.innerHTML = renderPreChecks(result);
        } catch (err) {
            resultsDiv.innerHTML = `<p style="color:#dc2626;">Error: ${err.message}</p>`;
        }
    });

    // Initiate DBL
    document.getElementById('btn-initiate-dbl')?.addEventListener('click', () => {
        const modal = document.getElementById('dbl-initiate-modal');
        document.getElementById('dbl-initiate-notes').value = '';
        document.getElementById('dbl-initiate-error').style.display = 'none';
        modal.style.display = 'flex';
    });
    document.getElementById('dbl-initiate-cancel')?.addEventListener('click', () => {
        document.getElementById('dbl-initiate-modal').style.display = 'none';
    });
    document.getElementById('dbl-initiate-submit')?.addEventListener('click', async () => {
        const notes = document.getElementById('dbl-initiate-notes').value.trim();
        const errEl = document.getElementById('dbl-initiate-error');
        errEl.style.display = 'none';
        try {
            await api.initiateDblock(notes);
            showToast('Database lock process initiated', 'success');
            document.getElementById('dbl-initiate-modal').style.display = 'none';
            // Reload
            const el = document.getElementById('app-content') || container;
            renderDblock(el);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
        }
    });

    // CRA signature
    let sigMode = null;
    document.getElementById('btn-sign-cra')?.addEventListener('click', () => {
        sigMode = 'cra';
        showSigModal(
            'CRA Electronic Signature',
            'I confirm that I have reviewed this database lock request and that all pre-lock conditions are satisfied per ICH GCP E6(R3) §5.5.7.'
        );
    });

    // Admin signature
    document.getElementById('btn-sign-admin')?.addEventListener('click', () => {
        sigMode = 'admin';
        showSigModal(
            'Administrator Electronic Signature — Final Lock',
            'I approve the database lock and confirm that the study database is complete, accurate, and ready for statistical analysis.'
        );
    });

    document.getElementById('dbl-sig-cancel')?.addEventListener('click', hideSigModal);
    document.getElementById('dbl-sig-submit')?.addEventListener('click', async () => {
        const password = document.getElementById('dbl-sig-password').value;
        const errEl = document.getElementById('dbl-sig-error');
        errEl.style.display = 'none';
        if (!password) {
            errEl.textContent = 'Password is required for electronic signature.';
            errEl.style.display = 'block';
            return;
        }
        try {
            if (sigMode === 'cra') {
                await api.signDblockCRA(current.id, password);
                showToast('CRA signature applied', 'success');
            } else {
                await api.signDblockAdmin(current.id, password);
                showToast('Database locked successfully', 'success');
            }
            hideSigModal();
            const el = document.getElementById('app-content') || container;
            renderDblock(el);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
        }
    });
}
