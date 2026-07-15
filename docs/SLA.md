# SLA — Service Level Objectives

Targets for availability, latency, and reliability. Use for monitoring setup and release gates.

**Environment tiers:** `dev` (local Docker) · `staging` · `production`

---

## Service availability (monthly)

| Service | Target uptime | Max downtime/month |
|---------|---------------|-------------------|
| API Gateway | 99.9% | ~43 min |
| Auth service | 99.9% | ~43 min |
| Marketplace service | 99.5% | ~3.6 h |
| Transaction service | 99.9% | ~43 min |
| Image processor | 99.0% | ~7.2 h |
| Redis | 99.9% | ~43 min |
| PostgreSQL | 99.9% | ~43 min |
| MongoDB | 99.5% | ~3.6 h |

*Dev/local: best-effort — no SLA.*

---

## API latency (P95)

| Endpoint class | P95 target | Notes |
|----------------|------------|-------|
| `GET /api/marketplace/products` (cached) | < 100 ms | Redis hit |
| `GET /api/marketplace/products` (miss) | < 400 ms | MongoDB query |
| `POST /api/auth/login` | < 300 ms | bcrypt cost factor 12 |
| `POST /api/transactions/checkout` | < 500 ms | Sync DB only; payment async |
| `POST /api/marketplace/products/:id/watermark` | < 5 s | Image size dependent |
| Order status visible to user | < 2 s | SSE only (no polling) |

---

## Async processing SLA

| Job | Target | Current |
|-----|--------|---------|
| Payment job start after checkout | < 5 s | ✅ ~immediate |
| Payment simulation complete | < 3 s | ✅ 1.5s default delay |
| Payment → PAID/FAILED in UI | < 2 s | ❌ Needs SSE (no polling) |
| Digital delivery link ready | < 60 s | ❌ Not built |

---

## Data durability

| Data | RPO | RTO |
|------|-----|-----|
| Orders & payments (PostgreSQL) | 0 (sync commit) | < 1 h restore from backup |
| Product catalog (MongoDB) | < 24 h backup | < 4 h |
| Redis cache | Ephemeral — OK to lose | Rebuild on miss |
| BullMQ jobs | At-least-once | Retry 3x, then DLQ |

---

## Error budget & alerts (production)

| Signal | Warning | Critical |
|--------|---------|----------|
| Gateway 5xx rate | > 1% / 5 min | > 5% / 5 min |
| Checkout 409 rate | > 10% / 15 min | Investigate duplicate logic |
| Payment job failure rate | > 2% / 1 h | > 10% / 1 h |
| Redis unavailable | — | Any auth/cache/queue failure |
| SSE disconnect rate | > 20% / 5 min | Hub crash |

---

## Execute plan — observability

### Phase 1 — Health endpoints (partially done)

- [x] Gateway `/health`
- [x] Image processor `/health`
- [ ] Auth `/health`
- [ ] Marketplace `/health` (+ Redis ping)
- [ ] Transaction `/health` (+ Redis + DB)

### Phase 2 — Metrics

- [ ] Prometheus exporters or OpenTelemetry SDK per Nest service
- [ ] Track: request duration histogram, queue depth, cache hit ratio
- [ ] Grafana dashboard: `vividcraft-overview`

### Phase 3 — Logging

- [ ] JSON structured logs with `requestId`, `userId`, `orderId`
- [ ] Centralize via Docker logging driver or Loki

### Phase 4 — Synthetic checks

- [ ] Cron: login → list products → checkout test user every 5 min
- [ ] Alert if synthetic fails 3 times consecutively

### Phase 5 — Load testing

- [ ] k6 script: 100 VUs browse marketplace for 5 min
- [ ] Verify P95 < 400 ms on cached catalog
- [ ] Document results in `docs/load-test-results/`

---

## Incident severity

| Severity | Example | Response time | Resolution target |
|----------|---------|---------------|-------------------|
| SEV-1 | Checkout down, data loss | 15 min | 4 h |
| SEV-2 | Marketplace slow, payment queue stuck | 1 h | 8 h |
| SEV-3 | Watermark failures, SSE degraded | 4 h | 24 h |
| SEV-4 | Cosmetic UI, non-critical logs | Next sprint | — |

---

## Definition of done (SLA MVP)

- [ ] All services expose `/health` with dependency checks
- [ ] P95 latency measured for checkout and product list
- [ ] Alert rules documented and tested
- [ ] Runbook link in README for SEV-1/2
