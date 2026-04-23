# R3P Tasks

**Source:** SPEC.md + PLAN.md
**Legend:** `[ ]` todo, `[x]` done, `[!]` risky/irreversible

---

## Phase 1: Security

### 1. `[ ]` Add admin auth to DELETE /results/{id}

- **Goal:** Fix SPEC Bug #1 (HIGH). Unauthenticated users can currently delete any result by integer ID.
- **Files:** `backend/app/api/v1/results.py`
- **Validation:** `curl -X DELETE .../api/v1/results/1` returns 401 without admin cookie.
- **Prerequisites:** None.

### 2. `[ ]` Write tests for result deletion auth

- **Goal:** Lock in Bug #1 fix with regression tests.
- **Files:** `backend/tests/test_results.py`
- **Validation:** `pytest tests/test_results.py -v` — unauthenticated delete returns 401; admin delete returns 204; admin delete of nonexistent returns 404.
- **Prerequisites:** Task 1.

### 3. `[!]` Add startup rejection of default secrets

- **Goal:** Fix SPEC Bug #2 (HIGH). App must refuse to start if SECRET_KEY or ADMIN_TOKEN is "changeme".
- **Files:** `backend/app/core/config.py`
- **Validation:** `SECRET_KEY=changeme ADMIN_TOKEN=changeme python -c "from app.core.config import settings"` raises RuntimeError.
- **Prerequisites:** None.
- **Risk:** Breaks `make dev` if `.env` is not customized. Intentional — one-time setup cost.

### 4. `[ ]` Write tests for startup secret validation

- **Goal:** Regression tests for Bug #2 fix.
- **Files:** `backend/tests/test_startup.py` (new)
- **Validation:** `pytest tests/test_startup.py -v` — 3 tests pass: reject default SECRET_KEY, reject default ADMIN_TOKEN, accept non-defaults.
- **Prerequisites:** Task 3.

### 5. `[ ]` Update .env.example with generation instructions

- **Goal:** Replace "changeme" defaults so new developers don't hit startup rejection without guidance.
- **Files:** `.env.example`
- **Validation:** File contains no literal "changeme"; includes `python -c "import secrets; print(secrets.token_hex(32))"` command.
- **Prerequisites:** Task 3.

### 6. `[!]` Tighten CORS allow_origins

- **Goal:** Replace `allow_origins=["*"]` with explicit origin list. Current config allows any origin to make credentialed requests.
- **Files:** `backend/app/main.py`
- **Validation:** App starts; frontend at r3p.bradydibble.com works; arbitrary origin is rejected by browser CORS policy.
- **Prerequisites:** None.
- **Risk:** If any unlisted origin needs access, it will be blocked. Must include localhost dev ports.

---

## Phase 2: Data Integrity

### 7. `[ ]` Make carry-forward idempotent

- **Goal:** Fix SPEC Bug #3. Repeated carry-forward calls currently create duplicate results.
- **Files:** `backend/app/api/v1/milestones.py`
- **Validation:** Call carry-forward twice with same source; second call returns `{copied: 0}`.
- **Prerequisites:** None.

### 8. `[ ]` Write test for carry-forward idempotency

- **Goal:** Regression test for Bug #3 fix.
- **Files:** `backend/tests/test_carry_forward.py`
- **Validation:** `pytest tests/test_carry_forward.py::test_carry_forward_idempotent -v` passes.
- **Prerequisites:** Task 7.

### 9. `[ ]` Make ResultCreate.outcome optional for quick submissions

- **Goal:** Fix SPEC Bug #4. Quick submissions currently require the `outcome` field even though it's ignored.
- **Files:** `backend/app/schemas/result.py`, `backend/app/api/v1/results.py`
- **Validation:** Quick submission without `outcome` field returns 201. Detailed submission without `outcome` returns 422.
- **Prerequisites:** None.

### 10. `[ ]` Write test for outcome optionality

- **Goal:** Regression test for Bug #4 fix.
- **Files:** `backend/tests/test_results.py`
- **Validation:** `pytest tests/test_results.py::test_quick_without_outcome_field -v` passes.
- **Prerequisites:** Task 9.

### 11. `[ ]` Create shared constants module for arch/deploy_type allowlists

- **Goal:** Define VALID_ARCHES and VALID_DEPLOY_TYPES in a single shared location.
- **Files:** `backend/app/core/constants.py` (new)
- **Validation:** Module imports cleanly; contains both sets.
- **Prerequisites:** None.

### 12. `[ ]` Add arch/deploy_type validation to result submission

- **Goal:** Reject unknown arch/deploy_type values with 422 on `POST /test-cases/{id}/results`.
- **Files:** `backend/app/api/v1/results.py`
- **Validation:** Submit with `arch="amd64"` returns 422; submit with `arch="x86_64"` returns 201.
- **Prerequisites:** Task 11.

### 13. `[ ]` Add arch/deploy_type validation to bulk import

- **Goal:** Reject unknown arch/deploy_type values with 422 on `POST /milestones/{id}/bulk-import`.
- **Files:** `backend/app/api/v1/import_results.py`
- **Validation:** Bulk import with `arch="amd64"` returns 422.
- **Prerequisites:** Task 11.

### 14. `[ ]` Write tests for arch/deploy_type validation

- **Goal:** Cover validation on both result submission and bulk import.
- **Files:** `backend/tests/test_results.py`, `backend/tests/test_bulk_import.py` (new)
- **Validation:** `pytest tests/test_results.py tests/test_bulk_import.py -v` — invalid arch/deploy_type tests pass.
- **Prerequisites:** Tasks 12, 13.

### 15. `[ ]` Add category validation to section create/update

- **Goal:** Validate `category` against `SECTION_CATEGORIES` tuple. Null is allowed; unknown strings are rejected with 422.
- **Files:** `backend/app/api/v1/sections.py`
- **Validation:** Create section with `category="bogus"` returns 422; `category=null` returns 201; `category="installer"` returns 201.
- **Prerequisites:** None.

### 16. `[ ]` Write tests for section category validation

- **Goal:** Cover category validation on create and update.
- **Files:** `backend/tests/test_sections.py` (new)
- **Validation:** `pytest tests/test_sections.py -v` — valid/invalid/null category tests pass.
- **Prerequisites:** Task 15.

### 17. `[ ]` Add text field length limits to result schemas

- **Goal:** Add `max_length` constraints: hardware_notes (2000), comment (5000), bug_url (2000).
- **Files:** `backend/app/schemas/result.py`
- **Validation:** Submit result with 3000-char hardware_notes returns 422.
- **Prerequisites:** None.

### 18. `[ ]` Reject ambiguous fuzzy matches in bulk import

- **Goal:** When partial/substring matching hits multiple test cases, add to `unmatched` instead of picking the first match.
- **Files:** `backend/app/api/v1/import_results.py`
- **Validation:** Bulk import with an ambiguous name that matches 2+ test cases appears in `unmatched` array.
- **Prerequisites:** None.

### 19. `[ ]` Write test for ambiguous fuzzy match rejection

- **Goal:** Cover the ambiguous match edge case.
- **Files:** `backend/tests/test_bulk_import.py`
- **Validation:** `pytest tests/test_bulk_import.py::test_ambiguous_match_rejected -v` passes.
- **Prerequisites:** Task 18.

---

## Phase 3: Missing Features

### 20. `[ ]` Add total_count to urgent-needs response

- **Goal:** Fix SPEC Bug #5. Response currently returns max 10 items with no indication of how many were omitted.
- **Files:** `backend/app/api/v1/milestones.py`
- **Validation:** Milestone with 15 untested blockers returns `{items: [...10...], total_count: 15}`.
- **Prerequisites:** None.
- **Note:** Changes response shape from `list[UrgentNeed]` to `{items: list[UrgentNeed], total_count: int}`. Frontend must be updated (Task 28) before deploying together.

### 21. `[ ]` Write tests for urgent-needs endpoint

- **Goal:** Cover blocker-only filtering, ordering, cap, total_count, empty state, 404.
- **Files:** `backend/tests/test_urgent_needs.py` (new)
- **Validation:** `pytest tests/test_urgent_needs.py -v` — all pass.
- **Prerequisites:** Task 20.

### 22. `[ ]` Add compose_id column to milestones

- **Goal:** Fix SPEC Bug #6. Add nullable `compose_id` field for tracking compose/image IDs.
- **Files:** `backend/app/models/milestone.py`, `backend/app/schemas/milestone.py`, `backend/alembic/versions/009_milestone_compose_id.py` (new)
- **Validation:** `alembic upgrade head` succeeds; milestone create/update/response includes `compose_id`; existing milestones have `compose_id: null`.
- **Prerequisites:** None.

### 23. `[ ]` Write test for compose_id round-trip

- **Goal:** Verify compose_id flows through create, read, update.
- **Files:** `backend/tests/test_milestones.py`
- **Validation:** `pytest tests/test_milestones.py::test_compose_id_roundtrip -v` passes.
- **Prerequisites:** Task 22.

### 24. `[ ]` Add session cleanup on user login

- **Goal:** Delete expired `user_sessions` rows for the authenticating user during login and registration.
- **Files:** `backend/app/api/v1/auth.py`
- **Validation:** Create session, advance time past expiry, login again — expired row is deleted from DB.
- **Prerequisites:** None.

### 25. `[ ]` Write test for session cleanup

- **Goal:** Verify expired sessions are pruned on login.
- **Files:** `backend/tests/test_auth.py`
- **Validation:** `pytest tests/test_auth.py::test_expired_sessions_pruned_on_login -v` passes.
- **Prerequisites:** Task 24.

---

## Phase 4: Frontend Hardening

### 26. `[ ]` Replace free-text arch/deploy_type with dropdowns in ResultForm

- **Goal:** Prevent users from typing values the backend will reject. Match values to `VALID_ARCHES` / `VALID_DEPLOY_TYPES`.
- **Files:** `frontend/src/components/ResultForm.tsx`
- **Validation:** Form shows `<select>` for arch and deploy_type; no free-text input; selected values are accepted by backend.
- **Prerequisites:** Task 11 (constants defined).

### 27. `[ ]` Add arch validation to BulkUploadModal

- **Goal:** Validate arch in pasted JSON against allowlist before submitting to backend.
- **Files:** `frontend/src/components/BulkUploadModal.tsx`
- **Validation:** Pasting JSON with `arch: "bogus"` shows validation error before submit.
- **Prerequisites:** Task 11.

### 28. `[ ]` Update UrgentNeedsBanner for total_count

- **Goal:** Show "and N more untested blockers" when total_count exceeds displayed count.
- **Files:** `frontend/src/lib/api.ts`, `frontend/src/components/UrgentNeedsBanner.tsx`
- **Validation:** With 15 untested blockers, banner shows 10 items plus "and 5 more untested blockers".
- **Prerequisites:** Task 20 (backend response shape changed).

### 29. `[ ]` Add confirmation dialog to result delete

- **Goal:** Prevent accidental deletion. Show "Delete this result?" dialog; handle 401 with "Session expired" message.
- **Files:** `frontend/src/components/TestCaseRow.tsx`
- **Validation:** Click delete -> dialog appears -> confirm -> result deleted; without admin session -> shows error.
- **Prerequisites:** Task 1 (backend now requires admin).

### 30. `[ ]` Add compose_id to admin milestone form

- **Goal:** Optional compose_id text field in milestone create/edit.
- **Files:** `frontend/src/pages/Admin.tsx`
- **Validation:** Create milestone with compose_id -> value persisted; edit to clear -> null.
- **Prerequisites:** Task 22 (backend field exists).

### 31. `[ ]` Display compose_id on MilestoneDetail page

- **Goal:** Show compose_id as metadata if present.
- **Files:** `frontend/src/pages/MilestoneDetail.tsx`, `frontend/src/lib/api.ts`
- **Validation:** Milestone with compose_id shows it; without shows nothing (no empty label).
- **Prerequisites:** Task 22.

### 32. `[ ]` Replace GuidedJourney generic upgrade commands

- **Goal:** Fix SPEC Bug #7. Replace placeholder text with real Rocky 9.x upgrade paths.
- **Files:** `frontend/src/components/GuidedJourney.tsx`
- **Validation:** Upgrade section shows `dnf upgrade` commands specific to Rocky 9.x.
- **Prerequisites:** None.

### 33. `[ ]` Verify r3p-helper.sh deploy_type output matches allowlist

- **Goal:** Ensure shell helper output is accepted by the new backend validation.
- **Files:** `frontend/public/r3p-helper.sh`
- **Validation:** Run helper on a Rocky VM; `deploy_type` value exists in `VALID_DEPLOY_TYPES`; bulk import returns 200.
- **Prerequisites:** Task 11 (allowlist defined), Task 13 (validation active).

---

## Phase 5: Test Coverage

### 34. `[ ]` Write auth audit regression test

- **Goal:** Systematically verify every admin endpoint returns 401 unauthenticated; every public endpoint does not.
- **Files:** `backend/tests/test_auth_audit.py` (new)
- **Validation:** `pytest tests/test_auth_audit.py -v` — ~24 tests pass.
- **Prerequisites:** Task 1 (delete auth fixed).

### 35. `[ ]` Write confidence scoring tests

- **Goal:** Cover all AC-F3-* acceptance criteria: weights, hardware multiplier, levels.
- **Files:** `backend/tests/test_confidence.py` (new)
- **Validation:** `pytest tests/test_confidence.py -v` — ~8 tests pass.
- **Prerequisites:** None (confidence scoring already implemented).

### 36. `[ ]` Write sign-off and reset tests

- **Goal:** Cover AC-F6-*: signoff sets fields, remove clears, reset returns count, auth required, 404 cases.
- **Files:** `backend/tests/test_signoff.py` (new)
- **Validation:** `pytest tests/test_signoff.py -v` — ~8 tests pass.
- **Prerequisites:** None (signoff already implemented).

### 37. `[ ]` Write user management tests

- **Goal:** Cover AC-F9-*: user list with counts, invalid role rejected, disable prevents login, 404, auth required.
- **Files:** `backend/tests/test_users.py` (new)
- **Validation:** `pytest tests/test_users.py -v` — ~6 tests pass.
- **Prerequisites:** None (user management already implemented).

### 38. `[ ]` Write registration edge-case tests

- **Goal:** Cover AC-AUTH-6 through AC-AUTH-8: username too short, too long, special chars, password too short, duplicate.
- **Files:** `backend/tests/test_auth.py`
- **Validation:** `pytest tests/test_auth.py -v` — new edge-case tests pass alongside existing tests.
- **Prerequisites:** None (registration already implemented).

### 39. `[ ]` Write bulk import test suite

- **Goal:** Cover AC-F5-*: valid import, invalid outcome skipped, unmatched listed, closed milestone 409, submission_method="bulk".
- **Files:** `backend/tests/test_bulk_import.py`
- **Validation:** `pytest tests/test_bulk_import.py -v` — ~6 tests pass.
- **Prerequisites:** Tasks 13, 18 (validation and fuzzy match changes).

---

## Phase 6: Deployment

### 40. `[ ]` Update README.md setup instructions

- **Goal:** Document required `.env` customization, secret generation commands, and dev setup.
- **Files:** `README.md`
- **Validation:** Following README from scratch on a clean machine reaches working `make dev`.
- **Prerequisites:** Task 5 (.env.example updated).

### 41. `[ ]` Update SPEC.md with resolved questions and fixed bugs

- **Goal:** Mark open questions as resolved; update known bugs section with fix status.
- **Files:** `SPEC.md`
- **Validation:** No stale "open" items that have been decided; bug table shows fix status.
- **Prerequisites:** All prior tasks.

### 42. `[!]` Run migration 009 on production

- **Goal:** Apply compose_id migration to cairn-02 PostgreSQL.
- **Files:** None (DB operation)
- **Validation:** `alembic current` shows head at 009; `\d milestones` shows `compose_id` column.
- **Prerequisites:** Task 22 (migration file exists).
- **Risk:** DDL on production database. Nullable column add is safe (no lock, no rewrite), but verify on a test DB first.

### 43. `[!]` Rebuild and redeploy containers

- **Goal:** Deploy all changes to cairn-02.
- **Files:** None (ops)
- **Validation:** Run SPEC Section 13 validation checklist end-to-end against production.
- **Prerequisites:** All prior tasks. Migration 009 applied first (Task 42).
- **Risk:** Downtime during container restart (~30 seconds). CORS change may break if origins are wrong.

### 44. `[ ]` Run full validation checklist

- **Goal:** Execute every check in SPEC Section 13 against the deployed instance.
- **Files:** None
- **Validation:** Backend tests pass in container (`run_tests.sh`); frontend builds; security curl checks return expected codes; manual smoke tests pass.
- **Prerequisites:** Task 43.

---

## Dependency Graph (critical path only)

```
Task 1 (delete auth) ─── Task 2 (tests) ─── Task 29 (frontend delete UX)
                                           └── Task 34 (auth audit)

Task 3 (secret validation) ─── Task 4 (tests)
                             └── Task 5 (.env.example)

Task 11 (constants) ─── Task 12 (result validation) ─── Task 14 (tests)
                     ├── Task 13 (import validation) ─┘
                     ├── Task 26 (frontend dropdowns)
                     ├── Task 27 (bulk modal validation)
                     └── Task 33 (shell helper verify)

Task 20 (urgent needs) ─── Task 21 (tests)
                         └── Task 28 (frontend banner)

Task 22 (compose_id) ─── Task 23 (tests)
                       ├── Task 30 (admin form)
                       └── Task 31 (detail page)

All tasks ─── Task 42 (migration) ─── Task 43 (deploy) ─── Task 44 (validation)
```
