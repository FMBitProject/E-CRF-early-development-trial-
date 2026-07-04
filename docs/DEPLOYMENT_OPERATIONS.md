# Deployment & Operations Runbook — E-CRF System

Operational controls required to run E-CRF as a validated GxP system in
production. This runbook is a **quality record**: the sponsor completes the
blanks, tests each procedure, and retains evidence in the Trial Master File.
It closes the procedural (◐) items in
[validation/PART11_ASSESSMENT.md](validation/PART11_ASSESSMENT.md) — chiefly
§11.10(a) validation and §11.10(c) record protection/retention.

---

## 1. Environment topology

| Environment | Purpose | Data |
|-------------|---------|------|
| Development | Feature work | Synthetic only |
| Validation/UAT | Execute IQ/OQ/PQ | Synthetic; production-equivalent config |
| Production | Live trial | Real subject data (pseudonymized) |

Promote by **git tag** only. Production runs a tagged, validated release —
never a moving branch. Config differs by environment via `.env`
(see [../.env.example](../.env.example)); code is identical.

## 2. Prerequisites

- Node ≥ 20 (per `package.json` engines)
- PostgreSQL 14+ with TLS enabled (`DATABASE_URL=…?sslmode=require`)
- HTTPS termination in front of the app (TLS 1.2+). HSTS is emitted by the app
  on HTTPS requests.
- `BETTER_AUTH_SECRET` generated with `openssl rand -base64 48`, stored in the
  platform secret manager (never committed).
- `ALLOW_SELF_REGISTRATION=false` in production.

## 3. Deploy procedure

1. Tag the validated commit: `git tag vX.Y.Z && git push --tags`.
2. `npm ci` (uses `package-lock.json` exactly).
3. `npm test` — must be green (RBAC/site-scope regression gate).
4. `npm run db:migrate` (transactional; back up first — see §5).
5. Start via process manager (systemd / platform runtime), not bare `node`.
6. Post-deploy smoke: `GET /api/ready` → 200 `{"status":"ready"}`; log in as
   each seeded role; confirm security headers on `/login.html`.
7. Record the deployed tag + timestamp in the deployment log.

Rollback: redeploy the previous tag. If a migration must be reversed, restore
from the pre-migration backup (§5) — migrations are forward-only.

## 4. Health monitoring

| Endpoint | Meaning | Use |
|----------|---------|-----|
| `GET /api/health` | Liveness (process up) | Container/liveness probe |
| `GET /api/ready` | Readiness (DB reachable) | LB routing / readiness probe |

Alert when `/api/ready` returns 503, on error-rate or p95-latency spikes, and
on repeated 401/403/423 bursts (possible attack or lockout storm). Ship app
logs (stdout) to a retained, access-controlled log store. Review
`login_attempts` and the audit trail for anomalies per SOP.

## 5. Backup & recovery — 21 CFR §11.10(c)  *(complete and TEST)*

| Item | Value / Procedure |
|------|-------------------|
| Backup method | e.g. managed PITR + nightly `pg_dump` |
| Frequency | Nightly full; continuous WAL / PITR |
| Encryption | At rest (AES-256) and in transit |
| Retention | ≥ trial retention period (typ. 25 yr ICH; confirm per protocol/region) |
| Storage | Off-site / separate region, access-controlled |
| **Restore test** | Restore to an isolated instance **quarterly**; verify row counts + audit-trail integrity; record evidence |
| RPO / RTO | Target: ____ / ____ (define and validate) |

Backups are part of the record — an untested backup is not a control. The
quarterly restore test is mandatory evidence for §11.10(c).

## 6. Disaster recovery

- Document primary + failover region and the failover trigger/decision owner.
- DR drill at least annually: fail over, verify `/api/ready`, run a PQ smoke
  (login per role, read a subject, confirm site isolation), fail back.
- Keep the runbook contact tree and escalation path current.

## 7. Data protection & privacy (UU PDP / GDPR as applicable)

- Subjects are identified by code + initials (pseudonymized); avoid direct
  identifiers in CRF free-text.
- Access is least-privilege via roles + study + site scoping (enforced in code;
  see validation SEC-02/07/08). Review access quarterly via the
  Periodic User Access Review module.
- TLS in transit; encryption at rest at the DB/backup layer.

## 8. Security operations

- Patch cadence: `npm audit` on each release; monthly review of runtime and DB
  patches. Frontend deps (Tailwind/Lucide) are **vendored** under
  `src/frontend/vendor/` — update deliberately and re-validate, never via a
  floating CDN `@latest`.
- **Independent penetration test** of the deployed instance before go-live and
  after major changes; track findings to closure (open item in the Part 11
  assessment).
- Rotate `BETTER_AUTH_SECRET` and DB credentials per policy; rotation
  invalidates sessions (expected — users re-authenticate).

## 9. Change control

Any change to `src/**` after validation: raise a change record → impact
assessment → implement on a branch → `npm test` green → re-execute affected OQ
scripts → QA release approval → tag → deploy (§3). Git history is the technical
record; the validation package + this runbook are the quality record.

## 10. Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| System Owner (Data Manager) | | | |
| IT / Infrastructure | | | |
| QA | | | |
