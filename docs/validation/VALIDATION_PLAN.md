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
3. **Automated verification** — `npm test` (RBAC permission matrix pinned to
   ROLE_MATRIX.md, middleware behavior, site-scoping semantics). Runs on
   every change; failures block release.
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

- 100% of High-risk URS items verified with objective evidence
- No open Critical/Major deviations; Minor deviations dispositioned with CAPA
- Automated suite green on the frozen release tag
- Part 11 assessment shows no unmitigated "gap" line items

## 5. Deliverables

URS, Part 11 assessment, executed IQ/OQ/PQ with evidence (screenshots,
exports, audit-trail extracts), traceability matrix, deviation log,
Validation Summary Report.

## 6. Environment & data

Validation runs on a dedicated instance with production-equivalent
configuration (`.env` reviewed against `.env.example`), seeded via
`npm run db:seed` plus protocol-specific test data. No production subject
data is used.
