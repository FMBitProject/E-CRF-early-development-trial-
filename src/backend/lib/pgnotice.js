/**
 * Routing for PostgreSQL NOTICE/WARNING messages — pure, no DB.
 *
 * The startup migration raises a WARNING when crf_data_entries already holds
 * duplicate (subject, visit, form) groups and idx_crf_entry_unique therefore
 * could not be created. That line is the only signal the operator gets, so it
 * has to be findable.
 *
 * Left unconfigured, postgres-js prints every notice through console.log, where
 * that warning reads as ordinary startup chatter. Routing *everything* to
 * console.warn instead was worse: the migration list holds 157 `IF NOT EXISTS`
 * statements, and each one that skips emits its own "already exists, skipping"
 * notice on every restart. The one line worth reading ended up buried in ~157
 * identical-looking ones.
 *
 * So the filter is by severity. Not by message text: lc_messages translates the
 * body, and matching English strings would leak every routine notice on a
 * server configured in Indonesian — which is most of this product's market.
 */

/** Severities worth an operator's attention. Everything else is chatter. */
const REPORTABLE = new Set(['WARNING', 'ERROR', 'FATAL', 'PANIC']);

/**
 * @returns {string|null} a line to log, or null when the notice is routine.
 *
 * Never throws: this runs on the driver's data path, where an exception would
 * take the connection with it.
 */
export function formatNotice(notice, { verbose = false } = {}) {
    if (!notice || typeof notice !== 'object') return null;

    // postgres-js exposes both severity (field 'V', never translated) and
    // severity_local (field 'S', translated by lc_messages). Reading the
    // localised one would break the filter on a non-English server.
    const severity = String(notice.severity ?? notice.severity_local ?? 'NOTICE').toUpperCase();

    // An unfamiliar severity is reported rather than dropped — a filter that
    // fails closed on something new is how a real problem goes unseen.
    const known = REPORTABLE.has(severity)
        || ['NOTICE', 'INFO', 'LOG', 'DEBUG'].includes(severity);
    if (!verbose && known && !REPORTABLE.has(severity)) return null;

    // detail and hint are frequently the actionable half. The first version of
    // this handler printed only the message and dropped them, which was a
    // regression against postgres-js logging the whole object.
    const parts = [
        String(notice.message ?? '').trim(),
        notice.detail ? `detail: ${notice.detail}` : '',
        notice.hint   ? `hint: ${notice.hint}`     : '',
    ].filter(Boolean);

    return `[postgres ${severity}] ${parts.join(' — ')}`.trim();
}
