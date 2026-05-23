// SOP Acknowledgment modal — ICH GCP E6(R3) C.4.1, §5.5.2
import { api } from './api.js';
import { showToast } from './utils.js';

let _pendingAgreements = [];
let _currentIndex = 0;

export async function checkAndShowAgreements() {
    try {
        const { pending } = await api.getRequiredAgreements();
        if (!pending.length) return true; // all agreed

        _pendingAgreements = pending;
        _currentIndex = 0;
        return new Promise(resolve => showAgreementModal(resolve));
    } catch {
        return true; // non-fatal — allow access if check fails
    }
}

function showAgreementModal(resolve) {
    const agreement = _pendingAgreements[_currentIndex];
    if (!agreement) { resolve(true); return; }

    const existing = document.getElementById('agreement-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'agreement-modal-overlay';
    overlay.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:99990',
        'background:rgba(0,0,0,0.7)', 'display:flex',
        'align-items:center', 'justify-content:center', 'padding:1rem',
    ].join(';');

    overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:640px;width:100%;max-height:90vh;
                display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.35);">
      <div style="padding:1.5rem 1.75rem 1rem;border-bottom:1px solid #e2e8f0;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
          <div style="width:36px;height:36px;border-radius:8px;background:#3b82f6;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <p style="font-weight:700;font-size:1rem;color:#1e293b;margin:0;">Agreement Required</p>
            <p style="font-size:0.75rem;color:#64748b;margin:0;">
              ${_currentIndex + 1} of ${_pendingAgreements.length} — ICH GCP E6(R3) C.4.1
            </p>
          </div>
        </div>
        <h3 style="font-size:0.95rem;font-weight:600;color:#1e40af;margin:0;">${agreement.title}</h3>
      </div>

      <div id="agreement-content" style="flex:1;overflow-y:auto;padding:1.5rem 1.75rem;font-size:0.875rem;color:#334155;line-height:1.6;">
        <p style="color:#94a3b8;text-align:center;padding:2rem 0;">Loading…</p>
      </div>

      <div style="padding:1rem 1.75rem;border-top:1px solid #e2e8f0;background:#f8fafc;border-radius:0 0 14px 14px;">
        <label style="display:flex;align-items:flex-start;gap:0.75rem;cursor:pointer;margin-bottom:1rem;">
          <input type="checkbox" id="agreement-checkbox"
                 style="width:18px;height:18px;margin-top:2px;flex-shrink:0;accent-color:#3b82f6;">
          <span style="font-size:0.8rem;color:#475569;line-height:1.5;">
            I have read, understood, and agree to comply with the above agreement.
            I understand this is recorded with a timestamp and my user credentials per ICH GCP E6(R3).
          </span>
        </label>
        <div style="display:flex;justify-content:flex-end;gap:0.75rem;">
          <button id="agreement-logout-btn"
                  style="padding:0.5rem 1.25rem;border-radius:7px;border:1px solid #cbd5e1;
                         background:#fff;color:#64748b;font-size:0.85rem;cursor:pointer;">
            Logout
          </button>
          <button id="agreement-accept-btn" disabled
                  style="padding:0.5rem 1.5rem;border-radius:7px;border:none;
                         background:#94a3b8;color:#fff;font-size:0.85rem;cursor:not-allowed;
                         font-weight:600;transition:background 0.15s;">
            Accept &amp; Continue
          </button>
        </div>
      </div>
    </div>`;

    document.body.appendChild(overlay);

    // Load agreement text
    api.getAgreementText(agreement.type).then(({ html }) => {
        const el = document.getElementById('agreement-content');
        if (el) el.innerHTML = html;
    }).catch(() => {
        const el = document.getElementById('agreement-content');
        if (el) el.innerHTML = '<p>Agreement text unavailable. Please contact your system administrator.</p>';
    });

    const checkbox = document.getElementById('agreement-checkbox');
    const acceptBtn = document.getElementById('agreement-accept-btn');

    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            acceptBtn.disabled = false;
            acceptBtn.style.background = '#2563eb';
            acceptBtn.style.cursor = 'pointer';
        } else {
            acceptBtn.disabled = true;
            acceptBtn.style.background = '#94a3b8';
            acceptBtn.style.cursor = 'not-allowed';
        }
    });

    document.getElementById('agreement-logout-btn').addEventListener('click', () => {
        overlay.remove();
        api.logout();
    });

    acceptBtn.addEventListener('click', async () => {
        if (acceptBtn.disabled) return;
        acceptBtn.disabled = true;
        acceptBtn.textContent = 'Saving…';
        try {
            await api.submitAgreement(agreement.type);
            _currentIndex++;
            overlay.remove();
            if (_currentIndex < _pendingAgreements.length) {
                showAgreementModal(resolve);
            } else {
                showToast('Agreements recorded. Welcome.', 'success');
                resolve(true);
            }
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
            acceptBtn.disabled = false;
            acceptBtn.textContent = 'Accept & Continue';
        }
    });
}
