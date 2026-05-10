// 21 CFR Part 11 §11.10(d) — Session timeout with inactivity detection
// ICH GCP E6(R3) Appendix C.4.3 — 30-minute session inactivity limit

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS   =  5 * 60 * 1000; // warn at 25 minutes

let inactivityTimer = null;
let warningTimer    = null;
let warningVisible  = false;
let countdownInterval = null;

// Events that reset the inactivity clock
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

function clearTimers() {
    clearTimeout(inactivityTimer);
    clearTimeout(warningTimer);
    clearInterval(countdownInterval);
}

function removeWarningModal() {
    const el = document.getElementById('session-warning-modal');
    if (el) el.remove();
    warningVisible = false;
}

function showWarningModal(secondsLeft) {
    if (warningVisible) return;
    warningVisible = true;

    const modal = document.createElement('div');
    modal.id = 'session-warning-modal';
    modal.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:99999',
        'display:flex', 'align-items:center', 'justify-content:center',
        'background:rgba(0,0,0,0.6)',
    ].join(';');

    modal.innerHTML = `
        <div style="background:#fff;border-radius:12px;padding:2rem;max-width:420px;width:90%;
                    box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;">
            <div style="font-size:3rem;margin-bottom:1rem;">⏱️</div>
            <h2 style="margin:0 0 0.5rem;color:#b45309;font-size:1.25rem;">Session Expiring Soon</h2>
            <p style="margin:0 0 1rem;color:#4b5563;font-size:0.95rem;">
                Your session will expire due to inactivity in
            </p>
            <div id="session-countdown"
                 style="font-size:2.5rem;font-weight:700;color:#dc2626;margin-bottom:1.25rem;">
                ${secondsLeft}s
            </div>
            <p style="margin:0 0 1.5rem;color:#6b7280;font-size:0.85rem;">
                Per 21 CFR Part 11 §11.10(d), sessions must timeout after 30 minutes of inactivity.
            </p>
            <button id="session-stay-btn"
                    style="background:#2563eb;color:#fff;border:none;border-radius:8px;
                           padding:0.75rem 2rem;font-size:1rem;cursor:pointer;width:100%;">
                Keep me logged in
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('session-stay-btn').addEventListener('click', () => {
        resetInactivityTimer();
    });

    // Start countdown display
    let remaining = secondsLeft;
    countdownInterval = setInterval(() => {
        remaining--;
        const el = document.getElementById('session-countdown');
        if (el) el.textContent = `${remaining}s`;
        if (remaining <= 0) clearInterval(countdownInterval);
    }, 1000);
}

async function logoutAndRedirect() {
    clearTimers();
    removeWarningModal();
    // Call the Better Auth sign-out endpoint
    try {
        await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
    } catch {
        // ignore — still redirect
    }
    window.location.href = '/login.html?reason=timeout';
}

function resetInactivityTimer() {
    removeWarningModal();
    clearTimers();

    // Schedule warning at 25 minutes
    warningTimer = setTimeout(() => {
        showWarningModal(Math.round(WARNING_BEFORE_MS / 1000));
        // Auto-logout when warning expires
        inactivityTimer = setTimeout(logoutAndRedirect, WARNING_BEFORE_MS);
    }, INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS);
}

export function initSessionTimeout() {
    // Bind activity events to reset timer
    ACTIVITY_EVENTS.forEach(ev => {
        document.addEventListener(ev, resetInactivityTimer, { passive: true });
    });

    // Start the initial timer
    resetInactivityTimer();
}

export function destroySessionTimeout() {
    ACTIVITY_EVENTS.forEach(ev => {
        document.removeEventListener(ev, resetInactivityTimer);
    });
    clearTimers();
    removeWarningModal();
}
