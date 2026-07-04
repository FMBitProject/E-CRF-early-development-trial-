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
| 5 | [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md) | URS ↔ implementation ↔ verification traceability |

## Status

> ⚠️ **These documents are the validation protocol set — validation is not
> complete until each protocol is EXECUTED, evidence is attached, deviations
> are dispositioned, and the Validation Summary Report is signed by the
> System Owner, Quality Assurance, and the Data Manager.**

Execution prerequisites:
- A frozen release (git tag) deployed to a controlled validation environment
- Named, trained testers with unique accounts per role
- QA-approved copies of these protocols (wet/electronic signature)

## Change control

After initial validation, any change to `src/**` requires: impact assessment,
regression of the automated suite (`npm test`), targeted re-execution of the
affected OQ scripts, and QA release approval. The git history is the technical
change record; this package is the quality record.
