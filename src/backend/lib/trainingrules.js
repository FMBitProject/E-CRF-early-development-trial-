/**
 * Training record scope rules — pure, no DB. ICH GCP E6(R3) §8.3.
 *
 * A training record belongs to a *person*, not to a trial. A GCP certificate is
 * valid across every study that person works on, for its own validity period.
 * Scoping the record per study would hold one certificate as N copies with N
 * expiry dates that drift apart — at inspection that reads as a data-integrity
 * problem, not as thoroughness.
 *
 * Protocol training is the exception: "Protocol Training" with no protocol
 * attached means nothing. That is what studyId is for.
 *
 *   studyId === null  → a qualification of the person, shown in every study
 *   studyId === 7     → training on study 7's protocol, shown only there
 *
 * A study's file is therefore "its own records plus every person-level one",
 * which keeps each TMF complete without duplicating anything.
 *
 * The delegation log is genuinely per-study and is scoped that way — a person
 * is delegated tasks *on a trial*. Training has a different shape; the two sit
 * on one screen but must not share a model.
 */

/** Types that mean nothing without a protocol behind them. */
export const STUDY_SPECIFIC_TYPES = [
    'Protocol Training',
    'Informed Consent Training',
];

/**
 * Whether a type should default to study-specific in the UI.
 * Anything unrecognised defaults to person-level: a person-level record appears
 * in every study's view, so a typo in the type cannot make a record vanish from
 * a TMF. The opposite default would hide it everywhere but one place.
 */
export function isStudySpecificByDefault(trainingType) {
    return STUDY_SPECIFIC_TYPES.includes(trainingType);
}

/** Ids arrive from a header on one side and the database on the other. */
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

/**
 * Mirror of the SQL the list endpoints use, so the rule can be asserted without
 * a database and the two cannot drift apart unnoticed.
 */
export function visibleInStudy(row, studyId) {
    if (!row || typeof row !== 'object') return false;
    if (row.studyId == null) return true;          // person-level: always shown
    return sameId(row.studyId, studyId);
}

/**
 * The studyId a new record should be stamped with.
 *
 * `studySpecific` is the operator's explicit choice and wins over the type
 * default — a site may run protocol training once across a programme, or want
 * a GCP refresher filed against the study that paid for it.
 *
 * With no active study a study-specific record would attach to nothing, so it
 * is stored person-level instead: visible everywhere beats visible nowhere.
 */
export function resolveTrainingScope({ trainingType, studySpecific, studyId } = {}) {
    const wanted = studySpecific === undefined || studySpecific === null
        ? isStudySpecificByDefault(trainingType)
        : Boolean(studySpecific);
    if (!wanted) return null;
    return studyId ?? null;
}
