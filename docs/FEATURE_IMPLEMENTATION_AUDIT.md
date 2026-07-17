# Feature Implementation Audit

Use this doc to verify whether each planned feature is **real**, **partial**, or **mock**.  
**Last verified:** 2026-07-17

**Legend**

| Symbol | Meaning |
| ------ | ------- |
| ✅ | Fully implemented and wired end-to-end |
| 🟡 | Partially implemented |
| ❌ | Not implemented / placeholder only |
| ⛔ | Out of scope |

---

## Quick summary (as of 2026-07-17)

| Area | Real | Partial | Missing |
| ---- | ---- | ------- | ------- |
| Infrastructure | Compose, Consul, ES, Mailpit, observability overlay | — | Prod backups |
| Auth | JWT, refresh, profiles, admin, **gateway JWT** | — | OAuth (⛔) |
| Marketplace | CRUD, favorites, ES, SCAN cache invalidation | — | — |
| Image processor | Watermark, assets, metrics, ready check | — | — |
| Transactions | Checkout, Stripe optional, DLQ, notifications, reviews | Stripe E2E verification | — |
| Frontend | Full flows + inbox + 403 toast + live favs | — | — |
| Real-time | Pub/Sub + Stream + SSE replay + idempotency | — | — |

---

## 1. Infrastructure & platform

| # | Feature | Status | Evidence | Notes |
|---|---------|--------|----------|-------|
| 1.1 | Docker Compose | ✅ | `docker-compose.yml` | + Mailpit, ES, Consul |
| 1.2 | Hot reload | ✅ | volumes | — |
| 1.3 | API Gateway | ✅ | `api-gateway/src/index.ts` | Consul resolve + JWT + correlation |
| 1.4 | Rate limiting | ✅ | express-rate-limit | SSE skipped; dev 2000 |
| 1.5 | Swagger | ✅ | `/api/docs` | — |
| 1.6 | Consul | ✅ | register + resolve | healthPath `/health/ready` |
| 1.7–1.9 | Postgres / Mongo / Redis | ✅ | compose | — |
| 1.10 | Health live/ready | ✅ | all services | Ready → **503** on dep fail |
| 1.11 | Prometheus metrics | ✅ | `/metrics` | prom-client / prometheus_client |
| 1.12 | Observability stack | ✅ | `docker-compose.observability.yml` | Grafana :3005, Prom :9090 |
| 1.13 | Gateway JWT | ✅ | `middleware/jwt.middleware.ts` | Defense-in-depth |

---

## 2. Redis, queues, pub/sub, SSE

| # | Feature | Status | Evidence | Notes |
|---|---------|--------|----------|-------|
| 2.1–2.2 | Catalog cache | ✅ | redis module | **SCAN** invalidation (not KEYS) |
| 2.3 | BullMQ payments | ✅ | payment.processor | Deterministic jobId |
| 2.4 | Delivery on PAID | ✅ | purchases | — |
| 2.5 | Redis Pub/Sub | ✅ | events.module | + Stream XADD |
| 2.6 | SSE stream | ✅ | notifications | id/retry/Last-Event-ID replay |
| 2.7 | Orders live updates | ✅ | useSseNotifications | No poll |
| 2.8 | Notification inbox | ✅ | Notification model + FE | — |
| 2.9 | Live favorite count | ✅ | favorite_count_changed | — |
| 2.10 | Event idempotency | ✅ | Redis SET NX + eventId unique | Persist-before-emit |
| 2.11 | Payment DLQ | ✅ | payment-processing-dlq | ADMIN replay |
| 2.12 | Correlation IDs | ✅ | x-correlation-id | Gateway → services → events |

---

## 3. Auth & security

| # | Feature | Status | Evidence | Notes |
|---|---------|--------|----------|-------|
| 3.1–3.4 | Auth + refresh FE | ✅ | apiClient | — |
| 3.5 | OAuth | ⛔ | — | Out of scope |
| 3.6–3.7 | RBAC | ✅ | guards | See RBAC.md |
| 3.8 | Gateway JWT | ✅ | jwt.middleware | + service guards |
| 3.9–3.11 | Cart / profiles | ✅ | — | — |
| 3.12 | FE 403 handling | ✅ | apiClient toast | — |

---

## 4. Marketplace

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 4.1–4.13 | CRUD, search, favorites, ADMIN categories | ✅ | watermarkedImagePath in ES docs |

---

## 5. Image processor

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 5.1–5.2 | Watermark + serve | ✅ | Flask `/watermark` |
| 5.3 | Protected badge | ✅ | Only if `watermarkedImagePath` set |
| 5.4–5.6 | Download / profile / assets | ✅ | — |

---

## 6. Transaction service

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 6.1–6.14 | Checkout → notifications | ✅ | Atomic markPaid/Failed |
| 6.15 | Stripe webhook idempotency | ✅ | StripeWebhookEvent table |
| 6.16 | Payment DLQ replay | ✅ | `POST /payments/dlq/:jobId/replay` ADMIN |

---

## 7. Frontend

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 7.1–7.22 | Core + inbox + live favs | ✅ | — |
| 7.23 | SSE reconnect + refresh | ✅ | useSseNotifications |
| 7.24 | Truthful Protected badge | ✅ | watermarkedImagePath |

---

## Audit checklist

```
Sprint: 2026-07-17

[x] Gateway JWT blocks unauth writes; public catalog still open
[x] Protected badge only when watermarkedImagePath present
[x] SCAN cache invalidation
[x] Notification persist-before-SSE; Last-Event-ID replay
[x] Payment DLQ + correlation IDs
[x] /health/ready returns 503 on dep failure
[x] Observability compose + RUNBOOK
[x] Synthetic + k6 scripts present
[x] Stripe sandbox test procedure documented (including `4242 4242 4242 4242`)
[x] `STRIPE_SECRET_KEY` configured locally (reported 2026-07-17; secret not recorded)
[ ] `STRIPE_WEBHOOK_SECRET` configured from active Stripe CLI listener
[ ] Stripe sandbox E2E verified: PAID + Library + notification + Mailpit
[ ] Production backup/restore (out of local scope)
```

Related: [CURRENT_STATE.md](./CURRENT_STATE.md) · [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md) · [RUNBOOK.md](./RUNBOOK.md)
