/**
 * Null-safe, invalid-safe ISO date formatting for the exporters — pure, no DB.
 *
 * `new Date('not a date').toISOString()` throws a RangeError. In an exporter
 * that runs over an entire study, one malformed stored value therefore aborts
 * the whole request: nobody can export anything until the offending row is
 * found and fixed by hand. Skipping the value degrades one cell instead.
 *
 * Every function here returns '' for anything it cannot represent.
 *
 * ── Timezone ────────────────────────────────────────────────────────────────
 * A stored timestamp is an instant; a calendar day is not. Reducing an instant
 * to a day with `toISOString()` answers "what day was it in UTC", which is the
 * wrong question: a subject enrolled at 06:00 WIB (UTC+7) is stored as 23:00Z
 * the previous day, so the SDTM export reported the enrolment one day early.
 * Every enrolment before 07:00 local time was affected.
 *
 * Calendar days are therefore resolved in EXPORT_TZ — the timezone the site
 * actually works in — not in UTC. Instants (isoDateTime) keep their UTC
 * representation: they carry a time and an offset, so they were never ambiguous.
 */

/**
 * IANA zone the sites operate in. Override per deployment; the default suits a
 * single-country Indonesian install, which is what this is sold as.
 */
export const EXPORT_TZ = resolveZone(process.env.EXPORT_TZ);

/**
 * An unknown zone name makes Intl throw. Failing here would take the whole
 * server down at import time over a typo in .env, so fall back to UTC — the
 * previous behaviour — and say so loudly rather than refusing to boot.
 */
function resolveZone(name) {
    if (!name) return 'Asia/Jakarta';
    try {
        new Intl.DateTimeFormat('en-CA', { timeZone: name });
        return name;
    } catch {
        console.warn(`[isodate] EXPORT_TZ="${name}" is not a valid IANA timezone; falling back to UTC for export dates.`);
        return 'UTC';
    }
}

const dayFormatters = new Map();

function dayFormatter(timeZone) {
    let fmt = dayFormatters.get(timeZone);
    if (!fmt) {
        const opts = { year: 'numeric', month: '2-digit', day: '2-digit' };
        try {
            fmt = new Intl.DateTimeFormat('en-CA', { timeZone, ...opts });
        } catch {
            // Same reasoning as resolveZone: a bad zone name must degrade one
            // column, not abort an export that runs over the whole study.
            fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', ...opts });
        }
        dayFormatters.set(timeZone, fmt);
    }
    return fmt;
}

/** Parse to a Date, or null if the value is absent or not a real date. */
export function toDate(value) {
    if (value === null || value === undefined || value === '') return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * "YYYY-MM-DD" in `timeZone`, or '' — for SDTM --DTC date fields and CSV date
 * columns. Built from formatToParts rather than a locale string: `en-CA` happens
 * to render ISO order today, but that is a locale-data detail, not a guarantee.
 */
export function isoDay(value, timeZone = EXPORT_TZ) {
    const d = toDate(value);
    if (!d) return '';
    const parts = {};
    for (const p of dayFormatter(timeZone).formatToParts(d)) parts[p.type] = p.value;
    return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Full ISO-8601 instant, or '' — for audit-style timestamp columns. */
export function isoDateTime(value) {
    const d = toDate(value);
    return d ? d.toISOString() : '';
}
