# CRAG

**Community Results and Gap Analysis — Rocky Linux Test Coordination Platform**

[![License](https://img.shields.io/badge/license-GPLv2-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-planning-orange.svg)](docs/00-IMPLEMENTATION-PLAN.md)

## What is CRAG?

CRAG is a testing coordination platform for the Rocky Enterprise Software Foundation (RESF), designed to coordinate community testing of **Rocky Linux release candidates** — the pre-release validation cycle before each minor or major version ships (e.g., Rocky 9.8 RC, 10.2 RC, 11.0).

The name comes from rock climbing: a crag is a rocky cliff face. Like a belayer supporting a climber, CRAG supports the Rocky Linux testing team in coordinating coverage, tracking results, and building release confidence.

### Core Goals

1. **Highlight testing gaps** across hardware, versions, and architectures
2. **Simplify result reporting** with intuitive UX for critical factors like hardware and environment
3. **Provide leadership insights** into testing gaps and release readiness
4. **Give contributors recognition** for their testing contributions
5. **Increase participation** through accessibility and clear value

## Key Features (Planned)

- **RC Test Run Coordination** — Organize community testing events for each release candidate
- **Multi-Source Results** — Integrate manual testing + OpenQA + Sparky + rpminspect
- **Gap Analysis** — Show what hardware/arch combinations still need testing
- **Hardware Diversity** — Track testing across physical/VM/container/cloud environments
- **Release Readiness** — Confidence metrics for release decisions (raw + trust-weighted)
- **Contributor Recognition** — Leaderboards, badges, and acknowledgment
- **Modern UX** — Mobile-first, real-time updates, accessible design
- **API-First** — Support automation, CI/CD, and AI agents (MCP)

## Why CRAG?

The name "CRAG" (Community Results and Gap Analysis) reflects the tool's dual purpose: surface what the community has tested, and highlight what gaps remain. The crag metaphor fits Rocky Linux naturally — a crag is a rocky outcropping, and the testing team provides the safety net for every release.

### Scope

CRAG is specifically for **release candidate events**:
- Rocky Linux 9.8 RC → CRAG test run
- Rocky Linux 10.2 RC → CRAG test run
- Rocky Linux 11.0 → CRAG test run

Not in scope: ongoing errata/package testing during the life of a minor version.

### What Makes CRAG Different?

**vs Fedora Test Days:**
- Scoped specifically to release candidates (higher stakes, full playbook)
- Multi-source integration (automated + manual)
- Proactive gap analysis with hardware tracking
- Trust-weighted results (team members vs community vs drive-bys)
- Modern 2025 UX standards

**vs Current Rocky Testing (Mattermost-based):**
- Centralized coordination with task assignment
- Visibility into coverage gaps
- Contributor recognition
- Release confidence metrics
- Anonymous participation welcome (no account required)

## Project Status

**Current Phase:** Planning & Research

See [Implementation Plan](docs/00-IMPLEMENTATION-PLAN.md) for detailed roadmap.

### Timeline

- **Months 1-2:** MVP (RC test run coordination, manual result submission)
- **Months 3-4:** Integration (OpenQA, Sparky, rpminspect automation)
- **Months 5-6:** Community features (API, recognition, polish)
- **Month 6:** Production launch

## Documentation

- **[Implementation Plan](docs/00-IMPLEMENTATION-PLAN.md)** — Full technical plan and roadmap
- **[Tech Stack](docs/architecture/TECH-STACK.md)** — Architecture decisions
- **[POC Hosting](docs/architecture/POC-HOSTING.md)** — cairn-02 deployment guide
- **Research:**
  - [Fedora Test Days Analysis](docs/research/01-fedora-test-days.md)
  - [Rocky Testing Ecosystem](docs/research/02-rocky-testing-ecosystem.md)
  - [Other Distributions](docs/research/03-other-distributions.md)
  - [Existing Playbooks](docs/research/04-existing-playbooks.md)
- **Architecture Decisions:**
  - [Backend Framework (FastAPI)](docs/decisions/001-backend-framework.md)
  - [Frontend Framework (React/Next.js)](docs/decisions/002-frontend-framework.md)
  - [Authentication Strategy](docs/decisions/003-authentication-strategy.md)

## Technology Stack (Proposed)

**Backend:** Python (FastAPI), PostgreSQL 14+, Redis, OIDC + Mattermost OAuth

**Frontend:** React (Next.js), Tailwind CSS, WebSockets for real-time updates

**Infrastructure:** Rootless Podman + systemd (POC on cairn-02), Kubernetes (production)

## Authentication

CRAG supports three tiers of participation:

| Tier | Method | Notes |
|------|--------|-------|
| Anonymous | No login required | Drive-bys always welcome, lower trust weight |
| Community | Mattermost OAuth (chat.rockylinux.org) | Primary login — no new account needed for Rocky community |
| Core Team | Rocky Identity OIDC | Full trust weight |

## Integration Points

- **OpenQA** (openqa.rockylinux.org) — Automated test results
- **Sparky** — Documentation-based test results
- **rpminspect** — RPM comparison results
- **MantisBT** (bugs.rockylinux.org) — Bug linking
- **Apollo** — Build/compose information
- **Rocky Identity** — OIDC authentication for core team
- **Mattermost** — OAuth login + notifications

## Community

- **Testing Team:** Weekly meetings Thursdays 4PM PT
- **Chat:** Rocky Linux Testing channel on Mattermost (chat.rockylinux.org)
- **Docs:** https://testing.rocky.page/
- **Contact:** info@rockylinux.org

## License

This project will be licensed under GPLv2, consistent with the Rocky Linux project.

---

**Note:** CRAG is currently in the planning phase. This README will be updated as development progresses.
