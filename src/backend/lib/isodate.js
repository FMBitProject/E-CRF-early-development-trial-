/**
 * Null-safe, invalid-safe ISO date formatting for the exporters — pure, no DB.
 *
 * `new Date('not a date').toISOString()` throws a RangeError. In an exporter
 * that runs over an entire study, one malformed stored value therefore aborts
 * the whole request: nobody can export anything until the offending row is
 * found and fixed by hand. Skipping the value degrades one cell instead.
 *
 * Every function here returns '' for anything it cannot represent.
 */

/** Parse to a Date, or null if the value is absent or not a real date. */
export function toDate(value) {
    if (value === null || value === undefined || value === '') return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** "YYYY-MM-DD", or '' — for SDTM --DTC date fields and CSV date columns. */
export function isoDay(value) {
    const d = toDate(value);
    return d ? d.toISOString().split('T')[0] : '';
}

/** Full ISO-8601 instant, or '' — for audit-style timestamp columns. */
export function isoDateTime(value) {
    const d = toDate(value);
    return d ? d.toISOString() : '';
}
