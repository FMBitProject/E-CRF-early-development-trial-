# User Requirements Specification (URS) — E-CRF System

Requirement IDs are stable and referenced by the Traceability Matrix and
IQ/OQ/PQ scripts. Risk: **H** = subject safety / data integrity critical,
**M** = compliance/operational, **L** = convenience.

## 1. Access control & security (SEC)

| ID | Risk | Requirement |
|----|------|-------------|
| SEC-01 | H | Access requires individual email+password authentication; sign-in only via the MFA flow (`/api/mfa/initiate`). Raw framework sign-up/sign-in endpoints must be unreachable. |
| SEC-02 | H | Roles: admin, pi, investigator, cra, crc, data_manager. Every API endpoint enforces the permission matrix in ROLE_MATRIX.md server-side. |
| SEC-03 | H | 5 consecutive failed logins lock the account (auto-unlock 30 min; admin manual unlock with reason, audited). |
| SEC-04 | H | Deactivated accounts are refused at login and on every API call with an existing session. |
| SEC-05 | M | Optional TOTP 2FA; when enabled it cannot be bypassed by any login path. |
| SEC-06 | M | Passwords: ≥12 chars, mixed classes, history check, 90-day expiry; admin-forced reset blocks all API use until changed. |
| SEC-07 | H | Users see only data of studies they are assigned to (X-Study-ID verified against study_users). |
| SEC-08 | H | PI/investigator/CRC see only subjects of their assigned site(s); admin/CRA/DM are cross-site. |
| SEC-09 | M | Session token is httpOnly cookie only; never in response bodies. Security headers (CSP, nosniff, frame-ancestors) on every response. |
| SEC-10 | M | Static hosting serves only the application pages and `src/frontend/**`; repository files are not downloadable. |
| SEC-11 | M | Periodic user access review workflow with per-user certification decisions recorded in the audit trail. |

## 2. Audit trail (AUD) — 21 CFR 11.10(e)

| ID | Risk | Requirement |
|----|------|-------------|
| AUD-01 | H | Every create/update/delete/lock/sign/login on GxP records writes an audit row: who, when, action, old/new value, reason. |
| AUD-02 | H | Data modifications require an operator-entered reason for change. |
| AUD-03 | H | Audit rows are never updated or deleted by the application. |
| AUD-04 | M | Audit trail is viewable/filterable by admin, PI, CRA, DM only, and exportable to CSV. |

## 3. Data capture & validation (DC)

| ID | Risk | Requirement |
|----|------|-------------|
| DC-01 | H | CRF forms render from versioned schemas; hard edit checks block save, soft checks warn and auto-raise a query. |
| DC-02 | H | A form schema referenced by saved entries cannot be modified in place. |
| DC-03 | H | Entries follow Draft → Saved → Signed → Locked; locked entries reject modification; only admin may unlock, with reason. |
| DC-04 | M | Visits are generated from protocol visit templates; out-of-window visits auto-file a protocol deviation. |
| DC-05 | H | AE capture with seriousness criteria; SAE expedited deadlines (7/15 days) computed and overdue flagged. |
| DC-06 | M | Informed consent recording incl. re-consent per amendment and withdrawal with reason. |
| DC-07 | H | Randomization allocates the next unused slot; arms blinded; unblinding admin-only and audited. |

## 4. Electronic signatures (ESG) — 21 CFR 11.50–11.300

| ID | Risk | Requirement |
|----|------|-------------|
| ESG-01 | H | Signing requires re-entry of the signer's own password at signature time. |
| ESG-02 | H | Signature manifests signer name, date/time, and meaning; stored linked to the record. |
| ESG-03 | H | DB Lock requires two independent signatures (CRA then Admin/DM); after lock all study data is read-only. |
| ESG-04 | H | Delegation entries are signed only by their own subject-of-delegation user. |
| ESG-05 | M | Pre-lock checks (open queries, drafts, unsigned forms, draft SAEs, open deviations) must pass before lock. |

## 5. Workflow (WF)

| ID | Risk | Requirement |
|----|------|-------------|
| WF-01 | M | Query lifecycle: CRA/DM raise → site resolve → CRA/DM close; auto-queries from soft edit checks. |
| WF-02 | M | Monitoring visits with per-form SDV statuses; PI acknowledgment sign-off. |
| WF-03 | M | Blind Data Review checklist must be fully attested server-side before completion. |
| WF-04 | M | Amendment approval enforces re-consent tracking; status transitions only via the approval endpoint. |
| WF-05 | L | Email notifications for query events, SAE deadlines, DB-lock signature requests. |

## 6. Data export (EXP)

| ID | Risk | Requirement |
|----|------|-------------|
| EXP-01 | M | CDISC ODM-XML 1.3.2 export scoped strictly to the active study. |
| EXP-02 | M | CSV domain exports (DM/AE/DEV/IC) scoped strictly to the active study. |
