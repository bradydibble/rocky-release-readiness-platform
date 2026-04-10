# Rocky Release Readiness Platform (R3P)

**Rocky Linux release coordination — test playbook, community tracker, and coverage gap analysis**

[![License](https://img.shields.io/badge/license-GPLv2-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-green.svg)](docs/00-IMPLEMENTATION-PLAN.md)

## What is R3P?

R3P is a test playbook, tracker, and community orchestrator for the Rocky Enterprise Software Foundation (RESF). It solicits and coordinates community participation to surface coverage gaps in QA — enabling the team to remediate those gaps and build measurable confidence in stability before a release is declared live.

Scoped specifically to **Rocky Linux release candidates**: each minor and major version (e.g., Rocky 9.8 RC, 10.2 RC, 11.0) gets a test run that walks the full playbook, collects community results, and surfaces what's covered and what isn't.

### Why it exists

| Outcome | What it means |
|---|---|
| **Faster turnaround** | Rocky Linux RCs reach GA sooner after RHEL ships — coordination overhead compressed into a structured, visible process |
| **Higher confidence** | Test leads make the go/live call backed by explicit coverage data, not Mattermost threads |
| **More community testing** | No account required, clear direction on what to test, explicit signals for where coverage is most needed |
| **Lower cognitive load** | A single dashboard replaces manual playbook tracking, ad-hoc result gathering, and gut-feel gap assessment |

## Key Features

- **Release → Milestone → Section → Test case hierarchy** — structured playbook matching the Rocky QA workflow
- **Community result submission** — anonymous or named, PASS / FAIL / PARTIAL / SKIP + arch + deploy type + hardware notes
- **Coverage grid** — color-coded by architecture × section; gray = untested, green = has PASS, red = has FAIL
- **Untested / blockers filters** — triage view for test leads under time pressure
- **Milestone carry-forward** — copy results from RC1 → RC2 with admin confirmation
- **Admin sign-off** — mark a test case reviewed regardless of outcome
- **Guest view** — read-only for drive-bys watching progress

## Getting Started

```bash
cp .env.example .env
make dev
```

- Frontend: http://localhost:3000
- API + Swagger: http://localhost:8000/docs
- Admin login: POST `/api/v1/auth/login` with `ADMIN_TOKEN` from `.env`

## Tech Stack

**Backend:** Python 3.11 · FastAPI · SQLAlchemy 2.0 (asyncpg) · Alembic · PostgreSQL 15

**Frontend:** Vite · React 18 · TypeScript · Tailwind CSS · TanStack Query v5 · Zustand

**Deploy:** Rootless Podman + systemd user services on cairn-02 (RHEL 9.6)

## Project Status

Active development — targeting the May Rocky Linux release pilot.

See [Implementation Plan](docs/00-IMPLEMENTATION-PLAN.md) for full scope and roadmap.

## License

GPLv2, consistent with the Rocky Linux project.
