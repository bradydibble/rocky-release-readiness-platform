# ADR 001: Backend Framework Selection

**Status:** Proposed
**Date:** 2025-10-04
**Deciders:** R3P Team, Rocky Testing Team
**Context:** Need to choose a backend framework for R3P API server

## Context and Problem Statement

R3P requires a robust, performant backend framework to handle:
- REST API endpoints for web UI and external integrations
- OIDC + Mattermost OAuth authentication flows
- Database operations (PostgreSQL)
- Background jobs (OpenQA polling, Sparky webhooks, rpminspect ingestion)
- WebSocket connections for real-time updates
- Integration with multiple external systems

The framework should balance:
- Development velocity (time to MVP)
- Performance and scalability
- Community familiarity (ease of finding contributors)
- Ecosystem maturity (libraries for our integrations)
- Long-term maintainability

## Decision Drivers

1. **Development Speed** - Need to reach MVP quickly (2 months)
2. **Performance** - Must handle hundreds of concurrent test result submissions
3. **Contributor Access** - Rocky QA community has Python background
4. **Integration Ecosystem** - Need libraries for OpenQA API, OIDC, Mattermost OAuth, PostgreSQL, Redis
5. **API Documentation** - Auto-generated OpenAPI docs essential for external consumers
6. **Type Safety** - Reduce bugs in production
7. **Community Support** - Active development, good documentation

## Options Considered

### Option 1: FastAPI (Python)

**Pros:**
- Modern async framework with excellent performance
- Automatic OpenAPI/Swagger documentation generation
- Pydantic models provide type validation and serialization
- Large ecosystem: SQLAlchemy, Authlib (OIDC + OAuth), Redis clients
- Python familiar to Fedora/Rocky QA community (ResultsDB is Python)
- Fast development iteration
- Type hints for better IDE support and correctness
- Built-in dependency injection
- Excellent async support for background jobs

**Cons:**
- Python performance ceiling (though async helps significantly)
- GIL limitations for CPU-bound tasks (not our bottleneck)
- Runtime type checking only (not compile-time)
- Deployment requires managing Python versions

**Use Cases:**
- Instagram, Netflix, Uber use FastAPI in production
- Many ML APIs use FastAPI

**Example Code:**
```python
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

app = FastAPI()

@app.post("/api/v1/results", response_model=ResultResponse)
async def create_result(
    result: ResultCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return await result_service.create(db, result, user)
```

### Option 2: Go (Gin or Echo)

**Pros:**
- Compiled language: better performance, static typing
- No GIL: true concurrency
- Single binary deployment (no runtime dependencies)
- RESF uses Go for Apollo build system (team familiarity)
- Excellent standard library
- Fast compilation
- Good for microservices architecture
- Built-in concurrency primitives (goroutines, channels)

**Cons:**
- More verbose than Python for common tasks
- Smaller ecosystem for some integrations
- Less automatic API documentation (need manual Swagger annotations)
- Steeper learning curve for Python-background QA contributors
- More boilerplate code for validation
- ORM options less mature than SQLAlchemy

**Use Cases:**
- Docker, Kubernetes, Terraform written in Go
- High-performance microservices

**Example Code:**
```go
func CreateResult(c *gin.Context) {
    var result models.Result
    if err := c.ShouldBindJSON(&result); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    user := GetCurrentUser(c)
    createdResult, err := resultService.Create(result, user)
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }

    c.JSON(201, createdResult)
}
```

### Option 3: Rust (Axum or Actix-Web)

**Pros:**
- Maximum performance and memory safety
- Compile-time type checking prevents entire classes of bugs
- No GIL, excellent concurrency
- Growing ecosystem with mature async runtime (Tokio)
- WebAssembly compilation potential
- Modern language design

**Cons:**
- Steep learning curve (ownership, lifetimes)
- Slower development velocity initially
- Smaller contributor pool (less common in QA community)
- Longer compilation times
- Some libraries still maturing
- May be overkill for CRUD API

**Use Cases:**
- Discord, Cloudflare Workers use Rust for performance-critical services

**Example Code:**
```rust
async fn create_result(
    State(pool): State<PgPool>,
    Extension(user): Extension<User>,
    Json(result): Json<ResultCreate>,
) -> Result<Json<Result>, AppError> {
    let result = result_service::create(&pool, result, user).await?;
    Ok(Json(result))
}
```

## Decision Outcome

**Chosen Option: FastAPI (Python)**

### Rationale

FastAPI provides the best balance for R3P's needs:

1. **Development Velocity** - Fastest path to MVP with automatic validation, serialization, and API docs
2. **Community Fit** - Python aligns with Fedora QA ecosystem (ResultsDB, existing tools)
3. **Ecosystem** - Mature libraries for all our integrations (OpenQA API, OIDC, Mattermost OAuth via Authlib, PostgreSQL, Redis)
4. **Type Safety** - Pydantic provides runtime validation and good IDE support
5. **API Documentation** - Auto-generated OpenAPI/Swagger is essential for API consumers
6. **Performance Sufficient** - Async FastAPI handles our load (not CPU-bound tasks)
7. **Maintainability** - Easier to find contributors from QA background

### Performance Considerations

While Go/Rust would be faster, our bottlenecks are:
- Database queries (PostgreSQL performance)
- External API calls (OpenQA, Sparky, rpminspect)
- Network I/O

FastAPI's async capabilities handle these efficiently. If we hit Python performance limits later, we can:
- Optimize database queries and add indexes
- Add caching layers (Redis)
- Use background workers for heavy tasks
- Rewrite specific hot paths in Go/Rust if needed

### Migration Path

If performance becomes critical:
- Core API can stay FastAPI
- Move heavy background jobs to Go workers
- Or rewrite entirely (clean API design makes this feasible)

## Consequences

### Positive

- Rapid MVP development
- Easy contributor onboarding (Python familiar to QA)
- Excellent API documentation out of the box
- Strong typing with Pydantic
- Large ecosystem for integrations
- Can leverage existing Python QA tools/libraries

### Negative

- Python performance ceiling (mitigated by async + PostgreSQL + Redis)
- Need to manage Python environment in deployment
- Runtime type checking only
- May need to add Go/Rust components later for heavy workloads

### Neutral

- Docker/Podman deployment required (but already planned)
- Need background job framework (Celery, RQ, or similar)

## Validation

Success criteria after 2 months:
- [ ] MVP deployed with core features
- [ ] API handles 100+ concurrent users without issues
- [ ] OpenAPI docs used by at least 1 external integration
- [ ] 2+ new contributors able to add features with minimal ramp-up

## Related Decisions

- ADR 002: Frontend Framework Selection
- ADR 003: Authentication Strategy

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [ResultsDB Source](https://github.com/release-engineering/resultsdb) (Python reference)
- [OpenQA API Documentation](https://open.qa/docs/)
- [Rocky Linux Testing Context](https://ciqinc.atlassian.net/wiki/spaces/ENG/pages/1703215114)
