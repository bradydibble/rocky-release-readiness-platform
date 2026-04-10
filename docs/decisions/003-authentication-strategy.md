# ADR 003: Authentication Strategy

**Status:** Proposed
**Date:** 2025-10-04
**Deciders:** R3P Team, Rocky Security Team
**Context:** Need secure authentication that integrates with Rocky's existing identity infrastructure while remaining accessible to community members and anonymous drive-bys

## Context and Problem Statement

R3P needs user authentication for:
- Submitting test results (identity optional — anonymous accepted)
- Administrative functions (creating test runs, assigning test cases)
- API access (token-based for automation)
- Tracking contributor statistics and trust weight

Requirements:
- Support anonymous "drive-by" submissions (no account required)
- Support Mattermost OAuth for Rocky community members (lowest friction)
- Support Rocky Identity OIDC for core team members (highest trust)
- Enable API token generation for automation
- Maintain security best practices
- Trust-weighted results (anonymous < community < core team)

## Decision Drivers

1. **Accessibility** - Drive-bys always welcome; lowest possible friction for community
2. **Security** - Industry-standard authentication protocols
3. **Integration** - Work with Rocky's existing identity infrastructure
4. **User Experience** - Simple login flow for community members
5. **Automation Support** - API tokens for scripts, CI/CD, AI agents
6. **No Password Management** - Delegate to identity providers
7. **Standards Compliance** - Use OAuth2/OIDC standards

## Options Considered

### Option 1: Anonymous Only

**Approach:**
- No login required
- Optional username field (free text)
- CAPTCHA for rate limiting

**Pros:**
- Zero friction
- Maximum participation

**Cons:**
- No trust differentiation
- Spam/abuse risk
- No contributor recognition possible
- Can't support team assignment features

**Verdict:** Insufficient — need tiered trust for release readiness metrics to be meaningful.

### Option 2: Rocky Identity OIDC Only

**Approach:**
- Integrate with Rocky's FreeIPA or Keycloak instance
- Use Authorization Code Flow with PKCE
- Session management with JWT tokens

**Pros:**
- Standards-based (OAuth2/OIDC)
- No password management in R3P
- Leverages existing Rocky identity infrastructure
- Single sign-on with other Rocky services

**Cons:**
- Requires a formal Rocky account
- Higher friction than Mattermost
- Rocky community members may be in Mattermost but not have a Rocky Identity account
- Excludes external contributors who don't have Rocky accounts

**Verdict:** Too restrictive for the goal of broad community participation.

### Option 3: Username/Password with Local Database

**Approach:**
- Store hashed passwords in R3P database
- Use bcrypt or argon2 for hashing

**Pros:**
- Simple to implement
- No external dependencies

**Cons:**
- Security risk — password management is hard to get right
- Password reset flows required
- No integration with existing Rocky identity
- Users need separate R3P account
- Increased attack surface

**Verdict:** Not recommended. Rejected.

### Option 4: Mattermost OAuth (Primary Community Login)

**Approach:**
- Register R3P as an OAuth 2.0 application in the Rocky Linux Mattermost instance (chat.rockylinux.org)
- User clicks "Login with Mattermost" → redirected to Mattermost → grants permission → redirected back
- R3P receives Mattermost username, display name, email

**Pros:**
- Rocky Linux community members are already on chat.rockylinux.org
- No new account required — if you're in the Testing channel, you already have access
- Mattermost supports OAuth 2.0 provider mode
- Lower friction than FreeIPA/Keycloak for most community members
- Username is recognizable (@lumarel, @alangm, @stack)
- Connects login identity to the community where testing coordination already happens

**Cons:**
- Requires admin to register R3P as OAuth app in Rocky Mattermost
- Dependency on Mattermost availability
- Rocky Mattermost admin must enable OAuth app registration

**Implementation:**
```python
from authlib.integrations.starlette_client import OAuth

oauth = OAuth()
oauth.register(
    name='mattermost',
    server_metadata_url=None,  # Mattermost doesn't use OIDC discovery
    authorize_url='https://chat.rockylinux.org/oauth/authorize',
    access_token_url='https://chat.rockylinux.org/oauth/access_token',
    client_id=settings.MATTERMOST_CLIENT_ID,
    client_secret=settings.MATTERMOST_CLIENT_SECRET,
    client_kwargs={'scope': ''}
)

@app.get('/auth/mattermost')
async def mattermost_login(request: Request):
    redirect_uri = request.url_for('mattermost_callback')
    return await oauth.mattermost.authorize_redirect(request, redirect_uri)

@app.get('/auth/mattermost/callback')
async def mattermost_callback(request: Request):
    token = await oauth.mattermost.authorize_access_token(request)
    # Fetch user info from Mattermost API
    resp = await httpx.get(
        'https://chat.rockylinux.org/api/v4/users/me',
        headers={'Authorization': f'Bearer {token["access_token"]}'}
    )
    user_info = resp.json()
    # Create/update user in database with mattermost_id
    # Trust tier: 'community' (0.50), upgrades to 'verified' after 5+ results
    return RedirectResponse('/')
```

**Verdict:** Primary community login option.

## Decision Outcome

**Chosen Approach: Three-Tier Authentication**

| Tier | Method | Trust Weight | Notes |
|------|--------|-------------|-------|
| Anonymous | No login — optional username field | 0.25 | Always accepted; CAPTCHA for abuse prevention |
| Community | Mattermost OAuth (chat.rockylinux.org) | 0.50 → 0.75 | Primary login; bumps to 0.75 after 5+ results + 30 days |
| Core Team | Rocky Identity OIDC (FreeIPA/Keycloak) | 1.00 | Set via `team_member = TRUE` flag by admin |

### Tier 1: Anonymous Submissions

- No login required
- Optional "Your name" field (free text) — defaults to "Anonymous"
- CAPTCHA on submission for spam prevention
- Results clearly labeled as Anonymous with 0.25 trust weight
- Accepted and displayed — lower weight in release readiness metrics

### Tier 2: Mattermost OAuth (Primary Login)

The path of least friction for Rocky Linux community members:

1. User clicks "Login with Mattermost"
2. Redirected to `https://chat.rockylinux.org/oauth/authorize`
3. User grants permission (if not already)
4. Redirected back to R3P with authorization code
5. R3P exchanges code for access token
6. Fetches user info from Mattermost API (`/api/v4/users/me`)
7. Creates/updates R3P user with `mattermost_id`, `username`, `display_name`
8. Sets `tester_tier = 'community'`, `trust_weight = 0.50`
9. After 5+ results and 30+ days: auto-promotes to `verified`, `trust_weight = 0.75`

**Why Mattermost:** Testing coordination already happens in the Mattermost Testing channel. Community members are there. Using Mattermost for auth means zero new account friction — if you're coordinating in #testing, you can log in.

### Tier 3: Rocky Identity OIDC (Core Team)

For designated testing team members:

1. Rocky Identity OIDC flow (FreeIPA/Keycloak)
2. Admin sets `team_member = TRUE` for recognized testers
3. `tester_tier = 'core_team'`, `trust_weight = 1.00`
4. Full trust — results carry maximum weight in release readiness metrics

**Flow:**
```python
oauth.register(
    name='rocky',
    server_metadata_url='https://id.rockylinux.org/.well-known/openid-configuration',
    client_id='r3p',
    client_secret=settings.OIDC_CLIENT_SECRET,
    client_kwargs={'scope': 'openid profile email'}
)
```

### Trust Weight Business Logic

Trust weights are calculated at submission time and stored on each result:

```python
def calculate_trust_weight(user: User | None) -> float:
    if user is None:
        return 0.25  # Anonymous

    if user.team_member:
        return 1.00  # Core team

    if user.result_count >= 5 and user.days_since_first_result >= 30:
        return 0.75  # Verified community member

    return 0.50  # Community (authenticated via Mattermost)
```

**Effect on metrics:** Release readiness displays both raw pass rate and trust-weighted pass rate. A section with 10 anonymous PASSes reads differently from 3 core team PASSes — both are shown, neither is hidden.

### API Token Authentication

For automation, CI/CD, and MCP agents:
- User-initiated via UI (must be logged in via Mattermost or Rocky Identity)
- Random 32-byte tokens (base64 encoded)
- Stored hashed (SHA-256) in database
- User can name tokens ("CI Pipeline", "OpenQA Import")
- Optional expiration dates
- Scoped permissions (read, write:results, admin)

**Token Usage:**
```bash
curl -H "Authorization: Bearer r3p_abc123..." \
  https://r3p.bradydibble.com/api/v1/results \
  -d '{"testcase_ulid": "...", "outcome": "PASS"}'
```

## Security Considerations

### Session Security
- HTTP-only, secure cookies
- 7-day expiration with refresh
- SameSite=Lax for CSRF protection
- Session encryption via `itsdangerous`

### API Token Security
- Hash storage only (never store plaintext)
- Rate limiting: 100 req/min per token
- Scope limitation
- Audit log for token usage

### CORS Policy
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://r3p.bradydibble.com",   # POC
        "https://r3p.rockylinux.org",     # Production
        "http://localhost:3000"            # Development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

## Migration Path

### MVP Phase
1. Anonymous submissions (always)
2. Mattermost OAuth integration
3. Basic session management

### Phase 2
4. Rocky Identity OIDC for core team
5. API token management UI
6. Token scoping and rate limiting
7. Trust tier auto-promotion logic

### Phase 3
8. Audit logging
9. Advanced session management
10. OAuth2 scopes for third-party apps

## Consequences

### Positive
- Zero friction for drive-by community members (anonymous)
- Low friction for Mattermost community members (1 click OAuth)
- Secure, standards-based authentication
- No password management burden
- Trust-weighted results make release readiness meaningful
- Flexibility for automation (API tokens)

### Negative
- Three authentication mechanisms to maintain
- Mattermost admin must enable OAuth app (setup dependency)
- Trust weight logic adds complexity to metrics calculation
- Need to handle the case where a Mattermost user becomes a core team member

### Neutral
- Need to coordinate with Rocky Mattermost admins for OAuth app registration
- Token management UI adds to MVP scope (can defer to Phase 2)

## Validation

Success criteria:
- [ ] Anonymous users can submit results without login
- [ ] Mattermost OAuth login works for community members
- [ ] Rocky Identity OIDC works for core team
- [ ] Trust weights correctly calculated and stored
- [ ] Release readiness shows both raw and weighted pass rates
- [ ] API tokens can be generated and used
- [ ] Token revocation works immediately
- [ ] Role-based access control enforced

## Related Decisions

- ADR 001: Backend Framework Selection (FastAPI with Authlib)
- ADR 002: Frontend Framework Selection (Next.js auth flow)

## References

- [Mattermost OAuth 2.0 Provider](https://developers.mattermost.com/integrate/apps/authentication/oauth2-apps/)
- [Mattermost REST API v4](https://api.mattermost.com/)
- [OpenID Connect Specification](https://openid.net/connect/)
- [OAuth 2.0 RFC](https://datatracker.ietf.org/doc/html/rfc6749)
- [Authlib Documentation](https://docs.authlib.org/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
