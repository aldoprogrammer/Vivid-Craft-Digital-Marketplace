# Feature Roadmap

Ordered backlog with acceptance criteria. Check [FEATURE_IMPLEMENTATION_AUDIT.md](./FEATURE_IMPLEMENTATION_AUDIT.md) before marking items done.

---

## Priority legend

| P | Meaning |
|---|---------|
| P0 | Security / broken core flow |
| P1 | High user value, unblocks "alive" platform |
| P2 | Quality & scale |
| P3 | Nice to have |

---

## P0 — Security & correctness

| # | Feature | Status | Doc | Acceptance criteria |
|---|---------|--------|-----|---------------------|
| P0-1 | Enforce JWT on write APIs | 📋 | [RBAC.md](./RBAC.md) | Unauthenticated `POST /products` returns 401 |
| P0-2 | Checkout uses JWT user, not body `userId` | 📋 | [RBAC.md](./RBAC.md) | Tampered `userId` in body ignored |
| P0-3 | Creator ownership on product update/delete | 📋 | [RBAC.md](./RBAC.md) | 403 when editing another creator's product |

---

## P1 — Real-time & delivery

| # | Feature | Status | Doc | Acceptance criteria |
|---|---------|--------|-----|---------------------|
| P1-1 | Redis Pub/Sub event bus | 📋 | [REALTIME_EVENT_DRIVEN_STRATEGY.md](./REALTIME_EVENT_DRIVEN_STRATEGY.md) | `order.status_changed` published on payment complete |
| P1-2 | SSE notification stream | 📋 | Same | Browser receives event < 2s after status change |
| P1-3 | Remove all order/notification polling | 📋 | Same | Delete `refetchInterval`; zero repeating `/orders` requests; SSE only |
| P1-4 | Digital delivery queue + download link | 📋 | Same | PAID order shows working download button |
| P1-5 | Real payment gateway (Stripe sandbox) | 📋 | — | Webhook updates order; no `Math.random` |

---

## P2 — Platform quality

| # | Feature | Status | Doc | Acceptance criteria |
|---|---------|--------|-----|---------------------|
| P2-1 | Refresh token flow in frontend | 📋 | — | 401 triggers refresh, not immediate logout |
| P2-2 | Block owned products in cart | 📋 | — | Cannot add already-owned product |
| P2-3 | Service health checks + SLA metrics | 📋 | [SLA.md](./SLA.md) | All services `/health` with deps |
| P2-4 | Admin dashboard | 📋 | [RBAC.md](./RBAC.md) | ADMIN views users + orders |

---

## P3 — Growth

| # | Feature | Status | Acceptance criteria |
|---|---------|--------|---------------------|
| P3-1 | Creator analytics (sales, views) | 📋 | Dashboard charts from order events |
| P3-2 | Email notifications | 📋 | Payment receipt via SendGrid/Resend |
| P3-3 | Full-text search (Elasticsearch) | 📋 | Sub-second search at 10k products |
| P3-4 | Service registry (Consul) | 📋 | Gateway discovers service URLs dynamically |

---

## Already shipped (baseline)

| Feature | Audit ref |
|---------|-----------|
| Docker microservices stack | §1 |
| Redis catalog cache | §2.1–2.2 |
| BullMQ payment simulation | §2.3, §6.4–6.5 |
| Marketplace CRUD + search | §4 |
| Watermark pipeline | §5 |
| ACID checkout + double-spend guard | §6.1–6.3 |
| Full web-client flows | §7 |

---

## Suggested sprint plan

### Sprint 1 (security)
- P0-1, P0-2, P0-3
- Update audit doc §3

### Sprint 2 (real-time MVP)
- P1-1, P1-2, P1-3
- Update audit doc §2.5–2.7

### Sprint 3 (delivery + payments)
- P1-4, P1-5
- Update audit doc §6.5–6.8

### Sprint 4 (observability)
- P2-3
- SLA health + first Grafana board

---

## How to mark a roadmap item complete

1. All acceptance criteria pass manually
2. Update status in this file: 📋 → ✅
3. Update [FEATURE_IMPLEMENTATION_AUDIT.md](./FEATURE_IMPLEMENTATION_AUDIT.md)
4. Update [CURRENT_STATE.md](./CURRENT_STATE.md) if platform capabilities changed
