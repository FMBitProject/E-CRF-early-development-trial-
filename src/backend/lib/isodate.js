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
 * Resolve a zone name to one Intl will accept.
 *
 * An unknown name makes Intl throw. Failing hard would take the server down at
 * import time over a typo in .env, so fall back to UTC and say so — but say it
 * exactly once per bad name, since this runs per row of an export and would
 * otherwise bury the log. Silence was the worse bug: a mistyped zone used to
 * hand back UTC dates that looked entirely plausible.
 *
 * Every `const` this function touches has to be declared above the EXPORT_TZ
 * assignment below. `function` declarations hoist and `const` does not, so a
 * cache declared underneath sat in the temporal dead zone at module-init time
 * and threw a ReferenceError — but only when EXPORT_TZ was actually set, since
 * the unset path returns before reading it. Setting it is the documented
 * install step, so this took the server down on exactly the fresh installs it
 * was written to serve.
 */
const zoneCache = new Map();   // requested name → name Intl accepts
const warnedZones = new Set();

function usableZone(name) {
    if (!name) return 'Asia/Jakarta';
    const hit = zoneCache.get(name);
    if (hit !== undefined) return hit;

    let resolved;
    try {
        new Intl.DateTimeFormat('en-CA', { timeZone: name });
        resolved = name;
    } catch {
        // Warn once per name even if the zone cache is full. Capping the warn
        // set as well would have reinstated the silent fallback this replaced,
        // just past a threshold — so once the set is full the name is dropped
        // from it rather than the warning being suppressed. Repeated warnings
        // are noisy; a wrong date with no warning at all is the actual bug.
        if (!warnedZones.has(name)) {
            if (warnedZones.size >= 64) warnedZones.clear();
            warnedZones.add(name);
            console.warn(`[isodate] "${name}" is not a valid IANA timezone; export dates fall back to UTC.`);
        }
        resolved = 'UTC';
    }
    // The cache exists to avoid re-validating per row, not to remember every
    // string ever passed. A caller feeding it varying names must not grow it
    // without bound.
    if (zoneCache.size < 64) zoneCache.set(name, resolved);
    return resolved;
}

const dayFormatters = new Map();

/**
 * IANA zone the sites operate in. Override per deployment; the default suits a
 * single-country Indonesian install, which is what this is sold as.
 *
 * Declared after usableZone and everything it reads — see the note above.
 */
export const EXPORT_TZ = usableZone(process.env.EXPORT_TZ);

function dayFormatter(timeZone) {
    const zone = usableZone(timeZone);
    let fmt = dayFormatters.get(zone);
    if (!fmt) {
        fmt = new Intl.DateTimeFormat('en-CA', {
            timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
        });
        dayFormatters.set(zone, fmt);
    }
    return fmt;
}

/**
 * Parse to a Date, or null if the value is absent or not a real date.
 *
 * Booleans and arrays are rejected outright rather than coerced. `new Date(false)`
 * is the epoch and `new Date([2026])` is 2026-01-01 — both are JS coercion
 * artefacts, not dates anyone stored, and letting them through put a confident
 * wrong value in a regulatory export. A number still means an epoch offset,
 * which is a real date and is covered by a test.
 */
export function toDate(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'boolean' || Array.isArray(value)) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** A bare calendar day, with no time and no zone attached. */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * "YYYY-MM-DD" in `timeZone`, or '' — for SDTM --DTC date fields and CSV date
 * columns. Built from formatToParts rather than a locale string: `en-CA` happens
 * to render ISO order today, but that is a locale-data detail, not a guarantee.
 */
export function isoDay(value, timeZone = EXPORT_TZ) {
    // A date-only string is already the answer. It carries no time and no
    // offset, so there is no instant to convert — but `new Date('2026-07-15')`
    // invents midnight UTC, and formatting that anywhere west of UTC moved the
    // day backwards. Several columns (consentDate, onsetDate, dateOfBirth) are
    // stored exactly like this, so the guard has to come before parsing.
    if (typeof value === 'string' && DATE_ONLY_RE.test(value.trim())) {
        const day = value.trim();
        // JS rolls 2026-02-31 over to 2026-03-03 rather than rejecting it, so
        // confirm the calendar actually contains the date before echoing it.
        const probe = new Date(`${day}T00:00:00Z`);
        if (Number.isNaN(probe.getTime())) return '';
        return probe.toISOString().slice(0, 10) === day ? day : '';
    }

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
