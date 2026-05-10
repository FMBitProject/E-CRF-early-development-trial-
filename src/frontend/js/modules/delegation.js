// Delegation Log & Training Records — ICH GCP E6(R3) §4.1.5 + §8.3

import { api } from './api.js';
import { showToast } from './utils.js';

const TASK_OPTIONS = [
    'Data Entry', 'Query Resolution', 'Source Data Verification',
    'Adverse Event Reporting', 'Protocol Deviation Management',
    'Informed Consent Process', 'Randomization', 'Sample Collection',
    'Study Drug Accountability', 'Subject Follow-up',
];

const TRAINING_TYPES = [
    'GCP Training', 'Protocol Training', 'EDC System Training',
    'Safety Reporting Training', 'CDISC Standards Training',
    'Informed Consent Training', 'Local Regulatory Training',
];

export async function renderDelegation(container) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:3rem;">
        <span style="color:#6b7280;">Loading delegation log…</span></div>`;

    const user = api.getCurrentUser();
    const role = user?.role ?? '';

    if (!['admin', 'cra'].includes(role)) {
        container.innerHTML = `<div style="padding:2rem;color:#dc2626;text-align:center;">
            Access restricted to administrators and CRA monitors.</div>`;
        return;
    }

    const [delegations, trainings, expiring, users] = await Promise.all([
        api.getDelegations().catch(() => []),
        api.getTrainingRecords().catch(() => []),
        api.getExpiringTrainings(30).catch(() => []),
        api.getSecurityUsers().catch(() => []),
    ]);

    container.innerHTML = renderDelegationPage(delegations, trainings, expiring, users, role);
    attachDelegationEvents(container, delegations, trainings, users, role);
}

function renderDelegationPage(delegations, trainings, expiring, users, role) {
    const expiringAlert = expiring.length > 0 ? `
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;
                    padding:1rem 1.25rem;margin-bottom:1.5rem;display:flex;gap:0.75rem;align-items:flex-start;">
            <span style="font-size:1.25rem;">⚠️</span>
            <div>
                <strong>${expiring.length} training record${expiring.length !== 1 ? 's' : ''} expiring within 30 days</strong>
                <div style="margin-top:0.35rem;font-size:0.85rem;color:#92400e;">
                    ${expiring.map(t => `${t.userName} — ${t.trainingType} expires ${new Date(t.expiryDate).toLocaleDateString()}`).join('<br>')}
                </div>
            </div>
        </div>` : '';

    return `
        <div style="padding:2rem;max-width:1100px;margin:0 auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
                <div>
                    <h1 style="margin:0 0 0.25rem;font-size:1.5rem;">Delegation Log &amp; Training</h1>
                    <p style="margin:0;color:#6b7280;font-size:0.9rem;">ICH GCP E6(R3) §4.1.5 — Site staff task delegation &amp; §8.3 — Training documentation</p>
                </div>
                <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                    <button id="btn-add-training" style="background:#2563eb;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.25rem;cursor:pointer;font-size:0.9rem;">
                        + Add Training Record
                    </button>
                    <button id="btn-add-delegation" style="background:#059669;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.25rem;cursor:pointer;font-size:0.9rem;">
                        + Add Delegation Entry
                    </button>
                </div>
            </div>

            ${expiringAlert}

            <!-- Delegation Log -->
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:2rem;">
                <div style="padding:0.75rem 1rem;background:#f9fafb;display:flex;align-items:center;justify-content:space-between;">
                    <span style="font-weight:600;font-size:0.95rem;">Delegation Log</span>
                    <span style="font-size:0.8rem;color:#6b7280;">${delegations.length} entries</span>
                </div>
                ${delegations.length === 0
                    ? '<p style="padding:2rem;text-align:center;color:#6b7280;margin:0;">No delegation entries yet.</p>'
                    : `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:#f9fafb;">
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Staff Member</th>
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Role</th>
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Delegated Tasks</th>
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Period</th>
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Status</th>
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Signature</th>
                        </tr></thead>
                        <tbody>
                            ${delegations.map(d => renderDelegationRow(d)).join('')}
                        </tbody>
                    </table></div>`
                }
            </div>

            <!-- Training Records -->
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <div style="padding:0.75rem 1rem;background:#f9fafb;display:flex;align-items:center;justify-content:space-between;">
                    <span style="font-weight:600;font-size:0.95rem;">Training Records</span>
                    <span style="font-size:0.8rem;color:#6b7280;">${trainings.length} records</span>
                </div>
                ${trainings.length === 0
                    ? '<p style="padding:2rem;text-align:center;color:#6b7280;margin:0;">No training records yet.</p>'
                    : `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:#f9fafb;">
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Staff Member</th>
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Training Type</th>
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Date</th>
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Expiry</th>
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Certificate</th>
                        </tr></thead>
                        <tbody>
                            ${trainings.map(t => renderTrainingRow(t)).join('')}
                        </tbody>
                    </table></div>`
                }
            </div>
        </div>

            <!-- User Management -->
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-top:2rem;">
                <div style="padding:0.75rem 1rem;background:#f9fafb;display:flex;align-items:center;justify-content:space-between;">
                    <span style="font-weight:600;font-size:0.95rem;">User Management</span>
                    <span style="font-size:0.8rem;color:#6b7280;">${users.length} accounts</span>
                </div>
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:#f9fafb;">
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Name</th>
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Email</th>
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Role</th>
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;">Joined</th>
                            <th style="padding:0.6rem 0.75rem;text-align:left;font-size:0.8rem;color:#6b7280;"></th>
                        </tr></thead>
                        <tbody>
                            ${users.map(u => `
                            <tr>
                                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-weight:500;">${u.name}</td>
                                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:0.88rem;">${u.email}</td>
                                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;text-transform:capitalize;font-size:0.88rem;">${u.role}</td>
                                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-size:0.85rem;color:#9ca3af;">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                                <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;text-align:right;">
                                    <button class="btn-delete-user" data-id="${u.id}" data-name="${u.name}"
                                        style="background:#fee2e2;color:#dc2626;border:none;border-radius:6px;
                                               padding:0.3rem 0.75rem;cursor:pointer;font-size:0.8rem;font-weight:500;">
                                        Delete
                                    </button>
                                </td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        ${renderDeleteUserModal()}
        ${renderDelegationModal(users)}
        ${renderTrainingModal(users)}
    `;
}

function renderDelegationRow(d) {
    const statusColor = d.status === 'Active' ? '#16a34a' : '#6b7280';
    const tasks = Array.isArray(d.delegatedTasks) ? d.delegatedTasks : [];
    const period = [
        new Date(d.delegationStart).toLocaleDateString(),
        d.delegationEnd ? `– ${new Date(d.delegationEnd).toLocaleDateString()}` : '(ongoing)',
    ].join(' ');

    return `
        <tr>
            <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-weight:500;">${d.userName}</td>
            <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;color:#6b7280;text-transform:capitalize;">${d.userRole}</td>
            <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;">
                <div style="display:flex;flex-wrap:wrap;gap:0.3rem;">
                    ${tasks.map(t => `<span style="background:#eff6ff;color:#2563eb;padding:0.15rem 0.5rem;border-radius:4px;font-size:0.78rem;">${t}</span>`).join('')}
                </div>
            </td>
            <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-size:0.88rem;">${period}</td>
            <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;">
                <span style="color:${statusColor};font-weight:600;font-size:0.85rem;">${d.status}</span>
            </td>
            <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-size:0.85rem;">
                ${d.signedAt ? `✓ ${d.signedByName}<br><span style="color:#9ca3af;">${new Date(d.signedAt).toLocaleDateString()}</span>` : '<span style="color:#f59e0b;">⏳ Pending</span>'}
            </td>
        </tr>
    `;
}

function renderTrainingRow(t) {
    const expired = t.expiryDate && new Date(t.expiryDate) < new Date();
    const expiringSoon = t.expiryDate && !expired &&
        (new Date(t.expiryDate) - new Date()) < 30 * 86400000;
    const expiryColor = expired ? '#dc2626' : expiringSoon ? '#d97706' : '#374151';

    return `
        <tr>
            <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-weight:500;">${t.userName}</td>
            <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;">${t.trainingType}</td>
            <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-size:0.88rem;">${new Date(t.trainingDate).toLocaleDateString()}</td>
            <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-size:0.88rem;color:${expiryColor};">
                ${t.expiryDate ? new Date(t.expiryDate).toLocaleDateString() + (expired ? ' ⚠ EXPIRED' : expiringSoon ? ' ⚠ Soon' : '') : '—'}
            </td>
            <td style="padding:0.7rem 0.75rem;border-bottom:1px solid #f3f4f6;font-size:0.85rem;color:#6b7280;">${t.certificateRef ?? '—'}</td>
        </tr>
    `;
}

function renderDeleteUserModal() {
    return `
        <div id="delete-user-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
             z-index:10000;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:12px;padding:2rem;max-width:440px;width:90%;
                        box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <h2 style="margin:0 0 0.5rem;font-size:1.1rem;color:#dc2626;">Delete User Account</h2>
                <p style="margin:0 0 1rem;color:#6b7280;font-size:0.9rem;">
                    Deleting <strong id="delete-user-name"></strong> is permanent and cannot be undone.
                    All sessions will be invalidated immediately.
                </p>
                <div style="margin-bottom:1rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Reason for deletion *</label>
                    <input id="delete-user-reason" type="text"
                           style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;font-size:0.9rem;"
                           placeholder="e.g. Test account — not a real study participant">
                </div>
                <div id="delete-user-error" style="color:#dc2626;font-size:0.88rem;margin-bottom:0.75rem;display:none;"></div>
                <div style="display:flex;gap:0.75rem;">
                    <button id="delete-user-cancel"
                            style="flex:1;border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:0.65rem;cursor:pointer;">
                        Cancel
                    </button>
                    <button id="delete-user-confirm"
                            style="flex:2;background:#dc2626;color:#fff;border:none;border-radius:8px;padding:0.65rem;cursor:pointer;font-weight:600;">
                        Delete Permanently
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderDelegationModal(users) {
    const userOptions = users.map(u =>
        `<option value="${u.id}">${u.name} (${u.role})</option>`
    ).join('');

    const taskCheckboxes = TASK_OPTIONS.map(t =>
        `<label style="display:flex;align-items:center;gap:0.5rem;font-size:0.9rem;margin-bottom:0.35rem;">
            <input type="checkbox" value="${t}" name="del-task"> ${t}
        </label>`
    ).join('');

    return `
        <div id="delegation-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
             z-index:10000;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:12px;padding:2rem;max-width:560px;width:90%;
                        max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <h2 style="margin:0 0 1rem;font-size:1.15rem;">Add Delegation Entry</h2>

                <div style="margin-bottom:0.85rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Staff Member *</label>
                    <select id="del-user-id" style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                        <option value="">Select staff member…</option>
                        ${userOptions}
                    </select>
                </div>

                <div style="margin-bottom:0.85rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Delegated Tasks *</label>
                    <div style="border:1px solid #d1d5db;border-radius:8px;padding:0.75rem;max-height:180px;overflow-y:auto;">
                        ${taskCheckboxes}
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.85rem;">
                    <div>
                        <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Start Date *</label>
                        <input id="del-start" type="date" style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">End Date</label>
                        <input id="del-end" type="date" style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;">
                    </div>
                </div>

                <div style="margin-bottom:1rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Notes</label>
                    <textarea id="del-notes" rows="2"
                              style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;
                                     box-sizing:border-box;resize:vertical;font-size:0.9rem;"></textarea>
                </div>

                <div id="del-error" style="color:#dc2626;font-size:0.88rem;margin-bottom:0.75rem;display:none;"></div>

                <div style="display:flex;gap:0.75rem;">
                    <button id="del-cancel" style="flex:1;border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:0.65rem;cursor:pointer;">Cancel</button>
                    <button id="del-submit" style="flex:2;background:#059669;color:#fff;border:none;border-radius:8px;padding:0.65rem;cursor:pointer;font-weight:600;">Save Entry</button>
                </div>
            </div>
        </div>
    `;
}

function renderTrainingModal(users) {
    const userOptions = users.map(u =>
        `<option value="${u.id}">${u.name} (${u.role})</option>`
    ).join('');

    const typeOptions = TRAINING_TYPES.map(t =>
        `<option value="${t}">${t}</option>`
    ).join('');

    return `
        <div id="training-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
             z-index:10000;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:12px;padding:2rem;max-width:480px;width:90%;
                        box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <h2 style="margin:0 0 1rem;font-size:1.15rem;">Add Training Record</h2>

                <div style="margin-bottom:0.85rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Staff Member *</label>
                    <select id="tr-user-id" style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                        <option value="">Select staff member…</option>
                        ${userOptions}
                    </select>
                </div>

                <div style="margin-bottom:0.85rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Training Type *</label>
                    <select id="tr-type" style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                        <option value="">Select type…</option>
                        ${typeOptions}
                    </select>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.85rem;">
                    <div>
                        <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Training Date *</label>
                        <input id="tr-date" type="date" style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Expiry Date</label>
                        <input id="tr-expiry" type="date" style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;">
                    </div>
                </div>

                <div style="margin-bottom:0.85rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Certificate Reference</label>
                    <input id="tr-cert" type="text"
                           style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;font-size:0.9rem;"
                           placeholder="e.g. CERT-2024-001">
                </div>

                <div style="margin-bottom:1rem;">
                    <label style="display:block;margin-bottom:0.3rem;font-size:0.9rem;font-weight:500;">Notes</label>
                    <textarea id="tr-notes" rows="2"
                              style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:8px;
                                     box-sizing:border-box;resize:vertical;font-size:0.9rem;"></textarea>
                </div>

                <div id="tr-error" style="color:#dc2626;font-size:0.88rem;margin-bottom:0.75rem;display:none;"></div>

                <div style="display:flex;gap:0.75rem;">
                    <button id="tr-cancel" style="flex:1;border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:0.65rem;cursor:pointer;">Cancel</button>
                    <button id="tr-submit" style="flex:2;background:#2563eb;color:#fff;border:none;border-radius:8px;padding:0.65rem;cursor:pointer;font-weight:600;">Save Record</button>
                </div>
            </div>
        </div>
    `;
}

function attachDelegationEvents(container, _delegations, _trainings, _users, _role) {
    // Delegation modal
    document.getElementById('btn-add-delegation')?.addEventListener('click', () => {
        document.getElementById('delegation-modal').style.display = 'flex';
    });
    document.getElementById('del-cancel')?.addEventListener('click', () => {
        document.getElementById('delegation-modal').style.display = 'none';
    });
    document.getElementById('del-submit')?.addEventListener('click', async () => {
        const userId = document.getElementById('del-user-id').value;
        const tasks = [...document.querySelectorAll('input[name="del-task"]:checked')].map(cb => cb.value);
        const delegationStart = document.getElementById('del-start').value;
        const delegationEnd = document.getElementById('del-end').value;
        const notes = document.getElementById('del-notes').value.trim();
        const errEl = document.getElementById('del-error');
        errEl.style.display = 'none';

        if (!userId || !tasks.length || !delegationStart) {
            errEl.textContent = 'Staff member, at least one task, and start date are required.';
            errEl.style.display = 'block';
            return;
        }
        try {
            await api.createDelegation({ userId, delegatedTasks: tasks, delegationStart, delegationEnd: delegationEnd || null, notes });
            showToast('Delegation entry saved', 'success');
            document.getElementById('delegation-modal').style.display = 'none';
            renderDelegation(container);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
        }
    });

    // Training modal
    document.getElementById('btn-add-training')?.addEventListener('click', () => {
        document.getElementById('training-modal').style.display = 'flex';
    });
    document.getElementById('tr-cancel')?.addEventListener('click', () => {
        document.getElementById('training-modal').style.display = 'none';
    });
    document.getElementById('tr-submit')?.addEventListener('click', async () => {
        const userId = document.getElementById('tr-user-id').value;
        const trainingType = document.getElementById('tr-type').value;
        const trainingDate = document.getElementById('tr-date').value;
        const expiryDate = document.getElementById('tr-expiry').value;
        const certificateRef = document.getElementById('tr-cert').value.trim();
        const notes = document.getElementById('tr-notes').value.trim();
        const errEl = document.getElementById('tr-error');
        errEl.style.display = 'none';

        if (!userId || !trainingType || !trainingDate) {
            errEl.textContent = 'Staff member, training type, and date are required.';
            errEl.style.display = 'block';
            return;
        }
        try {
            await api.createTrainingRecord({ userId, trainingType, trainingDate, expiryDate: expiryDate || null, certificateRef: certificateRef || null, notes: notes || null });
            showToast('Training record saved', 'success');
            document.getElementById('training-modal').style.display = 'none';
            renderDelegation(container);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
        }
    });

    // Delete user buttons
    let pendingDeleteId = null;
    container.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingDeleteId = btn.dataset.id;
            document.getElementById('delete-user-name').textContent = btn.dataset.name;
            document.getElementById('delete-user-reason').value = '';
            document.getElementById('delete-user-error').style.display = 'none';
            document.getElementById('delete-user-modal').style.display = 'flex';
        });
    });
    document.getElementById('delete-user-cancel')?.addEventListener('click', () => {
        document.getElementById('delete-user-modal').style.display = 'none';
        pendingDeleteId = null;
    });
    document.getElementById('delete-user-confirm')?.addEventListener('click', async () => {
        const reason = document.getElementById('delete-user-reason').value.trim();
        const errEl = document.getElementById('delete-user-error');
        errEl.style.display = 'none';
        if (!reason) {
            errEl.textContent = 'Reason is required.';
            errEl.style.display = 'block';
            return;
        }
        try {
            await api.deleteUser(pendingDeleteId, reason);
            showToast('User deleted successfully', 'success');
            document.getElementById('delete-user-modal').style.display = 'none';
            pendingDeleteId = null;
            renderDelegation(container);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
        }
    });
}
