# Validation Plan — E-CRF System

| | |
|---|---|
| System | E-CRF (Electronic Case Report Form) |
| Version under validation | _git tag to be assigned at execution_ |
| GAMP category | 5 — Custom application |
| Regulatory basis | FDA 21 CFR Part 11 · ICH GCP E6(R3) · UU PDP No. 27/2022 |
| Author / Owner | _____________  Date: _______ |
| QA Approval | _____________  Date: _______ |

## 1. Purpose & Scope

Establish documented evidence that the E-CRF system consistently performs its
intended use: electronic capture, review, verification, e-signature, and lock
of clinical trial data with a compliant audit trail and access control.

**In scope:** all modules mounted in `src/backend/server.js` and the SPA under
`src/frontend/` — subjects, visits, CRF entries, AE/SAE, deviations, consents,
randomization, queries, e-signatures, monitoring/SDV, delegation & training,
DB lock, exports (ODM/CSV), user & security management, audit trail.

**Out of scope:** hosting-provider infrastructure qualification (covered by
the provider's SOC 2 / ISO 27001 attestations — retain copies in the TMF),
statistical analysis tools consuming exports.

## 2. Validation approach (GAMP 5, risk-based)

1. **Requirements** — URS.md enumerates testable requirements, each tagged
   with risk class (H/M/L) by impact on subject safety and data integrity.
2. **Design/Configuration review** — the codebase itself (git history,
   ROLE_MATRIX.md, PANDUAN.md) is the design specification; peer review is
   evidenced by the repository audit reports and remediation commits.
3. **Automated verification** — `./scripts/run-oq.sh` executes the OQ-A script
   set (338 checks) and writes a machine-generated evidence record with the
   commit hash and environment. Covers the entry state machine, query
   lifecycle, SAE reporting windows, randomization and blinding, the pre-lock
   checklist, the audit-trail writer, both export serialisers, the RBAC matrix,
   and scoping predicates. Runs on every change; a non-zero exit blocks
   release.
4. **IQ** — scripted installation into the validation environment.
5. **OQ** — scripted functional challenges per module, including negative
   tests (403s, locked-state rejections, validation errors).
6. **PQ** — end-to-end business-process runs by trained users under the
   intended SOPs (enroll → consent → data entry → query → SDV → sign → lock).
7. **Validation Summary Report** — disposition of all deviations; release
   statement signed by System Owner + QA.

## 3. Roles

| Role | Responsibility |
|------|----------------|
| System Owner (Data Manager) | Approves plan & summary; owns change control |
| QA | Approves protocols, witnesses execution, dispositions deviations |
| Testers (one per app role: admin, PI, investigator, CRA, CRC, DM) | Execute IQ/OQ/PQ scripts |
| Developer | Fixes defects; no self-approval of own test evidence |

## 4. Acceptance criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | 100% of High-risk URS items verified with objective evidence | ❌ **Not met** — 5 of 18 fully verified, 7 partial ([TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md)) |
| 2 | No open Critical/Major deviations; Minor dispositioned with CAPA | ❌ **Not met** — DEV-002 (Major) corrected but awaiting human verification ([DEVIATION_LOG.md](DEVIATION_LOG.md)) |
| 3 | Automated suite green on the frozen release tag | ◐ **Partial** — 338/338 pass, but on an untagged working tree, not a frozen release |
| 4 | Part 11 assessment shows no unmitigated "gap" line items | ◐ **Partial** — see [PART11_ASSESSMENT.md](PART11_ASSESSMENT.md) |

**The system is not released for use in a regulated trial until all four read
"met".** Status as of 2026-07-29, commit `c6a165c`.

## 5. Deliverables

| Deliverable | State |
|-------------|-------|
| [URS.md](URS.md) | ✅ Complete |
| [PART11_ASSESSMENT.md](PART11_ASSESSMENT.md) | ✅ Complete |
| [IQ_OQ_PQ.md](IQ_OQ_PQ.md) protocols | ✅ Written |
| OQ-A automated execution + evidence | ✅ **Executed** — [evidence/OQ-A_RUN.md](evidence/OQ-A_RUN.md) |
| IQ execution + evidence | ⬜ Not executed |
| OQ-B…OQ-H execution + evidence | ⬜ Not executed |
| PQ execution + evidence | ⬜ Not executed |
| [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md) | ✅ Complete, with executed-status column |
| [DEVIATION_LOG.md](DEVIATION_LOG.md) | ✅ Open — 2 deviations, 3 observations |
| Validation Summary Report | ⬜ Cannot be written until the above are executed |

### 5.1 What remains, concretely

1. Freeze a release: tag the commit, deploy it to a dedicated validation
   instance with a fresh database (`npm run db:migrate`, `npm run db:seed`).
2. Provision one named, trained tester account per role, with unique
   credentials — testers must not share logins, or ESG-01 evidence is void.
3. Execute IQ-01…IQ-07 and record actual results.
4. Execute OQ-B through OQ-H (58 steps) with screenshot/audit-extract evidence
   per step. **OQ-D5, OQ-D6 and OQ-G8 are the regression steps for DEV-001 and
   DEV-002 and must pass.**
5. Execute PQ-01…PQ-05 as end-to-end business processes under the SOPs.
6. Disposition every deviation raised, then write and sign the Validation
   Summary Report.

Steps 3–5 need a person at a keyboard against a live instance; they cannot be
automated and are the reason criterion 1 is not yet met.

## 6. Environment & data

Validation runs on a dedicated instance with production-equivalent
configuration (`.env` reviewed against `.env.example`), seeded via
`npm run db:seed` plus protocol-specific test data. No production subject
data is used.
