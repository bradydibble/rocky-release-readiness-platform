# R3P POC Hosting — cairn-02

**Last Updated:** April 2026
**Status:** POC Deployment Target

## Overview

The R3P proof-of-concept will be hosted on cairn-02, a homelab server running RHEL 9.6. This documents the deployment approach, following the established patterns already in use on this host (rootless Podman + systemd user services).

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
              ├── r3p.bradydibble.com/api/* → r3p-backend:8000
              └── r3p.bradydibble.com/*     → r3p-frontend:3000

Tailscale VPN → Direct backend/admin access for development
```

**Pattern:** Rootless Podman containers as systemd user services — matching all other services on cairn-02. No Docker Compose.

## Services

### r3p-db.service — PostgreSQL

`/home/admin/.config/systemd/user/r3p-db.service`:

```ini
[Unit]
Description=R3P - PostgreSQL Database
After=network-online.target

[Service]
Type=simple
Restart=always
RestartSec=10
ExecStart=/usr/bin/podman run --rm --name r3p-db \
  -e POSTGRES_DB=r3p \
  -e POSTGRES_USER=r3p \
  --env-file /home/admin/r3p/.env \
  -v r3p-postgres-data:/var/lib/postgresql/data:Z \
  -p 127.0.0.1:5432:5432 \
  docker.io/postgres:15-alpine
ExecStop=/usr/bin/podman stop -t 10 r3p-db

[Install]
WantedBy=default.target
```

### r3p-backend.service — FastAPI

`/home/admin/.config/systemd/user/r3p-backend.service`:

```ini
[Unit]
Description=R3P - FastAPI Backend
After=network-online.target r3p-db.service
Requires=r3p-db.service

[Service]
Type=simple
Restart=always
RestartSec=10
ExecStart=/usr/bin/podman run --rm --name r3p-backend \
  --env-file /home/admin/r3p/.env \
  -v /home/admin/r3p/logs:/app/logs:Z \
  -p 127.0.0.1:8000:8000 \
  r3p-backend:latest
ExecStop=/usr/bin/podman stop -t 10 r3p-backend

[Install]
WantedBy=default.target
```

### r3p-frontend.service — Next.js

`/home/admin/.config/systemd/user/r3p-frontend.service`:

```ini
[Unit]
Description=R3P - Next.js Frontend
After=network-online.target r3p-backend.service

[Service]
Type=simple
Restart=always
RestartSec=10
ExecStart=/usr/bin/podman run --rm --name r3p-frontend \
  -e NEXT_PUBLIC_API_URL=https://r3p.bradydibble.com/api \
  -p 127.0.0.1:3000:3000 \
  r3p-frontend:latest
ExecStop=/usr/bin/podman stop -t 10 r3p-frontend

[Install]
WantedBy=default.target
```

## Caddy Configuration

Add to existing `~/homelab/configs/Caddyfile`:

```caddy
r3p.bradydibble.com {
    reverse_proxy /api/* localhost:8000
    reverse_proxy /* localhost:3000
}
```

## Cloudflare Tunnel

Add to existing `~/homelab/configs/cloudflared-config.yml` ingress rules:

```yaml
- hostname: r3p.bradydibble.com
  service: http://localhost:80
```

## Environment File

`/home/admin/r3p/.env` — not in git, contains secrets:

```bash
# Database
POSTGRES_PASSWORD=<strong-random-password>
DATABASE_URL=postgresql://r3p:<password>@localhost:5432/r3p

# Mattermost OAuth (primary login)
MATTERMOST_CLIENT_ID=<from-rocky-mattermost-oauth-app>
MATTERMOST_CLIENT_SECRET=<from-rocky-mattermost-oauth-app>
MATTERMOST_BASE_URL=https://chat.rockylinux.org

# Rocky Identity OIDC (core team login)
OIDC_CLIENT_ID=r3p
OIDC_CLIENT_SECRET=<from-rocky-ipa>
OIDC_SERVER_URL=https://id.rockylinux.org

# App
SECRET_KEY=<strong-random-key>
ENVIRONMENT=production
```

## Monitoring Integration

cairn-02 already runs Prometheus, Grafana, and Loki. R3P plugs into the existing stack:

**Prometheus** — add to `~/homelab/configs/prometheus.yml`:
```yaml
- job_name: 'r3p-backend'
  static_configs:
    - targets: ['localhost:8000']
  metrics_path: '/metrics'
```

**Loki/Promtail** — R3P backend logs land in `/home/admin/r3p/logs/` and ship to Loki via the existing Promtail config (add path pattern).

**Grafana** — add a R3P dashboard: API latency, result submission rate, active test runs, error rate.

## Deployment Workflow

```bash
# First deploy (on cairn-02)
mkdir -p ~/r3p/logs
systemctl --user daemon-reload
systemctl --user enable --now r3p-db r3p-backend r3p-frontend

# Update backend
cd ~/r3p
git pull
podman build -t r3p-backend:latest ./backend
systemctl --user restart r3p-backend

# Update frontend
podman build -t r3p-frontend:latest ./frontend
systemctl --user restart r3p-frontend

# View logs
journalctl --user -u r3p-backend -f
journalctl --user -u r3p-frontend -f
journalctl --user -u r3p-db -f

# Check status
systemctl --user status r3p-backend r3p-frontend r3p-db
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
| POC | `https://r3p.bradydibble.com` | Cloudflare Tunnel, public |
| Admin/Dev | `http://100.95.28.27:8000` | Tailscale only |
| Future production | `https://r3p.rockylinux.org` | RESF hosting, TBD |
