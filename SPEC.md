# R3P SPEC

**Rocky Release Readiness Platform**
**Version:** 1.0 (Phase 1 — May 2026 Pilot)
**Last Updated:** 2026-04-15

---

## 1. Purpose

R3P coordinates community testing of Rocky Linux release candidates. It replaces ad-hoc Mattermost threads and shared playbook docs with a structured web application that makes coverage gaps visible and test lead decisions data-driven.

**Scope:** RC testing events only (e.g., Rocky 9.8 RC, 10.2 RC, 11.0). Each release candidate gets a milestone with a full test playbook.

**Live:** https://r3p.bradydibble.com

---

## 2. Non-Goals

- Not a bug tracker (complements bugs.rockylinux.org)
- Not a CI/CD system or test orchestrator
- Not for ongoing errata or package testing between releases
- No real-time push updates (no WebSockets; clients poll via TanStack Query staleTime)
- No native mobile app (responsive web only)
- No internationalization / localization
- No result editing (delete + resubmit is the workflow)
- No automated test execution — import and manual submission only
- No RBAC beyond admin/tester/anonymous — fine-grained permissions are Phase 2
- No email or notification system — Mattermost integration is Phase 2
- No rate limiting or CAPTCHA — acceptable for Phase 1 pilot scale
- No audit log of admin actions — acceptable for Phase 1 shared-token model

---

## 3. Non-Functional Requirements

| Requirement | Target | Notes |
|-------------|--------|-------|
| API response time (reads) | < 500ms p95 | For milestones with < 500 test cases |
| API response time (writes) | < 1s p95 | Single result submission |
| Concurrent users | 100 | Pilot target |
| Frontend bundle size | < 500KB gzipped | |
| Browser support | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ | |
| Mobile | Responsive down to 375px width | No native app |
| Uptime | Best-effort | Single-node deployment, no HA |
| Data retention | Indefinite | Milestone data is permanent record |
| Password hashing | bcrypt, default work factor (12) | |
| Session TTL | 7 days (admin and user) | |
| TLS | Required in production | Via Cloudflare Tunnel |
| CORS | `allow_origins=["*"]` with `allow_credentials=True` | Should be tightened before production handoff |

---

## 4. Users

| Persona | Auth Tier | Core Need |
|---------|-----------|-----------|
| **Casual tester** | Anonymous | Submit "works on my hardware" in < 60 seconds |
| **Power user** | Registered (tester) | Per-test-case detailed reporting with attribution |
| **Test lead** | Registered (tester, is_test_team) | Coverage dashboard, confidence data, go/no-go view |
| **Admin** | Admin session | Create/manage releases, milestones, playbooks, users |

---

## 5. Boundaries

### Always Do

- Require `Depends(require_admin)` on every endpoint that creates, updates, or deletes releases, milestones, sections, test cases, or users
- Set cookies with `httponly=True` and `samesite="lax"`
- Validate `outcome` against the exact set `{PASS, FAIL, PARTIAL, SKIP}` server-side
- Validate `quick_outcome` against `{works, issues, broken}` server-side
- Reject result submissions to closed milestones with HTTP 409
- Use parameterized queries (SQLAlchemy ORM) for all database access — never raw SQL string interpolation
- Hash passwords with bcrypt before storage — never store plaintext
- Return 404 for nonexistent resources — never leak whether an ID exists via different error codes
- Keep `submit_time` server-generated (`server_default=func.now()`) — never trust client timestamps

### Ask First

- Before adding any new public (unauthenticated) write endpoint — currently only result submission and bulk import are public by design
- Before changing the confidence scoring weights or thresholds — test leads rely on these for go/no-go decisions
- Before changing the carry-forward matching logic (section name + test case name) — this affects data integrity across milestones
- Before adding cascade deletes to any new FK relationship — verify no orphan data risk
- Before changing cookie names (`admin_session`, `user_session`) — breaks existing sessions
- Before modifying the `SECTION_CATEGORIES` tuple — existing data references these values
- Before changing the CORS policy — currently permissive (`*`), needs tightening plan

### Never Do

- Never add a mutating endpoint (POST/PATCH/DELETE) without explicit auth consideration — the opt-in auth pattern means forgetting `Depends(require_admin)` silently creates an unauthenticated endpoint
- Never store plaintext passwords or session tokens — passwords use bcrypt, session tokens are random (`secrets.token_urlsafe(48)`)
- Never accept `user_id` or `submit_time` from client input — these are server-determined
- Never allow `ADMIN_TOKEN` or `SECRET_KEY` to remain at default `"changeme"` in any deployment — startup validation must reject defaults
- Never expose `password_hash` in any API response
- Never allow a disabled user (`disabled=True`) to authenticate or submit results
- Never trust client-side `isAdmin` state for authorization — always enforce server-side via `require_admin()`

---

## 6. Data Model

### Hierarchy

```
Release (e.g., "Rocky Linux 9.8")
  └─ Milestone (e.g., "beta", "rc1", "rc2")
       └─ Section (e.g., "Minimal Install — x86_64", category: installer)
            └─ Test Case (e.g., "Boot to login prompt", blocking: blocker)
                 └─ Result (PASS/FAIL/PARTIAL/SKIP + arch + hardware)
```

### Tables

**releases** — `id`, `name` (255), `version` (50), `notes` (text, nullable), `created_at`

**milestones** — `id`, `release_id` (FK cascade), `name` (50), `status` (open|closed), `start_date`, `end_date`, `download_url`, `created_at`

**sections** — `id`, `milestone_id` (FK cascade), `name` (255), `architecture` (50, nullable), `sort_order`, `category` (50, nullable)
- Valid categories: `installer`, `cloud`, `post_install`, `repository`, `virtualization`, `guest_compat`, `upgrade`, `security`, `hardware`, `operations`, `release_gate`

**test_cases** — `id`, `section_id` (FK cascade), `name` (500), `procedure_url`, `blocking` (blocker|normal), `sort_order`, `admin_signoff`, `signoff_by`, `signoff_at`

**results** — `id`, `test_case_id` (FK cascade), `outcome` (PASS|FAIL|PARTIAL|SKIP), `arch` (50), `deploy_type` (100), `hardware_notes`, `comment`, `submitter_name`, `submission_method` (quick|detailed|bulk), `quick_outcome` (works|issues|broken, nullable), `bug_url`, `submit_time`, `carried_from_milestone_id` (FK set null), `user_id` (FK set null)

**users** — `id`, `username` (40, unique), `display_name` (100), `password_hash` (bcrypt), `role` (tester|admin), `is_test_team`, `disabled`, `created_at`, `last_login`

**user_sessions** — `id`, `user_id` (FK cascade), `token` (64, unique), `created_at`, `expires_at`

### Missing Constraints (not enforced at DB level)

- `milestone.name` — free text, not constrained to lookahead/beta/rc1/rc2
- `section.category` — free text, not constrained to the SECTION_CATEGORIES tuple
- `results.arch` / `results.deploy_type` — free text, no enum
- No uniqueness on `(release.name, release.version)`
- `signoff_by` — free text, not FK to users
- Text fields (`hardware_notes`, `comment`, `bug_url`) — no length limits

---

## 7. Authentication & Authorization

### Auth Model

| Tier | Mechanism | Cookie | Session TTL |
|------|-----------|--------|-------------|
| Anonymous | None; optional `submitter_name` or `X-Username` header | none | n/a |
| Tester | Username + password (bcrypt) | `user_session` | 7 days |
| Admin | Shared `ADMIN_TOKEN` env var | `admin_session` (signed via itsdangerous) | 7 days |

### Behavior

- Authorization is **opt-in per endpoint** via `Depends(require_admin)` — no global middleware
- `get_current_user()` returns `User | None` — anonymous requests get `None`
- `GET /auth/me` returns `is_admin: true` if EITHER `admin_session` is valid OR user has `role: "admin"`
- Registration: username 3-40 chars (`[a-z0-9_-]`), password >= 6 chars, display_name 1-100 chars
- Session tokens: `secrets.token_urlsafe(48)` stored in `user_sessions`
- Admin session: `URLSafeTimedSerializer(SECRET_KEY, salt="admin-session").dumps("admin")`

### Acceptance Criteria

- [ ] **AC-AUTH-1:** `POST /auth/login` with correct `ADMIN_TOKEN` returns `200 {ok: true}` and sets `admin_session` cookie with `httponly`, `samesite=lax`, `max_age=604800`
- [ ] **AC-AUTH-2:** `POST /auth/login` with wrong token returns `401` with body `{detail: "Invalid token"}`
- [ ] **AC-AUTH-3:** `POST /auth/login` with empty string token returns `401`
- [ ] **AC-AUTH-4:** `POST /auth/register` with valid fields returns `201`-equivalent response with `{ok: true, user: {id, username, display_name, role: "tester", is_test_team: false}}` and sets `user_session` cookie
- [ ] **AC-AUTH-5:** `POST /auth/register` with duplicate username returns `409 {detail: "Username already taken"}`
- [ ] **AC-AUTH-6:** `POST /auth/register` with username < 3 chars or > 40 chars returns `422`
- [ ] **AC-AUTH-7:** `POST /auth/register` with password < 6 chars returns `422`
- [ ] **AC-AUTH-8:** `POST /auth/register` with username containing special chars (e.g., `@`, space) returns `422`
- [ ] **AC-AUTH-9:** `POST /auth/login-user` with valid credentials returns `200 {ok: true, user: {...}}`, sets `user_session` cookie, updates `last_login`
- [ ] **AC-AUTH-10:** `POST /auth/login-user` with wrong password returns `401 {detail: "Invalid username or password"}`
- [ ] **AC-AUTH-11:** `POST /auth/login-user` for disabled user returns `401` (same message — no information leakage)
- [ ] **AC-AUTH-12:** `POST /auth/logout` clears both `admin_session` and `user_session` cookies, deletes `user_sessions` row if exists, returns `200 {ok: true}`
- [ ] **AC-AUTH-13:** `GET /auth/me` unauthenticated returns `200 {is_admin: false, user: null}`
- [ ] **AC-AUTH-14:** `GET /auth/me` with valid admin session returns `{is_admin: true, user: null}`
- [ ] **AC-AUTH-15:** `GET /auth/me` with valid user session returns `{is_admin: false, user: {id, username, display_name, role, is_test_team}}`
- [ ] **AC-AUTH-16:** `GET /auth/me` after logout returns `{is_admin: false, user: null}`
- [ ] **AC-AUTH-17:** Expired user session (> 7 days) is rejected — `get_current_user()` returns `None`
- [ ] **AC-AUTH-18:** Every endpoint in the "Admin Endpoints" table returns `401 {detail: "Admin authentication required"}` without a valid `admin_session` cookie

---

## 8. Features & Acceptance Criteria

### F1: Result Submission

Two modes: **quick** (works/issues/broken) and **detailed** (PASS/FAIL/PARTIAL/SKIP).

- Quick outcome mapping: `works` -> `PASS`, `issues` -> `PARTIAL`, `broken` -> `FAIL`
- Submission blocked if milestone status is `"closed"` (409)
- Submitter resolution order: `body.submitter_name` > `X-Username` header > `current_user.display_name` > `None`
- `bug_url` must start with `"http"` if provided

**Acceptance Criteria:**

- [ ] **AC-F1-1:** `POST /test-cases/{id}/results` with `submission_method=quick, quick_outcome=works` stores `outcome=PASS`, returns `201` with `submission_method: "quick", quick_outcome: "works"`
- [ ] **AC-F1-2:** Quick `issues` stores `outcome=PARTIAL`; quick `broken` stores `outcome=FAIL`
- [ ] **AC-F1-3:** Quick submission with `quick_outcome=null` returns `422`
- [ ] **AC-F1-4:** Quick submission with `quick_outcome="dunno"` (invalid) returns `422`
- [ ] **AC-F1-5:** Detailed submission with `outcome="INVALID"` returns `422`
- [ ] **AC-F1-6:** Submission to a closed milestone returns `409` with detail containing `"closed"`
- [ ] **AC-F1-7:** Submission to nonexistent test case returns `404`
- [ ] **AC-F1-8:** Logged-in user's result has `user_id` set to their ID; anonymous result has `user_id: null`
- [ ] **AC-F1-9:** `submitter_name` in body takes precedence over `X-Username` header
- [ ] **AC-F1-10:** `X-Username` header is used when `submitter_name` is null and no user session
- [ ] **AC-F1-11:** `bug_url="bugzilla.redhat.com/1234"` (no scheme) returns `422`; `bug_url=null` is accepted; `bug_url="http://..."` is accepted
- [ ] **AC-F1-12:** Multiple results for the same test case are allowed (no uniqueness constraint)
- [ ] **AC-F1-13:** `submit_time` in response is server-generated, not client-provided
- [ ] **AC-F1-14:** `carried_from_milestone_id` is `null` for directly submitted results

### F2: Coverage Grid & Dashboard

- Grid: section x arch, cells contain PASS/FAIL/PARTIAL/SKIP counts
- Grid key format: `"{section_id}_{arch}"`
- Dashboard: grouped by `section.category`, total/covered per category
- Per-arch breakdown within each category

**Acceptance Criteria:**

- [ ] **AC-F2-1:** `GET /milestones/{id}/coverage` returns `arches` array containing exactly the set of arches that appear in any result for the milestone
- [ ] **AC-F2-2:** Grid cell for a section/arch with no results has all counts = 0 and total = 0
- [ ] **AC-F2-3:** Grid cell counts sum correctly: `total = pass_count + fail_count + partial_count + skip_count`
- [ ] **AC-F2-4:** `GET /milestones/{id}/coverage-summary` groups by `section.category`; sections with `category=null` fall under `"other"`
- [ ] **AC-F2-5:** Categories in response are ordered per `CATEGORY_LABELS` dict; unlisted categories sort last
- [ ] **AC-F2-6:** `total_tests` equals the count of all test cases in the milestone
- [ ] **AC-F2-7:** `total_with_results` equals the count of test cases with >= 1 result (any arch)
- [ ] **AC-F2-8:** `hardware_configs` counts unique `(arch, deploy_type, hardware_notes)` triples where `hardware_notes` is non-null and non-empty

### F3: Confidence Scoring

Reputation-weighted scoring per (category, arch) cell.

| Submitter | Weight |
|-----------|--------|
| Anonymous (`user_id` is null) | 1 |
| Logged-in tester (`user_id` set, `is_test_team=false`) | 2 |
| Test team member (`is_test_team=true`) | 3 |

- **Hardware diversity multiplier:** 3+ unique `"{deploy_type}|{hardware_notes}"` strings in a cell -> total weight * 1.5
- **Levels:** none (score < 1), low (1 <= score < 3), medium (3 <= score < 6), high (score >= 6)

**Acceptance Criteria:**

- [ ] **AC-F3-1:** Cell with 1 anonymous result: score=1 -> `"low"`
- [ ] **AC-F3-2:** Cell with 2 anonymous results: score=2 -> `"low"`
- [ ] **AC-F3-3:** Cell with 1 test-team result: score=3 -> `"medium"`
- [ ] **AC-F3-4:** Cell with 2 test-team results, < 3 hardware configs: score=6 -> `"high"`
- [ ] **AC-F3-5:** Cell with 2 test-team results on 3+ distinct hardware configs: score=6*1.5=9 -> `"high"`
- [ ] **AC-F3-6:** Cell with zero results: confidence=`"none"`
- [ ] **AC-F3-7:** Hardware diversity key format is `"{deploy_type}|{hardware_notes or ''}"` — empty hardware_notes uses empty string, not null
- [ ] **AC-F3-8:** Confidence is computed per (category, arch) cell and attached to `by_arch` in each `CategorySummary`

### F4: Milestone Carry-Forward

`POST /milestones/{target_id}/carry-forward` body: `{source_milestone_id: int}`

- Admin only
- Matches by `(section.name, test_case.name)` — case-sensitive, stripped
- Carried results have `carried_from_milestone_id` set to source

**Acceptance Criteria:**

- [ ] **AC-F4-1:** Results are copied to target test cases matched by exact `(section.name, test_case.name)`
- [ ] **AC-F4-2:** Unmatched source results are silently skipped — no error, not counted in `copied`
- [ ] **AC-F4-3:** Carried results retain `outcome`, `arch`, `deploy_type`, `hardware_notes`, `comment`, `submitter_name`, `submission_method`, `quick_outcome`, `bug_url` from source
- [ ] **AC-F4-4:** Carried results have `carried_from_milestone_id = source_milestone_id` and `user_id = null`
- [ ] **AC-F4-5:** Response body is `{copied: <int>, source_milestone_id: <int>}`
- [ ] **AC-F4-6:** Returns `401` without admin session
- [ ] **AC-F4-7:** Returns `404` if target or source milestone doesn't exist
- [ ] **AC-F4-8:** **Known bug:** Repeated calls create duplicate results (not idempotent)

### F5: Bulk Import

`POST /milestones/{id}/bulk-import`

- Public (no auth) — by design for community shell script submissions
- Body: `{submitter_name?, arch, deploy_type, hardware_notes?, results: [{section_name, test_case_name, outcome, comment?}]}`
- Milestone must exist and have `status="open"`
- Matching: exact `(section_name.lower().strip(), test_case_name.lower().strip())` first, then substring fallback
- All imported results tagged `submission_method="bulk"`

**Acceptance Criteria:**

- [ ] **AC-F5-1:** Valid results matched by exact case-insensitive name are imported with correct `outcome`, `arch`, `deploy_type`, `hardware_notes`
- [ ] **AC-F5-2:** Results with outcome not in `{PASS, FAIL, PARTIAL, SKIP}` (case-insensitive) are counted in `skipped`, not imported
- [ ] **AC-F5-3:** Unmatched `(section_name, test_case_name)` pairs appear in `unmatched` array as `"section_name / test_case_name"` strings
- [ ] **AC-F5-4:** Response body is `{imported: <int>, skipped: <int>, unmatched: [<string>]}`
- [ ] **AC-F5-5:** Closed milestone returns `409 {detail: "Milestone is closed"}`
- [ ] **AC-F5-6:** Nonexistent milestone returns `404`
- [ ] **AC-F5-7:** All imported results have `submission_method="bulk"` regardless of input

### F6: Admin Sign-off

- `POST /test-cases/{id}/signoff` — sets `admin_signoff=true`
- `DELETE /test-cases/{id}/signoff` — clears sign-off
- `POST /milestones/{id}/reset` — bulk-clears all sign-offs for a milestone

**Acceptance Criteria:**

- [ ] **AC-F6-1:** Signoff sets `admin_signoff=true`, `signoff_by` from `X-Username` header (defaults to `"admin"` if header absent), `signoff_at` to current UTC timestamp
- [ ] **AC-F6-2:** Remove signoff sets `admin_signoff=false`, `signoff_by=null`, `signoff_at=null`
- [ ] **AC-F6-3:** Reset returns `{reset: <count>, milestone_id: <id>}` where count is the number of test cases that had `admin_signoff=true`
- [ ] **AC-F6-4:** Reset with zero signed-off test cases returns `{reset: 0, ...}`
- [ ] **AC-F6-5:** Reset preserves all results — only clears signoff fields
- [ ] **AC-F6-6:** All three endpoints return `401` without admin session
- [ ] **AC-F6-7:** Signoff/remove on nonexistent test case returns `404`
- [ ] **AC-F6-8:** Reset on nonexistent milestone returns `404`

### F7: Urgent Needs

`GET /milestones/{id}/urgent-needs`

**Acceptance Criteria:**

- [ ] **AC-F7-1:** Returns only test cases with `blocking="blocker"`
- [ ] **AC-F7-2:** Excludes test cases with any result (any arch, any outcome)
- [ ] **AC-F7-3:** Each item includes `section_name`, `test_case_id`, `test_case_name`, `blocking`
- [ ] **AC-F7-4:** Response ordered by `section.sort_order` then `test_case.sort_order`
- [ ] **AC-F7-5:** Maximum 10 items returned even if more qualify
- [ ] **AC-F7-6:** Nonexistent milestone returns `404`
- [ ] **AC-F7-7:** Milestone with no blocker test cases returns empty array `[]`

### F8: Export

- `GET /milestones/{id}/export/json` — full data download
- `GET /milestones/{id}/export/markdown` — formatted report

**Acceptance Criteria:**

- [ ] **AC-F8-1:** JSON export response has `Content-Type: application/json` and `Content-Disposition: attachment; filename="{slug}-results.json"`
- [ ] **AC-F8-2:** JSON body contains `milestone` object (id, name, status, dates, release info) and `sections` array with nested `test_cases` and `results`
- [ ] **AC-F8-3:** Markdown export response has `Content-Type: text/markdown` and `Content-Disposition: attachment; filename="{slug}-results.md"`
- [ ] **AC-F8-4:** Markdown body contains `# {release_name} {milestone_name} — Test Results` header, summary stats, and per-section tables with columns: Test Case, Blocking, Results, Signoff
- [ ] **AC-F8-5:** Slug is lowercase, spaces and slashes replaced with hyphens
- [ ] **AC-F8-6:** Nonexistent milestone returns `404` for both formats

### F9: User Management (Admin)

- `GET /admin/users` — list all users with result counts
- `PATCH /admin/users/{id}` — update `role`, `is_test_team`, `disabled`

**Acceptance Criteria:**

- [ ] **AC-F9-1:** User list response includes `result_count` from COUNT of results with matching `user_id`
- [ ] **AC-F9-2:** Users ordered by `created_at` descending (newest first)
- [ ] **AC-F9-3:** `PATCH` with `role` not in `{tester, admin}` returns `400 {detail: "Invalid role"}`
- [ ] **AC-F9-4:** `PATCH` with `disabled: true` prevents future `POST /auth/login-user` for that user (returns `401`)
- [ ] **AC-F9-5:** `PATCH` on nonexistent user returns `404`
- [ ] **AC-F9-6:** Both endpoints return `401` without admin session

### F10: Onboarding & Guided Journey

**Acceptance Criteria:**

- [ ] **AC-F10-1:** First visit (`visited=false` in Zustand) shows OnboardingGuide component
- [ ] **AC-F10-2:** After dismissal, `visited=true` persists in localStorage; subsequent page loads skip OnboardingGuide
- [ ] **AC-F10-3:** Selecting "Walk me through it" sets `mode="guided"` and renders GuidedJourney
- [ ] **AC-F10-4:** Selecting "Show all tests" sets `mode="standard"` and renders full test case list with sections
- [ ] **AC-F10-5:** Mode persists across page reloads via localStorage
- [ ] **AC-F10-6:** Mode can be toggled from NavBar at any time

### F11: Shell Helper (`r3p-helper.sh`)

**Acceptance Criteria:**

- [ ] **AC-F11-1:** Running on Rocky Linux produces valid JSON output parseable by `JSON.parse()`
- [ ] **AC-F11-2:** Output JSON matches `BulkImportRequest` schema: `{submitter_name?, arch, deploy_type, hardware_notes?, results: [{section_name, test_case_name, outcome, comment?}]}`
- [ ] **AC-F11-3:** `arch` field matches `uname -m` output (e.g., `x86_64`, `aarch64`)
- [ ] **AC-F11-4:** All 8 checks (selinux, firewalld, dnf, ntp, ssh, boot-target, failed-services, journal-errors) produce `PASS` or `FAIL`
- [ ] **AC-F11-5:** `--milestone-id` and `--api-url` flags cause direct POST to `/api/v1/milestones/{id}/bulk-import`; exit code 0 on success, non-zero on failure
- [ ] **AC-F11-6:** Without `--api-url`, script outputs JSON to stdout only (no network calls)

---

## 9. API Surface

Base: `/api/v1`

### Public Endpoints (no auth)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/releases` | List with milestone stubs (test_case_count, result_count) |
| `GET` | `/releases/{id}` | Single release with milestone stubs |
| `GET` | `/milestones/{id}` | Full detail + sections + test cases + counts_by_arch |
| `GET` | `/milestones/{id}/coverage` | Section x arch grid |
| `GET` | `/milestones/{id}/coverage-summary` | Category-level with confidence scores |
| `GET` | `/milestones/{id}/urgent-needs` | Blocker test cases with zero results (max 10) |
| `GET` | `/milestones/{id}/hardware-coverage` | Unique hardware configs with result counts |
| `GET` | `/milestones/{id}/results` | All results, ordered by submit_time desc |
| `GET` | `/milestones/{id}/export/json` | JSON file download |
| `GET` | `/milestones/{id}/export/markdown` | Markdown file download |
| `GET` | `/milestones/{id}/sections` | Ordered by sort_order |
| `GET` | `/sections/{id}/test-cases` | Ordered by sort_order |
| `GET` | `/test-cases/{id}/results` | Ordered by submit_time desc |
| `POST` | `/test-cases/{id}/results` | Submit result (optional user session) |
| `POST` | `/milestones/{id}/bulk-import` | Batch result import |
| `POST` | `/auth/register` | Create user account |
| `POST` | `/auth/login` | Admin token login |
| `POST` | `/auth/login-user` | User password login |
| `POST` | `/auth/logout` | Clear all session cookies |
| `GET` | `/auth/me` | Current session status |
| `GET` | `/api/health` | Returns `{status: "ok"}` (outside /api/v1 prefix) |

### Admin Endpoints (`Depends(require_admin)`)

| Method | Path |
|--------|------|
| `POST` | `/releases` |
| `PATCH` | `/releases/{id}` |
| `DELETE` | `/releases/{id}` |
| `POST` | `/milestones/releases/{release_id}` |
| `PATCH` | `/milestones/{id}` |
| `DELETE` | `/milestones/{id}` |
| `POST` | `/milestones/{id}/carry-forward` |
| `POST` | `/milestones/{id}/reset` |
| `POST` | `/milestones/{id}/sections` |
| `PATCH` | `/sections/{id}` |
| `DELETE` | `/sections/{id}` |
| `POST` | `/sections/{id}/test-cases` |
| `PATCH` | `/test-cases/{id}` |
| `DELETE` | `/test-cases/{id}` |
| `POST` | `/test-cases/{id}/signoff` |
| `DELETE` | `/test-cases/{id}/signoff` |
| `GET` | `/admin/users` |
| `PATCH` | `/admin/users/{id}` |

### Broken Endpoint

| Method | Path | Issue |
|--------|------|-------|
| `DELETE` | `/results/{id}` | **Missing auth** — currently unauthenticated; must require admin |

---

## 10. Known Bugs

| # | Severity | Description | File:Line |
|---|----------|-------------|-----------|
| 1 | **HIGH** | `DELETE /results/{id}` has no auth — anyone can delete any result by integer ID | `results.py:100` |
| 2 | **HIGH** | `SECRET_KEY` and `ADMIN_TOKEN` default to `"changeme"` with no startup rejection | `config.py:8-9` |
| 3 | MEDIUM | Carry-forward creates duplicates on repeated calls (not idempotent) | `milestones.py:620` |
| 4 | LOW | `ResultCreate.outcome` is required even for quick submissions (ignored but must be provided) | `schemas/result.py:7` |
| 5 | LOW | Urgent-needs capped at 10 with no overflow indicator | `milestones.py:287` |
| 6 | LOW | No compose/image ID field on milestones | `models/milestone.py` |
| 7 | LOW | GuidedJourney upgrade path commands are generic placeholder text | `GuidedJourney.tsx` |

---

## 11. Open Questions

### Data Integrity

1. **Carry-forward idempotency:** Should repeated calls skip results already carried (match by `carried_from_milestone_id`)? Or is "admin operates carefully" sufficient?
2. **Cross-release carry-forward:** Should carry-forward be restricted to milestones within the same release? Currently no constraint.
3. **Free-text arch/deploy_type:** Risk of fragmentation (e.g., `"x86_64"` vs `"amd64"`). Constrain to allowlist, normalize on write, or leave free-text?

### Auth & Access

4. **Result deletion auth scope:** Admin-only, or also allow the result's submitter (matched by `user_id`) to delete their own?
5. **Dual admin path:** `GET /auth/me` returns `is_admin: true` via admin_session cookie OR user `role: "admin"`. Intentional? A user promoted to `role: "admin"` gets admin without knowing the token.
6. **Shared admin token:** Single `ADMIN_TOKEN` for all admins — no individual attribution. Acceptable for Phase 1?
7. **Export access:** Exports are fully public, exposing submitter names. Should they require auth?

### UX

8. **Quick mode SKIP:** SKIP is unavailable in quick mode. Intentional?
9. **Disabled user results:** Existing results from disabled users remain visible. Should they be flagged or hidden?
10. **Bulk import fuzzy matching:** Multiple partial matches take first iteration result. Should ambiguous matches be rejected instead?
11. **Urgent needs overflow:** Cap at 10 with no "N more" indicator. Add total count?

### Infrastructure

12. **Session cleanup:** Expired `user_sessions` rows accumulate. Add periodic prune?
13. **Pagination:** No list endpoint is paginated. Acceptable at pilot scale?

---

## 12. Risks / Assumptions

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Insecure defaults ship to new deployments | HIGH — full admin takeover | HIGH if .env absent | Startup validation rejecting "changeme" |
| Unauthenticated result deletion | HIGH — data destruction | MEDIUM | Add `Depends(require_admin)` to `DELETE /results/{id}` |
| Opt-in auth pattern — forgetting auth on new endpoints | MEDIUM — silent unauthed access | MEDIUM as codebase grows | Integration test asserting all POST/PATCH/DELETE endpoints require auth |
| Free-text arch/deploy_type fragmentation | MEDIUM — unreliable coverage data | MEDIUM | Allowlist or server-side normalization |
| Carry-forward duplication | MEDIUM — inflated coverage | LOW — rare admin operation | Idempotency check before copy |
| CORS `allow_origins=["*"]` | MEDIUM — cross-origin attacks possible | LOW in current deployment | Restrict to known origins before RESF handoff |
| Session table unbounded growth | LOW — DB bloat | MEDIUM over time | Cron job or on-login prune of expired rows |
| No pagination on list endpoints | LOW — slow responses at scale | LOW for pilot | Add cursor/offset pagination before scaling |

### Assumptions

- PostgreSQL 15+ is the only supported database; tests use SQLite in-memory via aiosqlite
- Phase 1 pilot: < 50 active users, < 500 test cases per milestone, < 5000 results per milestone
- Admin operations (carry-forward, reset, user management) are low-volume manual actions
- bcrypt default work factor (12 rounds) is acceptable
- 7-day session TTL is acceptable for both admin and user sessions
- `SameSite=lax` cookies provide sufficient CSRF protection for same-origin requests
- `ADMIN_TOKEN` is shared among a small trusted group (< 5 people)
- Frontend and API are served from the same origin in production (Caddy reverse proxy)
- Cloudflare Tunnel provides TLS termination; backend serves HTTP only
- No load balancer or horizontal scaling needed for Phase 1

---

## 13. Validation

Commands and checks to run when implementation is complete. All should pass before a release is considered ready.

### Backend Tests

```bash
# Run full test suite (SQLite in-memory, no live DB needed)
cd backend && python -m pytest tests/ -v

# Run inside the deployed container
bash backend/run_tests.sh -v

# Individual test modules
python -m pytest tests/test_auth.py -v
python -m pytest tests/test_results.py -v
python -m pytest tests/test_milestones.py -v
python -m pytest tests/test_releases.py -v
python -m pytest tests/test_carry_forward.py -v
python -m pytest tests/test_export.py -v
```

### Frontend Build

```bash
cd frontend && npx tsc --noEmit      # TypeScript type check (zero errors)
cd frontend && npm run build          # Vite production build (exit 0)
```

### Database Migrations

```bash
cd backend && alembic upgrade head    # All migrations apply cleanly
cd backend && alembic check           # No pending migrations
```

### Security Checks

```bash
# Bug #1: Result deletion requires admin
curl -s -o /dev/null -w "%{http_code}" -X DELETE http://localhost:8000/api/v1/results/1
# Expected: 401 (currently returns 204 or 404 — this is the bug)

# Bug #2: Startup rejects default secrets
SECRET_KEY=changeme ADMIN_TOKEN=changeme python -c "from app.main import app"
# Expected: RuntimeError or sys.exit(1)
```

### Auth Audit

```bash
# Verify every POST/PATCH/DELETE endpoint (except public write endpoints) requires admin.
# Public write exceptions: /auth/login, /auth/register, /auth/login-user, /auth/logout,
#   /test-cases/{id}/results, /milestones/{id}/bulk-import
# All other mutating endpoints must return 401 without admin_session cookie.

# Smoke test: unauthenticated POST to an admin endpoint
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/v1/releases \
  -H "Content-Type: application/json" -d '{"name":"test","version":"1.0"}'
# Expected: 401
```

### API Smoke Tests (against running instance)

```bash
# Health check
curl -s http://localhost:8000/api/health
# Expected: {"status":"ok"}

# List releases (public)
curl -s http://localhost:8000/api/v1/releases
# Expected: 200, JSON array

# Unauthenticated admin action (should fail)
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/v1/releases \
  -H "Content-Type: application/json" -d '{"name":"x","version":"1"}'
# Expected: 401

# Submit result to nonexistent test case
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/v1/test-cases/999999/results \
  -H "Content-Type: application/json" -d '{"outcome":"PASS","arch":"x86_64","deploy_type":"bare-metal"}'
# Expected: 404
```

### Frontend Smoke Tests (manual, against dev server)

1. Load `/` — releases and milestones render, OnboardingGuide appears on first visit
2. Navigate to a milestone — CoverageDashboard, test case sections, and FiltersBar render
3. Submit a quick result (works/issues/broken) — confirm 201, result appears in test case row
4. Submit a detailed result (PASS with hardware notes) — confirm 201, result appears
5. Toggle "Untested only" filter — only test cases with zero results shown
6. Toggle "Blockers only" filter — only blocker test cases shown
7. Register a new user — confirm cookie set, NavBar shows username
8. Log in as admin — confirm admin panel accessible, can create release
9. Export JSON — file downloads with correct filename
10. Export Markdown — file downloads with correct filename

---

## 14. Phase 2 Roadmap

Not in scope for Phase 1. Planned after May pilot feedback.

- **RESF Keycloak OIDC** — accounts.rockylinux.org, Authorization Code + PKCE
- **Mattermost OAuth** — chat.rockylinux.org as primary community login
- **Trust tiers** — anonymous (0.25) / community (0.50-0.75) / core team (1.00) replacing current weights
- **OpenQA import** — auto-import from Rocky's OpenQA instance
- **Sparky webhook** — receive Sparky test results
- **API tokens** — user-generated, scoped, hashed tokens for automation
- **Release readiness scoring** — formal go/no-go dashboard with weighted pass rates
- **Mattermost notifications** — post coverage updates to Testing channel
- **Pagination** — cursor-based pagination on list endpoints
- **Session cleanup** — periodic prune of expired user_sessions rows
- **CORS tightening** — restrict `allow_origins` to known production domains
