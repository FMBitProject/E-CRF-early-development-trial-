# 21 CFR Part 11 Compliance Assessment — E-CRF System

Status legend: **✅ Met** (implemented + covered by URS/test) · **◐ Procedural**
(depends on the sponsor's SOPs, not software) · **⚠ Gap** (open work).

## Subpart B — Electronic Records

### §11.10 Controls for closed systems

| Clause | Requirement | Status | Evidence / Notes |
|--------|-------------|--------|------------------|
| 11.10(a) | Validation of systems | ⚠ | **Open.** The CSV package is written and the automated OQ-A is executed (338/338 — [evidence/OQ-A_RUN.md](evidence/OQ-A_RUN.md)), but IQ, OQ-B…OQ-H and PQ are not executed. 5 of 18 High-risk URS items are fully verified. |
| 11.10(b) | Records in human-readable & electronic form | ✅ | UI views + CSV/ODM export (EXP-01/02). |
| 11.10(c) | Protection of records over retention period | ◐ | DB backup/retention is an infrastructure SOP — see [../DEPLOYMENT_OPERATIONS.md]. |
| 11.10(d) | Limiting access to authorized individuals | ✅ | SEC-01/02/07/08; auth + RBAC + study/site scoping; `tests/rbac-matrix.test.js`. |
| 11.10(e) | Secure, computer-generated, time-stamped audit trail; no obscuring; retained | ✅ | AUD-01/02/03; `lib/audit.js`; audit never mutated by app. Attribution, SHA-256 tamper evidence and field-level diffs verified by `tests/audit.test.js` (OQ-A9). |
| 11.10(f) | Operational system checks (sequencing) | ✅ | Entry state machine DC-03 (`tests/entryrules.test.js`, OQ-A2); DB-lock pre-checks and signature order ESG-05/ESG-03 (`tests/dblockrules.test.js`, OQ-A6). |
| 11.10(g) | Authority checks | ✅ | `requireRole` on every mutating route; SEC-02. |
| 11.10(h) | Device/terminal checks | ◐ | N/A (web app); covered by hosting controls. |
| 11.10(i) | Training of personnel | ◐ | Delegation & training module records it; sponsor SOP governs. |
| 11.10(j) | Accountability policy for e-signatures | ◐ | Sponsor SOP + user agreement (see `routes/agreements.js`). |
| 11.10(k) | Controls over documentation | ✅ | Git version control; change control in VALIDATION_PLAN §6. |

### §11.30 Open systems

Not applicable — E-CRF is a closed system (all users are authenticated,
sponsor-provisioned accounts). Transport is HTTPS with HSTS (SEC-09).

## Subpart C — Electronic Signatures

| Clause | Requirement | Status | Evidence / Notes |
|--------|-------------|--------|------------------|
| 11.50 | Signature manifestations (name, date/time, meaning) | ✅ | ESG-02; signatures store signer, timestamp, meaning. |
| 11.70 | Signature/record linking (not transferable) | ◐ | Signatures reference the specific entry id; DB-lock manifest names both signers. Editing a signed entry returns it to Saved so it must be re-signed (verified, OQ-A2) — but the superseded signature row is not marked invalid: see **OBS-001**. |
| 11.100(a) | Unique to one individual | ✅ | Per-user accounts; SEC-01. |
| 11.100(b)/(c) | Identity verification / certification to FDA | ◐ | Sponsor administrative procedure (account provisioning + FDA letter). |
| 11.200(a) | Two components (id + password); re-auth on signing | ✅ | ESG-01 password re-entry at signature time. |
| 11.200(a)(1) | Components used together; consecutive signings | ✅ | Each signature re-prompts for password. |
| 11.300 | Controls for id codes/passwords (uniqueness, aging, lockout) | ✅ | SEC-03/06; password policy + lockout + expiry. |

## Open items to close before go-live

| Ref | Item | Owner |
|-----|------|-------|
| 11.10(a) | Execute & sign IQ, OQ-B…OQ-H and PQ — the automated OQ-A is done, the rest is not | QA / Testers |
| 11.10(c) | Document & test backup/restore + retention | Infrastructure |
| 11.70 | **OBS-001** — mark superseded e-signatures invalid (`invalidatedAt` on `esignatures`) and exclude them from the ODM export | Developer |
| 11.100(b) | Identity-verification SOP + FDA §11.100(c) letter | Sponsor QA |
| SEC-07 | **DEV-002** — verify the cross-study query/lock scoping fix via OQ-D5, OQ-D6 | QA / Testers |
| — | Independent penetration test of the deployed instance | Security vendor |

One software-level item (**OBS-001**, §11.70) is open and accepted with a CAPA;
see [DEVIATION_LOG.md](DEVIATION_LOG.md). Two Major deviations found during
this validation exercise (DEV-001, DEV-002) have been corrected in code;
DEV-002 still needs human verification. Everything else outstanding is either
procedural or execution of this validation package.

> Consolidated, trackable go-live checklist (these items + legal + backup +
> version freeze): [../GO_LIVE_CHECKLIST.md](../GO_LIVE_CHECKLIST.md).
