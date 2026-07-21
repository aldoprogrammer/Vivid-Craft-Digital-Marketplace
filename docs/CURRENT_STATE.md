# Current Platform State

**Last updated:** 2026-07-21 (dual payment, checkout page, orders UI, automated tests)

---

## Live today

### Infrastructure
- Docker Compose app stack + optional `docker-compose.observability.yml` (`npm run dev:obs`)
- Gateway JWT pre-validation + correlation IDs + Prometheus metrics
- Consul registration against `/health/ready`
- Per-service `/health/live`, `/health/ready` (503 on dependency failure)

### Data stores

| Store | Purpose |
|-------|---------|
| PostgreSQL | Users, orders, payments, reviews, notifications, Stripe webhook ids, processed events |
| MongoDB | Products, categories, tags |
| Redis | Cache (SCAN invalidate), BullMQ, Pub/Sub, event stream |
| Elasticsearch | Full-text search |
| Consul | Service registry |
| Mailpit | SMTP capture + Alertmanager emails |

### Real-time

| Mechanism | Status |
|-----------|--------|
| SSE + heartbeat | ✅ |
| Redis Pub/Sub + Stream durability | ✅ |
| Notification inbox | ✅ |
| Last-Event-ID replay | ✅ |
| Live favorite counts | ✅ |
| Event idempotency | ✅ |
| HTTP polling | ❌ Removed |

### Auth & security

| Capability | Status |
|------------|--------|
| JWT + refresh FE | ✅ |
| Gateway JWT whitelist | ✅ |
| Per-service RBAC | ✅ |
| FE 403 toast | ✅ |
| Admin seed / dashboard | ✅ |

### Payments & delivery

| Flow | Status |
|------|--------|
| Dedicated `/checkout` page (Xendit / Stripe picker) | ✅ |
| Stripe Checkout + webhook idempotency | ✅ |
| Xendit invoices + webhook | ✅ |
| `POST /checkout/:orderId/confirm` (local return sync) | ✅ |
| `POST /checkout/:orderId/resume` (re-open provider URL) | ✅ |
| `POST /checkout/:orderId/abandon` (cancel unpaid) | ✅ |
| Simulated BullMQ payment (no provider keys) | ✅ |
| Payment DLQ + ADMIN replay | ✅ |
| Library asset / license download | ✅ |
| Mailpit receipt | ✅ |
| Owned products = **PAID only** (PENDING not owned) | ✅ |

### Frontend — orders

| Feature | Status |
|---------|--------|
| Table layout | ✅ |
| Status filters (All / Awaiting / Paid / Cancelled / Refunded) | ✅ |
| Pagination (10 per page) | ✅ |
| Expandable row details (items, qty, invoice) | ✅ |

### Testing

| Layer | Command |
|-------|---------|
| Gateway JWT unit | `npm run test:gateway` |
| Redis SCAN unit | `npm run test:scan` |
| Web-client Vitest (`orders`, `money`) | `npm run test:web` |
| Playwright E2E smoke | `npm run test:e2e` |
| All unit | `npm run test:unit` |
| Agent skill | `.cursor/skills/automation-testing/SKILL.md` |

### Observability

| Tool | Port |
|------|------|
| Prometheus | 9090 |
| Grafana | 3005 |
| Alertmanager | 9093 |
| Loki | 3100 |

### Preview vs purchase

| Asset | Watermark |
|-------|-----------|
| Preview | ✅ Flask watermark → `watermarkedImagePath` → **Protected** badge |
| Purchased asset | ❌ Original |

---

## Optional env (root `.env` → docker-compose)

| Env | Purpose |
|-----|---------|
| `JWT_SECRET` | Shared gateway + services (required in production) |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | Stripe sandbox |
| `XENDIT_SECRET_KEY` + `XENDIT_WEBHOOK_TOKEN` | Xendit sandbox |
| `USD_TO_IDR` | FX for Xendit IDR charges (default 16000) |
| `RATE_LIMIT_MAX_REQUESTS` | Gateway limit (`0` = disabled in dev) |

After changing payment env vars, run `docker compose up -d transaction-service` (not `restart` alone).

Stripe test card `4242 4242 4242 4242` — see [README.md](../README.md) and [RUNBOOK.md](./RUNBOOK.md).

---

## Quick commands

```bash
npm run dev
npm run dev:obs
npm run test:unit
npm run test:e2e
curl http://localhost:3000/health/ready
curl http://localhost:3000/metrics
node tests/synthetic/checkout-flow.js
# k6 run tests/load/marketplace-browse.js
```

## Reading order

1. [FEATURE_IMPLEMENTATION_AUDIT.md](./FEATURE_IMPLEMENTATION_AUDIT.md)
2. [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md)
3. [RBAC.md](./RBAC.md) · [SLA.md](./SLA.md) · [REALTIME_EVENT_DRIVEN_STRATEGY.md](./REALTIME_EVENT_DRIVEN_STRATEGY.md) · [RUNBOOK.md](./RUNBOOK.md)
