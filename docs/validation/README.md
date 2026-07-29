# Computer System Validation (CSV) Package — E-CRF System

Validation documentation for the E-CRF (Electronic Case Report Form) system,
prepared per **GAMP 5 (2nd Ed.)**, **FDA 21 CFR Part 11**, and
**ICH GCP E6(R3)** expectations for a GAMP Category 5 (custom) application.

| # | Document | Purpose |
|---|----------|---------|
| 1 | [VALIDATION_PLAN.md](VALIDATION_PLAN.md) | Validation strategy, scope, roles, acceptance criteria |
| 2 | [URS.md](URS.md) | User Requirements Specification (numbered, testable) |
| 3 | [PART11_ASSESSMENT.md](PART11_ASSESSMENT.md) | Clause-by-clause 21 CFR Part 11 compliance assessment |
| 4 | [IQ_OQ_PQ.md](IQ_OQ_PQ.md) | Installation / Operational / Performance Qualification protocols |
| 5 | [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md) | URS ↔ implementation ↔ verification traceability, with executed status |
| 6 | [DEVIATION_LOG.md](DEVIATION_LOG.md) | Deviations and observations raised during validation |
| 7 | [evidence/OQ-A_RUN.md](evidence/OQ-A_RUN.md) | Machine-generated record of the executed automated OQ |

## Status — as of 2026-07-29, commit `c6a165c`

> ⚠️ **Validation is NOT complete. The system is not released for use in a
> regulated trial.**

| Protocol | State |
|----------|-------|
| OQ-A (automated, 18 scripts) | ✅ **Executed** — 338/338 checks pass, 0 fail |
| IQ (7 steps) | ⬜ Not executed |
| OQ-B…OQ-H (58 steps) | ⬜ Not executed |
| PQ (5 business processes) | ⬜ Not executed |
| Validation Summary Report | ⬜ Not written |

High-risk URS coverage: **5 of 18 fully verified**, 7 partially verified,
6 with no verification executed.

Deviations open: **DEV-002** (Major — corrected in code, human verification
outstanding). Observations accepted with CAPA: OBS-001, OBS-002, OBS-003.

Re-run the automated portion at any time:

```bash
./scripts/run-oq.sh     # regenerates evidence/OQ-A_RUN.md; non-zero exit = fail
```

Remaining execution prerequisites:
- A frozen release (git tag) deployed to a controlled validation environment —
  the current evidence was produced on a modified working tree and is
  **developmental, not release evidence**
- Named, trained testers with unique accounts per role
- QA-approved copies of these protocols (wet/electronic signature)

## Change control

After initial validation, any change to `src/**` requires: impact assessment,
regression of the automated suite (`./scripts/run-oq.sh`), targeted
re-execution of the affected OQ scripts, and QA release approval. The git
history is the technical change record; this package is the quality record.
