# CRAG Implementation Plan

**Project:** CRAG - Rocky Linux Community Results and Gap Analysis
**Purpose:** Coordinate community testing of Rocky Linux release candidates
**Status:** Planning Phase
**Last Updated:** April 2026

## Vision

CRAG is a testing coordination tool for the Rocky Enterprise Software Foundation (RESF) designed to coordinate and track community testing of **Rocky Linux release candidates** — the pre-release validation cycle before each minor or major version ships.

**Scope:** CRAG is specifically for RC testing events (e.g., Rocky 9.8 RC, 10.2 RC, 11.0). It is NOT for ongoing errata or package testing during the life of a minor version. Each test run follows the full playbook: Community items → Repository checks → Installer (OpenQA) → Post-installation → Cloud images → SIG/AltArch → Final release → Operations.

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
│                        CRAG Web UI                              │
│            (React/Next.js + Tailwind, Mobile PWA)               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                     CRAG API Server                             │
│          (FastAPI/Go + PostgreSQL + Redis)                       │
└───┬──────────┬──────────┬──────────┬──────────┬───────────┬─────┘
    │          │          │          │          │           │
 ┌──▼──┐   ┌──▼──┐   ┌──▼──────┐ ┌──▼──┐   ┌──▼────┐  ┌───▼───┐
 │OpenQA│   │Sparky│  │rpminspect│ │Users│   │MantisBT│  │Apollo │
 │ API  │   │Webhook│  │  Results │ │OIDC+│   │ Links │  │ Build │
 └──────┘   └──────┘  └──────────┘ │OAuth│   └───────┘  └───────┘
                                    └─────┘
```

### Technology Stack

**Backend:** Python (FastAPI), PostgreSQL 14+, Redis, Celery for background jobs

**Frontend:** React (Next.js 14), Tailwind CSS + shadcn/ui, SSE for real-time updates

**Auth:** Anonymous → Mattermost OAuth (community) → Rocky Identity OIDC (core team)

**Infrastructure:** Rootless Podman + systemd (POC: cairn-02), Kubernetes (production)

## Feature Phases

### Phase 1: MVP (Months 1-2)
**Goal:** Basic RC test run coordination with manual result submission

#### Features
1. **Test Run Management (Admin)**
   - Create/edit/delete RC test runs
   - Set name, description, version, compose URL, release type, dates
   - Organize test cases into sections (per category + architecture)
   - Import playbook structure (sections + test cases from previous runs)
   - Draft/publish workflow
   - Status updates (admin narrative posts)

2. **Test Case Organization**
   - Categories (test method): Installer, Image (physical/VM/cloud/ARM), Migration, Package, Hardware Validation
   - Architecture scope per section: x86_64, aarch64, ppc64le, s390x, all
   - Canonical QA:Testcase IDs and testing.rocky.page links
   - Blocking flags: Release Blocker, High Priority, Non-blocking, Normal
   - Pre-assignment: designate expected owner of each test case
   - Priority inherited from blocking flag

3. **Result Submission (Community)**
   - Anonymous: optional name field + CAPTCHA
   - Community: Mattermost OAuth (chat.rockylinux.org)
   - Core team: Rocky Identity OIDC
   - Form: hardware profile (or free-text), result (PASS/FAIL/SKIP/INFO), bugs, comment
   - Bug URL validation (bugs.rockylinux.org, github.com, etc.)
   - Profile cookie retention for convenience
   - Optimistic updates on submit

4. **Results Display**
   - Grid view: Test cases (columns) × User/Profile (rows), grouped by section
   - Color-coded: Green (PASS), Red (FAIL), Yellow (INFO/PARTIAL), Gray (SKIP)
   - Trust tier badge on each result (Anonymous / Community / Core Team)
   - Filter by: Architecture, Test method, User tier, Date range
   - Coverage heatmap: tested vs untested combinations
   - Export: CSV, JSON

5. **User System**
   - Anonymous participation (no account needed)
   - Mattermost OAuth login (primary community path)
   - Rocky Identity OIDC (core team path)
   - Roles: tester (default), creator, admin
   - Activity history and trust tier display

### Phase 2: Intelligence & Automation (Months 3-4)
**Goal:** Integrate automated testing and provide insights

#### Features
6. **OpenQA Integration**
   - Poll openqa.rockylinux.org API for results
   - Map OpenQA test names to CRAG test cases (`openqa_mappings` table)
   - Display automated vs manual results distinctly
   - Link to detailed OpenQA job logs
   - Background job: sync every 15 minutes

7. **Sparky Integration**
   - Webhook endpoint for Sparky result submission
   - API endpoint for batch result upload
   - Token authentication for automation
   - Map Sparky test names to CRAG test cases

8. **rpminspect Integration**
   - Poll rpminspect results from Rocky testing infrastructure
   - Map inspection categories to CRAG Package testing test cases (`rpminspect_mappings` table)
   - 40+ inspection categories: license, metadata, ELF, ABI compatibility, etc.
   - Display alongside manual package testing results

9. **Testing Gaps Dashboard**
   - "What needs testing?" prominent view
   - Highlight untested critical test cases (especially blockers)
   - Architecture coverage breakdown (which arches have ≥1 PASS per section)
   - Hardware diversity metrics (vendor/model coverage)
   - Suggested tests for contributors based on gaps

10. **Release Readiness Metrics**
    - Pass rate by section/category (Repository checks x86_64: 6/6, etc.)
    - **Raw pass rate** + **Trust-weighted pass rate** (shown side by side)
    - Critical/blocker test coverage percentage
    - Regression detection (compare with previous RC)
    - Blocker bug count integration
    - Overall confidence score

### Phase 3: Community & Scale (Months 5-6)
**Goal:** Drive participation and enable testing at scale

#### Features
11. **Participation Features**
    - Contributor leaderboard (tests run, diversity contributed)
    - Achievement badges: First Test, 10 Tests, Critical Bug Found, etc.
    - Personal dashboard: Contribution history, badges, stats, tier progress
    - "Thank you" page per release listing all contributors
    - Trust tier progression (anonymous → community → verified)

12. **REST API**
    - Full CRUD operations for test runs, test cases, results
    - OpenAPI 3.0 documentation (Swagger UI)
    - Authentication: API tokens (per-user)
    - Rate limiting: 100 req/min per token (configurable)
    - Webhooks: POST to external URL on events

13. **MCP Integration**
    - Model Context Protocol server implementation
    - Allow AI agents to discover tests, submit results, query gaps
    - Structured context for LLMs about test execution

14. **Notifications**
    - Mattermost webhooks: New RC test runs, critical failures, wrap-up
    - Email: Test run reminders (for registered users)
    - RSS feed: RC test run schedule, results summaries

### Phase 4: Advanced Features (Months 7+)
**Goal:** Polish, analytics, and specialized functionality

#### Features
15. **Advanced Analytics**
    - Time-series graphs: Pass rates over time across RC versions
    - Hardware correlation: Failure patterns by vendor/model
    - Contributor retention: Active testers over time
    - Prediction: Estimated time to release readiness

16. **Test Suite Management**
    - Reusable playbook templates across versions
    - Clone test run from previous RC (pre-populate sections + cases)
    - Bulk test case import from CSV/JSON

17. **Enhanced Collaboration**
    - Comments on specific test results
    - @mentions for team members
    - Test day assignment workflow improvements

## Database Schema

### Core Tables

```sql
-- RC test run coordination
test_days (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,          -- e.g., "Rocky 9.6 Beta Testing"
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_draft BOOLEAN DEFAULT true,
    compose_id VARCHAR(100),             -- e.g., "Rocky-9.6-20250601.0"
    compose_url TEXT,                    -- e.g., "https://dl.rockylinux.org/stg/rocky/9"
    version VARCHAR(20),                 -- e.g., "9.6", "10.2", "11.0"
    release_type VARCHAR(20) DEFAULT 'rc',  -- rc, major_rc, minor_rc
    about_notes TEXT,                    -- special instructions, known issues
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin narrative status updates during a test run
test_run_updates (
    id SERIAL PRIMARY KEY,
    test_day_id INTEGER REFERENCES test_days(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Test organization (per category + architecture)
test_sections (
    id SERIAL PRIMARY KEY,
    test_day_id INTEGER REFERENCES test_days(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,          -- e.g., "Repository checks - x86_64"
    architecture VARCHAR(20) DEFAULT 'all',  -- x86_64, aarch64, ppc64le, s390x, all
    sort_order INTEGER DEFAULT 0,
    profile_label VARCHAR(100) DEFAULT 'Profile'
);

-- Test cases with ULID tracking (Fedora pattern)
test_cases (
    id SERIAL PRIMARY KEY,
    section_id INTEGER REFERENCES test_sections(id) ON DELETE CASCADE,
    ulid VARCHAR(26) UNIQUE NOT NULL,       -- preserves identity across changes
    name VARCHAR(255) NOT NULL,
    canonical_id VARCHAR(100),              -- QA:Testcase reference (e.g., QA:Testcase_Media_Repoclosure)
    documentation_url TEXT,                 -- testing.rocky.page/documentation/QA/...
    url TEXT,                               -- legacy: link to test instructions
    priority VARCHAR(20) DEFAULT 'normal',  -- critical, important, normal, nice-to-have
    blocking VARCHAR(20) DEFAULT 'normal',  -- blocker, high_priority, non_blocking, normal
    test_environment VARCHAR(20),           -- physical, vm, container, cloud
    test_method VARCHAR(30),                -- installer, image, migration, package, hardware_validation
    architecture VARCHAR(20) DEFAULT 'all', -- x86_64, aarch64, ppc64le, s390x, all
    assigned_to INTEGER REFERENCES users(id),  -- pre-assigned tester
    created_at TIMESTAMP DEFAULT NOW()
);

-- Structured hardware profiles (reusable across submissions)
hardware_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    label VARCHAR(255),                  -- friendly name, e.g., "My home server"
    resource_type VARCHAR(20),           -- cloud, container, physical, hypervisor
    vendor VARCHAR(100),                 -- HP, Dell, Lenovo, AWS, etc.
    model VARCHAR(255),                  -- PowerEdge T330, etc.
    submodel VARCHAR(255),               -- A1, H8-1160t, etc.
    architecture VARCHAR(20),            -- x86_64, aarch64, ppc64le, s390x
    processor TEXT,
    nic TEXT,
    storage TEXT,
    bios_type VARCHAR(20),               -- uefi, legacy
    partition_scheme TEXT,
    encryption BOOLEAN,
    raw_metadata JSONB,                  -- xsos structured dump for advanced parsing
    created_at TIMESTAMP DEFAULT NOW()
);

-- Test results
results (
    id SERIAL PRIMARY KEY,
    test_case_id INTEGER REFERENCES test_cases(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),       -- NULL for anonymous submissions
    profile TEXT NOT NULL,                       -- free-text fallback (Fedora pattern)
    hardware_profile_id INTEGER REFERENCES hardware_profiles(id),  -- optional structured
    outcome VARCHAR(20) NOT NULL,               -- PASS, FAIL, SKIP, INFO
    bugs TEXT,                                  -- newline-separated bug URLs
    comment TEXT,
    source VARCHAR(20) DEFAULT 'manual',        -- manual, openqa, sparky, rpminspect
    external_id VARCHAR(255),                   -- OpenQA job ID, Sparky run ID, etc.
    metadata JSONB,
    trust_weight NUMERIC(3,2) DEFAULT 0.50,     -- 0.25 (anon), 0.50 (community), 0.75 (verified), 1.00 (team)
    submitter_tier VARCHAR(20),                 -- snapshot of tier at submission time
    submit_time TIMESTAMP DEFAULT NOW(),
    removed BOOLEAN DEFAULT false
);

-- User management
users (
    id SERIAL PRIMARY KEY,
    oidc_sub VARCHAR(255) UNIQUE,               -- Rocky Identity sub (nullable — not all users have this)
    mattermost_id VARCHAR(255) UNIQUE,          -- Mattermost user ID (for Mattermost OAuth)
    username VARCHAR(100) UNIQUE,               -- nullable for anonymous
    display_name VARCHAR(255),
    email VARCHAR(255),
    avatar_url TEXT,
    tester_tier VARCHAR(20) DEFAULT 'community', -- anonymous, community, verified, core_team
    result_count INTEGER DEFAULT 0,             -- total historical results submitted
    first_result_at TIMESTAMP,
    team_member BOOLEAN DEFAULT FALSE,          -- set by admin for core team members
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Role-based access control
user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,  -- tester, creator, admin
    granted_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, role)
);

-- Integration mappings
openqa_mappings (
    id SERIAL PRIMARY KEY,
    test_case_id INTEGER REFERENCES test_cases(id) ON DELETE CASCADE,
    openqa_test_name VARCHAR(255) NOT NULL,
    openqa_job_template_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

rpminspect_mappings (
    id SERIAL PRIMARY KEY,
    test_case_id INTEGER REFERENCES test_cases(id) ON DELETE CASCADE,
    inspection_category VARCHAR(100) NOT NULL,  -- license, metadata, elf, abi, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- API access
api_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(100),
    scopes TEXT[],  -- ['read', 'write:results']
    created_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP,
    expires_at TIMESTAMP
);

-- Analytics snapshots (for performance)
coverage_snapshots (
    id SERIAL PRIMARY KEY,
    test_day_id INTEGER REFERENCES test_days(id) ON DELETE CASCADE,
    snapshot_time TIMESTAMP DEFAULT NOW(),
    metrics JSONB  -- pre-calculated coverage stats (raw + weighted)
);

-- Contributor tracking
contributor_stats (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    test_day_id INTEGER REFERENCES test_days(id) ON DELETE CASCADE,
    results_count INTEGER DEFAULT 0,
    first_result TIMESTAMP,
    last_result TIMESTAMP,
    PRIMARY KEY (user_id, test_day_id)
);

-- Achievements/badges
achievements (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,  -- 'first_test', '10_tests', etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT
);

user_achievements (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);
```

### Indexes

```sql
CREATE INDEX idx_results_test_case ON results(test_case_id);
CREATE INDEX idx_results_user ON results(user_id);
CREATE INDEX idx_results_submit_time ON results(submit_time);
CREATE INDEX idx_results_outcome ON results(outcome);
CREATE INDEX idx_results_trust_weight ON results(trust_weight);
CREATE INDEX idx_test_cases_ulid ON test_cases(ulid);
CREATE INDEX idx_test_cases_section ON test_cases(section_id);
CREATE INDEX idx_test_sections_test_day ON test_sections(test_day_id);
CREATE INDEX idx_hardware_profiles_user ON hardware_profiles(user_id);
CREATE INDEX idx_hardware_profiles_metadata ON hardware_profiles USING gin(raw_metadata);
CREATE INDEX idx_results_metadata ON results USING gin(metadata);
```

## Trust / Reputation System

### Tester Tiers

| Tier | How assigned | Trust Weight | Notes |
|------|-------------|-------------|-------|
| anonymous | No login | 0.25 | Always accepted; CAPTCHA for spam prevention |
| community | Mattermost OAuth | 0.50 | Starting weight for any Mattermost-authenticated user |
| verified | Auto-promoted | 0.75 | After 5+ results AND account age ≥30 days |
| core_team | Admin-set (`team_member=TRUE`) | 1.00 | Designated testing team members |

### Weight Calculation (Business Logic)

```python
def calculate_trust_weight(user: User | None) -> float:
    if user is None:
        return 0.25  # Anonymous

    if user.team_member:
        return 1.00  # Core team

    days_active = (datetime.now() - user.first_result_at).days if user.first_result_at else 0
    if user.result_count >= 5 and days_active >= 30:
        return 0.75  # Verified community member

    return 0.50  # Community (Mattermost-authenticated)
```

### Effect on Release Readiness

Coverage metrics display both raw and trust-weighted pass rates:
- **Raw:** "6 PASSes on Repository checks x86_64"
- **Weighted:** "4.25 weighted points (6×0.25 + 0×0.50...)" → normalized to confidence %

A section with only anonymous PASSes reads differently from core team PASSes. Both are shown; neither is hidden. This allows the team to make informed release decisions.

**Drive-by policy:** Anonymous submissions are always accepted, always publicly visible, always credited. The only difference is trust weight — they contribute to coverage but with lower confidence signal.

## API Endpoints (Core)

### Test Runs

```
GET    /api/v1/testdays                        List test runs (with filters)
POST   /api/v1/testdays                        Create test run (admin/creator)
GET    /api/v1/testdays/{id}                   Get test run details
PUT    /api/v1/testdays/{id}                   Update test run (admin/creator)
DELETE /api/v1/testdays/{id}                   Delete test run (admin)
GET    /api/v1/testdays/{id}/structure         Get test cases organized by section
POST   /api/v1/testdays/{id}/updates           Post status update (admin only)
GET    /api/v1/testdays/{id}/updates           List status updates
```

### Test Cases

```
GET    /api/v1/testcases                       List test cases (with filters)
POST   /api/v1/testcases                       Create test case (admin/creator)
GET    /api/v1/testcases/{ulid}                Get test case details
PUT    /api/v1/testcases/{ulid}                Update test case (admin/creator)
DELETE /api/v1/testcases/{ulid}                Delete test case (admin)
```

### Results

```
GET    /api/v1/results                         List results (with filters)
POST   /api/v1/results                         Submit single result (anonymous OK)
POST   /api/v1/results/bulk                    Submit multiple results
GET    /api/v1/results/{id}                    Get result details
PUT    /api/v1/results/{id}                    Update result (own results only)
DELETE /api/v1/results/{id}                    Delete result (own or admin)
```

### Analytics

```
GET    /api/v1/testdays/{id}/coverage          Get raw + weighted coverage metrics
GET    /api/v1/testdays/{id}/gaps              Get testing gaps (untested cases)
GET    /api/v1/testdays/{id}/readiness         Get release readiness score
GET    /api/v1/testdays/{id}/contributors      List contributors with stats
GET    /api/v1/gaps/hardware                   Hardware coverage gaps by vendor/model/arch
```

### Users & Profiles

```
GET    /api/v1/users/me                        Get current user
PUT    /api/v1/users/me                        Update current user profile
GET    /api/v1/users/{id}                      Get user public profile
GET    /api/v1/users/{id}/stats                Get user contribution stats
GET    /api/v1/users/{id}/trust-weight         Get user trust tier and weight
GET    /api/v1/users/me/hardware-profiles      List user's saved hardware profiles
POST   /api/v1/users/me/hardware-profiles      Create hardware profile
GET    /api/v1/hardware-profiles/{id}          Profile detail
PUT    /api/v1/hardware-profiles/{id}          Update profile
```

### Authentication

```
GET    /auth/mattermost                        Initiate Mattermost OAuth flow
GET    /auth/mattermost/callback               Mattermost OAuth callback
GET    /auth/rocky                             Initiate Rocky Identity OIDC flow
GET    /auth/callback                          Rocky Identity OIDC callback
POST   /auth/logout                            Clear session
GET    /api/v1/tokens                          List user's API tokens
POST   /api/v1/tokens                          Create API token
DELETE /api/v1/tokens/{id}                     Revoke API token
```

## Development Roadmap

### Month 1: Foundation
- [ ] Repository setup (monorepo: backend/ + frontend/)
- [ ] Tech stack finalization (FastAPI confirmed, React + Next.js confirmed)
- [ ] Database schema design and Alembic migrations
- [ ] Podman + systemd service files for cairn-02 POC
- [ ] Mattermost OAuth integration (primary auth)
- [ ] Anonymous submission support
- [ ] Basic API scaffolding (healthcheck, auth endpoints)
- [ ] Frontend skeleton (routing, layout, auth flow)
- [ ] Register CRAG as OAuth app with Rocky Mattermost admin

### Month 2: MVP Core
- [ ] Test run CRUD API and UI
- [ ] Test case management API and UI (with canonical IDs, blocking flags, assignments)
- [ ] Result submission form (anonymous + Mattermost paths)
- [ ] Results grid display grouped by section
- [ ] Hardware profile storage (free text + structured)
- [ ] User profile + trust tier management
- [ ] Admin panel: status updates, test run management
- [ ] Deploy POC to cairn-02 (`crag.bradydibble.com`)
- [ ] Demo for Stack and testing team

### Month 3: Integration Layer
- [ ] OpenQA API client library
- [ ] OpenQA result importer (background job, 15-min sync)
- [ ] Sparky webhook endpoint
- [ ] rpminspect result ingestion (rpminspect_mappings table)
- [ ] Background job framework (Celery + Redis)
- [ ] Rocky Identity OIDC (for core team, team_member flag)
- [ ] Testing gaps algorithm and dashboard

### Month 4: Intelligence Features
- [ ] Coverage metrics (raw + trust-weighted)
- [ ] Release readiness scoring algorithm
- [ ] Hardware diversity tracking (vendor/model gap analysis)
- [ ] Regression detection (compare test runs)
- [ ] Notification system (Mattermost webhooks, email)

### Month 5: Community Tools
- [ ] Leaderboard and trust tier progression
- [ ] Achievement/badge system
- [ ] Contributor recognition page
- [ ] API documentation (Swagger UI)
- [ ] API token management UI
- [ ] Rate limiting middleware

### Month 6: Polish & Launch
- [ ] Mobile responsive refinement
- [ ] Performance optimization (caching, query optimization)
- [ ] Security audit (OWASP checklist)
- [ ] Load testing (Locust or k6)
- [ ] User documentation
- [ ] **Production launch** (RESF hosting, crag.rockylinux.org)

## Key Design Decisions

### Decision 1: Tech Stack
- **FastAPI (Python)** — fastest path to MVP, QA community familiarity, Authlib for all OAuth flows
- **React + Next.js** — largest ecosystem, contributor access, SSR
- **See:** [ADR 001](decisions/001-backend-framework.md), [ADR 002](decisions/002-frontend-framework.md)

### Decision 2: Authentication
- **Three-tier:** Anonymous (0.25) → Mattermost OAuth (0.50–0.75) → Rocky Identity OIDC (1.00)
- Mattermost as primary login because Rocky community is already there
- Drive-bys always accepted, always visible
- **See:** [ADR 003](decisions/003-authentication-strategy.md)

### Decision 3: Deployment Strategy
- **POC:** Rootless Podman + systemd on cairn-02, Caddy + Cloudflare Tunnel
- **Production:** RESF hosting (Kubernetes or equivalent)
- **See:** [POC Hosting Guide](architecture/POC-HOSTING.md)

### Decision 4: Result Storage
- Build fresh schema aligned with actual playbook structure
- Optionally sync to ResultsDB via API for compatibility
- Trust weights stored at submission time (immutable snapshot)

### Decision 5: Scope
- RC testing only (9.8 RC, 10.2 RC, 11.0, etc.)
- Not for ongoing errata/package testing during minor version life
- Automated sources (OpenQA, Sparky, rpminspect) contribute as data sources

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Mattermost OAuth not approved by Rocky admin | High | Low | Start with anonymous + Rocky Identity OIDC as fallback |
| Low community adoption | High | Medium | User research, pilot with testing team, iterate on UX |
| OIDC integration complexity | Medium | Low | Use Authlib (well-tested for both OAuth and OIDC) |
| Performance at scale | Medium | Medium | Caching, pagination, async jobs, load testing early |
| OpenQA API changes | Medium | Low | Version API client, monitor OpenQA releases |
| Feature creep | Medium | High | Strict MVP scope, phased roadmap |

## Success Metrics

### MVP Success (Month 2)
- [ ] POC deployed to cairn-02 (`crag.bradydibble.com`)
- [ ] 1 pilot RC test run with real test cases from the 9.6 playbook
- [ ] Anonymous AND Mattermost login both working
- [ ] 10+ results submitted by testing team members
- [ ] Positive feedback from Stack and core team

### Phase 2 Success (Month 4)
- [ ] OpenQA results auto-imported alongside manual results
- [ ] Release readiness dashboard shows raw + weighted metrics
- [ ] Hardware gap analysis shows coverage by vendor/model/arch

### Phase 3 Success (Month 6)
- [ ] 50+ community contributors (beyond core testing team)
- [ ] 500+ test results for a Rocky RC
- [ ] API used by at least 1 external tool/script
- [ ] Trusted by team for release go/no-go decisions

## What Makes CRAG Different

**vs Fedora Test Days:**
- Scoped to release candidates (higher stakes, full playbook)
- Trust-weighted results (team vs community vs anonymous)
- Hardware diversity tracking with structured profiles
- Multi-source integration (OpenQA, Sparky, rpminspect in one view)
- Modern 2025 UX (mobile PWA, real-time updates)
- Anonymous drive-bys without any friction

**vs Current Rocky Testing (Mattermost-based):**
- Centralized coordination with task assignment and blocking flags
- Visibility into coverage gaps (what hardware/arch hasn't been tested)
- Contributor recognition
- Release confidence metrics (raw + trust-weighted)
- Permanent record of each RC testing run

## Next Actions

1. **Stakeholder Demo:** Build artifact prototype for Stack (see ARTIFACT-PROMPT.md)
2. **Mattermost Admin:** Register CRAG OAuth app with Rocky Mattermost
3. **Repository Setup:** Create GitHub repo with CI/CD
4. **cairn-02 Setup:** Configure systemd services and Caddy route
5. **Month 1:** Start backend + auth implementation

---

**Timeline:** 6 months to production v1.0
**Team:** 2-3 developers, 1 designer, QA team feedback
**Risk:** Low-Medium (proven patterns, stable tech)
**Impact:** High (improved release quality, community engagement, release confidence)
