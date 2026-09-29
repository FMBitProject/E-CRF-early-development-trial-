# Kode lengkap — perbaikan error handling

Dokumen ini memuat satu blok kode utuh untuk masing-masing dari 31 file sumber/test yang berubah atau ditambahkan, termasuk perbaikan pada tahap sebelumnya. Semua baris yang tidak berubah tetap disertakan. Salin setiap blok ke path yang tertulis di atasnya. File `.env` tidak disertakan.

Temuan MINOR hanya diberi komentar TODO; perubahan perilaku notifikasi MINOR dari tahap sebelumnya sudah dikembalikan. Changelog dan batas cakupan tersedia setelah seluruh blok kode.

## login.html

```html
<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-CRF System — Sign In</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231e3a5f'/%3E%3Cpath d='M10 9h8a5 5 0 0 1 0 10h-8zm2 2v6h6a3 3 0 0 0 0-6z' fill='white'/%3E%3Crect x='10' y='21' width='10' height='2' rx='1' fill='white'/%3E%3C/svg%3E">
    <script src="src/frontend/vendor/tailwind-play.js"></script>
    <script src="src/frontend/vendor/lucide.js"></script>
    <link rel="stylesheet" href="src/frontend/css/style.css">
</head>
<body class="h-full flex">

    <div class="hidden lg:flex lg:w-[55%] login-left flex-col justify-between p-12 text-white">
        <a href="/" class="flex items-center gap-3 hover:opacity-90 transition" title="Back to home">
            <div class="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
                <i data-lucide="clipboard-list" class="w-5 h-5 text-white"></i>
            </div>
            <div>
                <span class="text-base font-bold tracking-tight">E-CRF System</span>
                <span class="block text-xs text-blue-300 leading-none mt-0.5">Clinical Data Platform</span>
            </div>
        </a>

        <div class="max-w-sm">
            <h1 class="text-3xl font-bold leading-snug mb-3">
                Electronic Case<br>Report Form System
            </h1>
            <p class="text-blue-200 text-sm mb-8 leading-relaxed">
                Secure, compliant clinical trial data management designed for investigational research sites and monitoring teams.
            </p>

            <div class="space-y-3">
                <div class="flex items-center gap-3 text-sm">
                    <div class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                    </div>
                    <span class="text-blue-100">FDA 21 CFR Part 11 — Electronic Records &amp; Signatures</span>
                </div>
                <div class="flex items-center gap-3 text-sm">
                    <div class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                    </div>
                    <span class="text-blue-100">ICH GCP E6(R3) — Good Clinical Practice</span>
                </div>
                <div class="flex items-center gap-3 text-sm">
                    <div class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                    </div>
                    <span class="text-blue-100">TOTP Two-Factor Authentication</span>
                </div>
                <div class="flex items-center gap-3 text-sm">
                    <div class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                    </div>
                    <span class="text-blue-100">Immutable Audit Trail with Field-Level Tracking</span>
                </div>
                <div class="flex items-center gap-3 text-sm">
                    <div class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                    </div>
                    <span class="text-blue-100">Role-Based Access Control (RBAC)</span>
                </div>
            </div>
        </div>

        <div class="border-t border-white/10 pt-5">
            <p class="text-xs text-blue-300 leading-relaxed">
                <i data-lucide="alert-triangle" class="w-3 h-3 inline mr-1 align-middle"></i>
                <strong>Restricted Access.</strong> This system is intended for authorized personnel only. All access is logged and monitored. Unauthorized use may be subject to legal action.
            </p>
        </div>
    </div>

    <div class="flex-1 flex flex-col items-center justify-center bg-white px-6 py-10">
        <div class="flex lg:hidden items-center gap-2.5 mb-8">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background-color:#0A2E5C">
                <i data-lucide="clipboard-list" class="w-4.5 h-4.5 text-white"></i>
            </div>
            <span class="text-lg font-bold text-slate-900">E-CRF System</span>
        </div>

        <div class="w-full max-w-sm">

            <!-- Error banner -->
            <div id="login-error" class="hidden mb-5 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2.5">
                <i data-lucide="alert-circle" class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"></i>
                <span id="login-error-msg" class="text-sm text-red-700"></span>
            </div>

            <!-- ── STEP 1: Email + Password ── -->
            <div id="step-password">
                <h2 class="text-2xl font-bold text-slate-900 mb-1">Sign in</h2>
                <p class="text-sm text-slate-500 mb-7">Enter your credentials to access the platform</p>

                <form id="login-form" novalidate class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Email Address</label>
                        <div class="relative">
                            <i data-lucide="mail" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                            <input type="email" id="email" autocomplete="email" placeholder="name@institution.com"
                                class="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input focus:border-blue-400 outline-none transition placeholder-slate-300">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Password</label>
                        <div class="relative">
                            <i data-lucide="lock" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                            <input type="password" id="password" autocomplete="current-password" placeholder="••••••••"
                                class="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-md text-sm ph-input focus:border-blue-400 outline-none transition placeholder-slate-300">
                            <button type="button" id="toggle-password" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition">
                                <i data-lucide="eye" class="w-4 h-4" id="eye-icon"></i>
                            </button>
                        </div>
                    </div>
                    <button type="submit" id="login-btn"
                        class="w-full flex items-center justify-center gap-2 btn-primary py-2.5 px-4 text-sm rounded-md mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
                        <i data-lucide="log-in" class="w-4 h-4" id="btn-icon"></i>
                        <span id="btn-text">Sign In</span>
                    </button>
                </form>
                <p id="register-link" class="text-center text-xs text-slate-500 mt-4 hidden">
                    <span id="register-lead">Don't have an account?</span>
                    <a href="register.html" class="text-blue-700 font-medium hover:underline" id="register-anchor">Register</a>
                </p>
                <p id="signup-link" class="text-center text-xs text-slate-500 mt-4 hidden">
                    New organization? <a href="signup.html" class="text-blue-700 font-medium hover:underline">Start a free trial</a>
                </p>
            </div>

            <!-- ── STEP 2: TOTP Authenticator App ── -->
            <div id="step-totp" class="hidden">
                <button id="totp-back" class="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition mb-5">
                    <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i> Back
                </button>

                <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style="background-color:#0A2E5C">
                    <i data-lucide="smartphone" class="w-5 h-5 text-white"></i>
                </div>
                <h2 class="text-2xl font-bold text-slate-900 mb-1">Authenticator Code</h2>
                <p class="text-sm text-slate-500 mb-7">Enter the 6-digit code from your authenticator app</p>

                <form id="totp-form" novalidate class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">6-Digit Code</label>
                        <input type="text" id="totp-code" inputmode="numeric" autocomplete="one-time-code"
                            placeholder="000 000" maxlength="7"
                            class="w-full px-4 py-3 border border-slate-300 rounded-md text-2xl font-mono tracking-[0.3em] text-center ph-input focus:border-blue-400 outline-none transition placeholder-slate-300">
                        <p class="text-xs text-slate-400 mt-1.5">Or enter a backup code if you've lost access to your device</p>
                    </div>
                    <button type="submit" id="totp-btn"
                        class="w-full flex items-center justify-center gap-2 btn-primary py-2.5 px-4 text-sm rounded-md disabled:opacity-60 disabled:cursor-not-allowed">
                        <i data-lucide="shield-check" class="w-4 h-4" id="totp-btn-icon"></i>
                        <span id="totp-btn-text">Verify</span>
                    </button>
                </form>
            </div>

            <p class="mt-4 text-center text-xs text-slate-400">
                FDA 21 CFR Part 11 &middot; ICH GCP E6(R3) &middot; Secure &amp; Encrypted
            </p>
        </div>
    </div>

    <script type="module">
        import { authRequest } from './src/frontend/js/modules/auth-http.js';
        import { ApiError } from './src/frontend/js/modules/http.js';
        import { readObject, writeStored } from './src/frontend/js/modules/storage.js';

        function readableError(error) {
            return error instanceof ApiError || error?.code === 'STORAGE_UNAVAILABLE'
                ? error.message : 'The request could not be completed. Reload the page and try again.';
        }
        lucide.createIcons();

        // Reveal the "start a free trial" link only when self-service signup is open.
        authRequest('/api/signup/config').then(c => {
            if (c.enabled) document.getElementById('signup-link')?.classList.remove('hidden');
        }).catch(() => {});

        // Reveal the "Register" link when registration is open OR on a fresh
        // install that still needs its first administrator (on-prem bootstrap).
        authRequest('/api/register/config').then(c => {
            if (!c.selfRegistration && !c.bootstrapNeeded) return;
            if (c.bootstrapNeeded) {
                document.getElementById('register-lead').textContent = 'First-time setup?';
                document.getElementById('register-anchor').textContent = 'Create the administrator account';
            }
            document.getElementById('register-link')?.classList.remove('hidden');
        }).catch(() => {});

        let _tempToken = null;

        // ── Password visibility toggle ─────────────────────────
        document.getElementById('toggle-password').addEventListener('click', function () {
            const input = document.getElementById('password');
            const icon  = document.getElementById('eye-icon');
            input.type  = input.type === 'password' ? 'text' : 'password';
            icon.setAttribute('data-lucide', input.type === 'text' ? 'eye-off' : 'eye');
            lucide.createIcons();
        });

        function showError(msg) {
            const div = document.getElementById('login-error');
            document.getElementById('login-error-msg').textContent = msg;
            div.classList.remove('hidden');
        }
        function hideError() {
            document.getElementById('login-error').classList.add('hidden');
        }

        function showStep(step) {
            document.getElementById('step-password').classList.toggle('hidden', step !== 'password');
            document.getElementById('step-totp').classList.toggle('hidden', step !== 'totp');
            hideError();
        }

        function completeLogin(data) {
            writeStored('ecrf_session', JSON.stringify({
                id:          data.user.id,
                email:       document.getElementById('email').value.trim().toLowerCase(),
                name:        data.user.name,
                displayName: data.user.displayName ?? null,
                role:        data.user.role || 'investigator',
                loginAt:     new Date().toISOString(),
            }));
            // The platform operator has no study/site context — go straight to
            // the tenant console instead of the study picker.
            window.location.href = (data.user.role === 'platform_owner')
                ? 'platform.html'
                : 'select.html';
        }

        // ── Step 1: Submit password ────────────────────────────
        document.getElementById('login-form').addEventListener('submit', async function (e) {
            e.preventDefault();
            if (this.querySelector('button[type=submit]')?.disabled) return;
            hideError();

            const btn     = document.getElementById('login-btn');
            const btnText = document.getElementById('btn-text');
            const btnIcon = document.getElementById('btn-icon');
            const email    = document.getElementById('email').value.trim().toLowerCase();
            const password = document.getElementById('password').value;

            if (!email || !password) { showError('Please enter your email and password.'); return; }

            btn.disabled = true;
            btnText.textContent = 'Signing in…';
            btnIcon.setAttribute('data-lucide', 'loader-2');
            lucide.createIcons();

            try {
                const data = await authRequest('/api/mfa/initiate', {
                    method:      'POST',
                    headers:     { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body:        JSON.stringify({ email, password }),
                });


                if (data.status === 'totp_required') {
                    _tempToken = data.tempToken;
                    btn.disabled = false;
                    btnText.textContent = 'Sign In';
                    btnIcon.setAttribute('data-lucide', 'log-in');
                    lucide.createIcons();
                    showStep('totp');
                    setTimeout(() => document.getElementById('totp-code').focus(), 80);
                    return;
                }

                // status === 'authenticated' — no 2FA configured
                completeLogin(data);

            } catch (err) {
                showError(readableError(err));
                btn.disabled = false;
                btnText.textContent = 'Sign In';
                btnIcon.setAttribute('data-lucide', 'log-in');
                lucide.createIcons();
            }
        });

        // ── Step 2: Submit TOTP code ───────────────────────────
        document.getElementById('totp-form').addEventListener('submit', async function (e) {
            e.preventDefault();
            hideError();

            const btn     = document.getElementById('totp-btn');
            const btnText = document.getElementById('totp-btn-text');
            const btnIcon = document.getElementById('totp-btn-icon');
            const code    = document.getElementById('totp-code').value.replace(/\s/g, '');

            if (!code) { showError('Please enter the 6-digit code from your authenticator app.'); return; }

            btn.disabled = true;
            btnText.textContent = 'Verifying…';
            btnIcon.setAttribute('data-lucide', 'loader-2');
            lucide.createIcons();

            try {
                const data = await authRequest('/api/mfa/totp-verify', {
                    method:      'POST',
                    headers:     { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body:        JSON.stringify({ tempToken: _tempToken, totpCode: code }),
                });


                completeLogin(data);

            } catch (err) {
                showError(readableError(err));
                btn.disabled = false;
                btnText.textContent = 'Verify';
                btnIcon.setAttribute('data-lucide', 'shield-check');
                lucide.createIcons();
            }
        });

        // ── TOTP auto-format: add space after digit 3 ─────────
        document.getElementById('totp-code').addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '').slice(0, 6);
            this.value = v.length > 3 ? v.slice(0, 3) + ' ' + v.slice(3) : v;
        });

        // ── Back button ────────────────────────────────────────
        document.getElementById('totp-back').addEventListener('click', function () {
            _tempToken = null;
            document.getElementById('totp-code').value = '';
            showStep('password');
        });

        if (new URLSearchParams(window.location.search).get('signout') === 'unconfirmed') {
            showError('Your local session has ended, but server sign-out could not be confirmed. Reconnect and sign in again; close this browser if using a shared computer.');
        }

        // Redirect if already logged in
        if (readObject('ecrf_session', value => typeof value.id === 'string' && typeof value.role === 'string')) {
            window.location.href = 'select.html';
        }
    </script>
</body>
</html>
```

## register.html

```html
<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-CRF System — Register</title>
    <script src="src/frontend/vendor/tailwind-play.js"></script>
    <script src="src/frontend/vendor/lucide.js"></script>
    <link rel="stylesheet" href="src/frontend/css/style.css">
</head>
<body class="h-full flex">

    <!-- Left Panel -->
    <div class="hidden lg:flex lg:w-[55%] login-left flex-col justify-between p-12 text-white">
        <a href="/" class="flex items-center gap-3 hover:opacity-90 transition" title="Back to home">
            <div class="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
                <i data-lucide="clipboard-list" class="w-5 h-5 text-white"></i>
            </div>
            <div>
                <span class="text-base font-bold tracking-tight">E-CRF System</span>
                <span class="block text-xs text-blue-300 leading-none mt-0.5">Clinical Data Platform</span>
            </div>
        </a>

        <div class="max-w-sm">
            <h1 class="text-3xl font-bold leading-snug mb-3">
                Create Your<br>Research Account
            </h1>
            <p class="text-blue-200 text-sm mb-8 leading-relaxed">
                Register to access the clinical trial data management platform. Your account will be tied to your institutional email address.
            </p>

            <div class="space-y-4">
                <div class="flex items-start gap-3 text-sm">
                    <div class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                    </div>
                    <div>
                        <p class="text-white font-semibold">Principal Investigator</p>
                        <p class="text-blue-300 text-xs">Full site authority — delegation, DB lock, and all site data</p>
                    </div>
                </div>
                <div class="flex items-start gap-3 text-sm">
                    <div class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i data-lucide="user-check" class="w-3.5 h-3.5"></i>
                    </div>
                    <div>
                        <p class="text-white font-semibold">Investigator</p>
                        <p class="text-blue-300 text-xs">Enter and manage CRF data for enrolled subjects</p>
                    </div>
                </div>
                <div class="flex items-start gap-3 text-sm">
                    <div class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i data-lucide="search" class="w-3.5 h-3.5"></i>
                    </div>
                    <div>
                        <p class="text-white font-semibold">CRA / Monitor</p>
                        <p class="text-blue-300 text-xs">Review, raise queries, and lock verified data</p>
                    </div>
                </div>
                <div class="flex items-start gap-3 text-sm">
                    <div class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i data-lucide="clipboard" class="w-3.5 h-3.5"></i>
                    </div>
                    <div>
                        <p class="text-white font-semibold">CRC</p>
                        <p class="text-blue-300 text-xs">Clinical Research Coordinator — assist with subject management</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="border-t border-white/10 pt-5">
            <p class="text-xs text-blue-300 leading-relaxed">
                <i data-lucide="alert-triangle" class="w-3 h-3 inline mr-1 align-middle"></i>
                <strong>Restricted Access.</strong> This system is intended for authorized clinical trial personnel only. All access is logged and monitored.
            </p>
        </div>
    </div>

    <!-- Right Panel — Register Form -->
    <div class="flex-1 flex flex-col items-center justify-center bg-white px-6 py-10 overflow-y-auto">
        <div class="flex lg:hidden items-center gap-2.5 mb-8">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background-color:#0A2E5C">
                <i data-lucide="clipboard-list" class="w-4 h-4 text-white"></i>
            </div>
            <span class="text-lg font-bold text-slate-900">E-CRF System</span>
        </div>

        <div class="w-full max-w-sm">
            <h2 class="text-2xl font-bold text-slate-900 mb-1">Create account</h2>
            <p class="text-sm text-slate-500 mb-7">Register with your institutional email to get started</p>

            <div id="reg-error" class="hidden mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2.5">
                <i data-lucide="alert-circle" class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"></i>
                <span id="reg-error-msg" class="text-sm text-red-700"></span>
            </div>

            <div id="reg-success" class="hidden mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2.5">
                <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"></i>
                <span class="text-sm text-emerald-700">Account created successfully. Redirecting to login…</span>
            </div>

            <form id="reg-form" novalidate class="space-y-4">

                <!-- Full Name -->
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Full Name <span class="text-red-500">*</span></label>
                    <div class="relative">
                        <i data-lucide="user" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        <input type="text" id="reg-name" autocomplete="name" placeholder="Dr. Jane Smith"
                            class="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none transition placeholder-slate-300">
                    </div>
                </div>

                <!-- Email -->
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Email Address <span class="text-red-500">*</span></label>
                    <div class="relative">
                        <i data-lucide="mail" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        <input type="email" id="reg-email" autocomplete="email" placeholder="name@institution.com"
                            class="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none transition placeholder-slate-300">
                    </div>
                </div>

                <!-- Role -->
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Role <span class="text-red-500">*</span></label>
                    <div class="relative">
                        <i data-lucide="briefcase" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        <select id="reg-role"
                            class="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white transition appearance-none">
                            <option value="">— Select your role —</option>
                            <option value="pi">Principal Investigator</option>
                            <option value="investigator">Investigator</option>
                            <option value="cra">CRA / Monitor</option>
                            <option value="crc">CRC</option>
                        </select>
                    </div>
                </div>

                <!-- Password -->
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Password <span class="text-red-500">*</span></label>
                    <div class="relative">
                        <i data-lucide="lock" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        <input type="password" id="reg-password" autocomplete="new-password" placeholder="Min. 8 characters"
                            class="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none transition placeholder-slate-300">
                        <button type="button" id="toggle-pw"
                            class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition">
                            <i data-lucide="eye" class="w-4 h-4" id="eye-pw"></i>
                        </button>
                    </div>
                    <div id="pw-strength" class="mt-1.5 hidden">
                        <div class="flex gap-1 mb-1">
                            <div id="s1" class="h-1 flex-1 rounded-full bg-slate-200 transition-colors"></div>
                            <div id="s2" class="h-1 flex-1 rounded-full bg-slate-200 transition-colors"></div>
                            <div id="s3" class="h-1 flex-1 rounded-full bg-slate-200 transition-colors"></div>
                            <div id="s4" class="h-1 flex-1 rounded-full bg-slate-200 transition-colors"></div>
                        </div>
                        <p id="pw-strength-label" class="text-xs text-slate-400"></p>
                    </div>
                </div>

                <!-- Confirm Password -->
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Confirm Password <span class="text-red-500">*</span></label>
                    <div class="relative">
                        <i data-lucide="lock" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        <input type="password" id="reg-confirm" autocomplete="new-password" placeholder="Re-enter password"
                            class="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none transition placeholder-slate-300">
                    </div>
                </div>

                <!-- License Agreement — shown only on first-run admin setup -->
                <div id="license-block" class="hidden pt-1">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">License Agreement <span class="text-red-500">*</span></label>
                    <div id="license-summary" class="text-xs text-slate-500 mb-2"></div>
                    <div class="text-xs text-slate-600 leading-relaxed border border-slate-200 rounded-md p-3 bg-slate-50 max-h-40 overflow-y-auto">
                        <p class="mb-2">By setting up this system you accept, on behalf of your institution, the vendor's:</p>
                        <ul class="list-disc pl-4 space-y-1">
                            <li><strong>Terms &amp; Conditions (Software License Agreement)</strong> — a non-transferable, per-instance license; the software remains the vendor's property while all patient/subject data remains owned by and stored at your institution.</li>
                            <li><strong>Privacy Policy</strong> — the system runs fully on-premise; the vendor does not access your patient data. Your institution is the Data Controller under UU PDP No. 27/2022.</li>
                        </ul>
                        <p class="mt-2 text-slate-400">The full signed contract documents are provided by your vendor (see <code>docs/legal/</code> in the delivered package). Your acceptance is recorded in the audit trail.</p>
                    </div>
                    <label class="flex items-start gap-2.5 mt-2.5 cursor-pointer select-none">
                        <input type="checkbox" id="accept-license" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500">
                        <span class="text-sm text-slate-700">I have read and accept the <strong>Terms &amp; Conditions</strong> and <strong>Privacy Policy</strong> on behalf of my institution.</span>
                    </label>
                </div>

                <button type="submit" id="reg-btn"
                    class="w-full flex items-center justify-center gap-2 btn-primary py-2.5 px-4 text-sm rounded-md mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
                    <i data-lucide="user-plus" class="w-4 h-4" id="reg-btn-icon"></i>
                    <span id="reg-btn-text">Create Account</span>
                </button>
            </form>

            <p class="mt-6 text-center text-sm text-slate-500">
                Already have an account?
                <a href="login.html" class="text-blue-600 font-semibold hover:underline">Sign in</a>
            </p>

            <p class="mt-4 text-center text-xs text-slate-400">
                FDA 21 CFR Part 11 &middot; ICH GCP E6 (R2) &middot; Secure &amp; Encrypted
            </p>
        </div>
    </div>

    <script type="module">
        import { authRequest } from './src/frontend/js/modules/auth-http.js';
        import { ApiError } from './src/frontend/js/modules/http.js';
        import { readObject, writeStored } from './src/frontend/js/modules/storage.js';

        function readableError(error) {
            return error instanceof ApiError || error?.code === 'STORAGE_UNAVAILABLE'
                ? error.message : 'The request could not be completed. Reload the page and try again.';
        }
        lucide.createIcons();

        // ── First-run setup detection ───────────────────────────
        // On a fresh install the first administrator must accept the vendor
        // License Agreement & Privacy Policy before the account is created.
        let isBootstrap = false;
        (async function loadRegisterConfig() {
            try {
                const cfg = await authRequest('/api/register/config');
                isBootstrap = !!cfg.bootstrapNeeded;
                if (isBootstrap) {
                    document.getElementById('license-block').classList.remove('hidden');
                    const lic = cfg.license || {};
                    const summary = document.getElementById('license-summary');
                    if (lic.present && lic.customer) {
                        const exp = lic.expiresAt ? new Date(lic.expiresAt).toISOString().slice(0, 10) : 'n/a';
                        summary.innerHTML = 'Licensed to <strong>' + lic.customer + '</strong> · expires ' + exp
                            + (lic.active ? '' : ' · <span class="text-amber-600">inactive</span>');
                    } else {
                        summary.innerHTML = '<span class="text-amber-600">No active license key installed yet.</span> You can still complete setup; install the key later.';
                    }
                }
            } catch { /* backend unreachable — form still works, server re-validates */ }
        })();

        // ── Password visibility toggle ──────────────────────────
        document.getElementById('toggle-pw').addEventListener('click', function () {
            const input = document.getElementById('reg-password');
            const icon  = document.getElementById('eye-pw');
            if (input.type === 'password') {
                input.type = 'text';
                icon.setAttribute('data-lucide', 'eye-off');
            } else {
                input.type = 'password';
                icon.setAttribute('data-lucide', 'eye');
            }
            lucide.createIcons();
        });

        // ── Password strength meter ─────────────────────────────
        document.getElementById('reg-password').addEventListener('input', function () {
            const pw  = this.value;
            const bar = document.getElementById('pw-strength');
            if (!pw) { bar.classList.add('hidden'); return; }
            bar.classList.remove('hidden');

            let score = 0;
            if (pw.length >= 8)              score++;
            if (/[A-Z]/.test(pw))            score++;
            if (/[0-9]/.test(pw))            score++;
            if (/[^A-Za-z0-9]/.test(pw))     score++;

            const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'];
            const labels = ['Weak', 'Fair', 'Good', 'Strong'];
            const lblColors = ['text-red-500', 'text-orange-500', 'text-yellow-600', 'text-emerald-600'];

            for (let i = 1; i <= 4; i++) {
                const seg = document.getElementById('s' + i);
                seg.className = 'h-1 flex-1 rounded-full transition-colors ' + (i <= score ? colors[score - 1] : 'bg-slate-200');
            }
            const lbl = document.getElementById('pw-strength-label');
            lbl.textContent = labels[score - 1] || '';
            lbl.className   = 'text-xs ' + (lblColors[score - 1] || 'text-slate-400');
        });

        // ── Register form submit ────────────────────────────────
        document.getElementById('reg-form').addEventListener('submit', async function (e) {
            e.preventDefault();

            const btn     = document.getElementById('reg-btn');
            const btnText = document.getElementById('reg-btn-text');
            const btnIcon = document.getElementById('reg-btn-icon');
            const errDiv  = document.getElementById('reg-error');
            const errMsg  = document.getElementById('reg-error-msg');

            const name     = document.getElementById('reg-name').value.trim();
            const email    = document.getElementById('reg-email').value.trim().toLowerCase();
            const role     = document.getElementById('reg-role').value;
            const password = document.getElementById('reg-password').value;
            const confirm  = document.getElementById('reg-confirm').value;

            errDiv.classList.add('hidden');

            if (!name || !email || !role || !password || !confirm) {
                errMsg.textContent = 'All fields are required.';
                errDiv.classList.remove('hidden');
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errMsg.textContent = 'Please enter a valid email address.';
                errDiv.classList.remove('hidden');
                return;
            }
            if (password.length < 8) {
                errMsg.textContent = 'Password must be at least 8 characters long.';
                errDiv.classList.remove('hidden');
                return;
            }
            if (password !== confirm) {
                errMsg.textContent = 'Passwords do not match.';
                errDiv.classList.remove('hidden');
                return;
            }
            const acceptEl = document.getElementById('accept-license');
            const acceptedLicense = isBootstrap ? !!(acceptEl && acceptEl.checked) : false;
            if (isBootstrap && !acceptedLicense) {
                errMsg.textContent = 'You must accept the License Agreement & Privacy Policy to set up this system.';
                errDiv.classList.remove('hidden');
                return;
            }

            if (btn.disabled) return;
            btn.disabled = true;
            btnText.textContent = 'Creating account…';
            btnIcon.setAttribute('data-lucide', 'loader-2');
            lucide.createIcons();

            try {
                const data = await authRequest('/api/register', {
                    method:      'POST',
                    headers:     { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body:        JSON.stringify({ email, password, name, role, acceptedLicense }),
                });


                document.getElementById('reg-success').classList.remove('hidden');
                document.getElementById('reg-form').classList.add('opacity-50', 'pointer-events-none');
                setTimeout(() => { window.location.href = 'login.html'; }, 1800);

            } catch (err) {
                errMsg.textContent = readableError(err);
                if (Array.isArray(err.details)) errMsg.textContent += ' ' + err.details.filter(d => typeof d === 'string').join(' ');
                errDiv.classList.remove('hidden');
                btn.disabled = false;
                btnText.textContent = 'Create Account';
                btnIcon.setAttribute('data-lucide', 'user-plus');
                lucide.createIcons();
            }
        });

        // Redirect if already logged in
        if (readObject('ecrf_session', value => typeof value.id === 'string' && typeof value.role === 'string')) {
            window.location.href = 'index.html';
        }
    </script>
</body>
</html>
```

## signup.html

```html
<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-CRF — Start your free trial</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231e3a5f'/%3E%3Cpath d='M10 9h8a5 5 0 0 1 0 10h-8zm2 2v6h6a3 3 0 0 0 0-6z' fill='white'/%3E%3Crect x='10' y='21' width='10' height='2' rx='1' fill='white'/%3E%3C/svg%3E">
    <script src="src/frontend/vendor/tailwind-play.js"></script>
    <link rel="stylesheet" href="src/frontend/css/style.css">
</head>
<body class="h-full flex items-center justify-center" style="background:linear-gradient(145deg,#0A2E5C,#0F3872,#1554A0)">

    <div class="w-full max-w-md m-4">
        <div class="bg-white rounded-xl shadow-2xl overflow-hidden">
            <div style="background:#0A2E5C" class="px-8 py-6 text-white">
                <p class="text-lg font-bold">Start your free trial</p>
                <p class="text-xs text-blue-200 mt-1">Create your organization — 14 days, no card required</p>
            </div>

            <div id="disabled-panel" class="p-8 hidden">
                <p class="text-sm text-slate-700">Self-service signup is not currently open.</p>
                <p class="text-sm text-slate-500 mt-2">Please contact sales to have your organization provisioned.</p>
                <a href="login.html" class="inline-block mt-4 text-sm text-blue-700 hover:underline">← Back to sign in</a>
            </div>

            <div id="success-panel" class="p-8 hidden text-center">
                <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
                <p class="text-base font-semibold text-slate-800">Almost there!</p>
                <p class="text-sm text-slate-500 mt-2" id="success-msg">Check your email to verify your address and activate your trial.</p>
                <a href="login.html" class="inline-block mt-5 text-sm text-blue-700 hover:underline">Go to sign in</a>
            </div>

            <form id="signup-form" class="p-8 space-y-4 hidden">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Organization name</label>
                    <input id="orgName" type="text" required class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none" placeholder="Acme Clinical Research">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Your name</label>
                        <input id="adminName" type="text" required class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none" placeholder="Jane Doe">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Work email</label>
                        <input id="adminEmail" type="email" required autocomplete="email" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none" placeholder="jane@acme.org">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Password</label>
                    <input id="password" type="password" required autocomplete="new-password" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    <p class="text-xs text-slate-400 mt-1">Min. 12 chars with uppercase, lowercase, number, and symbol.</p>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Confirm password</label>
                    <input id="confirm" type="password" required autocomplete="new-password" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <label class="flex items-start gap-2 text-xs text-slate-600">
                    <input id="acceptTos" type="checkbox" class="mt-0.5">
                    <span>I agree to the <strong>Terms of Service</strong> and <strong>Data Processing Agreement</strong>. The trial is for evaluation with non-production/synthetic data; processing real patient data requires a signed DPA and a paid plan.</span>
                </label>
                <div id="err" class="text-xs text-red-600 space-y-0.5"></div>
                <button type="submit" id="submit-btn"
                    class="w-full py-2.5 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition">
                    Create organization
                </button>
                <p class="text-center text-xs text-slate-500">Already have an account? <a href="login.html" class="text-blue-700 hover:underline">Sign in</a></p>
            </form>
        </div>
    </div>

    <script type="module">
        import { authRequest } from './src/frontend/js/modules/auth-http.js';
        import { ApiError } from './src/frontend/js/modules/http.js';
        import { readObject, writeStored } from './src/frontend/js/modules/storage.js';

        function readableError(error) {
            return error instanceof ApiError || error?.code === 'STORAGE_UNAVAILABLE'
                ? error.message : 'The request could not be completed. Reload the page and try again.';
        }
        const $ = (id) => document.getElementById(id);

        (async function init() {
            try {
                const cfg = await authRequest('/api/signup/config');
                if (cfg.enabled) $('signup-form').classList.remove('hidden');
                else $('disabled-panel').classList.remove('hidden');
            } catch {
                $('disabled-panel').textContent = 'Registration availability could not be checked. Check your connection and reload this page.';
                $('disabled-panel').classList.remove('hidden');
            }
        })();

        $('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const err = $('err'); err.innerHTML = '';
            const password = $('password').value;
            if (password !== $('confirm').value) { err.textContent = 'Passwords do not match.'; return; }
            if (!$('acceptTos').checked) { err.textContent = 'You must accept the Terms of Service and DPA.'; return; }
            const btn = $('submit-btn'); if (btn.disabled) return; btn.disabled = true; btn.textContent = 'Creating…';
            try {
                const data = await authRequest('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orgName:    $('orgName').value.trim(),
                        adminName:  $('adminName').value.trim(),
                        adminEmail: $('adminEmail').value.trim(),
                        password,
                        acceptTos:  true,
                    }),
                });
                $('signup-form').classList.add('hidden');
                $('success-msg').textContent = data.message || 'Check your email to verify your address.';
                $('success-panel').classList.remove('hidden');
            } catch (ex) {
                err.textContent = readableError(ex);
                if (Array.isArray(ex.details)) err.textContent += ' ' + ex.details.filter(d => typeof d === 'string').join(' ');
                btn.disabled = false; btn.textContent = 'Create organization';
            }
        });
    </script>
</body>
</html>
```

## src/backend/middleware/errors.js

```javascript
import { randomUUID } from 'node:crypto';

const serverMessage = 'We could not complete the request. If you were saving, check whether your changes were saved before trying again. Contact support if this continues.';

// Legacy routes send their own 5xx JSON instead of forwarding to next(err).
// Enforce the public boundary here until those routes are migrated.
export function safeErrorResponses(req, res, next) {
    res.locals.requestId = randomUUID();
    res.setHeader('X-Request-ID', res.locals.requestId);
    const json = res.json;
    res.json = function (body) {
        if (res.statusCode >= 500) {
            // Never log the body: query parameters may contain participant data.
            // TODO: MINOR — Correlate request IDs with sanitized diagnostic codes in route logs.
            console.error('Request failed', { requestId: res.locals.requestId, status: res.statusCode, method: req.method });
            body = { error: serverMessage, code: 'SERVER_ERROR', requestId: res.locals.requestId };
        }
        return json.call(this, body);
    };
    next();
}

export function apiErrorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);
    const known = {
        'entity.parse.failed': [400, 'The submitted data could not be read. Reload the page and try again.'],
        'entity.too.large': [413, 'The upload is too large. Reduce its size and try again.'],
        'request.aborted': [400, 'The request was interrupted. Check your connection and try again.'],
    };
    const [status, message] = known[err.type] || [500, serverMessage];
    res.status(status).json({ error: message, requestId: res.locals.requestId });
}
```

## src/backend/routes/delegation.js

```javascript
// Delegation Log & Training Records — ICH GCP E6(R3) §4.1.5 + §8.3
// Site staff delegation with task assignment, sign-off, and training tracking

import { Router } from 'express';
import { eq, and, or, desc, gte, lte, isNull } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { delegationLog, trainingRecords, user } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { isoDay } from '../lib/isodate.js';
import { dbErrorMessage } from '../lib/dberrors.js';
import { orgCondition, effectiveOrgId, sameOrg } from '../lib/tenantscope.js';
import { resolveTrainingScope } from '../lib/trainingrules.js';

/**
 * A failed statement used to be answered with `err.message`, which for a
 * drizzle error is "Failed query: insert into … params: …" — the SQL and every
 * bound value, delivered to the browser, with no word about what actually went
 * wrong. Log the whole thing where an operator can read it; send back only the
 * reason postgres gave.
 */
function failed(res, err, context) {
    // TODO: MINOR — Replace raw exception logging with sanitized diagnostics linked to the request ID.
    console.error(`[delegation] ${context}:`, err);
    res.status(500).json({ error: dbErrorMessage(err) });
}

/**
 * Conditions every training-record read must carry.
 *
 * The tenant filter is the important half: this table had no organization_id
 * and no filter at all, so one hospital's admin could list another hospital's
 * staff qualifications.
 *
 * The study half implements lib/trainingrules.js — a study's file shows its own
 * protocol training plus every person-level qualification, so each TMF is
 * complete without the same GCP certificate being copied into every study.
 * Kept in sync with visibleInStudy(), which asserts the same rule in tests.
 */
function trainingScope(req) {
    const conditions = [];
    const org = orgCondition(req, trainingRecords.organizationId);
    if (org) conditions.push(org);
    conditions.push(req.studyId
        ? or(isNull(trainingRecords.studyId), eq(trainingRecords.studyId, req.studyId))
        : isNull(trainingRecords.studyId));
    return conditions;
}

const router = Router();

// ---------------------------------------------------------------------------
// DELEGATION LOG
// ---------------------------------------------------------------------------

function isMissingTable(err) {
    const c = err?.cause;
    return err?.code === '42P01' || c?.code === '42P01' ||
           (err?.message || '').includes('does not exist') ||
           (c?.message || '').includes('does not exist');
}

// GET /api/delegation — list delegation entries
// Privileged roles see all entries; other roles (investigator, crc) only see
// their own so they can review and sign them (ICH GCP §4.1.5).
router.get('/', async (req, res) => {
    try {
        const privileged = ['admin', 'cra', 'pi', 'data_manager'].includes(req.user.role);
        const { status } = req.query;
        const userId = privileged ? req.query.userId : req.user.id;
        const base = eq(delegationLog.studyId, req.studyId);
        const rows = await db.select().from(delegationLog)
            .where(
                userId && status ? and(base, eq(delegationLog.userId, userId), eq(delegationLog.status, status))
                : userId ? and(base, eq(delegationLog.userId, userId))
                : status ? and(base, eq(delegationLog.status, status))
                : base
            )
            .orderBy(desc(delegationLog.createdAt));
        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.status(503).json({ error: 'This information is temporarily unavailable. Contact your study administrator.' });
        failed(res, err, 'list delegation');
    }
});

// ---------------------------------------------------------------------------
// TRAINING RECORDS  (must be before /:id to avoid route shadowing)
// ---------------------------------------------------------------------------

// GET /api/delegation/training/records — list training records
router.get('/training/records', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const { userId, trainingType } = req.query;
        const rows = await db.select().from(trainingRecords)
            .where(and(...trainingScope(req), ...[
                userId       ? eq(trainingRecords.userId, userId)             : undefined,
                trainingType ? eq(trainingRecords.trainingType, trainingType) : undefined,
            ].filter(Boolean)))
            .orderBy(desc(trainingRecords.trainingDate));
        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.status(503).json({ error: 'This information is temporarily unavailable. Contact your study administrator.' });
        failed(res, err, 'list training records');
    }
});

// POST /api/delegation/training/records — add training record (admin only)
router.post('/training/records', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const { userId: traineeId, trainingType, trainingDate, expiryDate, certificateRef, notes, studySpecific } = req.body;

        if (!traineeId || !trainingType || !trainingDate) {
            return res.status(400).json({ error: 'userId, trainingType, and trainingDate are required' });
        }

        const [targetUser] = await db.select({ name: user.name }).from(user).where(eq(user.id, traineeId));
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // training_date and expiry_date are TEXT "YYYY-MM-DD", same as the
        // delegation dates below — a Date object binds as timestamptz and the
        // column refuses it.
        const tDate = isoDay(trainingDate);
        const xDate = expiryDate ? isoDay(expiryDate) : null;
        if (!tDate) return res.status(400).json({ error: 'trainingDate is not a valid date (expected YYYY-MM-DD)' });
        if (expiryDate && !xDate) return res.status(400).json({ error: 'expiryDate is not a valid date (expected YYYY-MM-DD)' });
        if (xDate && xDate < tDate) return res.status(400).json({ error: 'expiryDate cannot be before trainingDate' });

        const [record] = await db.insert(trainingRecords).values({
            organizationId:  effectiveOrgId(req),
            // null for a transferable qualification, the active study for
            // protocol training — see lib/trainingrules.js.
            studyId:         resolveTrainingScope({ trainingType, studySpecific, studyId: req.studyId }),
            userId:          traineeId,
            userName:        targetUser.name,
            trainingType,
            trainingDate:    tDate,
            expiryDate:      xDate,
            certificateRef:  certificateRef ?? null,
            notes:           notes ?? null,
            recordedBy:      req.user.id,
            recordedByName:  req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'training_records', recordId: record.id, action: 'INSERT',
            newValue: `${trainingType} training recorded for ${targetUser.name}`,
            reason: 'Training record per ICH E6(R3) §8.3',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(record);
    } catch (err) {
        failed(res, err, 'create training record');
    }
});

// GET /api/delegation/training/expiring — training expiring within N days (default 30)
router.get('/training/expiring', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const days = Number.parseInt(req.query.days ?? '30', 10);
        const window = Number.isFinite(days) && days >= 0 ? days : 30;
        const future = new Date();
        future.setDate(future.getDate() + window);

        // expiry_date is TEXT "YYYY-MM-DD". Comparing it against a Date bound
        // the parameter as a timestamp, which the column will not compare
        // against — the endpoint returned an error rather than a list. ISO date
        // strings order lexicographically, so a plain text BETWEEN is correct.
        const from = isoDay(new Date());
        const to   = isoDay(future);

        const rows = await db.select().from(trainingRecords)
            .where(and(
                ...trainingScope(req),
                gte(trainingRecords.expiryDate, from),
                lte(trainingRecords.expiryDate, to),
            ))
            .orderBy(trainingRecords.expiryDate);
        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.status(503).json({ error: 'This information is temporarily unavailable. Contact your study administrator.' });
        failed(res, err, 'list expiring training');
    }
});

// DELETE /api/delegation/training/records/:id — admin only
router.delete('/training/records/:id', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [existing] = await db.select().from(trainingRecords).where(eq(trainingRecords.id, id));
        // 404 rather than 403 for another tenant's record, matching the rest of
        // the codebase: one tenant must not be able to probe what another has.
        if (!existing || !sameOrg(req, existing.organizationId)) {
            return res.status(404).json({ error: 'Training record not found' });
        }

        await db.delete(trainingRecords).where(eq(trainingRecords.id, id));

        await writeAudit(db, {
            tableName: 'training_records', recordId: id, action: 'DELETE',
            oldValue: `${existing.trainingType} for ${existing.userName}`,
            reason: 'Training record deleted by admin',
            user: req.user, ipAddress: req.ip,
        });

        res.json({ ok: true });
    } catch (err) {
        failed(res, err, 'delete training record');
    }
});

// ---------------------------------------------------------------------------
// DELEGATION LOG — parameterized routes last to avoid shadowing /training/*
// ---------------------------------------------------------------------------

// GET /api/delegation/:id — single entry
// Privileged roles see any entry; other roles only their own (to sign it).
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [row] = await db.select().from(delegationLog).where(eq(delegationLog.id, id));
        if (!row) return res.status(404).json({ error: 'Delegation record not found' });
        const privileged = ['admin', 'cra', 'pi', 'data_manager'].includes(req.user.role);
        if (!privileged && row.userId !== req.user.id) {
            return res.status(403).json({ error: 'You can only view your own delegation entry' });
        }
        res.json(row);
    } catch (err) {
        failed(res, err, 'get delegation');
    }
});

// POST /api/delegation — create delegation entry (admin only)
router.post('/', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const {
            userId: delegatedUserId, siteId, delegatedTasks,
            delegationStart, delegationEnd, notes,
        } = req.body;

        if (!delegatedUserId || !delegatedTasks?.length || !delegationStart) {
            return res.status(400).json({ error: 'userId, delegatedTasks, and delegationStart are required' });
        }

        // delegation_start/end are TEXT columns holding "YYYY-MM-DD", and
        // consentrules.day() compares them by slicing the first ten characters.
        // Wrapping the value in `new Date()` made postgres-js bind the
        // parameter as a timestamptz, which the text column rejects outright —
        // and had it been accepted it would have stored "Sat Aug 01 2026 …",
        // whose first ten characters are "Sat Aug 01". Every delegation-window
        // check would then have failed, which is the check that decides who may
        // take informed consent (ICH E6(R3) §4.1.5).
        const start = isoDay(delegationStart);
        const end   = delegationEnd ? isoDay(delegationEnd) : null;
        if (!start)  return res.status(400).json({ error: 'delegationStart is not a valid date (expected YYYY-MM-DD)' });
        if (delegationEnd && !end) return res.status(400).json({ error: 'delegationEnd is not a valid date (expected YYYY-MM-DD)' });
        if (end && end < start)    return res.status(400).json({ error: 'delegationEnd cannot be before delegationStart' });

        // Fetch the delegated user's name and role
        const [targetUser] = await db.select({ name: user.name, role: user.role })
            .from(user).where(eq(user.id, delegatedUserId));
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const [entry] = await db.insert(delegationLog).values({
            studyId:         req.studyId,
            userId:          delegatedUserId,
            userName:        targetUser.name,
            userRole:        targetUser.role,
            // An unselected <select> posts "", which is not null and which an
            // integer column will not take.
            siteId:          siteId === '' || siteId == null ? null : parseInt(siteId, 10),
            delegatedTasks,
            delegationStart: start,
            delegationEnd:   end,
            status:          'Active',
            notes:           notes ?? null,
            createdBy:       req.user.id,
            createdByName:   req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'delegation_log', recordId: entry.id, action: 'INSERT',
            newValue: `Delegation created for ${targetUser.name} (${delegatedTasks.join(', ')})`,
            reason: `Delegation log entry per ICH E6(R3) §4.1.5`,
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(entry);
    } catch (err) {
        failed(res, err, 'create delegation');
    }
});

// PATCH /api/delegation/:id — update (admin only)
router.patch('/:id', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { delegatedTasks, delegationStart, delegationEnd, status, notes } = req.body;

        const [existing] = await db.select().from(delegationLog).where(eq(delegationLog.id, id));
        if (!existing) return res.status(404).json({ error: 'Delegation record not found' });

        const updates = { updatedAt: new Date() };
        if (delegatedTasks !== undefined) updates.delegatedTasks = delegatedTasks;
        // Same TEXT "YYYY-MM-DD" contract as the create path above.
        if (delegationStart !== undefined) {
            const s = isoDay(delegationStart);
            if (!s) return res.status(400).json({ error: 'delegationStart is not a valid date (expected YYYY-MM-DD)' });
            updates.delegationStart = s;
        }
        if (delegationEnd !== undefined) {
            if (delegationEnd) {
                const e = isoDay(delegationEnd);
                if (!e) return res.status(400).json({ error: 'delegationEnd is not a valid date (expected YYYY-MM-DD)' });
                updates.delegationEnd = e;
            } else {
                updates.delegationEnd = null;
            }
        }
        const effStart = updates.delegationStart ?? existing.delegationStart;
        const effEnd   = updates.delegationEnd   ?? existing.delegationEnd;
        if (effStart && effEnd && effEnd < effStart) {
            return res.status(400).json({ error: 'delegationEnd cannot be before delegationStart' });
        }
        if (status !== undefined) updates.status = status;
        if (notes !== undefined) updates.notes = notes;

        const [updated] = await db.update(delegationLog).set(updates)
            .where(eq(delegationLog.id, id)).returning();

        await writeAudit(db, {
            tableName: 'delegation_log', recordId: id, action: 'UPDATE',
            newValue: JSON.stringify(updates),
            reason: 'Delegation record updated',
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        failed(res, err, 'update delegation');
    }
});

// POST /api/delegation/:id/sign — investigator/staff e-signs their delegation
router.post('/:id/sign', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const [entry] = await db.select().from(delegationLog).where(eq(delegationLog.id, id));
        if (!entry) return res.status(404).json({ error: 'Delegation record not found' });
        if (entry.userId !== req.user.id) {
            return res.status(403).json({ error: 'You can only sign your own delegation entries' });
        }
        if (entry.signedAt) return res.status(409).json({ error: 'Already signed' });

        const [updated] = await db.update(delegationLog)
            .set({ signedAt: new Date(), signedByName: req.user.name })
            .where(eq(delegationLog.id, id))
            .returning();

        await writeAudit(db, {
            tableName: 'delegation_log', recordId: id, action: 'UPDATE',
            fieldName: 'signed_at', newValue: new Date().toISOString(),
            reason: `Delegation log signed by ${req.user.name} (ICH E6(R3) §4.1.5)`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        failed(res, err, 'sign delegation');
    }
});

export default router;
```

## src/backend/routes/import.js

```javascript
// Spreadsheet Data Import tool. Study-scoped (mounted under studyAuth), additive —
// it reuses existing validation/audit/create logic and changes no other flow.
//
// Endpoints:
//   POST /api/import/derive-form  — infer a CRF form from a sheet's headers (admin)
//   POST /api/import/visit        — import one per-visit sheet (subject + visit + CRF + AE)
//   GET  /api/import/template     — download a CSV template for a form
import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { subjects, visits, crfForms, crfDataEntries, adverseEvents, sites, vitalSigns, labResults } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { licenseGuardCreate } from '../lib/licenseguard.js';
import { writeAudit, writeFieldDiffAudit } from '../lib/audit.js';
import { sameOrg, effectiveOrgId } from '../lib/tenantscope.js';
import { checkLimit } from '../lib/plans.js';
import { isUniqueViolation, uniqueConstraintName } from '../lib/dberrors.js';
import { createAutoQueries } from './entries.js';
import { deriveForm, planRow, mergeEntryData } from '../lib/importengine.js';

class ImportValidationError extends Error {}

const router = Router();
const IMPORT_ROLES = ['admin', 'crc', 'data_manager', 'investigator', 'pi'];

// Same window-compliance formula as routes/visits.js (kept local to avoid a cycle).
function windowCompliance(plannedDate, actualDate, windowDays) {
    if (!plannedDate || !actualDate) return null;
    const p = new Date(plannedDate); p.setHours(0, 0, 0, 0);
    const a = new Date(actualDate);  a.setHours(0, 0, 0, 0);
    const diff = Math.round((a - p) / 86400000);
    const win = windowDays ?? 0;
    if (diff === 0) return 'On Schedule';
    if (Math.abs(diff) <= win) return diff < 0 ? `Early (${Math.abs(diff)}d)` : `Late (+${diff}d)`;
    return diff < 0 ? `Early (${Math.abs(diff)}d) — Out of Window` : `Late (+${diff}d) — Out of Window`;
}

// ── POST /api/import/derive-form ────────────────────────────────────────────
// Body: { name, headers:[], rows:[{header:value}], skip:[] } → creates a CRF form.
router.post('/derive-form', requireRole('admin'), async (req, res) => {
    try {
        const { name, headers, rows, skip } = req.body;
        if (!name || !Array.isArray(headers) || headers.length === 0) {
            return res.status(400).json({ error: 'Enter a form name and select at least one column to import.' });
        }
        const schemaJson = deriveForm({ headers, rows: rows || [], skip: skip || [] });
        if (!schemaJson.fields.length) {
            return res.status(422).json({ error: 'No importable fields were derived from the headers' });
        }
        const [created] = await db.insert(crfForms).values({
            organizationId: effectiveOrgId(req),
            name: name.trim(),
            description: 'Auto-derived from spreadsheet import',
            version: '1.0',
            schemaJson,
            isActive: true,
        }).returning();
        await writeAudit(db, {
            tableName: 'crf_forms', recordId: created.id, action: 'INSERT',
            newValue: `Form "${name}" derived from import (${schemaJson.fields.length} fields)`,
            reason: 'CRF form auto-derived for data import', user: req.user, ipAddress: req.ip,
        });
        res.status(201).json({ formId: created.id, schema: schemaJson });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/import/visit ──────────────────────────────────────────────────
// Body: { siteId, visitName, formId, columnMap, reason, rows:[], dryRun }
router.post('/visit', licenseGuardCreate, requireRole(...IMPORT_ROLES), async (req, res) => {
    const { siteId, visitName, formId, columnMap, reason, rows, dryRun } = req.body;
    if (!visitName || !formId || !Array.isArray(rows) || !columnMap) {
        return res.status(400).json({ error: 'visitName, formId, columnMap and rows[] are required' });
    }
    const effSiteId = siteId != null ? parseInt(siteId) : null;
    if (Array.isArray(req.siteScope) && effSiteId != null && !req.siteScope.includes(effSiteId)) {
        return res.status(403).json({ error: 'You can only import into your assigned site.' });
    }

    try {
        const [form] = await db.select().from(crfForms).where(eq(crfForms.id, parseInt(formId)));
        if (!form || !sameOrg(req, form.organizationId)) return res.status(404).json({ error: 'Form not found' });
        const formFields = form.schemaJson?.fields ?? [];

        // Existing subjects in this study (for will-create vs exists + plan limit).
        const existingRows = await db.select({ id: subjects.id, code: subjects.subjectCode, siteId: subjects.siteId })
            .from(subjects).where(eq(subjects.studyId, req.studyId));
        const byCode = new Map(existingRows.map(s => [s.code, s]));

        // Batch-aware plan limit for the subjects that would be newly created.
        const planned = rows.map(r => planRow(r, columnMap, formFields));
        const newCodes = new Set(planned.filter(p => p.subjectCode && !byCode.has(p.subjectCode)).map(p => p.subjectCode));
        const limit = await checkLimit(effectiveOrgId(req), 'subjects');
        if (limit.limit != null && limit.current + newCodes.size > limit.limit) {
            return res.status(402).json({
                error: `Plan limit: importing ${newCodes.size} new subjects would exceed ${limit.limit} (currently ${limit.current}).`,
            });
        }

        const summary = { subjectsCreated: 0, visitsCreated: 0, visitsUpdated: 0, entriesCreated: 0, entriesUpdated: 0, aeCreated: 0, vitalsCreated: 0, labsCreated: 0, skipped: 0, errors: 0 };
        const results = [];
        const reasonText = reason || `Bulk import — ${visitName}`;

        for (let i = 0; i < rows.length; i++) {
            const plan = planned[i];
            const line = i + 2;   // human row number (header = line 1)
            const rr = { line, subjectCode: plan.subjectCode, warnings: plan.warnings };

            if (plan.errors.length) { rr.status = 'error'; rr.messages = plan.errors; summary.errors++; results.push(rr); continue; }

            const existing = plan.subjectCode ? byCode.get(plan.subjectCode) : null;
            rr.subjectAction = existing ? 'exists' : 'create';

            if (dryRun) {
                rr.status = 'ok';
                rr.visitDate = plan.visitDate;
                rr.crfFields = Object.keys(plan.crf).length;
                rr.ae = plan.ae ? (plan.ae.serious ? 'SAE' : 'AE') : null;
                rr.vitals = plan.vital ? 1 : 0;
                rr.labs = plan.labs.length;
                results.push(rr);
                continue;
            }

            // ── Commit path (per-row) ──────────────────────────────────────
            // One transaction per row. Without it, a row that failed partway
            // left everything before the failure committed: a merged CRF that
            // would break validation threw *after* the subject and the visit
            // had been written and counted, so the summary reported the row as
            // an error while half of it had actually landed. The audit trail
            // has to roll back with the data too — an audit entry for something
            // that did not happen is worse than none.
            //
            // The transaction also closes the read-modify-write race on the CRF
            // merge below: two concurrent imports touching the same entry both
            // read the same dataJson and the later write silently dropped the
            // earlier one's columns. The row is locked for update before the
            // merge is computed.
            //
            // JS-side effects (summary counters, the byCode cache) are staged
            // and applied only after the transaction commits, or a rolled-back
            // row would still be counted.
            const staged = {
                subjectsCreated: 0, visitsCreated: 0, visitsUpdated: 0,
                entriesCreated: 0, entriesUpdated: 0,
                aeCreated: 0, vitalsCreated: 0, labsCreated: 0,
            };
            let cachedSubject = null;
            try {
                await db.transaction(async (tx) => {
                    for (const k of Object.keys(staged)) staged[k] = 0;
                    cachedSubject = null;
                    // 1. Subject upsert
                    let subj = existing;
                    if (!subj) {
                        if (Array.isArray(req.siteScope) && !req.siteScope.includes(effSiteId)) {
                            throw new ImportValidationError('You do not have access to this site. Select an assigned site or contact your study administrator.');
                        }
                        const [ins] = await tx.insert(subjects).values({
                            studyId: req.studyId, subjectCode: plan.subjectCode, siteId: effSiteId,
                            initials: plan.subject.initials ?? null, sex: plan.subject.sex ?? null,
                            genderIdentity: plan.subject.genderIdentity ?? null,
                            enrolledAt: plan.visitDate ? new Date(plan.visitDate) : new Date(),
                            enrolledBy: req.user.id,
                        }).returning();
                        subj = { id: ins.id, code: ins.subjectCode, siteId: ins.siteId };
                        cachedSubject = subj;
                        staged.subjectsCreated++;
                        await writeAudit(tx, { tableName: 'subjects', recordId: subj.id, action: 'INSERT', newValue: subj.code, reason: 'Subject created via import', user: req.user, ipAddress: req.ip });
                    }

                    // 2. Visit upsert (by name within subject)
                    const vmatches = await tx.select().from(visits).where(and(eq(visits.subjectId, subj.id), eq(visits.visitName, visitName)));
                    if (vmatches.length > 1) throw new ImportValidationError(`This subject has ${vmatches.length} visits named "${visitName}". Ask your study administrator to resolve the duplicate visits before importing.`);
                    let visit = vmatches[0];
                    if (!visit) {
                        const [iv] = await tx.insert(visits).values({
                            subjectId: subj.id, visitName, visitType: 'Scheduled',
                            actualDate: plan.visitDate ?? null, status: plan.visitDate ? 'Completed' : 'Scheduled',
                            createdByName: req.user.name,
                        }).returning();
                        visit = iv; staged.visitsCreated++;
                        await writeAudit(tx, { tableName: 'visits', recordId: visit.id, action: 'INSERT', newValue: `${visitName}${plan.visitDate ? ' @' + plan.visitDate : ''}`, reason: 'Visit created via import', user: req.user, ipAddress: req.ip });
                    } else if (plan.visitDate && plan.visitDate !== visit.actualDate) {
                        const wc = windowCompliance(visit.plannedDate, plan.visitDate, visit.windowDays);
                        await tx.update(visits).set({ actualDate: plan.visitDate, windowCompliance: wc, status: 'Completed', updatedAt: new Date() }).where(eq(visits.id, visit.id));
                        staged.visitsUpdated++;
                        await writeAudit(tx, { tableName: 'visits', recordId: visit.id, action: 'UPDATE', fieldName: 'actual_date', oldValue: visit.actualDate, newValue: plan.visitDate, reason: reasonText, user: req.user, ipAddress: req.ip });
                    }

                    // 3. CRF entry upsert
                    if (Object.keys(plan.crf).length) {
                        // FOR UPDATE: the merge below is a read-modify-write. Two
                        // imports touching the same entry concurrently both read the
                        // same dataJson, and the later write dropped the earlier
                        // one's columns without a trace. Replacing had the same race
                        // but at least behaved as advertised; merging looks safe and
                        // is not, unless the row is held for the whole transaction.
                        const [existEntry] = await tx.select().from(crfDataEntries)
                            .where(and(eq(crfDataEntries.subjectId, subj.id), eq(crfDataEntries.visitId, visit.id), eq(crfDataEntries.formId, parseInt(formId))))
                            .for('update');
                        if (existEntry) {
                            if (existEntry.status === 'Locked') throw new ImportValidationError('This form is locked. Contact your study administrator before importing changes.');
                            // Merge, never replace. plan.crf holds only the columns
                            // this file mapped and left non-empty (importengine.js),
                            // so assigning it wholesale deleted every answer the CSV
                            // did not happen to contain: re-importing a two-column
                            // correction against a ten-question form silently
                            // destroyed the other eight. An import can add or
                            // overwrite an answer; it must not erase one it never
                            // mentioned.
                            // plan.validation covers the mapped columns only, so the
                            // merged result — the thing actually stored — has to be
                            // re-checked. A cross-field rule can only fail once both
                            // sides are present, which is after the merge.
                            const { merged: mergedData, introduced } = mergeEntryData(existEntry.dataJson, plan.crf, formFields);
                            if (introduced.length) {
                                throw new ImportValidationError(`These changes conflict with the saved form. Correct the following items: ${introduced.join('; ')}`);
                            }
                            await tx.update(crfDataEntries).set({ dataJson: mergedData, status: 'Saved', updatedAt: new Date(), updatedBy: req.user.id }).where(eq(crfDataEntries.id, existEntry.id));
                            staged.entriesUpdated++;
                            await writeFieldDiffAudit(tx, { tableName: 'crf_data_entries', recordId: existEntry.id, oldData: existEntry.dataJson, newData: mergedData, reason: reasonText, user: req.user, ipAddress: req.ip });
                            await createAutoQueries(tx, req, plan.validation.softViolations, existEntry.id, subj.id, visit.id, formId);
                        } else {
                            const [ie] = await tx.insert(crfDataEntries).values({
                                subjectId: subj.id, visitId: visit.id, formId: parseInt(formId),
                                dataJson: plan.crf, status: 'Saved', createdBy: req.user.id,
                            }).returning();
                            staged.entriesCreated++;
                            await writeAudit(tx, { tableName: 'crf_data_entries', recordId: ie.id, action: 'INSERT', newValue: `${Object.keys(plan.crf).length} fields via import`, reason: 'CRF entry created via import', user: req.user, ipAddress: req.ip });
                            await createAutoQueries(tx, req, plan.validation.softViolations, ie.id, subj.id, visit.id, formId);
                        }
                    }

                    // 4. Adverse event (deduped by subject + term so re-imports don't duplicate)
                    if (plan.ae && plan.ae.term) {
                      const [dupAe] = await tx.select({ id: adverseEvents.id }).from(adverseEvents)
                        .where(and(eq(adverseEvents.subjectId, subj.id), eq(adverseEvents.aeTerm, plan.ae.term)));
                      if (!dupAe) {
                        const [ae] = await tx.insert(adverseEvents).values({
                            studyId: req.studyId, subjectId: subj.id,
                            aeTerm: plan.ae.term, severity: 'Unknown', codingStatus: 'Uncoded',
                            isSerious: !!plan.ae.serious, seriousCriteria: [],
                            onsetDate: plan.ae.onsetDate ?? null, narrative: plan.ae.narrative ?? null,
                            reportStatus: 'Draft', requiresExpeditedReport: !!plan.ae.serious,
                            createdBy: req.user.id, createdByName: req.user.name,
                        }).returning();
                        staged.aeCreated++;
                        await writeAudit(tx, { tableName: 'adverse_events', recordId: ae.id, action: 'INSERT', newValue: `${plan.ae.term} (import, needs coding/severity)`, reason: 'AE recorded via import', user: req.user, ipAddress: req.ip });
                      }
                    }

                    // 5. Vital signs (dedicated module) — one record per subject+visit
                    if (plan.vital) {
                        const [dupV] = await tx.select({ id: vitalSigns.id }).from(vitalSigns)
                            .where(and(eq(vitalSigns.subjectId, subj.id), eq(vitalSigns.visitId, visit.id)));
                        if (!dupV) {
                            const [vs] = await tx.insert(vitalSigns).values({
                                studyId: req.studyId, subjectId: subj.id, visitId: visit.id,
                                assessmentDate: plan.visitDate || new Date().toISOString().slice(0, 10),
                                ...plan.vital, createdBy: req.user.id, createdByName: req.user.name,
                            }).returning();
                            staged.vitalsCreated++;
                            await writeAudit(tx, { tableName: 'vital_signs', recordId: vs.id, action: 'INSERT', newValue: 'Vitals via import', reason: 'Vital signs recorded via import', user: req.user, ipAddress: req.ip });
                        }
                    }

                    // 6. Laboratory (dedicated module) — one row per test, deduped
                    for (const l of plan.labs) {
                        const [dupL] = await tx.select({ id: labResults.id }).from(labResults)
                            .where(and(eq(labResults.subjectId, subj.id), eq(labResults.visitId, visit.id), eq(labResults.testName, l.testName)));
                        if (dupL) continue;
                        const [lr] = await tx.insert(labResults).values({
                            studyId: req.studyId, subjectId: subj.id, visitId: visit.id,
                            testName: l.testName, unit: l.unit ?? null,
                            valueNumeric: /^-?\d*\.?\d+$/.test(l.value) ? l.value : null,
                            valueText: /^-?\d*\.?\d+$/.test(l.value) ? null : l.value,
                            refRangeText: l.refRangeText ?? null,
                            labName: l.labName ?? null, specimenCollectedAt: l.date ?? null, assessmentDate: l.date ?? null,
                            createdBy: req.user.id, createdByName: req.user.name,
                        }).returning();
                        staged.labsCreated++;
                        await writeAudit(tx, { tableName: 'lab_results', recordId: lr.id, action: 'INSERT', newValue: `${l.testName}=${l.value}${l.unit ? ' ' + l.unit : ''} (import)`, reason: 'Lab result recorded via import', user: req.user, ipAddress: req.ip });
                    }

                });

                // Committed — only now do the JS-side effects become true.
                for (const [k, n] of Object.entries(staged)) summary[k] += n;
                if (cachedSubject) byCode.set(cachedSubject.code, cachedSubject);
                rr.status = 'ok';
                results.push(rr);
            } catch (rowErr) {
                if (isUniqueViolation(rowErr)) {
                    // Two unique constraints can fire here now, and reporting
                    // both as "Subject code already exists" would send the
                    // operator looking in the wrong place entirely.
                    rr.messages = [uniqueConstraintName(rowErr).includes('crf_entry')
                        ? 'Another import or data entry created this CRF entry at the same moment — re-run this row'
                        : 'Subject code already exists'];
                } else rr.messages = [rowErr instanceof ImportValidationError ? rowErr.message : 'This row could not be imported. Contact your study administrator before retrying.'];
                rr.status = 'error'; summary.errors++;
                results.push(rr);
            }
        }

        res.json({ dryRun: !!dryRun, summary, rows: results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/import/template?formId= ────────────────────────────────────────
router.get('/template', requireRole(...IMPORT_ROLES), async (req, res) => {
    try {
        const [form] = await db.select().from(crfForms).where(eq(crfForms.id, parseInt(req.query.formId)));
        if (!form || !sameOrg(req, form.organizationId)) return res.status(404).json({ error: 'Form not found' });
        const cols = ['ID Subjek', 'Tanggal Kedatangan', ...(form.schemaJson?.fields ?? []).map(f => f.label)];
        const csv = '﻿' + cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\r\n';
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="import_template_${form.id}.csv"`);
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
```

## src/backend/routes/monitoring.js

```javascript
// Monitoring Visit Reports & SDV — ICH GCP E6(R3) §5.18
// CRA monitoring visit records with source data verification tracking

import { Router } from 'express';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { monitoringVisits, sdvRecords, subjects, sites } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';
import { checkAndNotifyVisitClean } from '../lib/visitclean.js';

const router = Router();

function isMissingTable(err) {
    const c = err?.cause;
    return err?.code === '42P01' || c?.code === '42P01' ||
           (err?.message || '').includes('does not exist') ||
           (c?.message || '').includes('does not exist');
}

// GET /api/monitoring — list monitoring visits
router.get('/', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const { status, siteId } = req.query;
        const conditions = [eq(monitoringVisits.studyId, req.studyId)];
        if (status) conditions.push(eq(monitoringVisits.status, status));
        if (siteId) conditions.push(eq(monitoringVisits.siteId, parseInt(siteId)));

        const rows = await db.select().from(monitoringVisits)
            .where(and(...conditions))
            .orderBy(desc(monitoringVisits.visitDate));

        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.status(503).json({ error: 'This information is temporarily unavailable. Contact your study administrator.' });
        res.status(500).json({ error: err.message });
    }
});

// GET /api/monitoring/sdv-summary — SDV completion rates per site
router.get('/sdv-summary', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const sid = req.studyId;
        const mvRows = await db.select({
            id: monitoringVisits.id, siteId: monitoringVisits.siteId, siteName: monitoringVisits.siteName,
        }).from(monitoringVisits).where(eq(monitoringVisits.studyId, sid));

        if (!mvRows.length) return res.json([]);

        const visitIds   = mvRows.map(v => v.id);
        const sdvRows    = await db.select({
            monitoringVisitId: sdvRecords.monitoringVisitId, sdvStatus: sdvRecords.sdvStatus,
        }).from(sdvRecords).where(inArray(sdvRecords.monitoringVisitId, visitIds));

        const visitSiteMap = new Map(mvRows.map(v => [v.id, { siteId: v.siteId, siteName: v.siteName }]));
        const siteStats   = new Map();

        for (const v of mvRows) {
            const key = v.siteId ?? 'unknown';
            if (!siteStats.has(key)) {
                siteStats.set(key, { siteId: v.siteId, siteName: v.siteName ?? 'Unknown', total: 0, verified: 0, discrepant: 0, notReviewed: 0 });
            }
        }

        for (const s of sdvRows) {
            const info = visitSiteMap.get(s.monitoringVisitId);
            const key  = info?.siteId ?? 'unknown';
            const stat = siteStats.get(key);
            if (!stat) continue;
            stat.total++;
            if (s.sdvStatus === 'Verified')     stat.verified++;
            else if (s.sdvStatus === 'Discrepant') stat.discrepant++;
            else                               stat.notReviewed++;
        }

        res.json(Array.from(siteStats.values()).map(s => ({
            ...s,
            verifiedPct: s.total > 0 ? Math.round((s.verified / s.total) * 100) : 0,
        })));
    } catch (err) {
        if (isMissingTable(err)) return res.status(503).json({ error: 'This information is temporarily unavailable. Contact your study administrator.' });
        res.status(500).json({ error: err.message });
    }
});

// GET /api/monitoring/:id — single monitoring visit with SDV records
router.get('/:id', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [visit] = await db.select().from(monitoringVisits)
            .where(eq(monitoringVisits.id, id));
        if (!visit) return res.status(404).json({ error: 'Monitoring visit not found' });

        const sdv = await db.select().from(sdvRecords)
            .where(eq(sdvRecords.monitoringVisitId, id))
            .orderBy(sdvRecords.subjectCode, sdvRecords.visitName);

        res.json({ ...visit, sdvRecords: sdv });
    } catch (err) {
        if (isMissingTable(err)) return res.status(503).json({ error: 'This information is temporarily unavailable. Contact your study administrator.' });
        res.status(500).json({ error: err.message });
    }
});

// POST /api/monitoring — create monitoring visit (cra/admin)
router.post('/', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const {
            visitDate, siteId, visitType, findings,
            actionItems, subjectsReviewed, nextVisitDate, notes,
        } = req.body;

        if (!visitDate || !visitType) {
            return res.status(400).json({ error: 'visitDate and visitType are required' });
        }

        let siteName = null;
        if (siteId) {
            const [site] = await db.select({ name: sites.name }).from(sites)
                .where(eq(sites.id, parseInt(siteId)));
            siteName = site?.name ?? null;
        }

        const [record] = await db.insert(monitoringVisits).values({
            studyId:          req.studyId,
            visitDate,
            siteId:           siteId ? parseInt(siteId) : null,
            siteName,
            visitType,
            craId:            req.user.id,
            craName:          req.user.name,
            findings:         findings ?? null,
            actionItems:      Array.isArray(actionItems) ? actionItems : [],
            subjectsReviewed: Array.isArray(subjectsReviewed) ? subjectsReviewed : [],
            nextVisitDate:    nextVisitDate ?? null,
            notes:            notes ?? null,
            status:           'Draft',
        }).returning();

        await writeAudit(db, {
            tableName: 'monitoring_visits', recordId: record.id, action: 'INSERT',
            newValue: `${visitType} monitoring visit on ${visitDate} by ${req.user.name}`,
            reason: 'Monitoring visit created per ICH GCP E6(R3) §5.18',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/monitoring/:id — update draft visit
router.patch('/:id', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [existing] = await db.select().from(monitoringVisits)
            .where(eq(monitoringVisits.id, id));
        if (!existing) return res.status(404).json({ error: 'Monitoring visit not found' });
        if (existing.status === 'Acknowledged') {
            return res.status(409).json({ error: 'Cannot edit an acknowledged monitoring visit' });
        }

        const { visitDate, visitType, findings, actionItems, subjectsReviewed, nextVisitDate, notes } = req.body;
        const updates = { updatedAt: new Date() };
        if (visitDate         !== undefined) updates.visitDate         = visitDate;
        if (visitType         !== undefined) updates.visitType         = visitType;
        if (findings          !== undefined) updates.findings          = findings;
        if (actionItems       !== undefined) updates.actionItems       = actionItems;
        if (subjectsReviewed  !== undefined) updates.subjectsReviewed  = subjectsReviewed;
        if (nextVisitDate     !== undefined) updates.nextVisitDate     = nextVisitDate;
        if (notes             !== undefined) updates.notes             = notes;

        const [updated] = await db.update(monitoringVisits).set(updates)
            .where(eq(monitoringVisits.id, id)).returning();

        await writeAudit(db, {
            tableName: 'monitoring_visits', recordId: id, action: 'UPDATE',
            newValue: JSON.stringify(updates),
            reason: 'Monitoring visit updated',
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/monitoring/:id/submit — CRA submits the visit report for PI review
router.post('/:id/submit', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [existing] = await db.select().from(monitoringVisits)
            .where(eq(monitoringVisits.id, id));
        if (!existing) return res.status(404).json({ error: 'Monitoring visit not found' });
        if (existing.status !== 'Draft') return res.status(409).json({ error: 'Only draft visits can be submitted' });

        const [updated] = await db.update(monitoringVisits)
            .set({ status: 'Submitted', submittedAt: new Date(), updatedAt: new Date() })
            .where(eq(monitoringVisits.id, id)).returning();

        await writeAudit(db, {
            tableName: 'monitoring_visits', recordId: id, action: 'UPDATE',
            fieldName: 'status', oldValue: 'Draft', newValue: 'Submitted',
            reason: 'Monitoring visit report submitted for PI review',
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/monitoring/:id/acknowledge — PI/Admin acknowledges the visit report
router.post('/:id/acknowledge', requireRole('admin', 'pi'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { piComments } = req.body;

        const [existing] = await db.select().from(monitoringVisits)
            .where(eq(monitoringVisits.id, id));
        if (!existing) return res.status(404).json({ error: 'Monitoring visit not found' });
        if (existing.status !== 'Submitted') {
            return res.status(409).json({ error: 'Only submitted visits can be acknowledged' });
        }

        const now = new Date();
        const [updated] = await db.update(monitoringVisits).set({
            status:              'Acknowledged',
            acknowledgedBy:      req.user.id,
            acknowledgedByName:  req.user.name,
            acknowledgedAt:      now,
            piComments:          piComments ?? null,
            updatedAt:           now,
        }).where(eq(monitoringVisits.id, id)).returning();

        await writeAudit(db, {
            tableName: 'monitoring_visits', recordId: id, action: 'UPDATE',
            fieldName: 'status', oldValue: 'Submitted', newValue: 'Acknowledged',
            reason: `Monitoring visit acknowledged by ${req.user.name} (PI/Admin)`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/monitoring/:id/sdv — list SDV records for a visit
router.get('/:id/sdv', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const rows = await db.select().from(sdvRecords)
            .where(eq(sdvRecords.monitoringVisitId, id))
            .orderBy(sdvRecords.subjectCode, sdvRecords.visitName);
        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.status(503).json({ error: 'This information is temporarily unavailable. Contact your study administrator.' });
        res.status(500).json({ error: err.message });
    }
});

// POST /api/monitoring/:id/sdv — add or update an SDV record
router.post('/:id/sdv', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const monitoringVisitId = parseInt(req.params.id);
        const {
            subjectId, subjectCode, visitId, visitName,
            formId, formName, sdvStatus, discrepancyNote,
        } = req.body;

        if (!subjectCode || !sdvStatus) {
            return res.status(400).json({ error: 'subjectCode and sdvStatus are required' });
        }

        const validStatuses = ['Verified', 'Discrepant', 'Not Reviewed', 'N/A'];
        if (!validStatuses.includes(sdvStatus)) {
            return res.status(400).json({ error: `sdvStatus must be one of: ${validStatuses.join(', ')}` });
        }

        // Check if record already exists for this visit+subject+form combination
        const conditions = [
            eq(sdvRecords.monitoringVisitId, monitoringVisitId),
            eq(sdvRecords.subjectCode, subjectCode),
        ];
        if (formId) conditions.push(eq(sdvRecords.formId, parseInt(formId)));
        if (visitId) conditions.push(eq(sdvRecords.visitId, parseInt(visitId)));

        const [existing] = await db.select().from(sdvRecords).where(and(...conditions));

        const now = new Date();
        let record;
        if (existing) {
            [record] = await db.update(sdvRecords).set({
                sdvStatus,
                discrepancyNote: discrepancyNote ?? null,
                verifiedBy:      req.user.id,
                verifiedByName:  req.user.name,
                verifiedAt:      now,
            }).where(eq(sdvRecords.id, existing.id)).returning();
        } else {
            [record] = await db.insert(sdvRecords).values({
                monitoringVisitId,
                subjectId:       subjectId ? parseInt(subjectId) : null,
                subjectCode,
                visitId:         visitId ? parseInt(visitId) : null,
                visitName:       visitName ?? null,
                formId:          formId ? parseInt(formId) : null,
                formName:        formName ?? null,
                sdvStatus,
                discrepancyNote: discrepancyNote ?? null,
                verifiedBy:      req.user.id,
                verifiedByName:  req.user.name,
                verifiedAt:      now,
            }).returning();
        }

        await writeAudit(db, {
            tableName: 'sdv_records', recordId: record.id, action: existing ? 'UPDATE' : 'INSERT',
            newValue: `SDV: ${subjectCode}${visitName ? ` / ${visitName}` : ''}${formName ? ` / ${formName}` : ''} → ${sdvStatus}`,
            reason: `Source data verification per ICH GCP E6(R3) §5.18.4`,
            user: req.user, ipAddress: req.ip,
        });

        // If SDV status changed to Verified, check if subject is now fully clean
        if (sdvStatus === 'Verified' && record.subjectId) {
            checkAndNotifyVisitClean(req.studyId, record.subjectId).catch(() => {});
        }

        res.status(existing ? 200 : 201).json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/monitoring/:id/report — structured report for printing/export
router.get('/:id/report', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [visit] = await db.select().from(monitoringVisits).where(eq(monitoringVisits.id, id));
        if (!visit) return res.status(404).json({ error: 'Monitoring visit not found' });

        const sdv = await db.select().from(sdvRecords)
            .where(eq(sdvRecords.monitoringVisitId, id))
            .orderBy(sdvRecords.subjectCode, sdvRecords.visitName);

        const total      = sdv.length;
        const verified   = sdv.filter(s => s.sdvStatus === 'Verified').length;
        const discrepant = sdv.filter(s => s.sdvStatus === 'Discrepant').length;

        res.json({
            ...visit,
            sdvRecords: sdv,
            sdvSummary: {
                total, verified, discrepant, notReviewed: total - verified - discrepant,
                verifiedPct: total > 0 ? Math.round((verified / total) * 100) : 0,
            },
            generatedAt: new Date().toISOString(),
        });
    } catch (err) {
        if (isMissingTable(err)) return res.status(503).json({ error: 'This information is temporarily unavailable. Contact your study administrator.' });
        res.status(500).json({ error: err.message });
    }
});

export default router;
```

## src/backend/routes/register.js

```javascript
import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { auth } from '../auth/better-auth.js';
import { db } from '../db/connection.js';
import { passwordMeta, user, organizations } from '../db/schemas/schema.js';
import { validatePassword } from '../lib/passwordpolicy.js';
import { getLicense } from '../lib/license.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

// Version of the vendor License Agreement + Privacy Policy the first-run admin
// accepts during setup. Bump this when docs/legal/ terms change materially so
// the audit trail records which revision was agreed to.
const LICENSE_AGREEMENT_VERSION = '1.0';

// First-run bootstrap admin (becomes an admin of the default organization).
// On-premise installs set ADMIN_EMAIL in their .env so the customer's own IT
// admin can register the first account. Falls back to the original hosted-
// deployment address for continuity when the variable is unset.
const ADMIN_EMAIL  = (process.env.ADMIN_EMAIL || 'renfael6@gmail.com').trim().toLowerCase();
// SaaS bootstrap: the platform operator. This email may self-register once as
// platform_owner (cross-tenant, no organization). Set in production env.
const PLATFORM_OWNER_EMAIL = (process.env.PLATFORM_OWNER_EMAIL || '').trim().toLowerCase();
const ALLOWED_ROLES = ['investigator', 'pi', 'cra', 'crc'];

// Per PANDUAN §1: accounts are created by an administrator. Self-registration
// is disabled unless explicitly enabled (dev/demo); the two bootstrap emails
// are always allowed so a fresh deploy can create its first operator/admin.
const SELF_REGISTRATION_OPEN = process.env.ALLOW_SELF_REGISTRATION === 'true';

// The default organization absorbs legacy/self-registered non-platform accounts.
async function defaultOrgId() {
    try {
        const [org] = await db.select({ id: organizations.id }).from(organizations)
            .where(eq(organizations.slug, 'default'));
        return org?.id ?? null;
    } catch {
        return null;
    }
}

// GET /api/register/config — lets the login page decide whether to show a
// "Register" link. Shown when self-registration is open, or on a fresh install
// with no users yet (so the first administrator can be bootstrapped). The
// bootstrap email itself is NOT returned (avoids leaking it before setup).
router.get('/config', async (_req, res) => {
    let bootstrapNeeded = false;
    try {
        const rows = await db.select({ id: user.id }).from(user).limit(1);
        bootstrapNeeded = rows.length === 0;
    } catch {
        bootstrapNeeded = false;
    }
    // On a fresh install the first admin must accept the License Agreement.
    // Expose only the non-sensitive license summary (name + expiry that appear
    // on the paper contract anyway) so the setup screen can name what is being
    // accepted. Nothing is returned once users exist.
    let license = null;
    if (bootstrapNeeded) {
        const lic = getLicense();
        license = {
            present:   lic.present,
            active:    lic.active,
            customer:  lic.customer,
            expiresAt: lic.expiresAt,
            agreementVersion: LICENSE_AGREEMENT_VERSION,
        };
    }
    res.json({ selfRegistration: SELF_REGISTRATION_OPEN, bootstrapNeeded, license });
});

// POST /api/register — validated signup (blocks privilege self-assignment)
router.post('/', async (req, res) => {
    const { name, email, password, role, acceptedLicense } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isPlatformBootstrap = PLATFORM_OWNER_EMAIL && normalizedEmail === PLATFORM_OWNER_EMAIL;
    const isAdminBootstrap    = normalizedEmail === ADMIN_EMAIL;

    if (!SELF_REGISTRATION_OPEN && !isPlatformBootstrap && !isAdminBootstrap) {
        return res.status(403).json({
            message: 'Self-registration is disabled. Accounts are created by the Administrator.',
        });
    }

    // The first-run administrator sets up the on-premise instance, so this is
    // the point at which the customer institution accepts the vendor License
    // Agreement & Privacy Policy. Require explicit acceptance and record it.
    if (isAdminBootstrap && acceptedLicense !== true) {
        return res.status(400).json({
            message: 'You must accept the License Agreement & Privacy Policy to set up this system.',
        });
    }

    // Validate password against ICH GCP E6(R3) C.4.3 policy
    const policyErrors = validatePassword(password, normalizedEmail);
    if (policyErrors.length > 0) {
        return res.status(400).json({ message: 'Password does not meet security requirements.', details: policyErrors });
    }

    // Resolve the role + organization the new account will receive.
    let assignedRole;
    let assignedOrgId = null;   // null = platform_owner (cross-tenant)
    if (isPlatformBootstrap) {
        assignedRole = 'platform_owner';           // no organization
    } else if (isAdminBootstrap) {
        // The designated bootstrap email always becomes the admin of the default
        // organization, regardless of which role the form submitted (the register
        // form does not expose an "admin" option). This is the first-run admin.
        assignedRole = 'admin';
        assignedOrgId = await defaultOrgId();
    } else if (ALLOWED_ROLES.includes(role)) {
        assignedRole = role;
        assignedOrgId = await defaultOrgId();
    } else {
        assignedRole = 'investigator';
        assignedOrgId = await defaultOrgId();
    }

    try {
        const result = await auth.api.signUpEmail({
            body: { name, email: normalizedEmail, password },
        });

        if (!result) {
            return res.status(400).json({ message: 'Registration failed. Please try again.' });
        }

        // Role/org are input:false in Better Auth (privilege-escalation guard),
        // so they must be assigned server-side after the account is created.
        if (result.user?.id) {
            await db.update(user).set({ role: assignedRole, organizationId: assignedOrgId, emailVerified: true })
                .where(eq(user.id, result.user.id));

            // Initialize password metadata per ICH GCP E6(R3) C.4.3
            await db.insert(passwordMeta)
                .values({ userId: result.user.id, lastChangedAt: new Date(), mustChange: false })
                .onConflictDoNothing();

            // Record the first-run admin's acceptance of the License Agreement &
            // Privacy Policy in the immutable audit trail (21 CFR Part 11 evidence
            // that the customer institution agreed to the vendor terms at setup).
            if (isAdminBootstrap) {
                try {
                    const lic = getLicense();
                    await writeAudit(db, {
                        tableName: 'license_acceptance',
                        recordId:  lic.customer || 'on-premise',
                        action:    'AGREE',   // audit_action enum; same value the agreements flow uses
                        fieldName: 'license_agreement',
                        newValue:  JSON.stringify({
                            agreementVersion: LICENSE_AGREEMENT_VERSION,
                            documents:        ['Terms & Conditions', 'Privacy Policy'],
                            licenseCustomer:  lic.customer,
                            licenseExpiresAt: lic.expiresAt,
                            licensePresent:   lic.present,
                            licenseActive:    lic.active,
                        }),
                        reason: 'First-run administrator accepted the License Agreement & Privacy Policy during setup.',
                        user:   { id: result.user.id, name, role: assignedRole, organizationId: assignedOrgId },
                        ipAddress: req.ip,
                    });
                } catch (auditErr) {
                    // Acceptance was given by the user; a failure to write the audit
                    // row must not silently pass. Surface it so setup can be retried.
                    console.error('License acceptance audit failed:', auditErr.message);
                    return res.status(500).json({ message: 'Could not record license acceptance. Please try again.' });
                }
            }
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        const msg = err.message || '';
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('duplicate')) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }
        console.error('Register error:', msg);
        return res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
});

export default router;
```

## src/backend/routes/saereports.js

```javascript
// SAE Expedited Reporting — ICH E2A §4
// 7-day: fatal/life-threatening | 15-day: all other serious AEs

import { Router } from 'express';
import { eq, and, desc, lt } from 'drizzle-orm';
import { verifyPassword } from '@better-auth/utils/password';
import { db } from '../db/connection.js';
import { saeReports, adverseEvents, subjects, account } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAudit } from '../lib/audit.js';

async function checkPassword(userId, password) {
    const [acct] = await db
        .select({ password: account.password })
        .from(account)
        .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
    if (!acct?.password) return false;
    return verifyPassword(acct.password, password);
}

const router = Router();

function isMissingTable(err) {
    const c = err?.cause;
    return err?.code === '42P01' || c?.code === '42P01' ||
           (err?.message || '').includes('does not exist') ||
           (c?.message || '').includes('does not exist');
}

function calcDeadline(day0Date, deadlineDays) {
    const d = new Date(day0Date);
    d.setDate(d.getDate() + deadlineDays);
    return d;
}

// GET /api/saereports — list all SAE reports with AE + subject info
router.get('/', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const { aeId, status } = req.query;
        const conditions = [eq(adverseEvents.studyId, req.studyId)];
        if (aeId)   conditions.push(eq(saeReports.aeId, parseInt(aeId)));
        if (status) conditions.push(eq(saeReports.status, status));

        const rows = await db
            .select({
                id:               saeReports.id,
                aeId:             saeReports.aeId,
                aeTerm:           adverseEvents.aeTerm,
                subjectCode:      subjects.subjectCode,
                reportType:       saeReports.reportType,
                reportNumber:     saeReports.reportNumber,
                day0Date:         saeReports.day0Date,
                deadlineDays:     saeReports.deadlineDays,
                deadlineDate:     saeReports.deadlineDate,
                submittedAt:      saeReports.submittedAt,
                submissionRef:    saeReports.submissionRef,
                submittedTo:      saeReports.submittedTo,
                narrative:        saeReports.narrative,
                status:           saeReports.status,
                submittedByName:  saeReports.submittedByName,
                createdByName:    saeReports.createdByName,
                createdAt:        saeReports.createdAt,
            })
            .from(saeReports)
            .leftJoin(adverseEvents, eq(saeReports.aeId, adverseEvents.id))
            .leftJoin(subjects, eq(adverseEvents.subjectId, subjects.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(saeReports.createdAt));

        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.status(503).json({ error: 'This information is temporarily unavailable. Contact your study administrator.' });
        res.status(500).json({ error: err.message });
    }
});

// GET /api/saereports/overdue — reports past deadline not yet submitted
router.get('/overdue', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const now = new Date();
        const rows = await db
            .select({
                id:           saeReports.id,
                aeId:         saeReports.aeId,
                aeTerm:       adverseEvents.aeTerm,
                subjectCode:  subjects.subjectCode,
                reportType:   saeReports.reportType,
                deadlineDays: saeReports.deadlineDays,
                deadlineDate: saeReports.deadlineDate,
                status:       saeReports.status,
                createdByName: saeReports.createdByName,
            })
            .from(saeReports)
            .leftJoin(adverseEvents, eq(saeReports.aeId, adverseEvents.id))
            .leftJoin(subjects, eq(adverseEvents.subjectId, subjects.id))
            .where(and(eq(adverseEvents.studyId, req.studyId), eq(saeReports.status, 'Pending'), lt(saeReports.deadlineDate, now)))
            .orderBy(saeReports.deadlineDate);

        res.json(rows);
    } catch (err) {
        if (isMissingTable(err)) return res.status(503).json({ error: 'This information is temporarily unavailable. Contact your study administrator.' });
        res.status(500).json({ error: err.message });
    }
});

// GET /api/saereports/:id — single SAE report
router.get('/:id', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const [row] = await db.select().from(saeReports)
            .where(eq(saeReports.id, parseInt(req.params.id)));
        if (!row) return res.status(404).json({ error: 'SAE report not found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/saereports — create SAE report (pi/cra/admin)
router.post('/', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const { aeId, reportType, day0Date, deadlineDays, submittedTo, narrative } = req.body;

        if (!aeId || !reportType || !day0Date || !deadlineDays) {
            return res.status(400).json({ error: 'aeId, reportType, day0Date, and deadlineDays are required' });
        }

        const days = parseInt(deadlineDays);
        if (![7, 15].includes(days)) {
            return res.status(400).json({ error: 'deadlineDays must be 7 or 15 (ICH E2A)' });
        }

        const [ae] = await db.select({ id: adverseEvents.id, isSerious: adverseEvents.isSerious })
            .from(adverseEvents).where(eq(adverseEvents.id, parseInt(aeId)));
        if (!ae) return res.status(404).json({ error: 'Adverse event not found' });
        if (!ae.isSerious) return res.status(400).json({ error: 'Only serious adverse events require expedited reports' });

        // Find the report number (sequential per AE)
        const existing = await db.select({ id: saeReports.id })
            .from(saeReports).where(eq(saeReports.aeId, parseInt(aeId)));
        const reportNumber = existing.length + 1;

        const deadlineDate = calcDeadline(day0Date, days);

        const [record] = await db.insert(saeReports).values({
            aeId:          parseInt(aeId),
            reportType,
            reportNumber,
            day0Date,
            deadlineDays:  days,
            deadlineDate,
            submittedTo:   submittedTo ?? null,
            narrative:     narrative ?? null,
            status:        'Pending',
            createdBy:     req.user.id,
            createdByName: req.user.name,
        }).returning();

        await writeAudit(db, {
            tableName: 'sae_reports', recordId: record.id, action: 'INSERT',
            newValue: `${reportType} SAE report #${reportNumber} — deadline ${days}d (${deadlineDate.toLocaleDateString()})`,
            reason: `SAE expedited reporting per ICH E2A §4 (${days}-day requirement)`,
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/saereports/:id/sign — e-sign by investigator (ICH GCP E6(R3) C.4.4)
router.patch('/:id/sign', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { password, meaning } = req.body;
        if (!password || !meaning) {
            return res.status(400).json({ error: 'password and meaning are required' });
        }

        const [existing] = await db.select().from(saeReports).where(eq(saeReports.id, id));
        if (!existing) return res.status(404).json({ error: 'SAE report not found' });
        if (existing.signedAt) {
            return res.status(409).json({ error: 'Already signed' });
        }

        const ok = await checkPassword(req.user.id, password);
        if (!ok) return res.status(401).json({ error: 'Invalid password' });

        const now = new Date();
        const [updated] = await db.update(saeReports).set({
            signedBy:       req.user.id,
            signedByName:   req.user.name,
            signedAt:       now,
            signingMeaning: meaning,
            updatedAt:      now,
        }).where(eq(saeReports.id, id)).returning();

        await writeAudit(db, {
            tableName: 'sae_reports', recordId: id, action: 'UPDATE',
            fieldName: 'signed_at',
            newValue: `Signed by ${req.user.name} | Meaning: ${meaning}`,
            reason: `SAE report e-signed — ${meaning}`,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/saereports/:id/submit — mark SAE report as submitted
router.patch('/:id/submit', requireRole('admin', 'cra', 'pi', 'data_manager'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { submissionRef, narrative } = req.body;

        const [existing] = await db.select().from(saeReports).where(eq(saeReports.id, id));
        if (!existing) return res.status(404).json({ error: 'SAE report not found' });
        if (existing.status === 'Submitted' || existing.status === 'Late Submission') {
            return res.status(409).json({ error: 'Already submitted' });
        }
        if (!existing.signedAt) {
            return res.status(400).json({ error: 'SAE report must be signed by an investigator before submission (ICH GCP E6(R3) C.4.4)' });
        }

        const now = new Date();
        const isLate = now > new Date(existing.deadlineDate);
        const newStatus = isLate ? 'Late Submission' : 'Submitted';
        const daysLate = isLate
            ? Math.ceil((now - new Date(existing.deadlineDate)) / 86400000)
            : 0;

        const [updated] = await db.update(saeReports).set({
            status:          newStatus,
            submittedAt:     now,
            submissionRef:   submissionRef ?? existing.submissionRef,
            narrative:       narrative ?? existing.narrative,
            submittedBy:     req.user.id,
            submittedByName: req.user.name,
            updatedAt:       now,
        }).where(eq(saeReports.id, id)).returning();

        const auditReason = isLate
            ? `LATE SUBMISSION — ${daysLate} day(s) past ${existing.deadlineDays}-day deadline${submissionRef ? ` | ref: ${submissionRef}` : ''}`
            : `SAE submitted within ${existing.deadlineDays}-day deadline${submissionRef ? ` | ref: ${submissionRef}` : ''}`;

        await writeAudit(db, {
            tableName: 'sae_reports', recordId: id, action: 'UPDATE',
            fieldName: 'status', oldValue: existing.status, newValue: newStatus,
            reason: auditReason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
```

## src/backend/routes/signup.js

```javascript
// Self-service tenant signup — a new customer creates their own organization
// and becomes its admin, starting a gated 14-day trial. Disabled unless
// ALLOW_TENANT_SIGNUP=true. Never creates platform_owner or joins an existing
// org — always a fresh tenant. Email must be verified before login.

import { Router } from 'express';
import { eq, and, like, gt } from 'drizzle-orm';
import crypto from 'crypto';
import { auth } from '../auth/better-auth.js';
import { db } from '../db/connection.js';
import { organizations, user, passwordMeta, userAgreements, verification } from '../db/schemas/schema.js';
import { validatePassword } from '../lib/passwordpolicy.js';
import { sendVerificationEmail } from '../lib/email.js';
import { writeAudit } from '../lib/audit.js';

const router = Router();

const TRIAL_DAYS = 14;
const TOS_VERSION = 'ToS-DPA-v1';
const signupEnabled = () => process.env.ALLOW_TENANT_SIGNUP === 'true';
const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function uniqueSlug(base) {
    let slug = slugify(base) || 'org';
    for (let n = 1; ; n++) {
        const candidate = n === 1 ? slug : `${slug}-${n}`;
        const [hit] = await db.select({ id: organizations.id }).from(organizations)
            .where(eq(organizations.slug, candidate));
        if (!hit) return candidate;
    }
}

// GET /api/signup/config — whether self-service signup is open (for the UI).
router.get('/config', (_req, res) => {
    res.json({ enabled: signupEnabled(), trialDays: TRIAL_DAYS, tosVersion: TOS_VERSION });
});

// POST /api/signup — create a new tenant + its admin (trial), send verification.
router.post('/', async (req, res) => {
    if (!signupEnabled()) {
        return res.status(403).json({ message: 'Self-service signup is not available. Contact sales.' });
    }
    const { orgName, adminName, adminEmail, password, acceptTos } = req.body;
    if (!orgName || !adminName || !adminEmail || !password) {
        return res.status(400).json({ message: 'Organization name, your name, email, and password are required.' });
    }
    if (acceptTos !== true) {
        return res.status(400).json({ message: 'You must accept the Terms of Service and Data Processing Agreement.' });
    }
    const email = String(adminEmail).trim().toLowerCase();

    const policyErrors = validatePassword(password, email);
    if (policyErrors.length) {
        return res.status(400).json({ message: 'Password does not meet security requirements.', details: policyErrors });
    }

    const [dup] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
    if (dup) return res.status(409).json({ message: 'An account with this email already exists.' });

    try {
        const slug = await uniqueSlug(orgName);
        const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86400000);

        // 1. Tenant (trial).
        const [org] = await db.insert(organizations).values({
            name: String(orgName).trim(), slug, status: 'Active',
            plan: 'trial', subscriptionStatus: 'Trialing', trialEndsAt,
        }).returning();

        // 2. Admin account (unverified until the email is confirmed).
        const signUp = await auth.api.signUpEmail({
            body: { name: String(adminName).trim(), email, password },
        });
        if (!signUp?.user?.id) return res.status(400).json({ message: 'Signup failed. Please try again.' });
        const userId = signUp.user.id;

        await db.update(user)
            .set({ role: 'admin', organizationId: org.id, emailVerified: false })
            .where(eq(user.id, userId));
        await db.insert(passwordMeta)
            .values({ userId, lastChangedAt: new Date(), mustChange: false })
            .onConflictDoNothing();

        // 3. Record ToS/DPA acceptance (click-through consent).
        await db.insert(userAgreements).values({
            userId, agreementType: 'Data_Privacy', agreementVersion: TOS_VERSION,
            ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
        });

        // 4. Email-verification token (24h).
        const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomBytes(8).toString('hex');
        await db.insert(verification).values({
            id: crypto.randomUUID(),
            identifier: `email-verify:${email}`,
            value: token,
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        });

        const base = process.env.BETTER_AUTH_URL || `${req.protocol}://${req.get('host')}`;
        const verifyUrl = `${base}/api/signup/verify?token=${token}`;
        sendVerificationEmail(email, adminName, { verifyUrl, orgName }).catch(() => {});
        if (!process.env.SMTP_HOST) console.log(`[signup] verification link for ${email}: ${verifyUrl}`);

        await writeAudit(db, {
            tableName: 'organizations', recordId: String(org.id), action: 'INSERT',
            newValue: `Self-service trial signup: "${org.name}" (${slug}), admin <${email}>`,
            reason: 'Self-service tenant signup',
            user: { id: userId, name: adminName, role: 'admin', organizationId: org.id },
            ipAddress: req.ip,
        });

        res.status(201).json({ ok: true, message: 'Check your email to verify your address and activate your trial.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/signup/verify?token= — confirm email, then send to login.
router.get('/verify', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send('Missing token.');
    try {
        const [row] = await db.select().from(verification)
            .where(and(like(verification.identifier, 'email-verify:%'),
                       eq(verification.value, String(token)),
                       gt(verification.expiresAt, new Date())));
        if (!row) return res.redirect('/login.html?verify=expired');

        const email = row.identifier.slice('email-verify:'.length);
        await db.update(user).set({ emailVerified: true }).where(eq(user.email, email));
        await db.delete(verification).where(eq(verification.id, row.id));
        res.redirect('/login.html?verified=1');
    } catch (err) {
        res.status(500).json({ error: 'Email verification could not be completed. Try the verification link again later.' });
    }
});

export default router;
```

## src/backend/routes/subjects.js

```javascript
import { Router } from 'express';
import { eq, ilike, and, count, sql } from 'drizzle-orm';
import { db, client } from '../db/connection.js';
import { subjects, sites, visits, ieAssessments, crfDataEntries, queries, subjectRandomization, screeningLog, studies } from '../db/schemas/schema.js';
import { requireRole } from '../middleware/rbac.js';
import { licenseGuardCreate } from '../lib/licenseguard.js';
import { isUniqueViolation } from '../lib/dberrors.js';
import { writeAudit } from '../lib/audit.js';
import { siteCondition, subjectInSiteScope } from '../lib/sitescope.js';
import { effectiveOrgId } from '../lib/tenantscope.js';
import { checkLimit } from '../lib/plans.js';
import { plannedDateFor } from '../lib/visitschedule.js';

const router = Router();

// GET /api/subjects — list with optional ?status=&search=
router.get('/', async (req, res) => {
    try {
        const { status, search } = req.query;
        const conditions = [eq(subjects.studyId, req.studyId)];
        if (status) conditions.push(eq(subjects.status, status));
        if (search) conditions.push(ilike(subjects.subjectCode, `%${search}%`));
        // Site isolation: PI/investigator/CRC only see their assigned sites'
        // subjects (user_sites per study + legacy user.site_id).
        const siteCond = siteCondition(req);
        if (siteCond) conditions.push(siteCond);

        const rows = await db
            .select({
                id:             subjects.id,
                subjectCode:    subjects.subjectCode,
                initials:       subjects.initials,
                sex:            subjects.sex,
                genderIdentity: subjects.genderIdentity,
                dateOfBirth:    subjects.dateOfBirth,
                status:         subjects.status,
                enrolledAt:     subjects.enrolledAt,
                siteCode:       sites.code,
                siteName:       sites.name,
            })
            .from(subjects)
            .leftJoin(sites, eq(subjects.siteId, sites.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(subjects.enrolledAt);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/subjects/status-overview — PI/admin/CRA aggregate view: entries, signatures, queries, randomization per subject
router.get('/status-overview', requireRole('pi', 'admin', 'cra', 'data_manager'), async (req, res) => {
    try {
        const studySubjects = await db
            .select({
                id:          subjects.id,
                subjectCode: subjects.subjectCode,
                initials:    subjects.initials,
                status:      subjects.status,
                siteCode:    sites.code,
                siteName:    sites.name,
            })
            .from(subjects)
            .leftJoin(sites, eq(subjects.siteId, sites.id))
            .where(eq(subjects.studyId, req.studyId))
            .orderBy(subjects.subjectCode);

        if (studySubjects.length === 0) return res.json([]);

        const subjectIds = studySubjects.map(s => s.id);

        // Entry counts grouped by subjectId + status
        const entryCounts = await db
            .select({
                subjectId: crfDataEntries.subjectId,
                status:    crfDataEntries.status,
                cnt:       count(),
            })
            .from(crfDataEntries)
            .where(sql`${crfDataEntries.subjectId} = ANY(${sql.raw(`ARRAY[${subjectIds.join(',')}]`)})`)
            .groupBy(crfDataEntries.subjectId, crfDataEntries.status);

        // Count signed entries per subject (join back to crfDataEntries)
        const signedPerSubject = await db
            .select({
                subjectId: crfDataEntries.subjectId,
                cnt:       count(),
            })
            .from(crfDataEntries)
            .where(sql`${crfDataEntries.subjectId} = ANY(ARRAY[${sql.raw(subjectIds.join(','))}])
                AND ${crfDataEntries.id} IN (SELECT entry_id FROM esignatures)`)
            .groupBy(crfDataEntries.subjectId);

        // Open query counts per subject
        const openQueries = await db
            .select({
                subjectId: queries.subjectId,
                cnt:       count(),
            })
            .from(queries)
            .where(sql`${queries.subjectId} = ANY(ARRAY[${sql.raw(subjectIds.join(','))}])
                AND ${queries.status} = 'Open'`)
            .groupBy(queries.subjectId);

        // Randomization status per subject
        const randRows = await db
            .select({
                subjectId:       subjectRandomization.subjectId,
                treatmentArm:    subjectRandomization.treatmentArm,
                randomizedAt:    subjectRandomization.randomizedAt,
            })
            .from(subjectRandomization)
            .where(sql`${subjectRandomization.subjectId} = ANY(ARRAY[${sql.raw(subjectIds.join(','))}])`);

        // Build lookup maps
        const entryMap = {};
        for (const row of entryCounts) {
            if (!entryMap[row.subjectId]) entryMap[row.subjectId] = {};
            entryMap[row.subjectId][row.status] = parseInt(row.cnt);
        }
        const signedMap = Object.fromEntries(signedPerSubject.map(r => [r.subjectId, parseInt(r.cnt)]));
        const queryMap  = Object.fromEntries(openQueries.map(r => [r.subjectId, parseInt(r.cnt)]));
        const randMap   = Object.fromEntries(randRows.map(r => [r.subjectId, r]));

        const result = studySubjects.map(s => {
            const entries = entryMap[s.id] ?? {};
            const totalEntries = Object.values(entries).reduce((a, b) => a + b, 0);
            const rand = randMap[s.id];
            return {
                id:            s.id,
                subjectCode:   s.subjectCode,
                initials:      s.initials,
                status:        s.status,
                siteCode:      s.siteCode,
                siteName:      s.siteName,
                totalEntries,
                draftCount:    entries['Draft']  ?? 0,
                savedCount:    entries['Saved']  ?? 0,
                signedCount:   signedMap[s.id]   ?? 0,
                lockedCount:   entries['Locked'] ?? 0,
                openQueries:   queryMap[s.id]    ?? 0,
                randomized:    !!rand,
                treatmentArm:  rand?.treatmentArm ?? null,
                randomizedAt:  rand?.randomizedAt ?? null,
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/subjects/:id — detail with visits
router.get('/:id', async (req, res) => {
    try {
        const [row] = await db
            .select({
                id:             subjects.id,
                subjectCode:    subjects.subjectCode,
                siteId:         subjects.siteId,
                siteCode:       sites.code,
                siteName:       sites.name,
                initials:       subjects.initials,
                dateOfBirth:    subjects.dateOfBirth,
                sex:            subjects.sex,
                genderIdentity: subjects.genderIdentity,
                enrolledAt:     subjects.enrolledAt,
                status:         subjects.status,
                withdrawnAt:    subjects.withdrawnAt,
                withdrawReason: subjects.withdrawReason,
                enrolledBy:     subjects.enrolledBy,
            })
            .from(subjects)
            .leftJoin(sites, eq(subjects.siteId, sites.id))
            .where(and(eq(subjects.id, parseInt(req.params.id)), eq(subjects.studyId, req.studyId)));

        if (!row) return res.status(404).json({ error: 'Subject not found' });
        if (Array.isArray(req.siteScope) && !req.siteScope.includes(row.siteId)) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        const visitRows = await db.select().from(visits)
            .where(eq(visits.subjectId, parseInt(req.params.id)))
            .orderBy(visits.visitOrder, visits.createdAt);

        res.json({ ...row, visits: visitRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/subjects — enroll new subject (investigator, pi, admin, crc)
router.post('/', licenseGuardCreate, requireRole('investigator', 'pi', 'admin', 'crc'), async (req, res) => {
    try {
        const { subjectCode, siteId, initials, dateOfBirth, sex, genderIdentity, enrolledAt } = req.body;
        if (!subjectCode) return res.status(400).json({ error: 'subjectCode is required' });

        // Plan limit: number of enrolled subjects per organization.
        const limit = await checkLimit(effectiveOrgId(req), 'subjects');
        if (!limit.ok) {
            return res.status(402).json({
                error: `Plan limit reached: ${limit.current}/${limit.limit} subjects. Upgrade the plan to enroll more.`,
                limit: limit.limit, current: limit.current,
            });
        }

        // Site-bound staff may only enroll subjects at their own site(s)
        if (Array.isArray(req.siteScope) && !req.siteScope.includes(siteId ? parseInt(siteId) : null)) {
            return res.status(403).json({ error: 'You can only enroll subjects at your assigned site' });
        }

        const [created] = await db.insert(subjects).values({
            studyId:     req.studyId,
            subjectCode,
            siteId:      siteId ?? null,
            initials:       initials ?? null,
            dateOfBirth:    dateOfBirth ?? null,
            sex:            sex ?? null,
            genderIdentity: genderIdentity ?? null,
            enrolledAt:     enrolledAt ? new Date(enrolledAt) : new Date(),
            enrolledBy:  req.user.id,
        }).returning();

        await writeAudit(db, {
            tableName: 'subjects', recordId: created.id, action: 'INSERT',
            newValue: subjectCode, reason: 'Subject enrolled',
            user: req.user, ipAddress: req.ip,
        });

        res.status(201).json(created);
    } catch (err) {
        if (isUniqueViolation(err)) {
            return res.status(409).json({ error: 'Subject number already exists in this study. Please use a different subject number.' });
        }
        console.error('Enroll subject failed:', err);
        res.status(500).json({ error: 'Could not enroll the subject due to a server error. Please try again or contact your administrator.' });
    }
});

// PATCH /api/subjects/:id/status — withdraw / complete (investigator, admin)
router.patch('/:id/status', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const { status, reason } = req.body;
        const allowedTransitions = ['Completed', 'Withdrawn', 'Screen Failed'];
        if (!allowedTransitions.includes(status)) {
            return res.status(400).json({ error: 'Invalid status transition' });
        }
        if (status === 'Withdrawn' && !reason) {
            return res.status(400).json({ error: 'Withdrawal reason is required' });
        }

        if (!(await subjectInSiteScope(req, req.params.id))) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        const updates = { status, updatedAt: new Date() };
        if (status === 'Withdrawn') {
            updates.withdrawnAt = new Date();
            updates.withdrawReason = reason;
        }

        const [updated] = await db.update(subjects)
            .set(updates)
            .where(and(eq(subjects.id, parseInt(req.params.id)), eq(subjects.studyId, req.studyId)))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Subject not found' });

        await writeAudit(db, {
            tableName: 'subjects', recordId: updated.id, action: 'UPDATE',
            fieldName: 'status', newValue: status, reason,
            user: req.user, ipAddress: req.ip,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate the protocol visit schedule for a subject who passed screening,
// from the study's visit_schedule template. Planned dates are derived from the
// subject's enrollment date (Day 1 = enrollment; there is no Day 0).
// Skipped entirely when the study has no template, or when the subject already
// has visits (idempotent). Best-effort: never blocks the assessment.
async function generateProtocolVisits(subject, user, ip) {
    try {
        const [study] = await db.select({ visitSchedule: studies.visitSchedule })
            .from(studies).where(eq(studies.id, subject.studyId));
        const template = study?.visitSchedule;
        if (!Array.isArray(template) || template.length === 0) return;

        const [already] = await db.select({ id: visits.id })
            .from(visits).where(eq(visits.subjectId, subject.id)).limit(1);
        if (already) return;

        const enrolledOn = subject.enrolledAt ?? new Date();
        const rows = template.map(v => ({
            subjectId:   subject.id,
            visitName:   v.name,
            visitOrder:  v.order ?? null,
            visitType:   'Scheduled',
            plannedDate: plannedDateFor(enrolledOn, v.studyDay),
            windowDays:  v.windowDays ?? 0,
            studyDay:    v.studyDay,
            status:      'Scheduled',
            createdByName: user.name,
        }));
        if (rows.length === 0) return;

        await db.insert(visits).values(rows);
        await writeAudit(db, {
            tableName: 'visits', recordId: subject.id, action: 'INSERT',
            newValue: JSON.stringify({ generated: rows.length, subjectCode: subject.subjectCode }),
            reason: 'Auto-generated protocol visit schedule on enrollment',
            user, ipAddress: ip,
        });
    } catch (err) {
        console.warn('Protocol visit generation skipped (non-fatal):', err.message?.slice(0, 120));
    }
}

// Build a human-readable fail reason from an I/E criteria result set.
function summarizeFailedCriteria(criteria) {
    const reasons = [];
    for (const c of Array.isArray(criteria) ? criteria : []) {
        if (c.type === 'inclusion' && !c.met) reasons.push(`Inclusion not met: ${c.label}`);
        if (c.type === 'exclusion' &&  c.met) reasons.push(`Exclusion applies: ${c.label}`);
    }
    return reasons.join('; ') || 'Did not meet eligibility criteria';
}

// Mirror an enrollment screening decision into the GCP screening log
// (ICH E6(R3) §8.3.20). Idempotent per subject (keyed on enrolled_subject_id)
// so re-assessing updates the same row instead of duplicating it. Best-effort:
// a failure here must never block the enrollment/assessment itself.
async function upsertScreeningLog(subject, passed, criteriaJson, user, ip) {
    const disposition = passed ? 'Enrolled' : 'Screen Failed';
    const failReason  = passed ? null : summarizeFailedCriteria(criteriaJson);
    try {
        const [existing] = await db.select().from(screeningLog)
            .where(eq(screeningLog.enrolledSubjectId, subject.id));
        if (existing) {
            await db.update(screeningLog)
                .set({ disposition, failReason, updatedAt: new Date() })
                .where(eq(screeningLog.id, existing.id));
            return;
        }
        const [row] = await db.insert(screeningLog).values({
            studyId:           subject.studyId,
            siteId:            subject.siteId,
            screeningDate:     new Date().toISOString().slice(0, 10),
            screeningCode:     subject.subjectCode,
            subjectInitials:   subject.initials ?? null,
            disposition,
            failReason,
            enrolledSubjectId: subject.id,
            createdBy:         user.id,
            createdByName:     user.name,
        }).returning();
        await writeAudit(db, {
            tableName: 'screening_log', recordId: row.id, action: 'INSERT',
            newValue: JSON.stringify({ screeningCode: subject.subjectCode, disposition }),
            reason: 'Auto-logged from subject enrollment I/E assessment',
            user, ipAddress: ip,
        });
    } catch (err) {
        console.warn('Screening-log auto-write skipped (non-fatal):', err.message?.slice(0, 120));
    }
}

// POST /api/subjects/:id/ie-assessment — record I/E criteria assessment
router.post('/:id/ie-assessment', requireRole('investigator', 'pi', 'admin'), async (req, res) => {
    try {
        const subjectId = parseInt(req.params.id);
        const { criteriaJson, passed } = req.body;
        if (!Array.isArray(criteriaJson) || typeof passed !== 'boolean') {
            return res.status(400).json({ error: 'Complete the inclusion/exclusion assessment and select its outcome before saving.' });
        }

        const [subject] = await db.select().from(subjects)
            .where(and(eq(subjects.id, subjectId), eq(subjects.studyId, req.studyId)));
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        if (Array.isArray(req.siteScope) && !req.siteScope.includes(subject.siteId)) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        const [assessment] = await db.insert(ieAssessments).values({
            subjectId,
            criteriaJson,
            passed,
            assessedBy:     req.user.id,
            assessedByName: req.user.name,
        }).returning();

        if (!passed) {
            await db.update(subjects)
                .set({ status: 'Screen Failed', updatedAt: new Date() })
                .where(eq(subjects.id, subjectId));

            await writeAudit(db, {
                tableName: 'subjects', recordId: subjectId, action: 'UPDATE',
                fieldName: 'status', oldValue: subject.status, newValue: 'Screen Failed',
                reason: 'Failed Inclusion/Exclusion criteria assessment',
                user: req.user, ipAddress: req.ip,
            });
        }

        // Keep the GCP screening log in sync with this screening decision.
        await upsertScreeningLog(subject, passed, criteriaJson, req.user, req.ip);

        // Subjects who pass screening get the protocol's visit schedule.
        if (passed) await generateProtocolVisits(subject, req.user, req.ip);

        res.status(201).json(assessment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/subjects/:id/ie-assessment — fetch I/E assessment history
router.get('/:id/ie-assessment', async (req, res) => {
    try {
        const rows = await db.select().from(ieAssessments)
            .where(eq(ieAssessments.subjectId, parseInt(req.params.id)))
            .orderBy(ieAssessments.assessedAt);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/subjects/:id/lock-status — per-visit entry lock breakdown
router.get('/:id/lock-status', async (req, res) => {
    try {
        const subjectId = parseInt(req.params.id);

        const [subject] = await db.select({ id: subjects.id, studyId: subjects.studyId })
            .from(subjects).where(eq(subjects.id, subjectId));
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        if (subject.studyId !== req.studyId) return res.status(403).json({ error: 'Forbidden' });

        // Counts per visit — COUNT(cde.id) avoids inflating total by 1 for visits with no entries
        const rows = await client`
            SELECT
                v.id                                                           AS visit_id,
                v.visit_name                                                   AS visit_name,
                v.visit_order                                                  AS visit_order,
                COUNT(cde.id)                                                  AS total,
                COUNT(cde.id) FILTER (WHERE cde.status = 'Locked')            AS locked,
                COUNT(cde.id) FILTER (WHERE cde.status IS DISTINCT FROM 'Locked') AS unlocked
            FROM visits v
            LEFT JOIN crf_data_entries cde ON cde.visit_id = v.id
            WHERE v.subject_id = ${subjectId}
            GROUP BY v.id, v.visit_name, v.visit_order
            ORDER BY v.visit_order
        `;

        // Recent lock actions for this subject
        const history = await client`
            SELECT * FROM subject_data_locks
            WHERE subject_id = ${subjectId}
            ORDER BY performed_at DESC
            LIMIT 20
        `;

        res.json({ visits: rows, history });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/subjects/:id/lock — bulk lock all lockable entries (optionally scoped to a visit)
router.post('/:id/lock', requireRole('pi', 'admin', 'cra', 'data_manager'), async (req, res) => {
    try {
        const subjectId = parseInt(req.params.id);
        const { reason, visitId } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required' });

        const [subject] = await db.select({ id: subjects.id, studyId: subjects.studyId })
            .from(subjects).where(eq(subjects.id, subjectId));
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        if (subject.studyId !== req.studyId) return res.status(403).json({ error: 'Forbidden' });

        const conditions = [
            eq(crfDataEntries.subjectId, subjectId),
            sql`${crfDataEntries.status} IN ('Saved', 'Draft')`,
        ];
        if (visitId) conditions.push(eq(crfDataEntries.visitId, parseInt(visitId)));

        const updated = await db.update(crfDataEntries)
            .set({ status: 'Locked', lockedAt: new Date(), lockedBy: req.user.id, lockReason: reason })
            .where(and(...conditions))
            .returning({ id: crfDataEntries.id });

        await client`
            INSERT INTO subject_data_locks
                (study_id, subject_id, visit_id, action, reason, entries_affected, performed_by, performed_by_name)
            VALUES
                (${req.studyId}, ${subjectId}, ${visitId ?? null}, 'Lock', ${reason}, ${updated.length},
                 ${req.user.id}, ${req.user.name})
        `;

        await writeAudit(db, {
            tableName: 'subjects', recordId: subjectId, action: 'LOCK',
            newValue: `Locked ${updated.length} entries${visitId ? ` for visit ${visitId}` : ''}`,
            reason, user: req.user, ipAddress: req.ip,
        });

        res.json({ locked: updated.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/subjects/:id/unlock — admin only bulk unlock
router.post('/:id/unlock', requireRole('admin'), async (req, res) => {
    try {
        const subjectId = parseInt(req.params.id);
        const { reason, visitId } = req.body;
        if (!reason) return res.status(400).json({ error: 'reason is required' });

        const [subject] = await db.select({ id: subjects.id, studyId: subjects.studyId })
            .from(subjects).where(eq(subjects.id, subjectId));
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        if (subject.studyId !== req.studyId) return res.status(403).json({ error: 'Forbidden' });

        const conditions = [
            eq(crfDataEntries.subjectId, subjectId),
            eq(crfDataEntries.status, 'Locked'),
        ];
        if (visitId) conditions.push(eq(crfDataEntries.visitId, parseInt(visitId)));

        const updated = await db.update(crfDataEntries)
            .set({ status: 'Saved', unlockedAt: new Date(), unlockedBy: req.user.id, unlockReason: reason })
            .where(and(...conditions))
            .returning({ id: crfDataEntries.id });

        await client`
            INSERT INTO subject_data_locks
                (study_id, subject_id, visit_id, action, reason, entries_affected, performed_by, performed_by_name)
            VALUES
                (${req.studyId}, ${subjectId}, ${visitId ?? null}, 'Unlock', ${reason}, ${updated.length},
                 ${req.user.id}, ${req.user.name})
        `;

        await writeAudit(db, {
            tableName: 'subjects', recordId: subjectId, action: 'UNLOCK',
            newValue: `Unlocked ${updated.length} entries${visitId ? ` for visit ${visitId}` : ''}`,
            reason, user: req.user, ipAddress: req.ip,
        });

        res.json({ unlocked: updated.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
```

## src/backend/server.js

```javascript
import { safeErrorResponses, apiErrorHandler } from './middleware/errors.js';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/better-auth.js';
import { requireAuth } from './middleware/auth.js';
import { client } from './db/connection.js';

import subjectsRouter      from './routes/subjects.js';
import visitsRouter        from './routes/visits.js';
import formsRouter         from './routes/forms.js';
import entriesRouter       from './routes/entries.js';
import importRouter        from './routes/import.js';
import auditRouter         from './routes/audit.js';
import queriesRouter       from './routes/queries.js';
import mfaRouter           from './routes/mfa.js';
import registerRouter      from './routes/register.js';
import signupRouter        from './routes/signup.js';
import organizationsRouter from './routes/organizations.js';
import billingRouter, { handleBillingWebhook } from './routes/billing.js';
import sitesRouter         from './routes/sites.js';
import dashboardRouter     from './routes/dashboard.js';
import signaturesRouter    from './routes/signatures.js';
import adverseEventsRouter from './routes/adverseevents.js';
import deviationsRouter    from './routes/deviations.js';
import consentsRouter      from './routes/consents.js';
import randomizationRouter from './routes/randomization.js';
import exportRouter        from './routes/export.js';
import securityRouter      from './routes/security.js';
import dblockRouter        from './routes/dblock.js';
import delegationRouter    from './routes/delegation.js';
import saeReportsRouter    from './routes/saereports.js';
import monitoringRouter    from './routes/monitoring.js';
import studiesRouter         from './routes/studies.js';
import visitTemplatesRouter  from './routes/visittemplates.js';
import userMgmtRouter        from './routes/usermgmt.js';
import notificationsRouter   from './routes/notifications.js';
// Phase 1 — Core Clinical Modules
import medHistoryRouter      from './routes/medhistory.js';
import conMedsRouter         from './routes/conmeds.js';
import vitalSignsRouter      from './routes/vitalsigns.js';
import labRouter             from './routes/lab.js';
// Phase 2 — Regulatory & Quality
import amendmentsRouter      from './routes/amendments.js';
import bdReviewRouter        from './routes/bdreview.js';
// Phase 3 — Quality Management & Validation
import qtlRouter             from './routes/qtl.js';
import sysValRouter          from './routes/sysval.js';
// ICH E6(R3) Gap Closure
import screeningRouter       from './routes/screening.js';
import ipDispensingRouter    from './routes/ipdispensing.js';
import essentialDocsRouter   from './routes/essentialdocs.js';
import agreementsRouter      from './routes/agreements.js';
import monitoringPlanRouter  from './routes/monitoringplan.js';
import reportRouter          from './routes/report.js';
import accessReviewRouter    from './routes/accessreview.js';
import licenseRouter        from './routes/license.js';
import { requireStudy }      from './middleware/study.js';
import { rateLimitAuth, rateLimitTenant } from './middleware/ratelimit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir   = path.resolve(__dirname, '../../');

// ── Startup migration: add extended visit columns if missing ──
async function runMigrations() {
    const stmts = [
        // Visit extended columns
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_order integer`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_type text DEFAULT 'Scheduled'`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS planned_date text`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS actual_date text`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS window_days integer`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS study_day integer`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS window_compliance text`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS missed_reason text`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS created_by_name text`,
        // Feature: site-scoped user access
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS site_id integer`,
        // Feature: electronic signature — add 'Signed' enum value
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='Signed' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='entry_status')) THEN ALTER TYPE entry_status ADD VALUE 'Signed'; END IF; END $$`,
        // Feature: electronic signatures table
        `CREATE TABLE IF NOT EXISTS esignatures (
            id         SERIAL PRIMARY KEY,
            entry_id   INTEGER REFERENCES crf_data_entries(id) ON DELETE CASCADE,
            user_id    TEXT REFERENCES "user"(id),
            user_name  TEXT,
            user_role  TEXT,
            meaning    TEXT NOT NULL,
            ip_address TEXT,
            signed_at  TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Feature: inclusion/exclusion assessments table
        `CREATE TABLE IF NOT EXISTS ie_assessments (
            id               SERIAL PRIMARY KEY,
            subject_id       INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
            criteria_json    JSONB NOT NULL DEFAULT '[]',
            passed           BOOLEAN NOT NULL,
            assessed_by      TEXT REFERENCES "user"(id),
            assessed_by_name TEXT,
            assessed_at      TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Performance: index for audit trail ORDER BY created_at DESC
        `CREATE INDEX IF NOT EXISTS idx_audit_trails_created_at ON audit_trails (created_at DESC)`,
        // Performance: index for queries by status (dashboard open count)
        `CREATE INDEX IF NOT EXISTS idx_queries_status ON queries (status)`,
        // Performance: index for subjects by status (dashboard active count)
        `CREATE INDEX IF NOT EXISTS idx_subjects_status ON subjects (status)`,
        // Gender identity column (FDA 2023 / ICH E3). Migration 0002 adds this,
        // but the drizzle journal only registers 0000/0001, so migrate() skips it
        // on a fresh install — add it idempotently here so every DB (fresh or
        // existing) has the column the subjects query selects.
        `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS gender_identity varchar(50)`,
        // Tier 1 — Adverse Events / SAE
        `CREATE TABLE IF NOT EXISTS adverse_events (
            id                        SERIAL PRIMARY KEY,
            subject_id                INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            ae_term                   TEXT NOT NULL,
            meddra_pt                 TEXT,
            meddra_soc                TEXT,
            onset_date                TEXT,
            resolution_date           TEXT,
            outcome                   TEXT,
            severity                  TEXT NOT NULL,
            is_serious                BOOLEAN NOT NULL DEFAULT FALSE,
            serious_criteria          JSONB NOT NULL DEFAULT '[]',
            causality                 TEXT,
            action_taken              TEXT,
            narrative                 TEXT,
            report_status             TEXT NOT NULL DEFAULT 'Draft',
            reported_to_sponsor_at    TIMESTAMP,
            reported_to_irb_at        TIMESTAMP,
            requires_expedited_report BOOLEAN NOT NULL DEFAULT FALSE,
            expedited_deadline        TIMESTAMP,
            created_by                TEXT REFERENCES "user"(id),
            created_by_name           TEXT,
            created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by                TEXT REFERENCES "user"(id),
            updated_at                TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ae_subject ON adverse_events (subject_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ae_is_serious ON adverse_events (is_serious)`,
        // Tier 1 — Protocol Deviations
        `CREATE TABLE IF NOT EXISTS protocol_deviations (
            id                 SERIAL PRIMARY KEY,
            subject_id         INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
            deviation_type     TEXT NOT NULL,
            category           TEXT,
            description        TEXT NOT NULL,
            deviation_date     TEXT,
            discovery_date     TEXT,
            root_cause         TEXT,
            impact_on_subject  TEXT,
            capa               TEXT,
            reported_to_irb    BOOLEAN NOT NULL DEFAULT FALSE,
            reported_to_irb_at TIMESTAMP,
            status             TEXT NOT NULL DEFAULT 'Open',
            created_by         TEXT REFERENCES "user"(id),
            created_by_name    TEXT,
            created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by         TEXT REFERENCES "user"(id),
            updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_deviations_status ON protocol_deviations (status)`,
        // Tier 1 — Informed Consent (UU PDP)
        `CREATE TABLE IF NOT EXISTS informed_consents (
            id               SERIAL PRIMARY KEY,
            subject_id       INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            consent_version  TEXT NOT NULL,
            consent_date     TEXT NOT NULL,
            consent_type     TEXT NOT NULL DEFAULT 'Initial',
            language         TEXT NOT NULL DEFAULT 'Indonesian',
            witness_name     TEXT,
            notes            TEXT,
            is_withdrawn     BOOLEAN NOT NULL DEFAULT FALSE,
            withdrawn_at     TIMESTAMP,
            withdrawn_reason TEXT,
            created_by       TEXT REFERENCES "user"(id),
            created_by_name  TEXT,
            created_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_consents_subject ON informed_consents (subject_id)`,
        // Tier 1 — Randomization List
        `CREATE TABLE IF NOT EXISTS randomization_list (
            id            SERIAL PRIMARY KEY,
            rand_code     TEXT NOT NULL UNIQUE,
            treatment_arm TEXT NOT NULL,
            stratum       TEXT,
            is_used       BOOLEAN NOT NULL DEFAULT FALSE,
            uploaded_by   TEXT REFERENCES "user"(id),
            uploaded_at   TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Tier 1 — Subject Randomization Assignments
        `CREATE TABLE IF NOT EXISTS subject_randomization (
            id                SERIAL PRIMARY KEY,
            subject_id        INTEGER NOT NULL UNIQUE REFERENCES subjects(id),
            rand_code         TEXT NOT NULL UNIQUE,
            treatment_arm     TEXT NOT NULL,
            stratum           TEXT,
            is_blinded        BOOLEAN NOT NULL DEFAULT TRUE,
            unblinded_at      TIMESTAMP,
            unblinded_by      TEXT REFERENCES "user"(id),
            unblind_reason    TEXT,
            randomized_at     TIMESTAMP NOT NULL DEFAULT NOW(),
            randomized_by     TEXT REFERENCES "user"(id),
            randomized_by_name TEXT
        )`,
        // Tier 2 — Login attempts audit log
        `CREATE TABLE IF NOT EXISTS login_attempts (
            id           SERIAL PRIMARY KEY,
            email        TEXT NOT NULL,
            ip_address   TEXT,
            success      BOOLEAN NOT NULL DEFAULT FALSE,
            attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts (email)`,
        `CREATE INDEX IF NOT EXISTS idx_login_attempts_at ON login_attempts (attempted_at DESC)`,
        // Tier 2 — Account lockout
        `CREATE TABLE IF NOT EXISTS account_locks (
            id             SERIAL PRIMARY KEY,
            user_id        TEXT REFERENCES "user"(id),
            email          TEXT NOT NULL UNIQUE,
            failed_count   INTEGER NOT NULL DEFAULT 0,
            locked_at      TIMESTAMP,
            auto_unlock_at TIMESTAMP,
            unlocked_at    TIMESTAMP,
            unlocked_by    TEXT REFERENCES "user"(id),
            unlock_reason  TEXT
        )`,
        // Tier 2 — Password history (prevent reuse)
        `CREATE TABLE IF NOT EXISTS password_history (
            id            SERIAL PRIMARY KEY,
            user_id       TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            password_hash TEXT NOT NULL,
            created_at    TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history (user_id)`,
        // Tier 2 — Password metadata (expiry, must-change)
        `CREATE TABLE IF NOT EXISTS password_meta (
            user_id         TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
            last_changed_at TIMESTAMP,
            must_change     BOOLEAN NOT NULL DEFAULT FALSE
        )`,
        // Tier 2 — Study Database Lock workflow
        `CREATE TABLE IF NOT EXISTS study_db_lock (
            id                   SERIAL PRIMARY KEY,
            status               TEXT NOT NULL DEFAULT 'Pending Signatures',
            pre_check_json       JSONB,
            initiated_by         TEXT REFERENCES "user"(id),
            initiated_by_name    TEXT,
            initiated_at         TIMESTAMP,
            cra_signed           BOOLEAN NOT NULL DEFAULT FALSE,
            cra_signed_at        TIMESTAMP,
            cra_signed_by        TEXT REFERENCES "user"(id),
            cra_signed_by_name   TEXT,
            admin_signed         BOOLEAN NOT NULL DEFAULT FALSE,
            admin_signed_at      TIMESTAMP,
            admin_signed_by      TEXT REFERENCES "user"(id),
            admin_signed_by_name TEXT,
            locked_at            TIMESTAMP,
            notes                TEXT,
            created_at           TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Tier 2 — Delegation Log
        `CREATE TABLE IF NOT EXISTS delegation_log (
            id               SERIAL PRIMARY KEY,
            user_id          TEXT NOT NULL REFERENCES "user"(id),
            user_name        TEXT NOT NULL,
            user_role        TEXT,
            site_id          INTEGER,
            delegated_tasks  JSONB NOT NULL DEFAULT '[]',
            delegation_start TEXT NOT NULL,          -- "YYYY-MM-DD"; see note in server migrations
            delegation_end   TEXT,
            status           TEXT NOT NULL DEFAULT 'Active',
            signed_at        TIMESTAMP,
            signed_by_name   TEXT,
            notes            TEXT,
            created_by       TEXT REFERENCES "user"(id),
            created_by_name  TEXT,
            created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_delegation_user ON delegation_log (user_id)`,
        // Tier 2 — Training Records
        `CREATE TABLE IF NOT EXISTS training_records (
            id               SERIAL PRIMARY KEY,
            user_id          TEXT NOT NULL REFERENCES "user"(id),
            user_name        TEXT NOT NULL,
            training_type    TEXT NOT NULL,
            training_date    TEXT NOT NULL,          -- "YYYY-MM-DD"
            expiry_date      TEXT,
            certificate_ref  TEXT,
            notes            TEXT,
            recorded_by      TEXT REFERENCES "user"(id),
            recorded_by_name TEXT,
            recorded_at      TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_training_user ON training_records (user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_training_expiry ON training_records (expiry_date)`,
        // Tier 3 — SAE Expedited Reports (ICH E2A §4)
        `CREATE TABLE IF NOT EXISTS sae_reports (
            id                SERIAL PRIMARY KEY,
            ae_id             INTEGER NOT NULL REFERENCES adverse_events(id) ON DELETE CASCADE,
            report_type       TEXT NOT NULL,
            report_number     INTEGER NOT NULL DEFAULT 1,
            day0_date         TEXT NOT NULL,
            deadline_days     INTEGER NOT NULL,
            deadline_date     TIMESTAMP NOT NULL,
            submitted_at      TIMESTAMP,
            submission_ref    TEXT,
            submitted_to      TEXT,
            narrative         TEXT,
            status            TEXT NOT NULL DEFAULT 'Pending',
            submitted_by      TEXT REFERENCES "user"(id),
            submitted_by_name TEXT,
            created_by        TEXT REFERENCES "user"(id),
            created_by_name   TEXT,
            created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_sae_reports_ae ON sae_reports (ae_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sae_reports_status ON sae_reports (status)`,
        // Tier 3 — Monitoring Visits (ICH GCP E6(R3) §5.18)
        `CREATE TABLE IF NOT EXISTS monitoring_visits (
            id                    SERIAL PRIMARY KEY,
            visit_date            TEXT NOT NULL,
            site_id               INTEGER REFERENCES sites(id),
            site_name             TEXT,
            visit_type            TEXT NOT NULL,
            cra_id                TEXT REFERENCES "user"(id),
            cra_name              TEXT NOT NULL,
            findings              TEXT,
            action_items          JSONB DEFAULT '[]',
            subjects_reviewed     JSONB DEFAULT '[]',
            status                TEXT NOT NULL DEFAULT 'Draft',
            submitted_at          TIMESTAMP,
            acknowledged_by       TEXT REFERENCES "user"(id),
            acknowledged_by_name  TEXT,
            acknowledged_at       TIMESTAMP,
            pi_comments           TEXT,
            next_visit_date       TEXT,
            notes                 TEXT,
            created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_monitoring_visits_status ON monitoring_visits (status)`,
        // Tier 3 — SDV Records (Source Data Verification)
        `CREATE TABLE IF NOT EXISTS sdv_records (
            id                   SERIAL PRIMARY KEY,
            monitoring_visit_id  INTEGER NOT NULL REFERENCES monitoring_visits(id) ON DELETE CASCADE,
            subject_id           INTEGER REFERENCES subjects(id),
            subject_code         TEXT NOT NULL,
            visit_id             INTEGER REFERENCES visits(id),
            visit_name           TEXT,
            form_id              INTEGER REFERENCES crf_forms(id),
            form_name            TEXT,
            sdv_status           TEXT NOT NULL DEFAULT 'Not Reviewed',
            discrepancy_note     TEXT,
            verified_by          TEXT REFERENCES "user"(id),
            verified_by_name     TEXT,
            verified_at          TIMESTAMP,
            created_at           TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_sdv_monitoring ON sdv_records (monitoring_visit_id)`,
        // Tier 4 — Multi-study architecture
        `CREATE TABLE IF NOT EXISTS studies (
            id             INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            title          TEXT NOT NULL,
            protocol_no    TEXT NOT NULL UNIQUE,
            phase          TEXT,
            sponsor        TEXT,
            indication     TEXT,
            status         TEXT NOT NULL DEFAULT 'Active',
            start_date     TEXT,
            end_date       TEXT,
            created_by     TEXT REFERENCES "user"(id),
            created_by_name TEXT,
            created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS study_users (
            id           INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id     INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            assigned_at  TIMESTAMP NOT NULL DEFAULT NOW(),
            assigned_by  TEXT REFERENCES "user"(id),
            UNIQUE(study_id, user_id)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_study_users_study ON study_users (study_id)`,
        `CREATE INDEX IF NOT EXISTS idx_study_users_user  ON study_users (user_id)`,
        // Add study_id FK to all clinical tables
        `ALTER TABLE subjects           ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE adverse_events     ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE informed_consents  ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE randomization_list ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE study_db_lock      ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE delegation_log     ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE training_records   ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE monitoring_visits  ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        `ALTER TABLE queries            ADD COLUMN IF NOT EXISTS study_id INTEGER REFERENCES studies(id)`,
        // Proper user deactivation flag (replaces emailVerified misuse)
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`,
        // Feature: user-chosen display name (shown as greeting in header; admin can reset)
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS display_name TEXT`,
        // Tier 5 — Visit Schedule Templates (Form Builder prerequisite)
        `CREATE TABLE IF NOT EXISTS visit_schedule_templates (
            id               SERIAL PRIMARY KEY,
            study_id         INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            name             TEXT NOT NULL,
            description      TEXT,
            is_active        BOOLEAN NOT NULL DEFAULT TRUE,
            created_by       TEXT REFERENCES "user"(id),
            created_by_name  TEXT,
            created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_visit_tmpl_study ON visit_schedule_templates (study_id)`,
        `CREATE TABLE IF NOT EXISTS visit_schedule_items (
            id                  SERIAL PRIMARY KEY,
            template_id         INTEGER NOT NULL REFERENCES visit_schedule_templates(id) ON DELETE CASCADE,
            visit_name          TEXT NOT NULL,
            visit_order         INTEGER NOT NULL,
            visit_type          TEXT NOT NULL DEFAULT 'Scheduled',
            study_day           INTEGER,
            window_days_before  INTEGER NOT NULL DEFAULT 3,
            window_days_after   INTEGER NOT NULL DEFAULT 3,
            form_ids            INTEGER[] NOT NULL DEFAULT '{}',
            is_mandatory        BOOLEAN NOT NULL DEFAULT TRUE,
            notes               TEXT
        )`,
        `CREATE INDEX IF NOT EXISTS idx_visit_items_tmpl ON visit_schedule_items (template_id)`,

        // ── Phase 1: Core Clinical Modules ──────────────────────────────────────
        `CREATE TABLE IF NOT EXISTS medical_history (
            id                       SERIAL PRIMARY KEY,
            study_id                 INTEGER REFERENCES studies(id),
            subject_id               INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            condition                TEXT NOT NULL,
            icd_code                 TEXT,
            icd_version              TEXT DEFAULT 'ICD-10',
            onset_date               TEXT,
            resolution_date          TEXT,
            status                   TEXT NOT NULL DEFAULT 'Active',
            severity                 TEXT,
            is_related_to_indication BOOLEAN NOT NULL DEFAULT FALSE,
            notes                    TEXT,
            created_by               TEXT REFERENCES "user"(id),
            created_by_name          TEXT,
            created_at               TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by               TEXT REFERENCES "user"(id),
            updated_at               TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_mh_subject ON medical_history (subject_id)`,

        `CREATE TABLE IF NOT EXISTS concomitant_meds (
            id             SERIAL PRIMARY KEY,
            study_id       INTEGER REFERENCES studies(id),
            subject_id     INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            drug_name      TEXT NOT NULL,
            who_drug_name  TEXT,
            who_drug_code  TEXT,
            atc_code       TEXT,
            indication     TEXT,
            dose           TEXT,
            dose_unit      TEXT,
            frequency      TEXT,
            route          TEXT,
            start_date     TEXT,
            stop_date      TEXT,
            is_ongoing     BOOLEAN NOT NULL DEFAULT TRUE,
            notes          TEXT,
            created_by     TEXT REFERENCES "user"(id),
            created_by_name TEXT,
            created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by     TEXT REFERENCES "user"(id),
            updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_cm_subject ON concomitant_meds (subject_id)`,

        `CREATE TABLE IF NOT EXISTS vital_signs (
            id                SERIAL PRIMARY KEY,
            study_id          INTEGER REFERENCES studies(id),
            subject_id        INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            visit_id          INTEGER REFERENCES visits(id),
            assessment_date   TEXT NOT NULL,
            assessment_time   TEXT,
            position          TEXT DEFAULT 'Sitting',
            systolic_bp       INTEGER,
            diastolic_bp      INTEGER,
            heart_rate        INTEGER,
            respiratory_rate  INTEGER,
            temperature       TEXT,
            temperature_unit  TEXT DEFAULT 'C',
            weight            TEXT,
            weight_unit       TEXT DEFAULT 'kg',
            height            TEXT,
            height_unit       TEXT DEFAULT 'cm',
            bmi               TEXT,
            oxygen_saturation TEXT,
            notes             TEXT,
            created_by        TEXT REFERENCES "user"(id),
            created_by_name   TEXT,
            created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by        TEXT REFERENCES "user"(id),
            updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_vs_subject ON vital_signs (subject_id)`,
        `CREATE INDEX IF NOT EXISTS idx_vs_visit   ON vital_signs (visit_id)`,

        `CREATE TABLE IF NOT EXISTS lab_results (
            id                    SERIAL PRIMARY KEY,
            study_id              INTEGER REFERENCES studies(id),
            subject_id            INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            visit_id              INTEGER REFERENCES visits(id),
            panel_name            TEXT,
            test_name             TEXT NOT NULL,
            test_code             TEXT,
            specimen_type         TEXT,
            specimen_collected_at TEXT,
            lab_name              TEXT,
            value_numeric         TEXT,
            value_text            TEXT,
            unit                  TEXT,
            ref_range_low         TEXT,
            ref_range_high        TEXT,
            ref_range_text        TEXT,
            abnormality_flag      TEXT,
            clinical_significance TEXT DEFAULT 'NCS',
            is_abnormal           BOOLEAN NOT NULL DEFAULT FALSE,
            assessed_by           TEXT REFERENCES "user"(id),
            assessed_by_name      TEXT,
            assessment_date       TEXT,
            status                TEXT NOT NULL DEFAULT 'Pending',
            notes                 TEXT,
            created_by            TEXT REFERENCES "user"(id),
            created_by_name       TEXT,
            created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by            TEXT REFERENCES "user"(id),
            updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_lab_subject ON lab_results (subject_id)`,
        `CREATE INDEX IF NOT EXISTS idx_lab_visit   ON lab_results (visit_id)`,
        `CREATE INDEX IF NOT EXISTS idx_lab_status  ON lab_results (status)`,

        // ── Phase 2: Regulatory & Quality ───────────────────────────────────────
        `CREATE TABLE IF NOT EXISTS protocol_amendments (
            id                  SERIAL PRIMARY KEY,
            study_id            INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            amendment_no        TEXT NOT NULL,
            effective_date      TEXT NOT NULL,
            summary             TEXT NOT NULL,
            changes             TEXT,
            requires_reconsent  BOOLEAN NOT NULL DEFAULT FALSE,
            reconsent_reason    TEXT,
            irb_approval_date   TEXT,
            irb_ref_no          TEXT,
            status              TEXT NOT NULL DEFAULT 'Draft',
            created_by          TEXT REFERENCES "user"(id),
            created_by_name     TEXT,
            created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_amendments_study ON protocol_amendments (study_id)`,

        `CREATE TABLE IF NOT EXISTS blind_data_reviews (
            id                SERIAL PRIMARY KEY,
            study_id          INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            review_date       TEXT NOT NULL,
            status            TEXT NOT NULL DEFAULT 'In Progress',
            checklist_json    JSONB NOT NULL DEFAULT '{}',
            open_queries      INTEGER DEFAULT 0,
            missing_critical  INTEGER DEFAULT 0,
            open_deviations   INTEGER DEFAULT 0,
            pending_saes      INTEGER DEFAULT 0,
            notes             TEXT,
            completed_by      TEXT REFERENCES "user"(id),
            completed_by_name TEXT,
            completed_at      TIMESTAMP,
            created_by        TEXT REFERENCES "user"(id),
            created_by_name   TEXT,
            created_at        TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_bdr_study ON blind_data_reviews (study_id)`,

        // ── Phase 3: Quality Management ─────────────────────────────────────────
        `CREATE TABLE IF NOT EXISTS quality_tolerance_limits (
            id          SERIAL PRIMARY KEY,
            study_id    INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            indicator   TEXT NOT NULL,
            label       TEXT NOT NULL,
            threshold   TEXT NOT NULL,
            unit        TEXT DEFAULT '%',
            alert_level TEXT DEFAULT 'warning',
            description TEXT,
            created_by  TEXT REFERENCES "user"(id),
            created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_qtl_study_indicator ON quality_tolerance_limits (study_id, indicator)`,

        // Phase 1 — LOINC coding status on lab_results
        `ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS loinc_coding_status TEXT NOT NULL DEFAULT 'Custom'`,

        // ICH GCP E6(R3) C.4.4 — e-signature fields on sae_reports
        `ALTER TABLE sae_reports ADD COLUMN IF NOT EXISTS signed_by       TEXT REFERENCES "user"(id)`,
        `ALTER TABLE sae_reports ADD COLUMN IF NOT EXISTS signed_by_name  TEXT`,
        `ALTER TABLE sae_reports ADD COLUMN IF NOT EXISTS signed_at       TIMESTAMPTZ`,
        `ALTER TABLE sae_reports ADD COLUMN IF NOT EXISTS signing_meaning TEXT`,

        // ICH GCP E6(R3) 4.8 — link re-consent records to their triggering amendment
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS amendment_id INTEGER REFERENCES protocol_amendments(id)`,

        // ICH GCP E6(R3) §4.8 — consent record fields the initial schema omitted.
        // consent_time (§4.8.8): the date alone cannot evidence that consent
        // preceded a same-day screening procedure.
        // obtained_by (§4.1.5): who ran the consent discussion, as opposed to
        // created_by, which is only whoever keyed the record into the EDC.
        // witness_type (§4.8.9/§4.8.12): impartial witness vs. LAR vs. guardian.
        // assent_* (§4.8.12) and copy_provided (§4.8.11).
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS consent_time     TEXT`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS obtained_by      TEXT REFERENCES "user"(id)`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS obtained_by_name TEXT`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS witness_type     TEXT`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS assent_obtained  BOOLEAN NOT NULL DEFAULT FALSE`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS assent_date      TEXT`,
        `ALTER TABLE informed_consents ADD COLUMN IF NOT EXISTS copy_provided    BOOLEAN NOT NULL DEFAULT FALSE`,

        // Phase 2 — MedDRA structured coding fields on adverse_events
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS meddra_pt_code    TEXT`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS meddra_soc_code   TEXT`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS meddra_version     TEXT`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS coding_status      TEXT NOT NULL DEFAULT 'Uncoded'`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS coded_by           TEXT`,
        `ALTER TABLE adverse_events ADD COLUMN IF NOT EXISTS coded_at           TIMESTAMP`,

        `CREATE TABLE IF NOT EXISTS system_validation_log (
            id               SERIAL PRIMARY KEY,
            version          TEXT NOT NULL,
            validation_date  TEXT NOT NULL,
            validation_type  TEXT NOT NULL,
            status           TEXT NOT NULL DEFAULT 'Pending',
            performed_by     TEXT,
            summary          TEXT,
            changes_since    TEXT,
            approved_by      TEXT,
            approved_at      TIMESTAMP,
            created_by       TEXT REFERENCES "user"(id),
            created_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,

        // Phase 3 — TOTP (authenticator app) per-user 2FA
        `CREATE TABLE IF NOT EXISTS user_totp (
            id           SERIAL PRIMARY KEY,
            user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            secret       TEXT NOT NULL,
            is_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
            enabled_at   TIMESTAMPTZ,
            backup_codes JSONB NOT NULL DEFAULT '[]',
            UNIQUE(user_id)
        )`,

        // ICH E6(R3) — audit_action enum: add EXPORT, SIGN, AGREE values
        `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='EXPORT' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='audit_action'))
            THEN ALTER TYPE audit_action ADD VALUE 'EXPORT'; END IF; END $$`,
        `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='SIGN' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='audit_action'))
            THEN ALTER TYPE audit_action ADD VALUE 'SIGN'; END IF; END $$`,
        `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='AGREE' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='audit_action'))
            THEN ALTER TYPE audit_action ADD VALUE 'AGREE'; END IF; END $$`,

        // ICH E6(R3) — audit trail hash for tamper detection
        `ALTER TABLE audit_trails ADD COLUMN IF NOT EXISTS audit_hash TEXT`,
        `ALTER TABLE audit_trails ALTER COLUMN created_at SET DEFAULT NOW()`,

        // ICH E6(R3) §8.3.20 — Screening Log
        `CREATE TABLE IF NOT EXISTS screening_log (
            id                   INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id             INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            site_id              INTEGER REFERENCES sites(id),
            screening_date       TEXT NOT NULL,
            screening_code       VARCHAR(30) NOT NULL,
            subject_initials     VARCHAR(10),
            disposition          TEXT NOT NULL DEFAULT 'Pending',
            fail_reason          TEXT,
            eligibility_criteria TEXT,
            notes                TEXT,
            enrolled_subject_id  INTEGER REFERENCES subjects(id),
            created_by           TEXT REFERENCES "user"(id),
            created_by_name      TEXT,
            created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_screening_study ON screening_log (study_id)`,

        // ICH E6(R3) §8.3.19 — IP Accountability / Drug Dispensing
        `CREATE TABLE IF NOT EXISTS ip_accountability (
            id                 INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id           INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            site_id            INTEGER REFERENCES sites(id),
            subject_id         INTEGER REFERENCES subjects(id),
            record_type        TEXT NOT NULL,
            transaction_date   TEXT NOT NULL,
            drug_name          TEXT NOT NULL,
            batch_no           TEXT,
            quantity_in        TEXT,
            quantity_out       TEXT,
            unit               TEXT,
            expiry_date        TEXT,
            supplier_ref       TEXT,
            returned_quantity  TEXT,
            destroyed_quantity TEXT,
            destruction_ref    TEXT,
            balance            TEXT,
            notes              TEXT,
            created_by         TEXT REFERENCES "user"(id),
            created_by_name    TEXT,
            created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ip_study ON ip_accountability (study_id)`,

        // ICH E6(R3) §8 — Essential Documents Checklist
        `CREATE TABLE IF NOT EXISTS essential_documents (
            id               INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id         INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            site_id          INTEGER REFERENCES sites(id),
            section          TEXT NOT NULL,
            document_type    TEXT NOT NULL,
            document_ref     TEXT,
            version          TEXT,
            document_date    TEXT,
            expiry_date      TEXT,
            status           TEXT NOT NULL DEFAULT 'Pending',
            notes            TEXT,
            uploaded_by      TEXT REFERENCES "user"(id),
            uploaded_by_name TEXT,
            uploaded_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_esdoc_study ON essential_documents (study_id)`,

        // ICH E6(R3) C.4.1, §5.5.2 — User SOP/Training Agreements
        `CREATE TABLE IF NOT EXISTS user_agreements (
            id                INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            user_id           TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            agreement_type    TEXT NOT NULL DEFAULT 'SOP',
            agreement_version TEXT NOT NULL,
            agreed_at         TIMESTAMP NOT NULL DEFAULT NOW(),
            ip_address        TEXT,
            user_agent        TEXT
        )`,
        `CREATE INDEX IF NOT EXISTS idx_agreements_user ON user_agreements (user_id)`,

        // ICH E6(R3) §5.18.3 — Risk-Based Monitoring Plan
        `CREATE TABLE IF NOT EXISTS monitoring_plans (
            id                   INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id             INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            version              TEXT NOT NULL DEFAULT '1.0',
            status               TEXT NOT NULL DEFAULT 'Draft',
            risk_level           TEXT,
            scope                TEXT,
            sdv_strategy         TEXT,
            sdv_percentage       INTEGER,
            on_site_frequency    TEXT,
            remote_frequency     TEXT,
            critical_data_fields JSONB DEFAULT '[]',
            risk_factors         JSONB DEFAULT '[]',
            action_thresholds    JSONB DEFAULT '{}',
            approved_by          TEXT REFERENCES "user"(id),
            approved_by_name     TEXT,
            approved_at          TIMESTAMP,
            notes                TEXT,
            created_by           TEXT REFERENCES "user"(id),
            created_by_name      TEXT,
            created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_monplan_study ON monitoring_plans (study_id)`,

        // ICH GCP E6(R3) §5.0.7 — QTL breach CAPA workflow
        `CREATE TABLE IF NOT EXISTS qtl_breach_actions (
            id                INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id          INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            indicator         TEXT NOT NULL,
            indicator_label   TEXT,
            threshold         TEXT NOT NULL,
            actual_value      TEXT NOT NULL,
            breach_date       TIMESTAMP NOT NULL DEFAULT NOW(),
            capa_text         TEXT,
            capa_due_date     TEXT,
            status            TEXT NOT NULL DEFAULT 'Open',
            assigned_to       TEXT REFERENCES "user"(id),
            assigned_to_name  TEXT,
            resolved_at       TIMESTAMP,
            resolved_by       TEXT REFERENCES "user"(id),
            resolved_by_name  TEXT,
            notes             TEXT,
            created_by        TEXT REFERENCES "user"(id),
            created_by_name   TEXT,
            created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_qtl_breach_study ON qtl_breach_actions (study_id)`,

        // ICH GCP E6(R3) C.4.2 — Periodic user access review
        `CREATE TABLE IF NOT EXISTS access_reviews (
            id                 INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id           INTEGER REFERENCES studies(id),
            review_period      TEXT NOT NULL,
            status             TEXT NOT NULL DEFAULT 'In Progress',
            initiated_by       TEXT REFERENCES "user"(id),
            initiated_by_name  TEXT,
            initiated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
            completed_at       TIMESTAMP,
            completed_by       TEXT REFERENCES "user"(id),
            completed_by_name  TEXT,
            certifications     JSONB DEFAULT '[]',
            notes              TEXT,
            created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_access_review_study ON access_reviews (study_id)`,
        `CREATE TABLE IF NOT EXISTS subject_data_locks (
            id              INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            study_id        INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
            subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            visit_id        INTEGER REFERENCES visits(id) ON DELETE SET NULL,
            action          TEXT NOT NULL CHECK (action IN ('Lock', 'Unlock')),
            reason          TEXT NOT NULL,
            entries_affected INTEGER NOT NULL DEFAULT 0,
            performed_by    TEXT REFERENCES "user"(id),
            performed_by_name TEXT,
            performed_at    TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_sdl_subject ON subject_data_locks (subject_id)`,
        // Add tmf_artifact_id column to essential_documents for DIA TMF Reference Model
        `ALTER TABLE essential_documents ADD COLUMN IF NOT EXISTS tmf_artifact_id TEXT`,
        `ALTER TABLE essential_documents ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT false`,
        // Migrate legacy section names to ICH GCP E6(R3) §8 correct numbering
        `UPDATE essential_documents SET section = '8.1 — Pre-trial'    WHERE section IN ('§8.2 — Before Trial', '8.1 Pre-trial', '8.1 — Before Trial')`,
        `UPDATE essential_documents SET section = '8.2 — Trial Conduct' WHERE section IN ('§8.3 — During Trial', '8.2 Trial Conduct', '8.2 — During Trial')`,
        `UPDATE essential_documents SET section = '8.3 — Post-trial'   WHERE section IN ('§8.4 — After Trial Completion', '8.3 Post-trial', '8.3 — After Completion')`,
        // ICH GCP E6(R3) §4.5.3 — visit window compliance: link auto-generated deviations to their visit
        `ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS visit_id INTEGER REFERENCES visits(id) ON DELETE SET NULL`,
        `ALTER TABLE protocol_deviations ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false`,
        `CREATE INDEX IF NOT EXISTS idx_devs_visit ON protocol_deviations (visit_id)`,

        // ── SaaS Multi-Tenancy (Phase 1) — organizations + backfill ──────────
        // Top-level tenant boundary. Existing single-org data is folded into a
        // "default" organization so no data is lost; new columns stay nullable
        // (platform_owner rows are intentionally NULL — cross-tenant operator).
        `CREATE TABLE IF NOT EXISTS organizations (
            id         INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            name       TEXT NOT NULL,
            slug       TEXT NOT NULL UNIQUE,
            status     TEXT NOT NULL DEFAULT 'Active',
            plan       TEXT DEFAULT 'standard',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        // Seed the default tenant that absorbs all pre-existing data (idempotent).
        `INSERT INTO organizations (name, slug) VALUES ('Default Organization', 'default') ON CONFLICT (slug) DO NOTHING`,
        // Tenant column on the three tenant-root tables.
        `ALTER TABLE "user"  ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `ALTER TABLE studies ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `ALTER TABLE sites   ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        // Per-protocol I/E criteria (NULL = use the app default set).
        `ALTER TABLE studies ADD COLUMN IF NOT EXISTS ie_criteria JSONB`,
        // Per-protocol visit schedule template (NULL = no template, manual visits only).
        `ALTER TABLE studies ADD COLUMN IF NOT EXISTS visit_schedule JSONB`,
        // Backfill existing rows into the default org (only untenanted rows).
        `UPDATE "user"  SET organization_id = (SELECT id FROM organizations WHERE slug='default') WHERE organization_id IS NULL AND role <> 'platform_owner'`,
        `UPDATE studies SET organization_id = (SELECT id FROM organizations WHERE slug='default') WHERE organization_id IS NULL`,
        `UPDATE sites   SET organization_id = (SELECT id FROM organizations WHERE slug='default') WHERE organization_id IS NULL`,
        // Uniqueness becomes per-organization: drop the old global UNIQUE and
        // add a composite unique index so two tenants may reuse protocol/site codes.
        `DO $$
            DECLARE r record;
            BEGIN
                FOR r IN SELECT conname FROM pg_constraint
                    WHERE conrelid = 'studies'::regclass AND contype = 'u'
                      AND pg_get_constraintdef(oid) = 'UNIQUE (protocol_no)'
                LOOP EXECUTE format('ALTER TABLE studies DROP CONSTRAINT %I', r.conname); END LOOP;
            END $$`,
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_studies_org_protocol ON studies (organization_id, protocol_no)`,
        `DO $$
            DECLARE r record;
            BEGIN
                FOR r IN SELECT conname FROM pg_constraint
                    WHERE conrelid = 'sites'::regclass AND contype = 'u'
                      AND pg_get_constraintdef(oid) = 'UNIQUE (code)'
                LOOP EXECUTE format('ALTER TABLE sites DROP CONSTRAINT %I', r.conname); END LOOP;
            END $$`,
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_sites_org_code ON sites (organization_id, code)`,
        // Indexes for tenant-filtered lookups.
        `CREATE INDEX IF NOT EXISTS idx_user_org    ON "user" (organization_id)`,
        `CREATE INDEX IF NOT EXISTS idx_studies_org ON studies (organization_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sites_org   ON sites (organization_id)`,
        // Audit trail tenant column — so one tenant cannot read another's audit
        // rows. Backfill via the acting user, then fold any orphans into default.
        `ALTER TABLE audit_trails ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `UPDATE audit_trails a SET organization_id = u.organization_id
            FROM "user" u WHERE a.user_id = u.id AND a.organization_id IS NULL`,
        `UPDATE audit_trails SET organization_id = (SELECT id FROM organizations WHERE slug='default')
            WHERE organization_id IS NULL`,
        `CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_trails (organization_id)`,
        // CRF form template library becomes per-tenant (custom forms must not
        // leak between tenants). Existing templates fold into the default org.
        `ALTER TABLE crf_forms ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `UPDATE crf_forms SET organization_id = (SELECT id FROM organizations WHERE slug='default') WHERE organization_id IS NULL`,
        `CREATE INDEX IF NOT EXISTS idx_crf_forms_org ON crf_forms (organization_id)`,
        // Subscription state (Phase 4) — plan already exists; add billing status.
        `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'Active'`,
        `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP`,
        // Billing processor linkage (Stripe customer/subscription ids).
        `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_customer_id TEXT`,
        `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_subscription_id TEXT`,
        // Feature: Investigator Signed replaces the free-text visit notes field
        // with a lockable sign-off checkbox — once signed, the visit cannot be
        // edited until an admin unsigns it (mirrors crf_data_entries lock).
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_signed BOOLEAN NOT NULL DEFAULT false`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_signed_at TIMESTAMP`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_signed_by TEXT REFERENCES "user"(id)`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_signed_by_name TEXT`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_unsigned_at TIMESTAMP`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_unsigned_by TEXT REFERENCES "user"(id)`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_unsigned_by_name TEXT`,
        `ALTER TABLE visits ADD COLUMN IF NOT EXISTS investigator_unsign_reason TEXT`,
        `ALTER TABLE visits DROP COLUMN IF EXISTS notes`,

        // ── Delegation & training dates: TEXT "YYYY-MM-DD" ──────────────────
        // These columns were defined twice with different types: as text by the
        // drizzle-kit migration (0001, which matches schemas/schema.js) and as
        // TIMESTAMP by the CREATE TABLE above. Both are CREATE TABLE IF NOT
        // EXISTS, so whichever ran first won and the column type depended on
        // install order.
        //
        // Text is the correct one. consentrules.day() compares these by slicing
        // the first ten characters, so a timestamp read back as a Date yields
        // "Sat Aug 01" — and "Sat Aug 01" <= "2026-08-15" is false. Every
        // delegation-window check would silently deny everyone, and that check
        // decides who may take informed consent (ICH E6(R3) §4.1.5).
        //
        // Converts in place, keeping the calendar day. Nothing is dropped.
        `DO $$
         DECLARE
             r RECORD;
         BEGIN
             FOR r IN
                 SELECT table_name, column_name
                 FROM information_schema.columns
                 WHERE table_schema = current_schema()
                   AND data_type LIKE 'timestamp%'
                   AND (table_name, column_name) IN (
                       ('delegation_log',   'delegation_start'),
                       ('delegation_log',   'delegation_end'),
                       ('training_records', 'training_date'),
                       ('training_records', 'expiry_date')
                   )
             LOOP
                 EXECUTE format(
                     'ALTER TABLE %I ALTER COLUMN %I TYPE TEXT USING to_char(%I, ''YYYY-MM-DD'')',
                     r.table_name, r.column_name, r.column_name
                 );
                 RAISE WARNING 'converted %.% from timestamp to text (YYYY-MM-DD)', r.table_name, r.column_name;
             END LOOP;
         END $$`,

        // ── Training records are tenant data ────────────────────────────────
        // The table had neither an organization_id nor any filter on read, so
        // one tenant's admin could list another tenant's staff qualifications.
        // Backfilled from the person the record belongs to.
        `ALTER TABLE training_records ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)`,
        `ALTER TABLE training_records ADD COLUMN IF NOT EXISTS study_id        INTEGER REFERENCES studies(id)`,
        `UPDATE training_records t
            SET organization_id = u.organization_id
            FROM "user" u
            WHERE u.id = t.user_id AND t.organization_id IS NULL`,
        `CREATE INDEX IF NOT EXISTS idx_training_org ON training_records (organization_id)`,
        `CREATE INDEX IF NOT EXISTS idx_training_study ON training_records (study_id)`,

        // One CRF entry per (subject, visit, form). Both the import route and
        // the data-entry route do "select, then insert if absent" with no lock,
        // and a SELECT ... FOR UPDATE takes no lock when the row does not exist
        // yet — so two concurrent saves both found nothing and both inserted.
        // The duplicate is invisible in the UI (the reader takes the first
        // match) but both are emitted to the ODM export, which is worse than
        // either outcome alone. Only the database can settle this.
        //
        // Creating the index outright would fail on any deployment that already
        // has duplicates, and the migration runner would swallow that as a
        // one-line warning. Deduplicating automatically is not an option
        // either: esignatures cascade-delete with the entry, so a well-meant
        // cleanup would destroy Part 11 signature records. So: create it when
        // the data is clean, and say plainly what to do when it is not.
        `DO $$
         DECLARE dupes integer;
         BEGIN
             -- Nothing to do once the index exists, and this runs on every
             -- boot: without the guard it is a full scan of crf_data_entries
             -- at every restart, forever. Checked against current_schema()
             -- rather than to_regclass, which resolves through search_path and
             -- would answer "absent" for an index sitting in a schema that is
             -- simply not on the path — then try to create a second one.
             IF EXISTS (
                 SELECT 1 FROM pg_indexes
                 WHERE indexname = 'idx_crf_entry_unique'
                   AND schemaname = current_schema()
             ) THEN
                 RETURN;
             END IF;
             SELECT count(*) INTO dupes FROM (
                 SELECT 1 FROM crf_data_entries
                 GROUP BY subject_id, visit_id, form_id HAVING count(*) > 1
             ) d;
             IF dupes = 0 THEN
                 CREATE UNIQUE INDEX IF NOT EXISTS idx_crf_entry_unique
                     ON crf_data_entries (subject_id, visit_id, form_id);
             ELSE
                 RAISE WARNING 'crf_data_entries has % duplicate (subject, visit, form) group(s); idx_crf_entry_unique was NOT created. Reconcile them, then restart. To list them: SELECT subject_id, visit_id, form_id, count(*), array_agg(id) FROM crf_data_entries GROUP BY 1,2,3 HAVING count(*) > 1;', dupes;
             END IF;
         END $$`,
    ];
    for (const stmt of stmts) {
        try {
            await client.unsafe(stmt);
        } catch (err) {
            // Log but continue — idempotent statements mean retries are safe
            console.warn('Migration stmt warning (non-fatal):', err.message?.slice(0, 120));
        }
    }
}
const app = express();
app.use(safeErrorResponses);

// Behind Vercel/reverse proxy: trust the first hop so req.ip is the real
// client address (rate limiting and login_attempts would otherwise key on the
// proxy IP — one shared bucket for every user).
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Security headers (helmet-equivalent, no extra dependency).
// CSP notes: all JS/CSS is self-hosted (Tailwind/Lucide vendored under
// src/frontend/vendor); 'unsafe-inline' is required by the SPA's inline
// onclick handlers and Tailwind Play's injected styles.
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +   // unsafe-eval: Tailwind Play JIT
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "font-src 'self' data:; " +
        "connect-src 'self'; " +
        "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// CORS pinned to the deployment origins — never reflect arbitrary origins
// while credentials are enabled.
const _trustedOrigin = process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
const ALLOWED_ORIGINS = new Set([
    _trustedOrigin,
    'http://localhost:3000',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean));
app.use(cors({
    origin: (origin, cb) => {
        // Same-origin/no-Origin requests (fetch from own pages, curl) pass.
        if (!origin || ALLOWED_ORIGINS.has(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
            return cb(null, true);
        }
        cb(null, false);
    },
    credentials: true,
}));

// Only a small allowlist of Better Auth endpoints is reachable over HTTP.
// sign-up would accept client-supplied fields and sign-in would bypass the
// account-lockout + TOTP flow in /api/mfa — both stay server-side only
// (routes/register.js, routes/usermgmt.js, routes/mfa.js call auth.api.* directly).
const AUTH_PUBLIC_PATHS = new Set(['/api/auth/sign-out', '/api/auth/get-session']);
app.all('/api/auth/*', rateLimitAuth, (req, res, next) => {
    if (!AUTH_PUBLIC_PATHS.has(req.path)) {
        return res.status(403).json({ error: 'This endpoint is disabled. Use /api/mfa for sign-in.' });
    }
    // Normalize Origin for Better Auth's own origin check across deploy URLs.
    req.headers['origin'] = _trustedOrigin;
    next();
});
app.all('/api/auth/*', toNodeHandler(auth));

// Billing webhook needs the RAW body for Stripe signature verification — mount
// it before express.json() so the payload isn't parsed/re-serialized.
app.post('/api/billing/webhook', express.raw({ type: '*/*' }), handleBillingWebhook);

// Bulk data import posts a whole site's spreadsheet as JSON (hundreds of wide
// rows), so it needs a larger body limit. Mounted before the global parser; the
// global express.json() below is a no-op once the body is already parsed, so
// every other route keeps the default (small) limit.
app.use('/api/import', express.json({ limit: '25mb' }));

app.use(express.json());

// Auth-required API routes
app.use('/api/mfa',      rateLimitAuth, mfaRouter);
app.use('/api/register', rateLimitAuth, registerRouter);
app.use('/api/signup',   rateLimitAuth, signupRouter);   // public self-service tenant signup (gated by ALLOW_TENANT_SIGNUP)
app.use('/api/sites',      requireAuth, sitesRouter);
app.use('/api/security',   requireAuth, securityRouter);
app.use('/api/studies',    requireAuth, studiesRouter);
app.use('/api/audit',      requireAuth, auditRouter);
app.use('/api/forms',      requireAuth, formsRouter);
app.use('/api/users',         requireAuth, userMgmtRouter);
app.use('/api/organizations', requireAuth, organizationsRouter);   // platform_owner only (enforced in-router)
app.use('/api/billing',       requireAuth, billingRouter);          // config + checkout (webhook mounted above, raw)
app.use('/api/notifications', requireAuth, requireStudy, notificationsRouter);
// Liveness — process is up (cheap, no dependencies).
app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Readiness — includes a DB round-trip. Load balancers should route on this;
// returns 503 when the database is unreachable so unhealthy instances drain.
app.get('/api/ready', async (_req, res) => {
    try {
        await client`SELECT 1`;
        res.json({ status: 'ready', db: 'up' });
    } catch (err) {
        res.status(503).json({ status: 'not-ready', db: 'down', error: err.message });
    }
});

// Study-scoped routes — require both auth and X-Study-ID header
// requireAuth sets req.orgId, which rateLimitTenant keys on, before requireStudy.
const studyAuth = [requireAuth, rateLimitTenant, requireStudy];
app.use('/api/subjects',                  ...studyAuth, subjectsRouter);
app.use('/api/subjects/:subjectId/visits', ...studyAuth, visitsRouter);
app.use('/api/entries',                   ...studyAuth, entriesRouter);
app.use('/api/import',                     ...studyAuth, importRouter);
app.use('/api/queries',                   ...studyAuth, queriesRouter);
app.use('/api/dashboard',                 ...studyAuth, dashboardRouter);
app.use('/api/signatures',                ...studyAuth, signaturesRouter);
app.use('/api/ae',                        ...studyAuth, adverseEventsRouter);
app.use('/api/deviations',                ...studyAuth, deviationsRouter);
app.use('/api/consents',                  ...studyAuth, consentsRouter);
app.use('/api/randomization',             ...studyAuth, randomizationRouter);
app.use('/api/export',                    ...studyAuth, exportRouter);
app.use('/api/dblock',                    ...studyAuth, dblockRouter);
app.use('/api/delegation',                ...studyAuth, delegationRouter);
app.use('/api/saereports',                ...studyAuth, saeReportsRouter);
app.use('/api/monitoring',                ...studyAuth, monitoringRouter);
app.use('/api/visit-templates',           ...studyAuth, visitTemplatesRouter);
// Phase 1 — Core Clinical Modules
app.use('/api/medhistory',               ...studyAuth, medHistoryRouter);
app.use('/api/conmeds',                  ...studyAuth, conMedsRouter);
app.use('/api/vitalsigns',               ...studyAuth, vitalSignsRouter);
app.use('/api/lab',                      ...studyAuth, labRouter);
// Phase 2 — Regulatory & Quality
app.use('/api/amendments',               ...studyAuth, amendmentsRouter);
app.use('/api/bdreview',                 ...studyAuth, bdReviewRouter);
// Phase 3 — Quality Management & Validation
app.use('/api/qtl',                      ...studyAuth, qtlRouter);
app.use('/api/sysval',                   requireAuth,  sysValRouter);
app.use('/api/license',                  requireAuth,  licenseRouter);
// ICH E6(R3) Gap Closure
app.use('/api/screening',                ...studyAuth, screeningRouter);
app.use('/api/ip',                       ...studyAuth, ipDispensingRouter);
app.use('/api/essential-docs',           ...studyAuth, essentialDocsRouter);
app.use('/api/agreements',               requireAuth,  agreementsRouter);
app.use('/api/monitoring-plan',          ...studyAuth, monitoringPlanRouter);
app.use('/api/reports',                  ...studyAuth, reportRouter);
app.use('/api/access-review',            ...studyAuth, accessReviewRouter);

app.use('/api', (_req, res) => res.status(404).json({ error: 'This service could not be found. Refresh the page and try again.' }));
app.use(apiErrorHandler);

// Serve ONLY the frontend assets — never the repo root, which would expose
// source code, docs with test credentials, and the .git directory.
app.use('/src/frontend', express.static(path.join(rootDir, 'src/frontend'), { dotfiles: 'deny' }));
for (const page of ['landing.html', 'login.html', 'index.html', 'register.html', 'select.html', 'platform.html', 'signup.html']) {
    app.get(`/${page}`, (_req, res) => res.sendFile(path.join(rootDir, page)));
}
app.get('/', (_req, res) => res.sendFile(path.join(rootDir, 'landing.html')));

const PORT = parseInt(process.env.PORT || '3000', 10);

// On a FRESH database (e.g. a new on-premise install) the core tables don't
// exist yet — apply the drizzle base migrations once to create them. On an
// existing install (core tables already present, possibly created via
// drizzle-kit push with no tracking table) we skip this so migrate() never
// tries to re-CREATE existing tables; runMigrations() then handles all
// incremental columns/tables on top.
async function ensureBaseSchema() {
    const [{ exists }] = await client`SELECT to_regclass('public."user"') AS exists`;
    if (exists) return;   // existing DB → leave the base schema alone
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    const { db } = await import('./db/connection.js');
    await migrate(db, { migrationsFolder: path.join(__dirname, 'db/migrations') });
    console.log('Base schema created (fresh database).');
}

// Start listening immediately so the port is bound on deploy, then migrate in the background.
// Per-statement try/catch inside runMigrations() ensures one failing DDL never blocks the rest.
app.listen(PORT, () => {
    console.log(`E-CRF Server running on http://localhost:${PORT}`);
    console.log(`Better Auth endpoint: http://localhost:${PORT}/api/auth`);
    if (process.env.LICENSE_ENFORCEMENT === 'true') {
        import('./lib/license.js').then(({ getLicense }) => {
            const lic = getLicense();
            if (lic.active) {
                console.log(`License: active for "${lic.customer}" (expires ${lic.expiresAt}).`);
            } else {
                console.warn(`License: NOT ACTIVE (${lic.reason}). New-record creation (enrollment/studies/sites) is blocked; reads/exports continue.`);
            }
        }).catch(() => {});
    }
    ensureBaseSchema()
        .then(runMigrations)
        .then(() => console.log('DB migrations applied.'))
        .catch(err => console.warn('Migration warning (non-fatal):', err.message));
});
```

## src/frontend/js/app.js

```javascript
import { escHtml } from './modules/utils.js';
// ============================================================
// E-CRF Main App — Router, Sidebar, Breadcrumb
// ============================================================

import { api } from './modules/api.js';
import { showToast, showModal, closeModal } from './modules/utils.js';
import { getSiteContext, switchStudyAndSite } from './modules/study-select.js';
import { initSessionTimeout } from './modules/session.js';
import { checkAndShowAgreements } from './modules/agreements.js';

export { showToast, showModal, closeModal };

// ---- Auth Guard ----
const user = api.getCurrentUser();
if (!user) {
    window.location.href = 'login.html';
    throw new Error('Not authenticated');
}
// The platform operator has no study/site context — it belongs in the platform
// console, not the clinical SPA.
if (user.role === 'platform_owner') {
    window.location.href = 'platform.html';
    throw new Error('Platform operator redirected to console');
}

// ---- Navigation Config ----
const DM = 'data_manager';

// Sidebar sections — shown as headers so 30+ modules read as a workflow, not a
// wall of tabs. "Daily work" is the required core flow; the rest support it.
const NAV_SECTIONS = [
    { id: 'core',       label: 'Daily Clinical Work' },
    { id: 'safety',     label: 'Safety' },
    { id: 'quality',    label: 'Monitoring & Data Quality' },
    { id: 'compliance', label: 'Compliance & Documents' },
    { id: 'setup',      label: 'Study Setup · one-time' },
];

const NAV_ITEMS = [
    { id: 'dashboard',      label: 'Dashboard',       icon: 'layout-dashboard', section: 'core', roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'subjects',       label: 'Subjects',        icon: 'users',            section: 'core', roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'screening',      label: 'Screening Log',   icon: 'clipboard-list',   section: 'core', roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'consents',       label: 'Consent',         icon: 'file-check',       section: 'core', roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'reconsenttracking', label: 'Re-consent',   icon: 'file-check-2',     section: 'core', roles: ['admin', 'pi', 'cra', DM] },
    { id: 'randomization',  label: 'Randomization',   icon: 'shuffle',          section: 'core', roles: ['admin', 'investigator', 'pi'] },
    { id: 'medhistory',     label: 'Medical History', icon: 'file-heart',       section: 'core', roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'conmeds',        label: 'Con. Medications',icon: 'pill',             section: 'core', roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'vitalsigns',     label: 'Vital Signs',     icon: 'heart-pulse',      section: 'core', roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'lab',            label: 'Laboratory',      icon: 'test-tube-2',      section: 'core', roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'ipdispensing',   label: 'IP Accountability',icon: 'package',         section: 'core', roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },

    { id: 'ae',             label: 'Adverse Events',  icon: 'activity',         section: 'safety', roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },
    { id: 'saereports',     label: 'SAE Reports',     icon: 'alert-octagon',    section: 'safety', roles: ['admin', 'cra', 'pi', DM] },
    { id: 'deviations',     label: 'Deviations',      icon: 'alert-triangle',   section: 'safety', roles: ['admin', 'investigator', 'pi', 'cra', 'crc', DM] },

    { id: 'queries',        label: 'Queries',         icon: 'message-square',   section: 'quality', roles: ['admin', 'cra', 'investigator', 'pi', 'crc', DM] },
    { id: 'monitoring',     label: 'Monitoring',      icon: 'clipboard-check',  section: 'quality', roles: ['admin', 'cra', 'pi', DM] },
    { id: 'monitoringplan', label: 'Monitoring Plan', icon: 'map',              section: 'quality', roles: ['admin', 'cra', 'pi', DM] },
    { id: 'datastatus',     label: 'Data Status',     icon: 'table-2',          section: 'quality', roles: ['admin', 'cra', 'pi', DM] },
    { id: 'missingdata',    label: 'Data Quality',    icon: 'bar-chart-2',      section: 'quality', roles: ['admin', 'cra', 'pi', DM] },
    { id: 'bdreview',       label: 'Blind Review',    icon: 'eye-off',          section: 'quality', roles: ['admin', 'cra', 'pi', DM] },
    { id: 'csm',            label: 'CSM / KRI',       icon: 'bar-chart-3',      section: 'quality', roles: ['admin', 'cra', 'pi', DM] },
    { id: 'qtl',            label: 'QTL Thresholds',  icon: 'sliders-horizontal',section: 'quality', roles: ['admin', 'cra', 'pi', DM] },
    { id: 'dblock',         label: 'DB Lock',         icon: 'lock',             section: 'quality', roles: ['admin', 'cra', 'pi', DM] },

    { id: 'audit',          label: 'Audit Trail',     icon: 'shield-check',     section: 'compliance', roles: ['admin', 'cra', 'pi', DM] },
    { id: 'delegation',     label: 'Delegation',      icon: 'user-check',       section: 'compliance', roles: ['admin', 'cra', 'pi', DM] },
    { id: 'amendments',     label: 'Amendments',      icon: 'file-pen',         section: 'compliance', roles: ['admin', 'pi', 'cra', DM] },
    { id: 'essentialdocs',  label: 'TMF / Ess. Docs', icon: 'folder-check',     section: 'compliance', roles: ['admin', 'cra', 'pi', DM] },
    { id: 'accessreview',   label: 'Access Review',   icon: 'shield-check',     section: 'compliance', roles: ['admin'] },

    { id: 'studymgmt',      label: 'Studies',         icon: 'flask-conical',    section: 'setup', roles: ['admin'] },
    { id: 'sites',          label: 'Sites',           icon: 'building-2',       section: 'setup', roles: ['admin'] },
    { id: 'visittemplates', label: 'Visit Templates', icon: 'calendar-check',   section: 'setup', roles: ['admin', 'pi'] },
    { id: 'formbuilder',    label: 'Form Builder',    icon: 'clipboard-edit',   section: 'setup', roles: ['admin'] },
    { id: 'dataimport',     label: 'Data Import',     icon: 'upload',           section: 'setup', roles: ['admin', DM] },
    { id: 'usermgmt',       label: 'Users',           icon: 'users-round',      section: 'setup', roles: ['admin'] },
    { id: 'sysval',         label: 'System Validation',icon: 'shield-plus',     section: 'setup', roles: ['admin'] },
];

const ROLE_CONFIG = {
    admin:        { label: 'Administrator',          cls: 'bg-indigo-600' },
    investigator: { label: 'Investigator',           cls: 'bg-blue-600' },
    pi:           { label: 'Principal Investigator', cls: 'bg-purple-600' },
    cra:          { label: 'CRA / Monitor',          cls: 'bg-amber-600' },
    crc:          { label: 'Study Coordinator',      cls: 'bg-emerald-600' },
    data_manager: { label: 'Data Manager',           cls: 'bg-teal-600' },
};

// ---- App state helpers ----
function getAppState() {
    return {
        hasStudy: !!api.getCurrentStudy(),
        hasSite:  !!getSiteContext(),
    };
}

// Admin setup routes (creating the FIRST study/site) must stay reachable even
// before any study/site/display-name exists — otherwise a fresh install
// deadlocks: you can't select a study because none exist, yet you can't reach
// Study Management to create one. Only admins can hit these routes anyway.
function isAdminSetupRoute() {
    const hash = (window.location.hash || '').replace(/^#/, '').split(/[/?]/)[0];
    return user.role === 'admin' && (hash === 'studymgmt' || hash === 'sites');
}

// ---- Sidebar ----
function renderSidebar(currentRoute) {
    const nav        = document.getElementById('sidebar-nav');
    const headerUser = document.getElementById('header-user');
    if (!nav) return;

    const { hasStudy, hasSite } = getAppState();
    let visible;
    if (!hasStudy) {
        // No study selected: only show Studies tab (admin) — others see nothing
        visible = NAV_ITEMS.filter(item => item.id === 'studymgmt' && item.roles.includes(user.role));
    } else if (!hasSite) {
        // Study selected but no site: show Studies + Sites (admin can create site)
        visible = NAV_ITEMS.filter(item => ['studymgmt', 'sites'].includes(item.id) && item.roles.includes(user.role));
    } else {
        visible = NAV_ITEMS.filter(item => item.roles.includes(user.role));
    }

    const siteChipEl = document.getElementById('sidebar-site-context');
    if (siteChipEl) siteChipEl.innerHTML = '';
    const userArea = document.getElementById('sidebar-user');
    if (userArea) userArea.innerHTML = '';

    const renderItem = (item) => {
        const isActive = currentRoute === item.id;
        const badge = item.id === 'queries' ? getOpenQueryBadge() : '';
        return `
        <a href="#${item.id}"
            class="nav-link flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition mb-0.5 ${
                isActive
                    ? 'nav-active text-white'
                    : 'text-blue-200 hover:text-white'
            }">
            <i data-lucide="${item.icon}" class="w-3.5 h-3.5 flex-shrink-0 opacity-75"></i>
            <span class="flex-1 tracking-wide">${item.label}</span>
            ${badge}
        </a>`;
    };

    // Group into labeled sections (headers only when the section has visible items).
    nav.innerHTML = NAV_SECTIONS.map(sec => {
        const items = visible.filter(item => item.section === sec.id);
        if (!items.length) return '';
        return `
        <p class="px-3 mt-4 mb-1 first:mt-0 text-[10px] font-semibold uppercase tracking-wider text-blue-300/60 select-none">${sec.label}</p>
        ${items.map(renderItem).join('')}`;
    }).join('');

    const displayName = user.displayName || user.name;
    const firstName   = displayName.split(' ')[0];
    const initials    = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const rc      = ROLE_CONFIG[user.role] || { label: user.role, cls: 'bg-slate-500' };
    const siteCtx = getSiteContext();
    const study   = api.getCurrentStudy();

    if (headerUser) {
        const hasStudy = study && study.status === 'Active';
        const hasSite  = siteCtx && siteCtx.status !== 'Inactive';
        const siteFull = hasSite
            ? (siteCtx.siteCode && siteCtx.siteName ? `${siteCtx.siteCode} – ${siteCtx.siteName}` : siteCtx.siteName ?? siteCtx.siteCode)
            : '';
        const contextPart = (hasStudy || hasSite) ? `
            <div class="flex items-center gap-1.5 text-xs text-slate-500 leading-none">
                ${hasStudy ? `<i data-lucide="flask-conical" class="w-3 h-3 text-emerald-500 flex-shrink-0"></i><span class="font-medium text-slate-700">${study.title}</span>` : ''}
                ${hasStudy && hasSite ? `<span class="text-slate-300">·</span>` : ''}
                ${hasSite ? `<i data-lucide="building-2" class="w-3 h-3 text-blue-400 flex-shrink-0"></i><span>${siteFull}</span>` : ''}
                ${hasStudy && ['admin'].includes(user.role) ? `
                <button onclick="window.appSwitchStudy()" title="Switch Study"
                    class="ml-0.5 p-0.5 text-slate-400 hover:text-blue-600 rounded transition">
                    <i data-lucide="repeat-2" class="w-3 h-3"></i>
                </button>` : ''}
            </div>` : '';

        headerUser.innerHTML = `
        <div class="flex items-center gap-2.5">
            ${contextPart ? `<div class="text-right hidden md:flex flex-col gap-0.5 items-end">
                ${contextPart}
                <p class="text-[10px] text-slate-400 leading-none">${rc.label}</p>
            </div>` : `<p class="text-xs text-slate-500 hidden md:block">${rc.label}</p>`}
            <div class="w-7 h-7 rounded-md ${rc.cls} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 uppercase">${initials}</div>
            <div class="hidden lg:block">
                <p class="text-xs font-semibold text-slate-700 leading-tight">${firstName}</p>
            </div>
            <button onclick="window.appSecuritySettings()" title="Security Settings"
                class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition flex-shrink-0">
                <i data-lucide="shield" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="window.appLogout()" title="Sign Out"
                class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition flex-shrink-0">
                <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
            </button>
        </div>`;
    }

    lucide.createIcons();
}

function getOpenQueryBadge() {
    const open = window._openQueryCount || 0;
    if (!open) return '';
    return `<span class="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">${open}</span>`;
}

// Refresh open query count in background and update sidebar badge
function refreshQueryCount() {
    if (!api.getCurrentStudy()) return; // skip if no study selected — will get 400
    api.getQueries({ status: 'Open' })
        .then(qs => {
            const count = Array.isArray(qs) ? qs.length : 0;
            if (count !== window._openQueryCount) {
                window._openQueryCount = count;
                const basePath = parseRoute(window.location.hash).key.split('/')[0] || 'dashboard';
                renderSidebar(basePath);
            }
        })
        .catch(() => {});
}

window._openQueryCount = 0;

// ---- Study Status Banner ----
const _BANNER_CFG = {
    Terminated: { bg: 'bg-red-600',   icon: 'ban',          msg: 'Study TERMINATED — data entry and modifications are locked.' },
    Completed:  { bg: 'bg-slate-600', icon: 'lock',         msg: 'Study COMPLETED — data entry and modifications are locked.' },
    Suspended:  { bg: 'bg-amber-500', icon: 'pause-circle', msg: 'Study SUSPENDED — data entry and modifications are locked pending review.' },
};

function updateStudyStatusBanner() {
    const el  = document.getElementById('study-status-banner');
    if (!el) return;
    const study = api.getCurrentStudy();
    const cfg   = study ? _BANNER_CFG[study.status] : null;
    if (!cfg) {
        el.className = 'hidden flex-shrink-0';
        el.innerHTML = '';
        return;
    }
    el.className = `${cfg.bg} text-white flex-shrink-0 flex items-center gap-2.5 px-5 py-2 text-xs font-semibold`;
    el.innerHTML = `<i data-lucide="${cfg.icon}" class="w-3.5 h-3.5 flex-shrink-0"></i><span>${cfg.msg}</span>`;
    lucide.createIcons();
}

// ---- Breadcrumb ----
function renderBreadcrumb(segments) {
    const el = document.getElementById('breadcrumb');
    if (!el) return;
    el.innerHTML = [
        `<span class="text-blue-600 font-semibold text-xs uppercase tracking-widest">E-CRF</span>`,
        ...segments.map((seg, i) => {
            const isLast = i === segments.length - 1;
            const chevron = `<i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-300 mx-0.5"></i>`;
            if (isLast) return chevron + `<span class="font-semibold text-slate-700 text-sm">${seg.label}</span>`;
            return chevron + `<a href="#${seg.route}" class="text-sm text-slate-500 hover:text-blue-600 transition">${seg.label}</a>`;
        })
    ].join('');
    lucide.createIcons();
}

// ---- Route Handlers ----
const routes = {
    'dashboard': async () => {
        renderBreadcrumb([{ label: 'Dashboard', route: 'dashboard' }]);
        const { renderDashboard } = await import('./modules/dashboard.js');
        await renderDashboard();
    },
    'subjects': async () => {
        renderBreadcrumb([{ label: 'Subjects', route: 'subjects' }]);
        const { renderSubjects } = await import('./modules/subjects.js');
        await renderSubjects();
    },
    'subjects/new': async () => {
        renderBreadcrumb([
            { label: 'Subjects', route: 'subjects' },
            { label: 'Enroll New Subject', route: 'subjects/new' },
        ]);
        const { renderSubjects } = await import('./modules/subjects.js');
        await renderSubjects({ showNewForm: true });
    },
    'subjects/:id': async (id) => {
        renderBreadcrumb([
            { label: 'Subjects', route: 'subjects' },
            { label: `Subject ${id}`, route: `subjects/${id}` },
        ]);
        const { renderSubjectDetail } = await import('./modules/subjects.js');
        await renderSubjectDetail(id);
    },
    'subjects/:id/visits/:vid/forms/:fid': async (id, vid, fid) => {
        renderBreadcrumb([
            { label: 'Subjects', route: 'subjects' },
            { label: `Subject ${id}`, route: `subjects/${id}` },
            { label: 'Data Entry', route: `subjects/${id}/visits/${vid}/forms/${fid}` },
        ]);
        const { renderDataEntry } = await import('./modules/forms.js');
        await renderDataEntry({ subjectId: id, visitId: vid, formId: fid });
    },
    // ── Phase 1: Core Clinical Modules ────────────────────────────────────────
    'medhistory': async () => {
        renderBreadcrumb([{ label: 'Medical History', route: 'medhistory' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderMedHistory } = await import('./modules/medhistory.js'); await renderMedHistory(el); }
    },
    'conmeds': async () => {
        renderBreadcrumb([{ label: 'Concomitant Medications', route: 'conmeds' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderConMeds } = await import('./modules/conmeds.js'); await renderConMeds(el); }
    },
    'vitalsigns': async () => {
        renderBreadcrumb([{ label: 'Vital Signs', route: 'vitalsigns' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderVitalSigns } = await import('./modules/vitalsigns.js'); await renderVitalSigns(el); }
    },
    'lab': async () => {
        renderBreadcrumb([{ label: 'Laboratory Results', route: 'lab' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderLab } = await import('./modules/lab.js'); await renderLab(el); }
    },
    // ── Phase 2: Regulatory ────────────────────────────────────────────────────
    'amendments': async () => {
        renderBreadcrumb([{ label: 'Protocol Amendments', route: 'amendments' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderAmendments } = await import('./modules/amendments.js'); await renderAmendments(el); }
    },
    'bdreview': async () => {
        renderBreadcrumb([{ label: 'Blind Data Review', route: 'bdreview' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderBDReview } = await import('./modules/bdreview.js'); await renderBDReview(el); }
    },
    // ── Phase 3: Quality Management ───────────────────────────────────────────
    'csm': async () => {
        renderBreadcrumb([{ label: 'Central Statistical Monitoring', route: 'csm' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderCSM } = await import('./modules/csm.js'); await renderCSM(el); }
    },
    'qtl': async () => {
        renderBreadcrumb([{ label: 'QTL Thresholds', route: 'qtl' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderQTL } = await import('./modules/qtl.js'); await renderQTL(el); }
    },
    'sysval': async () => {
        if (user.role !== 'admin') { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'System Validation', route: 'sysval' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderSysVal } = await import('./modules/sysval.js'); await renderSysVal(el); }
    },
    // ── ICH E6(R3) Gap Closure ──────────────────────────────────────────────────
    'screening': async () => {
        renderBreadcrumb([{ label: 'Screening Log', route: 'screening' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderScreeningLog } = await import('./modules/screening.js'); await renderScreeningLog(el); }
    },
    'ipdispensing': async () => {
        renderBreadcrumb([{ label: 'IP Accountability', route: 'ipdispensing' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderIPDispensing } = await import('./modules/ipdispensing.js'); await renderIPDispensing(el); }
    },
    'essentialdocs': async () => {
        renderBreadcrumb([{ label: 'Essential Documents', route: 'essentialdocs' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderEssentialDocs } = await import('./modules/essentialdocs.js'); await renderEssentialDocs(el); }
    },
    'monitoringplan': async () => {
        renderBreadcrumb([{ label: 'Monitoring Plan (RBMP)', route: 'monitoringplan' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderMonitoringPlan } = await import('./modules/monitoringplan.js'); await renderMonitoringPlan(el); }
    },
    'missingdata': async () => {
        renderBreadcrumb([{ label: 'Data Quality Report', route: 'missingdata' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderMissingDataReport } = await import('./modules/missingdata.js'); await renderMissingDataReport(el); }
    },
    'reconsenttracking': async () => {
        renderBreadcrumb([{ label: 'Amendment Re-consent Tracking', route: 'reconsenttracking' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderReconsentTracking } = await import('./modules/reconsenttracking.js'); await renderReconsentTracking(el); }
    },
    'accessreview': async () => {
        if (user.role !== 'admin') { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'Periodic User Access Review', route: 'accessreview' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderAccessReview } = await import('./modules/accessreview.js'); await renderAccessReview(el); }
    },
    'audit': async () => {
        renderBreadcrumb([{ label: 'Audit Trail', route: 'audit' }]);
        const { renderAuditTrail } = await import('./modules/audit.js');
        await renderAuditTrail();
    },
    'queries': async () => {
        renderBreadcrumb([{ label: 'Data Queries', route: 'queries' }]);
        const { renderQueries } = await import('./modules/queries.js');
        await renderQueries();
    },
    'ae': async () => {
        renderBreadcrumb([{ label: 'Adverse Events', route: 'ae' }]);
        const { renderAdverseEvents } = await import('./modules/adverseevents.js');
        await renderAdverseEvents();
    },
    'deviations': async () => {
        renderBreadcrumb([{ label: 'Protocol Deviations', route: 'deviations' }]);
        const { renderDeviations } = await import('./modules/deviations.js');
        await renderDeviations();
    },
    'consents': async () => {
        renderBreadcrumb([{ label: 'Informed Consent', route: 'consents' }]);
        const { renderConsents } = await import('./modules/consents.js');
        await renderConsents();
    },
    'randomization': async () => {
        renderBreadcrumb([{ label: 'Randomization', route: 'randomization' }]);
        const { renderRandomization } = await import('./modules/randomization.js');
        await renderRandomization();
    },
    'dblock': async () => {
        renderBreadcrumb([{ label: 'Database Lock', route: 'dblock' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderDblock } = await import('./modules/dblock.js'); await renderDblock(el); }
    },
    'delegation': async () => {
        renderBreadcrumb([{ label: 'Delegation &amp; Training', route: 'delegation' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderDelegation } = await import('./modules/delegation.js'); await renderDelegation(el); }
    },
    'saereports': async () => {
        renderBreadcrumb([{ label: 'SAE Reports', route: 'saereports' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderSAEReports } = await import('./modules/saereports.js'); await renderSAEReports(el); }
    },
    'monitoring': async () => {
        renderBreadcrumb([{ label: 'Monitoring Visits', route: 'monitoring' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderMonitoring } = await import('./modules/monitoring.js'); await renderMonitoring(el); }
    },
    'datastatus': async () => {
        renderBreadcrumb([{ label: 'Subject Data Status', route: 'datastatus' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderDataStatus } = await import('./modules/datastatus.js'); renderDataStatus(el); }
    },
    'sites': async () => {
        if (user.role !== 'admin') { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'Site Management', route: 'sites' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderSites } = await import('./modules/sites.js'); await renderSites(el); }
    },
    'studymgmt': async () => {
        if (user.role !== 'admin') { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'Study Management', route: 'studymgmt' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderStudyMgmt } = await import('./modules/studymgmt.js'); await renderStudyMgmt(el); }
    },
    'formbuilder': async () => {
        if (user.role !== 'admin') { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'Form Builder', route: 'formbuilder' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderFormBuilder } = await import('./modules/formbuilder.js'); await renderFormBuilder(el); }
    },
    'dataimport': async () => {
        if (!['admin', 'data_manager'].includes(user.role)) { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'Data Import', route: 'dataimport' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderDataImport } = await import('./modules/dataimport.js'); await renderDataImport(el); }
    },
    'visittemplates': async () => {
        if (!['admin', 'pi'].includes(user.role)) { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'Visit Templates', route: 'visittemplates' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderVisitTemplates } = await import('./modules/visittemplates.js'); await renderVisitTemplates(el); }
    },
    'usermgmt': async () => {
        if (user.role !== 'admin') { window.location.hash = '#dashboard'; return; }
        renderBreadcrumb([{ label: 'Users', route: 'usermgmt' }]);
        const el = document.getElementById('main-content');
        if (el) { const { renderUserMgmt } = await import('./modules/usermgmt.js'); await renderUserMgmt(el); }
    },
};

// ---- Router ----
function parseRoute(hash) {
    const path = (hash || '').replace(/^#\/?/, '');
    if (!path) return { key: 'dashboard', params: [] };

    let m;
    m = path.match(/^subjects\/(\d+)\/visits\/(\d+)\/forms\/(\d+)$/);
    if (m) return { key: 'subjects/:id/visits/:vid/forms/:fid', params: [m[1], m[2], m[3]] };

    m = path.match(/^subjects\/new$/);
    if (m) return { key: 'subjects/new', params: [] };

    m = path.match(/^subjects\/(\d+)$/);
    if (m) return { key: 'subjects/:id', params: [m[1]] };

    if (routes[path]) return { key: path, params: [] };
    // Alias /adverse-events → ae for external links
    if (path === 'adverse-events') return { key: 'ae', params: [] };
    return { key: 'dashboard', params: [] };
}

async function navigate(hash) {
    const { key, params } = parseRoute(hash);
    const basePath = key.split('/')[0] || 'dashboard';
    renderSidebar(basePath);
    updateStudyStatusBanner();

    const handler = routes[key];
    const contentEl = document.getElementById('main-content');
    if (!contentEl) return;

    if (!handler) {
        contentEl.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="text-center">
                <p class="text-7xl font-bold text-slate-200 mb-3 tracking-tight">404</p>
                <p class="text-slate-500 text-sm mb-4">Page not found</p>
                <a href="#dashboard" class="text-blue-600 hover:underline text-sm font-medium">Return to Dashboard</a>
            </div>
        </div>`;
        return;
    }

    try {
        await handler(...params);
    } catch (err) {
        console.error('Route error:', err);
        contentEl.innerHTML = `
        <div class="p-6">
            <div class="ph-card p-5 border-red-200">
                <p class="text-sm font-semibold text-red-800 mb-1">Error loading page</p>
                <p class="text-sm text-red-700">${escHtml(err.message)}</p>
            </div>
        </div>`;
    }
}

window.navigate        = (path) => { window.location.hash = path; };
window.appLogout       = () => { api.logout(); };
window.appSwitchStudy  = () => { switchStudyAndSite(); };
window.appSecuritySettings = async () => {
    const { renderSecuritySettings } = await import('./modules/security-settings.js');
    renderSecuritySettings();
};

// ── Notification Bell ─────────────────────────────────────────────────────────
let _notifOpen = false;

window.toggleNotifPanel = () => {
    _notifOpen = !_notifOpen;
    const panel = document.getElementById('notif-panel');
    if (panel) {
        panel.classList.toggle('hidden', !_notifOpen);
        if (_notifOpen) window.refreshNotifications();
    }
};

document.addEventListener('click', (e) => {
    if (_notifOpen && !document.getElementById('notif-bell-wrap')?.contains(e.target)) {
        _notifOpen = false;
        document.getElementById('notif-panel')?.classList.add('hidden');
    }
});

window.refreshNotifications = async () => {
    if (!api.getCurrentStudy()) return;
    try {
        const data   = await api.getNotifications();
        const alerts = data.alerts ?? [];
        const badge  = document.getElementById('notif-badge');
        const list   = document.getElementById('notif-list');

        // Update badge
        if (badge) {
            if (alerts.length > 0) {
                badge.textContent = alerts.length > 9 ? '9+' : String(alerts.length);
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        // Update panel list
        if (list) {
            if (!alerts.length) {
                list.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">No alerts — all clear ✓</p>`;
            } else {
                const COLOR_MAP = { danger: 'text-red-700 bg-red-50 border-red-100', warning: 'text-amber-700 bg-amber-50 border-amber-100', info: 'text-blue-700 bg-blue-50 border-blue-100' };
                const ICON_MAP  = { danger: 'alert-octagon', warning: 'alert-triangle', info: 'info' };
                list.innerHTML = alerts.map(a => `
                <a href="${a.link ?? '#dashboard'}" onclick="window.toggleNotifPanel()"
                   class="block px-4 py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0">
                  <div class="flex items-start gap-2.5">
                    <i data-lucide="${ICON_MAP[a.type] ?? 'bell'}" class="w-4 h-4 mt-0.5 flex-shrink-0 ${a.type === 'danger' ? 'text-red-500' : a.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}"></i>
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-slate-800 leading-tight">${a.title}</p>
                      <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">${a.body}</p>
                    </div>
                  </div>
                </a>`).join('');
                lucide.createIcons();
            }
        }
    } catch {}
};

// Poll notifications every 5 minutes if study is selected
setInterval(() => { if (api.getCurrentStudy()) window.refreshNotifications(); }, 5 * 60 * 1000);

window.addEventListener('hashchange', () => navigate(window.location.hash));

// Flag: true after the initial navigate() has been called
let _appReady = false;

function navigateByState() {
    const { hasStudy, hasSite } = getAppState();
    if (!isAdminSetupRoute() && (!hasStudy || !hasSite || !user.displayName)) {
        window.location.replace('select.html');
        return;
    }
    navigate(window.location.hash || '#dashboard');
    refreshQueryCount();
}

// study-changed: fired when study is created, switched, or cleared
window.addEventListener('study-changed', () => {
    const basePath = parseRoute(window.location.hash).key.split('/')[0] || 'dashboard';
    renderSidebar(basePath);
    updateStudyStatusBanner();
    if (_appReady) {
        navigateByState();
        window.refreshNotifications();
    }
});

// site-context-changed: fired when site context is set (first site created or picked)
window.addEventListener('site-context-changed', () => {
    const basePath = parseRoute(window.location.hash).key.split('/')[0] || 'dashboard';
    renderSidebar(basePath);
    if (_appReady) {
        navigate(window.location.hash || '#dashboard');
        refreshQueryCount();
    }
});

// If no study+site context, or display name not yet set → redirect to selection/name page.
// Exception: admins may open the study/site setup routes to create the first ones.
const _initState = getAppState();
if (!isAdminSetupRoute() && (!_initState.hasStudy || !_initState.hasSite || !user.displayName)) {
    window.location.replace('select.html');
    throw new Error('Redirecting to study/site selection');
}

_appReady = true;
const _initBasePath = parseRoute(window.location.hash).key.split('/')[0] || 'dashboard';
renderSidebar(_initBasePath);

// ICH E6(R3) C.4.1 — check SOP agreements before allowing access
checkAndShowAgreements().then(() => {
    navigateByState();
});

// 21 CFR Part 11 §11.10(d) — 30-minute inactivity session timeout
initSessionTimeout();

// Initial notification load (after study is known)
setTimeout(() => window.refreshNotifications(), 1500);

// ── Shared Inline Query Modal — available globally from all modules ──────────
window.openRowInlineQuery = function (subjectId, visitId, fieldKey, fieldLabel) {
    window._inlineQueryCtx = { subjectId, visitId: visitId || null, entryId: null, formId: null };
    window.openInlineQueryModal(fieldKey, fieldLabel);
};

window.openInlineQueryModal = function (fieldKey, fieldLabel) {
    showModal({
        title: 'Raise Query',
        size:  'sm',
        body: `
        <div class="space-y-3">
            <div class="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                <i data-lucide="tag" class="w-4 h-4 text-slate-400 flex-shrink-0"></i>
                <span class="text-sm font-semibold text-slate-700">${fieldLabel}</span>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Query / Discrepancy <span class="text-red-500">*</span></label>
                <textarea id="inline-query-text" rows="4"
                    placeholder="Describe the discrepancy or question about this field value..."
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
                <p id="inline-query-err" class="text-xs text-red-500 mt-1 hidden"></p>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="confirmInlineQuery('${fieldKey.replace(/'/g, '&#39;')}', '${fieldLabel.replace(/'/g, '&#39;')}')"
            class="px-4 py-2 text-sm font-semibold text-white rounded-md transition flex items-center gap-2" style="background:#1554A0">
            <i data-lucide="message-circle" class="w-4 h-4"></i> Raise Query
        </button>`,
    });
};

window.confirmInlineQuery = async function (fieldKey, fieldLabel) {
    const queryText = document.getElementById('inline-query-text')?.value?.trim();
    const errEl     = document.getElementById('inline-query-err');
    if (!queryText) {
        errEl.textContent = 'Please describe the query.';
        errEl.classList.remove('hidden');
        return;
    }
    const ctx = window._inlineQueryCtx || {};
    try {
        await api.raiseQuery({
            data_entry_id: ctx.entryId  || null,
            subject_id:    ctx.subjectId,
            visit_id:      ctx.visitId  || null,
            form_id:       ctx.formId   || null,
            field_key:     fieldKey,
            field_label:   fieldLabel,
            query_text:    queryText,
        });
        closeModal();
        showToast('Query raised and recorded in audit trail.', 'success');
        // If context has formId, re-render CRF form to refresh query indicators
        if (ctx.subjectId && ctx.visitId && ctx.formId) {
            const { renderDataEntry } = await import('./modules/forms.js');
            await renderDataEntry({ subjectId: ctx.subjectId, visitId: ctx.visitId, formId: ctx.formId });
        }
    } catch (err) {
        if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
    }
};
```

## src/frontend/js/modules/api.js

```javascript
import { readObject, readContext, writeContext, removeStored } from './storage.js';
import { request } from './http.js';
// ============================================================
// E-CRF API Module — calls real backend, no localStorage
// ============================================================

// ── Study context (localStorage) ───────────────────────────
function getStudyId() {
    return readContext('ecrf_study')?.id || null;
}

// ── HTTP helper ────────────────────────────────────────────
async function apiFetch(path, options = {}) {
    const studyId = getStudyId();
    return request(path, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(studyId ? { 'X-Study-ID': studyId } : {}), ...(options.headers || {}) },
    });
}

async function apiDownload(path, filename, mimeType) {
    const studyId = getStudyId();
    const blob = await request(path, { headers: studyId ? { 'X-Study-ID': studyId } : {} }, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
    try {
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

// ── Session (localStorage only for user info, auth via cookie) ──
function currentUser() {
    return readObject('ecrf_session', value => typeof value.id === 'string' && value.id.length > 0 && typeof value.role === 'string');
}

// ── Field-name mappers (backend camelCase → frontend snake_case) ──

function mapStudy(s) {
    return {
        ...s,
        startDate: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : null,
        endDate:   s.endDate   ? new Date(s.endDate).toISOString().split('T')[0]   : null,
    };
}
function mapSubject(s) {
    const enrolledDate = s.enrolledAt
        ? (typeof s.enrolledAt === 'string' ? s.enrolledAt : new Date(s.enrolledAt).toISOString()).split('T')[0]
        : null;
    const siteParts = [s.siteCode, s.siteName].filter(Boolean);
    return {
        id:              s.id,
        subject_code:    s.subjectCode,
        initial:         s.initials ?? '',
        sex:             s.sex ?? '',
        gender_identity: s.genderIdentity ?? '',
        dob:             s.dateOfBirth ?? null,
        enrollment_date: enrolledDate,
        site_id:         s.siteId ?? null,
        site_name:       siteParts.length ? siteParts.join(' — ') : 'Unknown',
        status:          s.status,
        withdrawn_at:    s.withdrawnAt  ?? null,
        withdraw_reason: s.withdrawReason ?? null,
    };
}

function mapVisit(v) {
    // backend enum 'Completed' → frontend 'Complete'
    const status = v.status === 'Completed' ? 'Complete' : (v.status ?? 'Scheduled');
    return {
        id:               v.id,
        subject_id:       v.subjectId,
        visit_order:      v.visitOrder  ?? 99,
        visit_name:       v.visitName,
        visit_type:       v.visitType   ?? 'Scheduled',
        planned_date:     v.plannedDate ?? null,
        actual_date:      v.actualDate  ?? null,
        window_days:      v.windowDays  ?? null,
        study_day:        v.studyDay    ?? null,
        window_compliance: v.windowCompliance ?? null,
        missed_reason:    v.missedReason ?? null,
        status,
        form_ids:         Array.isArray(v.formIds) ? v.formIds : [],
        created_by_name:  v.createdByName ?? '',
        created_at:       v.createdAt,
        updated_at:       v.updatedAt,
        investigator_signed:            v.investigatorSigned ?? false,
        investigator_signed_at:         v.investigatorSignedAt ?? null,
        investigator_signed_by_name:    v.investigatorSignedByName ?? null,
        investigator_unsigned_at:       v.investigatorUnsignedAt ?? null,
        investigator_unsigned_by_name:  v.investigatorUnsignedByName ?? null,
        investigator_unsign_reason:     v.investigatorUnsignReason ?? null,
    };
}

function mapEntry(e) {
    // backend 'Saved' → frontend 'Submitted'; 'Draft' stays 'Draft'; 'Locked' stays 'Locked'
    const status = e.status === 'Saved' ? 'Submitted' : e.status;
    return {
        id:         e.id,
        subject_id: e.subjectId,
        visit_id:   e.visitId,
        form_id:    e.formId,
        data:       e.dataJson ?? {},
        status,
        form_name:  e.formName ?? 'Unknown',
        created_at: e.createdAt,
        updated_at: e.updatedAt,
    };
}

function mapForm(f) {
    return {
        id:          f.id,
        form_name:   f.name,
        version:     f.version,
        schema_json: f.schemaJson,
        is_active:   f.isActive,
    };
}

function mapAudit(a) {
    return {
        id:                a.id,
        action:            a.action,
        table_name:        a.tableName,
        record_id:         a.recordId,
        field_name:        a.fieldName,
        old_value:         a.oldValue,
        new_value:         a.newValue,
        reason_for_change: a.reason,
        user_id:           a.userId,
        user_name:         a.userName,
        user_role:         a.userRole,
        ip_address:        a.ipAddress,
        timestamp:         a.createdAt,
    };
}

function mapQuery(q) {
    return {
        id:              q.id,
        subject_id:      q.subjectId,
        subject_code:    q.subjectCode,
        visit_id:        q.visitId,
        visit_name:      q.visitName,
        form_id:         q.formId,
        form_name:       q.formName,
        entry_id:        q.entryId,
        field_key:       q.fieldKey,
        field_label:     q.fieldLabel,
        query_text:      q.queryText,
        status:          q.status,
        raised_by:       q.raisedBy,
        raised_by_name:  q.raisedByName,
        raised_at:       q.raisedAt,
        resolution_text: q.resolutionText,
        resolved_by_name: q.resolvedByName,
        resolved_at:     q.resolvedAt,
        closed_at:       q.closedAt,
    };
}

function mapSite(s) {
    return {
        id:        s.id,
        site_code: s.code,
        site_name: s.name,
        country:   s.country,
        pi_name:   s.piName,
        status:    s.status,
    };
}

// ── API Surface ────────────────────────────────────────────
export const api = {

    // ── Auth ───────────────────────────────────────────────
    getCurrentUser() { return currentUser(); },

    // ── Study context ──────────────────────────────────────
    getCurrentStudy() {
        return readContext('ecrf_study');
    },

    setCurrentStudy(study) {
        writeContext('ecrf_study', study, study ? { title: study.title, protocolNo: study.protocolNo, status: study.status } : null);
    },

    // ── Study Management ───────────────────────────────────
    async getStudies() {
        const studies = await apiFetch('/api/studies');
        return studies.map(mapStudy);
    },

    async getStudy(id) {
        return mapStudy(await apiFetch(`/api/studies/${id}`));
    },

    async createStudy(payload) {
        const result = await apiFetch('/api/studies', { method: 'POST', body: JSON.stringify(payload) });
        return mapStudy(result);
    },

    async updateStudy(id, payload) {
        return apiFetch(`/api/studies/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },

    async getStudyUsers(studyId) {
        return apiFetch(`/api/studies/${studyId}/users`);
    },

    async assignUserToStudy(studyId, userId) {
        return apiFetch(`/api/studies/${studyId}/users`, { method: 'POST', body: JSON.stringify({ userId }) });
    },

    async removeUserFromStudy(studyId, userId) {
        return apiFetch(`/api/studies/${studyId}/users/${userId}`, { method: 'DELETE' });
    },

    async logout() {
        try {
            await request('/api/mfa/logout', { method: 'POST' });
        } catch {
            try { await request('/api/auth/sign-out', { method: 'POST' }); }
            catch {
                window.showToast?.('Sign-out could not be confirmed. Check your connection and try signing out again.', 'error');
                return;
            }
        }
        for (const key of ['ecrf_session', 'ecrf_study_id', 'ecrf_study_meta', 'ecrf_site_context_id', 'ecrf_site_context_meta']) removeStored(key);
        window.location.href = 'login.html';
    },

    // ── Dashboard ──────────────────────────────────────────
    async getDashboardStats() {
        const stats = await apiFetch('/api/dashboard/stats');
        window._openQueryCount = stats.openQueries ?? 0;
        return {
            activeSubjects: stats.activeSubjects,
            totalSubjects:  stats.totalSubjects,
            pendingForms:   stats.pendingForms,
            openQueries:    stats.openQueries,
            totalVisits:    stats.totalVisits,
            recentAudit:    (stats.recentAudit || []).map(mapAudit),
        };
    },

    // ── Subjects ───────────────────────────────────────────
    async getSubjects(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.search) params.set('search', filters.search);
        const rows = await apiFetch(`/api/subjects?${params}`);
        return rows.map(mapSubject);
    },

    async getSubject(id) {
        const row = await apiFetch(`/api/subjects/${id}`);
        const subject = mapSubject(row);
        subject.visits = (row.visits || []).map(mapVisit);
        return subject;
    },

    async getSubjectStatusOverview() {
        return apiFetch('/api/subjects/status-overview');
    },

    async createSubject(payload) {
        // frontend snake_case → backend camelCase
        const body = {
            subjectCode: payload.subject_code,
            initials:    payload.initial,
            sex:            payload.sex ?? null,
            genderIdentity: payload.gender_identity || null,
            dateOfBirth: payload.dob,
            enrolledAt:  payload.enrollment_date,
            siteId:      payload.site_id ? Number(payload.site_id) : null,
        };
        const created = await apiFetch('/api/subjects', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        return mapSubject(created);
    },

    async updateSubjectStatus(id, status, reason) {
        const updated = await apiFetch(`/api/subjects/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, reason }),
        });
        return mapSubject(updated);
    },

    // ── Visits ─────────────────────────────────────────────
    async getVisits(subjectId) {
        const rows = await apiFetch(`/api/subjects/${subjectId}/visits`);
        return rows.map(mapVisit);
    },

    async createVisit(subjectId, payload) {
        // frontend snake_case → backend camelCase
        // frontend 'Complete' → backend 'Completed'
        const status = payload.status === 'Complete' ? 'Completed' : (payload.status ?? 'Scheduled');
        const body = {
            visitName:    payload.visit_name,
            visitOrder:   payload.visit_order,
            visitType:    payload.visit_type,
            plannedDate:  payload.planned_date,
            actualDate:   payload.actual_date,
            windowDays:   payload.window_days,
            status,
            missedReason: payload.missed_reason,
            formIds:      payload.formIds ?? [],
        };
        const created = await apiFetch(`/api/subjects/${subjectId}/visits`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
        return mapVisit(created);
    },

    async updateVisit(visitId, payload) {
        // Need subjectId — read it from the visit (visit has subject_id after mapVisit)
        // We use a PATCH /api/subjects/:subjectId/visits/:id route
        // subjectId comes from window._currentSubject set by subjects.js
        const subjectId = window._subjectId || window._currentSubject?.id;
        const status = payload.status === 'Complete' ? 'Completed' : payload.status;
        const body = {
            visitName:    payload.visit_name,
            visitOrder:   payload.visit_order,
            visitType:    payload.visit_type,
            plannedDate:  payload.planned_date,
            actualDate:   payload.actual_date,
            windowDays:   payload.window_days,
            status,
            missedReason: payload.missed_reason,
            reason:       payload._reason,
        };
        const updated = await apiFetch(`/api/subjects/${subjectId}/visits/${visitId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
        return mapVisit(updated);
    },

    async deleteVisit(visitId, reason) {
        const subjectId = window._subjectId || window._currentSubject?.id;
        await apiFetch(`/api/subjects/${subjectId}/visits/${visitId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        });
    },

    async signVisit(visitId) {
        const subjectId = window._subjectId || window._currentSubject?.id;
        const updated = await apiFetch(`/api/subjects/${subjectId}/visits/${visitId}/sign`, {
            method: 'PATCH',
            body: JSON.stringify({}),
        });
        return mapVisit(updated);
    },

    async unsignVisit(visitId, reason) {
        const subjectId = window._subjectId || window._currentSubject?.id;
        const updated = await apiFetch(`/api/subjects/${subjectId}/visits/${visitId}/unsign`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
        });
        return mapVisit(updated);
    },

    // ── CRF Forms (templates) ──────────────────────────────
    async getCRFForms() {
        const rows = await apiFetch('/api/forms');
        return rows.map(mapForm);
    },

    async getCRFForm(id) {
        const row = await apiFetch(`/api/forms/${id}`);
        return mapForm(row);
    },

    // ── CRF Data Entries ───────────────────────────────────
    async getDataEntries(subjectId, visitId) {
        const params = new URLSearchParams({ subjectId });
        if (visitId) params.set('visitId', visitId);
        const rows = await apiFetch(`/api/entries?${params}`);
        return rows.map(mapEntry);
    },

    async saveDataEntry({ subject_id, visit_id, form_id, data: formData, reason_for_change, status = 'Draft' }) {
        // frontend 'Submitted' → backend doesn't need status (always saves as 'Saved')
        // frontend 'Draft' → backend 'Draft'
        const backendStatus = status === 'Draft' ? 'Draft' : 'Saved';
        const body = {
            subjectId: Number(subject_id),
            visitId:   Number(visit_id),
            formId:    Number(form_id),
            dataJson:  formData,
            reason:    reason_for_change,
            status:    backendStatus,
        };
        const result = await apiFetch('/api/entries', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        return mapEntry(result.entry ?? result);
    },

    async lockDataEntry(id, reason) {
        const result = await apiFetch(`/api/entries/${id}/lock`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
        });
        return mapEntry(result);
    },

    async unlockDataEntry(id, reason) {
        const result = await apiFetch(`/api/entries/${id}/unlock`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
        });
        return mapEntry(result);
    },

    async signDataEntry(entryId, password, meaning) {
        return apiFetch('/api/signatures', {
            method: 'POST',
            body: JSON.stringify({ entryId, password, meaning }),
        });
    },

    async getSignatures(entryId) {
        return apiFetch(`/api/signatures?entryId=${entryId}`);
    },

    async submitIEAssessment(subjectId, criteriaJson, passed) {
        return apiFetch(`/api/subjects/${subjectId}/ie-assessment`, {
            method: 'POST',
            body: JSON.stringify({ criteriaJson, passed }),
        });
    },

    // ── Audit Trail ────────────────────────────────────────
    async getAuditTrail(filters = {}) {
        const params = new URLSearchParams();
        if (filters.action)     params.set('action', filters.action);
        if (filters.table_name) params.set('tableName', filters.table_name);
        if (filters.record_id)  params.set('search', filters.record_id);
        const rows = await apiFetch(`/api/audit?${params}`);
        return rows.map(mapAudit);
    },

    // ── Queries ────────────────────────────────────────────
    async getQueries(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        const rows = await apiFetch(`/api/queries?${params}`);
        const mapped = rows.map(mapQuery);
        window._openQueryCount = mapped.filter(q => q.status === 'Open').length;
        return mapped;
    },

    async raiseQuery({ data_entry_id, subject_id, visit_id, form_id, field_key, field_label, query_text }) {
        const created = await apiFetch('/api/queries', {
            method: 'POST',
            body: JSON.stringify({
                subjectId:  Number(subject_id),
                visitId:    visit_id  ? Number(visit_id)  : null,
                formId:     form_id   ? Number(form_id)   : null,
                entryId:    data_entry_id ? Number(data_entry_id) : null,
                fieldKey:   field_key,
                fieldLabel: field_label,
                queryText:  query_text,
            }),
        });
        return mapQuery(created);
    },

    async resolveQuery(id, resolution_text) {
        const updated = await apiFetch(`/api/queries/${id}/resolve`, {
            method: 'PATCH',
            body: JSON.stringify({ resolutionText: resolution_text }),
        });
        return mapQuery(updated);
    },

    async closeQuery(id) {
        const updated = await apiFetch(`/api/queries/${id}/close`, {
            method: 'PATCH',
            body: JSON.stringify({}),
        });
        return mapQuery(updated);
    },

    // ── Sites ──────────────────────────────────────────────
    async getSites() {
        const rows = await apiFetch('/api/sites');
        return rows.map(mapSite);
    },

    // ── Data Import ────────────────────────────────────────
    async deriveImportForm(payload) {
        return apiFetch('/api/import/derive-form', { method: 'POST', body: JSON.stringify(payload) });
    },
    async importVisit(payload) {
        return apiFetch('/api/import/visit', { method: 'POST', body: JSON.stringify(payload) });
    },
    downloadImportTemplate(formId) {
        return apiDownload(`/api/import/template?formId=${formId}`, `import_template_${formId}.csv`, 'text/csv');
    },

    async createSite(payload) {
        return apiFetch('/api/sites', { method: 'POST', body: JSON.stringify(payload) });
    },

    async updateSite(id, payload) {
        return apiFetch(`/api/sites/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },

    // ── Adverse Events / SAE ───────────────────────────────
    async getAdverseEvents(filters = {}) {
        const params = new URLSearchParams();
        if (filters.subjectId) params.set('subjectId', filters.subjectId);
        if (filters.serious)   params.set('serious', filters.serious);
        if (filters.status)    params.set('status', filters.status);
        return apiFetch(`/api/ae?${params}`);
    },

    async getAEStats() {
        return apiFetch('/api/ae/stats');
    },

    async createAdverseEvent(payload) {
        return apiFetch('/api/ae', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async updateAdverseEvent(id, payload) {
        return apiFetch(`/api/ae/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    async reportAdverseEvent(id, { reportedToSponsor, reportedToIrb }) {
        return apiFetch(`/api/ae/${id}/report`, {
            method: 'PATCH',
            body: JSON.stringify({ reportedToSponsor, reportedToIrb }),
        });
    },

    async closeAdverseEvent(id) {
        return apiFetch(`/api/ae/${id}/close`, { method: 'PATCH', body: JSON.stringify({}) });
    },

    // ── Protocol Deviations ────────────────────────────────
    async getDeviations(filters = {}) {
        const params = new URLSearchParams();
        if (filters.subjectId) params.set('subjectId', filters.subjectId);
        if (filters.status)    params.set('status', filters.status);
        if (filters.type)      params.set('type', filters.type);
        return apiFetch(`/api/deviations?${params}`);
    },

    async getDeviationStats() {
        return apiFetch('/api/deviations/stats');
    },

    async createDeviation(payload) {
        return apiFetch('/api/deviations', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async updateDeviation(id, payload) {
        return apiFetch(`/api/deviations/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    async reportDeviationToIrb(id) {
        return apiFetch(`/api/deviations/${id}/report-irb`, { method: 'PATCH', body: JSON.stringify({}) });
    },

    async advanceDeviationStatus(id, status) {
        return apiFetch(`/api/deviations/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    // ── Informed Consents ──────────────────────────────────
    async getConsents(filters = {}) {
        const params = new URLSearchParams();
        if (filters.subjectId) params.set('subjectId', filters.subjectId);
        return apiFetch(`/api/consents?${params}`);
    },

    async getConsentStats() {
        return apiFetch('/api/consents/stats');
    },

    // Staff delegated for "Informed Consent Process" — drives the Obtained By list
    async getConsentDelegates() {
        return apiFetch('/api/consents/delegates');
    },

    async createConsent(payload) {
        return apiFetch('/api/consents', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async withdrawConsent(id, reason) {
        return apiFetch(`/api/consents/${id}/withdraw`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
        });
    },

    // ── Randomization ──────────────────────────────────────
    async getRandomizationList() {
        return apiFetch('/api/randomization/list');
    },

    async uploadRandomizationList(entries) {
        return apiFetch('/api/randomization/list', {
            method: 'POST',
            body: JSON.stringify({ entries }),
        });
    },

    async getRandomization(filters = {}) {
        const params = new URLSearchParams();
        if (filters.subjectId) params.set('subjectId', filters.subjectId);
        return apiFetch(`/api/randomization?${params}`);
    },

    async getRandomizationStats() {
        return apiFetch('/api/randomization/stats');
    },

    async randomizeSubject(subjectId, stratum) {
        return apiFetch('/api/randomization', {
            method: 'POST',
            body: JSON.stringify({ subjectId, stratum }),
        });
    },

    async unblindSubject(id, reason) {
        return apiFetch(`/api/randomization/${id}/unblind`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
        });
    },

    // ── Export ─────────────────────────────────────────────
    async downloadODM() {
        await apiDownload('/api/export/odm', 'export-odm.xml', 'application/xml');
    },

    async downloadCSV(domain) {
        await apiDownload(`/api/export/csv?domain=${domain}`, `export-${domain}.csv`, 'text/csv');
    },

    // ── Security / Password ────────────────────────────────
    async getPasswordStatus() {
        return apiFetch('/api/security/password-status');
    },

    async changePassword(currentPassword, newPassword) {
        return apiFetch('/api/security/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },

    async getLockedAccounts() {
        return apiFetch('/api/security/locked-accounts');
    },

    async unlockAccount(userId, reason) {
        return apiFetch(`/api/security/unlock/${userId}`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    },

    async forcePasswordReset(userId) {
        return apiFetch(`/api/security/force-password-reset/${userId}`, { method: 'POST' });
    },

    async getSecurityUsers() {
        return apiFetch('/api/security/users');
    },

    async getUserDirectory() {
        return apiFetch('/api/users/directory');
    },

    async deleteUser(userId, reason) {
        return apiFetch(`/api/users/${userId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        });
    },

    async getLoginActivity(email) {
        const params = new URLSearchParams();
        if (email) params.set('email', email);
        return apiFetch(`/api/security/login-activity?${params}`);
    },

    // ── Database Lock ──────────────────────────────────────
    async getDblockStatus() {
        return apiFetch('/api/dblock/status');
    },

    async runDblockChecks() {
        return apiFetch('/api/dblock/check', { method: 'POST' });
    },

    async initiateDblock(notes) {
        return apiFetch('/api/dblock/initiate', {
            method: 'POST',
            body: JSON.stringify({ notes }),
        });
    },

    async signDblockCRA(id, password) {
        return apiFetch(`/api/dblock/${id}/sign-cra`, {
            method: 'POST',
            body: JSON.stringify({ password }),
        });
    },

    async signDblockAdmin(id, password) {
        return apiFetch(`/api/dblock/${id}/sign-admin`, {
            method: 'POST',
            body: JSON.stringify({ password }),
        });
    },

    // ── Delegation Log ─────────────────────────────────────
    async getDelegations(filters = {}) {
        const params = new URLSearchParams();
        if (filters.userId) params.set('userId', filters.userId);
        if (filters.status) params.set('status', filters.status);
        return apiFetch(`/api/delegation?${params}`);
    },

    async createDelegation(payload) {
        return apiFetch('/api/delegation', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async updateDelegation(id, payload) {
        return apiFetch(`/api/delegation/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    async signDelegation(id) {
        return apiFetch(`/api/delegation/${id}/sign`, { method: 'POST' });
    },

    // ── Training Records ───────────────────────────────────
    async getTrainingRecords(filters = {}) {
        const params = new URLSearchParams();
        if (filters.userId) params.set('userId', filters.userId);
        if (filters.trainingType) params.set('trainingType', filters.trainingType);
        return apiFetch(`/api/delegation/training/records?${params}`);
    },

    async createTrainingRecord(payload) {
        return apiFetch('/api/delegation/training/records', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async getExpiringTrainings(days = 30) {
        return apiFetch(`/api/delegation/training/expiring?days=${days}`);
    },

    // ── SAE Expedited Reports (ICH E2A) ────────────────────
    async getSAEReports(filters = {}) {
        const params = new URLSearchParams();
        if (filters.aeId)   params.set('aeId', filters.aeId);
        if (filters.status) params.set('status', filters.status);
        return apiFetch(`/api/saereports?${params}`);
    },

    async getOverdueSAEReports() {
        return apiFetch('/api/saereports/overdue');
    },

    async createSAEReport(payload) {
        return apiFetch('/api/saereports', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async submitSAEReport(id, payload) {
        return apiFetch(`/api/saereports/${id}/submit`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    async signSAEReport(id, payload) {
        return apiFetch(`/api/saereports/${id}/sign`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    // ── Monitoring Visits & SDV (ICH GCP §5.18) ───────────
    async getMonitoringVisits(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.siteId) params.set('siteId', filters.siteId);
        return apiFetch(`/api/monitoring?${params}`);
    },

    async getMonitoringVisit(id) {
        return apiFetch(`/api/monitoring/${id}`);
    },

    async createMonitoringVisit(payload) {
        return apiFetch('/api/monitoring', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async updateMonitoringVisit(id, payload) {
        return apiFetch(`/api/monitoring/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    async submitMonitoringVisit(id) {
        return apiFetch(`/api/monitoring/${id}/submit`, { method: 'POST' });
    },

    async acknowledgeMonitoringVisit(id, piComments) {
        return apiFetch(`/api/monitoring/${id}/acknowledge`, {
            method: 'POST',
            body: JSON.stringify({ piComments }),
        });
    },

    async getSDVRecords(visitId) {
        return apiFetch(`/api/monitoring/${visitId}/sdv`);
    },

    async upsertSDVRecord(visitId, payload) {
        return apiFetch(`/api/monitoring/${visitId}/sdv`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    // ── CRF Form Builder ────────────────────────────────────
    request(path, options = {}) {
        return apiFetch(path, options);
    },

    // ── Visit Schedule Templates ─────────────────────────────
    async getVisitTemplates() { return apiFetch('/api/visit-templates'); },
    async getVisitTemplate(id) { return apiFetch(`/api/visit-templates/${id}`); },
    async createVisitTemplate(payload) {
        return apiFetch('/api/visit-templates', { method: 'POST', body: JSON.stringify(payload) });
    },
    async updateVisitTemplate(id, payload) {
        return apiFetch(`/api/visit-templates/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    },
    async deleteVisitTemplate(id, reason) {
        return apiFetch(`/api/visit-templates/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
    },
    async generateVisitsFromTemplate(templateId, subjectId, payload) {
        return apiFetch(`/api/visit-templates/${templateId}/generate/${subjectId}`, {
            method: 'POST', body: JSON.stringify(payload),
        });
    },

    // ── User Management ─────────────────────────────────────
    async getUsers() { return apiFetch('/api/users'); },
    async getUser(id) { return apiFetch(`/api/users/${id}`); },
    async inviteUser(payload) {
        return apiFetch('/api/users/invite', { method: 'POST', body: JSON.stringify(payload) });
    },
    async changeUserRole(id, role, reason) {
        return apiFetch(`/api/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role, reason }) });
    },
    async changeUserSite(id, siteId, reason) {
        return apiFetch(`/api/users/${id}/site`, { method: 'PATCH', body: JSON.stringify({ siteId, reason }) });
    },
    async deactivateUser(id, reason) {
        return apiFetch(`/api/users/${id}/deactivate`, { method: 'PATCH', body: JSON.stringify({ reason }) });
    },

    // ── Notifications ────────────────────────────────────────
    async getNotifications() { return apiFetch('/api/notifications'); },

    // ── Screening Log (ICH E6(R3) §8.3.20) ──────────────────
    async getScreeningLog()            { return apiFetch('/api/screening'); },
    async getScreeningStats()          { return apiFetch('/api/screening/stats'); },
    async createScreeningRecord(data)  { return apiFetch('/api/screening', { method: 'POST', body: JSON.stringify(data) }); },
    async updateScreeningRecord(id, d) { return apiFetch(`/api/screening/${id}`, { method: 'PATCH', body: JSON.stringify(d) }); },
    async deleteScreeningRecord(id)    { return apiFetch(`/api/screening/${id}`, { method: 'DELETE' }); },

    // ── IP Accountability (ICH E6(R3) §8.3.19) ───────────────
    async getIPRecords(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/api/ip${qs ? '?' + qs : ''}`);
    },
    async getIPSummary()              { return apiFetch('/api/ip/summary'); },
    async createIPRecord(data)        { return apiFetch('/api/ip', { method: 'POST', body: JSON.stringify(data) }); },
    async updateIPRecord(id, data)    { return apiFetch(`/api/ip/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
    async deleteIPRecord(id)          { return apiFetch(`/api/ip/${id}`, { method: 'DELETE' }); },

    // ── Essential Documents (ICH E6(R3) §8) ─────────────────
    async getEssentialDocs(section)   { return apiFetch(`/api/essential-docs${section ? '?section=' + encodeURIComponent(section) : ''}`); },
    async getEssentialDocTypes()      { return apiFetch('/api/essential-docs/types'); },
    async getEssentialDocCompleteness(){ return apiFetch('/api/essential-docs/completeness'); },
    async createEssentialDoc(data)    { return apiFetch('/api/essential-docs', { method: 'POST', body: JSON.stringify(data) }); },
    async updateEssentialDoc(id, d)   { return apiFetch(`/api/essential-docs/${id}`, { method: 'PATCH', body: JSON.stringify(d) }); },
    async deleteEssentialDoc(id)      { return apiFetch(`/api/essential-docs/${id}`, { method: 'DELETE' }); },

    // ── SOP Agreements (ICH E6(R3) C.4.1) ───────────────────
    async getRequiredAgreements()     { return apiFetch('/api/agreements/required'); },
    async getAgreementText(type)      { return apiFetch(`/api/agreements/text/${type}`); },
    async submitAgreement(type)       { return apiFetch('/api/agreements', { method: 'POST', body: JSON.stringify({ agreementType: type }) }); },

    // ── Monitoring Plan / RBMP (ICH E6(R3) §5.18.3) ─────────
    async getMonitoringPlans()        { return apiFetch('/api/monitoring-plan'); },
    async getCurrentMonitoringPlan()  { return apiFetch('/api/monitoring-plan/current'); },
    async createMonitoringPlan(data)  { return apiFetch('/api/monitoring-plan', { method: 'POST', body: JSON.stringify(data) }); },
    async updateMonitoringPlan(id, d) { return apiFetch(`/api/monitoring-plan/${id}`, { method: 'PATCH', body: JSON.stringify(d) }); },
    async approveMonitoringPlan(id)   { return apiFetch(`/api/monitoring-plan/${id}/approve`, { method: 'POST' }); },

    // ── Reports ──────────────────────────────────────────────
    async getMissingDataReport(groupBy = 'site') { return apiFetch(`/api/reports/missing-data?groupBy=${groupBy}`); },
    async getDataQualityReport()      { return apiFetch('/api/reports/data-quality'); },
    async getAuditIntegrityReport()   { return apiFetch('/api/reports/audit-integrity'); },
    async getVisitComplianceReport()  { return apiFetch('/api/reports/visit-compliance'); },
    async getQueryAgingReport()       { return apiFetch('/api/reports/query-aging'); },
    async getDataTimeliness()         { return apiFetch('/api/reports/data-timeliness'); },
    async getCriticalDataReport()     { return apiFetch('/api/reports/critical-data'); },
    async getDispositionReport()      { return apiFetch('/api/reports/disposition'); },

    // ── SDV Summary & Monitoring Report ─────────────────────
    async getSDVSummary()             { return apiFetch('/api/monitoring/sdv-summary'); },
    async getMonitoringReport(id)     { return apiFetch(`/api/monitoring/${id}/report`); },

    // ── QTL Breach CAPA ──────────────────────────────────────
    async getQTLBreaches()            { return apiFetch('/api/qtl/breaches'); },
    async createQTLBreach(data)       { return apiFetch('/api/qtl/breaches', { method: 'POST', body: JSON.stringify(data) }); },
    async updateQTLBreach(id, data)   { return apiFetch(`/api/qtl/breaches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },

    // ── Periodic User Access Review (ICH E6(R3) C.4.2) ───────
    async getAccessReviews()          { return apiFetch('/api/access-review'); },
    async createAccessReview(data)    { return apiFetch('/api/access-review', { method: 'POST', body: JSON.stringify(data) }); },
    async certifyUserAccess(reviewId, userId, certified, certNotes) {
        return apiFetch(`/api/access-review/${reviewId}/certify`, { method: 'PATCH', body: JSON.stringify({ userId, certified, certNotes }) });
    },
    async completeAccessReview(id)    { return apiFetch(`/api/access-review/${id}/complete`, { method: 'POST' }); },

    // ── Amendment Re-consent Status ──────────────────────────
    async getAmendmentReconsentStatus(id) { return apiFetch(`/api/amendments/${id}/reconsent-status`); },

    // ── SaaS Platform (platform_owner only) ───────────────────
    async getPlatformOverview()          { return apiFetch('/api/organizations/overview'); },
    async getOrganizations()             { return apiFetch('/api/organizations'); },
    async getOrganization(id)            { return apiFetch(`/api/organizations/${id}`); },
    async getOrgUsage(id)                { return apiFetch(`/api/organizations/${id}/usage`); },
    async provisionOrganization(payload) {
        return apiFetch('/api/organizations', { method: 'POST', body: JSON.stringify(payload) });
    },
    async updateOrganization(id, payload) {
        return apiFetch(`/api/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },
    async exportOrganization(id, slug) {
        return apiDownload(`/api/organizations/${id}/export`, `tenant-${slug}-export.json`, 'application/json');
    },
    async getBillingConfig()             { return apiFetch('/api/billing/config'); },
    async startCheckout(orgId, plan) {
        return apiFetch('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ orgId, plan }) });
    },

    // ── Subject-level Data Lock ───────────────────────────────
    async getSubjectLockStatus(subjectId) { return apiFetch(`/api/subjects/${subjectId}/lock-status`); },
    async lockSubject(subjectId, reason, visitId = null) {
        return apiFetch(`/api/subjects/${subjectId}/lock`, {
            method: 'POST',
            body: JSON.stringify({ reason, ...(visitId != null ? { visitId } : {}) }),
        });
    },
    async unlockSubject(subjectId, reason, visitId = null) {
        return apiFetch(`/api/subjects/${subjectId}/unlock`, {
            method: 'POST',
            body: JSON.stringify({ reason, ...(visitId != null ? { visitId } : {}) }),
        });
    },
};

window.api = api;
```

## src/frontend/js/modules/auth-http.js

```javascript
import { request, ApiError } from './http.js';

export async function authRequest(path, options) {
    try { return await request(path, options); }
    catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            error.message = path.endsWith('/totp-verify')
                ? 'The code or sign-in session could not be verified. Check the code, or start sign-in again.'
                : 'Sign-in could not be verified. Check your email and password and try again.';
        }
        throw error;
    }
}
```

## src/frontend/js/modules/consents.js

```javascript
import { showLoadError } from './load-error.js';
// ============================================================
// Informed Consent View — UU PDP No. 27/2022 + ICH GCP §4.8
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';
import { getSiteContext } from './study-select.js';

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

const TYPE_STYLE = {
    'Initial':    'background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7',
    'Re-consent': 'background:#DBEAFE;color:#1D4ED8;border:1px solid #93C5FD',
    'Withdrawal': 'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA',
};

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDT(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function typeBadge(t) {
    const style = TYPE_STYLE[t] || 'background:#F1F5F9;color:#475569;border:1px solid #CBD5E1';
    return `<span class="badge" style="${style}">${esc(t)}</span>`;
}

export async function renderConsents(filters = {}) {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const user = api.getCurrentUser();
    let consents, stats;
    try {
        [consents, stats] = await Promise.all([
            api.getConsents(filters),
            api.getConsentStats(),
        ]);
    } catch (err) {
        content.innerHTML = `<div class="p-6"><div class="ph-card p-5 border-red-200"><p class="text-sm text-red-700">${esc(err.message)}</p></div></div>`;
        return;
    }

    const canCreate = ['investigator', 'pi', 'admin', 'crc'].includes(user.role);
    const withdrawn = consents.filter(c => c.isWithdrawn).length;

    content.innerHTML = `
    <div class="p-5 space-y-4">

        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Informed Consent Records</h2>
                <p class="text-xs text-slate-500 mt-0.5">UU PDP No. 27/2022 Pasal 20-26 — ICH GCP §4.8 consent documentation</p>
            </div>
            ${canCreate ? `
            <button onclick="openConsentForm()"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Record Consent
            </button>` : ''}
        </div>

        <!-- UU PDP Alert -->
        <div class="flex items-start gap-3 p-4 rounded-md border" style="background:#EFF6FF;border-color:#BFDBFE">
            <i data-lucide="shield" class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:#1D4ED8"></i>
            <div class="text-xs" style="color:#1D4ED8">
                <p class="font-semibold mb-0.5">UU Perlindungan Data Pribadi — Data Pribadi Bersifat Spesifik (Pasal 4 ayat 2)</p>
                <p>Health and clinical trial data requires explicit written consent. All consent records are permanently logged in the audit trail. Withdrawal of consent must be recorded and honored immediately.</p>
            </div>
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-3 gap-4">
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Active Subjects Consented</p>
                <p class="kpi-number text-emerald-600">${stats.consented}</p>
                <p class="text-xs text-slate-400 mt-1">of ${stats.totalActive} active</p>
            </div>
            <div class="ph-card p-4 ${stats.unconsented > 0 ? 'border-red-300' : ''}">
                <p class="text-xs font-semibold ${stats.unconsented > 0 ? 'text-red-600' : 'text-slate-500'} uppercase tracking-wide mb-2">Without Consent</p>
                <p class="kpi-number ${stats.unconsented > 0 ? 'text-red-700' : 'text-slate-400'}">${stats.unconsented}</p>
                <p class="text-xs ${stats.unconsented > 0 ? 'text-red-500' : 'text-slate-400'} mt-1">Active subjects missing consent</p>
            </div>
            <div class="ph-card p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Withdrawn</p>
                <p class="kpi-number text-slate-500">${withdrawn}</p>
                <p class="text-xs text-slate-400 mt-1">Consent withdrawn records</p>
            </div>
        </div>

        <!-- Filters -->
        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <select id="ic-type-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Types</option>
                    <option>Initial</option>
                    <option>Re-consent</option>
                    <option>Withdrawal</option>
                </select>
                <select id="ic-lang-filter" class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Languages</option>
                    <option>Indonesian</option>
                    <option>English</option>
                </select>
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="ic-search" placeholder="Search by subject or consent version…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>
        </div>

        <!-- Table -->
        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">#</th>
                            <th class="text-left">Subject</th>
                            <th class="text-left">Type</th>
                            <th class="text-left">Version</th>
                            <th class="text-left">Date / Time Signed</th>
                            <th class="text-left">Obtained By</th>
                            <th class="text-left">Language / Witness</th>
                            <th class="text-left">GCP Checks</th>
                            <th class="text-left">Withdrawn</th>
                            <th class="text-left">Recorded By</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="ic-tbody" class="ph-table-body">
                        ${renderConsentRows(consents, user)}
                    </tbody>
                </table>
            </div>
            <div id="ic-empty" class="${consents.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="file-check" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p>No consent records found.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    function filterIC() {
        const type   = document.getElementById('ic-type-filter').value;
        const lang   = document.getElementById('ic-lang-filter').value;
        const search = document.getElementById('ic-search').value.toLowerCase();
        let filtered = consents;
        if (type)   filtered = filtered.filter(c => c.consentType === type);
        if (lang)   filtered = filtered.filter(c => c.language === lang);
        if (search) filtered = filtered.filter(c =>
            c.subjectCode?.toLowerCase().includes(search) ||
            c.consentVersion?.toLowerCase().includes(search)
        );
        document.getElementById('ic-tbody').innerHTML = renderConsentRows(filtered, user);
        document.getElementById('ic-empty').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('ic-type-filter').addEventListener('change', filterIC);
    document.getElementById('ic-lang-filter').addEventListener('change', filterIC);
    document.getElementById('ic-search').addEventListener('input', filterIC);
}

// Compact status of the documentation items an auditor checks first.
function gcpChecks(c) {
    const parts = [];
    parts.push(c.copyProvided
        ? `<span class="text-emerald-600" title="Signed ICF copy provided to subject (§4.8.11)">✓ Copy given</span>`
        : `<span class="text-amber-600" title="ICH GCP §4.8.11 — subject must receive a signed copy">⚠ No copy</span>`);
    if (c.assentObtained) {
        parts.push(`<span class="text-slate-500" title="Assent obtained (§4.8.12)">✓ Assent${c.assentDate ? ' ' + fmtDate(c.assentDate) : ''}</span>`);
    }
    return parts.map(p => `<p>${p}</p>`).join('');
}

function renderConsentRows(consents, user) {
    if (!consents.length) return '';
    return consents.map(c => {
        const canWithdraw = ['investigator','pi','admin'].includes(user.role) && !c.isWithdrawn && c.consentType !== 'Withdrawal';

        return `<tr class="${c.isWithdrawn ? 'opacity-60' : ''}">
            <td class="text-xs text-slate-400 font-mono">#${c.id}</td>
            <td>
                <p class="text-xs font-semibold font-mono text-slate-800">${esc(c.subjectCode)}</p>
            </td>
            <td>${typeBadge(c.consentType)}</td>
            <td>
                <code class="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">${esc(c.consentVersion)}</code>
            </td>
            <td class="text-xs text-slate-700 whitespace-nowrap">
                ${fmtDate(c.consentDate)}
                ${c.consentTime
                    ? `<span class="text-slate-500">· ${esc(c.consentTime)}</span>`
                    : `<span class="text-amber-500" title="No time recorded — cannot evidence consent preceded a same-day procedure">· --:--</span>`}
            </td>
            <td>
                ${c.obtainedByName
                    ? `<p class="text-xs text-slate-700">${esc(c.obtainedByName)}</p>`
                    : `<p class="text-xs text-amber-600 flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3 h-3"></i> Not recorded</p>`}
            </td>
            <td>
                <p class="text-xs text-slate-600">${esc(c.language)}</p>
                ${c.witnessName ? `<p class="text-xs text-slate-400">Witness: ${esc(c.witnessName)}</p>` : ''}
                ${c.witnessType ? `<p class="text-xs text-slate-400">${esc(c.witnessType)}</p>` : ''}
            </td>
            <td class="text-xs whitespace-nowrap">${gcpChecks(c)}</td>
            <td class="text-xs whitespace-nowrap">
                ${c.isWithdrawn
                    ? `<span class="badge" style="background:#FEE2E2;color:#991B1B;border:1px solid #FECACA">Withdrawn</span>
                       <p class="text-xs text-slate-400 mt-0.5">${fmtDate(c.withdrawnAt)}</p>`
                    : `<span class="text-emerald-600 text-xs font-medium">Active</span>`}
            </td>
            <td>
                <p class="text-xs text-slate-600">${esc(c.createdByName)}</p>
                <p class="text-xs text-slate-400">${fmtDT(c.createdAt)}</p>
            </td>
            <td class="text-right">
                ${canWithdraw ? `
                <button onclick="openWithdrawModal(${c.id})"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition border border-red-200">
                    <i data-lucide="x" class="w-3 h-3"></i> Withdraw
                </button>` : ''}
            </td>
        </tr>`;
    }).join('');
}

window.openConsentForm = async function(prefillSubjectId = null) {
    // Show modal immediately with loading state
    showModal({
        title: 'Record Informed Consent',
        size: 'md',
        body: `<div id="ic-form-body" class="py-10 text-center text-slate-400 text-sm">Loading subjects…</div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button id="ic-submit" disabled onclick="submitConsentForm()" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="file-check" class="w-4 h-4"></i> Record Consent
        </button>`,
    });

    const siteCtx = getSiteContext();
    let allSubjects = [], amendments = [], delegateInfo = { delegates: [], delegationLogEmpty: true };
    try {
        [allSubjects, amendments, delegateInfo] = await Promise.all([
            api.getSubjects({ status: 'Active' }),
            api.request('/api/amendments'),
            api.getConsentDelegates(),
        ]);
    } catch {
        const body = document.getElementById('ic-form-body');
        if (body) showLoadError(body, 'Consent information could not be loaded. Delegation and amendment status must be available before recording consent.', () => window.openConsentForm(prefillSubjectId));
        return;
    }
    const submitButton = document.getElementById('ic-submit');
    if (submitButton) submitButton.disabled = false;

    // Filter to active site; fall back to all study subjects if site_id not set on enrolled subjects
    const siteFiltered = (siteCtx && siteCtx.id)
        ? allSubjects.filter(s => s.site_id === siteCtx.id)
        : allSubjects;
    const displaySubjects = siteFiltered.length > 0 ? siteFiltered : allSubjects;
    const isFallback = siteFiltered.length === 0 && allSubjects.length > 0;

    const siteBanner = siteCtx ? `
        <div class="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium"
             style="background:#F0FDF4;border:1px solid #BBF7D0;color:#166534;">
            <i data-lucide="building-2" class="w-3.5 h-3.5 flex-shrink-0"></i>
            Aktif di site: <strong>${esc(siteCtx.siteCode)}${siteCtx.siteName ? ' — ' + esc(siteCtx.siteName) : ''}</strong>
            &nbsp;·&nbsp; ${displaySubjects.length} subjek aktif${isFallback ? ' (semua study)' : ''}
        </div>` : '';

    const subjectOptions = displaySubjects.length
        ? displaySubjects.map(s =>
            `<option value="${s.id}" ${prefillSubjectId === s.id ? 'selected' : ''}>${esc(s.subject_code)}</option>`
          ).join('')
        : `<option value="" disabled>— Tidak ada subjek aktif —</option>`;

    // ICH GCP E6(R3) §4.1.5 — only delegated staff may take consent. When the
    // Delegation Log has no entries yet the field falls back to free text so a
    // study starting up is not dead-ended.
    const me = api.getCurrentUser();
    const delegates = delegateInfo.delegates ?? [];
    const scopedDelegates = (siteCtx && siteCtx.id)
        ? delegates.filter(d => !d.siteId || d.siteId === siteCtx.id)
        : delegates;
    const usableDelegates = scopedDelegates.length ? scopedDelegates : delegates;

    const obtainedByField = usableDelegates.length
        ? `<select id="ic-obtained-by" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
               <option value="">— Pilih petugas —</option>
               ${usableDelegates.map(d =>
                   `<option value="${esc(d.userId)}" data-name="${esc(d.userName)}" ${d.userId === me?.id ? 'selected' : ''}>${esc(d.userName)} — ${esc(d.userRole)}</option>`
               ).join('')}
           </select>
           <p class="text-xs text-slate-400 mt-1">Hanya staf dengan tugas "Informed Consent Process" di Delegation Log.</p>`
        : `<input type="text" id="ic-obtained-by-name" value="${esc(me?.name ?? '')}" placeholder="Nama investigator/petugas"
                class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
           <p class="text-xs text-amber-600 mt-1 flex items-start gap-1">
               <i data-lucide="alert-triangle" class="w-3 h-3 flex-shrink-0 mt-0.5"></i>
               ${delegateInfo.delegationLogEmpty
                   ? 'Delegation Log masih kosong — isi manual, tapi lengkapi Delegation Log agar tervalidasi (ICH GCP §4.1.5).'
                   : 'Belum ada staf ter-delegasi untuk "Informed Consent Process" — perbarui Delegation Log.'}
           </p>`;

    const slot = document.getElementById('ic-form-body');
    if (!slot) return;
    slot.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#EFF6FF;border-color:#BFDBFE;color:#1D4ED8">
                <i data-lucide="shield" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                UU PDP Pasal 22: informed consent must be documented before any personal health data is collected or processed.
            </div>

            ${siteBanner}

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Subject <span class="text-red-500">*</span></label>
                    <select id="ic-subject" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Pilih Subjek —</option>
                        ${subjectOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Consent Type <span class="text-red-500">*</span></label>
                    <select id="ic-type" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option>Initial</option>
                        <option>Re-consent</option>
                        <option>Withdrawal</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">ICF Version <span class="text-red-500">*</span></label>
                <select id="ic-version-select" onchange="icfVersionChanged()"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">— Pilih versi ICF —</option>
                    <option value="v1.0 — Initial ICF (Pre-Amendment)" data-amendment-id="">v1.0 — Initial ICF (sebelum amendment)</option>
                    ${amendments
                        .filter(a => a.status === 'Approved' || a.status === 'Implemented')
                        .map(a => {
                            const effDate = a.effectiveDate
                                ? new Date(a.effectiveDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
                                : '—';
                            const irb = a.irbRefNo ? ` | IRB: ${a.irbRefNo}` : '';
                            const label = `${a.amendmentNo} — Berlaku ${effDate}${irb}`;
                            return `<option value="${esc(label)}" data-amendment-id="${a.id}">${esc(label)}</option>`;
                        }).join('')}
                    <option value="__custom__" data-amendment-id="">Kustom / Lainnya…</option>
                </select>
                <div id="ic-version-custom-wrap" class="hidden mt-1.5">
                    <input type="text" id="ic-version-custom" placeholder="Tulis versi ICF secara manual…"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                ${amendments.filter(a => a.status === 'Approved' || a.status === 'Implemented').length === 0
                    ? `<p class="text-xs text-amber-600 mt-1 flex items-center gap-1">
                           <i data-lucide="info" class="w-3 h-3"></i>
                           Belum ada amendment Approved/Implemented — pilih "Initial ICF" atau "Kustom".
                       </p>`
                    : ''}
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Date Signed <span class="text-red-500">*</span></label>
                    <input type="date" id="ic-date" max="${new Date().toISOString().split('T')[0]}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Time Signed</label>
                    <input type="time" id="ic-time"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    <p class="text-xs text-slate-400 mt-1">Wajib bila screening dilakukan di hari yang sama — tanggal saja tidak membuktikan urutannya.</p>
                </div>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Obtained By <span class="text-red-500">*</span></label>
                ${obtainedByField}
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Language</label>
                    <select id="ic-language" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option>Indonesian</option>
                        <option>English</option>
                        <option>Other</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Witness Name</label>
                    <input type="text" id="ic-witness" placeholder="Name of consent witness"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>

            <div id="ic-witness-type-wrap" class="hidden">
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Witness Capacity <span class="text-red-500">*</span></label>
                <select id="ic-witness-type" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">— Pilih kapasitas saksi —</option>
                    <option>Impartial Witness (Illiterate Subject)</option>
                    <option>Legally Authorized Representative</option>
                    <option>Parent / Guardian</option>
                </select>
                <p class="text-xs text-slate-400 mt-1">Konsekuensi regulatori tiap kapasitas berbeda (ICH GCP §4.8.9 / §4.8.12).</p>
            </div>

            <div class="space-y-2.5 p-3 rounded-md border border-slate-200 bg-slate-50">
                <label class="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" id="ic-copy-provided" class="mt-0.5 w-4 h-4 rounded border-slate-300">
                    <span class="text-xs text-slate-700">
                        <span class="font-semibold">Salinan ICF bertanda tangan diberikan ke subjek</span>
                        <span class="block text-slate-400">ICH GCP §4.8.11 — wajib, dan rutin diperiksa saat audit.</span>
                    </span>
                </label>
                <label class="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" id="ic-assent" onchange="icAssentChanged()" class="mt-0.5 w-4 h-4 rounded border-slate-300">
                    <span class="text-xs text-slate-700">
                        <span class="font-semibold">Assent diperoleh (subjek anak / tidak dapat memberi consent penuh)</span>
                        <span class="block text-slate-400">ICH GCP §4.8.12 — assent tidak menggantikan consent wali.</span>
                    </span>
                </label>
                <div id="ic-assent-date-wrap" class="hidden pl-6">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Assent Date</label>
                    <input type="date" id="ic-assent-date" max="${new Date().toISOString().split('T')[0]}"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Notes</label>
                <textarea id="ic-notes" rows="2" placeholder="Any relevant notes about consent process…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`;

    // Witness capacity only matters once a witness is named
    document.getElementById('ic-witness')?.addEventListener('input', (e) => {
        document.getElementById('ic-witness-type-wrap')
            ?.classList.toggle('hidden', !e.target.value.trim());
    });

    if (window.lucide) lucide.createIcons();
};

window.icAssentChanged = function() {
    const on = document.getElementById('ic-assent')?.checked;
    document.getElementById('ic-assent-date-wrap')?.classList.toggle('hidden', !on);
};

window.icfVersionChanged = function() {
    const sel = document.getElementById('ic-version-select');
    const wrap = document.getElementById('ic-version-custom-wrap');
    if (!sel || !wrap) return;
    wrap.classList.toggle('hidden', sel.value !== '__custom__');
    if (sel.value === '__custom__') {
        document.getElementById('ic-version-custom')?.focus();
    }
};

window.submitConsentForm = async function() {
    if (document.getElementById('ic-submit')?.disabled) return;
    const subjectId = parseInt(document.getElementById('ic-subject').value);
    const date      = document.getElementById('ic-date').value;

    const sel = document.getElementById('ic-version-select');
    const isCustom = sel?.value === '__custom__';
    const version = isCustom
        ? (document.getElementById('ic-version-custom')?.value.trim() ?? '')
        : (sel?.value ?? '');
    const amendmentId = (!isCustom && sel)
        ? (parseInt(sel.options[sel.selectedIndex]?.dataset.amendmentId) || null)
        : null;

    if (!subjectId || !version || !date) {
        showToast('Subject, ICF version, and date are required.', 'error'); return;
    }

    // Obtained By comes from the delegate dropdown, or free text when the
    // Delegation Log has no eligible staff yet.
    const obtainedSel = document.getElementById('ic-obtained-by');
    const obtainedBy  = obtainedSel?.value || null;
    const obtainedByName = obtainedSel
        ? (obtainedSel.options[obtainedSel.selectedIndex]?.dataset.name ?? null)
        : (document.getElementById('ic-obtained-by-name')?.value.trim() || null);

    const consentType = document.getElementById('ic-type').value;
    if (consentType !== 'Withdrawal' && !obtainedByName) {
        showToast('Record who conducted the consent discussion (ICH GCP §4.8).', 'error'); return;
    }

    const witnessName = document.getElementById('ic-witness').value.trim() || null;
    const witnessType = document.getElementById('ic-witness-type')?.value || null;
    if (witnessName && !witnessType) {
        showToast('Select the witness capacity — impartial witness, LAR, or parent/guardian.', 'error'); return;
    }

    const assentObtained = !!document.getElementById('ic-assent')?.checked;

    try {
        const res = await api.createConsent({
            subjectId,
            consentVersion: version,
            consentDate:    date,
            consentTime:    document.getElementById('ic-time')?.value || null,
            consentType,
            language:       document.getElementById('ic-language').value,
            obtainedBy,
            obtainedByName,
            witnessName,
            witnessType,
            assentObtained,
            assentDate:     assentObtained ? (document.getElementById('ic-assent-date')?.value || null) : null,
            copyProvided:   !!document.getElementById('ic-copy-provided')?.checked,
            notes:          document.getElementById('ic-notes').value.trim()   || null,
            amendmentId,
        });
        closeModal();
        showToast('Informed consent recorded.', 'success');
        (res?.warnings ?? []).forEach(w => showToast(w, 'warning'));
        if (res?.autoDeviation) {
            showToast('Protocol deviation auto-filed: consent dated after the first study procedure (GCP §4.8.8).', 'warning');
        }
        await renderConsents();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.openWithdrawModal = function(consentId) {
    showModal({
        title: 'Record Consent Withdrawal',
        size: 'md',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B">
                <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                UU PDP Pasal 26: Subject has the right to withdraw consent at any time. Upon withdrawal, further data processing must cease immediately.
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Reason for Withdrawal <span class="text-red-500">*</span></label>
                <textarea id="ic-withdraw-reason" rows="3" placeholder="Document the subject's stated reason for withdrawing consent…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitWithdrawal(${consentId})" class="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="x" class="w-4 h-4"></i> Record Withdrawal
        </button>`,
    });
};

window.submitWithdrawal = async function(consentId) {
    const reason = document.getElementById('ic-withdraw-reason').value.trim();
    if (!reason) { showToast('Withdrawal reason is required.', 'error'); return; }
    try {
        await api.withdrawConsent(consentId, reason);
        closeModal();
        showToast('Consent withdrawal recorded.', 'success');
        await renderConsents();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Inline section: render consent tab within subject detail
export async function renderSubjectConsentSection(subjectId, container) {
    container.innerHTML = SPINNER;
    try {
        const consents = await api.getConsents({ subjectId });
        const user = api.getCurrentUser();
        const canCreate = ['investigator','pi','admin','crc'].includes(user.role);

        container.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <p class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Consent Records</p>
                ${canCreate ? `<button onclick="openConsentForm(${subjectId})" class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition border border-blue-200">
                    <i data-lucide="plus" class="w-3 h-3"></i> Add
                </button>` : ''}
            </div>
            ${consents.length === 0
                ? `<p class="text-xs text-red-600 font-medium flex items-center gap-1.5">
                    <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>
                    No informed consent on record — UU PDP compliance risk
                   </p>`
                : consents.map(c => `
                <div class="flex items-start justify-between gap-3 p-3 border border-slate-200 rounded-md ${c.isWithdrawn ? 'opacity-60 bg-red-50' : 'bg-white'}">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            ${typeBadge(c.consentType)}
                            <code class="text-xs text-slate-500">${esc(c.consentVersion)}</code>
                        </div>
                        <p class="text-xs text-slate-600">${esc(c.language)} · Signed ${esc(c.consentDate)}${c.consentTime ? ' ' + esc(c.consentTime) : ''}</p>
                        ${c.obtainedByName
                            ? `<p class="text-xs text-slate-400">Obtained by: ${esc(c.obtainedByName)}</p>`
                            : `<p class="text-xs text-amber-600">Consent taker not recorded (GCP §4.8)</p>`}
                        ${c.witnessName ? `<p class="text-xs text-slate-400">Witness: ${esc(c.witnessName)}${c.witnessType ? ' — ' + esc(c.witnessType) : ''}</p>` : ''}
                        ${!c.copyProvided ? `<p class="text-xs text-amber-600">Signed ICF copy not given to subject (GCP §4.8.11)</p>` : ''}
                        ${c.isWithdrawn ? `<p class="text-xs text-red-600 font-medium">Withdrawn ${fmtDate(c.withdrawnAt)}: ${esc(c.withdrawnReason)}</p>` : ''}
                    </div>
                    ${!c.isWithdrawn && canCreate
                        ? `<button onclick="openWithdrawModal(${c.id})" class="flex-shrink-0 p-1 text-red-400 hover:text-red-700 rounded" title="Record withdrawal">
                            <i data-lucide="x-circle" class="w-3.5 h-3.5"></i>
                           </button>`
                        : ''}
                </div>`).join('')}
        </div>`;
        lucide.createIcons();
    } catch (err) {
        container.innerHTML = `<p class="text-xs text-red-600">${esc(err.message)}</p>`;
    }
}
```

## src/frontend/js/modules/dashboard.js

```javascript
// ============================================================
// Dashboard View — Pharma-grade overview
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';

// Self-service password change (ICH GCP E6(R3) C.4.3 / 21 CFR Part 11)
window.openChangePasswordModal = function() {
    showModal({
        title: 'Change Password',
        size: 'sm',
        body: `
        <div class="space-y-3">
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Current Password</label>
                <input id="cp-current" type="password" autocomplete="current-password"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">New Password</label>
                <input id="cp-new" type="password" autocomplete="new-password"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                <p class="text-xs text-slate-400 mt-1">Min. 12 characters with uppercase, lowercase, number, and symbol. Cannot reuse recent passwords.</p>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Confirm New Password</label>
                <input id="cp-confirm" type="password" autocomplete="new-password"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
            </div>
            <div id="cp-errors" class="text-xs text-red-600 space-y-0.5"></div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitPasswordChange()" class="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md transition">Change Password</button>`,
    });
};

window.submitPasswordChange = async function() {
    const current = document.getElementById('cp-current')?.value ?? '';
    const next    = document.getElementById('cp-new')?.value ?? '';
    const confirm = document.getElementById('cp-confirm')?.value ?? '';
    const errBox  = document.getElementById('cp-errors');
    errBox.innerHTML = '';
    if (!current || !next) { errBox.textContent = 'All fields are required.'; return; }
    if (next !== confirm)  { errBox.textContent = 'New passwords do not match.'; return; }
    try {
        await api.changePassword(current, next);
        closeModal();
        showToast('Password changed successfully.', 'success');
    } catch (err) {
        const details = err.details || err.data?.details;
        errBox.innerHTML = Array.isArray(details) && details.length
            ? details.map(d => `<p>• ${String(d).replace(/</g, '&lt;')}</p>`).join('')
            : `<p>${String(err.message || 'Password change failed.').replace(/</g, '&lt;')}</p>`;
    }
};

function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

const ACTION_BADGE = {
    INSERT: 'badge badge-insert',
    UPDATE: 'badge badge-update',
    DELETE: 'badge badge-delete',
    LOCK:   'badge badge-lock',
    UNLOCK: 'badge badge-unlock',
};

export async function renderDashboard() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="flex items-center justify-center h-32">
        <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
    </div>`;

    let stats, aeStats, devStats, consentStats, dblockStatus, pwStatus;
    try {
        [stats, aeStats, devStats, consentStats, dblockStatus, pwStatus] = await Promise.all([
            api.getDashboardStats(), api.getAEStats(), api.getDeviationStats(),
            api.getConsentStats(), api.getDblockStatus(), api.getPasswordStatus(),
        ]);
    } catch {
        content.innerHTML = '<div role="alert" class="p-6 text-red-700">Dashboard information could not be loaded. Counts and lock status are unavailable. Check your connection and reload the page.</div>';
        return;
    }
    const user  = api.getCurrentUser();
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Build alerts HTML
    const dblLockBanner = dblockStatus?.isLocked ? `
        <div style="background:#dc2626;color:#fff;border-radius:10px;padding:0.9rem 1.25rem;
                    display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
            <span style="font-size:1.4rem;flex-shrink:0;">🔒</span>
            <div style="flex:1;">
                <strong>Study Database is Locked</strong> — No further data modifications are permitted.
                <span style="font-size:0.85rem;opacity:0.9;margin-left:0.5rem;">
                    Locked ${dblockStatus.current?.lockedAt ? new Date(dblockStatus.current.lockedAt).toLocaleString() : ''}
                </span>
            </div>
            <a href="#dblock" style="color:#fff;font-size:0.85rem;text-decoration:underline;white-space:nowrap;">View details</a>
        </div>` : '';

    const pwWarning = (pwStatus?.expired || pwStatus?.mustChange) ? `
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:0.85rem 1.25rem;
                    display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
            <span style="font-size:1.25rem;flex-shrink:0;">🔑</span>
            <div style="flex:1;font-size:0.9rem;">
                ${pwStatus.mustChange ? '<strong>Password reset required.</strong> Your account requires a password change before continuing.' : `<strong>Password ${pwStatus.expired ? 'expired' : 'expiring soon'}.</strong> ${pwStatus.expired ? 'Your password has expired.' : `${pwStatus.daysLeft} days remaining.`}`}
            </div>
            <button onclick="openChangePasswordModal()" style="background:#d97706;color:#fff;border:none;border-radius:6px;padding:0.4rem 1rem;cursor:pointer;font-size:0.85rem;white-space:nowrap;">
                Change Password
            </button>
        </div>` : (pwStatus?.warningSoon ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:0.75rem 1.25rem;
                    display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;font-size:0.88rem;">
            <span>⚠️</span>
            <span>Password expires in <strong>${pwStatus.daysLeft} days</strong> (ICH GCP E6(R3) C.4.3 — 90-day policy).</span>
            <a href="javascript:openChangePasswordModal()" style="margin-left:auto;color:#92400e;text-decoration:underline;white-space:nowrap;font-size:0.85rem;">Change now</a>
        </div>` : '');

    content.innerHTML = `
    <div class="p-5 space-y-5">

        ${dblLockBanner || pwWarning ? `<div class="space-y-2">${dblLockBanner}${pwWarning}</div>` : ''}

        <!-- Page Header -->
        <div class="flex items-end justify-between">
            <div>
                <p class="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">${today}</p>
                <h2 class="text-xl font-bold text-slate-900">Welcome, ${user.name.split(' ')[0]}</h2>
            </div>
            <span class="badge ${roleClass(user.role)} text-xs px-3 py-1">${roleLabel(user.role)}</span>
        </div>

        <!-- KPI Cards — Row 1: core metrics -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            ${kpiCard('Active Subjects',  stats.activeSubjects,  `${stats.totalSubjects} total enrolled`,  'users',          '#1554A0', '#EBF2FD')}
            ${kpiCard('Pending Forms',    stats.pendingForms,    'awaiting submission',                    'file-edit',      '#B45309', '#FEF3C7')}
            ${kpiCard('Open Queries',     stats.openQueries,     'requiring resolution',                   'message-square', '#991B1B', '#FEE2E2')}
            ${kpiCard('Total Visits',     stats.totalVisits,     'visits conducted',                       'calendar-check', '#065F46', '#D1FAE5')}
        </div>
        <!-- KPI Cards — Row 2: safety & compliance -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            ${kpiCardLink('Adverse Events', aeStats.total,
                aeStats.serious > 0 ? `${aeStats.serious} SAE · ${aeStats.overdue > 0 ? aeStats.overdue + ' OVERDUE' : 'no overdue'}` : 'no serious events',
                'activity', aeStats.overdue > 0 ? '#991B1B' : '#6D28D9', aeStats.overdue > 0 ? '#FEE2E2' : '#EDE9FE', 'ae')}
            ${kpiCardLink('Protocol Deviations', devStats.total,
                devStats.open > 0 ? `${devStats.open} open · ${devStats.major} major` : 'none open',
                'alert-triangle', devStats.open > 0 ? '#92400E' : '#374151', devStats.open > 0 ? '#FEF3C7' : '#F1F5F9', 'deviations')}
            ${kpiCardLink('Consent Coverage', consentStats.consented,
                consentStats.unconsented > 0 ? `${consentStats.unconsented} subjects missing consent` : `of ${consentStats.totalActive} active subjects`,
                'file-check', consentStats.unconsented > 0 ? '#991B1B' : '#065F46', consentStats.unconsented > 0 ? '#FEE2E2' : '#D1FAE5', 'consents')}
            ${kpiCardLink('Unreported SAEs', aeStats.draft,
                aeStats.draft > 0 ? 'pending expedited reporting' : 'all SAEs reported',
                'send', aeStats.draft > 0 ? '#B45309' : '#065F46', aeStats.draft > 0 ? '#FEF3C7' : '#D1FAE5', 'ae')}
        </div>

        <!-- Main Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

            <!-- Recent Audit Activity -->
            <div class="lg:col-span-2 ph-card overflow-hidden">
                <div class="ph-card-header">
                    <h3><i data-lucide="activity" class="w-4 h-4 text-slate-400"></i> Recent Audit Activity</h3>
                    <a href="#audit" class="text-xs text-blue-600 hover:underline font-medium">View full trail →</a>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="ph-table-head">
                            <tr>
                                <th class="text-left">Action</th>
                                <th class="text-left">Record</th>
                                <th class="text-left">Reason</th>
                                <th class="text-left">User</th>
                                <th class="text-left">Time</th>
                            </tr>
                        </thead>
                        <tbody class="ph-table-body">
                            ${stats.recentAudit.length === 0
                                ? `<tr><td colspan="5" class="text-center py-8 text-sm text-slate-400">No recent activity</td></tr>`
                                : stats.recentAudit.map(a => `
                                <tr>
                                    <td><span class="${ACTION_BADGE[a.action] || 'badge bg-slate-100 text-slate-600'}">${a.action}</span></td>
                                    <td class="text-xs font-medium text-slate-700">${a.table_name}<br><span class="text-slate-400 font-normal">#${a.record_id}</span></td>
                                    <td class="text-xs text-slate-600 max-w-[160px] truncate">${esc(a.reason_for_change)}</td>
                                    <td class="text-xs text-slate-600 whitespace-nowrap">${esc(a.user_name)}</td>
                                    <td class="text-xs text-slate-500 whitespace-nowrap font-mono">${fmt(a.timestamp)}</td>
                                </tr>`).join('')
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Right column -->
            <div class="space-y-4">

                <!-- Quick Actions -->
                <div class="ph-card">
                    <div class="ph-card-header">
                        <h3><i data-lucide="zap" class="w-4 h-4 text-slate-400"></i> Quick Actions</h3>
                    </div>
                    <div class="p-3 space-y-1.5">
                        <a href="#subjects" class="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-50 transition group text-sm text-slate-700 border border-transparent hover:border-slate-200">
                            <div class="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <i data-lucide="users" class="w-3.5 h-3.5 text-blue-600"></i>
                            </div>
                            <span class="font-medium text-xs">View All Subjects</span>
                            <i data-lucide="arrow-right" class="w-3.5 h-3.5 ml-auto text-slate-300 group-hover:text-slate-500 transition"></i>
                        </a>
                        ${['investigator', 'pi', 'admin', 'crc'].includes(user.role) ? `
                        <a href="#subjects/new" class="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-50 transition group text-sm text-slate-700 border border-transparent hover:border-slate-200">
                            <div class="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                <i data-lucide="user-plus" class="w-3.5 h-3.5 text-emerald-600"></i>
                            </div>
                            <span class="font-medium text-xs">Enroll New Subject</span>
                            <i data-lucide="arrow-right" class="w-3.5 h-3.5 ml-auto text-slate-300 group-hover:text-slate-500 transition"></i>
                        </a>` : ''}
                        <a href="#ae" class="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-50 transition group text-sm text-slate-700 border border-transparent hover:border-slate-200">
                            <div class="w-7 h-7 rounded-md bg-red-50 flex items-center justify-center flex-shrink-0">
                                <i data-lucide="activity" class="w-3.5 h-3.5 text-red-600"></i>
                            </div>
                            <span class="font-medium text-xs flex-1">Adverse Events</span>
                            ${aeStats.overdue > 0 ? `<span class="text-xs font-bold text-white bg-red-600 px-1.5 py-0.5 rounded-full">${aeStats.overdue} OVERDUE</span>` :
                              aeStats.serious > 0 ? `<span class="text-xs font-bold text-white bg-purple-600 px-1.5 py-0.5 rounded-full">${aeStats.serious} SAE</span>` : ''}
                            <i data-lucide="arrow-right" class="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition"></i>
                        </a>
                        <a href="#queries" class="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-50 transition group text-sm text-slate-700 border border-transparent hover:border-slate-200">
                            <div class="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center flex-shrink-0">
                                <i data-lucide="message-square" class="w-3.5 h-3.5 text-amber-600"></i>
                            </div>
                            <span class="font-medium text-xs flex-1">Data Queries</span>
                            ${stats.openQueries > 0 ? `<span class="text-xs font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">${stats.openQueries}</span>` : ''}
                            <i data-lucide="arrow-right" class="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition"></i>
                        </a>
                        ${['admin', 'pi', 'cra', 'data_manager'].includes(user.role) ? `
                        <div class="pt-1.5 border-t border-slate-100">
                            <p class="text-xs text-slate-400 font-medium px-1 py-1 uppercase tracking-wide">CDISC Export</p>
                            <div class="flex gap-1.5">
                                <button onclick="api.downloadODM()" class="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition">
                                    <i data-lucide="file-code" class="w-3 h-3"></i> ODM-XML
                                </button>
                                <button onclick="api.downloadCSV('AE')" class="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition">
                                    <i data-lucide="file-spreadsheet" class="w-3 h-3"></i> AE CSV
                                </button>
                                <button onclick="api.downloadCSV('DM')" class="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition">
                                    <i data-lucide="file-spreadsheet" class="w-3 h-3"></i> DM CSV
                                </button>
                            </div>
                            <p class="text-xs text-slate-400 font-medium px-1 pt-2 pb-1 uppercase tracking-wide">Analysis (SPSS) — long format</p>
                            <div class="flex gap-1.5 flex-wrap">
                                ${['LB','VS','CRF'].map(d => `
                                <button onclick="api.downloadCSV('${d}')" class="flex-1 min-w-[70px] flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition">
                                    <i data-lucide="file-spreadsheet" class="w-3 h-3"></i> ${d} CSV
                                </button>`).join('')}
                            </div>
                        </div>` : ''}
                    </div>
                </div>

                <!-- Compliance Status -->
                <div class="ph-card">
                    <div class="ph-card-header">
                        <h3><i data-lucide="shield-check" class="w-4 h-4 text-slate-400"></i> Compliance Status</h3>
                    </div>
                    <div class="p-4 space-y-3">
                        ${compItem('Audit Trail', 'Active & Immutable', true)}
                        ${compItem('21 CFR Part 11', 'Compliant', true)}
                        ${compItem('ICH GCP E6(R3)', 'Compliant', true)}
                        ${compItem('Reason for Change', 'Enforced on Edit', true)}
                        ${compItem('MFA (OTP Email)', 'Enabled', true)}
                        ${compItem('Session Timeout', '30-min inactivity', true)}
                        ${compItem('DB Lock Status', dblockStatus?.isLocked ? 'LOCKED 🔒' : (dblockStatus?.current?.status === 'Pending Approval' || dblockStatus?.current?.status === 'Pending Signatures') ? 'Pending' : 'Unlocked', !dblockStatus?.isLocked)}
                        ${compItem('AE/SAE Reporting', aeStats.overdue > 0 ? `${aeStats.overdue} report(s) overdue` : 'Tracking active', aeStats.overdue === 0)}
                        ${compItem('Protocol Deviations', devStats.open > 0 ? `${devStats.open} open` : 'None open', devStats.open === 0)}
                        ${compItem('UU PDP Consent', consentStats.unconsented > 0 ? `${consentStats.unconsented} subjects missing` : 'All subjects consented', consentStats.unconsented === 0)}
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    lucide.createIcons();
}

function kpiCard(label, value, sub, icon, textColor, bgColor) {
    return `
    <div class="ph-card p-5">
        <div class="flex items-start justify-between mb-3">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">${label}</p>
            <div class="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style="background:${bgColor}">
                <i data-lucide="${icon}" class="w-4 h-4" style="color:${textColor}"></i>
            </div>
        </div>
        <p class="kpi-number" style="color:${textColor}">${value}</p>
        <p class="text-xs text-slate-400 mt-1.5">${sub}</p>
    </div>`;
}

function kpiCardLink(label, value, sub, icon, textColor, bgColor, route) {
    return `
    <a href="#${route}" class="ph-card p-5 block hover:shadow-sm transition cursor-pointer">
        <div class="flex items-start justify-between mb-3">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">${label}</p>
            <div class="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style="background:${bgColor}">
                <i data-lucide="${icon}" class="w-4 h-4" style="color:${textColor}"></i>
            </div>
        </div>
        <p class="kpi-number" style="color:${textColor}">${value}</p>
        <p class="text-xs text-slate-400 mt-1.5">${sub}</p>
    </a>`;
}

function compItem(label, note, ok) {
    return `
    <div class="flex items-center gap-2.5">
        <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? 'bg-emerald-100' : 'bg-amber-100'}">
            <i data-lucide="${ok ? 'check' : 'alert-triangle'}" class="w-3 h-3 ${ok ? 'text-emerald-600' : 'text-amber-600'}"></i>
        </div>
        <div class="flex-1 min-w-0">
            <span class="text-xs font-medium text-slate-700">${label}</span>
        </div>
        <span class="text-xs ${ok ? 'text-emerald-600' : 'text-amber-600'} font-medium whitespace-nowrap">${note}</span>
    </div>`;
}

function roleClass(role) {
    return { admin: 'bg-indigo-100 text-indigo-800', investigator: 'bg-blue-100 text-blue-800', cra: 'bg-amber-100 text-amber-800', crc: 'bg-emerald-100 text-emerald-800' }[role] || 'bg-slate-100 text-slate-700';
}
function roleLabel(role) {
    return { admin: 'Administrator', investigator: 'Investigator', cra: 'CRA / Monitor', crc: 'CRC' }[role] || role;
}
function esc(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

## src/frontend/js/modules/enrollment-save.js

```javascript
// Once creation succeeds, never report a later failure as failed creation.
// Follow-up writes are not retried: a lost response may hide a committed write.
export async function saveEnrollment(api, payload, { criteria, passed, consent }) {
    const subject = await api.createSubject(payload);
    const unconfirmed = [];
    if (criteria?.length) {
        try { await api.submitIEAssessment(subject.id, criteria, passed); }
        catch { unconfirmed.push('inclusion/exclusion assessment'); }
    }
    if (consent) {
        try { await api.createConsent({ subjectId: subject.id, consentType: 'Initial', ...consent }); }
        catch { unconfirmed.push('consent record'); }
    }
    return { subject, unconfirmed };
}
```

## src/frontend/js/modules/http.js

```javascript
// Shared by JSON requests and downloads. Never automatically retry a write.
// TODO: MINOR — Present support reference IDs consistently beside persistent errors.
export class ApiError extends Error {
    constructor(message, { status = 0, code, data = {}, requestId } = {}) {
        super(message);
        this.name = 'ApiError';
        Object.assign(this, { status, code, data, details: data.details, requestId });
    }
}

const fallback = {
    400: 'Check the information you entered and try again.',
    401: 'Your session could not be verified. Sign in again before continuing.',
    403: 'You do not have permission to do this. Contact your study administrator.',
    404: 'This item could not be found. Refresh the list and try again.',
    409: 'This information conflicts with an existing record. Refresh and review it before saving again.',
    413: 'The upload is too large. Reduce its size and try again.',
    422: 'Check the information you entered and try again.',
    423: 'This account or record is locked. Contact your study administrator.',
    429: 'Too many requests. Wait a moment before trying again.',
};
const pendingWrites = new Set();
const uncertain = 'If you were saving, check whether your changes were saved before trying again.';

export async function request(path, options = {}, { responseType = 'json', timeoutMs = 30000 } = {}) {
    const { signal, ...fetchOptions } = options;
    const method = (options.method || 'GET').toUpperCase();
    const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    // Guard identical in-flight JSON writes in this tab; this is not server idempotency.
    const writeKey = isWrite && (options.body == null || typeof options.body === 'string')
        ? JSON.stringify([path, method, new Headers(options.headers).get('X-Study-ID'), options.body ?? null]) : null;
    if (writeKey && pendingWrites.has(writeKey)) {
        throw new ApiError('This request is already being processed. Wait for the result before submitting again.', { code: 'REQUEST_PENDING' });
    }
    if (writeKey) pendingWrites.add(writeKey);
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
        const res = await fetch(path, { ...fetchOptions, credentials: 'include', signal: controller.signal });
        if (!res.ok) {
            let data = {};
            try { data = await res.json(); } catch (err) {
                if (controller.signal.aborted) throw err;
            }
            if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
            const serverFailure = res.status >= 500;
            const supplied = data.error || data.message;
            const message = res.status === 403 && data.mustChangePassword === true
                ? 'Change your password in Account Security before continuing.'
                : serverFailure
                ? `The service is temporarily unavailable. ${uncertain} Contact support if this continues.`
                : ([400, 409, 422].includes(res.status) && typeof supplied === 'string' && supplied.trim()
                    ? supplied : fallback[res.status] || 'We could not complete the request. Please try again.');
            throw new ApiError(message, {
                status: res.status, code: serverFailure ? 'SERVER_ERROR' : data.code,
                data: serverFailure ? {} : data,
                requestId: res.headers.get('X-Request-ID'),
            });
        }
        if (res.status === 204) return null;
        if (responseType === 'blob') return await res.blob();
        try { return await res.json(); } catch (err) {
            if (controller.signal.aborted) throw err;
            if (!(err instanceof SyntaxError)) throw err;
            throw new ApiError(`The service returned an unreadable response. ${uncertain}`, { code: 'INVALID_RESPONSE', status: res.status });
        }
    } catch (err) {
        if (err instanceof ApiError) throw err;
        if (controller.signal.aborted) {
            throw new ApiError(timedOut ? `The request took too long. ${uncertain}` : `The request was cancelled. ${uncertain}`, { code: timedOut ? 'TIMEOUT' : 'CANCELLED' });
        }
        throw new ApiError(`We could not connect to the service. Check your internet connection. ${uncertain}`, { code: 'NETWORK_ERROR' });
    } finally {
        if (writeKey) pendingWrites.delete(writeKey);
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
    }
}
```

## src/frontend/js/modules/load-error.js

```javascript
// A failed read is not an empty collection. Retry only the read operation.
export function showLoadError(container, message, retry) {
    container.replaceChildren();
    const panel = document.createElement('div');
    panel.className = 'p-6 text-red-700';
    panel.setAttribute('role', 'alert');
    const text = document.createElement('p');
    text.textContent = message;
    panel.appendChild(text);
    if (retry) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mt-3 px-4 py-2 border rounded-md';
        button.textContent = 'Try loading again';
        button.addEventListener('click', async () => {
            button.disabled = true;
            try { await retry(); } catch {
                showLoadError(container, message, retry);
            } finally { button.disabled = false; }
        });
        panel.appendChild(button);
    }
    container.appendChild(panel);
}
```

## src/frontend/js/modules/monitoring.js

```javascript
import { showLoadError } from './load-error.js';
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

    let visits, sites;
    try { [visits, sites] = await Promise.all([api.getMonitoringVisits(), api.getSites()]); }
    catch {
        showLoadError(container, 'Monitoring visits and site information could not be loaded.', () => renderMonitoring(container));
        return;
    }

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
        bodyEl.innerHTML = `<p style="color:#dc2626;padding:1rem;">Failed to load: ${esc(err.message)}</p>`;
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

```

## src/frontend/js/modules/saereports.js

```javascript
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

    let reports, overdue;
    try {
        [reports, overdue] = await Promise.all([api.getSAEReports(), api.getOverdueSAEReports()]);
    } catch {
        container.innerHTML = '<div role="alert" class="p-6 text-red-700">SAE reports could not be loaded. Overdue report status is unavailable. Check your connection and reload the page.</div>';
        return;
    }

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
```

## src/frontend/js/modules/security-settings.js

```javascript
import { escHtml } from './utils.js';
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
                    <div class="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">${escHtml(err.message)}</div>`);
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
```

## src/frontend/js/modules/session.js

```javascript
import { request } from './http.js';
import { removeStored } from './storage.js';
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
    let signoutConfirmed = true;
    try {
        await request('/api/auth/sign-out', { method: 'POST' });
    } catch { signoutConfirmed = false; }
    // Remove stale display context even if the server cannot confirm sign-out.
    for (const key of ['ecrf_session', 'ecrf_study_id', 'ecrf_study_meta', 'ecrf_site_context_id', 'ecrf_site_context_meta']) removeStored(key);
    window.location.href = signoutConfirmed ? '/login.html?reason=timeout' : '/login.html?reason=timeout&signout=unconfirmed';
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
```

## src/frontend/js/modules/sites.js

```javascript
import { showLoadError } from './load-error.js';
// Site Management — ICH GCP E6(R3) §4.1.1
// Sites must be formally registered before subject enrollment begins

import { api } from './api.js';
import { showToast } from './utils.js';
import { getSiteContext, setSiteContext } from './study-select.js';

export async function renderSites(container) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:3rem;">
        <span style="color:#6b7280;">Loading sites…</span></div>`;

    let sites;
    try { sites = await api.getSites(); }
    catch {
        showLoadError(container, 'Sites could not be loaded. Site availability is unknown.', () => renderSites(container));
        return;
    }
    container.innerHTML = renderSitesPage(sites);
    attachSiteEvents(container);
}

function statusBadge(status) {
    return status === 'Active'
        ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
               <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>Active
           </span>`
        : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
               <span class="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>Inactive
           </span>`;
}

function renderSitesPage(sites) {
    const rows = sites.length === 0
        ? `<tr><td colspan="6" class="text-center py-10 text-slate-400 text-sm">
               No sites registered yet. Add the first study site to enable subject enrollment.
           </td></tr>`
        : sites.map(s => `
            <tr class="hover:bg-slate-50 transition">
                <td class="px-4 py-3 font-mono text-sm font-semibold text-slate-800">${s.code ?? s.site_code ?? '—'}</td>
                <td class="px-4 py-3 text-sm text-slate-700 font-medium">${s.name ?? s.site_name ?? '—'}</td>
                <td class="px-4 py-3 text-sm text-slate-500">${s.country ?? '—'}</td>
                <td class="px-4 py-3 text-sm text-slate-600">${s.piName ?? s.pi_name ?? '—'}</td>
                <td class="px-4 py-3">${statusBadge(s.status)}</td>
                <td class="px-4 py-3 text-right">
                    <button class="btn-edit-site text-xs font-medium text-blue-600 hover:text-blue-800 transition"
                        data-id="${s.id}"
                        data-name="${s.name ?? s.site_name ?? ''}"
                        data-country="${s.country ?? ''}"
                        data-pi="${s.piName ?? s.pi_name ?? ''}"
                        data-status="${s.status}">
                        Edit
                    </button>
                </td>
            </tr>`).join('');

    return `
        <div class="p-6 max-w-5xl mx-auto">
            <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h1 class="text-xl font-bold text-slate-900">Study Sites</h1>
                    <p class="text-xs text-slate-500 mt-0.5">ICH GCP E6(R3) §4.1.1 — Sites must be formally registered before subject enrollment</p>
                </div>
                <button id="btn-add-site"
                    class="flex items-center gap-2 btn-primary px-4 py-2 text-sm rounded-md">
                    <i data-lucide="plus" class="w-4 h-4"></i> Register Site
                </button>
            </div>

            <!-- Stats strip -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div class="ph-card p-4">
                    <p class="text-2xl font-bold text-slate-900">${sites.length}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Total Sites</p>
                </div>
                <div class="ph-card p-4">
                    <p class="text-2xl font-bold text-emerald-600">${sites.filter(s => s.status === 'Active').length}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Active</p>
                </div>
                <div class="ph-card p-4">
                    <p class="text-2xl font-bold text-slate-400">${sites.filter(s => s.status !== 'Active').length}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Inactive</p>
                </div>
            </div>

            <div class="ph-card overflow-hidden">
                <table class="w-full border-collapse">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-100">
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Site Code</th>
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Site Name</th>
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Principal Investigator</th>
                            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                            <th class="px-4 py-2.5"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">${rows}</tbody>
                </table>
            </div>

            <p class="text-xs text-slate-400 mt-3">
                Sites cannot be deleted — set to Inactive to close enrollment. All changes are audit-trailed per ICH GCP E6(R3).
            </p>
        </div>

        ${renderAddModal()}
        ${renderEditModal()}
    `;
}

function renderAddModal() {
    return `
        <div id="add-site-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                <h2 class="text-lg font-semibold mb-1">Register Study Site</h2>
                <p class="text-xs text-slate-500 mb-4">Per ICH GCP E6(R3) §4.1.1 — site must be formally initiated before enrollment begins.</p>

                <div class="space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Site Code *</label>
                            <input id="add-site-code" type="text" placeholder="e.g. JKT-001"
                                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Country</label>
                            <input id="add-site-country" type="text" placeholder="e.g. Indonesia"
                                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Site Name *</label>
                        <input id="add-site-name" type="text" placeholder="e.g. Jakarta General Hospital"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Principal Investigator</label>
                        <input id="add-site-pi" type="text" placeholder="e.g. Dr. Budi Santoso"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>

                <p id="add-site-error" class="text-red-600 text-xs mt-3 hidden"></p>

                <div class="flex gap-2 mt-5">
                    <button id="add-site-cancel" class="flex-1 border border-slate-200 rounded-lg py-2 text-sm hover:bg-slate-50 transition">Cancel</button>
                    <button id="add-site-save" class="flex-2 btn-primary rounded-lg py-2 text-sm px-5 font-semibold">Register Site</button>
                </div>
            </div>
        </div>
    `;
}

function renderEditModal() {
    return `
        <div id="edit-site-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                <h2 class="text-lg font-semibold mb-4">Edit Site</h2>

                <div class="space-y-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Site Name *</label>
                        <input id="edit-site-name" type="text"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Country</label>
                        <input id="edit-site-country" type="text"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Principal Investigator</label>
                        <input id="edit-site-pi" type="text"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Status</label>
                        <select id="edit-site-status"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <p id="edit-site-error" class="text-red-600 text-xs mt-3 hidden"></p>

                <div class="flex gap-2 mt-5">
                    <button id="edit-site-cancel" class="flex-1 border border-slate-200 rounded-lg py-2 text-sm hover:bg-slate-50 transition">Cancel</button>
                    <button id="edit-site-save" class="flex-2 btn-primary rounded-lg py-2 text-sm px-5 font-semibold">Save Changes</button>
                </div>
            </div>
        </div>
    `;
}

function attachSiteEvents(container) {
    // Add site modal
    document.getElementById('btn-add-site')?.addEventListener('click', () => {
        ['add-site-code', 'add-site-name', 'add-site-country', 'add-site-pi'].forEach(id => {
            document.getElementById(id).value = '';
        });
        document.getElementById('add-site-error').classList.add('hidden');
        document.getElementById('add-site-modal').classList.remove('hidden');
    });
    document.getElementById('add-site-cancel')?.addEventListener('click', () => {
        document.getElementById('add-site-modal').classList.add('hidden');
    });
    document.getElementById('add-site-save')?.addEventListener('click', async () => {
        const code    = document.getElementById('add-site-code').value.trim().toUpperCase();
        const name    = document.getElementById('add-site-name').value.trim();
        const country = document.getElementById('add-site-country').value.trim();
        const piName  = document.getElementById('add-site-pi').value.trim();
        const errEl   = document.getElementById('add-site-error');
        errEl.classList.add('hidden');

        if (!code || !name) {
            errEl.textContent = 'Site code and name are required.';
            errEl.classList.remove('hidden');
            return;
        }
        try {
            const newSite = await api.createSite({ code, name, country: country || null, piName: piName || null });
            // Auto-select this site as context if none is set yet (initial setup)
            if (!getSiteContext()) {
                setSiteContext({ id: newSite.id, site_code: newSite.code, site_name: newSite.name });
                window.dispatchEvent(new CustomEvent('site-context-changed'));
            }
            showToast('Site registered successfully', 'success');
            document.getElementById('add-site-modal').classList.add('hidden');
            renderSites(container);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
        }
    });

    // Edit site modal
    let editingId = null;
    container.querySelectorAll('.btn-edit-site').forEach(btn => {
        btn.addEventListener('click', () => {
            editingId = btn.dataset.id;
            document.getElementById('edit-site-name').value    = btn.dataset.name;
            document.getElementById('edit-site-country').value = btn.dataset.country;
            document.getElementById('edit-site-pi').value      = btn.dataset.pi;
            document.getElementById('edit-site-status').value  = btn.dataset.status;
            document.getElementById('edit-site-error').classList.add('hidden');
            document.getElementById('edit-site-modal').classList.remove('hidden');
        });
    });
    document.getElementById('edit-site-cancel')?.addEventListener('click', () => {
        document.getElementById('edit-site-modal').classList.add('hidden');
        editingId = null;
    });
    document.getElementById('edit-site-save')?.addEventListener('click', async () => {
        const name    = document.getElementById('edit-site-name').value.trim();
        const country = document.getElementById('edit-site-country').value.trim();
        const piName  = document.getElementById('edit-site-pi').value.trim();
        const status  = document.getElementById('edit-site-status').value;
        const errEl   = document.getElementById('edit-site-error');
        errEl.classList.add('hidden');

        if (!name) {
            errEl.textContent = 'Site name is required.';
            errEl.classList.remove('hidden');
            return;
        }
        try {
            await api.updateSite(editingId, { name, country: country || null, piName: piName || null, status });
            showToast('Site updated', 'success');
            document.getElementById('edit-site-modal').classList.add('hidden');
            editingId = null;
            renderSites(container);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
        }
    });

    if (window.lucide) lucide.createIcons();
}
```

## src/frontend/js/modules/storage.js

```javascript
// Browser storage contains display context only; authorization stays on the server.
function storageError() {
    const error = new Error('Browser storage is unavailable. Allow site storage, then sign in and select your study again.');
    error.code = 'STORAGE_UNAVAILABLE';
    return error;
}

export function readStored(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}

export function removeStored(key) {
    try { localStorage.removeItem(key); } catch { /* reads fail closed when storage is blocked */ }
}

export function writeStored(key, value) {
    try { localStorage.setItem(key, value); } catch { throw storageError(); }
}

export function readObject(key, validate = () => true) {
    const raw = readStored(key);
    if (raw === null) return null;
    try {
        const value = JSON.parse(raw);
        if (value && typeof value === 'object' && !Array.isArray(value) && validate(value)) return value;
    } catch { /* discard corrupt display context, never guess its contents */ }
    removeStored(key);
    return null;
}

export function readContext(prefix) {
    const rawId = readStored(`${prefix}_id`);
    const meta = readObject(`${prefix}_meta`);
    if (rawId === null && meta === null) return null;
    const id = Number(rawId);
    if (!/^\d+$/.test(rawId || '') || !Number.isSafeInteger(id) || id <= 0 || !meta) {
        removeStored(`${prefix}_id`);
        removeStored(`${prefix}_meta`);
        return null;
    }
    return { ...meta, id };
}

export function writeContext(prefix, value, meta) {
    // Clear the old context first so a failed write cannot select the wrong study.
    removeStored(`${prefix}_id`);
    removeStored(`${prefix}_meta`);
    if (!value) return;
    const id = Number(value.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Select a valid study or site before continuing.');
    try {
        writeStored(`${prefix}_meta`, JSON.stringify(meta));
        writeStored(`${prefix}_id`, String(id));
    } catch (err) {
        removeStored(`${prefix}_id`);
        removeStored(`${prefix}_meta`);
        throw err;
    }
}
```

## src/frontend/js/modules/study-select.js

```javascript
import { readContext, writeContext } from './storage.js';
// Study + Site Onboarding — shown when no context is selected after login
// Flow: select study → select site → navigate to dashboard

import { api } from './api.js';

// ── Context helpers ─────────────────────────────────────────────────────────

export function getSiteContext() {
    return readContext('ecrf_site_context');
}

export function setSiteContext(site) {
    writeContext('ecrf_site_context', site, site ? {
        siteCode: site.site_code ?? site.code ?? '',
        siteName: site.site_name ?? site.name ?? '',
        status: site.status ?? 'Active',
    } : null);
}

// ── Main entry point ────────────────────────────────────────────────────────

export async function ensureStudySelected() {
    let currentStudy = api.getCurrentStudy();
    const currentSite  = getSiteContext();
    const user = api.getCurrentUser();

    // Both already selected — always refresh site status from API in background
    // so changes made in Site Management are reflected without a full re-login
    if (currentStudy && currentSite) {
        api.getSites()
            .then(sites => {
                const fresh = Array.isArray(sites) ? sites.find(s => s.id === currentSite.id) : null;
                if (fresh && fresh.status !== currentSite.status) {
                    setSiteContext(fresh);
                    window.dispatchEvent(new Event('site-context-changed'));
                }
            })
            .catch(() => {});
        return;
    }

    let studies = [];
    try { studies = await api.getStudies(); } catch { /* table not yet migrated */ }

    if (studies.length === 0) {
        // Non-admin: not assigned to any study — show blocking message
        if (user?.role !== 'admin') {
            await showNoStudyMessage();
        }
        // Admin: no studies in system yet — app.js startup sequence handles redirect
        return;
    }

    // Validate stored study still exists (e.g. was deleted)
    if (currentStudy && !studies.find(s => s.id === currentStudy.id)) {
        api.setCurrentStudy(null);
        currentStudy = null;
    }

    // Determine which study to use
    let study = currentStudy;
    if (!study) {
        if (studies.length === 1) {
            study = studies[0];
            api.setCurrentStudy(study);
        } else {
            study = await pickStudy(studies);
            api.setCurrentStudy(study);
        }
    }

    // Now pick site
    if (!currentSite) {
        let sites = [];
        try { sites = await api.getSites(); } catch {}
        sites = sites.filter(s => s.status === 'Active' || s.status === 'active');

        if (sites.length === 0) {
            // Non-admin: not assigned to any (active) site — show blocking message
            if (user?.role !== 'admin') {
                await showNoSiteMessage();
            }
            // Admin: no sites yet — continue (admin can create sites)
            return;
        }

        // If only one site, auto-select
        if (sites.length === 1) {
            setSiteContext(sites[0]);
            return;
        }

        // Multiple sites — show picker
        await pickSite(study, sites);
    }
}

// ── No-assignment blocking overlays ─────────────────────────────────────────

function showNoStudyMessage() {
    return new Promise(() => {
        document.getElementById('onboarding-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[9999] flex items-center justify-center';
        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
                <div class="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-5">
                    <i data-lucide="flask-conical" class="w-8 h-8 text-amber-500"></i>
                </div>
                <h2 class="text-lg font-bold text-slate-900 mb-2">No Study Assigned</h2>
                <p class="text-sm text-slate-500 mb-6 leading-relaxed">
                    You have not been assigned to any clinical study.<br>
                    Please contact your administrator to request access.
                </p>
                <button id="no-study-logout"
                    class="w-full px-4 py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition flex items-center justify-center gap-2">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                    Sign Out
                </button>
            </div>`;
        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();
        overlay.querySelector('#no-study-logout').addEventListener('click', () => api.logout());
    });
}

function showNoSiteMessage() {
    return new Promise(() => {
        document.getElementById('onboarding-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[9999] flex items-center justify-center';
        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
                <div class="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-5">
                    <i data-lucide="building-2" class="w-8 h-8 text-amber-500"></i>
                </div>
                <h2 class="text-lg font-bold text-slate-900 mb-2">No Site Assigned</h2>
                <p class="text-sm text-slate-500 mb-6 leading-relaxed">
                    You have not been assigned to a clinical site.<br>
                    Please contact your administrator to request access.
                </p>
                <button id="no-site-logout"
                    class="w-full px-4 py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition flex items-center justify-center gap-2">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                    Sign Out
                </button>
            </div>`;
        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();
        overlay.querySelector('#no-site-logout').addEventListener('click', () => api.logout());
    });
}

// ── Study picker ─────────────────────────────────────────────────────────────

function pickStudy(studies) {
    return new Promise(resolve => {
        document.getElementById('onboarding-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[9999] flex items-center justify-center';

        const rows = studies.map(s => `
            <button class="study-pick-btn w-full text-left px-4 py-3.5 rounded-xl border-2 border-slate-100
                    hover:border-blue-400 hover:bg-blue-50/80 transition group"
                data-id="${s.id}" data-title="${encodeURIComponent(s.title)}"
                data-protocol="${encodeURIComponent(s.protocolNo)}" data-status="${s.status}">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="flask-conical" class="w-5 h-5 text-blue-600"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-semibold text-slate-900 text-sm truncate group-hover:text-blue-700">${s.title}</p>
                        <p class="text-xs text-slate-500 mt-0.5">${s.protocolNo} &nbsp;·&nbsp; ${s.phase ?? 'N/A'} &nbsp;·&nbsp;
                            <span class="${s.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}">${s.status}</span>
                        </p>
                    </div>
                    <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-blue-500 flex-shrink-0"></i>
                </div>
            </button>`).join('');

        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="layers" class="w-5 h-5 text-white"></i>
                    </div>
                    <div>
                        <p class="text-xs text-slate-400 font-medium uppercase tracking-widest">Step 1 of 2</p>
                        <h2 class="text-base font-bold text-slate-900 leading-tight">Select Clinical Study</h2>
                    </div>
                </div>
                <p class="text-xs text-slate-500 mb-4 ml-[52px]">Choose the trial you will work on in this session</p>
                <div class="space-y-2 max-h-72 overflow-y-auto pr-0.5">${rows}</div>
            </div>`;

        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();

        overlay.querySelectorAll('.study-pick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const s = {
                    id:         parseInt(btn.dataset.id),
                    title:      decodeURIComponent(btn.dataset.title),
                    protocolNo: decodeURIComponent(btn.dataset.protocol),
                    status:     btn.dataset.status,
                };
                overlay.remove();
                resolve(s);
            });
        });
    });
}

// ── Site picker ───────────────────────────────────────────────────────────────

function pickSite(study, sites) {
    return new Promise(resolve => {
        document.getElementById('onboarding-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[9999] flex items-center justify-center';

        const rows = sites.map(s => `
            <button class="site-pick-btn w-full text-left px-4 py-3.5 rounded-xl border-2 border-slate-100
                    hover:border-emerald-400 hover:bg-emerald-50/80 transition group"
                data-id="${s.id}"
                data-code="${encodeURIComponent(s.site_code ?? '')}"
                data-name="${encodeURIComponent(s.site_name ?? '')}">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="building-2" class="w-5 h-5 text-emerald-600"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-semibold text-slate-900 text-sm truncate group-hover:text-emerald-700">${s.site_name ?? '—'}</p>
                        <p class="text-xs text-slate-500 mt-0.5">${s.site_code ?? ''} &nbsp;·&nbsp; ${s.country ?? 'N/A'}
                            ${s.pi_name ? ` &nbsp;·&nbsp; PI: ${s.pi_name}` : ''}
                        </p>
                    </div>
                    <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-emerald-500 flex-shrink-0"></i>
                </div>
            </button>`).join('');

        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
                <div class="flex items-center gap-3 mb-1">
                    <div class="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="building-2" class="w-5 h-5 text-white"></i>
                    </div>
                    <div>
                        <p class="text-xs text-slate-400 font-medium uppercase tracking-widest">Step 2 of 2</p>
                        <h2 class="text-base font-bold text-slate-900 leading-tight">Select Study Site</h2>
                    </div>
                </div>
                <p class="text-xs text-slate-500 mb-4 ml-[52px]">
                    <span class="inline-flex items-center gap-1">
                        <i data-lucide="flask-conical" class="w-3 h-3 text-blue-500 inline"></i>
                        <span class="font-medium text-blue-700">${study.title}</span>
                    </span>
                    &nbsp;·&nbsp; Choose the site for this session
                </p>
                <div class="space-y-2 max-h-72 overflow-y-auto pr-0.5">${rows}</div>
            </div>`;

        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();

        overlay.querySelectorAll('.site-pick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const site = {
                    id:        parseInt(btn.dataset.id),
                    site_code: decodeURIComponent(btn.dataset.code),
                    site_name: decodeURIComponent(btn.dataset.name),
                };
                setSiteContext(site);
                overlay.remove();
                resolve(site);
            });
        });
    });
}

// ── Manual study/site switch (from sidebar or studymgmt) ─────────────────────

export function switchStudyAndSite() {
    api.setCurrentStudy(null);
    setSiteContext(null);
    window.location.href = 'select.html';
}
```

## src/frontend/js/modules/subjects.js

```javascript
import { saveEnrollment } from './enrollment-save.js';
// ============================================================
// Subjects View — List, Detail, GCP-compliant Study Visits
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';
import { DEFAULT_IE_CRITERIA, hasCriteria } from './iecriteria.js';

const STATUS_BADGE = {
    Active:          'badge badge-active',
    Locked:          'badge badge-locked',
    Withdrawn:       'badge badge-withdrawn',
    Completed:       'badge badge-completed',
    'Screen Failed': 'badge badge-withdrawn',
};

const VISIT_STATUS_BADGE = {
    Scheduled:    'badge bg-slate-100 text-slate-600',
    'In Progress':'badge badge-saved',
    Complete:     'badge badge-completed',
    Missed:       'badge badge-withdrawn',
};

// GCP Protocol Visit Templates — ICH E6 (R3)
const VISIT_TEMPLATES = [
    { code: 'V01', name: 'Screening',             order: 1,  study_day: -7,  window_days: 7,  type: 'Scheduled' },
    { code: 'V02', name: 'Baseline / Day 1',       order: 2,  study_day: 1,   window_days: 0,  type: 'Scheduled' },
    { code: 'V03', name: 'Week 2 (Day 14)',        order: 3,  study_day: 14,  window_days: 3,  type: 'Scheduled' },
    { code: 'V04', name: 'Week 4 (Day 28)',        order: 4,  study_day: 28,  window_days: 3,  type: 'Scheduled' },
    { code: 'V05', name: 'Week 8 (Day 56)',        order: 5,  study_day: 56,  window_days: 5,  type: 'Scheduled' },
    { code: 'V06', name: 'Week 12 (Day 84)',       order: 6,  study_day: 84,  window_days: 7,  type: 'Scheduled' },
    { code: 'V07', name: 'Month 6 (Day 180)',      order: 7,  study_day: 180, window_days: 7,  type: 'Scheduled' },
    { code: 'V08', name: 'Month 9 (Day 270)',      order: 8,  study_day: 270, window_days: 7,  type: 'Scheduled' },
    { code: 'V09', name: 'End of Study (Day 365)', order: 9,  study_day: 365, window_days: 7,  type: 'Scheduled' },
    { code: 'V10', name: 'Follow-up (Day 393)',    order: 10, study_day: 393, window_days: 14, type: 'Scheduled' },
    { code: 'UNS', name: 'Unscheduled Visit',      order: 99, study_day: null, window_days: null, type: 'Unscheduled' },
    { code: 'CUS', name: null,                     order: 98, study_day: null, window_days: null, type: 'Scheduled' },
];

function statusBadge(status, map = STATUS_BADGE) {
    const cls = map[status] || 'badge bg-slate-100 text-slate-600';
    return `<span class="${cls}">${esc(status || '—')}</span>`;
}

function complianceBadge(compliance) {
    if (!compliance || compliance === 'N/A') {
        return `<span class="badge bg-slate-100 text-slate-400">—</span>`;
    }
    if (compliance === 'On Schedule') {
        return `<span class="badge" style="background:#D1FAE5;color:#065F46;border:1px solid #A7F3D0">On Schedule</span>`;
    }
    if (compliance.includes('Out of Window')) {
        return `<span class="badge" style="background:#FEE2E2;color:#991B1B;border:1px solid #FECACA">${esc(compliance)}</span>`;
    }
    return `<span class="badge" style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A">${esc(compliance)}</span>`;
}

function fmt(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function plannedFromStudyDay(enrollmentDate, studyDay) {
    if (!enrollmentDate || studyDay == null) return '';
    const d = new Date(enrollmentDate);
    d.setDate(d.getDate() + (studyDay - 1));
    return d.toISOString().split('T')[0];
}

function esc(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const SPINNER = `<div class="flex items-center justify-center h-32">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

// ============================================================
// Subject List
// ============================================================
export async function renderSubjects({ showNewForm = false } = {}) {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const user     = api.getCurrentUser();
    const subjects = await api.getSubjects();

    content.innerHTML = `
    <div class="p-5 space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Study Subjects</h2>
                <p class="text-xs text-slate-500 mt-0.5">${subjects.length} subject${subjects.length !== 1 ? 's' : ''} enrolled across all sites</p>
            </div>
            ${['investigator', 'pi', 'admin', 'crc'].includes(user?.role) ? `
            <button onclick="openNewSubjectModal()"
                class="flex items-center gap-2 btn-primary px-4 py-2 text-sm rounded-md">
                <i data-lucide="user-plus" class="w-4 h-4"></i> Enroll Subject
            </button>` : ''}
        </div>

        <div class="ph-card p-3">
            <div class="flex flex-col sm:flex-row gap-2.5">
                <div class="relative flex-1">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="subject-search" placeholder="Search subject code, initials, site…"
                        class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <select id="status-filter"
                    class="px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Withdrawn">Withdrawn</option>
                    <option value="Screen Failed">Screen Failed</option>
                </select>
            </div>
        </div>

        <div class="ph-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-left">Subject Code</th>
                            <th class="text-left">Site</th>
                            <th class="text-left">Demographics</th>
                            <th class="text-left">Enrolled (Day 1)</th>
                            <th class="text-left">Status</th>
                            <th class="text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody id="subject-table-body" class="ph-table-body">
                        ${renderSubjectRows(subjects)}
                    </tbody>
                </table>
            </div>
            <div id="no-results" class="${subjects.length > 0 ? 'hidden' : ''} py-12 text-center text-slate-400 text-sm">
                <i data-lucide="users" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p class="font-medium text-slate-500">No subjects enrolled yet.</p>
                <p class="mt-1 text-xs">Use "Enroll Subject" to add the first study participant.</p>
            </div>
        </div>
    </div>`;

    lucide.createIcons();

    async function applyFilters() {
        const search = document.getElementById('subject-search').value;
        const status = document.getElementById('status-filter').value;
        const filtered = await api.getSubjects({ search, status });
        document.getElementById('subject-table-body').innerHTML = renderSubjectRows(filtered);
        document.getElementById('no-results').classList.toggle('hidden', filtered.length > 0);
        lucide.createIcons();
    }

    document.getElementById('subject-search').addEventListener('input', applyFilters);
    document.getElementById('status-filter').addEventListener('change', applyFilters);

    if (showNewForm) openNewSubjectModal();
}

function renderSubjectRows(subjects) {
    if (subjects.length === 0) return '';
    return subjects.map(s => `
    <tr class="cursor-pointer" onclick="navigate('subjects/${s.id}')">
        <td>
            <p class="text-sm font-semibold text-slate-900 font-mono">${esc(s.subject_code)}</p>
            <p class="text-xs text-slate-400">Initials: ${esc(s.initial)}</p>
        </td>
        <td class="text-sm text-slate-600">${esc(s.site_name)}</td>
        <td class="text-sm text-slate-600">
            ${s.sex === 'M' ? 'Male' : s.sex === 'F' ? 'Female' : 'Unknown'}
            <span class="text-slate-400 ml-1 text-xs">· ${fmt(s.dob)}</span>
        </td>
        <td class="text-sm text-slate-600">${fmt(s.enrollment_date)}</td>
        <td>${statusBadge(s.status)}</td>
        <td class="text-right">
            <a href="#subjects/${s.id}" onclick="event.stopPropagation()"
                class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline transition">
                View <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </a>
        </td>
    </tr>`).join('');
}

// ============================================================
// New Subject Modal
// ============================================================
// ── I/E Criteria for the study currently being enrolled into ───────────────
// Resolved per study when the modal opens; falls back to the app default set
// (ICH E6 R3 compliant) when the study has none configured.
let _activeIeCriteria = DEFAULT_IE_CRITERIA;
let enrollmentSaving = false;
let enrollmentNeedsReview = false;

window.openNewSubjectModal = async function () {
    if (enrollmentSaving) return;
    enrollmentNeedsReview = false;
    const user = api.getCurrentUser();
    if (!['admin', 'investigator', 'pi', 'crc'].includes(user.role)) {
        showToast('You do not have permission to enroll subjects.', 'error');
        return;
    }
    // Load this study's configured criteria; fall back to the default set.
    window._consentData = null;   // fresh enrollment — no carried-over consent
    _activeIeCriteria = DEFAULT_IE_CRITERIA;
    const cur = api.getCurrentStudy();
    if (!cur?.id) { showToast('Select your study again before enrolling a subject.', 'error'); return; }
    if (cur?.id) {
        try {
            const study = await api.getStudy(cur.id);
            if (hasCriteria(study?.ieCriteria)) _activeIeCriteria = study.ieCriteria;
        } catch { showToast('Study criteria could not be loaded. Check your connection before enrolling a subject.', 'error'); return; }
    }
    openIECriteriaModal();
};

window.openIECriteriaModal = function openIECriteriaModal() {
    const inclusionHtml = _activeIeCriteria.inclusion.map(c => `
    <label class="flex items-start gap-3 p-3 rounded-md border border-slate-200 cursor-pointer hover:bg-green-50 hover:border-green-300 transition">
        <input type="checkbox" id="${c.key}" class="mt-0.5 w-4 h-4 accent-green-600 flex-shrink-0">
        <span class="text-sm text-slate-700">${esc(c.label)}</span>
    </label>`).join('');

    const exclusionHtml = _activeIeCriteria.exclusion.map(c => `
    <label class="flex items-start gap-3 p-3 rounded-md border border-slate-200 cursor-pointer hover:bg-red-50 hover:border-red-300 transition">
        <input type="checkbox" id="${c.key}" class="mt-0.5 w-4 h-4 accent-red-600 flex-shrink-0">
        <span class="text-sm text-slate-700">${esc(c.label)}</span>
    </label>`).join('');

    showModal({
        title: 'Step 1 of 3 — Inclusion / Exclusion Criteria',
        size: 'lg',
        body: `
        <div class="space-y-5">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#EBF2FD;border-color:#BFD7F5;color:#1554A0">
                <i data-lucide="info" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                Verify all criteria before enrolling the subject. Failed criteria will automatically set status to <strong>Screen Failed</strong> per ICH GCP E6(R3) §4.3.
            </div>
            <div>
                <p class="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Inclusion Criteria — all must be met
                </p>
                <div class="space-y-2">${inclusionHtml}</div>
            </div>
            <div>
                <p class="text-xs font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <i data-lucide="x-circle" class="w-3.5 h-3.5"></i> Exclusion Criteria — none must apply
                </p>
                <div class="space-y-2">${exclusionHtml}</div>
            </div>
            <div id="ie-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"></div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="proceedFromIE()" class="flex items-center gap-2 px-4 py-2 text-sm btn-primary rounded-md">
            Next: Subject Demographics <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </button>`,
    });
}

window.proceedFromIE = async function () {
    const errEl = document.getElementById('ie-error');
    errEl.classList.add('hidden');

    const results = {};
    let allInclusionMet = true;
    let anyExclusionMet = false;

    _activeIeCriteria.inclusion.forEach(c => {
        const checked = document.getElementById(c.key)?.checked;
        results[c.key] = { label: c.label, type: 'inclusion', met: !!checked };
        if (!checked) allInclusionMet = false;
    });
    _activeIeCriteria.exclusion.forEach(c => {
        const checked = document.getElementById(c.key)?.checked;
        results[c.key] = { label: c.label, type: 'exclusion', met: !!checked };
        if (checked) anyExclusionMet = true;
    });

    const passes = allInclusionMet && !anyExclusionMet;

    if (!passes) {
        const reasons = [];
        if (!allInclusionMet) reasons.push('Not all inclusion criteria are met');
        if (anyExclusionMet)  reasons.push('One or more exclusion criteria apply');
        errEl.innerHTML = `<strong>Subject does not qualify for enrollment:</strong><br>${reasons.join('<br>')}.<br><br>Proceeding will enroll with <strong>Screen Failed</strong> status.`;
        errEl.classList.remove('hidden');
    }

    window._ieCriteriaResults = Object.values(results);
    window._iePasses = passes;
    openConsentModal(passes);
};

// ── Step 2 of 3 — Informed Consent ─────────────────────────────────────────
// Consent is a real, documented event that must be obtained BEFORE any study
// procedure (ICH GCP E6(R3) §4.8). It is captured here by the coordinator — it
// is NEVER auto-generated. Required to enroll; optional for a screen failure.
window.openConsentModal = function openConsentModal() {
    const iePasses = window._iePasses !== false;
    const today = new Date().toISOString().split('T')[0];
    const prev  = window._consentData || {};

    const note = iePasses ? `
    <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#EBF2FD;border-color:#BFD7F5;color:#1554A0">
        <i data-lucide="info" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
        Enter the details of the <strong>signed</strong> informed consent. Consent must be obtained before any study procedure (ICH GCP E6(R3) §4.8).
    </div>` : `
    <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#FFFBEB;border-color:#FDE68A;color:#92400E">
        <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
        Optional for a screen failure — fill only if consent was obtained before screening.
    </div>`;

    showModal({
        title: 'Step 2 of 3 — Informed Consent',
        size: 'md',
        body: `
        <form id="consent-form" class="space-y-4" novalidate>
            ${note}
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">ICF Version ${iePasses ? '<span class="text-red-500">*</span>' : ''}</label>
                    <input type="text" id="cs-version" maxlength="60" value="${esc(prev.consentVersion ?? '')}" placeholder="e.g. ICF v2.0 (2026-01-15)"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Consent Date ${iePasses ? '<span class="text-red-500">*</span>' : ''}</label>
                    <input type="date" id="cs-date" max="${today}" value="${esc(prev.consentDate ?? '')}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Consent Time</label>
                    <input type="time" id="cs-time" value="${esc(prev.consentTime ?? '')}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    <p class="text-xs text-slate-400 mt-1">Needed when screening happens the same day.</p>
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Obtained By ${iePasses ? '<span class="text-red-500">*</span>' : ''}</label>
                    <div id="cs-obtained-slot">
                        <input type="text" id="cs-obtained-name" maxlength="120" value="${esc(prev.obtainedByName ?? '')}"
                            placeholder="Investigator/delegate who conducted the consent discussion"
                            class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Language</label>
                    <select id="cs-language" class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        ${['Indonesian','English','Other'].map(l => `<option ${(prev.language ?? 'Indonesian') === l ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Witness Name <span class="font-normal normal-case text-slate-400">(if applicable)</span></label>
                    <input type="text" id="cs-witness" maxlength="120" value="${esc(prev.witnessName ?? '')}" placeholder="Name of witness"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none"
                        oninput="document.getElementById('cs-witness-type-wrap').classList.toggle('hidden', !this.value.trim())">
                </div>
                <div class="col-span-2 ${prev.witnessName ? '' : 'hidden'}" id="cs-witness-type-wrap">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Witness Capacity <span class="text-red-500">*</span></label>
                    <select id="cs-witness-type" class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select capacity —</option>
                        ${['Impartial Witness (Illiterate Subject)','Legally Authorized Representative','Parent / Guardian']
                            .map(w => `<option ${prev.witnessType === w ? 'selected' : ''}>${w}</option>`).join('')}
                    </select>
                </div>
                <div class="col-span-2 space-y-2.5 p-3 rounded-md border border-slate-200 bg-slate-50">
                    <label class="flex items-start gap-2.5 cursor-pointer">
                        <input type="checkbox" id="cs-copy" ${prev.copyProvided ? 'checked' : ''} class="mt-0.5 w-4 h-4 rounded border-slate-300">
                        <span class="text-xs text-slate-700"><span class="font-semibold">Signed ICF copy given to the subject</span>
                        <span class="block text-slate-400">ICH GCP §4.8.11 — required.</span></span>
                    </label>
                    <label class="flex items-start gap-2.5 cursor-pointer">
                        <input type="checkbox" id="cs-assent" ${prev.assentObtained ? 'checked' : ''} class="mt-0.5 w-4 h-4 rounded border-slate-300"
                            onchange="document.getElementById('cs-assent-date-wrap').classList.toggle('hidden', !this.checked)">
                        <span class="text-xs text-slate-700"><span class="font-semibold">Assent obtained (minor / unable to fully consent)</span>
                        <span class="block text-slate-400">ICH GCP §4.8.12 — does not replace the guardian's consent.</span></span>
                    </label>
                    <div id="cs-assent-date-wrap" class="${prev.assentObtained ? '' : 'hidden'} pl-6">
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Assent Date</label>
                        <input type="date" id="cs-assent-date" max="${today}" value="${esc(prev.assentDate ?? '')}"
                            class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    </div>
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Notes <span class="font-normal normal-case text-slate-400">(optional)</span></label>
                    <textarea id="cs-notes" rows="2" class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">${esc(prev.notes ?? '')}</textarea>
                </div>
            </div>
            <div id="cs-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"></div>
        </form>`,
        footer: `
        <button onclick="openIECriteriaModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition flex items-center gap-1.5">
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Back
        </button>
        <button id="cs-next" disabled onclick="proceedFromConsent()" class="flex items-center gap-2 px-4 py-2 text-sm btn-primary rounded-md">
            Next: Demographics <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </button>`,
    });

    // Swap the free-text consent taker for a delegated-staff picker once the
    // Delegation Log loads (ICH GCP E6(R3) §4.1.5). The text input stays as the
    // fallback so an empty Delegation Log does not block enrolment.
    api.getConsentDelegates().then(info => {
        const slot = document.getElementById('cs-obtained-slot');
        const nextButton = document.getElementById('cs-next');
        if (nextButton) nextButton.disabled = false;
        const delegates = info?.delegates ?? [];
        if (!slot || !delegates.length) return;
        const me = api.getCurrentUser();
        const preselect = prev.obtainedBy ?? me?.id;
        slot.innerHTML = `
            <select id="cs-obtained-by" class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                <option value="">— Select staff —</option>
                ${delegates.map(d =>
                    `<option value="${esc(d.userId)}" data-name="${esc(d.userName)}" ${d.userId === preselect ? 'selected' : ''}>${esc(d.userName)} — ${esc(d.userRole)}</option>`
                ).join('')}
            </select>
            <p class="text-xs text-slate-400 mt-1">Only staff delegated for "Informed Consent Process".</p>`;
    }).catch(() => {
        const error = document.getElementById('cs-error');
        if (error) {
            error.textContent = 'Consent delegation could not be loaded. Go back and reopen this step to try again.';
            error.classList.remove('hidden');
        }
    });
};

window.proceedFromConsent = function () {
    if (document.getElementById('cs-next')?.disabled) return;
    const iePasses = window._iePasses !== false;
    const errEl = document.getElementById('cs-error');
    errEl.classList.add('hidden');

    const consentVersion = document.getElementById('cs-version').value.trim();
    const consentDate    = document.getElementById('cs-date').value;
    const consentTime    = document.getElementById('cs-time').value;
    const language       = document.getElementById('cs-language').value;
    const witnessName    = document.getElementById('cs-witness').value.trim();
    const witnessType    = document.getElementById('cs-witness-type').value;
    const notes          = document.getElementById('cs-notes').value.trim();

    const obtainedSel    = document.getElementById('cs-obtained-by');
    const obtainedBy     = obtainedSel?.value || null;
    const obtainedByName = obtainedSel
        ? (obtainedSel.options[obtainedSel.selectedIndex]?.dataset.name ?? '')
        : document.getElementById('cs-obtained-name').value.trim();

    const assentObtained = !!document.getElementById('cs-assent').checked;
    const assentDate     = assentObtained ? document.getElementById('cs-assent-date').value : null;
    const copyProvided   = !!document.getElementById('cs-copy').checked;

    const anyFilled = consentVersion || consentDate || witnessName || notes || obtainedByName;

    const fail = (msg) => { errEl.textContent = msg; errEl.classList.remove('hidden'); };

    // Enrolled subjects MUST have consent; screen failures only need it complete
    // if the coordinator started filling it in.
    if ((iePasses || anyFilled) && (!consentVersion || !consentDate)) {
        return fail(iePasses
            ? 'ICF version and consent date are required to enroll a subject.'
            : 'Provide both ICF version and consent date, or leave the consent fields empty.');
    }
    // The consent taker is part of the consent record, not an optional extra
    if ((iePasses || anyFilled) && !obtainedByName) {
        return fail('Record who conducted the consent discussion (ICH GCP E6(R3) §4.8).');
    }
    if (witnessName && !witnessType) {
        return fail('Select the witness capacity — impartial witness, legal representative, or parent/guardian.');
    }

    window._consentData = (consentVersion && consentDate)
        ? {
            consentVersion, consentDate,
            consentTime: consentTime || null,
            language,
            obtainedBy, obtainedByName,
            witnessName: witnessName || null,
            witnessType: witnessType || null,
            assentObtained, assentDate,
            copyProvided,
            notes,
          }
        : null;
    openSubjectDemographicsModal(iePasses);
};

async function openSubjectDemographicsModal(iePasses) {
    const sites = await api.getSites();
    const user  = api.getCurrentUser();
    const today = new Date().toISOString().split('T')[0];

    const failWarning = !iePasses ? `
    <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#FEF2F2;border-color:#FECACA;color:#991B1B">
        <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
        <strong>Screen Failure:</strong>&nbsp;Subject failed I/E criteria. They will be enrolled with status <strong>Screen Failed</strong> for documentation purposes per ICH GCP E6(R3) §8.3.
    </div>` : `
    <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#F0FDF4;border-color:#A7F3D0;color:#065F46">
        <i data-lucide="check-circle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
        All I/E criteria satisfied. Subject qualifies for enrollment.
    </div>`;

    showModal({
        title: 'Step 3 of 3 — Subject Demographics',
        size: 'md',
        body: `
        <form id="new-subject-form" class="space-y-4" novalidate>
            ${failWarning}
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Subject Code <span class="text-red-500">*</span></label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono">S-</span>
                        <input type="text" id="ns-code" placeholder="001" maxlength="20"
                            class="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none font-mono">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Patient Initials <span class="text-red-500">*</span></label>
                    <input type="text" id="ns-initial" placeholder="e.g. J.D." maxlength="10"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Sex at Birth <span class="text-red-500">*</span>
                        <span class="ml-1 font-normal normal-case text-slate-400">(CDISC SDTM)</span>
                    </label>
                    <select id="ns-sex"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select —</option>
                        <option value="M">M — Male</option>
                        <option value="F">F — Female</option>
                        <option value="U">U — Unknown</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Gender Identity
                        <span class="ml-1 font-normal normal-case text-slate-400">(optional)</span>
                    </label>
                    <select id="ns-gender-identity"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Prefer not to answer —</option>
                        <option value="Man">Man</option>
                        <option value="Woman">Woman</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Date of Birth <span class="text-red-500">*</span></label>
                    <input type="date" id="ns-dob" max="${today}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Enrollment Date (Day 1) <span class="text-red-500">*</span></label>
                    <input type="date" id="ns-enroll" value="${today}" max="${today}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Study Site <span class="text-red-500">*</span></label>
                    <select id="ns-site"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="">— Select Site —</option>
                        ${sites.map(s => `<option value="${s.id}" ${user.siteId === s.id ? 'selected' : ''}>${esc(s.site_code)} – ${esc(s.site_name)}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="ns-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"></div>
        </form>`,
        footer: `
        <button onclick="openConsentModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition flex items-center gap-1.5">
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Back
        </button>
        <button id="ns-submit" onclick="submitNewSubject()" class="px-4 py-2 text-sm btn-primary rounded-md">${iePasses ? 'Enroll Subject' : 'Record Screen Failure'}</button>`,
    });
}

window.submitNewSubject = async function () {
    if (enrollmentSaving || enrollmentNeedsReview) return;
    const codeRaw         = document.getElementById('ns-code').value.trim();
    const initial         = document.getElementById('ns-initial').value.trim();
    const sex             = document.getElementById('ns-sex').value;
    const gender_identity = document.getElementById('ns-gender-identity').value;
    const dob             = document.getElementById('ns-dob').value;
    const enroll          = document.getElementById('ns-enroll').value;
    const site_id         = document.getElementById('ns-site').value;
    const errEl           = document.getElementById('ns-error');

    errEl.classList.add('hidden');
    if (!codeRaw || !initial || !sex || !dob || !enroll || !site_id) {
        errEl.textContent = 'All fields marked * are required.';
        errEl.classList.remove('hidden');
        return;
    }
    const subject_code = codeRaw.startsWith('S-') ? codeRaw : `S-${codeRaw}`;
    const iePasses = window._iePasses !== false;

    enrollmentSaving = true;
    const submitButton = document.getElementById('ns-submit');
    if (submitButton) submitButton.disabled = true;
    try {
        const { subject: created, unconfirmed } = await saveEnrollment(api,
            { subject_code, initial, sex, gender_identity, dob, enrollment_date: enroll, site_id },
            { criteria: window._ieCriteriaResults, passed: iePasses, consent: window._consentData });
        enrollmentNeedsReview = true; // creation succeeded; never repeat it from this form
        if (unconfirmed.length) {
            showModal({
                title: 'Subject saved — follow-up records need review',
                body: `<div role="alert" class="space-y-3">
                    <p>Subject <strong>${esc(subject_code)}</strong> was created. Saving the ${esc(unconfirmed.join(' and '))} could not be confirmed.</p>
                    <p>Do not enroll this subject again. Review the existing subject and consent records with your study administrator before adding missing information.</p>
                    <p>The assessment answers remain in this tab until you start another enrollment or reload.</p>
                </div>`,
                footer: `<a href="#subjects/${encodeURIComponent(created.id)}" onclick="closeModal()" class="px-4 py-2 btn-primary rounded-md">Review saved subject</a>
                    <a href="#consents" onclick="closeModal()" class="px-4 py-2 border rounded-md">Review consent records</a>`,
            });
            return;
        }
        closeModal();
        window._ieCriteriaResults = null;
        window._iePasses = null;
        window._consentData = null;
        showToast(iePasses ? `Subject ${subject_code} enrolled successfully.` : `Subject ${subject_code} recorded as Screen Failed.`, iePasses ? 'success' : 'warning');
        try { await renderSubjects(); }
        catch { showToast('Subject saved, but the list could not be refreshed. Reload the list before making more changes.', 'error'); }
    } catch (err) {
        // A disconnected or failed server response does not prove creation failed.
        enrollmentNeedsReview = !err.status || err.status >= 500 || err.code === 'INVALID_RESPONSE';
        errEl.textContent = err.message + (enrollmentNeedsReview ? ' Review the subject list before starting another enrollment.' : '');
        errEl.classList.remove('hidden');
    } finally {
        enrollmentSaving = false;
        if (submitButton) submitButton.disabled = enrollmentNeedsReview;
    }
};

// ============================================================
// Subject Detail
// ============================================================
export async function renderSubjectDetail(id) {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const [subject, forms] = await Promise.all([
        api.getSubject(id),
        api.getCRFForms(),
    ]);
    const allEntries    = await api.getDataEntries(id);
    const user          = api.getCurrentUser();
    const canManageVisit = ['investigator', 'pi', 'admin', 'crc'].includes(user.role);

    content.innerHTML = `
    <div class="p-5 space-y-4">

        <!-- Subject Header -->
        <div class="ph-card p-5">
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style="background:#EBF2FD">
                    <i data-lucide="user" class="w-6 h-6" style="color:#1554A0"></i>
                </div>
                <div class="flex-1">
                    <div class="flex items-center gap-3 flex-wrap mb-1">
                        <h2 class="text-xl font-bold text-slate-900 font-mono">${esc(subject.subject_code)}</h2>
                        ${statusBadge(subject.status)}
                    </div>
                    <div class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        <span>Initials: <strong class="text-slate-700">${esc(subject.initial)}</strong></span>
                        <span>Sex: <strong class="text-slate-700">${subject.sex === 'M' ? 'Male' : subject.sex === 'F' ? 'Female' : 'Unknown'}</strong></span>
                        ${subject.gender_identity ? `<span>Gender: <strong class="text-slate-700">${esc(subject.gender_identity)}</strong></span>` : ''}
                        <span>DOB: <strong class="text-slate-700">${fmt(subject.dob)}</strong></span>
                        <span>Site: <strong class="text-slate-700">${esc(subject.site_name)}</strong></span>
                        <span>Enrollment (Day 1): <strong class="text-slate-700">${fmt(subject.enrollment_date)}</strong></span>
                    </div>
                </div>
                ${['admin', 'pi', 'investigator'].includes(user.role) && subject.status === 'Active' ? `
                <button onclick="openWithdrawModal(${subject.id})"
                    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-md transition">
                    <i data-lucide="user-x" class="w-3.5 h-3.5"></i> Withdraw
                </button>` : ''}
            </div>
        </div>

        <!-- Protocol Visit Schedule -->
        <div class="ph-card overflow-hidden">
            <div class="ph-card-header" style="display:flex;align-items:center;justify-content:space-between">
                <h3 style="display:flex;align-items:center;gap:8px;margin:0">
                    <i data-lucide="calendar-check" class="w-4 h-4 text-slate-400"></i>
                    Protocol Visit Schedule
                    <span class="text-xs font-normal text-slate-400">(${subject.visits.length} visit${subject.visits.length !== 1 ? 's' : ''})</span>
                </h3>
                ${canManageVisit ? `
                <button onclick="openAddVisitModal()"
                    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-primary rounded-md">
                    <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Visit
                </button>` : ''}
            </div>

            ${subject.visits.length === 0 ? `
            <div class="py-16 text-center text-slate-400 text-sm">
                <i data-lucide="calendar-off" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                <p class="font-medium text-slate-500">No visits scheduled.</p>
                ${canManageVisit ? '<p class="mt-1 text-xs">Use "Add Visit" to schedule the first protocol visit for this subject.</p>' : ''}
            </div>` : `
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="ph-table-head">
                        <tr>
                            <th class="text-center" style="width:36px">#</th>
                            <th class="text-left">Visit Name / Type</th>
                            <th class="text-left">Planned Date</th>
                            <th class="text-left">Actual Date</th>
                            <th class="text-center">Study Day</th>
                            <th class="text-left">Window Compliance</th>
                            <th class="text-left">Status</th>
                            <th class="text-center">CRFs</th>
                            <th class="text-center">Investigator Signed</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="visit-tbody" class="ph-table-body">
                        ${subject.visits.map(v => renderVisitRow(v, forms, allEntries, canManageVisit)).join('')}
                    </tbody>
                </table>
            </div>`}
        </div>

        <!-- CRF Forms Panel (hidden until visit selected) -->
        <div id="crf-panel" class="hidden ph-card overflow-hidden">
            <div class="ph-card-header" style="display:flex;align-items:center;justify-content:space-between">
                <h3 style="display:flex;align-items:center;gap:8px;margin:0">
                    <i data-lucide="file-text" class="w-4 h-4 text-slate-400"></i>
                    <span id="crf-panel-title">CRF Forms</span>
                </h3>
                <button onclick="closeCRFPanel()"
                    class="p-1 text-slate-400 hover:text-slate-600 rounded transition">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div id="crf-panel-body"></div>
        </div>

        <!-- Subject-level Data Lock (ICH GCP E6(R3) 8.3.3) -->
        ${['admin', 'pi', 'cra', 'data_manager'].includes(user.role) ? `
        <div class="ph-card overflow-hidden">
            <div class="ph-card-header" style="display:flex;align-items:center;justify-content:space-between">
                <h3 style="display:flex;align-items:center;gap:8px;margin:0">
                    <i data-lucide="lock" class="w-4 h-4 text-slate-400"></i>
                    Subject Data Lock
                    <span class="text-xs font-normal text-slate-400">ICH GCP E6(R3) §8.3.3</span>
                </h3>
                <div class="flex gap-2">
                    <button onclick="openSubjectLockModal(false)"
                        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded-md transition">
                        <i data-lucide="lock" class="w-3 h-3"></i> Lock All
                    </button>
                    ${user.role === 'admin' ? `
                    <button onclick="openSubjectLockModal(true)"
                        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-300 hover:bg-amber-50 rounded-md transition">
                        <i data-lucide="lock-open" class="w-3 h-3"></i> Unlock All
                    </button>` : ''}
                </div>
            </div>
            <div id="subject-lock-status" class="p-4 text-sm text-slate-400">Loading…</div>
        </div>` : ''}

        <!-- Recent Activity -->
        <div class="ph-card overflow-hidden">
            <div class="ph-card-header">
                <h3><i data-lucide="shield-check" class="w-4 h-4 text-slate-400"></i> Recent Activity</h3>
                <a href="#audit" class="text-xs text-blue-600 hover:underline">Full Audit Trail →</a>
            </div>
            <div id="subject-audit" class="p-4 text-sm text-slate-400">Loading…</div>
        </div>
    </div>`;

    lucide.createIcons();

    // Subject lock status (async, non-blocking)
    if (['admin', 'pi', 'cra', 'data_manager'].includes(user.role)) {
        api.getSubjectLockStatus(id).then(data => {
            const el = document.getElementById('subject-lock-status');
            if (!el) return;
            el.innerHTML = renderSubjectLockStatus(data);
            lucide.createIcons();
        }).catch(() => {
            const el = document.getElementById('subject-lock-status');
            if (el) el.innerHTML = '<p class="text-xs text-slate-400">Unable to load lock status.</p>';
        });
    }

    // Audit trail (async, non-blocking)
    api.getAuditTrail().then(trails => {
        const auditEl = document.getElementById('subject-audit');
        if (!auditEl) return;
        const recent = trails.slice(0, 5);
        auditEl.innerHTML = recent.length === 0
            ? '<p class="text-center py-4 text-slate-400 text-sm">No activity recorded.</p>'
            : `<div class="overflow-x-auto"><table class="min-w-full"><tbody class="ph-table-body">
                ${recent.map(t => `
                <tr>
                    <td class="py-2 pr-3"><span class="badge ${auditBadge(t.action)}">${esc(t.action)}</span></td>
                    <td class="py-2 pr-3 text-xs text-slate-600">${esc(t.reason_for_change || '—')}</td>
                    <td class="py-2 text-xs text-slate-400 whitespace-nowrap">${esc(t.user_name)} · ${new Date(t.timestamp).toLocaleString('en-GB')}</td>
                </tr>`).join('')}
               </tbody></table></div>`;
        lucide.createIcons();
    });

    // Module-level state for modals
    window._currentSubject = subject;
    window._availableForms = forms;
    window._allEntries     = allEntries;
    window._subjectId      = Number(id);

    // ── Select Visit → Show CRF Panel ─────────────────────────
    window.selectVisit = function (visitId, visitName) {
        document.querySelectorAll('.visit-row').forEach(r => {
            r.classList.toggle('bg-blue-50', r.dataset.visitId === String(visitId));
        });

        const panelEl = document.getElementById('crf-panel');
        const titleEl = document.getElementById('crf-panel-title');
        const bodyEl  = document.getElementById('crf-panel-body');
        const entries = (window._allEntries || []).filter(e => e.visit_id === Number(visitId));
        const u       = api.getCurrentUser();

        // Filter forms to only those assigned to this visit; fallback to all if none assigned
        const visit     = (window._currentSubject?.visits || []).find(v => v.id === Number(visitId));
        const assignedIds = visit?.form_ids?.length ? visit.form_ids : null;
        const allForms  = window._availableForms || [];
        const fms       = assignedIds ? allForms.filter(f => assignedIds.includes(f.id)) : allForms;

        titleEl.textContent = `${visitName} — Case Report Forms`;
        panelEl.classList.remove('hidden');

        const ENTRY_BADGE = {
            Locked:        'badge badge-locked',
            Signed:        'badge bg-violet-100 text-violet-700 border border-violet-300',
            Submitted:     'badge badge-saved',
            Draft:         'badge badge-draft',
            'Not Started': 'badge bg-slate-100 text-slate-500',
        };

        if (fms.length === 0) {
            bodyEl.innerHTML = `
            <div class="py-10 text-center text-slate-400 text-sm">
                <i data-lucide="clipboard-x" class="w-8 h-8 mx-auto mb-2 opacity-30"></i>
                <p class="font-medium text-slate-500">No CRF forms assigned to this visit.</p>
                <p class="text-xs mt-1">Assign forms via Visit Templates or the visit settings.</p>
            </div>`;
            lucide.createIcons();
            panelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        bodyEl.innerHTML = `<div class="overflow-x-auto">
        <table class="min-w-full">
            <thead class="ph-table-head"><tr>
                <th class="text-left">CRF Form</th>
                <th class="text-left">Version</th>
                <th class="text-left">Status</th>
                <th class="text-left">Last Modified</th>
                <th class="text-right">Actions</th>
            </tr></thead>
            <tbody class="ph-table-body">
            ${fms.map(form => {
                const entry       = entries.find(e => e.form_id === form.id);
                const entryStatus = entry?.status || 'Not Started';
                const canEdit     = entryStatus !== 'Locked' && entryStatus !== 'Signed' && ['investigator', 'pi', 'admin', 'crc'].includes(u.role);
                const canLock     = (entryStatus === 'Submitted' || entryStatus === 'Signed') && ['cra', 'pi', 'admin'].includes(u.role);
                return `<tr>
                    <td>
                        <div class="flex items-center gap-2.5">
                            <div class="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style="background:#EBF2FD">
                                <i data-lucide="file-text" class="w-3.5 h-3.5" style="color:#1554A0"></i>
                            </div>
                            <span class="text-sm font-medium text-slate-800">${esc(form.form_name)}</span>
                        </div>
                    </td>
                    <td class="text-xs text-slate-400 font-mono">v${esc(form.version)}</td>
                    <td><span class="${ENTRY_BADGE[entryStatus] || 'badge bg-slate-100 text-slate-500'}">${esc(entryStatus)}</span></td>
                    <td class="text-xs text-slate-400">${entry?.updated_at ? fmt(entry.updated_at) : '—'}</td>
                    <td class="text-right">
                        <div class="flex items-center justify-end gap-2">
                        ${canEdit ? `
                        <a href="#subjects/${window._subjectId}/visits/${visitId}/forms/${form.id}"
                            class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold btn-primary rounded-md">
                            <i data-lucide="${entry ? 'edit-2' : 'plus'}" class="w-3.5 h-3.5"></i>
                            ${entry ? 'Edit' : 'Enter Data'}
                        </a>` : ''}
                        ${canLock && entry ? `
                        <button onclick="openLockModal(${entry.id}, ${window._subjectId})"
                            class="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition">
                            <i data-lucide="lock" class="w-3.5 h-3.5"></i> Lock
                        </button>` : ''}
                        ${entryStatus === 'Locked' ? `
                        <span class="inline-flex items-center gap-1 text-xs text-slate-400">
                            <i data-lucide="lock" class="w-3 h-3"></i> Locked
                        </span>` : ''}
                        ${entryStatus === 'Not Started' && !canEdit ? `
                        <span class="text-xs text-slate-400">No data entered</span>` : ''}
                        </div>
                    </td>
                </tr>`;
            }).join('')}
            </tbody>
        </table></div>`;
        lucide.createIcons();
        panelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    window.closeCRFPanel = function () {
        document.getElementById('crf-panel')?.classList.add('hidden');
        document.querySelectorAll('.visit-row').forEach(r => r.classList.remove('bg-blue-50'));
    };
}

function renderVisitRow(v, forms, allEntries, canManageVisit) {
    const visitEntries   = allEntries.filter(e => e.visit_id === v.id);
    const visitForms     = v.form_ids?.length ? forms.filter(f => v.form_ids.includes(f.id)) : forms;
    const completedCount = visitEntries.filter(e => (e.status === 'Submitted' || e.status === 'Locked') && visitForms.some(f => f.id === e.form_id)).length;
    const total          = visitForms.length;
    const crfColor       = completedCount === 0
        ? 'text-slate-400'
        : completedCount === total
            ? 'text-emerald-600 font-semibold'
            : 'text-amber-600 font-semibold';

    const orderStr = v.visit_order != null ? String(v.visit_order).padStart(2, '0') : '—';
    const isUnsch  = v.visit_type === 'Unscheduled';
    const isAdmin  = api.getCurrentUser()?.role === 'admin';

    return `
    <tr class="visit-row cursor-pointer hover:bg-slate-50 transition" data-visit-id="${v.id}"
        onclick="selectVisit(${v.id}, '${esc(v.visit_name)}')">
        <td class="text-xs text-slate-400 font-mono text-center">${orderStr}</td>
        <td>
            <p class="text-sm font-semibold text-slate-800">${esc(v.visit_name)}</p>
            <span class="text-xs px-1.5 py-0.5 rounded font-medium ${isUnsch ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}">
                ${isUnsch ? 'Unscheduled' : 'Scheduled'}
            </span>
        </td>
        <td class="text-xs text-slate-600 whitespace-nowrap">${fmt(v.planned_date)}</td>
        <td class="text-xs text-slate-600 whitespace-nowrap">${fmt(v.actual_date)}</td>
        <td class="text-center">
            ${v.study_day != null
                ? `<span class="text-xs font-mono font-semibold ${v.study_day < 0 ? 'text-amber-600' : 'text-slate-700'}">Day ${v.study_day}</span>`
                : '<span class="text-xs text-slate-300">—</span>'}
        </td>
        <td>${v.actual_date ? complianceBadge(v.window_compliance) : '<span class="text-xs text-slate-300">—</span>'}</td>
        <td>${statusBadge(v.status, VISIT_STATUS_BADGE)}</td>
        <td class="text-center">
            <span class="text-xs ${crfColor}">${completedCount} / ${total}</span>
        </td>
        <td class="text-center" onclick="event.stopPropagation()" title="${v.investigator_signed ? `Signed by ${esc(v.investigator_signed_by_name || '')} on ${fmt(v.investigator_signed_at)}` : ''}">
            ${v.investigator_signed
                ? `<span class="badge bg-emerald-50 text-emerald-700 inline-flex items-center gap-1"><i data-lucide="check-circle-2" class="w-3 h-3"></i> Signed</span>`
                : `<span class="badge bg-slate-100 text-slate-500">Unsigned</span>`}
            ${v.investigator_signed && isAdmin ? `
            <button onclick="openUnsignVisitModal(${v.id}, '${esc(v.visit_name)}')"
                class="ml-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 underline">Unsign</button>` : ''}
        </td>
        <td class="text-right" onclick="event.stopPropagation()">
            <div class="flex items-center justify-end gap-1.5">
                <button onclick="selectVisit(${v.id}, '${esc(v.visit_name)}')"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition border border-blue-100">
                    <i data-lucide="clipboard-list" class="w-3 h-3"></i> CRFs
                </button>
                ${canManageVisit && !v.investigator_signed ? `
                <button onclick="openEditVisitModal(${v.id})"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
                    <i data-lucide="edit-2" class="w-3 h-3"></i>
                </button>
                <button onclick="openDeleteVisitModal(${v.id}, '${esc(v.visit_name)}')"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition border border-red-100">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                </button>` : ''}
            </div>
        </td>
    </tr>
    ${v.status === 'Missed' && v.missed_reason ? `
    <tr class="bg-red-50">
        <td colspan="10" class="px-4 py-1.5 text-xs text-red-600 italic border-t border-red-100">
            <i data-lucide="alert-circle" class="w-3 h-3 inline mr-1 align-text-bottom"></i>Missed: ${esc(v.missed_reason)}
        </td>
    </tr>` : ''}`;
}

// ============================================================
// Add Visit Modal
// ============================================================
window.openAddVisitModal = function () {
    const subject = window._currentSubject;
    if (!subject) return;

    const today = new Date().toISOString().split('T')[0];
    const tplOptions = VISIT_TEMPLATES.map(t => {
        if (t.code === 'CUS') return `<option value="CUS">Custom Visit (enter name manually)…</option>`;
        if (t.code === 'UNS') return `<option value="UNS">Unscheduled Visit</option>`;
        return `<option value="${t.code}">${t.code} — ${t.name}  (Day ${t.study_day >= 0 ? '+' : ''}${t.study_day}, ±${t.window_days}d)</option>`;
    }).join('');

    showModal({
        title: 'Add Protocol Visit',
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-2.5 p-3 rounded-md border text-xs" style="background:#EBF2FD;border-color:#BFD7F5;color:#1554A0">
                <i data-lucide="info" class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:#1554A0"></i>
                Select a protocol visit template. Planned dates are auto-calculated from the subject&#39;s enrollment date (Day 1 = ${fmt(subject.enrollment_date)}). All entries are audit-logged per ICH GCP E6 (R3).
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Protocol Visit Template <span class="text-red-500">*</span></label>
                <select id="av-template" onchange="applyVisitTemplate('${subject.enrollment_date}')"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                    <option value="">— Select Visit —</option>
                    ${tplOptions}
                </select>
            </div>

            <div id="av-name-row" class="hidden">
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Visit Name <span class="text-red-500">*</span></label>
                <input type="text" id="av-name" placeholder="e.g. Safety Follow-up Week 16"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Visit Type</label>
                    <select id="av-type"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="Scheduled">Scheduled</option>
                        <option value="Unscheduled">Unscheduled</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Window Tolerance (±days)</label>
                    <input type="number" id="av-window" min="0" max="30" placeholder="0"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    <p class="text-xs text-slate-400 mt-1">Protocol-defined acceptable deviation from planned date.</p>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Planned Visit Date</label>
                    <input type="date" id="av-planned"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    <p class="text-xs text-slate-400 mt-1">Auto-calculated from study day. Adjust if needed.</p>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Actual Visit Date</label>
                    <input type="date" id="av-actual" max="${today}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                    <p class="text-xs text-slate-400 mt-1">Leave blank if visit has not yet occurred.</p>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Visit Status <span class="text-red-500">*</span></label>
                    <select id="av-status" onchange="toggleMissedReason()"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="Scheduled">Scheduled (upcoming)</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Complete">Complete</option>
                        <option value="Missed">Missed</option>
                    </select>
                </div>
                <div></div>
            </div>

            <div id="av-missed-row" class="hidden">
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason Visit Was Missed <span class="text-red-500">*</span></label>
                <textarea id="av-missed-reason" rows="2"
                    placeholder="Document clinical reason per GCP requirements (e.g., Subject withdrew consent, Subject hospitalised)…"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Assign CRF Forms</label>
                ${(() => {
                    const availForms = window._availableForms || [];
                    if (!availForms.length) return `<p class="text-xs text-slate-400 italic">No active CRF forms available. Create forms in Form Builder first.</p>`;
                    return `<div class="border border-slate-200 rounded-md overflow-hidden divide-y divide-slate-100 max-h-36 overflow-y-auto">
                        ${availForms.map(f => `
                        <label class="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
                            <input type="checkbox" name="av-form" value="${f.id}" class="rounded border-slate-300 text-blue-600">
                            <span class="flex-1 text-slate-700">${esc(f.form_name)}</span>
                            <span class="text-xs text-slate-400 font-mono">v${esc(f.version)}</span>
                        </label>`).join('')}
                    </div>
                    <p class="text-xs text-slate-400 mt-1">Leave all unchecked to show all available forms for this visit.</p>`;
                })()}
            </div>

            <div id="av-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"></div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitAddVisit()"
            class="px-4 py-2 text-sm font-semibold btn-primary rounded-md flex items-center gap-2">
            <i data-lucide="calendar-plus" class="w-4 h-4"></i> Add Visit
        </button>`,
    });
};

window.applyVisitTemplate = function (enrollmentDate) {
    const code = document.getElementById('av-template').value;
    const tpl  = VISIT_TEMPLATES.find(t => t.code === code);
    if (!tpl) return;

    const nameRow = document.getElementById('av-name-row');
    const typeEl  = document.getElementById('av-type');
    const winEl   = document.getElementById('av-window');
    const planEl  = document.getElementById('av-planned');

    if (code === 'CUS') {
        nameRow.classList.remove('hidden');
        typeEl.value = 'Scheduled';
        winEl.value  = '';
        planEl.value = '';
        return;
    }
    nameRow.classList.add('hidden');
    typeEl.value = tpl.type || 'Scheduled';
    winEl.value  = tpl.window_days != null ? tpl.window_days : '';
    planEl.value = (tpl.study_day != null && enrollmentDate)
        ? plannedFromStudyDay(enrollmentDate, tpl.study_day)
        : '';
};

window.toggleMissedReason = function () {
    const status  = document.getElementById('av-status')?.value;
    const missRow = document.getElementById('av-missed-row');
    if (missRow) missRow.classList.toggle('hidden', status !== 'Missed');
};

window.submitAddVisit = async function () {
    const subject = window._currentSubject;
    const errEl   = document.getElementById('av-error');
    errEl.classList.add('hidden');

    const code    = document.getElementById('av-template').value;
    const tpl     = VISIT_TEMPLATES.find(t => t.code === code);
    const nameIn  = document.getElementById('av-name')?.value.trim();
    const type    = document.getElementById('av-type').value;
    const winVal  = document.getElementById('av-window').value;
    const planned = document.getElementById('av-planned').value;
    const actual  = document.getElementById('av-actual').value;
    const status  = document.getElementById('av-status').value;
    const missedR = document.getElementById('av-missed-reason')?.value.trim();

    if (!code) {
        errEl.textContent = 'Please select a visit template.';
        errEl.classList.remove('hidden');
        return;
    }
    if (code === 'CUS' && !nameIn) {
        errEl.textContent = 'Visit name is required for custom visits.';
        errEl.classList.remove('hidden');
        return;
    }
    if (status === 'Missed' && !missedR) {
        errEl.textContent = 'Reason is required when visit status is Missed (ICH GCP E6 R3 requirement).';
        errEl.classList.remove('hidden');
        return;
    }

    const visit_name  = code === 'CUS' ? nameIn : (tpl?.name || 'Unscheduled Visit');
    const visit_order = tpl?.order ?? 99;
    const formIds     = [...document.querySelectorAll('input[name="av-form"]:checked')]
                            .map(el => Number(el.value));

    try {
        const result = await api.createVisit(subject.id, {
            visit_name,
            visit_order,
            visit_type:   type,
            planned_date: planned || null,
            actual_date:  actual  || null,
            window_days:  winVal !== '' ? Number(winVal) : null,
            status,
            missed_reason: missedR || null,
            formIds,
        });
        closeModal();
        if (result?.autoDeviationFiled) {
            showToast(`Visit "${visit_name}" added — out-of-window detected. Protocol deviation auto-filed.`, 'warning');
        } else {
            showToast(`Visit "${visit_name}" added to schedule.`, 'success');
        }
        await renderSubjectDetail(subject.id);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    }
};

// ============================================================
// Edit Visit Modal
// ============================================================
window.openEditVisitModal = function (visitId) {
    const subject = window._currentSubject;
    const v = subject?.visits?.find(vis => vis.id === visitId);
    if (!v) return;
    if (v.investigator_signed) {
        showToast('Visit is signed and cannot be edited. An admin must unsign it first.', 'error');
        return;
    }

    const today    = new Date().toISOString().split('T')[0];
    const isMissed = v.status === 'Missed';
    const canSign  = ['investigator', 'pi', 'admin'].includes(api.getCurrentUser()?.role);
    // First-time data entry (this scheduled visit has no actual date yet) is an
    // initial entry, not a change — 21 CFR Part 11 reason-for-change applies only
    // when modifying already-recorded data. The audit trail still logs it.
    const isFirstEntry = !v.actual_date;

    // Set context for inline query buttons
    window._inlineQueryCtx = { subjectId: subject.id, visitId, entryId: null, formId: null };

    const qBtn = (key, label) => `<button type="button"
        onclick="openInlineQueryModal('${key}', '${label.replace(/'/g, '&#39;')}')"
        title="Raise a query on this field"
        class="inline-flex items-center justify-center w-4 h-4 rounded-full text-slate-300 hover:text-orange-500 hover:bg-orange-50 transition ml-1 border border-transparent hover:border-orange-200 flex-shrink-0">
        <i data-lucide="message-circle" class="w-3 h-3"></i>
    </button>`;

    showModal({
        title: `${isFirstEntry ? 'Record Visit' : 'Edit Visit'} — ${v.visit_name}`,
        size: 'lg',
        body: `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <div class="flex items-center mb-1.5">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Visit Name <span class="text-red-500">*</span></label>
                        ${qBtn('visit_name', 'Visit Name')}
                    </div>
                    <input type="text" id="ev-name" value="${esc(v.visit_name)}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <div class="flex items-center mb-1.5">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Visit Type</label>
                        ${qBtn('visit_type', 'Visit Type')}
                    </div>
                    <select id="ev-type"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="Scheduled" ${v.visit_type === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="Unscheduled" ${v.visit_type === 'Unscheduled' ? 'selected' : ''}>Unscheduled</option>
                    </select>
                </div>
                <div>
                    <div class="flex items-center mb-1.5">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Window Tolerance (±days)</label>
                        ${qBtn('window_tolerance', 'Window Tolerance (±days)')}
                    </div>
                    <input type="number" id="ev-window" min="0" value="${v.window_days ?? ''}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <div class="flex items-center mb-1.5">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Planned Visit Date</label>
                        ${qBtn('planned_date', 'Planned Visit Date')}
                    </div>
                    <input type="date" id="ev-planned" value="${v.planned_date || ''}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <div class="flex items-center mb-1.5">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Actual Visit Date</label>
                        ${qBtn('actual_date', 'Actual Visit Date')}
                    </div>
                    <input type="date" id="ev-actual" value="${v.actual_date || ''}" max="${today}"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none">
                </div>
                <div>
                    <div class="flex items-center mb-1.5">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Visit Status <span class="text-red-500">*</span></label>
                        ${qBtn('visit_status', 'Visit Status')}
                    </div>
                    <select id="ev-status" onchange="toggleEditMissedReason()"
                        class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none bg-white">
                        <option value="Scheduled"   ${v.status === 'Scheduled'    ? 'selected' : ''}>Scheduled</option>
                        <option value="In Progress" ${v.status === 'In Progress'  ? 'selected' : ''}>In Progress</option>
                        <option value="Complete"    ${v.status === 'Complete'     ? 'selected' : ''}>Complete</option>
                        <option value="Missed"      ${v.status === 'Missed'       ? 'selected' : ''}>Missed</option>
                    </select>
                </div>
                <div></div>
            </div>

            <div id="ev-missed-row" class="${isMissed ? '' : 'hidden'}">
                <div class="flex items-center mb-1.5">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Reason Visit Was Missed <span class="text-red-500">*</span></label>
                    ${qBtn('missed_reason', 'Reason Visit Was Missed')}
                </div>
                <textarea id="ev-missed-reason" rows="2"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none">${esc(v.missed_reason || '')}</textarea>
            </div>

            ${canSign ? `
            <div class="p-3 rounded-md border" style="background:#F0FDF4;border-color:#BBF7D0">
                <label class="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" id="ev-signed" class="mt-0.5 rounded border-slate-300 text-emerald-600">
                    <span>
                        <span class="text-sm font-semibold" style="color:#065F46">Investigator Signed</span>
                        <p class="text-xs mt-0.5" style="color:#047857">Check this only once the visit data is final — this locks the visit and prevents further changes. An admin must unsign it to make any edits after that.</p>
                    </span>
                </label>
            </div>` : ''}

            ${isFirstEntry ? `
            <div class="p-3 rounded-md border text-xs" style="background:#F0FDF4;border-color:#BBF7D0;color:#065F46">
                <i data-lucide="info" class="w-3.5 h-3.5 inline mr-1 align-text-bottom"></i>
                First-time entry — no change reason needed. This entry is still recorded in the audit trail.
            </div>` : `
            <div class="p-3 rounded-md border" style="background:#FFF7ED;border-color:#FED7AA">
                <label class="block text-xs font-semibold mb-1.5" style="color:#9A3412">Reason for Change <span class="text-red-500">*</span></label>
                <input type="text" id="ev-reason"
                    placeholder="Required per FDA 21 CFR Part 11 — document why this record is being updated"
                    class="w-full px-3 py-2.5 border border-orange-200 rounded-md text-sm outline-none" style="background:#fff">
                <p class="text-xs mt-1" style="color:#C2410C">This justification will be permanently stored in the audit trail.</p>
            </div>`}

            <div id="ev-window-preview" class="hidden p-2.5 rounded-md border text-xs font-medium"></div>
            <div id="ev-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"></div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="submitEditVisit(${visitId})"
            class="px-4 py-2 text-sm font-semibold btn-primary rounded-md flex items-center gap-2">
            <i data-lucide="save" class="w-4 h-4"></i> Save Changes
        </button>`,
    });
};

// Live compliance preview in edit-visit modal
function updateWindowPreview() {
    const preview  = document.getElementById('ev-window-preview');
    if (!preview) return;
    const planned  = document.getElementById('ev-planned')?.value;
    const actual   = document.getElementById('ev-actual')?.value;
    const winVal   = document.getElementById('ev-window')?.value;
    if (!planned || !actual) { preview.classList.add('hidden'); return; }
    const p    = new Date(planned); p.setHours(0, 0, 0, 0);
    const a    = new Date(actual);  a.setHours(0, 0, 0, 0);
    const diff = Math.round((a - p) / 86400000);
    const win  = winVal !== '' && winVal != null ? parseInt(winVal) : 0;
    let label, bg, border, color;
    if (diff === 0) {
        label = 'On Schedule'; bg = '#D1FAE5'; border = '#A7F3D0'; color = '#065F46';
    } else if (Math.abs(diff) <= win) {
        label = diff < 0 ? `Early (${Math.abs(diff)}d) — Within Window` : `Late (+${diff}d) — Within Window`;
        bg = '#FEF3C7'; border = '#FDE68A'; color = '#92400E';
    } else {
        label = diff < 0 ? `Early (${Math.abs(diff)}d) — OUT OF WINDOW ⚠ deviation will be auto-filed`
                         : `Late (+${diff}d) — OUT OF WINDOW ⚠ deviation will be auto-filed`;
        bg = '#FEE2E2'; border = '#FECACA'; color = '#991B1B';
    }
    preview.textContent = label;
    preview.style.cssText = `background:${bg};border-color:${border};color:${color}`;
    preview.classList.remove('hidden');
}

// Attach live preview listeners after modal DOM is ready
setTimeout(() => {
    ['ev-planned', 'ev-actual', 'ev-window'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', updateWindowPreview);
        document.getElementById(id)?.addEventListener('input',  updateWindowPreview);
    });
    updateWindowPreview();
}, 0);

window.toggleEditMissedReason = function () {
    const status  = document.getElementById('ev-status')?.value;
    const missRow = document.getElementById('ev-missed-row');
    if (missRow) missRow.classList.toggle('hidden', status !== 'Missed');
};

window.submitEditVisit = async function (visitId) {
    const errEl   = document.getElementById('ev-error');
    errEl.classList.add('hidden');

    const name    = document.getElementById('ev-name').value.trim();
    const type    = document.getElementById('ev-type').value;
    const winVal  = document.getElementById('ev-window').value;
    const planned = document.getElementById('ev-planned').value;
    const actual  = document.getElementById('ev-actual').value;
    const status  = document.getElementById('ev-status').value;
    const missedR = document.getElementById('ev-missed-reason')?.value.trim();
    // The reason field only exists when modifying already-recorded data; a
    // first-time entry has no reason field and needs none (audit still logs it).
    const reasonEl  = document.getElementById('ev-reason');
    const reason    = reasonEl ? reasonEl.value.trim() : '';
    const wantsSign = document.getElementById('ev-signed')?.checked ?? false;

    if (!name) {
        errEl.textContent = 'Visit name is required.';
        errEl.classList.remove('hidden');
        return;
    }
    if (reasonEl && !reason) {
        errEl.textContent = 'Reason for change is required (FDA 21 CFR Part 11).';
        errEl.classList.remove('hidden');
        return;
    }
    if (status === 'Missed' && !missedR) {
        errEl.textContent = 'Missed reason is required per ICH GCP E6 (R3).';
        errEl.classList.remove('hidden');
        return;
    }

    try {
        const result = await api.updateVisit(visitId, {
            visit_name:   name,
            visit_type:   type,
            planned_date: planned || null,
            actual_date:  actual  || null,
            window_days:  winVal !== '' ? Number(winVal) : null,
            status,
            missed_reason: missedR || null,
            _reason:       reason,
        });

        if (wantsSign) {
            await api.signVisit(visitId);
        }

        closeModal();
        if (result?.autoDeviationFiled) {
            showToast('Visit updated — out-of-window detected. Protocol deviation auto-filed.', 'warning');
        } else if (wantsSign) {
            showToast('Visit updated and signed. Visit is now locked from further edits.', 'success');
        } else {
            showToast('Visit updated. Change recorded in audit trail.', 'success');
        }
        await renderSubjectDetail(window._subjectId);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    }
};

// ============================================================
// Delete Visit Modal
// ============================================================
window.openDeleteVisitModal = function (visitId, visitName) {
    showModal({
        title: 'Delete Visit',
        size: 'sm',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-3 p-3 bg-red-50 rounded-md border border-red-200">
                <i data-lucide="alert-triangle" class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"></i>
                <div>
                    <p class="text-sm font-semibold text-red-700">Delete visit <em>${esc(visitName)}</em>?</p>
                    <p class="text-xs text-red-600 mt-0.5">This action is permanent and will be recorded in the Audit Trail per ICH GCP E6 (R3).</p>
                </div>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason for Deletion <span class="text-red-500">*</span></label>
                <textarea id="del-visit-reason" rows="3"
                    placeholder="e.g. Duplicate visit entry — created in error."
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
                <p id="del-visit-err" class="text-xs text-red-500 mt-1 hidden"></p>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="confirmDeleteVisit(${visitId})"
            class="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="trash-2" class="w-4 h-4"></i> Delete Visit
        </button>`,
    });
};

window.confirmDeleteVisit = async function (visitId) {
    const reason  = document.getElementById('del-visit-reason')?.value?.trim();
    const errEl   = document.getElementById('del-visit-err');
    if (!reason) {
        errEl.textContent = 'Please enter a reason for deletion.';
        errEl.classList.remove('hidden');
        return;
    }
    try {
        await api.deleteVisit(visitId, reason);
        closeModal();
        showToast('Visit deleted. Recorded in audit trail.', 'success');
        await renderSubjectDetail(window._subjectId);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    }
};

// ============================================================
// Unsign Visit Modal (Admin only)
// ============================================================
window.openUnsignVisitModal = function (visitId, visitName) {
    showModal({
        title: 'Unsign Visit',
        size: 'sm',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-3 p-3 bg-amber-50 rounded-md border border-amber-200">
                <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"></i>
                <p class="text-sm text-amber-800">Unsigning <em>${esc(visitName)}</em> will reopen it for editing. This is permanently recorded in the Audit Trail per FDA 21 CFR Part 11.</p>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason for Unsigning <span class="text-red-500">*</span></label>
                <textarea id="unsign-visit-reason" rows="3"
                    placeholder="Provide detailed clinical justification…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
                <p id="unsign-visit-err" class="text-xs text-red-500 mt-1 hidden"></p>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="confirmUnsignVisit(${visitId})"
            class="px-4 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="unlock" class="w-4 h-4"></i> Unsign Visit
        </button>`,
    });
};

window.confirmUnsignVisit = async function (visitId) {
    const reason = document.getElementById('unsign-visit-reason')?.value?.trim();
    const errEl  = document.getElementById('unsign-visit-err');
    if (!reason) {
        errEl.textContent = 'Please enter a reason for unsigning.';
        errEl.classList.remove('hidden');
        return;
    }
    try {
        await api.unsignVisit(visitId, reason);
        closeModal();
        showToast('Visit unsigned. Recorded in audit trail.', 'warning');
        await renderSubjectDetail(window._subjectId);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    }
};

// ============================================================
// Lock Entry Modal
// ============================================================
window.openLockModal = function (entryId, subjectId) {
    showModal({
        title: 'Lock Data Entry',
        size: 'sm',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                <i data-lucide="lock" class="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5"></i>
                <p class="text-sm text-slate-700">Once locked, this data entry cannot be edited without documented justification by an Admin. Permanently recorded in the Audit Trail per FDA 21 CFR Part 11.</p>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason for Locking <span class="text-red-500">*</span></label>
                <textarea id="lock-reason" rows="3"
                    placeholder="e.g. Data verified against source documents and approved for lock."
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="confirmLock(${entryId}, ${subjectId})"
            class="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="lock" class="w-4 h-4"></i> Confirm Lock
        </button>`,
    });
};

window.confirmLock = async function (entryId, subjectId) {
    const reason = document.getElementById('lock-reason').value.trim();
    if (!reason) { showToast('Reason for locking is required.', 'error'); return; }
    try {
        await api.lockDataEntry(entryId, reason);
        closeModal();
        showToast('Data entry locked. Audit trail entry created.', 'success');
        await renderSubjectDetail(subjectId);
    } catch (err) { showToast(err.message, 'error'); }
};

// ============================================================
// Withdraw Subject Modal
// ============================================================
window.openWithdrawModal = function (subjectId) {
    showModal({
        title: 'Withdraw Subject',
        size: 'sm',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-3 p-3 bg-red-50 rounded-md border border-red-200">
                <i data-lucide="alert-triangle" class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"></i>
                <p class="text-sm text-red-700">This will mark the subject as Withdrawn and permanently record the action in the Audit Trail. This action cannot be undone.</p>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason for Withdrawal <span class="text-red-500">*</span></label>
                <textarea id="withdraw-reason" rows="3"
                    placeholder="Enter clinical reason for withdrawal…"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="confirmWithdraw(${subjectId})"
            class="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition">
            Confirm Withdrawal
        </button>`,
    });
};

window.confirmWithdraw = async function (subjectId) {
    const reason = document.getElementById('withdraw-reason').value.trim();
    if (!reason) { showToast('Reason for withdrawal is required.', 'error'); return; }
    try {
        await api.updateSubjectStatus(subjectId, 'Withdrawn', reason);
        closeModal();
        showToast('Subject withdrawn. Audit trail recorded.', 'warning');
        await renderSubjectDetail(subjectId);
    } catch (err) { showToast(err.message, 'error'); }
};

// ============================================================
// Subject-level Data Lock
// ============================================================
function renderSubjectLockStatus(data) {
    const visits  = data?.visits  ?? [];
    const history = data?.history ?? [];

    if (!visits.length) {
        return '<p class="text-xs text-slate-400 p-2">No visits found for this subject.</p>';
    }

    const visitRows = visits.map(v => {
        const total   = parseInt(v.total)   || 0;
        const locked  = parseInt(v.locked)  || 0;
        const pct     = total > 0 ? Math.round((locked / total) * 100) : 0;
        const allLocked = total > 0 && locked === total;
        return `
        <tr class="hover:bg-slate-50">
            <td class="px-3 py-2 text-xs font-medium text-slate-700">${esc(v.visit_name)}</td>
            <td class="px-3 py-2 text-xs text-slate-500">${locked}/${total}</td>
            <td class="px-3 py-2 w-32">
                <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full rounded-full ${allLocked ? 'bg-emerald-500' : 'bg-blue-500'}"
                         style="width:${pct}%"></div>
                </div>
            </td>
            <td class="px-3 py-2">
                <span class="text-xs ${allLocked ? 'text-emerald-600 font-semibold' : 'text-amber-600'}">${allLocked ? '✓ Fully Locked' : pct > 0 ? 'Partial' : 'Not Locked'}</span>
            </td>
            <td class="px-3 py-2 flex gap-1">
                ${!allLocked ? `
                <button onclick="openSubjectLockModal(false, ${v.visit_id})"
                    class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs">Lock Visit</button>` : ''}
                ${locked > 0 ? `
                <button onclick="openSubjectLockModal(true, ${v.visit_id})"
                    class="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded text-xs" id="unlock-visit-btn-${v.visit_id}">Unlock</button>` : ''}
            </td>
        </tr>`;
    }).join('');

    const historyRows = history.slice(0, 5).map(h => `
    <tr class="hover:bg-slate-50">
        <td class="px-3 py-1.5 text-xs">
            <span class="px-1.5 py-0.5 rounded text-xs font-semibold ${h.action === 'Lock' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-700'}">${h.action}</span>
        </td>
        <td class="px-3 py-1.5 text-xs text-slate-600">${esc(h.reason)}</td>
        <td class="px-3 py-1.5 text-xs text-slate-400">${esc(h.performed_by_name ?? '—')} · ${new Date(h.performed_at).toLocaleString('en-GB')}</td>
        <td class="px-3 py-1.5 text-xs text-slate-500">${h.entries_affected} entries</td>
    </tr>`).join('');

    return `
    <div class="overflow-x-auto border-b border-slate-100">
        <table class="w-full text-xs">
            <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th class="px-3 py-2 text-left font-semibold text-slate-600">Visit</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-600">Locked</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-600">Progress</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-600">Status</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-600">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">${visitRows}</tbody>
        </table>
    </div>
    ${history.length ? `
    <div class="p-3">
        <p class="text-xs font-semibold text-slate-500 mb-2">Lock History</p>
        <div class="overflow-x-auto">
            <table class="w-full text-xs">
                <tbody class="divide-y divide-slate-100">${historyRows}</tbody>
            </table>
        </div>
    </div>` : ''}`;
}

window.openSubjectLockModal = function (isUnlock, visitId = null) {
    const user = api.getCurrentUser();
    if (isUnlock && user.role !== 'admin') {
        showToast('Only admins can unlock subject data.', 'error');
        return;
    }
    const label = isUnlock ? 'Unlock' : 'Lock';
    const scope = visitId != null ? 'this visit' : 'all visits for this subject';
    showModal({
        title: `${label} Subject Data`,
        size: 'sm',
        body: `
        <div class="space-y-4">
            <div class="flex items-start gap-3 p-3 ${isUnlock ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'} rounded-md border">
                <i data-lucide="${isUnlock ? 'lock-open' : 'lock'}" class="w-5 h-5 ${isUnlock ? 'text-amber-500' : 'text-slate-500'} flex-shrink-0 mt-0.5"></i>
                <p class="text-sm ${isUnlock ? 'text-amber-700' : 'text-slate-700'}">
                    ${isUnlock
                        ? `This will unlock all locked CRF entries for ${scope}. An unlock event will be permanently recorded in the Audit Trail.`
                        : `This will lock all Draft/Saved CRF entries for ${scope}. Locked entries cannot be edited without admin approval. Recorded in the Audit Trail per GCP.`}
                </p>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason <span class="text-red-500">*</span></label>
                <textarea id="subject-lock-reason" rows="3"
                    placeholder="${isUnlock ? 'e.g. Query response requires data correction — authorised by PI' : 'e.g. All CRF entries verified and approved for database lock'}"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
            </div>
        </div>`,
        footer: `
        <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
        <button onclick="confirmSubjectLock(${isUnlock}, ${visitId ?? 'null'})"
            class="px-4 py-2 text-sm font-semibold ${isUnlock ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-800 hover:bg-slate-900'} text-white rounded-md transition flex items-center gap-2">
            <i data-lucide="${isUnlock ? 'lock-open' : 'lock'}" class="w-4 h-4"></i> Confirm ${label}
        </button>`,
    });
};

window.confirmSubjectLock = async function (isUnlock, visitId) {
    const reason = document.getElementById('subject-lock-reason').value.trim();
    if (!reason) { showToast('Reason is required.', 'error'); return; }
    try {
        const vid = visitId === null || visitId === 'null' ? null : visitId;
        if (isUnlock) {
            const r = await api.unlockSubject(window._subjectId, reason, vid);
            showToast(`${r.unlocked} entries unlocked. Audit trail recorded.`, 'warning');
        } else {
            const r = await api.lockSubject(window._subjectId, reason, vid);
            showToast(`${r.locked} entries locked. Audit trail recorded.`, 'success');
        }
        closeModal();
        await renderSubjectDetail(window._subjectId);
    } catch (err) { showToast(err.message, 'error'); }
};

// ============================================================
// Helpers
// ============================================================
function auditBadge(action) {
    const map = {
        INSERT: 'badge-insert', UPDATE: 'badge-update',
        DELETE: 'badge-delete', LOCK:   'badge-lock', UNLOCK: 'badge-unlock',
    };
    return map[action] || 'bg-slate-100 text-slate-600';
}
```

## src/frontend/js/modules/utils.js

```javascript
// ============================================================
// UI Utilities - Toast, Modal (no circular dependencies)
// ============================================================

export function showToast(message, type = 'success', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
    const colors = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        error:   'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        info:    'bg-blue-50 border-blue-200 text-blue-900',
    };
    const iconColors = { success: 'text-emerald-500', error: 'text-red-500', warning: 'text-amber-500', info: 'text-blue-600' };

    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toast = document.createElement('div');
    toast.id = id;
    // TODO: MINOR — Add alert/status semantics and a labeled dismiss button for notifications.
    toast.className = `pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-md border shadow-lg max-w-sm w-full transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
    toast.innerHTML = `
        <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 flex-shrink-0 mt-0.5 ${iconColors[type] || iconColors.info}"></i>
        <span class="text-sm font-medium flex-1">${escHtml(message)}</span>
        <button onclick="document.getElementById('${id}')?.remove()" class="flex-shrink-0 opacity-60 hover:opacity-100 transition mt-0.5">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
    `;
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons({ node: toast });

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
        });
    });

    // TODO: MINOR — Review the default notification duration; allow users time to read errors.
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

export function showModal({ title, body, footer = '', size = 'md' }) {
    closeModal();
    const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" id="modal-backdrop">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick="closeModal()"></div>
            <div class="relative bg-white rounded-lg shadow-2xl w-full ${sizes[size] || sizes.md} max-h-[90vh] flex flex-col animate-modal-in" style="border:1px solid #D8E0EE">
                <div class="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0" style="background:#F0F3F8;border-color:#D8E0EE;border-radius:0.5rem 0.5rem 0 0">
                    <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">${escHtml(title)}</h3>
                    <button onclick="closeModal()" class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
                <div class="flex-1 overflow-y-auto px-5 py-5">${body}</div>
                ${footer ? `<div class="px-5 py-3.5 border-t flex-shrink-0 flex justify-end gap-3" style="border-color:#D8E0EE;background:#F9FAFC">${footer}</div>` : ''}
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

export function closeModal() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
}

// Element-content escaping. Stripping `<` is what actually prevents a tag from
// being opened; quotes are left alone because callers interpolate into text
// nodes, never into an attribute. Exported so every module that builds a
// message list with innerHTML uses the same one.
export function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Expose globally for inline onclick handlers
window.showToast = showToast;
window.showModal = showModal;
window.closeModal = closeModal;
```

## tests/error-workflows.test.js

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveEnrollment } from '../src/frontend/js/modules/enrollment-save.js';
import { readObject, readContext, writeContext, writeStored } from '../src/frontend/js/modules/storage.js';
import { authRequest } from '../src/frontend/js/modules/auth-http.js';

const assessment = { criteria: [{ id: 'I1', met: true }], passed: true, consent: { consentVersion: 'v1' } };

test('assessment failure retains created subject and reports partial save without retry', async () => {
    const calls = [];
    const api = {
        createSubject: async () => { calls.push('subject'); return { id: 8 }; },
        submitIEAssessment: async () => { calls.push('assessment'); throw new Error('private query'); },
        createConsent: async () => { calls.push('consent'); },
    };
    const result = await saveEnrollment(api, {}, assessment);
    assert.deepEqual(calls, ['subject', 'assessment', 'consent']);
    assert.equal(result.subject.id, 8);
    assert.deepEqual(result.unconfirmed, ['inclusion/exclusion assessment']);
    assert.ok(!JSON.stringify(result).includes('private'));
});

test('both uncertain follow-ups are reported; failed creation starts no follow-up', async () => {
    const unavailable = async () => { throw new Error('disconnected'); };
    const api = { createSubject: async () => ({ id: 8 }), submitIEAssessment: unavailable, createConsent: unavailable };
    assert.deepEqual((await saveEnrollment(api, {}, assessment)).unconfirmed, ['inclusion/exclusion assessment', 'consent record']);
    let followUps = 0;
    api.createSubject = unavailable;
    api.submitIEAssessment = api.createConsent = async () => { followUps++; };
    await assert.rejects(saveEnrollment(api, {}, assessment));
    assert.equal(followUps, 0);
});

test('successful enrollment preserves subject ID for follow-up records', async () => {
    const api = {
        createSubject: async () => ({ id: 21 }),
        submitIEAssessment: async (id, criteria, passed) => { assert.equal(id, 21); assert.equal(criteria, assessment.criteria); assert.equal(passed, true); },
        createConsent: async payload => { assert.equal(payload.subjectId, 21); assert.equal(payload.consentType, 'Initial'); },
    };
    assert.deepEqual((await saveEnrollment(api, {}, assessment)).unconfirmed, []);
});

function storage(t, initial = {}) {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const values = new Map(Object.entries(initial));
    const store = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: store });
    t.after(() => original ? Object.defineProperty(globalThis, 'localStorage', original) : delete globalThis.localStorage);
    return { values, store };
}

test('corrupt session/context is cleared and does not silently select a study', t => {
    const { values } = storage(t, { session: '{broken', study_id: '12oops', study_meta: '{}' });
    assert.equal(readObject('session'), null);
    assert.equal(values.has('session'), false);
    assert.equal(readContext('study'), null);
    assert.equal(values.has('study_id'), false);
    values.set('study_id', '12'); values.set('study_meta', '{"id":999,"title":"A"}');
    assert.equal(readContext('study').id, 12);
    values.set('session', '[]');
    assert.equal(readObject('session'), null);
});

test('blocked storage fails closed; partial writes cannot keep stale context', t => {
    const { values, store } = storage(t, { study_id: '9', study_meta: '{}' });
    store.setItem = () => { throw new Error('Quota exceeded'); };
    assert.throws(() => writeContext('study', { id: 2 }, { title: 'New' }), e => e.code === 'STORAGE_UNAVAILABLE');
    assert.equal(values.has('study_id'), false);
    store.getItem = () => { throw new Error('SecurityError'); };
    assert.equal(readContext('study'), null);
    assert.throws(() => writeStored('session', '{}'), /Allow site storage/);
});

test('login failures use sign-in instructions; technical 5xx details stay hidden', async t => {
    t.mock.method(globalThis, 'fetch', async () => new Response('{"error":"private exception"}', { status: 401 }));
    await assert.rejects(authRequest('/api/mfa/initiate', { method: 'POST' }), e => /email and password/.test(e.message) && !e.message.includes('private'));
    await assert.rejects(authRequest('/api/mfa/totp-verify', { method: 'POST' }), e => /start sign-in again/.test(e.message));
    t.mock.method(globalThis, 'fetch', async () => new Response('{"error":"private exception"}', { status: 500 }));
    await assert.rejects(authRequest('/api/register', { method: 'POST' }), e => e.status === 500 && !e.message.includes('private'));
});

test('identical concurrent writes are blocked and the guard is released afterwards', async t => {
    const { request } = await import('../src/frontend/js/modules/http.js');
    let release;
    let calls = 0;
    t.mock.method(globalThis, 'fetch', () => {
        calls++;
        return new Promise(resolve => { release = () => resolve(new Response('{}', { status: 200 })); });
    });
    const options = { method: 'POST', body: '{"name":"synthetic"}' };
    const first = request('/api/subjects', options);
    await assert.rejects(request('/api/subjects', options), e => e.code === 'REQUEST_PENDING');
    assert.equal(calls, 1);
    release();
    await first;
    const next = request('/api/subjects', options);
    assert.equal(calls, 2);
    release();
    await next;
});

test('enrollment UI blocks double-submit and shows persistent partial-save guidance', async t => {
    const originals = new Map(['window', 'document'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const elements = new Map(Object.entries({
        'ns-code': { value: '123' }, 'ns-initial': { value: 'AB' },
        'ns-sex': { value: 'Female' }, 'ns-gender-identity': { value: '' },
        'ns-dob': { value: '1990-01-01' }, 'ns-enroll': { value: '2026-01-01' },
        'ns-site': { value: '1' }, 'ns-submit': { disabled: false },
        'ns-error': { textContent: '', classList: { add() {}, remove() {} } },
        'modal-root': { innerHTML: '' },
    }));
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { _ieCriteriaResults: assessment.criteria, _iePasses: true, _consentData: assessment.consent } });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { getElementById: id => elements.get(id) || null } });
    t.after(() => { for (const [key, descriptor] of originals) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]; });
    const { api } = await import('../src/frontend/js/modules/api.js');
    // The module schedules an unrelated visit-form listener on import.
    t.mock.method(globalThis, 'setTimeout', () => 0);
    await import('../src/frontend/js/modules/subjects.js');
    let finishCreation;
    let creates = 0;
    t.mock.method(api, 'createSubject', () => { creates++; return new Promise(resolve => { finishCreation = () => resolve({ id: 24 }); }); });
    t.mock.method(api, 'submitIEAssessment', async () => { throw new Error('lost response'); });
    t.mock.method(api, 'createConsent', async () => ({}));
    const first = window.submitNewSubject();
    await window.submitNewSubject();
    assert.equal(creates, 1);
    assert.equal(elements.get('ns-submit').disabled, true);
    finishCreation();
    await first;
    const html = elements.get('modal-root').innerHTML;
    assert.match(html, /Subject saved/);
    assert.match(html, /inclusion\/exclusion assessment/);
    assert.match(html, /Do not enroll this subject again/);
    assert.match(html, /#subjects\/24/);
    assert.doesNotMatch(html, /enrolled successfully/);
    assert.equal(window._ieCriteriaResults, assessment.criteria);
    await window.submitNewSubject();
    assert.equal(creates, 1);
});
```

## tests/usererrors.test.js

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { safeErrorResponses, apiErrorHandler } from '../src/backend/middleware/errors.js';
import { request, ApiError } from '../src/frontend/js/modules/http.js';

async function fixture(t) {
    const app = express();
    app.use(safeErrorResponses);
    app.use(express.json({ limit: '100b' }));
    app.get('/failure', (_req, res) => res.status(500).json({ error: 'Failed query: secret participant', stack: 'private stack', details: ['private'] }));
    app.get('/throw', () => { throw new Error('private stack'); });
    app.post('/echo', (req, res) => res.json(req.body));
    app.get('/empty', (_req, res) => res.sendStatus(204));
    app.get('/html', (_req, res) => res.send('<html>proxy page</html>'));
    app.get('/conflict', (_req, res) => res.status(409).json({ error: 'Subject code already exists.', details: ['Choose another code.'] }));
    app.get('/denied', (_req, res) => res.status(403).json({ error: 'Forbidden', mustChangePassword: true, details: ['Change your password.'] }));
    app.get('/slow', (_req, res) => { res.setHeader('Content-Type', 'application/json'); res.write('{'); });
    app.get('/download', (_req, res) => res.send('a,b\n1,2'));
    app.use(apiErrorHandler);
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => { server.closeAllConnections(); server.close(); });
    return `http://127.0.0.1:${server.address().port}`;
}

test('legacy and thrown server errors never return private payloads', async t => {
    const base = await fixture(t);
    for (const path of ['/failure', '/throw']) {
        const res = await fetch(base + path);
        assert.equal(res.status, 500);
        const body = await res.json();
        assert.equal(body.code, 'SERVER_ERROR');
        assert.equal(body.requestId, res.headers.get('X-Request-ID'));
        assert.doesNotMatch(JSON.stringify(body), /secret|private|Failed query/);
        await assert.rejects(request(base + path), err => err instanceof ApiError && err.status === 500 && !JSON.stringify(err).includes('private'));
    }
});

test('malformed and oversized JSON yield actionable JSON responses', async t => {
    const base = await fixture(t);
    for (const [body, status] of [['{"broken":', 400], [JSON.stringify({ value: 'x'.repeat(150) }), 413]]) {
        const res = await fetch(base + '/echo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        assert.equal(res.status, status);
        const payload = await res.json();
        assert.equal(typeof payload.error, 'string');
        assert.doesNotMatch(JSON.stringify(payload), /SyntaxError|stack|broken/);
    }
});

test('empty, invalid JSON, validation details, permissions and downloads', async t => {
    const base = await fixture(t);
    assert.equal(await request(base + '/empty'), null);
    await assert.rejects(request(base + '/html'), e => e.code === 'INVALID_RESPONSE' && !e.message.includes('<html>'));
    await assert.rejects(request(base + '/conflict'), e => e.status === 409 && e.message === 'Subject code already exists.' && e.details[0] === 'Choose another code.');
    await assert.rejects(request(base + '/denied'), e => e.status === 403 && e.data.mustChangePassword === true && /Account Security/.test(e.message));
    assert.equal(await (await request(base + '/download', {}, { responseType: 'blob' })).text(), 'a,b\n1,2');
});

test('timeout covers stalled response bodies; caller cancellation is distinct', async t => {
    const base = await fixture(t);
    await assert.rejects(request(base + '/slow', {}, { timeoutMs: 80 }), e => e.code === 'TIMEOUT' && /check whether/.test(e.message));
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(request(base + '/empty', { signal: controller.signal }), e => e.code === 'CANCELLED');
});

test('network and non-JSON HTTP failures never expose raw browser errors', async t => {
    t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed private-host'); });
    await assert.rejects(request('/test', { method: 'POST' }), e => e.code === 'NETWORK_ERROR' && /check whether/.test(e.message) && !e.message.includes('private-host'));
    t.mock.method(globalThis, 'fetch', async () => new Response('<html>private proxy</html>', { status: 502 }));
    await assert.rejects(request('/test'), e => e.status === 502 && !e.message.includes('private'));
    t.mock.method(globalThis, 'fetch', async () => new Response('null', { status: 429 }));
    await assert.rejects(request('/test'), e => e.status === 429 && /Wait/.test(e.message));
});
```

## Changelog singkat

- **CRITICAL:** Memisahkan hasil pembuatan subjek dari hasil penyimpanan assessment/consent; menampilkan peringatan parsial menetap, tautan review, dan mencegah pengiriman ulang dari form yang hasil simpanannya belum pasti.
- **CRITICAL:** Menghentikan pengiriman consent ketika delegasi tidak tersedia, menghentikan enrollment ketika kriteria studi gagal dimuat, dan membedakan kegagalan baca dari data kosong pada layar serta route SAE/monitoring/delegasi terkait.
- **HIGH:** Menyamarkan payload error 5xx dan exception verifikasi email; membatasi pesan error baris impor; memperbaiki escaping error pada navigasi, monitoring, dan pengaturan keamanan.
- **MEDIUM:** Menyatukan penanganan timeout, network error, respons tidak terbaca, 204, autentikasi, dan unduhan; menjaga detail validasi; memblokir permintaan tulis identik yang sedang berlangsung dalam tab yang sama.
- **MEDIUM:** Menangani browser storage rusak/diblokir, memvalidasi konteks study/site, memperjelas pesan assessment/impor, serta memeriksa kegagalan logout.
- **MINOR:** Hanya komentar TODO untuk aksesibilitas/durasi toast, penyajian reference ID, dan korelasi diagnostik; tidak menerapkan logika fitur MINOR.

## Verifikasi dan batas cakupan

- `npm test`: **487 lulus, 0 gagal**. Pemeriksaan sintaks seluruh 31 file sumber/test dan `git diff --check` lulus.
- Belum menjalankan browser/database end-to-end; pengujian UI enrollment memakai DOM tiruan.
- Pencegahan duplikasi berlaku untuk request identik yang sedang berlangsung dalam satu tab. Ini bukan idempotensi server lintas tab atau retry berurutan. Hasil simpan yang tidak pasti tetap harus direview sebelum dicoba ulang.
- Pemulihan assessment/consent dilakukan melalui review record yang sudah dibuat, bukan retry otomatis. Jawaban sementara hanya bertahan di tab saat ini.
- Belum merupakan audit menyeluruh seluruh respons auth adapter, log backend, halaman standalone, atau validasi klinis. Detail cakupan ada pada `docs/reviews/user-facing-errors.md`.
