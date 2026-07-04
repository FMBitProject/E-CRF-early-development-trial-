# IQ / OQ / PQ Protocols — E-CRF System

Execute in order. Each step: record **Actual Result**, **Pass/Fail**,
tester initials + date. Attach evidence (screenshot / export / audit extract)
labeled with the step ID. Log any failure as a deviation.

---

## Part 1 — Installation Qualification (IQ)

| ID | Step | Expected Result | P/F |
|----|------|-----------------|-----|
| IQ-01 | Record OS, Node version (`node -v`) | Node ≥ 20 (per package.json engines) | |
| IQ-02 | `npm ci` on the release tag | Completes; lockfile unchanged | |
| IQ-03 | Verify `.env` against `.env.example`; confirm `BETTER_AUTH_SECRET`, `DATABASE_URL` set; `ALLOW_SELF_REGISTRATION` unset/false | All required vars present; self-registration disabled | |
| IQ-04 | `npm run db:migrate` | All migrations applied, no error | |
| IQ-05 | `npm run db:seed` | Seed users created (one per role) | |
| IQ-06 | Start service; GET `/api/health` | `{"status":"ok"}` | |
| IQ-07 | Confirm git tag = release under validation | Matches Validation Plan | |

---

## Part 2 — Operational Qualification (OQ)

### OQ-A Automated verification
| ID | Step | Expected | P/F |
|----|------|----------|-----|
| OQ-A1 | `npm test` | All tests pass; RBAC matrix matches ROLE_MATRIX.md | |

### OQ-B Authentication & access (SEC)
| ID | Step | Expected | P/F |
|----|------|----------|-----|
| OQ-B1 | Login with valid credentials | Session established (httpOnly cookie; no token in body — SEC-09) | |
| OQ-B2 | 5× wrong password | Account locked (SEC-03); audit rows written | |
| OQ-B3 | Admin unlock with reason | Login restored; unlock audited | |
| OQ-B4 | `POST /api/auth/sign-up/email` with role=admin | 403 (SEC-01) | |
| OQ-B5 | Deactivate a user, then that user calls any API with old session | 403 (SEC-04) | |
| OQ-B6 | Enable TOTP, then attempt any password-only login path | TOTP required; no bypass (SEC-05) | |
| OQ-B7 | GET a page URL for repo file (e.g. `/TEST_ACCOUNTS.md`, `/.git/config`) | 404 (SEC-10) | |
| OQ-B8 | Inspect response headers | CSP, X-Content-Type-Options, X-Frame-Options present (SEC-09) | |

### OQ-C RBAC negative tests (SEC-02) — repeat per row
| ID | Actor → Action | Expected | P/F |
|----|----------------|----------|-----|
| OQ-C1 | CRA → create AE | 403 | |
| OQ-C2 | CRC → raise query | 403 | |
| OQ-C3 | Investigator → raise query | 403 | |
| OQ-C4 | CRA → initiate DB Lock | 403 | |
| OQ-C5 | CRC → I/E assessment | 403 | |
| OQ-C6 | Non-admin → create site / study / user | 403 | |
| OQ-C7 | CRC → create AE / deviation / consent | 201 (allowed) | |

### OQ-D Study & site isolation (SEC-07/08)
| ID | Step | Expected | P/F |
|----|------|----------|-----|
| OQ-D1 | User of Study A requests data with Study B's X-Study-ID | 403 not-assigned | |
| OQ-D2 | Investigator at Site 1 lists subjects | Only Site 1 subjects (SEC-08) | |
| OQ-D3 | Investigator at Site 1 GETs a Site 2 subject/AE/lab by id | 404 | |
| OQ-D4 | CSV IC export as PI of Study A | Contains only Study A consents (EXP-02) | |

### OQ-E Audit trail (AUD)
| ID | Step | Expected | P/F |
|----|------|----------|-----|
| OQ-E1 | Edit a CRF value without reason | Rejected (AUD-02) | |
| OQ-E2 | Edit with reason | Saved; audit row has old/new/reason/user/timestamp (AUD-01) | |
| OQ-E3 | Attempt to alter an audit row via any UI action | Impossible (AUD-03) | |
| OQ-E4 | CRC opens Audit Trail | Denied (AUD-04); admin/PI/CRA/DM allowed | |

### OQ-F Data capture & state (DC)
| ID | Step | Expected | P/F |
|----|------|----------|-----|
| OQ-F1 | Enter out-of-range value (hard check) | Save blocked | |
| OQ-F2 | Enter suspicious value (soft check) | Saved + auto-query created (DC-01) | |
| OQ-F3 | Edit a form schema that has saved entries | 409 blocked (DC-02) | |
| OQ-F4 | Modify a Locked entry | Rejected; admin unlock with reason works (DC-03) | |
| OQ-F5 | Record visit outside window | Auto deviation filed (DC-04) | |
| OQ-F6 | Create SAE | Expedited deadline computed; overdue flagged (DC-05) | |
| OQ-F7 | Randomize Active subject twice | Second attempt 409; arm blinded (DC-07) | |

### OQ-G E-signatures (ESG)
| ID | Step | Expected | P/F |
|----|------|----------|-----|
| OQ-G1 | Sign a Saved form with wrong password | Rejected (ESG-01) | |
| OQ-G2 | Sign with correct password | Status Signed; manifest = name/time/meaning (ESG-02) | |
| OQ-G3 | DB Lock: Admin signs before CRA | Rejected — order enforced (ESG-03) | |
| OQ-G4 | DB Lock: CRA sign with User B's password | Rejected — uses signer's own credential | |
| OQ-G5 | After lock, attempt any data write | 423 locked (ESG-03) | |
| OQ-G6 | Sign a delegation entry belonging to another user | 403 (ESG-04) | |
| OQ-G7 | Run pre-lock checks with an open query | Lock blocked with reason (ESG-05) | |

### OQ-H Workflow (WF)
| ID | Step | Expected | P/F |
|----|------|----------|-----|
| OQ-H1 | Full query lifecycle raise→resolve→close | State transitions enforced per role (WF-01) | |
| OQ-H2 | Complete Blind Data Review with an unticked item | 422 (WF-03) | |
| OQ-H3 | Amendment generic PATCH attempting status jump | Rejected; approval only via /approve (WF-04) | |

---

## Part 3 — Performance Qualification (PQ)

Trained users execute the end-to-end trial process under the governing SOPs.

| ID | Business process | Expected | P/F |
|----|------------------|----------|-----|
| PQ-01 | CRC: enroll subject → record consent → enter CRF data across a visit | Data captured, validations behave, audit complete | |
| PQ-02 | PI: review and e-sign the subject's forms | Signatures applied and manifested | |
| PQ-03 | CRA: raise query on a value → CRC resolves → CRA closes; perform SDV; submit monitoring visit; PI acknowledges | Full monitoring loop completes | |
| PQ-04 | DM/Admin: run pre-lock checks → CRA sign → Admin sign → export ODM + CSV | Study locks; exports contain only this study; data read-only afterward | |
| PQ-05 | Two concurrent site users at different sites | Each sees only their own site's data throughout | |

---

## Execution sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tester | | | |
| QA Witness | | | |
| System Owner | | | |
