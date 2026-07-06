# Multi-Tenancy Plan — E-CRF → SaaS

Turning the single-organization E-CRF into a multi-tenant SaaS where each
**customer (sponsor/CRO) organization** is fully isolated: no user, study,
site, or subject of Organization A is ever visible to Organization B.

## Current state (why this is needed)

- No `organization`/`tenant` table — all studies share one space.
- `admin` is **global god-mode**: `middleware/study.js` lets any admin bypass
  the study-assignment check, so one admin sees every study in the deployment.
- Bootstrap admin hardcoded to one email in `routes/register.js`.
- `studies` is the de-facto top entity; almost all clinical data hangs off
  `studyId`. `sites` are currently **global** (unique code across all studies).

The existing study/site scoping we built is the right foundation — tenancy
sits one level **above** it: `organization → studies → sites → subjects`.

---

## Target model

```
organization (tenant)
├── users            (each user belongs to exactly one org)
├── studies          (org owns its studies)
│   └── study_users, subjects, visits, AE, ... (already studyId-scoped)
└── sites            (org owns its sites)
```

### New role tier

| Role | Scope | Who |
|------|-------|-----|
| `platform_owner` | **Cross-tenant** (all orgs) | Only the SaaS operator (you). Never provisioned to customers. Used for provisioning, support, billing ops. |
| `admin` | **One organization** | Customer's data manager. God-mode *within their org only*. |
| pi / investigator / cra / crc / data_manager | Study + site within their org (unchanged) | Customer staff |

The single most important rule: **`admin` becomes org-scoped**; a brand-new
`platform_owner` is the only role allowed across tenants.

---

## Phase 1 — Schema & data model

1. **`organizations` table**: `id`, `name`, `slug` (unique), `status`
   (Active/Suspended), `plan`, `createdAt`, plus billing/config columns later.
2. **Add `organizationId`** (FK → organizations) to the three tenant-root
   tables: `user`, `studies`, `sites`. Everything else inherits tenancy through
   `studyId` (→ study.organizationId) or `userId` (→ user.organizationId), so
   no column is needed on the ~30 clinical tables.
3. **Unique constraints become per-org**:
   - `studies.protocol_no` unique → unique **per (organization_id, protocol_no)**.
   - `sites.code` unique → unique **per (organization_id, code)**.
   - `user.email` stays globally unique (auth identity is global; a person is
     one login). Their `organizationId` decides what they can see.
4. **Migration for existing data**: create one "default" organization, stamp
   all current users/studies/sites with its id (backfill), then set columns
   `NOT NULL`. Zero data loss; the current deployment becomes tenant #1.
5. Add a **`platform_owner`** value to the role set; migrate the current
   bootstrap admin to `platform_owner` (or keep them as org admin + create a
   separate platform_owner — decide at execution).

## Phase 2 — Request-scoping enforcement (the security core)

1. **`requireAuth`** already loads the user; add `organizationId` to the
   selected columns and to `req.user`.
2. **New `req.orgId`** = `req.user.organizationId` (null only for
   `platform_owner`, who must pass an explicit `X-Org-ID` to act within a
   tenant — audited).
3. **`middleware/study.js`**: after loading the study, assert
   `study.organizationId === req.orgId` (unless platform_owner). This closes
   the admin-bypass hole: admin is now bounded to their org's studies.
4. **`lib/tenantscope.js`** (mirrors `lib/sitescope.js`): helpers to filter
   `studies`, `sites`, and `users` list endpoints by `req.orgId`, and to verify
   a study/site/user id belongs to the caller's org before any by-id action.
5. Apply to the **non-study-scoped** routes that currently trust global admin:
   `sites.js`, `studies.js`, `usermgmt.js`, `security.js`, `audit.js`,
   `accessreview.js`, `sysval.js` — these list/act across the whole DB today
   and must be org-filtered.
6. **Audit trail** gains `organization_id` (or is filtered via the actor's org)
   so one tenant can never read another tenant's audit rows.

## Phase 3 — Tenant lifecycle

1. **Provisioning** (`platform_owner` only): create organization → create its
   first `admin` (invite email) → that admin invites the rest. Replaces the
   hardcoded-email bootstrap.
2. **Suspend/close org**: a suspended org's users are refused at
   `requireAuth` (like the existing `isActive` check, one level up).
3. **Per-tenant config**: branding, allowed roles, data-residency region
   (future), SMTP sender.

## Phase 4 — SaaS operations (beyond isolation)

**Implemented:**
- Plans + limits (`lib/plans.js`: trial / standard / enterprise → max
  studies/users/subjects). Enforced on study creation, user invite, and
  subject enrollment (HTTP 402 when over limit; platform-global exempt).
- Usage metering per tenant (`orgUsage`) exposed via
  `GET /api/organizations/overview` (all tenants) and `/:id/usage`.
- Subscription state on `organizations` (plan, subscription_status,
  trial_ends_at), editable via `PATCH /api/organizations/:id`.
- Per-tenant API rate limit (`rateLimitTenant`, keyed on org) so one tenant
  cannot exhaust capacity for others.
- Data portability export (`GET /api/organizations/:id/export`) — GDPR / UU PDP
  operator-mediated tenant data bundle (JSON, no secrets). Erasure is Close +
  access revocation, since clinical data is under trial retention (~25 yr).

**Billing (Stripe) — implemented, activates when configured:**
- `lib/billing.js`: webhook signature verification (HMAC, timestamp-tolerant)
  and Stripe event → subscription mapping — pure, unit-tested (no SDK, no keys
  needed to test). `organizations` stores `billing_customer_id` /
  `billing_subscription_id`.
- `routes/billing.js`: `POST /api/billing/webhook` (raw body, signature-
  verified, drives plan + subscription_status), `POST /api/billing/checkout`
  (platform_owner starts a Stripe Checkout for a tenant), `GET /api/billing/
  config`. Inert (503) until `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` /
  price ids are set — see `.env.example`.
- Platform console surfaces billing status + a per-tenant "Start checkout".
- Verified end-to-end offline: a signed `customer.subscription.updated` event
  flips a tenant to plan=standard / status=Active; a tampered signature → 400.

**Platform-operator console — implemented** (`platform.html` + `platform.js`):
tenant overview with usage bars, provisioning, plan/lifecycle management, data
export, and billing checkout.

**Still deferred (product / infra decisions):**
- Choosing/configuring the actual Stripe account, products, and prices, and a
  tenant self-service customer portal (Stripe Billing Portal) — configuration,
  not code.
- Customer self-service signup UI (currently operator-mediated provisioning —
  the safer default for a regulated EDC).
- Per-tenant backups / public status page — infrastructure
  (see `docs/DEPLOYMENT_OPERATIONS.md`).

---

## Test strategy (non-negotiable for tenancy)

Extend the automated suite with **cross-tenant isolation tests** — the tenancy
equivalent of the RBAC matrix:

- Org-A user with a valid session + Org-B's `X-Study-ID`/`X-Org-ID` → 403/404
  on every list and by-id route (studies, sites, users, subjects, AE, audit…).
- Org-A admin cannot see Org-B studies/users/sites.
- `platform_owner` can, but every cross-tenant action is audited.
- Email uniqueness is global; protocol_no / site code uniqueness is per-org.

These run in `npm test` and gate every release, exactly like the RBAC and
site-scope suites already do.

---

## Effort & sequencing

| Phase | Risk | Note |
|-------|------|------|
| 1 Schema + backfill migration | Medium | Reversible; test on a DB copy first |
| 2 Request-scoping | **High (security-critical)** | The actual isolation; needs the cross-tenant test suite alongside |
| 3 Tenant lifecycle | Medium | Provisioning + suspend |
| 4 SaaS ops | Product-driven | Billing/metering/onboarding |

Phases 1–2 are the true "is it multi-tenant" gate; do them together with the
isolation tests before anything customer-facing. Phases 3–4 can follow
incrementally.

## Explicitly NOT in this plan (still required for go-live)

Legal entity, DPAs, QMS/SOPs, executed IQ/OQ/PQ, independent pen-test,
compliance/regulatory counsel — see `docs/validation/` and
`docs/DEPLOYMENT_OPERATIONS.md`. Multi-tenancy is necessary but not sufficient
for selling into regulated trials.
