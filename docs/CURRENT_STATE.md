# Current Platform State

Snapshot of what VividCraft runs today vs what is planned next.

**Last updated:** 2026-07-15

---

## Live today

### Infrastructure
- Docker Compose: 8 services (gateway, auth, marketplace, transaction, image-processor, web-client, postgres, mongo, redis)
- API Gateway on port 3000 with rate limiting, CORS, Helmet, Swagger UI
- Hot reload for Node and Vite dev containers

### Data stores
| Store | Used by | Purpose |
|-------|---------|---------|
| PostgreSQL | auth-service, transaction-service | Users, tokens, orders, payments, purchase locks |
| MongoDB | marketplace-service | Products, categories, tags |
| Redis | marketplace-service | Response cache (GET products/categories/tags) |
| Redis | transaction-service | BullMQ job backend for `payment-processing` queue |

### Redis — what we use

| Pattern | Status | Where |
|---------|--------|-------|
| Key-value cache (`GET`/`SET`/`SETEX`) | ✅ Live | `marketplace-service/src/redis/redis.module.ts` |
| Cache invalidation (`DEL`, `KEYS` pattern) | ✅ Live | On product/category/tag mutations |
| BullMQ job queue | ✅ Live | `transaction-service` payment worker |
| Redis Pub/Sub | ❌ Not used | — |
| Redis Streams | ❌ Not used | — |

### Message queue — what we use

| Queue | Status | Producer | Consumer |
|-------|--------|----------|----------|
| `payment-processing` | ✅ Live | `checkout.service.ts` after order create | `payment.processor.ts` |
| `digital-delivery` | ❌ Not built | — | — |
| Webhook ingestion | ❌ Not built | — | — |

### Real-time — what we use

| Mechanism | Status | Where |
|-----------|--------|-------|
| SSE (Server-Sent Events) | ❌ Not built — **required** | See realtime strategy |
| Redis Pub/Sub fan-out | ❌ Not built — **required** | Feeds SSE hub |
| WebSocket | ❌ Not planned | SSE only |
| HTTP polling | 🟡 Temporary debt | `refetchInterval: 5000` in `useApi.ts` — **remove when SSE ships** |

**Policy:** No polling for notifications or order status. SSE only.

### Auth & RBAC

| Capability | Status |
|------------|--------|
| Register / login | ✅ |
| JWT access + refresh tokens | ✅ API / 🟡 FE (refresh unused) |
| Roles: CREATOR, FAN, ADMIN | ✅ In DB + JWT |
| `RolesGuard` on routes | 🟡 One admin route only |
| Gateway auth middleware | ❌ |

### Business flows (end-to-end)

| Flow | Status |
|------|--------|
| Browse marketplace | ✅ Real |
| Creator publish + watermark | ✅ Real |
| Cart + checkout | ✅ Real |
| Payment | ❌ Simulated (`Math.random`, delay 1.5s) |
| Order status tracking | 🟡 Real DB; UI still polls (must switch to SSE) |
| Digital download delivery | ❌ Not built |

---

## Not built yet (planning docs ready)

| Topic | Doc |
|-------|-----|
| Pub/Sub, SSE, event bus | [REALTIME_EVENT_DRIVEN_STRATEGY.md](./REALTIME_EVENT_DRIVEN_STRATEGY.md) |
| Full RBAC matrix + enforcement | [RBAC.md](./RBAC.md) |
| SLA targets & monitoring | [SLA.md](./SLA.md) |
| Ordered feature backlog | [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md) |
| Real vs mock audit | [FEATURE_IMPLEMENTATION_AUDIT.md](./FEATURE_IMPLEMENTATION_AUDIT.md) |

---

## Quick verification commands

```bash
# Stack health
docker compose ps

# Redis
docker exec vividcraft-redis redis-cli ping

# Gateway
curl http://localhost:3000/health

# Cache keys (after browsing marketplace)
docker exec vividcraft-redis redis-cli KEYS "products:*"

# Payment worker logs (after checkout)
docker compose logs transaction-service --tail 50
```

---

## Recommended reading order

1. [FEATURE_IMPLEMENTATION_AUDIT.md](./FEATURE_IMPLEMENTATION_AUDIT.md) — check real vs mock
2. [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md) — what to build next
3. Pick a deep-dive doc (RBAC, SLA, or Realtime) and execute its checklist
