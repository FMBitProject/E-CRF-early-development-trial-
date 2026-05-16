import { api } from './api.js';

// ── Render Security Settings modal ──────────────────────────────────────────
export async function renderSecuritySettings() {
    const existing = document.getElementById('security-modal-overlay');
    if (existing) { existing.remove(); return; }

    const overlay = document.createElement('div');
    overlay.id = 'security-modal-overlay';
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm';
    overlay.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" id="security-modal">
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background-color:#0A2E5C">
                        <i data-lucide="shield" class="w-4 h-4 text-white"></i>
                    </div>
                    <h2 class="text-base font-bold text-slate-900">Account Security</h2>
                </div>
                <button id="security-modal-close" class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div id="security-modal-body" class="p-6">
                <div class="flex items-center justify-center py-8">
                    <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        </div>`;

    document.body.appendChild(overlay);
    lucide.createIcons();

    document.getElementById('security-modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    await loadSecurityView();
}

async function loadSecurityView() {
    const body = document.getElementById('security-modal-body');
    if (!body) return;

    try {
        const res = await fetch('/api/mfa/totp/status', { credentials: 'include' });
        const data = await res.json();
        renderStatusView(data);
    } catch {
        body.innerHTML = `<p class="text-sm text-red-600 text-center">Failed to load security settings.</p>`;
    }
}

function renderStatusView(status) {
    const body = document.getElementById('security-modal-body');
    if (!body) return;

    if (status.enabled) {
        body.innerHTML = `
            <div class="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg mb-5">
                <i data-lucide="shield-check" class="w-5 h-5 text-green-600 flex-shrink-0"></i>
                <div>
                    <p class="text-sm font-semibold text-green-800">Authenticator App Active</p>
                    <p class="text-xs text-green-600 mt-0.5">Enabled ${status.enabledAt ? new Date(status.enabledAt).toLocaleDateString() : ''}</p>
                </div>
            </div>

            <div class="space-y-3 mb-5">
                <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-600">Backup codes remaining</span>
                    <span class="font-mono font-semibold ${status.backupCodesRemaining <= 2 ? 'text-red-600' : 'text-slate-800'}">${status.backupCodesRemaining} / 8</span>
                </div>
            </div>

            ${status.backupCodesRemaining <= 2 ? `
            <div class="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-5 text-xs text-amber-800">
                <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500"></i>
                <span>You are running low on backup codes. Disable and re-enable 2FA to generate new ones.</span>
            </div>` : ''}

            <div class="border-t border-slate-100 pt-4">
                <p class="text-xs text-slate-500 mb-3">To disable 2FA, enter your current authenticator code:</p>
                <div class="flex gap-2">
                    <input type="text" id="disable-totp-code" inputmode="numeric" maxlength="7" placeholder="000 000"
                        class="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm font-mono tracking-widest text-center focus:border-blue-400 outline-none transition">
                    <button id="disable-totp-btn"
                        class="px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-md hover:bg-red-100 transition">
                        Disable
                    </button>
                </div>
                <p id="disable-error" class="text-xs text-red-600 mt-1.5 hidden"></p>
            </div>`;

        lucide.createIcons();

        // Auto-format TOTP input
        document.getElementById('disable-totp-code').addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '').slice(0, 6);
            this.value = v.length > 3 ? v.slice(0, 3) + ' ' + v.slice(3) : v;
        });

        document.getElementById('disable-totp-btn').addEventListener('click', async () => {
            const code = document.getElementById('disable-totp-code').value.replace(/\s/g, '');
            const errEl = document.getElementById('disable-error');
            errEl.classList.add('hidden');
            if (!code) { errEl.textContent = 'Enter your current authenticator code.'; errEl.classList.remove('hidden'); return; }

            const btn = document.getElementById('disable-totp-btn');
            btn.disabled = true;
            btn.textContent = 'Disabling…';

            try {
                const res = await fetch('/api/mfa/totp/disable', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ totpCode: code }),
                });
                const data = await res.json();
                if (!res.ok) {
                    errEl.textContent = data.error || 'Invalid code.';
                    errEl.classList.remove('hidden');
                    btn.disabled = false;
                    btn.textContent = 'Disable';
                    return;
                }
                await loadSecurityView();
            } catch {
                errEl.textContent = 'Request failed.';
                errEl.classList.remove('hidden');
                btn.disabled = false;
                btn.textContent = 'Disable';
            }
        });

    } else {
        body.innerHTML = `
            <div class="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg mb-5">
                <i data-lucide="shield-off" class="w-5 h-5 text-slate-400 flex-shrink-0"></i>
                <div>
                    <p class="text-sm font-semibold text-slate-700">Two-Factor Authentication Off</p>
                    <p class="text-xs text-slate-500 mt-0.5">Add an extra layer of security to your account</p>
                </div>
            </div>

            <p class="text-xs text-slate-500 mb-4 leading-relaxed">
                Enable 2FA using an authenticator app such as <strong>Google Authenticator</strong>, <strong>Authy</strong>, or <strong>Microsoft Authenticator</strong>. You will also receive 8 one-time backup codes to store safely.
            </p>

            <button id="start-totp-setup"
                class="w-full flex items-center justify-center gap-2 btn-primary py-2.5 text-sm rounded-md">
                <i data-lucide="smartphone" class="w-4 h-4"></i>
                Set Up Authenticator App
            </button>`;

        lucide.createIcons();

        document.getElementById('start-totp-setup').addEventListener('click', async () => {
            const btn = document.getElementById('start-totp-setup');
            btn.disabled = true;
            btn.innerHTML = `<div class="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div><span>Generating…</span>`;

            try {
                const res = await fetch('/api/mfa/totp/setup', {
                    method: 'POST',
                    credentials: 'include',
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                renderSetupView(data);
            } catch (err) {
                btn.disabled = false;
                btn.innerHTML = `<i data-lucide="smartphone" class="w-4 h-4"></i> Set Up Authenticator App`;
                lucide.createIcons();
                body.insertAdjacentHTML('afterbegin', `
                    <div class="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">${err.message}</div>`);
            }
        });
    }
}

function renderSetupView({ secret, qrDataUrl }) {
    const body = document.getElementById('security-modal-body');
    if (!body) return;

    body.innerHTML = `
        <div class="text-center mb-4">
            <p class="text-sm font-semibold text-slate-800 mb-1">Scan with your authenticator app</p>
            <p class="text-xs text-slate-500 mb-4">Then enter the 6-digit code to confirm setup</p>
            <img src="${qrDataUrl}" alt="QR Code" class="mx-auto rounded-lg border border-slate-200 w-[200px] h-[200px]">
        </div>

        <details class="mb-4">
            <summary class="text-xs text-slate-500 cursor-pointer hover:text-slate-700">Can't scan? Enter code manually</summary>
            <div class="mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md">
                <p class="text-xs text-slate-500 mb-1">Account: <strong>E-CRF System</strong></p>
                <p class="font-mono text-xs text-slate-800 tracking-widest break-all">${secret}</p>
            </div>
        </details>

        <div class="space-y-3">
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Authenticator Code</label>
                <input type="text" id="enable-totp-code" inputmode="numeric" maxlength="7" placeholder="000 000"
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-md text-xl font-mono tracking-[0.3em] text-center focus:border-blue-400 outline-none transition">
            </div>
            <p id="setup-error" class="text-xs text-red-600 hidden"></p>
            <div class="flex gap-2">
                <button id="cancel-setup" class="flex-1 py-2.5 text-sm border border-slate-300 text-slate-600 rounded-md hover:bg-slate-50 transition">Cancel</button>
                <button id="enable-totp-btn" class="flex-1 flex items-center justify-center gap-2 btn-primary py-2.5 text-sm rounded-md">
                    <i data-lucide="check" class="w-4 h-4"></i> Enable 2FA
                </button>
            </div>
        </div>`;

    lucide.createIcons();

    document.getElementById('enable-totp-code').addEventListener('input', function () {
        let v = this.value.replace(/\D/g, '').slice(0, 6);
        this.value = v.length > 3 ? v.slice(0, 3) + ' ' + v.slice(3) : v;
    });

    document.getElementById('cancel-setup').addEventListener('click', loadSecurityView);

    document.getElementById('enable-totp-btn').addEventListener('click', async () => {
        const code = document.getElementById('enable-totp-code').value.replace(/\s/g, '');
        const errEl = document.getElementById('setup-error');
        errEl.classList.add('hidden');
        if (!code || code.length < 6) {
            errEl.textContent = 'Enter the 6-digit code from your app.';
            errEl.classList.remove('hidden');
            return;
        }

        const btn = document.getElementById('enable-totp-btn');
        btn.disabled = true;
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div><span>Enabling…</span>`;

        try {
            const res = await fetch('/api/mfa/totp/enable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ totpCode: code }),
            });
            const data = await res.json();
            if (!res.ok) {
                errEl.textContent = data.error || 'Invalid code. Try again.';
                errEl.classList.remove('hidden');
                btn.disabled = false;
                btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Enable 2FA`;
                lucide.createIcons();
                return;
            }
            renderBackupCodesView(data.backupCodes);
        } catch {
            errEl.textContent = 'Request failed.';
            errEl.classList.remove('hidden');
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Enable 2FA`;
            lucide.createIcons();
        }
    });

    setTimeout(() => document.getElementById('enable-totp-code')?.focus(), 60);
}

function renderBackupCodesView(codes) {
    const body = document.getElementById('security-modal-body');
    if (!body) return;

    body.innerHTML = `
        <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                <i data-lucide="check" class="w-4 h-4 text-white"></i>
            </div>
            <div>
                <p class="text-sm font-bold text-slate-900">2FA Enabled Successfully</p>
                <p class="text-xs text-slate-500">Save your backup codes in a safe place</p>
            </div>
        </div>

        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p class="text-xs text-amber-800 font-semibold mb-1 flex items-center gap-1">
                <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> Store these codes safely
            </p>
            <p class="text-xs text-amber-700">Each code can only be used once. If you lose your authenticator device, use one of these to sign in.</p>
        </div>

        <div class="grid grid-cols-2 gap-1.5 mb-4 font-mono text-sm">
            ${codes.map(c => `
                <div class="px-3 py-1.5 bg-slate-100 rounded text-center text-slate-800 tracking-widest">${c}</div>
            `).join('')}
        </div>

        <button id="copy-backup-codes" class="w-full flex items-center justify-center gap-2 py-2 text-sm border border-slate-300 text-slate-600 rounded-md hover:bg-slate-50 transition mb-3">
            <i data-lucide="copy" class="w-4 h-4"></i> Copy Codes
        </button>
        <button id="done-backup" class="w-full btn-primary py-2.5 text-sm rounded-md">Done</button>`;

    lucide.createIcons();

    document.getElementById('copy-backup-codes').addEventListener('click', async function () {
        await navigator.clipboard.writeText(codes.join('\n'));
        this.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Copied!`;
        lucide.createIcons();
        setTimeout(() => {
            this.innerHTML = `<i data-lucide="copy" class="w-4 h-4"></i> Copy Codes`;
            lucide.createIcons();
        }, 2000);
    });

    document.getElementById('done-backup').addEventListener('click', loadSecurityView);
}
