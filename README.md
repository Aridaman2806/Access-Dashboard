# MCP Access Management

An access-control layer for an organization's MCP (Model Context Protocol) server. Admins grant or revoke tool
access to individual users or whole project-code groups; a gateway enforces those grants on every MCP request, so a
user only ever sees and can call the tools they're actually allowed to use.

```
Agent Builder Platform  --MCP-->  Gateway  --MCP-->  Real MCP server
     (SSO identity)             (enforces grants)      (your tools)
```

## What's in this repo

| Folder | What it is |
|---|---|
| `core/` | Shared library: SQLite schema, models, and the permission-resolution logic |
| `gateway/` | The enforcement proxy — sits between the agent builder and the real MCP server |
| `mock-mcp-server/` | A fake MCP server (10 trivial tools) for local testing without touching a real one |
| `admin-portal/api/` + `admin-portal/frontend/` | The admin portal — grant/revoke access, tag tools, browse who-has-access-to-what |
| `mock-agent-builder/api/` + `mock-agent-builder/frontend/` | A stand-in for your org's real agent builder platform, so you can see the enforcement working end-to-end without it |
| `scripts/` | An automated end-to-end test that proves the gateway's access logic works |

The access rule: `allowed = department tag match OR individual grant OR project-code group grant`.

## Prerequisites

- **Node.js ≥ 22.5** (uses the built-in `node:sqlite` module — check with `node --version`)
- npm (ships with Node)

## 1. Clone and install

```bash
git clone https://github.com/Aridaman2806/Access-Dashboard.git
cd Access-Dashboard
npm install
npm run build
```

## 2. Create env files

```bash
cp gateway/.env.example gateway/.env
cp admin-portal/api/.env.example admin-portal/api/.env
cp mock-agent-builder/api/.env.example mock-agent-builder/api/.env
```

(On Windows `cmd.exe`, use `copy` with backslashes instead of `cp`; PowerShell can use `cp` directly.)

Then edit these values so the services agree with each other:

- **`gateway/.env`**
  - `GATEWAY_SHARED_SECRET` — pick any string, e.g. `my-shared-secret`
  - `GATEWAY_ENFORCE_MODE` — `shadow` to log decisions without blocking, `enforce` to actually block
- **`mock-agent-builder/api/.env`**
  - `GATEWAY_SHARED_SECRET` — **must exactly match** the gateway's value above
- **`admin-portal/api/.env`**
  - `ADMIN_PASSWORD` — whatever you want to log into the admin portal with

`DB_PATH` in `gateway/.env` and `admin-portal/api/.env` already point at a shared `data/` folder at the repo root by default — leave that alone unless you have a reason to change it, but if you do, **both files must point at the exact same file**, or grants made in the admin portal won't be visible to the gateway.

Everything else in the `.env.example` files (rate limits, log retention, `ADMIN_FRONTEND_ORIGIN`) has a sane default for local development — you only need to touch those when actually deploying, see **Production mode** below.

## 3. Run it (six terminals)

```bash
cd mock-mcp-server            && npm run dev   # http://localhost:4000
cd gateway                    && npm run dev   # http://localhost:4200
cd admin-portal/api           && npm run dev   # http://localhost:4300
cd admin-portal/frontend      && npm run dev   # http://localhost:5173
cd mock-agent-builder/api     && npm run dev   # http://localhost:4400
cd mock-agent-builder/frontend && npm run dev  # http://localhost:5175
```

Start `mock-mcp-server` before `gateway`, and `gateway` before the two services that call it.

**Whenever you edit a `.env` file, restart that service** — env vars are only read at process startup, editing the
file while the process is running has no effect until you stop (Ctrl+C) and re-run `npm run dev`.

## 4. Try the demo

1. Open **`http://localhost:5173`** (admin portal) → log in with `admin@example.com` / your `ADMIN_PASSWORD`.
2. **Tool Registry** → **Sync from upstream** (pulls in all 10 tools from whichever MCP server the gateway is
   currently pointed at).
3. **Projects** → create a project → add a member by email (e.g. `alice@demo.local`, matching one of the mock
   agent builder's demo accounts) → grant that project a couple of tools.
4. Open **`http://localhost:5175`** (mock agent builder) → click the matching demo-account row (autofills the
   password) → log in.
5. You'll see exactly the tools you granted, nothing else. Pick one, fill in the argument, **Run tool**.
6. Go back to the admin portal, grant or revoke another tool, then click **Refresh** on the still-open mock agent
   builder tab — it updates live, no re-login needed. This proves enforcement happens on every request, not just at
   login.

### Fastest sanity check (no manual clicking)

```bash
npm run verify:e2e
```

Spins up its own throwaway mock server + gateway, seeds test grants, runs 9 access-control scenarios
(department match, no access, individual grant + revoke, project grant, bad shared secret), and tears down. Takes a
few seconds, no ports or `.env` files required.

## Pointing this at a different MCP server

This whole system is designed so the actual MCP server behind it is a config-only swap — no code changes, in
either `gateway/.env` or `admin-portal/api/.env` (both must point at the same one):

```
MCP_TRANSPORT=http
UPSTREAM_MCP_SERVER_URL=http://<host>:<port>/mcp
```

- **Another mock/test server on a different machine or port**: just change the host/port, e.g.
  `UPSTREAM_MCP_SERVER_URL=http://192.168.1.50:4000/mcp` if that machine is running its own copy of
  `mock-mcp-server` (or any other MCP server).
- **A real MCP server with auth**: set whichever of these your server needs — they can be combined:
  ```
  MCP_BEARER_TOKEN=<token>                    # sends Authorization: Bearer <token>
  MCP_AUTH_HEADER_NAME=X-Api-Key               # sends one custom header
  MCP_AUTH_HEADER_VALUE=<value>
  MCP_EXTRA_HEADERS={"X-Client-ID":"...","X-Client-Secret":"...","X-Username":"..."}   # any number of custom headers
  ```
- After changing the URL, restart `gateway` and `admin-portal/api`, then click **Sync from upstream** in the admin
  portal to pull in that server's real tool list.

Recommend starting with `GATEWAY_ENFORCE_MODE=shadow` when pointing at a new server for the first time — it logs
every allow/deny decision without blocking anything, so you can verify tool tagging is correct against real traffic
before switching to `enforce`.

## Production mode

Setting `NODE_ENV=production` (in `gateway/.env` and `admin-portal/api/.env`) turns on hardening that's deliberately
**off** by default so local dev stays frictionless:

- **`gateway`** refuses to start unless `GATEWAY_ENFORCE_MODE` is explicitly `enforce` or `shadow` — a blank or
  typo'd value is fail-open (silently disables all enforcement), so production won't guess. It also hard-exits if
  `GATEWAY_SHARED_SECRET` is missing/still the placeholder, instead of just warning.
- **`admin-portal/api`** hard-exits if `SESSION_SECRET`/`ADMIN_PASSWORD` are missing/placeholders, marks the session
  cookie `secure` (HTTPS-only), and locks CORS down to exactly `ADMIN_FRONTEND_ORIGIN` instead of accepting any
  origin.
- Both services run behind `trust proxy` — put a real TLS-terminating reverse proxy in front of them if you deploy
  this for real; neither service terminates TLS itself.
- Admin sessions are stored in the shared SQLite db (not in memory), so they survive a restart — no need to
  re-provision anything for this, it's on by default in both modes.
- `gateway_access_log` is swept daily (`ACCESS_LOG_RETENTION_DAYS`, default 90) so it doesn't grow unbounded.

`mock-agent-builder` refuses to start at all when `NODE_ENV=production` — it's a local testing stand-in with
hardcoded, visible test-account passwords and must never run in a real deployment.

## Setting this up on another PC

1. Make sure that PC has Node.js ≥ 22.5 installed.
2. `git clone` this repo there.
3. Follow steps 1–3 above (install, build, env files, run).
4. If that PC needs to reach an MCP server running on a *different* machine (yours, or a third one), set
   `UPSTREAM_MCP_SERVER_URL` on that PC's `gateway/.env` and `admin-portal/api/.env` to that machine's
   reachable address (not `localhost`), e.g. `http://<other-machine-ip>:4000/mcp`. Make sure that MCP server's port
   is reachable from the new PC (same network, firewall rules allow it, etc.).
5. `GATEWAY_SHARED_SECRET` and `ADMIN_PASSWORD` are independent per deployment — set your own values, they don't
   need to match anyone else's.
