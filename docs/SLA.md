# SLA — Service Level Objectives

Targets for availability, latency, and reliability.

**Environment tiers:** `dev` (local Docker) · `staging` · `production`

*Local Compose is best-effort — targets below are for staging/production planning. Observability stack is available via `npm run dev:obs`.*

---

## Service availability (monthly) — production targets

| Service | Target uptime | Max downtime/month |
|---------|---------------|-------------------|
| API Gateway | 99.9% | ~43 min |
| Auth service | 99.9% | ~43 min |
| Marketplace service | 99.5% | ~3.6 h |
| Transaction service | 99.9% | ~43 min |
| Image processor | 99.0% | ~7.2 h |
| Redis / PostgreSQL | 99.9% | ~43 min |
| MongoDB | 99.5% | ~3.6 h |

---

## API latency (P95) — targets

| Endpoint class | P95 target | Notes |
|----------------|------------|-------|
| `GET /api/marketplace/products` (cached) | < 100 ms | Redis hit |
| `GET /api/marketplace/products` (miss / cold) | < 400 ms | Mongo / ES |
| `POST /api/auth/login` | < 300 ms | bcrypt |
| `POST /api/transactions/checkout` | < 500 ms | Sync DB; payment async |
| Order status in UI | < 2 s | SSE (no polling) |

Measure with Prometheus histograms + k6 (`tests/load/marketplace-browse.js`). Store runs in `docs/load-test-results/`.

---

## Async processing

| Job | Target | Status |
|-----|--------|--------|
| Payment job start after checkout | < 5 s | ✅ BullMQ |
| Simulated payment complete | < 3 s | ✅ ~1.5s delay |
| Payment → PAID/FAILED in UI | < 2 s | ✅ SSE + notification inbox |
| Digital delivery ready | < 60 s | ✅ On PAID |
| Failed jobs after 3 attempts | DLQ | ✅ `payment-processing-dlq` |

---

## Data durability (aspirational — backups not automated in local Compose)

| Data | RPO | RTO | Local note |
|------|-----|-----|------------|
| Orders & payments (PostgreSQL) | sync commit | restore from backup | Volumes only in docker-compose |
| Product catalog (MongoDB) | backup | restore | Volumes only |
| Redis cache | ephemeral | rebuild on miss | ✅ SCAN invalidation |
| BullMQ jobs | at-least-once | 3 retries → DLQ | ✅ |

---

## Health model

| Endpoint | Meaning | HTTP |
|----------|---------|------|
| `/health/live` | Process up | 200 |
| `/health/ready` | Required deps OK | 200 or **503** |
| `/health` | Alias of ready | 200 or **503** |

Consul checks use `/health/ready`.

---

## Observability (local)

| Tool | URL | Start |
|------|-----|-------|
| Prometheus | http://localhost:9090 | `npm run dev:obs` |
| Grafana | http://localhost:3005 (admin/admin) | same |
| Alertmanager | http://localhost:9093 | same |
| Loki | via Grafana | same |
| Alert email | Mailpit :8025 | same |

Metrics: `/metrics` on gateway + Nest services + image-processor.

Alert rules: `infra/observability/prometheus/rules/vividcraft-alerts.yml`

---

## Synthetic checks

- Script: `tests/synthetic/checkout-flow.js` (login → products → health)
- Unit: `npm run test:unit` (gateway JWT, Redis scan, Vitest helpers)
- E2E: `npm run test:e2e` (Playwright smoke — marketplace, login, orders auth gate)
- Schedule locally with cron/Task Scheduler; alert after 3 consecutive failures (rule placeholder in Prometheus)

---

## Incident severity

| Severity | Example | Response | See |
|----------|---------|----------|-----|
| SEV-1 | Checkout/gateway down | 15 min | [RUNBOOK.md](./RUNBOOK.md) |
| SEV-2 | Queue stuck, Redis flap | 1 h | RUNBOOK |
| SEV-3 | SSE degraded, watermark | 4 h | RUNBOOK |
| SEV-4 | Cosmetic | Next sprint | — |

---

## Definition of done (SLA MVP) — local

- [x] All services expose `/health/live` + `/health/ready` with dependency checks (503)
- [x] Prometheus metrics + Grafana dashboard provisioned
- [x] Alert rules + Alertmanager → Mailpit
- [x] k6 browse script + load-test-results folder
- [x] Runbook for SEV-1/2
- [x] Stripe sandbox test procedure + test card documented
- [x] Stripe secret key configured locally (reported; value never documented)
- [ ] Stripe webhook secret configured from Stripe CLI
- [ ] Stripe sandbox E2E confirms PAID, delivery, notification, and receipt
- [ ] Production backup/restore drills (not in local scope)
