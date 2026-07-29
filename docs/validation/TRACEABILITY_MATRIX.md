# Requirements Traceability Matrix — E-CRF System

URS → implementation (source of truth) → verification (automated test and/or
OQ/PQ script).

**Verification status legend:**
**✅ Automated** — covered by an executed automated script; evidence in
[evidence/OQ-A_RUN.md](evidence/OQ-A_RUN.md) ·
**◐ Partial** — the decision logic is automated, but the requirement also
depends on database state or side effects that only the human OQ/PQ script
reaches · **⬜ Not executed** — verification is scripted but has not been run.

| URS ID | Risk | Implementation (primary) | Automated test | OQ/PQ script | Status |
|--------|------|--------------------------|----------------|--------------|--------|
| SEC-01 | H | `server.js` auth gate; `routes/mfa.js`; `auth/better-auth.js` (disableSignUp/input:false) | — | OQ-B1, OQ-B4 | ⬜ |
| SEC-02 | H | `middleware/rbac.js` + every `requireRole` | `tests/rbac-matrix.test.js`, `tests/rbac-middleware.test.js` (OQ-A10) | OQ-C1…C7 | ◐ |
| SEC-03 | H | `routes/mfa.js`, `routes/security.js` (locks) | — | OQ-B2, OQ-B3 | ⬜ |
| SEC-04 | H | `middleware/auth.js` (isActive), `routes/mfa.js` | — | OQ-B5 | ⬜ |
| SEC-05 | M | `routes/mfa.js` TOTP; direct-login removed | — | OQ-B6 | ⬜ |
| SEC-06 | M | `lib/passwordpolicy.js`, `routes/security.js` | — | OQ-B2 | ⬜ |
| SEC-07 | H | `middleware/study.js`; study-scoped predicates on queries/dblock | — | OQ-D1, **OQ-D5, OQ-D6** | ⬜ ← DEV-002 |
| SEC-08 | H | `lib/sitescope.js`; `lib/entryrules.js` `checkEntryScope`; clinical routes | `tests/sitescope.test.js`, `tests/tenantscope.test.js` (OQ-A11); `tests/entryrules.test.js` scope cases (OQ-A2) | OQ-D2, OQ-D3, PQ-05 | ◐ |
| SEC-09 | M | `server.js` security headers; `routes/mfa.js` (no token in body) | — | OQ-B1, OQ-B8 | ⬜ |
| SEC-10 | M | `server.js` static mount (src/frontend only) | — | OQ-B7 | ⬜ |
| SEC-11 | M | `routes/accessreview.js` (+ audit on certify) | — | (PQ optional) | ⬜ |
| AUD-01 | H | `lib/audit.js`; writeAudit calls across routes | `tests/audit.test.js` (OQ-A9) — attribution, hash, field diffs, tenant stamp | OQ-E2 | ◐ |
| AUD-02 | H | reason-required guards in `lib/entryrules.js`, `lib/aerules.js`, `lib/queryrules.js`, `lib/randomrules.js` | `tests/entryrules.test.js`, `tests/aerules.test.js`, `tests/randomrules.test.js` (OQ-A2/A4/A5) | OQ-E1 | ✅ |
| AUD-03 | H | No update/delete path on `audit_trails` | — | OQ-E3 | ⬜ |
| AUD-04 | M | `routes/audit.js` (requireRole), `routes/dashboard.js` | `tests/rbac-matrix.test.js` (OQ-A10) | OQ-E4 | ◐ |
| DC-01 | H | `lib/validate.js`; `lib/queryrules.js` auto-query rules; `routes/entries.js` | `tests/validate.test.js` (OQ-A18) — hard/soft ranges, codelists, conditional & cross-field rules; `tests/queryrules.test.js` (OQ-A3), `tests/iecriteria.test.js` (OQ-A13), `tests/import.test.js` (OQ-A15) | OQ-F1, OQ-F2 | ✅ |
| DC-02 | H | `routes/forms.js` PUT in-use guard; `lib/formschema.js` key format & uniqueness | `tests/formschema.test.js` (OQ-A19) | OQ-F3 | ◐ |
| DC-03 | H | `lib/entryrules.js` state machine; `routes/entries.js` lock/unlock | `tests/entryrules.test.js` (OQ-A2) — 20 checks over the full state machine | OQ-F4, OQ-G9 | ✅ |
| DC-04 | M | `lib/visitschedule.js`; `routes/visits.js` autoCreateWindowDeviation | `tests/visitschedule.test.js` (OQ-A14) | OQ-F5 | ◐ |
| DC-05 | H | `lib/aerules.js` expedited windows; `routes/adverseevents.js` | `tests/aerules.test.js` (OQ-A4) — 35 checks incl. 7/15-day boundaries and overdue logic | OQ-F6 | ✅ |
| DC-06 | M | `lib/consentrules.js`; `routes/consents.js` | `tests/consentrules.test.js` (OQ-A12) | PQ-01 | ◐ |
| DC-07 | H | `lib/randomrules.js`; `routes/randomization.js` | `tests/randomrules.test.js` (OQ-A5) — allocation order, stratification, blinding mask | OQ-F7 | ✅ |
| ESG-01 | H | `routes/signatures.js`, `routes/dblock.js` (verifyPassword on own account); `canSignEntry`, `canSignCra/Admin` | `tests/entryrules.test.js`, `tests/dblockrules.test.js` (OQ-A2/A6) — preconditions only; password verification needs the DB | OQ-G1, OQ-G4 | ◐ |
| ESG-02 | H | `routes/signatures.js` manifest fields; `lib/odm.js` signature block | `tests/odm.test.js` (OQ-A7) — signature manifestation in the export | OQ-G2 | ◐ |
| ESG-03 | H | `lib/dblockrules.js` signature order + in-flight guard; `middleware/study.js` (423) | `tests/dblockrules.test.js` (OQ-A6) — order enforced, replay refused, no duplicate request | OQ-G3, OQ-G5, **OQ-G8** | ◐ |
| ESG-04 | H | `routes/delegation.js` sign (owner-only) | — | OQ-G6 | ⬜ |
| ESG-05 | M | `lib/dblockrules.js` `buildPreLockChecks` | `tests/dblockrules.test.js` (OQ-A6) — all six checks, incl. bigint-string coercion | OQ-G7 | ✅ |
| WF-01 | M | `lib/queryrules.js`; `routes/queries.js` | `tests/queryrules.test.js` (OQ-A3) — forward-only lifecycle; `tests/rbac-matrix.test.js` for the role split | OQ-H1 | ✅ |
| WF-02 | M | `routes/monitoring.js` | — | PQ-03 | ⬜ |
| WF-03 | M | `routes/bdreview.js` (server-side attestation) | — | OQ-H2 | ⬜ |
| WF-04 | M | `routes/amendments.js` (status via /approve only) | — | OQ-H3 | ⬜ |
| WF-05 | L | `lib/email.js`, `routes/notifications.js` | — | (PQ observation) | ⬜ |
| EXP-01 | M | `lib/odm.js`; `lib/isodate.js`; `routes/export.js` /odm (study-scoped) | `tests/odm.test.js` (OQ-A7) — 42 checks: ODM 1.3.2 structure, XML escaping, per-subject isolation, boolean/array fidelity, malformed-date resilience; `tests/isodate.test.js` (OQ-A20) | PQ-04 | ◐ |
| EXP-02 | M | `lib/csv.js`; `routes/export.js` /csv (study-scoped) | `tests/csvexport.test.js` (OQ-A8) — 25 checks: RFC 4180 quoting, domain whitelist, VS long format | OQ-D4, PQ-04 | ◐ |

## Coverage summary

Executed on commit `c6a165c`, 2026-07-29 — see
[evidence/OQ-A_RUN.md](evidence/OQ-A_RUN.md) for the machine-generated record.

| | All | High-risk only |
|---|---|---|
| URS requirements | 34 | 18 |
| ✅ Fully verified by executed automated script | 7 | 5 |
| ◐ Partially verified (logic automated; human script outstanding) | 12 | 7 |
| ⬜ No verification executed yet | 15 | 6 |
| Automated checks executed | **370 pass / 0 fail** | |

High-risk items fully verified: **AUD-02** (reason for change), **DC-01**
(edit checks), **DC-03** (entry state machine), **DC-05** (SAE expedited
windows), **DC-07** (randomization & blinding).

High-risk items with **no** verification executed: SEC-01, SEC-03, SEC-04,
SEC-07, AUD-03, ESG-04.

### What this does and does not establish

- **Established.** The decision logic behind the entry state machine, the query
  lifecycle, SAE reporting windows, randomization and blinding, the pre-lock
  checklist, the audit-trail writer, the CRF edit checks, and both export
  serialisers is verified by 370 automated checks that re-run on every change.
  Two Major deviations (DEV-001, DEV-002) were found and corrected by this
  exercise.

- **Not established.** No requirement whose verification depends on a running
  database, a real session, e-signature password checks, email delivery, or
  concurrent human users has been executed. That is every ⬜ row above —
  including all of SEC-01/03/04/05/06/07/09/10, AUD-03, ESG-04, and the whole
  of WF-02/03/04. IQ and PQ have not been executed at all.

**Consequence.** The acceptance criterion in VALIDATION_PLAN §4 — *"100% of
High-risk URS items verified with objective evidence"* — is **not met**.
5 of 18 High-risk items are fully verified and 7 more are partially verified;
the remainder require execution of the IQ, OQ-B…OQ-H, and PQ protocols against
a deployed validation instance with named testers.
