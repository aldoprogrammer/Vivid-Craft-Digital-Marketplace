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
| P0-1 | Enforce JWT on write APIs | ✅ | [RBAC.md](./RBAC.md) | Unauthenticated `POST /products` returns 401 |
| P0-2 | Checkout uses JWT user, not body `userId` | ✅ | [RBAC.md](./RBAC.md) | Tampered `userId` in body ignored |
| P0-3 | Creator ownership on product update/delete | ✅ | [RBAC.md](./RBAC.md) | 403 when editing another creator's product |

---

## P1 — Real-time & delivery

| # | Feature | Status | Doc | Acceptance criteria |
|---|---------|--------|-----|---------------------|
| P1-1 | Redis Pub/Sub event bus | ✅ | [REALTIME_EVENT_DRIVEN_STRATEGY.md](./REALTIME_EVENT_DRIVEN_STRATEGY.md) | `order.status_changed` published on payment complete |
| P1-2 | SSE notification stream | ✅ | Same | Browser receives event < 2s after status change |
| P1-3 | Remove all order/notification polling | ✅ | Same | Delete `refetchInterval`; zero repeating `/orders` requests; SSE only |
| P1-4 | Digital delivery + download link | ✅ | Same | PAID order shows working download button in Library |
| P1-5 | Real payment gateway (Stripe sandbox) | ✅ | — | When `STRIPE_SECRET_KEY` set, Checkout Session + webhook marks PAID; else simulated fallback |
| P1-6 | Product favorites + seller SSE | ✅ | [FEATURE_IMPLEMENTATION_AUDIT.md](./FEATURE_IMPLEMENTATION_AUDIT.md) §4.9 | FAN favorites listing → creator gets `product.favorited` toast |
| P1-7 | Product reviews + threaded replies + SSE | ✅ | Same §6.9, §7.14 | Owner reviews; seller/buyer reply; `review.created` / `review.replied` push |
| P1-8 | User public profiles + edit | ✅ | Same §3.10–3.11, §7.16–7.17 | Visit `/users/:id`; edit name, bio, avatar, banner, social links |

---

## P2 — Platform quality

| # | Feature | Status | Doc | Acceptance criteria |
|---|---------|--------|-----|---------------------|
| P2-1 | Refresh token flow in frontend | ✅ | — | 401 triggers `/api/auth/refresh`, logout only if refresh fails |
| P2-2 | Block owned products in cart | ✅ | — | Owned products cannot be added; cart auto-prunes owned IDs |
| P2-3 | Service health checks + SLA metrics | ✅ | [SLA.md](./SLA.md) | All services `/health` with dependency checks |
| P2-4 | Admin dashboard | ✅ | [RBAC.md](./RBAC.md) | `/admin` lists users + orders; seed `admin@vividcraft.local` |
| P2-5 | Light / dark theme toggle | ✅ | — | Persisted theme in Navbar; brand tokens via CSS variables |
| P2-6 | My Library page (owned digital goods) | ✅ | — | `/library` lists PAID purchases with download + reviews link |
| P2-7 | Profile feeds (listings, favorites, owned) | ✅ | — | Creator listings with top-seller sort; buyer favorites + owned tabs |
| P2-8 | Notification inbox (unread, mark read, navigate) | ✅ | [REALTIME_EVENT_DRIVEN_STRATEGY.md](./REALTIME_EVENT_DRIVEN_STRATEGY.md) | Bell dropdown; persisted `Notification` rows; SSE refreshes list |
| P2-9 | Live favorite count (SSE + optimistic UI) | ✅ | Same | `product.favorite_count_changed` broadcast; card count updates without refetch |
| P2-10 | Gateway JWT defense-in-depth | ✅ | [RBAC.md](./RBAC.md) | Unauth writes 401 at gateway; public catalog still open |
| P2-11 | Truthful Protected badge | ✅ | Audit §5.3 | Badge only when `watermarkedImagePath` set |
| P2-12 | Event hardening (idempotency, DLQ, correlation, SCAN, SSE replay) | ✅ | [REALTIME_EVENT_DRIVEN_STRATEGY.md](./REALTIME_EVENT_DRIVEN_STRATEGY.md) | Persist-before-emit; payment DLQ; Last-Event-ID |
| P2-13 | Health ready/live + observability stack | ✅ | [SLA.md](./SLA.md) · [RUNBOOK.md](./RUNBOOK.md) | `/health/ready` 503; Prometheus/Grafana/Loki via `npm run dev:obs` |

---

## P3 — Growth

| # | Feature | Status | Acceptance criteria |
|---|---------|--------|---------------------|
| P3-1 | Creator analytics (sales, views) | ✅ | Dashboard Overview charts from PAID order data |
| P3-2 | Email notifications | ✅ | Mailpit SMTP receipt on PAID (`localhost:8025`) |
| P3-3 | Full-text search (Elasticsearch) | ✅ | ES search with Mongo `$text` fallback |
| P3-4 | Service registry (Consul) | ✅ | Services register; gateway resolves with env fallback |
| P3-5 | Full asset download (zip/file) | ✅ | Creator uploads asset; Library streams file when present |

---

## Explicitly pending (external / prod-only)

| Item | Why pending |
|------|-------------|
| Stripe sandbox E2E | Secret key configured; still needs Stripe CLI `whsec_...` and full PAID/delivery verification |
| Automated DB backups / RPO drills | Production ops — not in local Compose |

---

## Already shipped (baseline)

All P0–P3 roadmap items above are implemented for local/sandbox. See audit doc for evidence.

---

## Suggested sprint plan

### Sprint 1–6 — ✅ Done
- Security, real-time, delivery, profiles, admin, assets, Stripe/Mailpit, ES, Consul
- Gateway JWT, event hardening, observability, synthetic/k6 scripts

---

## How to mark a roadmap item complete

1. All acceptance criteria pass manually
2. Update status in this file: 📋 → ✅
3. Update [FEATURE_IMPLEMENTATION_AUDIT.md](./FEATURE_IMPLEMENTATION_AUDIT.md)
4. Update [CURRENT_STATE.md](./CURRENT_STATE.md) if platform capabilities changed
