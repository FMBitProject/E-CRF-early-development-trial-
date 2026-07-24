// Per-study protocol visit schedule template + its editor (Study Management).
//
// A study's schedule is the source of the visits generated for each subject who
// passes screening. Deliberately EMPTY by default: we never invent a visit
// schedule for a protocol that did not define one. The example template below
// is only offered as an explicit one-click starting point.

export const EXAMPLE_VISIT_SCHEDULE = [
    { name: 'Screening',        studyDay: -14, windowDays: 3 },
    { name: 'Baseline (Day 1)', studyDay:   1, windowDays: 0 },
    { name: 'Week 2',           studyDay:  15, windowDays: 3 },
    { name: 'Week 4',           studyDay:  29, windowDays: 3 },
    { name: 'End of Study',     studyDay:  57, windowDays: 7 },
];

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

function rowHtml(v = {}) {
    return `
    <div class="vs-row grid grid-cols-[1fr_5rem_5rem_1.75rem] gap-2 items-center mb-1.5">
        <input type="text" value="${esc(v.name ?? '')}" placeholder="Visit name"
            class="vs-name border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <input type="number" value="${v.studyDay ?? ''}" placeholder="Day"
            class="vs-day border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500">
        <input type="number" min="0" value="${v.windowDays ?? 0}" placeholder="±"
            class="vs-win border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500">
        <button type="button" class="vs-remove w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition" title="Remove">&times;</button>
    </div>`;
}

export function visitScheduleEditorHtml(prefix) {
    return `
    <div class="border-t border-slate-100 pt-3 mt-1">
        <p class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Protocol Visit Schedule</p>
        <p class="text-[11px] text-slate-400 mb-2">
            Generated automatically for each subject who passes screening.
            <strong>Day 1 = enrollment date</strong> (there is no Day 0; use negative days for screening).
            Leave empty to add visits manually instead.
        </p>
        <div class="grid grid-cols-[1fr_5rem_5rem_1.75rem] gap-2 mb-1 text-[10px] font-semibold text-slate-500 uppercase">
            <span>Visit name</span><span class="text-center">Study day</span><span class="text-center">Window ±d</span><span></span>
        </div>
        <div id="${prefix}-vs-list"></div>
        <div class="flex items-center gap-3 mt-1">
            <button type="button" id="${prefix}-vs-add" class="text-xs text-blue-600 hover:underline">+ Add visit</button>
            <button type="button" id="${prefix}-vs-example" class="text-xs text-slate-400 hover:text-slate-600 hover:underline">Use example schedule</button>
        </div>
    </div>`;
}

export function fillVisitScheduleEditor(prefix, schedule) {
    const list = document.getElementById(`${prefix}-vs-list`);
    if (!list) return;
    const rows = Array.isArray(schedule) ? schedule : [];
    list.innerHTML = rows.map(rowHtml).join('');
}

// Read back into [{ name, studyDay, windowDays }]; server assigns order.
export function readVisitScheduleEditor(prefix) {
    return Array.from(document.querySelectorAll(`#${prefix}-vs-list .vs-row`))
        .map(r => ({
            name:       r.querySelector('.vs-name')?.value.trim() ?? '',
            studyDay:   r.querySelector('.vs-day')?.value,
            windowDays: r.querySelector('.vs-win')?.value,
        }))
        .filter(v => v.name && v.studyDay !== '' && v.studyDay !== undefined);
}

export function wireVisitScheduleEditor(prefix) {
    document.getElementById(`${prefix}-vs-add`)?.addEventListener('click', () => {
        document.getElementById(`${prefix}-vs-list`)?.insertAdjacentHTML('beforeend', rowHtml());
    });
    document.getElementById(`${prefix}-vs-example`)?.addEventListener('click', () => {
        fillVisitScheduleEditor(prefix, EXAMPLE_VISIT_SCHEDULE);
    });
    document.getElementById(`${prefix}-vs-list`)?.addEventListener('click', e => {
        const btn = e.target.closest('.vs-remove');
        if (btn) btn.closest('.vs-row')?.remove();
    });
}
