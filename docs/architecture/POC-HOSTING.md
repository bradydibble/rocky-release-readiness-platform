# CRAG POC Hosting — cairn-02

**Last Updated:** April 2026
**Status:** POC Deployment Target

## Overview

The CRAG proof-of-concept will be hosted on cairn-02, a homelab server running RHEL 9.6. This documents the deployment approach, following the established patterns already in use on this host (rootless Podman + systemd user services).

## Host Details

| Property | Value |
|----------|-------|
| Hostname | cairn-02 |
| OS | RHEL 9.6 |
| Hardware | N100 Mini PC, 16GB RAM |
| Local IP | 192.168.1.237 |
| Tailscale IP | 100.95.28.27 |
| SSH | `ssh cairn-02` |
| Homelab config | `~/homelab/` |

## Deployment Architecture

```
Internet
  └── Cloudflare Tunnel (no port forwarding)
        └── Caddy (port 80, reverse proxy)
              ├── crag.bradydibble.com/api/* → crag-backend:8000
              └── crag.bradydibble.com/*     → crag-frontend:3000

Tailscale VPN → Direct backend/admin access for development
```

**Pattern:** Rootless Podman containers as systemd user services — matching all other services on cairn-02. No Docker Compose.

## Services

### crag-db.service — PostgreSQL

`/home/admin/.config/systemd/user/crag-db.service`:

```ini
[Unit]
Description=CRAG - PostgreSQL Database
After=network-online.target

[Service]
Type=simple
Restart=always
RestartSec=10
ExecStart=/usr/bin/podman run --rm --name crag-db \
  -e POSTGRES_DB=crag \
  -e POSTGRES_USER=crag \
  --env-file /home/admin/crag/.env \
  -v crag-postgres-data:/var/lib/postgresql/data:Z \
  -p 127.0.0.1:5432:5432 \
  docker.io/postgres:15-alpine
ExecStop=/usr/bin/podman stop -t 10 crag-db

[Install]
WantedBy=default.target
```

### crag-backend.service — FastAPI

`/home/admin/.config/systemd/user/crag-backend.service`:

```ini
[Unit]
Description=CRAG - FastAPI Backend
After=network-online.target crag-db.service
Requires=crag-db.service

[Service]
Type=simple
Restart=always
RestartSec=10
ExecStart=/usr/bin/podman run --rm --name crag-backend \
  --env-file /home/admin/crag/.env \
  -v /home/admin/crag/logs:/app/logs:Z \
  -p 127.0.0.1:8000:8000 \
  crag-backend:latest
ExecStop=/usr/bin/podman stop -t 10 crag-backend

[Install]
WantedBy=default.target
```

### crag-frontend.service — Next.js

`/home/admin/.config/systemd/user/crag-frontend.service`:

```ini
[Unit]
Description=CRAG - Next.js Frontend
After=network-online.target crag-backend.service

[Service]
Type=simple
Restart=always
RestartSec=10
ExecStart=/usr/bin/podman run --rm --name crag-frontend \
  -e NEXT_PUBLIC_API_URL=https://crag.bradydibble.com/api \
  -p 127.0.0.1:3000:3000 \
  crag-frontend:latest
ExecStop=/usr/bin/podman stop -t 10 crag-frontend

[Install]
WantedBy=default.target
```

## Caddy Configuration

Add to existing `~/homelab/configs/Caddyfile`:

```caddy
crag.bradydibble.com {
    reverse_proxy /api/* localhost:8000
    reverse_proxy /* localhost:3000
}
```

## Cloudflare Tunnel

Add to existing `~/homelab/configs/cloudflared-config.yml` ingress rules:

```yaml
- hostname: crag.bradydibble.com
  service: http://localhost:80
```

## Environment File

`/home/admin/crag/.env` — not in git, contains secrets:

```bash
# Database
POSTGRES_PASSWORD=<strong-random-password>
DATABASE_URL=postgresql://crag:<password>@localhost:5432/crag

# Mattermost OAuth (primary login)
MATTERMOST_CLIENT_ID=<from-rocky-mattermost-oauth-app>
MATTERMOST_CLIENT_SECRET=<from-rocky-mattermost-oauth-app>
MATTERMOST_BASE_URL=https://chat.rockylinux.org

# Rocky Identity OIDC (core team login)
OIDC_CLIENT_ID=crag
OIDC_CLIENT_SECRET=<from-rocky-ipa>
OIDC_SERVER_URL=https://id.rockylinux.org

# App
SECRET_KEY=<strong-random-key>
ENVIRONMENT=production
```

## Monitoring Integration

cairn-02 already runs Prometheus, Grafana, and Loki. CRAG plugs into the existing stack:

**Prometheus** — add to `~/homelab/configs/prometheus.yml`:
```yaml
- job_name: 'crag-backend'
  static_configs:
    - targets: ['localhost:8000']
  metrics_path: '/metrics'
```

**Loki/Promtail** — CRAG backend logs land in `/home/admin/crag/logs/` and ship to Loki via the existing Promtail config (add path pattern).

**Grafana** — add a CRAG dashboard: API latency, result submission rate, active test runs, error rate.

## Deployment Workflow

```bash
# First deploy (on cairn-02)
mkdir -p ~/crag/logs
systemctl --user daemon-reload
systemctl --user enable --now crag-db crag-backend crag-frontend

# Update backend
cd ~/crag
git pull
podman build -t crag-backend:latest ./backend
systemctl --user restart crag-backend

# Update frontend
podman build -t crag-frontend:latest ./frontend
systemctl --user restart crag-frontend

# View logs
journalctl --user -u crag-backend -f
journalctl --user -u crag-frontend -f
journalctl --user -u crag-db -f

# Check status
systemctl --user status crag-backend crag-frontend crag-db
```

## Security Notes

- All services run as unprivileged `admin` user (rootless Podman, RHEL 9.6 SELinux enforcing)
- Database port bound to `127.0.0.1` only — not reachable from network
- Secrets in `.env` file only — never committed to git
- Use `:Z` volume mount flag for SELinux relabeling
- No direct port forwarding — public traffic only via Cloudflare Tunnel
- Admin/dev access via Tailscale VPN (`ssh cairn-02`)

## Public vs Production Domains

| Environment | Domain | Access |
|-------------|--------|--------|
| POC | `https://crag.bradydibble.com` | Cloudflare Tunnel, public |
| Admin/Dev | `http://100.95.28.27:8000` | Tailscale only |
| Future production | `https://crag.rockylinux.org` | RESF hosting, TBD |
