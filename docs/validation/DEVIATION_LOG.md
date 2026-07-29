# Deviation & Observation Log — E-CRF System

Findings raised during validation. **Deviations (DEV-nnn)** are defects against
a URS requirement and must be dispositioned before the Validation Summary
Report can be signed. **Observations (OBS-nnn)** are limitations that do not
breach a stated requirement but are recorded so the sponsor accepts them
knowingly.

Severity: **Critical** = subject safety or unrecoverable data loss ·
**Major** = data integrity / regulatory compliance · **Minor** = operational.

---

## Deviations

### DEV-001 — Duplicate database-lock request could be initiated

| | |
|---|---|
| Raised | 2026-07-29, during OQ-A6 script authoring |
| URS | ESG-03, ESG-05 |
| Severity | **Major** |
| Status | **Closed — corrected and verified** |

**Description.** `POST /api/dblock/initiate` refused a new request when the
latest lock record was `Locked` or `Pending Approval`, but not when it was
`Pending Signatures` — the status assigned the moment a lock is initiated.
A second call therefore created an additional `study_db_lock` row with its own
independent CRA/Admin signature pair.

**Impact.** Two concurrent lock requests could exist for one study. Because
lock state is derived from the *latest* record, an older fully-signed request
could be masked by a newer unsigned one, or a study could be locked by a
signature pair that never saw the pre-lock checks of the governing request.
The dual-signature control required by ESG-03 was therefore bypassable.

**Correction.** The guard now refuses any request whose latest record is in
`Pending Signatures`, `Pending Approval` or `Approved`
(`IN_FLIGHT_STATUSES` in `src/backend/lib/dblockrules.js`).

**Verification.** `tests/dblockrules.test.js` — *"a lock request already in
flight blocks a second one"* asserts a 409 for every in-flight status.
Human confirmation at OQ-G8.

---

### DEV-002 — Queries could be resolved or closed across study boundaries

| | |
|---|---|
| Raised | 2026-07-29, during OQ-A3 script authoring |
| URS | SEC-07 |
| Severity | **Major** |
| Status | **Closed — corrected; human verification outstanding (OQ-D5)** |

**Description.** `PATCH /api/queries/:id/resolve` and
`PATCH /api/queries/:id/close` loaded the query by primary key alone, without
constraining it to the caller's active study. A user legitimately assigned to
Study A could change the state of a query belonging to Study B by supplying
its id.

**Impact.** Cross-study data-integrity breach. A query could be closed by
someone outside the study team, removing it from the blocking set of the other
study's pre-lock checks (ESG-05) and corrupting that study's monitoring record.
Read endpoints were already study-scoped, so the exposure was to writes only.

**Correction.** Both lookups now include `eq(queries.studyId, req.studyId)`,
so an out-of-study id resolves to no row and returns 404. The same defect
pattern was found and corrected on the two `dblock` signature endpoints.

**Verification.** The guard functions are unit-tested
(`tests/queryrules.test.js`), but the scoping predicate itself is a database
query and cannot be verified without a database. **Human execution of OQ-D5
and OQ-D6 is required to close this deviation.**

---

## Observations

### OBS-001 — An invalidated signature is not marked invalid in the record

| | |
|---|---|
| URS | ESG-02 (21 CFR Part 11 §11.70) |
| Severity | **Minor** |
| Status | **Open — accepted for this release** |

Editing a `Signed` entry correctly returns it to `Saved`, so the data cannot be
presented as signed and must be re-signed. However the original row in
`esignatures` is left untouched: it has no `invalidatedAt` / `supersededBy`
column. `GET /api/signatures?entryId=` and the ODM export therefore list a
signature that no longer attests to the current data.

**Risk accepted because** the entry status is the authoritative indicator and
the audit trail records the edit with its reason, so the sequence is
reconstructible. **CAPA:** add `invalidatedAt` to `esignatures`, set it on
edit, and filter it out of the export. Target: next release.

---

### OBS-002 — MedDRA / WHODrug coding is free text, not a versioned dictionary

| | |
|---|---|
| URS | DC-05 (partial) |
| Severity | **Minor** |
| Status | **Open — accepted for this release** |

`adverse_events` stores `meddraPt`, `meddraSoc`, `meddraPtCode`, `meddraSocCode`
and `meddraVersion` as operator-entered text. There is no dictionary loaded, no
auto-coding, and no enforcement that the version recorded matches the terms
used. The same applies to WHODrug on `conmeds`.

**Risk accepted because** coding is performed and reviewed manually under the
sponsor's SOP, and the version field is captured. **CAPA:** load a licensed
MedDRA/WHODrug dictionary with version pinning and closed-codelist validation
before any submission-grade trial. Target: before first registration trial.

---

### OBS-003 — No double data entry / independent verification

| | |
|---|---|
| URS | — (not a stated requirement) |
| Severity | **Minor** |
| Status | **Open — accepted** |

The system captures each value once. Independent verification relies on the
CRA's SDV workflow rather than blind double entry. Acceptable for
investigator-initiated and prospective-EDC trials; the sponsor should confirm
this satisfies the protocol's data-management plan.

---

## Disposition summary

| ID | Severity | Status |
|----|----------|--------|
| DEV-001 | Major | Closed — corrected, automated regression in place |
| DEV-002 | Major | Corrected; **awaiting human verification (OQ-D5, OQ-D6)** |
| OBS-001 | Minor | Open, accepted with CAPA |
| OBS-002 | Minor | Open, accepted with CAPA |
| OBS-003 | Minor | Open, accepted |

**The Validation Summary Report cannot be signed while DEV-002 is awaiting
verification.** No Critical deviations are open.
