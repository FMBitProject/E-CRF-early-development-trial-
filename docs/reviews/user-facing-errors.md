# Error-handling review — implementation status

The working tree includes the original refactor and the subsequent CRITICAL/HIGH/MEDIUM fixes. The complete source delivery is `error-handling-complete-files.md`: one complete code block per changed/new source or test file, including unchanged lines. No environment files are included.

## Implemented

- **CRITICAL:** Enrollment no longer reports full success when saving the inclusion/exclusion assessment or consent cannot be confirmed. A persistent partial-save modal identifies the existing subject and links to review its records. Assessment inputs remain in the current tab. Creation is blocked while saving and after a confirmed/uncertain creation result; follow-up writes are never automatically retried.
- **CRITICAL:** Consent and enrollment consent steps block progression while delegation information is unavailable. Failed study-criteria loading no longer silently substitutes default criteria. Site and monitoring screens show unavailable/retry states instead of empty lists. Dashboard and SAE failures show unavailable states. Missing tables in SAE, monitoring, and delegation routes now produce 503 responses rather than false empty/404 results.
- **HIGH:** The server JSON boundary replaces 5xx payloads, including details, with a safe error and request ID. A discovered raw-text email-verification exception now uses that boundary. Import row responses expose only deliberately authored validation errors, not arbitrary exception text. Unexpected registration exceptions are treated as server failures. Main navigation, monitoring details, and security settings escape interpolated error text.
- **MEDIUM:** JSON requests, downloads, and login/registration/signup requests use consistent response handling. Timeouts cover body consumption; cancellation, empty 204 responses, unreadable JSON, network failure, and HTTP failure receive readable messages. Policy details remain available. Identical concurrent JSON writes are blocked within the current tab. Shared 401 responses no longer force navigation away from an open form.
- **MEDIUM:** Stored session/context data is parsed defensively in the API/study-site helpers and login/registration redirects. Invalid context is discarded, IDs must be positive safe integers, and failed context writes cannot intentionally leave a newly selected ID paired with old metadata. Blocked writes explain how to allow storage and sign in again.
- **MEDIUM:** Explicit logout checks HTTP errors and reports failure rather than claiming sign-out. Inactivity logout clears stale display context and warns on the login page if server sign-out could not be confirmed. Import and assessment validation examples now use researcher-facing wording.
- **MINOR:** Only TODO comments were added for toast accessibility/duration, consistent support references, and sanitized diagnostic correlation. The earlier toast accessibility behavior changes were reverted to honor the request to defer MINOR logic.

## Validation

`npm test`: **487 passed, 0 failed**. Syntax checks passed for all **31** changed/new source and test files, including extracted inline HTML modules. `git diff --check` passed.

Tests cover server payload masking, malformed/oversized JSON, transport timeout/body stalls, network/cancellation behavior, downloads, auth messages, corrupt/blocked storage, partial enrollment, and concurrent-write guards. A mocked-DOM test invokes the actual enrollment submit handler and verifies that double-submit is blocked and partial-save guidance remains visible. These are not live browser or database end-to-end tests.

## Four manual checks

1. Return an unexpected 500 containing synthetic SQL/participant values, and an import-row database failure. Inspect the raw responses: no technical exception text should reach the UI. Render hostile text through navigation/monitoring/security error paths; it must not become HTML.
2. Fail the assessment or consent call after successful subject creation. Verify persistent partial-save guidance, no full-success message, no duplicate creation, and review links pointing to existing records. Also disconnect during creation: the current form must not blindly resubmit.
3. Fail consent delegation, study criteria, sites, monitoring, or overdue-SAE reads. Verify unavailable states and blocked consent progression where required. Restore the read and retry/reload. Missing database tables must not appear as genuinely empty collections.
4. Corrupt local display-context JSON, deny browser storage, submit malformed/oversized requests, and stall a response body beyond 30 seconds. Verify readable guidance. Exercise sign-in, TOTP, registration, signup, and logout failures; controls should recover appropriately without displaying backend exceptions.

## Limits and follow-up scope

- The in-flight write guard is **not server-side idempotency** and does not deduplicate across tabs, browsers, or sequential retries after an uncertain response. The enrollment workflow requires reviewing existing records before retrying. General automatic reconciliation and transactional enrollment remain separate work.
- Assessment/consent recovery links lead to existing records for review; there is no automatic retry that might duplicate an already committed follow-up. In-memory answers do not survive a reload. Existing role restrictions have not been expanded.
- The backend guard covers Express JSON 5xx responses. Auth-adapter raw responses, failures after headers are sent, and all possible application-authored 2xx/4xx responses have not been comprehensively certified. Existing route exception text still exists behind the guard, and existing raw server logs require the documented follow-up.
- Storage migration covers the shared API/context helpers and the edited auth pages. Other standalone pages/modules with direct storage access or fetch calls still need a separate audit. Other modules' empty-result fallbacks were not comprehensively rewritten.
- Field/domain validation was not redesigned. The refactor improves specified error paths without changing clinical rules or database schemas.
