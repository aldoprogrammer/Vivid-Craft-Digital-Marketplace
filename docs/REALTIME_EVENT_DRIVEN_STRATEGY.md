# Real-Time & Event-Driven Strategy

Execution plan to make VividCraft feel alive: order updates, creator notifications, and cross-service reactions without tight coupling.

**Decision:** Real-time UX is **SSE-only**. No HTTP polling for order status, notifications, or similar live updates (polling is costly at scale and is not part of the target design).

**Current state:** BullMQ for payment jobs only. No Pub/Sub. No SSE. Orders page still uses a temporary `refetchInterval: 5000` — **must be removed** when SSE ships.

---

## Goals

1. Push order/payment status to the browser via SSE only (remove all live polling)
2. Decouple services via domain events (checkout → notify → analytics → delivery)
3. Keep Redis as the shared event backbone (already in stack)
4. On SSE disconnect: reconnect with exponential backoff — **never** start an interval poller. Optional one-shot `GET` after reconnect for catch-up is OK (not polling).

---

## Target architecture

```
┌─────────────┐     checkout      ┌────────────────────┐
│ transaction │ ─── BullMQ job ──▶│ payment.processor  │
│   service   │                   └─────────┬──────────┘
└──────┬──────┘                             │ publish
       │ publish                            ▼
       │                           ┌─────────────────┐
       └──────────────────────────▶│  Redis Pub/Sub   │
                                   │  channel: events │
                                   └────────┬────────┘
                                            │ subscribe
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
            ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
            │ notification │        │  marketplace │        │   delivery   │
            │   service    │        │   (optional) │        │    worker    │
            │  SSE hub     │        │ cache inval. │        │  BullMQ queue│
            └──────┬───────┘        └──────────────┘        └──────────────┘
                   │ SSE
                   ▼
            ┌──────────────┐
            │  web-client  │
            │ EventSource  │
            └──────────────┘
```

---

## Event catalog (v1)

| Event | Publisher | Subscribers | Payload |
|-------|-----------|-------------|---------|
| `order.created` | transaction-service | notification-service | `{ orderId, userId, invoiceNo, total }` |
| `order.status_changed` | payment.processor | notification-service, marketplace (optional) | `{ orderId, userId, status, previousStatus }` |
| `payment.completed` | payment.processor | delivery-worker, notification-service | `{ orderId, userId, items[] }` |
| `payment.failed` | payment.processor | notification-service | `{ orderId, userId, reason }` |
| `product.published` | marketplace-service | notification-service (followers, later) | `{ productId, creatorId }` |

Envelope format:

```json
{
  "id": "uuid",
  "type": "order.status_changed",
  "occurredAt": "2026-07-15T10:00:00Z",
  "data": { }
}
```

---

## Phase 1 — Redis Pub/Sub library (shared)

### Tasks

- [ ] Create `packages/event-bus` or `services/shared-events` module
- [ ] `EventPublisher.publish(channel, envelope)` using `ioredis` duplicate connection
- [ ] `EventSubscriber.subscribe(channel, handler)` with reconnect
- [ ] Channel name: `vividcraft:events`
- [ ] Unit test: publish → subscriber receives

### Files to add

```
services/transaction-service/src/events/
  event-publisher.service.ts
  events.module.ts
```

### Acceptance criteria

- Payment processor publishes `order.status_changed` after DB update
- Log subscriber in marketplace-service receives event

---

## Phase 2 — Notification service + SSE

### New service: `notification-service` (NestJS)

| Endpoint | Purpose |
|----------|---------|
| `GET /notifications/stream` | SSE per user (query `userId` or JWT) |
| `GET /notifications` | Recent in-app notifications (Mongo or Redis list) |

### SSE implementation sketch

```typescript
@Sse('stream')
stream(@CurrentUser() user: JwtPayload): Observable<MessageEvent> {
  return this.sseService.connect(user.sub);
}
```

- On Redis event where `data.userId === subscriber`, push to open SSE connection
- Connection map: `Map<userId, Set<Response>>`
- Heartbeat every 30s (`: ping\n\n`)

### Gateway route

```
GET /api/notifications/stream  →  notification-service
```

Disable buffering on proxy for SSE (`X-Accel-Buffering: no`).

### Frontend

- [ ] Delete `refetchInterval` from `useOrders` (no polling, ever)
- [ ] `useSseNotifications(userId)` hook with `EventSource` + reconnect backoff
- [ ] On `order.status_changed` / `payment.*`: patch React Query cache or invalidate once
- [ ] Toast on `payment.completed` / `payment.failed`
- [ ] Initial orders load: **one** `GET /orders` on mount only — then SSE owns all updates

### Acceptance criteria

- Checkout → Orders page updates within 1s without refresh
- Network tab shows **zero** repeating `/orders` requests
- SSE reconnects after tab sleep / network blip without enabling polling

---

## Phase 3 — Digital delivery queue (BullMQ)

Separate queue from payment — triggered by `payment.completed` event.

| Queue | Job | Worker action |
|-------|-----|---------------|
| `digital-delivery` | `{ orderId, productId }` | Generate signed download URL, store in DB, emit `delivery.ready` |

### Tasks

- [ ] Add `DownloadGrant` model in transaction-service Prisma
- [ ] `DeliveryProcessor` worker
- [ ] `GET /downloads/:token` endpoint (time-limited signed URL)
- [ ] FE: "Download" button on PAID orders

---

## Phase 4 — Hardening

- [ ] Idempotent event handlers (store `event.id` in Redis `SET` with TTL)
- [ ] Dead-letter queue for failed BullMQ jobs
- [ ] Rate limit SSE connections per IP/user
- [ ] Structured logging with `correlationId` from checkout → payment → SSE

---

## Redis connection budget

| Service | Connections |
|---------|-------------|
| marketplace cache | 1 |
| transaction BullMQ | 2 (worker + queue) |
| event publisher | 1 |
| event subscriber | 1 |
| notification SSE | 1–2 |

Use connection pooling; avoid `KEYS` in production (already a concern in cache invalidation — migrate to `SCAN` later).

---

## Execute order (recommended)

1. Phase 1 — Pub/Sub from payment processor (1–2 days)
2. Phase 2 — SSE + FE hook (2–3 days)
3. Phase 3 — Delivery queue (2–3 days)
4. Phase 4 — Hardening (ongoing)

---

## Non-goals (explicitly rejected)

- ❌ HTTP polling / `refetchInterval` for orders or notifications
- ❌ WebSocket (SSE is enough for server→client push)
- ❌ Polling as SSE fallback

## Definition of done (real-time MVP)

- [ ] `refetchInterval` removed from codebase for orders/notifications
- [ ] All live updates arrive only via SSE
- [ ] `order.status_changed` visible in browser < 2s P95
- [ ] Pub/Sub events logged with correlation ID
- [ ] FEATURE_IMPLEMENTATION_AUDIT rows 2.5–2.7, 7.11 marked ✅
