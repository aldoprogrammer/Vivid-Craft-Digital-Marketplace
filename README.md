# VividCraft

Digital art & comic marketplace built as microservices. Creators list comics, art, and assets. Fans browse, add to cart, and checkout via **Stripe** (international cards) or **Xendit** (SEA local payments).

https://youtu.be/TWGRvFVJJGw

→ [Platform preview (screenshots)](docs/preview/PLATFORM_PREVIEW.md)

## What's inside

| Part | Tech | Port |
|------|------|------|
| Web app | React + Vite + Tailwind | 5173 |
| API Gateway | Express (routes all traffic) | 3000 |
| Auth service | NestJS + Prisma + PostgreSQL | 3001 |
| Marketplace service | NestJS + MongoDB + Redis | 3002 |
| Transaction service | NestJS + Prisma + BullMQ | 3003 |
| Image processor | Python Flask + Pillow | 5000 |
| PostgreSQL | User & payment data | 5432 |
| MongoDB | Product catalog | 27017 |
| Redis | Cache & job queue | 6379 |
| Redis Commander (dev UI) | Browse Redis keys | 8081 |
| Prisma Studio — auth DB | PostgreSQL tables (users) | 5555 |
| Prisma Studio — transactions DB | PostgreSQL tables (orders, payments) | 5556 |
| Mailpit | Dev SMTP inbox | 8025 / 1025 |
| Elasticsearch | Product full-text search | 9200 |
| Consul | Service registry | 8500 |
| Prometheus (optional) | Metrics | 9090 |
| Grafana (optional) | Dashboards | 3005 |
| Alertmanager (optional) | Alerts → Mailpit | 9093 |

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- Node.js 20+ (optional, for local installs outside Docker)

## Feature integration (end-to-end)

| Feature | Backend | Frontend |
|---------|---------|----------|
| Auth (register/login) | `auth-service` | Login, Register pages |
| Product catalog | `marketplace-service` + MongoDB + Redis | Marketplace with search/filter |
| Image watermark | `image-processor` (Flask) → `marketplace-service` | Creator Dashboard image upload |
| Checkout & payments | `transaction-service` + Stripe/Xendit | `/checkout` page → provider redirect |
| Order history | `transaction-service` | My Orders (table, filters, pagination) |
| Notifications (SSE + inbox) | `transaction-service` | Navbar bell dropdown |
| API routing | `api-gateway` | All requests via `VITE_API_URL` |

**Watermark flow:** Creator uploads preview → Flask `/watermark` → `previewImageUrl` + `watermarkedImagePath` → **Protected** badge only when watermarked. Purchased asset has no watermark.

**Notification flow:** Domain events → Redis Pub/Sub + Stream → persist inbox → SSE (with Last-Event-ID replay) → Navbar bell. No HTTP polling.

**Security:** Gateway JWT pre-check (public catalog/auth/SSE whitelist) + per-service RBAC. Shared `JWT_SECRET`.

**Checkout flow:** Cart → `/checkout` → pick **Xendit** (SEA/local) or **Stripe** (international) → redirect to provider → return to `/orders?paid=1` → confirm with provider API → Library on **PAID**. Unpaid orders can **Complete payment** or **Cancel** from My Orders.

**Payment providers:** Stripe (USD catalog charge) and Xendit (IDR via `USD_TO_IDR`). Webhooks: `POST /api/transactions/webhooks/stripe` and `/xendit`. Local dev often needs `POST /checkout/:orderId/confirm` when webhooks cannot reach localhost.

**Rate limiting:** Gateway skips SSE. Dev default **`RATE_LIMIT_MAX_REQUESTS=0`** (disabled) in `services/api-gateway/.env.example`.

**Observability:** `npm run dev:obs` → Prometheus :9090, Grafana :3005 (`admin`/`admin`), Alertmanager :9093, Loki. Runbook: [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Quick start

1. **Copy environment file**
   ```bash
   cp .env.example .env
   ```

2. **Start everything**
   ```bash
   npm run dev
   ```
   This already runs `--build` (rebuilds images if needed), then starts all containers. No extra flag required. The terminal stays open and shows logs — that is normal.

   **Or run in background** (terminal returns immediately):
   ```bash
   npm run dev:detached
   ```

3. **Wait for first startup**  
   The first run installs npm packages inside containers. This can take **5–15 minutes**. Later starts are much faster.

4. **Open the app**
   - Website: http://localhost:5173
   - API health: http://localhost:3000/health/ready
   - **Redis UI:** http://localhost:8081 (not `6379` — that port is Redis protocol, not HTTP)
   - **Prisma Studio (auth):** http://localhost:5555
   - **Prisma Studio (orders/payments):** http://localhost:5556
   - Metrics: http://localhost:3000/metrics
   - Mailpit: http://localhost:8025
   - Consul UI: http://localhost:8500
   - Observability: `npm run dev:obs` → Grafana http://localhost:3005
   - Admin seed (after `npm run prisma:seed` in auth-service): `admin@vividcraft.local` / `AdminPass123!`
   - Stripe (optional): set keys in root `.env` (see `.env.example`)
   - Xendit (optional): set `XENDIT_SECRET_KEY` + `XENDIT_WEBHOOK_TOKEN` in root `.env`
   - API docs: http://localhost:3000/api/docs
   - Tests: `npm run test:unit` · `npm run test:e2e` (Docker up)
   - Synthetic: `node tests/synthetic/checkout-flow.js`

### Stripe sandbox test

1. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in root `.env` (passed via `docker-compose.yml`).
2. Start the webhook forwarder:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/transactions/webhooks/stripe
   ```
3. Copy the generated `whsec_...` into root `.env` as `STRIPE_WEBHOOK_SECRET`.
4. Recreate transaction-service (required after `.env` changes — `restart` alone does not reload env):
   ```bash
   docker compose up -d transaction-service
   ```
5. Checkout with:
   ```text
   Card: 4242 4242 4242 4242
   Expiry: any future date
   CVC: any 3 digits
   Postal code: any valid value
   ```
6. Verify the order becomes **PAID**, Library delivery appears, the notification arrives, and Mailpit receives the receipt.

### Xendit sandbox test

1. Set `XENDIT_SECRET_KEY` and `XENDIT_WEBHOOK_TOKEN` in root `.env`.
2. Recreate: `docker compose up -d transaction-service`
3. Checkout with **Xendit** selected → complete payment on Xendit test invoice.
4. Return to `/orders?paid=1` or click **Complete payment** if status is still pending.

## Useful commands

### npm scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Build images + start all services (foreground, shows logs). Same as `docker compose up --build`. |
| `npm run dev:detached` | Build images + start all services in background. Same as `docker compose up --build -d`. |
| `npm run dev:obs` | App + Prometheus/Grafana/Loki/Alertmanager (detached) |
| `npm run dev:obs:down` | Tear down app + observability overlay |
| `npm run dev:down` | Stop all containers |
| `npm run dev:logs` | Follow logs (use after detached start) |
| `npm run dev:clean` | Stop and remove volumes (fresh database) |
| `npm run test:unit` | Gateway JWT + Redis scan + web-client Vitest |
| `npm run test:e2e` | Playwright smoke (requires Docker stack) |
| `npm run test` | Unit + E2E |

Agent testing guide: [.cursor/skills/automation-testing/SKILL.md](.cursor/skills/automation-testing/SKILL.md)

### Docker CLI

Run these from the project root when you change code, dependencies, or need to debug a specific service.

| Command | When to use |
|---------|-------------|
| `docker compose ps` | Check which containers are running or restarting |
| `docker compose logs -f` | Follow logs for all services |
| `docker compose logs -f auth-service` | Follow logs for one service (swap service name) |
| `docker compose restart api-gateway` | After changing API gateway routing |
| `docker compose restart auth-service transaction-service` | After changing Prisma/auth/transaction code |
| `docker compose restart web-client marketplace-service image-processor` | After frontend, marketplace, or Flask watermark changes |
| `docker compose up -d --build web-client` | Rebuild and restart one service (swap name) |
| `docker compose up -d --build` | Rebuild and restart all services |
| `docker compose down` | Stop all containers (same as `npm run dev:down`) |
| `docker compose down -v` | Stop and wipe database volumes (fresh start) |

**Common restart combos:**

```bash
# Frontend + marketplace + image watermark pipeline
docker compose restart web-client marketplace-service image-processor

# All backend APIs
docker compose restart api-gateway auth-service marketplace-service transaction-service image-processor

# Full rebuild after package.json or Dockerfile changes
docker compose up -d --build
```

**Check a single service:**

```bash
docker compose logs web-client --tail 50
docker compose logs image-processor --tail 50
docker compose logs marketplace-service --tail 50
```

## How to use the app

1. Open http://localhost:5173
2. **Register** — choose Fan (buyer) or Creator (seller)
3. **Creators** — go to Creator Dashboard and publish a listing
4. **Fans** — browse marketplace, add items to cart, go to **Checkout**, pay via Xendit or Stripe

## My Orders

- Table view with filters: **All · Awaiting payment · Paid · Cancelled · Refunded**
- Pagination: 10 orders per page
- Expand row / **Details** for line items, qty, invoice, and payment actions

## API examples

Register:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Jane\",\"email\":\"jane@example.com\",\"password\":\"password123\",\"role\":\"FAN\"}"
```

Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"jane@example.com\",\"password\":\"password123\"}"
```

List products:
```bash
curl http://localhost:3000/api/marketplace/products
```

## Project structure

```
├── apps/web-client/          # React frontend
├── services/
│   ├── api-gateway/        # Single entry point for all APIs
│   ├── auth-service/         # Login, register, JWT
│   ├── marketplace-service/  # Products, categories, tags
│   ├── transaction-service/  # Checkout & payments
│   └── image-processor/      # Watermark on preview images
├── docker-compose.yml        # Runs everything together
└── .env.example              # Environment variables template
```

## Troubleshooting

### Terminal never "finishes"
Normal. `npm run dev` keeps running like a server. Press `Ctrl+C` to stop, or use `npm run dev:detached`.

### `502 Upstream service unavailable`
Auth or another service is still starting or crashed. Wait a few minutes, then check:
```bash
docker compose ps
docker compose logs auth-service
```

### Services keep restarting
Usually happens on first run while `npm install` is still running. Wait 5–15 minutes.

If it keeps failing, reset and try again:
```bash
npm run dev:down
npm run dev:clean
npm run dev
```

### Windows: shell script errors (`$'\r': command not found`)
Entrypoint scripts must use Unix line endings (LF). A `.gitattributes` file is included to prevent this. If you still see it, re-clone or run:
```powershell
Get-ChildItem -Recurse -Filter "*.sh" | ForEach-Object {
  $c = [IO.File]::ReadAllText($_.FullName) -replace "`r`n", "`n"
  [IO.File]::WriteAllText($_.FullName, $c)
}
```

### `429 Too many requests`
Gateway rate limit hit (common during heavy dev refresh). Fix:
```bash
docker compose up -d api-gateway
```
Dev default disables limiting: `RATE_LIMIT_MAX_REQUESTS=0` in `services/api-gateway/.env.example`.

### Broken product images on marketplace
API Gateway Helmet was blocking cross-origin images (`localhost:5173` → `localhost:3000`). Fixed via `crossOriginResourcePolicy: cross-origin`. If images still break after a code change:
```bash
docker compose restart api-gateway
```
Hard-refresh the browser (`Ctrl+Shift+R`).

### `Cannot GET /` on Redis or a service port

| URL | Expected |
|-----|----------|
| `localhost:6379` | **Not a browser URL** — Redis binary protocol only. Use http://localhost:8081 |
| `localhost:3001`–`3003` | NestJS APIs — no `/` route. Use `/health/ready` or Prisma Studio above |
| `localhost:5555` / `5556` | Prisma Studio table browser |

Start dev UIs: `docker compose up -d redis-commander prisma-studio-auth prisma-studio-transaction`

### MongoDB / Postgres log spam in terminal
Harmless. Docker health checks ping the databases every few seconds.

## Development notes

- Source code is mounted into containers — edits reload automatically (hot reload).
- Prisma services run `db push` and `generate` on startup so the database stays in sync (includes `notifications` table in transaction-service).
- Auth API routes through the gateway as `/api/auth/*` (e.g. `/api/auth/register`, `/api/auth/login`).
- `auth-service/tsconfig.json` compiles `src/` only; `prisma/seed.ts` runs via `npm run prisma:seed`, not Nest build.
