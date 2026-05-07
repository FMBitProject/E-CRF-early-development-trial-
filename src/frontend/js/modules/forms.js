// ============================================================
// CRF Data Entry Form View — Schema-driven, pharma-grade
// ============================================================

import { api } from './api.js';
import { showToast, showModal, closeModal } from './utils.js';
import { validateForm, validateNumericField, applyFieldValidation } from './validation.js';

const SPINNER = `<div class="flex items-center justify-center h-40">
    <div class="w-7 h-7 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"></div>
</div>`;

export async function renderDataEntry({ subjectId, visitId, formId }) {
    const content = document.getElementById('main-content');
    content.innerHTML = SPINNER;

    const [subject, form] = await Promise.all([
        api.getSubject(subjectId),
        api.getCRFForm(formId),
    ]);

    if (!form) {
        content.innerHTML = `<div class="p-6"><div class="ph-card p-4 border-red-200 text-red-700 text-sm">Form not found.</div></div>`;
        return;
    }

    const entries       = await api.getDataEntries(subjectId, visitId);
    const existingEntry = entries.find(e => e.form_id === Number(formId));
    const isLocked      = existingEntry?.status === 'Locked';
    const isEdit        = !!existingEntry;
    const visit         = subject.visits.find(v => v.id === Number(visitId));
    const visitName     = visit?.visit_name || `Visit #${visitId}`;
    const fields        = form.schema_json?.fields || [];

    const entryBadge = isLocked
        ? `<span class="badge badge-locked"><i data-lucide="lock" class="w-3 h-3 inline mr-1"></i>Locked</span>`
        : isEdit
            ? `<span class="badge badge-saved">${existingEntry.status}</span>`
            : `<span class="badge badge-draft">New Entry</span>`;

    content.innerHTML = `
    <div class="p-5 space-y-4 max-w-4xl mx-auto">

        <!-- Form Header -->
        <div class="ph-card p-5">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <div class="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        <i data-lucide="folder" class="w-3.5 h-3.5"></i>
                        <span class="font-mono font-medium text-slate-600">${subject.subject_code}</span>
                        <span>›</span>
                        <span>${visitName}</span>
                    </div>
                    <h2 class="text-xl font-bold text-slate-900">${form.form_name}</h2>
                    <p class="text-xs text-slate-500 mt-0.5">Version ${form.version} &middot; ${fields.length} fields</p>
                </div>
                ${entryBadge}
            </div>
            ${isLocked ? `
            <div class="mt-4 flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                <i data-lucide="shield-alert" class="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600"></i>
                <span>This data entry is <strong>locked</strong>. Modifications require Admin authorization per FDA 21 CFR Part 11.</span>
            </div>` : ''}
        </div>

        <!-- Hard Error Summary -->
        <div id="validation-summary" class="hidden ph-card p-4 border-red-200 bg-red-50">
            <div class="flex items-center gap-2 mb-2">
                <i data-lucide="alert-circle" class="w-4 h-4 text-red-600"></i>
                <p class="text-sm font-semibold text-red-800">Validation Errors — please correct before saving:</p>
            </div>
            <ul id="validation-error-list" class="list-disc list-inside space-y-1 text-sm text-red-700 ml-2"></ul>
        </div>

        <!-- Soft Warning Summary -->
        <div id="soft-warning-summary" class="hidden ph-card p-4 border-amber-200 bg-amber-50">
            <div class="flex items-center gap-2 mb-2">
                <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600"></i>
                <p class="text-sm font-semibold text-amber-800">Plausibility Warnings — review before submitting:</p>
            </div>
            <ul id="soft-warning-list" class="list-disc list-inside space-y-1 text-sm text-amber-700 ml-2"></ul>
        </div>

        <!-- CRF Form Fields -->
        <div class="ph-card overflow-hidden">
            <div class="ph-card-header" style="background:#F0F3F8">
                <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Form Fields</p>
            </div>
            <form id="crf-form" class="p-6" novalidate>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    ${fields.map(f => renderField(f, existingEntry?.data, isLocked)).join('')}
                </div>
            </form>
        </div>

        ${!isLocked ? `
        <!-- Reason for Change -->
        <div class="ph-card p-5">
            <div class="flex items-start gap-3 mb-4 p-3 rounded-md border" style="background:#EBF2FD;border-color:#BFD7F5">
                <i data-lucide="info" class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:#1554A0"></i>
                <p class="text-xs" style="color:#1554A0">
                    ${isEdit
                        ? '<strong>FDA 21 CFR Part 11:</strong> A reason for change is <strong>required</strong> when modifying existing data and will be permanently recorded in the Audit Trail.'
                        : 'An audit trail entry will be created automatically. You may optionally add a note for this initial entry.'}
                </p>
            </div>
            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Reason for Change ${isEdit ? '<span class="text-red-500">*</span>' : '<span class="text-slate-400 normal-case font-normal">(Optional)</span>'}
            </label>
            <textarea id="reason-for-change" rows="3" ${isEdit ? 'required' : ''}
                placeholder="${isEdit ? 'Required: describe why this data is being modified…' : 'Optional: note for initial entry…'}"
                class="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
        </div>

        <!-- Action Buttons -->
        <div class="ph-card p-4">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p class="text-xs text-slate-400 flex items-center gap-1.5">
                    <i data-lucide="info" class="w-3.5 h-3.5"></i>
                    Save as Draft to continue later; Submit when data is verified.
                </p>
                <div class="flex gap-2.5">
                    <a href="#subjects/${subjectId}"
                        class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">
                        Cancel
                    </a>
                    <button type="button" onclick="saveForm('Draft')"
                        class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition">
                        <i data-lucide="save" class="w-4 h-4"></i> Save Draft
                    </button>
                    <button type="button" id="submit-btn" onclick="saveForm('Submitted')"
                        class="flex items-center gap-2 px-4 py-2 text-sm btn-primary rounded-md">
                        <i data-lucide="send" class="w-4 h-4"></i> Submit
                    </button>
                </div>
            </div>
        </div>` : `
        ${api.getCurrentUser()?.role === 'admin' ? `
        <div class="flex justify-end">
            <button onclick="unlockEntry(${existingEntry.id})"
                class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition border border-amber-200">
                <i data-lucide="unlock" class="w-4 h-4"></i> Unlock Entry (Admin)
            </button>
        </div>` : ''}`}
    </div>`;

    lucide.createIcons();

    // Live validation on numeric fields
    fields.forEach(field => {
        if (field.type === 'number' && field.validation && !isLocked) {
            const inputEl = document.getElementById(`field-${field.key}`);
            const errorEl = document.getElementById(`error-${field.key}`);
            if (inputEl) {
                const handler = () => applyFieldValidation(inputEl, errorEl, validateNumericField(inputEl.value, field.validation));
                inputEl.addEventListener('input', handler);
                inputEl.addEventListener('blur', handler);
            }
        }
    });

    window.saveForm = async function (status) {
        const formData = {};
        fields.forEach(field => {
            if (field.type === 'radio') {
                const checked = document.querySelector(`input[name="field-${field.key}"]:checked`);
                formData[field.key] = checked ? checked.value : '';
            } else {
                const el = document.getElementById(`field-${field.key}`);
                if (el) formData[field.key] = el.value;
            }
        });

        const { valid, errors, warnings } = validateForm(formData, fields);

        const summaryEl = document.getElementById('validation-summary');
        const errorList = document.getElementById('validation-error-list');

        if (!valid) {
            errorList.innerHTML = Object.values(errors).map(e => `<li>${e}</li>`).join('');
            summaryEl.classList.remove('hidden');
            summaryEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            Object.keys(errors).forEach(key => {
                const el = document.getElementById(`field-${key}`);
                const errEl = document.getElementById(`error-${key}`);
                if (el) applyFieldValidation(el, errEl, { level: 'hard', message: errors[key] });
            });
            showToast('Please correct validation errors before saving.', 'error');
            return;
        }
        summaryEl.classList.add('hidden');

        if (Object.keys(warnings).length > 0 && status === 'Submitted') {
            document.getElementById('soft-warning-list').innerHTML = Object.values(warnings).map(w => `<li>${w}</li>`).join('');
            document.getElementById('soft-warning-summary').classList.remove('hidden');

            const proceed = await new Promise(resolve => {
                showModal({
                    title: 'Plausibility Warnings',
                    body: `
                    <div class="space-y-3">
                        <p class="text-sm text-slate-600">The following values are outside expected ranges but within physiological limits:</p>
                        <div class="space-y-2">
                            ${Object.values(warnings).map(w => `
                            <div class="flex items-start gap-2 p-3 bg-amber-50 rounded-md border border-amber-100">
                                <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"></i>
                                <span class="text-sm text-amber-800">${w}</span>
                            </div>`).join('')}
                        </div>
                        <p class="text-sm font-semibold text-slate-700">Confirm these values are correct and submit?</p>
                    </div>`,
                    footer: `
                    <button onclick="closeModal(); window._warningResolve(false)" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Review Data</button>
                    <button onclick="closeModal(); window._warningResolve(true)" class="px-4 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md transition">Confirm & Submit</button>`,
                });
                window._warningResolve = resolve;
            });
            if (!proceed) return;
        } else {
            document.getElementById('soft-warning-summary').classList.add('hidden');
        }

        const reasonEl = document.getElementById('reason-for-change');
        const reason   = reasonEl?.value.trim() || '';
        if (isEdit && !reason) {
            showToast('Reason for change is required when editing existing data.', 'error');
            reasonEl?.focus();
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Saving…'; }

        try {
            await api.saveDataEntry({
                subject_id: subjectId, visit_id: visitId, form_id: formId,
                data: formData, reason_for_change: reason || 'Initial data entry', status,
            });
            showToast(status === 'Submitted' ? 'Form submitted successfully.' : 'Draft saved.', 'success');
            window.navigate(`subjects/${subjectId}`);
        } catch (err) {
            showToast(err.message, 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Submit'; lucide.createIcons(); }
        }
    };

    window.unlockEntry = function (entryId) {
        showModal({
            title: 'Unlock Data Entry',
            size: 'sm',
            body: `
            <div class="space-y-4">
                <div class="flex items-start gap-2.5 p-3 bg-amber-50 rounded-md border border-amber-200 text-sm text-amber-800">
                    <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"></i>
                    Unlocking is a significant action permanently recorded in the Audit Trail per FDA 21 CFR Part 11.
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason for Unlocking <span class="text-red-500">*</span></label>
                    <textarea id="unlock-reason" rows="3" placeholder="Provide detailed clinical justification…"
                        class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm ph-input outline-none resize-none"></textarea>
                </div>
            </div>`,
            footer: `
            <button onclick="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
            <button onclick="confirmUnlock(${entryId})" class="px-4 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md transition">Unlock</button>`,
        });
    };

    window.confirmUnlock = async function (entryId) {
        const reason = document.getElementById('unlock-reason').value.trim();
        if (!reason) { showToast('Reason for unlocking is required.', 'error'); return; }
        try {
            await api.unlockDataEntry(entryId, reason);
            closeModal();
            showToast('Entry unlocked. Reason recorded in Audit Trail.', 'warning');
            await renderDataEntry({ subjectId, visitId, formId });
        } catch (err) { showToast(err.message, 'error'); }
    };
}

function renderField(field, existingData = {}, isLocked = false) {
    const value    = existingData?.[field.key] ?? '';
    const gridCls  = field.grid || 'col-span-1';
    const disabled = isLocked ? 'disabled' : '';
    const baseCls  = `w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm outline-none transition placeholder-slate-300 ph-input
        ${isLocked ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white'}`;

    const label = `<label for="field-${field.key}" class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
        ${field.label}
        ${field.required ? '<span class="text-red-500 ml-0.5">*</span>' : '<span class="text-slate-400 normal-case font-normal text-xs ml-1">(optional)</span>'}
        ${field.validation?.unit ? `<span class="text-slate-400 font-normal normal-case ml-1">[${field.validation.unit}]</span>` : ''}
    </label>`;

    let input = '';
    switch (field.type) {
        case 'number':
            input = `<input type="number" id="field-${field.key}" step="${field.validation?.step || '1'}"
                value="${value}" placeholder="Enter value" ${field.required ? 'required' : ''} ${disabled}
                class="${baseCls}">`;
            break;
        case 'date':
            input = `<input type="date" id="field-${field.key}"
                value="${value}" max="${new Date().toISOString().split('T')[0]}"
                ${field.required ? 'required' : ''} ${disabled} class="${baseCls}">`;
            break;
        case 'time':
            input = `<input type="time" id="field-${field.key}"
                value="${value}" ${field.required ? 'required' : ''} ${disabled} class="${baseCls}">`;
            break;
        case 'text':
            input = `<input type="text" id="field-${field.key}"
                value="${value}" placeholder="Enter text" ${field.required ? 'required' : ''} ${disabled} class="${baseCls}">`;
            break;
        case 'textarea':
            input = `<textarea id="field-${field.key}" rows="3" placeholder="Enter notes"
                ${field.required ? 'required' : ''} ${disabled} class="${baseCls} resize-none">${value}</textarea>`;
            break;
        case 'select':
            input = `<select id="field-${field.key}" ${field.required ? 'required' : ''} ${disabled} class="${baseCls}">
                <option value="">— Select —</option>
                ${(field.options || []).map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>`;
            break;
        case 'radio':
            input = `<div class="flex flex-wrap gap-4 mt-1">
                ${(field.options || []).map(opt => `
                <label class="flex items-center gap-2 cursor-pointer ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}">
                    <input type="radio" name="field-${field.key}" value="${opt}" ${value === opt ? 'checked' : ''} ${disabled}
                        class="w-4 h-4 accent-blue-700">
                    <span class="text-sm text-slate-700">${opt}</span>
                </label>`).join('')}
            </div>`;
            break;
        default:
            input = `<input type="text" id="field-${field.key}" value="${value}" ${disabled} class="${baseCls}">`;
    }

    let hint = '';
    if (field.validation && !isLocked) {
        const parts = [];
        if (field.validation.hard_min !== undefined) parts.push(`Min: ${field.validation.hard_min}`);
        if (field.validation.hard_max !== undefined) parts.push(`Max: ${field.validation.hard_max}`);
        if (parts.length) hint = `<p class="mt-1 text-xs text-slate-400">${parts.join(' · ')}</p>`;
    }

    return `<div class="${gridCls} crf-field-group">
        ${label}
        ${input}
        <p id="error-${field.key}" class="mt-1 text-xs min-h-[1rem] transition-all"></p>
        ${hint}
    </div>`;
}
