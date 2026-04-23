# R3P Implementation Plan

**Derived from:** SPEC.md v1.0
**Scope:** Everything required to ship Phase 1 (May 2026 pilot)

Legend: `[x]` = done, `[ ]` = todo

---

## 1. Architecture

### Stack

- [x] Backend: Python 3.11 + FastAPI + SQLAlchemy 2.0 async + Alembic + PostgreSQL 15
- [x] Frontend: React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query + Zustand
- [x] Deploy: rootless Podman containers, Caddy reverse proxy, Cloudflare Tunnel on cairn-02

### Approach

- [x] SPA frontend served by nginx container, API served by uvicorn container
- [x] Caddy routes `/api/*` to backend, `/*` to frontend
- [x] Async PostgreSQL via asyncpg; Alembic for migrations
- [x] Cookie-based auth (httponly, samesite=lax)
- [ ] CORS restricted to known origins (currently `allow_origins=["*"]` — must tighten)

No architectural changes needed. All remaining work is hardening, validation, missing features, and test coverage within the existing structure.

---

## 2. Data Model

### Tables

- [x] `releases` — id, name, version, notes, created_at
- [x] `milestones` — id, release_id (FK), name, status, start_date, end_date, download_url, created_at
- [ ] `milestones.compose_id` — nullable String(255) for compose/image ID tracking (SPEC Bug #6)
- [x] `sections` — id, milestone_id (FK), name, architecture, sort_order, category
- [x] `test_cases` — id, section_id (FK), name, procedure_url, blocking, sort_order, admin_signoff, signoff_by, signoff_at
- [x] `results` — id, test_case_id (FK), outcome, arch, deploy_type, hardware_notes, comment, submitter_name, submission_method, quick_outcome, bug_url, submit_time, carried_from_milestone_id (FK), user_id (FK)
- [x] `users` — id, username, display_name, password_hash, role, is_test_team, disabled, created_at, last_login
- [x] `user_sessions` — id, user_id (FK), token, created_at, expires_at

### Migrations

- [x] 001: Initial schema (releases, milestones, sections, test_cases, results)
- [x] 002: Add result comment field
- [x] 003: Quick report + bug_url fields
- [x] 004: Milestone dates
- [x] 005: Milestone download_url
- [x] 006: Section category
- [x] 007: Backfill categories
- [x] 008: User accounts (users, user_sessions, results.user_id)
- [ ] 009: Milestone compose_id — `ALTER TABLE milestones ADD COLUMN compose_id VARCHAR(255) NULL`

### Constraints — missing, need to add at application level

- [ ] `results.arch` — validate against allowlist `{x86_64, aarch64, ppc64le, s390x}`
- [ ] `results.deploy_type` — validate against allowlist `{bare-metal, vm-kvm, vm-vmware, vm-hyperv, vm-zvm, cloud-aws, cloud-gcp, cloud-azure, container-podman, container-docker, wsl}`
- [ ] `section.category` — validate against `SECTION_CATEGORIES` tuple on create/update
- [ ] Text field length limits — `hardware_notes` (2000), `comment` (5000), `bug_url` (2000)
- [ ] `ResultCreate.outcome` — make optional (`str | None = None`) for quick submissions

Existing data is not retroactively validated. Constraints apply to new writes only.

---

## 3. Authentication & Authorization

### Admin auth

- [x] `ADMIN_TOKEN` env var compared at login
- [x] `itsdangerous.URLSafeTimedSerializer` signs session with `SECRET_KEY` + salt `"admin-session"`
- [x] Cookie: `admin_session`, httponly, samesite=lax, 7-day max_age
- [x] `require_admin()` dependency validates signature and expiry
- [ ] Startup validation — reject `SECRET_KEY == "changeme"` or `ADMIN_TOKEN == "changeme"`

### User auth

- [x] Registration: username 3-40 chars `[a-z0-9_-]`, password >= 6 chars, display_name 1-100 chars
- [x] Password hashing: bcrypt with default work factor
- [x] Session token: `secrets.token_urlsafe(48)` stored in `user_sessions`
- [x] Cookie: `user_session`, httponly, samesite=lax, 7-day max_age
- [x] `get_current_user()` returns `User | None`
- [x] Disabled users rejected at login (401)
- [ ] On-login prune — delete expired `user_sessions` rows for the authenticating user

### Authorization

- [x] Opt-in per endpoint via `Depends(require_admin)`
- [x] No global auth middleware (only CORS middleware applied)
- [x] `GET /auth/me` returns `is_admin: true` via admin_session OR user `role: "admin"`
- [ ] `DELETE /results/{id}` — currently unauthenticated, must add `Depends(require_admin)` (SPEC Bug #1)

---

## 4. API Endpoints

### Auth (`/auth`)

- [x] `POST /auth/login` — admin token login, sets admin_session cookie
- [x] `POST /auth/register` — create user, sets user_session cookie, rejects duplicates (409)
- [x] `POST /auth/login-user` — password login, sets user_session cookie, updates last_login
- [x] `POST /auth/logout` — clears both cookies, deletes server session row
- [x] `GET /auth/me` — returns `{is_admin, user}` for current session

### Releases (`/releases`)

- [x] `GET /releases` — list all with milestone stubs (test_case_count, result_count)
- [x] `GET /releases/{id}` — single release with stubs
- [x] `POST /releases` — create (admin)
- [x] `PATCH /releases/{id}` — update (admin)
- [x] `DELETE /releases/{id}` — delete with cascade (admin)

### Milestones (`/milestones`)

- [x] `POST /milestones/releases/{release_id}` — create under release (admin)
- [x] `GET /milestones/{id}` — full detail with sections, test cases, counts_by_arch
- [x] `PATCH /milestones/{id}` — update (admin)
- [x] `DELETE /milestones/{id}` — delete with cascade (admin)
- [x] `GET /milestones/{id}/coverage` — section x arch grid
- [x] `GET /milestones/{id}/coverage-summary` — category-level with confidence scores
- [x] `GET /milestones/{id}/urgent-needs` — blocker test cases with zero results
- [x] `GET /milestones/{id}/hardware-coverage` — unique hardware configs
- [x] `GET /milestones/{id}/results` — all results, ordered by submit_time desc
- [x] `POST /milestones/{id}/carry-forward` — copy results from source (admin)
- [x] `POST /milestones/{id}/reset` — clear all admin_signoff flags (admin)
- [x] `POST /milestones/{id}/bulk-import` — batch result import (public)
- [x] `GET /milestones/{id}/export/json` — JSON download
- [x] `GET /milestones/{id}/export/markdown` — markdown download

### Sections

- [x] `GET /milestones/{id}/sections` — list ordered by sort_order
- [x] `POST /milestones/{id}/sections` — create (admin)
- [x] `PATCH /sections/{id}` — update (admin)
- [x] `DELETE /sections/{id}` — delete with cascade (admin)

### Test Cases

- [x] `GET /sections/{id}/test-cases` — list ordered by sort_order
- [x] `POST /sections/{id}/test-cases` — create (admin)
- [x] `PATCH /test-cases/{id}` — update (admin)
- [x] `DELETE /test-cases/{id}` — delete with cascade (admin)
- [x] `POST /test-cases/{id}/signoff` — mark admin-approved (admin)
- [x] `DELETE /test-cases/{id}/signoff` — remove approval (admin)

### Results

- [x] `GET /milestones/{id}/results` — list for milestone
- [x] `GET /test-cases/{id}/results` — list for test case
- [x] `POST /test-cases/{id}/results` — submit (public, optional user session)
- [x] `DELETE /results/{id}` — endpoint exists but **missing auth** (Bug #1)

### Admin

- [x] `GET /admin/users` — list users with result counts (admin)
- [x] `PATCH /admin/users/{id}` — update role, is_test_team, disabled (admin)

### Health

- [x] `GET /api/health` — returns `{status: "ok"}`

---

## 5. Features

### F1: Result Submission

- [x] Two modes: quick (works/issues/broken) and detailed (PASS/FAIL/PARTIAL/SKIP)
- [x] Quick outcome mapping: works->PASS, issues->PARTIAL, broken->FAIL
- [x] Closed milestone rejection (409)
- [x] Submitter resolution: body.submitter_name > X-Username header > current_user.display_name > None
- [x] bug_url validation (must start with "http")
- [x] user_id set from session; submit_time server-generated
- [ ] `outcome` field optional for quick mode (currently required even though ignored)
- [ ] Validate `arch` against allowlist (currently free text)
- [ ] Validate `deploy_type` against allowlist (currently free text)

### F2: Coverage Grid & Dashboard

- [x] Grid: section x arch cells with PASS/FAIL/PARTIAL/SKIP counts
- [x] Grid key format: `{section_id}_{arch}`
- [x] Dashboard: grouped by section.category, total/covered per category
- [x] Per-arch breakdown within each category
- [x] Null categories fall under "other"
- [x] Categories ordered by CATEGORY_LABELS dict

### F3: Confidence Scoring

- [x] Reputation weights: anonymous=1, tester=2, test_team=3
- [x] Hardware diversity multiplier: 3+ unique configs -> weight * 1.5
- [x] Levels: none (<1), low (1-<3), medium (3-<6), high (>=6)
- [x] Computed per (category, arch) cell, attached to by_arch in CategorySummary

### F4: Milestone Carry-Forward

- [x] Copies results from source to target, matched by (section.name, test_case.name)
- [x] Admin only
- [x] Sets carried_from_milestone_id on copied results
- [x] Unmatched results silently skipped
- [x] Returns {copied, source_milestone_id}
- [ ] Idempotency — repeated calls currently create duplicates (Bug #3)

### F5: Bulk Import

- [x] Public endpoint (no auth) — by design for shell script submissions
- [x] Validates milestone exists and is open
- [x] Outcomes validated against {PASS, FAIL, PARTIAL, SKIP}
- [x] Two-stage matching: exact first, then substring fallback
- [x] All results tagged submission_method="bulk"
- [x] Returns {imported, skipped, unmatched}
- [ ] Ambiguous fuzzy matches — currently takes first hit; should reject and add to unmatched
- [ ] Validate arch/deploy_type against allowlist

### F6: Admin Sign-off

- [x] `POST /test-cases/{id}/signoff` — sets admin_signoff=true, signoff_by, signoff_at
- [x] `DELETE /test-cases/{id}/signoff` — clears all three fields
- [x] `POST /milestones/{id}/reset` — bulk-clears signoffs, preserves results
- [x] All three require admin auth

### F7: Urgent Needs

- [x] Returns blocker test cases with zero results
- [x] Ordered by section sort_order, test case sort_order
- [x] Capped at 10 items
- [ ] Add `total_count` field to response (Bug #5 — no overflow indicator)

### F8: Export

- [x] JSON: milestone metadata + sections + test cases + results, Content-Disposition header
- [x] Markdown: summary stats + per-section tables, Content-Disposition header
- [x] Slug: lowercase, spaces/slashes replaced with hyphens
- [x] 404 for nonexistent milestone

### F9: User Management

- [x] `GET /admin/users` — list with result_count, ordered by created_at desc
- [x] `PATCH /admin/users/{id}` — update role, is_test_team, disabled
- [x] Role validation: must be tester or admin (400 otherwise)
- [x] Disabled user rejected on next login

### F10: Onboarding & Guided Journey

- [x] OnboardingGuide: first-visit welcome, two paths (guided vs standard)
- [x] GuidedJourney: multi-stage wizard (orientation -> install -> testing)
- [x] Mode persisted in Zustand (localStorage)
- [x] Mode toggleable from NavBar
- [ ] GuidedJourney upgrade commands are generic placeholders (Bug #7)

### F11: Shell Helper (r3p-helper.sh)

- [x] Detects arch, CPU, RAM, deployment type via DMI/hypervisor
- [x] 8 checks: selinux, firewalld, dnf, ntp, ssh, boot-target, failed-services, journal-errors
- [x] Outputs valid JSON matching BulkImportRequest schema
- [x] `--milestone-id` and `--api-url` flags for direct POST
- [x] Without flags, outputs to stdout only
- [ ] Verify deploy_type output values match new backend allowlist

---

## 6. Frontend

### Pages

- [x] `/` — ReleaseList: release cards with milestone stubs, OnboardingGuide on first visit
- [x] `/milestones/:id` — MilestoneDetail: CoverageDashboard, CoverageMatrix, FiltersBar, UrgentNeedsBanner, TestCaseRow, ResultForm, BulkUploadModal, GuidedJourney
- [x] `/admin` — Admin: Releases tab (CRUD), Users tab (role/team/disabled toggles)

### Components

- [x] NavBar — auth state, mode toggle, release dropdown
- [x] AuthModal — login/register tabs
- [x] ResultForm — quick and detailed submission modes
- [x] TestCaseRow — expandable, result history, admin approve, test guidance
- [x] BulkUploadModal — JSON paste from r3p-helper.sh
- [x] GuidedJourney — multi-stage wizard
- [x] CoverageDashboard — progress bars by category
- [x] CoverageMatrix — category x arch grid with confidence dots
- [x] OnboardingGuide — two-path welcome card
- [x] UrgentNeedsBanner — red alert, untested blockers
- [x] FiltersBar — untested only, blockers only toggles

### State (Zustand, localStorage)

- [x] username, isAdmin, user, mode, preferredArch, visited

### Needed changes

- [ ] ResultForm: replace free-text arch/deploy_type inputs with `<select>` dropdowns matching backend allowlist
- [ ] TestCaseRow: add confirmation dialog before result delete; handle 401 (session expired)
- [ ] UrgentNeedsBanner: show "and N more untested blockers" when total_count > displayed count
- [ ] Admin milestone form: add optional compose_id field
- [ ] MilestoneDetail: display compose_id if present
- [ ] GuidedJourney: replace generic upgrade commands with real Rocky 9.x paths
- [ ] BulkUploadModal: validate arch value in pasted JSON against allowlist before submit
- [ ] api.ts: update UrgentNeeds response type to include total_count; add compose_id to milestone types

---

## 7. Security & Hardening

- [x] Passwords hashed with bcrypt
- [x] Session tokens generated with secrets.token_urlsafe(48)
- [x] Cookies: httponly, samesite=lax
- [x] Parameterized queries via SQLAlchemy ORM (no raw SQL)
- [x] submit_time server-generated
- [x] password_hash not exposed in any API response
- [x] Disabled users rejected at login
- [ ] **Bug #1:** `DELETE /results/{id}` — add `Depends(require_admin)` (HIGH)
- [ ] **Bug #2:** Reject default `SECRET_KEY`/`ADMIN_TOKEN` at startup (HIGH)
- [ ] **CORS:** Restrict `allow_origins` from `["*"]` to explicit list: `["https://r3p.bradydibble.com", "http://localhost:3000", "http://localhost:3001"]`
- [ ] Auth audit — regression test that every admin endpoint returns 401 without cookie

---

## 8. Testing

### Existing test suite

- [x] `conftest.py` — fixtures: client, admin_client, release, milestone, section, test_case, etc. (SQLite in-memory)
- [x] `test_auth.py` — 7 tests: login correct/wrong/empty, logout, me as admin/unauth/after-logout
- [x] `test_results.py` — 16 tests: detailed submit (PASS/FAIL/PARTIAL/SKIP), quick mapping, quick validation, bug_url, closed milestone, 404, list, delete, X-Username
- [x] `test_milestones.py` — milestone CRUD and detail
- [x] `test_releases.py` — release CRUD
- [x] `test_carry_forward.py` — basic carry-forward
- [x] `test_export.py` — JSON and markdown export

### Needed tests

- [ ] `test_startup.py` (new) — reject default SECRET_KEY, reject default ADMIN_TOKEN, accept non-defaults
- [ ] `test_auth_audit.py` (new) — every admin endpoint returns 401 unauthenticated; public write endpoints do NOT return 401
- [ ] `test_auth.py` additions — registration edge cases: username < 3 chars, > 40 chars, special chars (@, space), password < 6 chars, duplicate username
- [ ] `test_results.py` additions — delete requires admin (flip existing test), admin can delete, arch validation rejects unknown, deploy_type validation rejects unknown, outcome optional for quick mode
- [ ] `test_confidence.py` (new) — 1 anonymous -> low, 2 anonymous -> low, 1 test-team -> medium, 2 test-team -> high, hardware diversity multiplier, zero results -> none
- [ ] `test_bulk_import.py` (new) — valid import, invalid outcome skipped, unmatched listed, closed milestone 409, ambiguous match rejected, arch/deploy_type validated
- [ ] `test_sections.py` (new) — category validation: valid category accepted, invalid rejected (422), null accepted
- [ ] `test_urgent_needs.py` (new) — blocker-only, excludes tested, ordering, cap at 10, total_count field, empty milestone, nonexistent milestone 404
- [ ] `test_carry_forward.py` additions — idempotency (second call returns copied:0), cross-release allowed
- [ ] `test_signoff.py` (new) — signoff sets fields, remove clears fields, reset returns count, reset with zero, all require admin, 404 cases
- [ ] `test_users.py` (new) — user list with counts, invalid role rejected, disable prevents login, 404 on nonexistent, both require admin

### Frontend

- [ ] Manual smoke test checklist (SPEC Section 13) — run against dev server before each deploy
- Automated frontend tests deferred to Phase 2 (Playwright)

---

## 9. Deployment & Infrastructure

### Containers

- [x] Backend Dockerfile — pip install, uvicorn
- [x] Frontend Dockerfile — multi-stage: node build -> nginx
- [x] Podman containers running on cairn-02
- [x] Backend mounts logs volume
- [x] Frontend on port 3001 (nginx), backend on port 8000

### Caddy + Cloudflare

- [x] Caddy reverse proxy: /api/* -> 8000, /* -> 3001
- [x] Cloudflare Tunnel provides TLS termination
- [x] Live at r3p.bradydibble.com

### Configuration

- [x] `.env` on cairn-02 has non-default SECRET_KEY and ADMIN_TOKEN
- [x] DATABASE_URL points to host PostgreSQL via host.containers.internal
- [ ] `.env.example` — replace "changeme" defaults with generation instructions
- [ ] `README.md` — update setup instructions for required .env customization

### Database

- [x] PostgreSQL 15 running on host
- [x] Alembic migrations 001-008 applied
- [ ] Migration 009 (compose_id) — apply to production

---

## 10. Open Questions — Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Carry-forward idempotency | Skip already-carried results by checking `(test_case_id, carried_from_milestone_id)` |
| 2 | Cross-release carry-forward | Allow — no constraint needed |
| 3 | Free-text arch/deploy_type | Server-side allowlist; reject unknown with 422 |
| 4 | Result deletion auth | Admin-only; owner-delete deferred to Phase 2 |
| 5 | Dual admin path (cookie vs role) | Keep — intentional for Phase 1 |
| 6 | Shared admin token | Acceptable for Phase 1; Keycloak OIDC in Phase 2 |
| 7 | Export access | Keep public — submitter names are voluntarily provided |
| 8 | Quick mode SKIP | Intentional omission — SKIP needs a reason, not suitable for quick mode |
| 9 | Disabled user results | Keep visible — data is still valid |
| 10 | Bulk import fuzzy match | Reject ambiguous matches; add to unmatched list |
| 11 | Urgent needs overflow | Add total_count to response; UI shows "and N more" |
| 12 | Session cleanup | On-login prune of expired sessions for the user |
| 13 | Pagination | Defer to Phase 2 |

---

## 11. Sequence of Implementation

Ordered by risk. Each phase is independently deployable. Phases 1-2 cannot be cut; Phases 3-6 can be trimmed under time pressure.

### Phase 1: Security — must ship

**1a. Result deletion auth** (`results.py`)
- Add `Depends(require_admin)` + import to `delete_result()`
- Update tests: unauthenticated delete -> expect 401; add admin delete test
- Files: 1 prod, 1 test

**1b. Startup secret validation** (`config.py`)
- Add Pydantic `model_validator(mode="after")` rejecting "changeme" values
- New `tests/test_startup.py`
- Update `.env.example` with generation instructions
- Files: 1 prod, 1 test, 1 config

**1c. CORS tightening** (`main.py`)
- Replace `allow_origins=["*"]` with explicit list
- Files: 1 prod

### Phase 2: Data integrity — must ship

**2a. Carry-forward idempotency** (`milestones.py`)
- Before copy loop: query existing carried results, build skip set of `(test_case_id, arch, outcome)`
- New test in `test_carry_forward.py`
- Files: 1 prod, 1 test

**2b. Outcome optionality** (`schemas/result.py`, `results.py`)
- Change `outcome: str` to `outcome: str | None = None`
- In submit_result(): return 422 if outcome is None for detailed mode
- New test: quick without outcome field
- Files: 2 prod, 1 test

**2c. Arch/deploy_type allowlist** (new `core/constants.py`, `results.py`, `import_results.py`)
- Define VALID_ARCHES and VALID_DEPLOY_TYPES
- Validate on result submission and bulk import; return 422 for unknown
- New `tests/test_bulk_import.py`; new tests in `test_results.py`
- Files: 3 prod, 2 test

**2d. Category + text field validation** (`sections.py`, `schemas/result.py`, `import_results.py`)
- Validate category against SECTION_CATEGORIES on section create/update (null allowed)
- Add max_length to hardware_notes (2000), comment (5000), bug_url (2000)
- Reject ambiguous fuzzy matches in bulk import
- New `tests/test_sections.py`; additions to `test_bulk_import.py`
- Files: 3 prod, 2 test

### Phase 3: Missing features — high value

**3a. Urgent needs overflow** (`milestones.py`)
- Compute total_count of qualifying blocker test cases before slicing to 10
- Wrap response: `{items: [...], total_count: N}`
- New `tests/test_urgent_needs.py`
- Files: 1 prod, 1 test

**3b. Milestone compose_id** (`models/milestone.py`, `schemas/milestone.py`, new migration)
- Add `compose_id: Mapped[str | None]` to model
- Add to create/update/response schemas
- New `alembic/versions/009_milestone_compose_id.py`
- Test: round-trip in `test_milestones.py`
- Files: 2 prod, 1 migration, 1 test

**3c. Session cleanup on login** (`auth.py`)
- In `login_user()` and `register()`: delete expired UserSession rows for the user
- Test: create expired session, login, verify old session gone
- Files: 1 prod, 1 test

### Phase 4: Frontend hardening — polish

**4a. Arch/deploy_type dropdowns** (`ResultForm.tsx`, `BulkUploadModal.tsx`)
- Replace free-text inputs with `<select>` matching backend constants
- Validate arch in pasted bulk JSON before submit
- Files: 2 frontend

**4b. Delete UX** (`TestCaseRow.tsx`)
- Confirmation dialog before delete
- Handle 401 with "Session expired" message
- Files: 1 frontend

**4c. Urgent needs + compose_id UI** (`api.ts`, `UrgentNeedsBanner.tsx`, `Admin.tsx`, `MilestoneDetail.tsx`)
- Update types for total_count and compose_id
- Show "and N more" in banner
- Add compose_id to admin form and detail view
- Files: 4 frontend

**4d. GuidedJourney + shell helper** (`GuidedJourney.tsx`, `r3p-helper.sh`)
- Replace generic upgrade commands with real Rocky 9.x paths
- Verify/fix shell helper deploy_type values against allowlist
- Files: 2 frontend

### Phase 5: Test coverage — safety net

**5a. Auth audit** (new `test_auth_audit.py`)
- Every admin endpoint returns 401 unauthenticated (~18 tests)
- Every public endpoint does NOT return 401 (~6 tests)
- Files: 1 test

**5b. Feature acceptance tests** (new files + additions)
- `test_confidence.py` — ~8 tests per AC-F3-*
- `test_signoff.py` — ~8 tests per AC-F6-*
- `test_users.py` — ~6 tests per AC-F9-*
- `test_auth.py` additions — ~5 registration edge cases
- Files: 3 new test, 1 test update

### Phase 6: Deployment readiness — ship it

**6a. Docs + deploy**
- Update README.md setup instructions
- Update SPEC.md — mark resolved questions, update bug status
- Run migration 009 on cairn-02
- Rebuild + redeploy both containers
- Run SPEC Section 13 validation checklist end-to-end
- Files: 2 docs

---

## 12. Hard Tradeoffs

**Arch/deploy_type strictness vs. community friction.**
Strict allowlists mean "kvm" gets a 422 — must be "vm-kvm". This prevents coverage fragmentation but may surprise community submitters. The shell helper and frontend dropdowns absorb most of this (users pick from a list, not type freehand). Direct API callers need to know the exact values. The allowlist lives in code, not DB — extending it requires a deploy, not a migration. This is acceptable at pilot scale.

**Default secret rejection vs. dev ergonomics.**
After Phase 1b, `make dev` fails without a customized `.env`. One-time setup cost. The alternative (warn but allow) risks a production deployment with "changeme". Strict rejection is worth it.

**Urgent needs response shape change.**
Moving from `list[UrgentNeed]` to `{items: [...], total_count: N}` is a breaking change for the frontend. The frontend and backend must be deployed together for Phase 3a. Alternatively, add `total_count` as a response header — but that's fragile. Wrapping is cleaner.

**Carry-forward idempotency detection.**
Checking `(test_case_id, carried_from_milestone_id)` catches exact re-runs but not partial re-runs (e.g., source milestone gets new results between carry-forward calls). Acceptable — carry-forward is a rare admin operation and the admin sees the `copied` count.

---

## 13. Rollback

| Phase | Revert Method | Data Impact |
|-------|--------------|-------------|
| 1a (delete auth) | Remove Depends(require_admin) | None |
| 1b (secret validation) | Remove model_validator | None |
| 1c (CORS) | Revert allow_origins | None |
| 2a (carry-forward) | Remove skip-set logic | None — allows duplicates again |
| 2b (outcome optional) | Revert schema field type | None — existing data unchanged |
| 2c (arch allowlist) | Remove validation | None — allows free-text again |
| 2d (category/text) | Remove validators | None |
| 3a (urgent needs) | Revert response shape + frontend | None |
| 3b (compose_id) | Revert code; column stays in DB (nullable, harmless) | None |
| 3c (session cleanup) | Remove prune call | Sessions accumulate again |
| 4 (frontend) | Redeploy previous container | No backend impact |
| 5 (tests) | Delete test files | No production impact |

---

## 14. Dependencies & Tooling

No new Python or npm packages. No new build tools. No new infrastructure. All changes use existing dependencies.

The only external coordination: verify `r3p-helper.sh` deploy_type output matches `VALID_DEPLOY_TYPES` before deploying Phase 2c.

---

## 15. What Can Be Cut

If May deadline forces scope reduction:

| | Cut? | Consequence |
|-|------|-------------|
| Phase 1 (security) | **Never** | Active exploitation risk |
| Phase 2 (data integrity) | **Never** | Coverage data degrades silently |
| Phase 3a (urgent needs overflow) | Yes | Minor — users don't see full count |
| Phase 3b (compose_id) | Yes | Admins track it externally |
| Phase 3c (session cleanup) | Yes | Table grows slowly; manual prune possible |
| Phase 4a (arch dropdowns) | Risky to cut | Without dropdowns, backend rejects free-text that users type |
| Phase 4b-4d (UX polish) | Yes | Cosmetic; no data impact |
| Phase 5 (tests) | Yes | Risk: future regressions |
| Phase 6 (docs) | Yes | Risk: onboarding friction |

**Minimum ship:** Phases 1 + 2 + 4a (dropdowns must match the allowlist from 2c).

---

## Summary

| Phase | What | Commits | Prod Files | Tests | Migrations |
|-------|------|---------|------------|-------|------------|
| 1 | Security | 3 | 3 | 4 | 0 |
| 2 | Data integrity | 4 | 8 | ~12 | 0 |
| 3 | Missing features | 3 | 5 | ~8 | 1 |
| 4 | Frontend | 4 | 8 | 0 | 0 |
| 5 | Tests | 2 | 0 | ~35 | 0 |
| 6 | Deploy | 1 | 2 | 0 | 0 |
| **Total** | | **17** | **~26** | **~59** | **1** |
