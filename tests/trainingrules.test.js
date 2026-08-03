// OQ-A21 — training record scope rules (lib/trainingrules.js).
// Traces to ICH GCP E6(R3) §8.3 (staff qualification records).
//
// A training record is a property of a person, not of a trial — a GCP
// certificate is valid across every study that person works on, for its own
// validity period. Recording it per study would mean one certificate held as N
// copies with N expiry dates that drift apart, which is a data-integrity
// finding at inspection rather than completeness.
//
// Protocol-specific training is the exception and is what study_id is for.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    STUDY_SPECIFIC_TYPES, isStudySpecificByDefault, visibleInStudy, resolveTrainingScope,
} from '../src/backend/lib/trainingrules.js';

// ── Which types belong to a protocol ────────────────────────────────────────

test('protocol and consent training are study-specific by default', () => {
    assert.equal(isStudySpecificByDefault('Protocol Training'), true);
    assert.equal(isStudySpecificByDefault('Informed Consent Training'), true);
});

test('transferable qualifications are not', () => {
    for (const t of ['GCP Training', 'CDISC Standards Training', 'Local Regulatory Training']) {
        assert.equal(isStudySpecificByDefault(t), false, t);
    }
});

test('an unknown or absent type defaults to person-level', () => {
    // The safer default: a person-level record shows in every study's view, so
    // nothing disappears from a TMF because of a typo in the type.
    for (const t of ['Something New', '', null, undefined, 42]) {
        assert.equal(isStudySpecificByDefault(t), false, JSON.stringify(t));
    }
});

test('the study-specific list is not empty and holds only strings', () => {
    assert.ok(STUDY_SPECIFIC_TYPES.length > 0);
    assert.ok(STUDY_SPECIFIC_TYPES.every(t => typeof t === 'string'));
});

// ── What a study's file shows ───────────────────────────────────────────────

test("a study's view shows its own records and every person-level one", () => {
    const rows = [
        { id: 1, studyId: null, trainingType: 'GCP Training' },
        { id: 2, studyId: 7,    trainingType: 'Protocol Training' },
        { id: 3, studyId: 9,    trainingType: 'Protocol Training' },
    ];
    assert.deepEqual(rows.filter(r => visibleInStudy(r, 7)).map(r => r.id), [1, 2]);
    assert.deepEqual(rows.filter(r => visibleInStudy(r, 9)).map(r => r.id), [1, 3]);
});

test('another study\'s protocol training never leaks into this study', () => {
    assert.equal(visibleInStudy({ studyId: 9 }, 7), false);
});

test('with no active study, only person-level records are shown', () => {
    // Nothing should claim to belong to a study that was not asked for.
    assert.equal(visibleInStudy({ studyId: null }, null), true);
    assert.equal(visibleInStudy({ studyId: 7 }, null), false);
});

test('string and number study ids compare equal — ids arrive from both', () => {
    // req.studyId comes off a header; row.studyId comes off the database.
    assert.equal(visibleInStudy({ studyId: 7 }, '7'), true);
    assert.equal(visibleInStudy({ studyId: '7' }, 7), true);
});

test('a malformed row is not visible rather than throwing', () => {
    for (const bad of [null, undefined, 'x', 42]) {
        assert.doesNotThrow(() => visibleInStudy(bad, 7), JSON.stringify(bad));
        assert.equal(visibleInStudy(bad, 7), false);
    }
});

// ── Deciding what to store ──────────────────────────────────────────────────

test('an explicit choice from the operator wins over the type default', () => {
    // The UI pre-ticks the box from the type, but a site may run protocol
    // training once for a programme of studies, or record GCP against one.
    assert.equal(resolveTrainingScope({ trainingType: 'GCP Training', studySpecific: true, studyId: 7 }), 7);
    assert.equal(resolveTrainingScope({ trainingType: 'Protocol Training', studySpecific: false, studyId: 7 }), null);
});

test('with no explicit choice the type decides', () => {
    assert.equal(resolveTrainingScope({ trainingType: 'Protocol Training', studyId: 7 }), 7);
    assert.equal(resolveTrainingScope({ trainingType: 'GCP Training', studyId: 7 }), null);
});

test('a study-specific record without an active study stays person-level', () => {
    // Better a record that is visible everywhere than one attached to nothing.
    assert.equal(resolveTrainingScope({ trainingType: 'Protocol Training', studySpecific: true, studyId: null }), null);
});
