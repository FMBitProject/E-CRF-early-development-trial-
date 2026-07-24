// Per-study protocol visit schedule template.
//
// Stored on studies.visit_schedule as [{ name, studyDay, windowDays, order }].
// When a subject passes screening, these rows are turned into actual `visits`
// with plannedDate derived from the subject's enrollment date.
//
// A NULL/empty template means "no schedule configured" — nothing is generated.
// We never invent a visit schedule for a protocol that did not define one.

const MAX_VISITS   = 60;
const MAX_NAME_LEN = 120;
const MAX_WINDOW   = 365;

// Clinical study days have NO day zero: Day 1 is the enrollment date, Day -1 is
// the day before it. So the offset from Day 1 is (studyDay - 1) for positive
// days and studyDay itself for negative ones.
export function offsetFromDayOne(studyDay) {
    return studyDay >= 1 ? studyDay - 1 : studyDay;
}

// planned calendar date (YYYY-MM-DD) for a template entry, given enrollment date.
export function plannedDateFor(enrollmentDate, studyDay) {
    if (!enrollmentDate) return null;
    const d = new Date(enrollmentDate);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offsetFromDayOne(studyDay));
    return d.toISOString().slice(0, 10);
}

// Normalize a submitted template. Returns an ordered array, or null when there
// is nothing usable to store.
export function sanitizeVisitSchedule(input) {
    if (!Array.isArray(input)) return null;
    const out = [];
    for (const v of input) {
        if (!v || typeof v !== 'object') continue;

        const name = String(v.name ?? '').trim().slice(0, MAX_NAME_LEN);
        if (!name) continue;                                  // drop unnamed rows

        const studyDay = Number.parseInt(v.studyDay, 10);
        if (!Number.isInteger(studyDay) || studyDay === 0) continue;   // no Day 0

        let windowDays = Number.parseInt(v.windowDays, 10);
        if (!Number.isInteger(windowDays) || windowDays < 0) windowDays = 0;
        windowDays = Math.min(windowDays, MAX_WINDOW);

        out.push({ name, studyDay, windowDays });
        if (out.length >= MAX_VISITS) break;
    }
    if (out.length === 0) return null;

    out.sort((a, b) => a.studyDay - b.studyDay);
    return out.map((v, i) => ({ ...v, order: i + 1 }));
}
