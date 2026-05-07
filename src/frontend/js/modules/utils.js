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

function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Expose globally for inline onclick handlers
window.showToast = showToast;
window.showModal = showModal;
window.closeModal = closeModal;
