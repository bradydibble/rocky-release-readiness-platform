# R3P Technology Stack

**Last Updated:** October 4, 2025
**Status:** Approved for MVP Development

## Overview

R3P's technology stack is chosen to balance rapid development velocity, long-term maintainability, security, and integration with the Rocky Linux ecosystem.

## Stack Summary

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Backend** | FastAPI (Python 3.11+) | Async performance, auto API docs, QA community familiarity |
| **Frontend** | React + Next.js 14 | Largest ecosystem, SSR support, excellent DX |
| **Database** | PostgreSQL 14+ | Robust, JSONB support, proven at scale |
| **Cache/Queue** | Redis 7+ | Session storage, real-time pubsub, background jobs |
| **Auth** | Mattermost OAuth + Rocky OIDC + API Tokens | Tiered: anonymous → community → core team |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid UI development, accessibility |
| **Deployment** | Podman + systemd (POC) | Matches cairn-02 homelab pattern |
| **CI/CD** | GitHub Actions | Free for open source, good integration |

## Detailed Technology Choices

### Backend: FastAPI (Python)

**Version:** 3.11+ (for performance improvements)

**Why FastAPI:**
- ✅ Automatic OpenAPI/Swagger documentation generation
- ✅ Async/await for high-performance I/O operations
- ✅ Pydantic validation provides type safety and serialization
- ✅ Python familiar to Fedora/Rocky QA community (ResultsDB precedent)
- ✅ Rich ecosystem for our integrations (SQLAlchemy, Authlib for OIDC + OAuth, Redis)
- ✅ Fast development iteration

**Key Libraries:**
```python
# Core framework
fastapi = "^0.109.0"
uvicorn = {extras = ["standard"], version = "^0.27.0"}
python = "^3.11"

# Database
sqlalchemy = "^2.0.25"
alembic = "^1.13.1"
psycopg2-binary = "^2.9.9"  # PostgreSQL driver

# Authentication
authlib = "^1.3.0"  # OIDC + OAuth client (Mattermost + Rocky Identity)
itsdangerous = "^2.1.2"  # Session management
httpx = "^0.26.0"  # HTTP client for Mattermost API calls

# Validation
pydantic = "^2.5.3"
pydantic-settings = "^2.1.0"

# Background jobs
celery = "^5.3.6"
redis = "^5.0.1"

# API utilities
python-multipart = "^0.0.6"  # Form data
python-jose = {extras = ["cryptography"], version = "^3.3.0"}  # JWT

# Testing
pytest = "^7.4.4"
pytest-asyncio = "^0.23.3"
```

**Project Structure:**
```
backend/
├── alembic/              # Database migrations
├── app/
│   ├── api/             # API endpoints
│   │   ├── v1/
│   │   │   ├── testruns.py
│   │   │   ├── testcases.py
│   │   │   ├── results.py
│   │   │   ├── users.py
│   │   │   └── gaps.py
│   │   └── deps.py      # Dependencies (auth, db session)
│   ├── auth/            # Auth flows
│   │   ├── mattermost.py   # Mattermost OAuth
│   │   ├── oidc.py         # Rocky Identity OIDC
│   │   └── tokens.py       # API token validation
│   ├── core/            # Core functionality
│   │   ├── config.py    # Settings
│   │   ├── security.py  # Auth functions, trust weights
│   │   └── db.py        # Database setup
│   ├── models/          # SQLAlchemy models
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   ├── integrations/    # OpenQA, Sparky, rpminspect clients
│   └── main.py          # FastAPI app
├── tests/
├── pyproject.toml       # Poetry dependencies
└── Dockerfile
```

**See:** [ADR 001: Backend Framework Selection](../decisions/001-backend-framework.md)

### Frontend: React + Next.js

**Version:** Next.js 14 (App Router), React 18

**Why React + Next.js:**
- ✅ Largest ecosystem for component libraries and tools
- ✅ Server-side rendering for performance and SEO
- ✅ Next.js App Router for modern routing and data fetching
- ✅ React Server Components for reduced client bundle size
- ✅ Most developers have React experience (contributor access)
- ✅ Excellent TypeScript support

**Key Libraries:**
```json
{
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.17.19",
    "zustand": "^4.5.0",
    "@radix-ui/react-*": "latest",
    "tailwindcss": "^3.4.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.309.0",
    "next-pwa": "^5.6.0",
    "date-fns": "^3.2.0",
    "recharts": "^2.10.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.11.5",
    "@types/react": "^18.2.48",
    "eslint": "^8.56.0",
    "prettier": "^3.2.4"
  }
}
```

**Project Structure:**
```
frontend/
├── app/                     # Next.js App Router
│   ├── (auth)/             # Auth layout group
│   │   ├── login/
│   │   └── profile/
│   ├── testruns/           # Test runs
│   │   ├── [id]/          # Dynamic route
│   │   │   ├── page.tsx
│   │   │   └── submit/[testcase_ulid]/page.tsx
│   │   └── new/
│   ├── admin/              # Admin panel
│   ├── api/                # API routes (proxy)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── testrun/
│   ├── results/
│   └── layout/
├── lib/
│   ├── api.ts             # API client
│   ├── hooks/             # Custom hooks
│   └── utils.ts
├── public/
├── styles/
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

**See:** [ADR 002: Frontend Framework Selection](../decisions/002-frontend-framework.md)

### Database: PostgreSQL

**Version:** 14+ (for improved JSON performance)

**Why PostgreSQL:**
- ✅ Proven reliability and performance at scale
- ✅ JSONB support for flexible metadata storage (xsos hardware reports)
- ✅ Full-text search capabilities
- ✅ Excellent indexing options
- ✅ Strong ACID guarantees
- ✅ Same as ResultsDB (familiar to team)

**Schema Highlights:**
- **test_days** — RC test run coordination and metadata
- **test_sections** — Sections within test runs (scoped by arch/category)
- **test_cases** — Individual test cases with ULID + canonical QA:Testcase IDs
- **results** — Test results with trust weight, outcome, hardware profile
- **users** — User accounts (anonymous, Mattermost, Rocky Identity)
- **hardware_profiles** — Structured hardware metadata (vendor/model/arch)
- **api_tokens** — User-generated tokens for automation
- **openqa_mappings** — Link test cases to OpenQA tests
- **rpminspect_mappings** — Link test cases to rpminspect inspection categories

**Performance Features:**
- B-tree indexes on foreign keys
- GIN indexes on JSONB columns (hardware_profiles.raw_metadata)
- Text pattern ops indexes for prefix searches
- Partial indexes for common queries (e.g., non-removed results)

**Connection Pooling:**
- SQLAlchemy async engine with pool_size=20
- PgBouncer in production for connection pooling

### Cache & Queue: Redis

**Version:** 7+

**Why Redis:**
- ✅ Fast in-memory storage for session data
- ✅ Pub/sub for real-time updates
- ✅ Celery broker for background jobs
- ✅ Simple caching layer for expensive queries

**Use Cases:**
1. **Session Storage** — User sessions (FastAPI SessionMiddleware)
2. **Cache Layer** — Coverage metrics, release readiness scores
3. **Real-Time Pubsub** — Push result updates to connected clients
4. **Background Jobs** — Celery broker for OpenQA/Sparky/rpminspect polling
5. **Rate Limiting** — Track API request counts per token

### Authentication: Tiered (Mattermost + OIDC + Anonymous)

**Three tiers:**
1. **Anonymous** — No login, optional name field, trust weight 0.25
2. **Mattermost OAuth** — chat.rockylinux.org, primary community login, trust weight 0.50–0.75
3. **Rocky Identity OIDC** — FreeIPA/Keycloak, core team, trust weight 1.00

**Libraries:**
- **Backend:** Authlib (handles both OAuth and OIDC flows)
- **Frontend:** Custom auth context + next-auth or custom session management

**See:** [ADR 003: Authentication Strategy](../decisions/003-authentication-strategy.md)

### Styling: Tailwind CSS + shadcn/ui

**Why Tailwind CSS:**
- ✅ Utility-first CSS for rapid development
- ✅ Responsive design built-in
- ✅ Purges unused CSS for small bundle sizes
- ✅ Design system consistency

**Why shadcn/ui:**
- ✅ Copy-paste components (full control, no dependency)
- ✅ Built on Radix UI primitives (accessibility)
- ✅ Customizable and themeable
- ✅ TypeScript first

### Deployment: Podman + systemd (POC → Docker → Kubernetes)

**POC (cairn-02 homelab):**
- Rootless Podman containers as systemd user services
- Caddy reverse proxy + Cloudflare Tunnel
- `r3p.bradydibble.com`
- See [POC Hosting Guide](./POC-HOSTING.md)

**Development (Docker Compose for local dev):**
```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://r3p:dev_password@db:5432/r3p
      REDIS_URL: redis://redis:6379/0
    volumes:
      - ./backend:/app
    depends_on: [db, redis]

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    volumes:
      - ./frontend:/app
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000

  db:
    image: postgres:15-alpine
    volumes: ["postgres_data:/var/lib/postgresql/data"]
    environment:
      POSTGRES_DB: r3p
      POSTGRES_USER: r3p
      POSTGRES_PASSWORD: dev_password

  redis:
    image: redis:7-alpine
    volumes: ["redis_data:/data"]

  celery:
    build: ./backend
    command: celery -A app.tasks worker -l info
    depends_on: [redis, db]
```

**Production:** Kubernetes manifests (optional, for RESF hosting scale)

### CI/CD: GitHub Actions

**Workflows:**
1. **Backend Tests** — pytest, coverage, lint
2. **Frontend Tests** — Jest, ESLint, type checking
3. **Docker Build** — Build and push images
4. **Deploy** — Automated deployment to POC/staging/production

## Development Environment Setup

### Prerequisites

- **Python:** 3.11+
- **Node.js:** 20+
- **Docker:** 24+ (or Podman)
- **PostgreSQL:** 15+ (or via Docker)
- **Redis:** 7+ (or via Docker)

### Quick Start (Docker Compose)

```bash
# Clone repository
git clone https://github.com/bradydibble/r3p.git
cd r3p

# Start services
docker-compose up -d

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install poetry
poetry install
alembic upgrade head
uvicorn app.main:app --reload

# Frontend setup (in new terminal)
cd frontend
npm install
npm run dev

# Access
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Performance Targets

### Backend
- **API Response Time:** <100ms (p95) for simple queries
- **Complex Queries:** <500ms (p95) for coverage analytics
- **Throughput:** 1000 req/sec on modest hardware

### Frontend
- **Initial Load:** <2s on 3G connection
- **Time to Interactive:** <3s
- **Lighthouse Score:** 90+ performance, 100 accessibility

### Database
- **Query Time:** <50ms for most queries with proper indexes
- **Connection Pool:** 20 connections, expand to 100 under load

## Monitoring & Observability

### Logging
- **Backend:** Structured JSON logging via Python's logging
- **Frontend:** Error boundaries, Sentry integration (optional)
- **Format:** `{"timestamp": "...", "level": "INFO", "message": "...", "context": {...}}`

### Metrics
- **Prometheus:** Metrics endpoint at `/metrics`
- **Grafana:** Dashboards for API latency, error rates, DB performance (integrated with cairn-02 Grafana)
- **Alerts:** Critical errors, slow queries, service downtime

## Security

### Dependencies
- **Automated updates:** Dependabot for security patches
- **Vulnerability scanning:** Snyk or GitHub security alerts
- **Regular audits:** `npm audit`, `safety check`

### Secrets Management
- Environment variables for development
- `.env` files for POC (not in git)
- Kubernetes secrets or HashiCorp Vault for production
- Never commit secrets to repository

### HTTPS/TLS
- Required in production
- Cloudflare handles SSL/TLS for POC
- HSTS headers enabled

## Scalability Considerations

### Horizontal Scaling
- **Backend:** Stateless, can run multiple instances behind load balancer
- **Frontend:** Static exports can be served from CDN
- **Database:** Read replicas for analytics queries
- **Redis:** Redis Cluster for high availability

### Caching Strategy
- **API responses:** Redis cache with TTL
- **Static assets:** CDN + long cache headers
- **Database queries:** Redis cache for expensive aggregations (release readiness, coverage metrics)

### Rate Limiting
- 100 req/min per API token (configurable)
- 1000 req/hr per IP for unauthenticated endpoints
- Redis-based rate limit tracking

## Summary

This technology stack provides:
- ✅ **Rapid development** to reach MVP in 2 months
- ✅ **Modern standards** (async, SSR, TypeScript, containerization)
- ✅ **Scalability** for Rocky's community size
- ✅ **Security** via tiered auth (anonymous → Mattermost → Rocky Identity)
- ✅ **Integration** with Rocky ecosystem (Mattermost, OpenQA, Sparky, rpminspect)
- ✅ **Maintainability** with clear architecture and documentation
- ✅ **Deployable now** via POC on cairn-02 (r3p.bradydibble.com)
