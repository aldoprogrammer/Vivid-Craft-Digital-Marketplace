# Feature Implementation Audit

Use this doc to verify whether each planned feature is **real**, **partial**, or **mock**.  
Update the **Last verified** column after each review sprint.

**Legend**


| Symbol | Meaning                                                                 |
| ------ | ----------------------------------------------------------------------- |
| ✅      | Fully implemented and wired end-to-end                                  |
| 🟡     | Partially implemented (works but incomplete or not enforced everywhere) |
| ❌      | Not implemented / placeholder only                                      |
| 📋     | Documented plan only — see linked doc                                   |
| ⛔     | Out of scope — not planned (e.g. OAuth)                                 |


---

## Quick summary (as of 2026-07-16)


| Area            | Real                                                                 | Partial | Mock / Missing |
| --------------- | -------------------------------------------------------------------- | ------- | -------------- |
| Infrastructure  | Docker Compose, health, Consul registry, Elasticsearch, Mailpit       | —       | —              |
| Auth            | JWT, refresh FE flow, profiles, admin seed + dashboard               | —       | Gateway JWT middleware |
| Marketplace     | CRUD, favorites, profile feeds, ES search + Mongo fallback           | —       | —              |
| Image processor | Watermark, profile upload, digital asset upload                      | —       | —              |
| Transactions    | Checkout, Stripe optional, Mailpit receipts, asset delivery, reviews | —       | —              |
| Frontend        | Full flows + admin + owned-cart block + refresh + notification inbox | —       | —              |
| Real-time       | Redis Pub/Sub + SSE + live favorite counts                         | —       | —              |


---

## 1. Infrastructure & platform

| # | Feature | Status | Evidence | How to verify | Notes |
|---|---------|--------|----------|---------------|-------|
| 1.1 | Docker Compose orchestration | ✅ | `docker-compose.yml` | `npm run dev` | Includes Mailpit, ES, Consul |
| 1.2 | Hot reload | ✅ | volumes | Edit `.tsx` | — |
| 1.3 | API Gateway reverse proxy | ✅ | `api-gateway/src/index.ts` | `/health` | Resolves upstreams via Consul with env fallback |
| 1.4 | Gateway rate limiting | ✅ | `api-gateway/src/index.ts` | 429 on burst | SSE stream, `/health`, `/api/docs` **skipped**; dev default 2000/15min (prod 100); set `RATE_LIMIT_MAX_REQUESTS=0` to disable |
| 1.5 | Swagger at gateway | ✅ | `swagger-spec.ts` | `/api/docs` | Static |
| 1.6 | Service registry / discovery | ✅ | Consul + `consul/register.ts` | `curl :8500/v1/catalog/services` | Env fallback if Consul down |
| 1.7 | PostgreSQL | ✅ | Prisma | Register / checkout | — |
| 1.8 | MongoDB | ✅ | Mongoose | Create product | — |
| 1.9 | Redis | ✅ | compose | `PONG` | — |
| 1.10 | Per-service `/health` | ✅ | health controllers | curl each | — |


---

## 2. Redis, queues, pub/sub, SSE

| # | Feature | Status | Evidence | How to verify | Notes |
|---|---------|--------|----------|---------------|-------|
| 2.1–2.2 | Catalog / category cache | ✅ | marketplace redis module | KEYS `products:*` | — |
| 2.3 | BullMQ payments | ✅ | `payment.processor.ts` | Simulated when no Stripe | — |
| 2.4 | Purchase delivery on PAID | ✅ | `purchases.service.ts` | Library entry | Asset URL when uploaded |
| 2.5 | Redis Pub/Sub | ✅ | `events.module.ts` | Checkout / favorite / review | Channel `vividcraft:events` |
| 2.6 | SSE stream | ✅ | `notifications/` | EventSource | Heartbeat 30s; gateway `proxyTimeout: 0` |
| 2.7 | Orders live updates | ✅ | `useSseNotifications.ts` | No poll | Invalidates orders/purchases on events |
| 2.8 | Persisted notification inbox | ✅ | `Notification` Prisma model + `NotificationDropdown.tsx` | Bell badge; mark one/all read; click → route | SSE triggers list refresh |
| 2.9 | Live favorite count | ✅ | `product.favorite_count_changed` event | Toggle favorite → count updates on all open tabs | Optimistic cache patch + ES re-index on toggle |


---

## 3. Auth & security

| # | Feature | Status | Evidence | How to verify | Notes |
|---|---------|--------|----------|---------------|-------|
| 3.1–3.3 | Register / login / JWT | ✅ | auth-service | Login flow | ADMIN self-register blocked |
| 3.4 | Refresh token | ✅ | `apiClient.ts` refresh interceptor | Expire access → silent refresh | Backend rotation |
| 3.5 | OAuth | ⛔ | — | — | Out of scope |
| 3.6–3.7 | RBAC | ✅ | guards + roles | ADMIN/CREATOR/FAN | — |
| 3.8 | Gateway JWT validation | ❌ | — | Services still enforce JWT | Edge middleWare not added |
| 3.9 | Per-user cart | ✅ | `cartStore.ts` | Separate carts | — |
| 3.10–3.11 | Profiles | ✅ | users API + FE | `/users/:id`, `/profile/edit` | — |


---

## 4. Marketplace service

| # | Feature | Status | Evidence | How to verify | Notes |
|---|---------|--------|----------|---------------|-------|
| 4.1–4.11 | CRUD, search, favorites, profile feeds | ✅ | products module | Marketplace + profiles | Favorite toggle publishes `product.favorite_count_changed` |
| 4.12 | Elasticsearch full-text | ✅ | `search/elasticsearch.service.ts` | Search bar with ES up | Mongo `$text` fallback |
| 4.13 | Categories/tags ADMIN write | ✅ | categories/tags controllers | Unauth POST → 401 | — |


---

## 5. Image processor

| # | Feature | Status | Evidence | How to verify | Notes |
|---|---------|--------|----------|---------------|-------|
| 5.1–5.2 | Watermark + serve | ✅ | `app.py` `/watermark` | Creator preview upload | Diagonal `VividCraft` text via Flask; `previewImageUrl` is watermarked |
| 5.3 | Preview “Protected” badge | 🟡 | `ProductCard.tsx` | Badge on any preview image | UI label only — does not verify watermark ran |
| 5.4 | Purchase download | ✅ | purchases download | Library | Asset or license |
| 5.5 | Profile images | ✅ | `/upload` | Edit profile | — |
| 5.6 | Digital asset upload | ✅ | `/upload-asset`, `POST /products/:id/assets` | Creator form | zip/pdf/image |


---

## 6. Transaction service

| # | Feature | Status | Evidence | How to verify | Notes |
|---|---------|--------|----------|---------------|-------|
| 6.1–6.4 | Checkout ACID + queue | ✅ | checkout + payment processor | Cart checkout | — |
| 6.5 | Stripe sandbox | ✅ | `stripe/` module | Set `STRIPE_SECRET_KEY` → Checkout redirect | Simulated if unset |
| 6.6 | Payment webhooks | ✅ | `POST /webhooks/stripe` | Stripe CLI / sandbox | Raw body enabled |
| 6.7 | Order history | ✅ | orders controller | ADMIN sees all | — |
| 6.8 | Asset delivery | ✅ | DigitalDelivery asset fields | Download asset from Library | — |
| 6.9 | Reviews | ✅ | reviews module | Own + reply SSE | — |
| 6.10 | Creator analytics | ✅ | creator module | Dashboard | — |
| 6.11–6.12 | Profile library / top products | ✅ | profile module | Public profile | — |
| 6.13 | Payment receipt email | ✅ | `mail/mail.service.ts` + Mailpit | Open `:8025` after PAID | — |
| 6.14 | Notification REST API | ✅ | `GET/PATCH /notifications` | List, unread count, mark read | Persisted on Redis events |


---

## 7. Frontend (web-client)

| # | Feature | Status | Evidence | How to verify | Notes |
|---|---------|--------|----------|---------------|-------|
| 7.1–7.11 | Core pages + SSE toasts | ✅ | pages / hooks | Manual walk | — |
| 7.12 | Block owned in cart | ✅ | `useOwnedProductIds`, cart prune | Owned → button “Owned” | — |
| 7.13–7.17 | Library, reviews, favorites, profiles | ✅ | pages | — | — |
| 7.18 | Admin dashboard | ✅ | `AdminDashboardPage.tsx` | Login as admin → `/admin` | — |
| 7.19 | FE refresh token | ✅ | `apiClient.ts` | 401 → refresh | — |
| 7.20 | Stripe checkout redirect | ✅ | `CartPage.tsx` | When `checkoutUrl` returned | — |
| 7.21 | Notification dropdown | ✅ | `NotificationDropdown.tsx` | Unread badge, mark all read, click-through | No polling |
| 7.22 | Live favorite count UI | ✅ | `useToggleFavorite` + SSE | Count updates on toggle + other tabs | — |


---

## 8. ARCHITECTURE_GUIDE claims vs reality

| Claim | Actual status |
|-------|---------------|
| Email/password + JWT | ✅ |
| RBAC | ✅ |
| Redis caching + BullMQ | ✅ |
| Stripe / webhooks | ✅ Optional via env |
| Digital asset delivery | ✅ |
| SSE notifications | ✅ |
| Notification inbox (persisted) | ✅ |
| Service registry | ✅ Consul |
| Full-text search | ✅ Elasticsearch |
| Gateway rate limit SSE-safe | ✅ SSE path skipped from limiter |


---

## Audit checklist

```
Sprint: 2026-07-16

[ ] 1. Containers healthy (incl. mailpit, ES, consul)
[ ] 2. Access token refresh works without forced logout
[ ] 3. Owned product cannot be added to cart
[ ] 4. Admin login → /admin users + orders
[ ] 5. Creator uploads asset → Library downloads file after PAID
[ ] 6. Without Stripe keys: simulated payment + Mailpit receipt
[ ] 7. With Stripe keys: Checkout redirect + webhook PAID
[ ] 8. Marketplace search uses ES (fallback to Mongo when down)
[ ] 9. Consul catalog lists services; gateway still works if Consul down
[ ] 10. Notification bell: unread badge, mark all read, click navigates
[ ] 11. Favorite count updates live on toggle (same tab + other tabs via SSE)
[ ] 12. SSE stream not counted by gateway rate limiter
[ ] 13. Docs status matches reality
```

Related docs: [CURRENT_STATE.md](./CURRENT_STATE.md) · [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md)
