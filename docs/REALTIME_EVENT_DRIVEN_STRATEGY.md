# Real-Time & Event-Driven Strategy

Execution plan for live UX: order updates, creator notifications, favorite counts, and cross-service reactions without tight coupling.

**Decision:** Real-time UX is **SSE-only**. No HTTP polling for order status, notifications, or similar live updates.

**Current state (2026-07-16):** ✅ Shipped — Redis Pub/Sub, SSE stream, persisted notification inbox, live favorite counts. Orders page has no `refetchInterval`.

---

## Goals

1. Push order/payment status to the browser via SSE only (no live polling)
2. Decouple services via domain events (checkout → notify → analytics → delivery)
3. Keep Redis as the shared event backbone (already in stack)
4. On SSE disconnect: browser `EventSource` auto-reconnects — gateway must **not** rate-limit the stream path

---

## Architecture (as built)

```
┌─────────────┐     checkout      ┌────────────────────┐
│ transaction │ ─── BullMQ job ──▶│ payment.processor  │
│   service   │                   └─────────┬──────────┘
└──────┬──────┘                             │ publish
       │ publish                            ▼
       │                           ┌─────────────────┐
       └──────────────────────────▶│  Redis Pub/Sub   │
                                   │  vividcraft:events│
                                   └────────┬────────┘
                                            │ subscribe
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
            ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
            │ transaction  │        │ marketplace  │        │  web-client  │
            │ notifications│        │ (favorites)  │        │ EventSource  │
            │ SSE + persist│        │ publish evt  │        │ + React Query│
            └──────┬───────┘        └──────────────┘        └──────────────┘
                   │ SSE
                   ▼
            ┌──────────────┐
            │ API Gateway  │  skip rate-limit on /notifications/stream
            └──────────────┘
```

---

## Event catalog (v1 — implemented)

| Event | Publisher | Subscribers / effect | Payload highlights |
|-------|-----------|----------------------|-------------------|
| `order.created` | transaction-service | SSE + notification row | `userId`, `orderId`, `invoiceNo` |
| `order.status_changed` | payment processor | SSE + notification row | `userId`, `status`, `invoiceNo` |
| `product.favorited` | marketplace-service | SSE + notification row (creator) | `userId` (creator), `productId`, `buyerEmail` |
| `product.favorite_count_changed` | marketplace-service | SSE broadcast to **all** connected clients | `productId`, `favoriteCount` — no DB row |
| `review.created` | transaction-service | SSE + notification row (seller) | `productId`, `reviewerName`, `rating` |
| `review.replied` | transaction-service | SSE + notification row (review author) | `productId`, `replierName` |

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

## Notification inbox (persisted)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/transactions/notifications/stream?token=` | SSE (JWT in query for EventSource) |
| `GET /api/transactions/notifications` | List + unread count |
| `PATCH /api/transactions/notifications/:id/read` | Mark one read |
| `PATCH /api/transactions/notifications/read-all` | Mark all read |

- Rows stored in PostgreSQL `notifications` table (transaction-service)
- Deduped by `eventId`
- Frontend: `NotificationDropdown.tsx` — badge, list, click-through (`linkPath`)

---

## Frontend hooks

| Hook / component | Role |
|------------------|------|
| `useSseNotifications` | EventSource; invalidates orders, notifications; patches favorite counts |
| `useNotifications` | REST list (no polling interval) |
| `useToggleFavorite` | Optimistic `favoriteCount` cache patch on success |

---

## Gateway SSE requirements

Implemented in `services/api-gateway/src/index.ts`:

- `skip` rate limit for paths containing `/notifications/stream`
- `proxyTimeout: 0`, `timeout: 0` on transaction proxy
- `x-accel-buffering: no` on stream responses
- No `compression()` middleware (would buffer SSE)

Transaction-service sends heartbeat `: heartbeat\n\n` every 30s.

---

## Non-goals (explicitly rejected)

- ❌ HTTP polling / `refetchInterval` for orders or notifications
- ❌ WebSocket (SSE is enough for server→client push)
- ❌ Polling as SSE fallback

## Definition of done (real-time MVP) — ✅

- [x] `refetchInterval` removed from codebase for orders/notifications
- [x] Live updates via SSE (+ one-shot REST for notification list on open / after event)
- [x] `order.status_changed` visible in browser without manual refresh
- [x] Favorite count updates via `product.favorite_count_changed`
- [x] FEATURE_IMPLEMENTATION_AUDIT rows 2.5–2.9, 7.11, 7.21–7.22 marked ✅

---

## Future hardening (optional)

- [ ] Idempotent event handlers (store `event.id` in Redis `SET` with TTL)
- [ ] Dead-letter queue for failed BullMQ jobs
- [ ] Structured logging with `correlationId` from checkout → payment → SSE
- [ ] Migrate cache invalidation from `KEYS` to `SCAN`

Related: [FEATURE_IMPLEMENTATION_AUDIT.md](./FEATURE_IMPLEMENTATION_AUDIT.md) · [CURRENT_STATE.md](./CURRENT_STATE.md)
