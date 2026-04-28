# Callboard operations runbook

**Audience**: anyone who needs to keep production running, deploy a change, debug an outage, or recover from disaster. If you're new to the codebase, read [README.md](README.md) first.

This document is the source of truth for how the production system is wired and operated. The original deployment walkthrough is at [Architecture/deploy-guide.html](Architecture/deploy-guide.html); this file is the *steady-state* version.

> **Production went live**: 2026-04-27. All 14 phases of the deploy guide complete.

---

## Table of contents

- [Live URLs](#live-urls)
- [System inventory](#system-inventory)
- [Account & credential inventory](#account--credential-inventory)
- [Access](#access)
- [Common operational tasks](#common-operational-tasks)
- [Monitoring & alerting](#monitoring--alerting)
- [Backups & disaster recovery](#backups--disaster-recovery)
- [Known issues](#known-issues)
- [Cost summary](#cost-summary)
- [Going further](#going-further)

---

## Live URLs

| Surface | URL | Purpose |
|---|---|---|
| Marketing + dashboard | `https://getcallboard.com` | Next.js, public + authenticated areas |
| `www` mirror | `https://www.getcallboard.com` | CNAME → apex |
| API | `https://api.getcallboard.com` | Express + tsoa |
| API health | `https://api.getcallboard.com/health` | UptimeRobot probe target |
| OpenAPI spec | `https://api.getcallboard.com/openapi.json` | Programmatic clients |
| Coolify dashboard | `https://coolify.getcallboard.com` | Self-hosted orchestrator (basic-auth-protected, DNS-only) |

All public-facing hostnames sit behind Cloudflare in **Full (strict)** TLS mode, with **Always Use HTTPS** and **Automatic HTTPS Rewrites** on. The `coolify` subdomain is intentionally DNS-only (grey cloud) so its Let's Encrypt cert from Caddy is what the browser sees.

---

## System inventory

```
                              ┌────────────────────────┐
                              │   Cloudflare DNS+CDN   │
                              │  Full (strict) · WAF   │
                              └──────────┬─────────────┘
                                         │ HTTPS / HTTP/2 / h3
                              ┌──────────▼─────────────┐
                              │   Hetzner CPX21 VPS    │
                              │   Ashburn (US-east)    │
                              │   178.156.200.155      │
                              │   Ubuntu 24.04 LTS     │
                              └──────────┬─────────────┘
                                         │ UFW: 22, 80, 443 only
                              ┌──────────▼─────────────┐
                              │  Coolify (Docker)      │
                              │  v4.0.0-beta.474       │
                              │  Traefik proxy         │
                              └─┬──────┬──────┬────────┘
                                │      │      │
            ┌───────────────────┘      │      └────────────────────┐
            │                          │                           │
   ┌────────▼──────────┐    ┌──────────▼─────────┐    ┌────────────▼──────────┐
   │  callboard-api    │    │  callboard-web     │    │  callboard-postgres   │
   │  Express+tsoa     │    │  Next.js standalone │    │  Postgres 16          │
   │  port 3000        │    │  port 3001          │    │  port 5432 (internal) │
   └────────┬──────────┘    └─────────────────────┘    └───────────┬───────────┘
            │                                                       │
            │                                          ┌────────────▼──────────┐
            │                                          │  Daily 03:00 UTC dump │
            │                                          │  → Cloudflare R2      │
            │                                          │  callboard-backups    │
            └─────────────► callboard-redis (Redis 7)  └───────────────────────┘
                            port 6379 (internal)
```

| Layer | Vendor | Resource | Purpose |
|---|---|---|---|
| Registrar | GoDaddy | `getcallboard.com` | Domain registration only — nameservers point at Cloudflare |
| DNS / CDN / WAF | Cloudflare | `getcallboard.com` zone | DNS, edge cache, TLS termination, WAF, analytics |
| Object storage | Cloudflare R2 | `callboard-backups` bucket | Off-box Postgres backups, retained per Coolify policy |
| VPS | Hetzner Cloud | CPX21, Ashburn (US-east) | Single-node Docker host running everything else |
| Orchestrator | self-hosted | Coolify v4 | App lifecycle, deploys via GitHub App, Traefik proxy + Let's Encrypt |
| Database | self-hosted | Coolify Postgres resource | 16-Alpine, internal Docker network only |
| Cache / queue | self-hosted | Coolify Redis resource | 7-Alpine, currently used by `express-rate-limit` distributed store |
| API runtime | self-hosted | Node 22 Alpine, multi-stage Dockerfile | Express 5 + Prisma 6, runs `prisma migrate deploy` on startup |
| Web runtime | self-hosted | Node 22 Alpine, Next.js standalone | Next.js 16, baked-in `NEXT_PUBLIC_API_URL` |
| Source control | GitHub | `aguacasa/callboard` | Coolify deploys `main` via GitHub App webhook |
| Monitoring | UptimeRobot | 2 HTTPS monitors | 5-min checks on `/` and `/health`, email alert on 2 consecutive failures |
| Error tracking | Sentry | code wired, DSN-gated | Set `SENTRY_DSN` in Coolify on `callboard-api` to activate. No DSN = no-op. |

---

## Account & credential inventory

Everything sensitive lives in `~/Desktop/Callboard/secrets-DO-NOT-COMMIT/` on the operator's laptop. **Nothing in this directory is in git.** If you take over, get the operator to grant you access (1Password / Bitwarden / encrypted hand-off — never email).

| File | Holds |
|---|---|
| `coolify.env` | Coolify root password, Postgres `postgres` password, Redis `default` password, app encryption key |
| `callboard-prod.env` | `API_KEY_SALT` (used to derive API key hashes — losing it invalidates every issued key) |
| `r2-backups.env` | Cloudflare R2 endpoint, bucket name, Access Key ID, Secret Access Key for the `coolify-backups-rw` token |

Ownership / billing lives on these accounts (operator: nick@visualized.tech as of 2026-04-27):

- **GoDaddy** — domain renewal
- **Cloudflare** — DNS, R2, edge security
- **Hetzner Cloud** — VPS billing, weekly snapshot retention
- **GitHub** — repo + GitHub App (`aguacasa/callboard`)
- **UptimeRobot** — monitor + email alert routing
- **Sentry** — to be created and DSN added to `~/Desktop/Callboard/secrets-DO-NOT-COMMIT/sentry.env`, then set as `SENTRY_DSN` env var on `callboard-api` in Coolify

---

## Access

### SSH to the VPS

`~/.ssh/config` already has aliases — once your public key is in `/home/callboard/.ssh/authorized_keys` and `/root/.ssh/authorized_keys`:

```bash
ssh callboard       # unprivileged user (sudo-capable)
ssh callboard-root  # direct root (key-only, used by Coolify internally)
```

The server enforces:
- `PermitRootLogin prohibit-password` — keys only
- `PasswordAuthentication no`
- UFW allows **only** 22 (SSH), 80, 443. Postgres (5432) and Redis (6379) and the Coolify direct port (8000) are dropped at the firewall, including a `DOCKER-USER` chain rule that defeats Docker's PREROUTING DNAT bypass.
- fail2ban enabled

### Coolify dashboard

`https://coolify.getcallboard.com` — basic-auth (creds in `coolify.env`). All app deploys, env-var changes, restarts, log inspection, and database terminal access flow through here.

### Direct Postgres / Redis access

Both are Docker-internal only. To poke around:

1. Coolify → callboard-postgres → **Terminal** → `psql -U postgres -d callboard`
2. Coolify → callboard-redis → **Terminal** → `redis-cli`

---

## Common operational tasks

### Deploy a code change

1. PR into `main` on GitHub. CI runs (`backend`, `web`, `mcp` jobs in `.github/workflows/ci.yml`).
2. Merge. The GitHub App webhook fires Coolify's auto-deploy.
3. Watch in Coolify → callboard-api (or callboard-web) → **Deployments** tab. Each phase logs in real time: clone → build → migrate → start → healthcheck.
4. If the build fails, the previous container keeps serving. Fix forward.

> **Don't** push directly to `main` and then wonder why the deploy didn't happen — the webhook fires only on push events that match the configured branch, but CI gates a real PR. Always go through PR.

### Restart a service (no rebuild)

Coolify → app → **Restart** button (top right). Use this when:
- You change an env var and need it picked up
- The container is misbehaving but the image is fine

This re-runs the container's CMD, which for the API includes `prisma migrate deploy` — safe to do anytime.

### Force a fresh build of the same commit

Coolify → app → **Deployments** → click ⋯ on the most recent deploy → **Force redeploy** (or change any setting and save, which triggers a rebuild).

### Inspect logs

- **App logs**: Coolify → app → **Logs** tab. Live tail; scroll back as needed.
- **Container shell**: Coolify → app → **Terminal** tab → drops you into the running container.
- **Server-level logs** (rare): SSH to the VPS, `journalctl` or `docker logs <container>` directly.

### Add or change an environment variable

Coolify → app → **Environment Variables** → edit row → Save → **Restart**.

> **Critical gotcha**: in **Developer View** (paste-multiple), if values run together onto one line, Coolify will store them as a single env var with a literal space (URL-encoded as `%20`) in the middle. This burned us during the first deploy: `DATABASE_URL` and `REDIS_URL` ended up concatenated. Always paste one line at a time, or paste then verify each row is its own entry before saving.

### Add a new domain to an existing app

1. **Cloudflare DNS** → add the record (A → `178.156.200.155`, **DNS only / grey cloud** initially)
2. **Coolify** → app → Configuration → **Domains** → append the new URL → Save
3. Click **Restart** so Traefik picks up the new host and requests a Let's Encrypt cert
4. Once you've verified the cert was issued (`curl -i https://newhost.example.com`), flip Cloudflare back to **Proxied / orange cloud** if you want CF in front

### Run an ad-hoc command in the API container

Coolify → callboard-api → **Terminal**. The container has Node 22, the compiled `dist/`, and Prisma's CLI available:

```sh
node -e "console.log(process.env.NODE_ENV)"   # check env
npx prisma migrate status                     # see migration state
npx prisma db pull                            # refresh schema from DB (dev-style; don't commit from prod)
```

Note: `npm run db:seed` runs the compiled `dist/seed.js` inside the prod container (the `scripts/db-seed.js` wrapper auto-detects). It will wipe and re-seed sample data — only run on a fresh / non-customer DB.

### Rotate the API key salt

This is destructive: rotating `API_KEY_SALT` invalidates every API key currently issued (their stored hashes will no longer match). Procedure:

1. Generate a new salt: `openssl rand -hex 32`
2. Coolify → callboard-api → Environment Variables → set `API_KEY_SALT` to the new value → Save → Restart
3. Communicate to all consumers that they need to re-issue keys via `POST /api-keys`

### Cancel and re-issue a single API key

Coolify → callboard-postgres → Terminal:

```sql
psql -U postgres -d callboard
SELECT id, prefix, label, "agentId", "createdAt" FROM api_keys WHERE prefix = 'cb_xxxxxxx';
DELETE FROM api_keys WHERE id = '...';
\q
```

Then have the affected agent's owner call `POST /api-keys` to mint a replacement.

---

## Monitoring & alerting

### What watches what

| Tool | Watches | Alerts to |
|---|---|---|
| UptimeRobot | `https://api.getcallboard.com/health` and `https://getcallboard.com` | Email on 2 consecutive failures (5-min interval) |
| Cloudflare Analytics | Edge traffic, threat events, cache stats | Dashboard only — no alert routing configured |
| Coolify metrics | CPU/RAM/disk on the VPS | Dashboard only |
| Hetzner Cloud Console | VPS health, snapshot status, billing | Email on infra-level events |

### When an UptimeRobot alert fires

Triage in this order:

1. **Open the URL in a browser.** False positive? UptimeRobot occasionally flags brief blips; if it's back up by the time you check and it stays up, ignore.
2. **Cloudflare status**: are 503s coming from Cloudflare or the origin? Check Cloudflare → Analytics → Security → recent events.
3. **Coolify dashboard**: are the containers running? Coolify → callboard project → status pills.
4. **App logs**: Coolify → callboard-api → Logs tab. Look for Prisma errors (DB unreachable), unhandled exceptions, or memory pressure.
5. **VPS itself**: `ssh callboard` then `df -h` (disk full?), `free -m` (RAM?), `systemctl status docker`.

### Disk-full early warning

The CPX21 has 80 GB. The biggest growth risks are Postgres data, Docker images (pruned automatically by Coolify), and log volume. Set yourself a mental threshold: **at >80% disk, expand the volume in Hetzner before it bites**. Coolify → Servers → localhost → Metrics shows this.

---

## Backups & disaster recovery

### What's backed up

| What | Where | Frequency | Retention |
|---|---|---|---|
| Whole-VPS snapshot | Hetzner backups | Weekly (auto) | Last 7 |
| Postgres dump | Coolify → R2 `callboard-backups/data/coolify/backups/...` | Daily 03:00 UTC | Coolify default policy (~7 days, configurable) |

### Restoring Postgres from R2

Tested manually quarterly per the deploy guide. Procedure:

1. Download the most recent `pg-dump-callboard-*.dmp` from R2 (`aws s3 cp`, `wrangler r2`, or the Cloudflare dashboard)
2. Spin up a local Postgres: `docker run -d --rm -p 5433:5432 -e POSTGRES_PASSWORD=test --name pg-restore-test postgres:16`
3. Restore: `pg_restore -h localhost -p 5433 -U postgres -d postgres pg-dump-callboard-XXXX.dmp`
4. Verify: `psql -h localhost -p 5433 -U postgres -c 'SELECT count(*) FROM agents;'` matches a known-good number
5. Tear down: `docker stop pg-restore-test`

> **Untested backups are not backups.** Run this drill at least quarterly; otherwise the first time you find out the backup is corrupt is the moment you actually need it.

### Total VPS loss recovery

If the Hetzner box is gone:

1. **Restore from Hetzner snapshot** — fastest path. Hetzner Cloud Console → server → Backups → Restore. New IP will be assigned.
2. Update Cloudflare DNS A records (`@`, `www`, `api`, `coolify`) to the new IP.
3. SSH in, verify Coolify came up cleanly. Apps should auto-start since their state is on the persistent volume.
4. If snapshots are also gone (bad luck day): provision a fresh CPX21, reinstall Coolify per the deploy guide phases 2–5, then restore the latest R2 Postgres dump per above. Apps come back via GitHub deploy.

---

## Known issues

The three items deferred from the initial deploy were addressed in the follow-up PR (seed-in-prod fix, `trust proxy: 1`, Sentry SDK wired DSN-gated). Remaining operator action:

### Sentry — create the account and wire the DSN

The code is in place: `Sentry.init` runs only when `SENTRY_DSN` is set, and `Sentry.setupExpressErrorHandler(app)` is registered before our error handler. To activate:

1. Create a Sentry org + Node project at https://sentry.io
2. Copy the DSN into `~/Desktop/Callboard/secrets-DO-NOT-COMMIT/sentry.env`
3. Coolify → callboard-api → Environment Variables → add `SENTRY_DSN=<dsn>` → Save → Restart
4. Verify: trigger a 500 (e.g. hit a malformed protected route) and confirm it shows up in Sentry within ~30s

No DSN = Sentry stays a no-op. Safe to leave unset in dev/test.

---

## Cost summary

Monthly recurring as of 2026-04-27, USD-equivalent:

| Line item | Vendor | Cost |
|---|---|---|
| CPX21 VPS | Hetzner | ~$13.99 |
| Weekly snapshots | Hetzner | ~$2.92 |
| Domain renewal | GoDaddy | ~$1.50 (amortized) |
| Cloudflare zone + R2 (under 10 GB) | Cloudflare | $0 |
| UptimeRobot free tier | UptimeRobot | $0 |
| GitHub | GitHub | $0 (public/free tier) |

**Total**: ~$18.50/mo. Sentry's developer tier is free up to 5K events/mo and won't change this.

---

## Going further

- The original phase-by-phase deploy walkthrough lives at [Architecture/deploy-guide.html](Architecture/deploy-guide.html) — reference it if you ever need to rebuild from scratch.
- Code conventions and PR checklist are in [CLAUDE.md](CLAUDE.md).
- Tests, smoke scripts, and dev runbook in [README.md](README.md) and [TESTING.md](TESTING.md).
- For the user-facing product docs (quickstart, MCP, API reference), see `web/src/app/docs/*` served at `https://getcallboard.com/docs`.
