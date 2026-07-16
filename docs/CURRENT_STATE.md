# Current Platform State

Snapshot of what VividCraft runs today vs what is planned next.

**Last updated:** 2026-07-16 (notifications inbox, live favorite counts, gateway rate-limit fix)

---

## Live today

### Infrastructure
- Docker Compose: gateway, auth, marketplace, transaction, image-processor, web-client, postgres, mongo, redis, **mailpit**, **elasticsearch**, **consul**
- API Gateway on port 3000 — routes `/api/auth`, `/api/users`, `/api/marketplace`, `/api/transactions`, `/api/images`
- Consul registration + gateway URL resolution (env fallback if Consul down)
- Per-service `/health` endpoints with dependency checks

### Data stores
| Store | Used by | Purpose |
|-------|---------|---------|
| PostgreSQL | auth-service, transaction-service | Users, profiles, tokens, orders, payments, deliveries, reviews, **notifications** |
| MongoDB | marketplace-service | Products, categories, tags, favorites |
| Redis | marketplace / transaction | Cache, BullMQ, Pub/Sub SSE |
| Elasticsearch | marketplace-service | Full-text product search |
| Consul | all Node services + gateway | Service registry / discovery |
| Mailpit | transaction-service SMTP | Dev email capture (`:8025`) |

### Real-time

| Mechanism | Status | Where |
|-----------|--------|-------|
| SSE | ✅ Live | `/api/transactions/notifications/stream` |
| Redis Pub/Sub | ✅ Live | `vividcraft:events` |
| Notification inbox | ✅ Live | `GET/PATCH /api/transactions/notifications` + Navbar bell |
| Live favorite count | ✅ Live | `product.favorite_count_changed` SSE + optimistic UI |
| HTTP polling | ✅ Removed | — |

### Auth & RBAC

| Capability | Status |
|------------|--------|
| Register / login | ✅ (ADMIN self-register blocked) |
| JWT access + refresh tokens | ✅ API + FE single-flight refresh |
| User profiles | ✅ |
| Admin dashboard | ✅ `/admin` |
| Admin seed | ✅ `admin@vividcraft.local` / `AdminPass123!` |

### Business flows

| Flow | Status |
|------|--------|
| Browse + ES search | ✅ (Mongo fallback) |
| Favorites + reviews + profiles | ✅ |
| Live favorite count on cards | ✅ SSE + cache patch |
| Notification inbox (unread, mark read) | ✅ |
| Block owned in cart | ✅ |
| Checkout | ✅ Simulated by default; Stripe Checkout when keys set |
| Stripe webhook | ✅ `POST /api/transactions/webhooks/stripe` |
| Library asset download | ✅ Asset file when uploaded; else license `.txt` |
| Payment receipt email | ✅ Mailpit |

### Gateway rate limiting

| Setting | Value |
|---------|-------|
| Dev default | 2000 requests / 15 min |
| Prod default | 100 requests / 15 min |
| SSE bypass | `/notifications/stream` not counted |
| Also skipped | `/health`, `/api/docs` |
| Disable entirely | `RATE_LIMIT_MAX_REQUESTS=0` |

SSE uses one long-lived connection — not polling. If you see `429`, restart `api-gateway` after env changes.

### Preview images vs purchased assets

| Asset | Watermark | Who sees it |
|-------|-----------|-------------|
| Preview (`previewImageUrl`) | ✅ Flask `/watermark` — diagonal `VividCraft` text | Everyone on marketplace |
| Purchased file (`assetFileUrl`) | ❌ Original file | Buyer only (Library) |

Product card **“Protected”** badge = UI hint that a preview image is shown, not proof watermark ran.

---

## Optional configuration

| Env | Purpose |
|-----|---------|
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | Enable Stripe sandbox checkout |
| `ELASTICSEARCH_URL` | Already set in compose |
| `CONSUL_HOST` | Already set in compose |
| `SMTP_HOST=mailpit` | Already set in compose |

Without Stripe keys, payments remain simulated via BullMQ.

---

## Quick verification commands

```bash
docker compose ps
curl http://localhost:3000/health
curl http://localhost:9200/_cluster/health
curl http://localhost:8500/v1/catalog/services
# Mailpit UI
open http://localhost:8025
```

---

## Recommended reading order

1. [FEATURE_IMPLEMENTATION_AUDIT.md](./FEATURE_IMPLEMENTATION_AUDIT.md)
2. [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md)
3. [RBAC.md](./RBAC.md) · [SLA.md](./SLA.md) · [REALTIME_EVENT_DRIVEN_STRATEGY.md](./REALTIME_EVENT_DRIVEN_STRATEGY.md)
