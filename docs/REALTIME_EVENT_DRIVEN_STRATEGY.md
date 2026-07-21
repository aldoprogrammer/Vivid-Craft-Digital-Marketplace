# Real-Time & Event-Driven Strategy

**Decision:** SSE-only for live UX. No HTTP polling.

**Current state (2026-07-17):** ✅ Pub/Sub + Redis Stream, SSE with replay, persisted inbox, live favorite counts, event idempotency, correlation IDs, payment DLQ.

---

## Architecture

```
checkout / favorites / reviews
        │ publish (PUBLISH + XADD stream)
        ▼
 Redis  vividcraft:events  +  vividcraft:events:stream
        │
        ├─ Pub/Sub → notifications SSE (low latency)
        └─ Stream consumer group → same handler (durability)
                │
                ├─ persist Notification (dedupe eventId)
                └─ emit SSE only if created
```

---

## Event catalog

| Event | Persist inbox? | Notes |
|-------|----------------|-------|
| `order.created` | ✅ | Buyer |
| `order.status_changed` | ✅ | Buyer |
| `product.favorited` | ✅ | Creator |
| `product.favorite_count_changed` | ❌ | Broadcast all SSE clients |
| `review.created` / `review.replied` | ✅ | Seller / author |

Envelope includes optional `correlationId`.

---

## SSE contract

- Headers: `text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`
- Body: `retry: 3000`, `id: <eventId>`, heartbeat every 30s
- Replay: `Last-Event-ID` → persisted notifications after that id
- Gateway: rate-limit **skip** stream; `proxyTimeout: 0`
- FE: EventSource; on reconnect invalidate queries; refresh token then recreate stream

---

## Idempotency & DLQ

- Redis `SET event:{id} NX EX` + DB unique `eventId` / Stripe event id / ProcessedEvent
- Payment jobs: `jobId = payment-{orderId}`; conditional PAID/FAILED updates
- Terminal BullMQ failures → `payment-processing-dlq`; ADMIN `POST /payments/dlq/:jobId/replay`

---

## Cache invalidation

Marketplace Redis uses **SCAN** + `UNLINK` (not blocking `KEYS`).

---

## Non-goals

- ❌ HTTP polling
- ❌ WebSocket
- ❌ Polling as SSE fallback

## Hardening backlog — shipped

- [x] Idempotent event handlers
- [x] BullMQ DLQ
- [x] correlationId checkout → payment → SSE
- [x] KEYS → SCAN
