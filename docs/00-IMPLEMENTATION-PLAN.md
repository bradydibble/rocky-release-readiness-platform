# R3P Implementation Plan

**Project:** Rocky Release Readiness Platform (R3P)
**Purpose:** Coordinate community testing of Rocky Linux release candidates
**Status:** Active Development — May release pilot target
**Last Updated:** April 2026

## Vision

R3P is a test playbook, tracker, and community orchestrator for the Rocky Enterprise Software Foundation (RESF). It coordinates community participation to surface coverage gaps in QA — enabling the team to remediate those gaps and build measurable confidence in stability before a release is declared live.

**Scope:** R3P is specifically for RC testing events (e.g., Rocky 9.8 RC, 10.2 RC, 11.0). It is NOT for ongoing errata or package testing during the life of a minor version. Each test run follows the full playbook: Community items → Repository checks → Installer (OpenQA) → Post-installation → Cloud images → SIG/AltArch → Final release → Operations.

## Why We're Building This

Rocky Linux release candidates need rigorous community testing before a version ships. Today that coordination happens through Mattermost threads and shared playbook documents — a process that works but creates real friction: results are scattered, gaps are invisible until someone manually surveys the threads, and test team leads carry the mental overhead of synthesizing it all under pressure to move faster.

R3P replaces that with a structured, visible process where anyone can contribute and the state of testing is always clear.

The platform exists to produce four outcomes:

**1. Faster release turnaround.** Rocky Linux release candidates reach general availability sooner after the corresponding RHEL release. Time currently lost to uncoordinated testing, ad-hoc result collection, and manual gap assessment gets compressed into a structured, visible process with clear progress indicators.

**2. Higher confidence in stability.** Test leads make the go/live call backed by explicit coverage data — across architectures, deployment types, and community hardware — not intuition and Mattermost threads. The platform makes coverage gaps visible before they become post-release bugs.

**3. Broader community participation.** Contributing test results becomes frictionless: no account required, clear direction on what to test, and explicit signals showing where coverage is most needed. More contributors, more hardware diversity, less guesswork about what the community has actually validated.

**4. Lower cognitive load on test leads.** The current overhead — tracking playbooks in Mattermost, fielding ad-hoc reports, synthesizing coverage mentally, and making judgment calls under pressure to ship — is replaced by a single dashboard that shows what's covered, what isn't, and what blocking issues remain.

## Core Objectives

1. **Highlight Testing Gaps** - Make it visible what needs testing across hardware, versions, architectures
2. **Simplify Result Reporting** - Easy submission for anonymous drive-bys through to core team members
3. **Provide Leadership Insights** - Give test team leaders release readiness metrics (raw + trust-weighted)
4. **Recognize Contributors** - Pride and accomplishment through visible contributions
5. **Increase Participation** - Lower barriers, better UX, clearer value proposition

## Guiding Principles

- **Web-accessible** - No client installation required
- **Anonymous-first** - Drive-by submissions always welcome
- **Simple and efficient** - Minimal clicks to contribute
- **UX-first** - Modern, intuitive interface
- **Mobile-friendly** - Test on physical hardware with ease
- **Spam-resistant** - CAPTCHA, rate limiting, moderation
- **API-enabled** - Support automation, AI agents, bulk submission
- **Integration-ready** - Work with existing RESF infrastructure

## Architecture Vision

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        R3P Web UI                               │
│            (React/Vite + Tailwind, Mobile PWA)                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                     R3P API Server                              │
│          (FastAPI + PostgreSQL)                                  │
└───┬──────────┬──────────┬──────────┬──────────┬───────────┬─────┘
    │          │          │          │          │           │
 ┌──▼──┐   ┌──▼──┐   ┌──▼──────┐ ┌──▼──┐   ┌──▼────┐  ┌───▼───┐
 │OpenQA│   │Sparky│  │rpminspect│ │Users│   │MantisBT│  │Apollo │
 │ API  │   │Webhook│  │  Results │ │OIDC+│   │ Links │  │ Build │
 └──────┘   └──────┘  └──────────┘ │OAuth│   └───────┘  └───────┘
                                    └─────┘
```

### Technology Stack

**Backend:** Python 3.11 (FastAPI), PostgreSQL 15, SQLAlchemy 2.0, Alembic

**Frontend:** Vite + React 18 + TypeScript, Tailwind CSS, TanStack Query v5

**Auth Phase 1:** Admin token (env var) + anonymous username (cookie). OAuth deferred to Phase 2.

**Infrastructure:** Rootless Podman + systemd user services (cairn-02), Caddy + Cloudflare Tunnel

## Feature Phases

### Phase 1: MVP (May release pilot)
**Goal:** Basic RC test run coordination with community result submission — replacing Mattermost + Playbooks

#### Features
1. **Release → Milestone → Section → Test case hierarchy**
   - Milestone names: lookahead / beta / rc1 / rc2
   - Test cases: name, procedure URL, blocking flag (blocker / normal)

2. **Result Submission**
   - Outcome: PASS / FAIL / PARTIAL / SKIP
   - Fields: arch, deploy type, free-text hardware notes, optional username
   - Anonymous (no account) or named (cookie)

3. **Milestone carry-forward**
   - Copy results from RC1 → RC2 with admin confirmation
   - Matched by section name + test case name

4. **Coverage grid**
   - Color-coded by arch × section
   - Gray = untested, green = has PASS, red = has FAIL

5. **Triage filters**
   - Untested only, blockers only, arch filter

6. **Admin sign-off per test case**
   - Marks reviewed regardless of pass/fail outcome

7. **Auth: admin token + cookie username**
   - `ADMIN_TOKEN` env var → signed httponly cookie
   - No OAuth for Phase 1

### Phase 2: After pilot feedback
Mattermost OAuth, trust-weighted coverage metrics, Rocky Identity OIDC, OpenQA import, Sparky webhook, structured hardware profiles, release readiness scoring, Mattermost notifications.

### Cut entirely (for now)
Redis, Celery, rpminspect, badges, MCP, PWA, API tokens, leaderboards, present mode.

## Database Schema

### Core Tables (Phase 1)

```sql
releases     id, name, version (e.g. "10.1"), notes, created_at
milestones   id, release_id, name (lookahead/beta/rc1/rc2), status (open/closed), created_at
sections     id, milestone_id, name, architecture, sort_order
test_cases   id, section_id, name, procedure_url, blocking (blocker|normal), sort_order
             admin_signoff BOOL, signoff_by, signoff_at
results      id, test_case_id, outcome (PASS/FAIL/PARTIAL/SKIP),
             arch, deploy_type, hardware_notes, submitter_name,
             submit_time, carried_from_milestone_id
```

`carried_from_milestone_id` enables carry-forward: results reference their origin milestone without duplicating rows.

### Future Schema (Phase 2+)

Phase 2 will extend with: `users`, `hardware_profiles`, `openqa_mappings`, `trust_weights`, `api_tokens`. The Phase 1 schema is designed to extend cleanly — `submitter_name` becomes a FK to `users` when accounts are added.

## Trust / Reputation System (Phase 2)

### Tester Tiers

| Tier | How assigned | Trust Weight | Notes |
|------|-------------|-------------|-------|
| anonymous | No login | 0.25 | Always accepted |
| community | Mattermost OAuth | 0.50 | Starting weight for Mattermost users |
| verified | Auto-promoted | 0.75 | After 5+ results AND account age ≥30 days |
| core_team | Admin-set | 1.00 | Designated testing team members |

Coverage metrics will display both raw and trust-weighted pass rates. Both are shown; neither is hidden.

## Key Design Decisions

### Decision 1: Tech Stack
- **FastAPI (Python)** — fastest path to MVP, QA community familiarity
- **Vite + React SPA** — simpler than Next.js for this use case, served by nginx
- **PostgreSQL from day one** — RESF will host in production; avoids SQLite→PostgreSQL migration surprises
- **See:** [ADR 001](decisions/001-backend-framework.md), [ADR 002](decisions/002-frontend-framework.md)

### Decision 2: Authentication
- **Phase 1:** Admin token (env var) + optional cookie username — no accounts
- **Phase 2:** Three-tier: Anonymous (0.25) → Mattermost OAuth (0.50–0.75) → Rocky Identity OIDC (1.00)
- Mattermost as primary login because Rocky community is already there
- **See:** [ADR 003](decisions/003-authentication-strategy.md)

### Decision 3: Deployment Strategy
- **POC:** Rootless Podman + systemd user services on cairn-02, Caddy + Cloudflare Tunnel
- **Production:** RESF hosting
- **See:** [POC Hosting Guide](architecture/POC-HOSTING.md)

### Decision 4: Scope
- RC testing only (9.8 RC, 10.2 RC, 11.0, etc.)
- Not for ongoing errata/package testing during minor version life
- Automated sources (OpenQA, Sparky, rpminspect) deferred to Phase 2

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Mattermost OAuth not approved | High | Low | Phase 1 runs without OAuth; deferred to Phase 2 |
| Low community adoption | High | Medium | Pilot with testing team for May release; iterate on UX |
| Feature creep before pilot | High | Medium | Hard scope line at Phase 1 feature list |
| Performance at scale | Medium | Low | Async FastAPI + indexed queries; revisit at Phase 2 |

## Success Metrics

### Phase 1 (May pilot)
- [ ] Deployed to cairn-02
- [ ] 1 pilot RC test run with real test cases from the playbook
- [ ] 10+ results submitted by testing team members
- [ ] Positive signal from test leads: "this is easier than Mattermost"

### Phase 2 (after pilot feedback)
- [ ] Mattermost OAuth working
- [ ] Release readiness dashboard shows raw + weighted metrics
- [ ] OpenQA results auto-imported alongside manual results

### Phase 3 (production)
- [ ] 50+ community contributors (beyond core testing team)
- [ ] 500+ test results for a Rocky RC
- [ ] Trusted by team for release go/no-go decisions
- [ ] Handed off to RESF infrastructure

## What Makes R3P Different

**vs Fedora Test Days:**
- Scoped to release candidates (higher stakes, full playbook)
- Trust-weighted results (team vs community vs anonymous) — Phase 2
- Hardware diversity tracking with structured profiles — Phase 2
- Multi-source integration (OpenQA, Sparky, rpminspect) — Phase 2
- Milestone carry-forward (RC1 → RC2) with explicit provenance
- Admin sign-off per test case

**vs Current Rocky Testing (Mattermost-based):**
- Centralized coordination with blocking flags and triage filters
- Visibility into coverage gaps (what arch/hardware hasn't been tested)
- Permanent structured record of each RC testing run
- Release confidence is visible, not synthesized in someone's head

## Next Actions

1. `make dev` → verify stack runs end-to-end
2. Create first release + milestone via Swagger UI (`localhost:8000/docs`)
3. Import May RC playbook sections and test cases via admin panel
4. Deploy to cairn-02 via `provision-app`
5. Share with testing team for the May Rocky Linux release

---

**Timeline:** May 2026 pilot → Phase 2 after feedback
**Team:** Brady Dibble + Rocky Linux testing team feedback
**Risk:** Low (proven stack, scoped to pilot)
**Impact:** High — faster releases, more coverage, less stress on test leads
