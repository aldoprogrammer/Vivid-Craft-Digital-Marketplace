# Current Platform State

**Last updated:** 2026-07-17 (gateway JWT, event hardening, observability)

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
| Simulated BullMQ payment | ✅ |
| Stripe Checkout + webhook idempotency | ✅ Implemented; secret key configured locally |
| Stripe sandbox E2E | ⏳ Needs active CLI webhook secret and full verification |
| Payment DLQ + ADMIN replay | ✅ |
| Library asset / license download | ✅ |
| Mailpit receipt | ✅ |

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

## Optional env

| Env | Purpose |
|-----|---------|
| `JWT_SECRET` | Shared gateway + services (required in production) |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | Stripe sandbox |
| `RATE_LIMIT_MAX_REQUESTS` | Gateway limit (`0` disables) |

Stripe sandbox steps and test card `4242 4242 4242 4242` are documented in the root README and [RUNBOOK.md](./RUNBOOK.md).

---

## Quick commands

```bash
npm run dev
npm run dev:obs
curl http://localhost:3000/health/ready
curl http://localhost:3000/metrics
node tests/synthetic/checkout-flow.js
# k6 run tests/load/marketplace-browse.js
```

## Reading order

1. [FEATURE_IMPLEMENTATION_AUDIT.md](./FEATURE_IMPLEMENTATION_AUDIT.md)
2. [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md)
3. [RBAC.md](./RBAC.md) · [SLA.md](./SLA.md) · [REALTIME_EVENT_DRIVEN_STRATEGY.md](./REALTIME_EVENT_DRIVEN_STRATEGY.md) · [RUNBOOK.md](./RUNBOOK.md)
