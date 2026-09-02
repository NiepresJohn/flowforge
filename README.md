# FlowForge

Self-hosted workflow automation platform (mini-Zapier). Visually build flows on a canvas, connect a trigger to actions, and run them through a durable queue with live execution monitoring.

## Features

- **Visual flow builder** — drag-free canvas (React Flow) with a configurable node sidebar; wire trigger → action chains.
- **Webhook triggers** — every flow gets a public `/webhook/:path` endpoint with HMAC-SHA256 signing.
- **Built-in actions** — HTTP requests (with `{{ variable }}` interpolation from prior steps), and delay.
- **Durable execution** — BullMQ + Redis queue; the worker runs flows with retries, backoff, and step-level IO tracking.
- **Live monitoring** — execution lifecycle events stream over WebSocket to the UI.
- **Extensible** — integrations register manifests (triggers/actions + JSON config schemas) via `@flowforge/integrations`.

## Architecture

```
apps/
  api/       Express API + WebSocket gateway  (:4000)
  worker/    BullMQ worker — executes flows from the queue
  web/       React SPA (Vite + React Router + React Flow) — served on :80 by nginx in prod
packages/
  bus/       Redis pub/sub event bus (worker publishes, API fans out to WS)
  config/    shared environment config
  db/        Drizzle ORM schema + Postgres pool
  executor/  graph topo-sort, node runner, AES-GCM credential helpers
  integrations/  integration registry + built-in triggers/actions
  queue/     BullMQ queue wrapper
  shared/    canonical domain types shared across apps/packages
```

Data flows like this:

```
External service ──POST──▶ /webhook/:path (api) ──▶ BullMQ ──▶ worker
                                                              │
   api ◀──Redis exec events── worker (executor runs flow) ────┤
    │                                                          │
    └──▶ WebSocket clients (browser execution monitor)         ▼
                                                        Postgres rows
```

## Prerequisites

- Node.js >= 22
- pnpm >= 9
- Docker + Docker Compose (for Postgres/Redis, and the full-stack e2e)

## Getting started (local dev)

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Configure environment:

   ```sh
   cp .env.example .env
   # Generate a real credential key:
   #   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # and put it in CREDENTIAL_ENCRYPTION_KEY.
   ```

3. Start Postgres + Redis:

   ```sh
   docker compose up -d postgres redis
   ```

4. Push the DB schema:

   ```sh
   pnpm --filter @flowforge/db db:push
   ```

5. Start the API, worker, and web app (three processes, all watch for changes):

   ```sh
   pnpm dev
   ```

   - Web UI: http://localhost:5173 (Vite dev server proxies `/api` and `/ws` to :4000)
   - API health: http://localhost:4000/healthz

## Docker (production-like)

```sh
docker compose up --build
```

- Web UI + API on http://localhost (nginx on :80 reverse-proxies `/api`, `/ws`, `/webhook/`)
- `db-init` runs `drizzle-kit push` once before the API starts

## Testing

| Command | What it does |
| --- | --- |
| `pnpm typecheck` | `tsc --noEmit` across all workspace packages |
| `pnpm lint` | Biome checks per package + repo-wide `biome check .` |
| `pnpm test` | Vitest unit tests (graph ordering, credential crypto, HTTP action, delay, queue payloads, web components) |
| `pnpm build` | Compiles packages + `vite build` for the web app |
| `pnpm test:e2e` | Playwright smoke test against the running Docker stack (`docker compose up --build` first) |

## Webhook usage

Each flow gets a unique path and secret. To trigger a flow from an external service:

```sh
SECRET=<the flow's secret from the DB>
BODY='{"hello":"world"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')
curl -X POST http://localhost/webhook/<path> \
  -H "Content-Type: application/json" \
  -H "x-flowforge-signature: $SIG" \
  -d "$BODY"
```

## Repository layout notes

- Flows are stored as a trigger node plus action nodes and directed edges in Postgres (`flows`, `flow_nodes`, `flow_edges`).
- The executor topologically sorts the graph (Kahn's algorithm), rejects cycles, and runs each reachable node in order, persisting per-step input/output/error.
- Stored credentials are AES-256-GCM encrypted with `CREDENTIAL_ENCRYPTION_KEY`; decryption happens only inside the worker.
