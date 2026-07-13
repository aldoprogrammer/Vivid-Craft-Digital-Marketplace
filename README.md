# VividCraft

Digital art & comic marketplace built as microservices. Creators list comics, art, and assets. Fans browse, add to cart, and checkout.

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

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- Node.js 20+ (optional, for local installs outside Docker)

## Feature integration (end-to-end)

| Feature | Backend | Frontend |
|---------|---------|----------|
| Auth (register/login) | `auth-service` | Login, Register pages |
| Product catalog | `marketplace-service` + MongoDB + Redis | Marketplace with search/filter |
| Image watermark | `image-processor` (Flask) → `marketplace-service` | Creator Dashboard image upload |
| Checkout & payments | `transaction-service` + BullMQ | Cart checkout |
| Order history | `transaction-service` | My Orders page |
| API routing | `api-gateway` | All requests via `VITE_API_URL` |

**Watermark flow:** Creator uploads image → marketplace sends to Flask `/watermark` → saved image served at `/api/images/files/{filename}` → displayed on product cards.

## Quick start

1. **Copy environment file**
   ```bash
   cp .env.example .env
   ```

2. **Start everything**
   ```bash
   npm run dev
   ```
   This builds images and starts all containers. The terminal stays open and shows logs — that is normal.

   **Or run in background** (terminal returns immediately):
   ```bash
   npm run dev:detached
   ```

3. **Wait for first startup**  
   The first run installs npm packages inside containers. This can take **5–15 minutes**. Later starts are much faster.

4. **Open the app**
   - Website: http://localhost:5173
   - API health: http://localhost:3000/health
   - API docs: http://localhost:3000/api/docs

## Useful commands

### npm scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Start all services (foreground, shows logs) |
| `npm run dev:detached` | Start all services in background |
| `npm run dev:down` | Stop all containers |
| `npm run dev:logs` | Follow logs (use after detached start) |
| `npm run dev:clean` | Stop and remove volumes (fresh database) |

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
4. **Fans** — browse marketplace, add items to cart, checkout

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

### Broken product images on marketplace
API Gateway Helmet was blocking cross-origin images (`localhost:5173` → `localhost:3000`). Fixed via `crossOriginResourcePolicy: cross-origin`. If images still break after a code change:
```bash
docker compose restart api-gateway
```
Hard-refresh the browser (`Ctrl+Shift+R`).

### MongoDB / Postgres log spam in terminal
Harmless. Docker health checks ping the databases every few seconds.

## Development notes

- Source code is mounted into containers — edits reload automatically (hot reload).
- Prisma services run `db push` and `generate` on startup so the database stays in sync.
- Auth API routes through the gateway as `/api/auth/*` (e.g. `/api/auth/register`, `/api/auth/login`).
