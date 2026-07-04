# Requirements Traceability Matrix — E-CRF System

URS → implementation (source of truth) → verification (automated test and/or
OQ/PQ script). Every High-risk requirement traces to at least one executed
verification.

| URS ID | Implementation (primary) | Automated test | OQ/PQ script |
|--------|--------------------------|----------------|--------------|
| SEC-01 | `server.js` auth gate; `routes/mfa.js`; `auth/better-auth.js` (disableSignUp/input:false) | — | OQ-B1, OQ-B4 |
| SEC-02 | `middleware/rbac.js` + every `requireRole` | `tests/rbac-matrix.test.js`, `tests/rbac-middleware.test.js` | OQ-A1, OQ-C1…C7 |
| SEC-03 | `routes/mfa.js`, `routes/security.js` (locks) | — | OQ-B2, OQ-B3 |
| SEC-04 | `middleware/auth.js` (isActive), `routes/mfa.js` | — | OQ-B5 |
| SEC-05 | `routes/mfa.js` TOTP; direct-login removed | — | OQ-B6 |
| SEC-06 | `lib/passwordpolicy.js`, `routes/security.js`, `middleware/auth.js` (mustChange) | — | OQ-B2 |
| SEC-07 | `middleware/study.js` (study_users check) | — | OQ-D1 |
| SEC-08 | `lib/sitescope.js` + `middleware/study.js`; clinical routes | `tests/sitescope.test.js` | OQ-D2, OQ-D3, PQ-05 |
| SEC-09 | `server.js` security headers; `routes/mfa.js` (no token in body) | — | OQ-B1, OQ-B8 |
| SEC-10 | `server.js` static mount (src/frontend only) | — | OQ-B7 |
| SEC-11 | `routes/accessreview.js` (+ audit on certify) | — | (PQ optional) |
| AUD-01 | `lib/audit.js`; writeAudit calls across routes | — | OQ-E2 |
| AUD-02 | reason-required guards (entries/AE/deviations/consents) | — | OQ-E1 |
| AUD-03 | No update/delete path on `audit_trails` | — | OQ-E3 |
| AUD-04 | `routes/audit.js` (requireRole), `routes/dashboard.js` | `tests/rbac-matrix.test.js` (audit mount) | OQ-E4 |
| DC-01 | `lib/validate.js`, `routes/entries.js` (auto-queries) | — | OQ-F1, OQ-F2 |
| DC-02 | `routes/forms.js` PUT in-use guard | — | OQ-F3 |
| DC-03 | `routes/entries.js` state machine + lock/unlock | — | OQ-F4 |
| DC-04 | `routes/visits.js` autoCreateWindowDeviation | — | OQ-F5 |
| DC-05 | `routes/adverseevents.js` calcExpeditedDeadline | — | OQ-F6 |
| DC-06 | `routes/consents.js` | — | PQ-01 |
| DC-07 | `routes/randomization.js` | — | OQ-F7 |
| ESG-01 | `routes/signatures.js`, `routes/dblock.js` (verifyPassword, own account) | — | OQ-G1, OQ-G4 |
| ESG-02 | `routes/signatures.js` manifest fields | — | OQ-G2 |
| ESG-03 | `routes/dblock.js` (order + Locked state), `middleware/study.js` (423) | — | OQ-G3, OQ-G5 |
| ESG-04 | `routes/delegation.js` sign (owner-only) | — | OQ-G6 |
| ESG-05 | `routes/dblock.js` runPreLockChecks | — | OQ-G7 |
| WF-01 | `routes/queries.js` | `tests/rbac-matrix.test.js` | OQ-H1 |
| WF-02 | `routes/monitoring.js` | — | PQ-03 |
| WF-03 | `routes/bdreview.js` (server-side attestation) | — | OQ-H2 |
| WF-04 | `routes/amendments.js` (status via /approve only) | — | OQ-H3 |
| WF-05 | `lib/email.js`, `routes/notifications.js` | — | (PQ observation) |
| EXP-01 | `routes/export.js` /odm (study-scoped) | — | PQ-04 |
| EXP-02 | `routes/export.js` /csv (study-scoped incl. IC) | — | OQ-D4, PQ-04 |

## Coverage summary

- Every **High-risk** URS item has ≥1 executed verification (OQ or PQ).
- SEC-02 / SEC-08 / AUD-04 / WF-01 additionally carry **automated regression**
  via `npm test`, re-run on every code change under change control.
- Items marked "—" for automated test are verified by scripted human execution
  because they require DB state, e-signature, or email side-effects.
