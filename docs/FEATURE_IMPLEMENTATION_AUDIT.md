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

## Quick summary (as of 2026-07-15)


| Area            | Real                                              | Partial                    | Mock / Missing                               |
| --------------- | ------------------------------------------------- | -------------------------- | -------------------------------------------- |
| Infrastructure  | Docker Compose, hot reload, health checks         | —                          | Service registry                             |
| Auth            | JWT login/register, refresh token API, bcrypt     | RBAC only on 1 admin route | Gateway JWT validation               |
| Marketplace     | CRUD, search/filter, MongoDB, Redis cache         | —                          | Auth on write routes                         |
| Image processor | Flask watermark + file serve                      | —                          | Image optimization pipeline                  |
| Transactions    | ACID checkout, purchase locks, BullMQ payment job | —                          | Real payment gateway, digital delivery queue |
| Frontend        | All main pages, cart, orders                      | Refresh token unused; order poll debt | SSE-only live updates (no polling)    |
| Real-time       | —                                                 | Temporary 5s poll (must delete) | Redis Pub/Sub + SSE only (no polling)      |


---



## How to run a full audit

1. Start stack: `npm run dev`
2. Open `http://localhost:3000/api/docs` (Swagger)
3. Walk through **Manual verification** steps below
4. Mark each row in the checklist
5. Cross-check code paths in **Evidence** column

---



## 1. Infrastructure & platform


| #   | Feature (from planning)          | Status | Evidence                                   | How to verify                                              | Notes                                                                      |
| --- | -------------------------------- | ------ | ------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1.1 | Docker Compose orchestration     | ✅      | `docker-compose.yml`                       | `npm run dev` → all containers healthy                     | —                                                                          |
| 1.2 | Hot reload (volume mounts)       | ✅      | `docker-compose.yml` volumes               | Edit a `.tsx` file → browser updates without rebuild       | —                                                                          |
| 1.3 | API Gateway reverse proxy        | ✅      | `services/api-gateway/src/index.ts`        | `curl http://localhost:3000/health`                        | Routes `/api/auth`, `/api/marketplace`, `/api/transactions`, `/api/images` |
| 1.4 | Gateway rate limiting            | ✅      | `express-rate-limit` in gateway            | Send 100+ requests in 15 min → 429                         | Config via `RATE_LIMIT_*` env                                              |
| 1.5 | Swagger at gateway `/api/docs`   | ✅      | `services/api-gateway/src/swagger-spec.ts` | Open `http://localhost:3000/api/docs`                      | Static spec, not auto-generated from all services                          |
| 1.6 | Service registry / discovery     | ❌      | —                                          | —                                                          | Hard-coded service URLs in gateway                                         |
| 1.7 | PostgreSQL (auth + transactions) | ✅      | `docker-compose.yml`, Prisma schemas       | Register user → row in `users`; checkout → row in `orders` | Two logical DBs via init SQL                                               |
| 1.8 | MongoDB (catalog)                | ✅      | `marketplace-service` Mongoose schemas     | Create product → visible in marketplace                    | —                                                                          |
| 1.9 | Redis container                  | ✅      | `docker-compose.yml`                       | `docker exec vividcraft-redis redis-cli ping` → `PONG`     | —                                                                          |


---



## 2. Redis, queues, pub/sub, SSE


| #   | Feature                                | Status | Evidence                                                               | How to verify                                                              | Notes                                                                        |
| --- | -------------------------------------- | ------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 2.1 | Redis cache (product catalog)          | ✅      | `marketplace-service/src/redis/redis.module.ts`, `products.service.ts` | List products twice → second request faster; check Redis keys `products:*` | TTL ~300s for products                                                       |
| 2.2 | Redis cache (categories/tags)          | ✅      | `categories.service.ts`, `tags.service.ts`                             | `redis-cli KEYS categories:*` / `tags:*`                                   | TTL 600s                                                                     |
| 2.3 | BullMQ message queue (payments)        | ✅      | `transaction-service/src/queue/payment.processor.ts`                   | Checkout → order moves PENDING → PROCESSING → PAID/FAILED                  | Uses Redis as BullMQ backend                                                 |
| 2.4 | BullMQ digital delivery queue          | ❌      | Log message only in `payment.processor.ts` L77                         | —                                                                          | No second queue or zip/download worker                                       |
| 2.5 | Redis Pub/Sub (cross-service events)   | ❌      | —                                                                      | —                                                                          | See [REALTIME_EVENT_DRIVEN_STRATEGY.md](./REALTIME_EVENT_DRIVEN_STRATEGY.md) |
| 2.6 | SSE push notifications                 | ❌      | —                                                                      | —                                                                          | **Required** — sole real-time channel; see realtime strategy                 |
| 2.7 | Orders live updates                    | 🟡     | `apps/web-client/src/hooks/useApi.ts` `refetchInterval: 5000`          | Network tab shows `/orders` every 5s                                       | Temporary debt — **delete poll**; target = one GET + SSE only                |


---



## 3. Auth & security


| #   | Feature                          | Status | Evidence                                           | How to verify                                                  | Notes                                          |
| --- | -------------------------------- | ------ | -------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| 3.1 | User registration                | ✅      | `auth-service` register endpoint                   | Register at `/register` → login works                          | —                                              |
| 3.2 | User login (email/password)      | ✅      | `auth.service.ts` bcrypt + JWT                     | Login at `/login`                                              | —                                              |
| 3.3 | JWT access token                 | ✅      | `JwtStrategy`, `apiClient` interceptor             | API calls include `Authorization: Bearer`                      | —                                              |
| 3.4 | Refresh token (stored in DB)     | 🟡     | `auth.service.ts` `refreshToken()`                 | API exists; FE stores token but never calls refresh            | Token rotation on refresh works server-side    |
| 3.5 | OAuth 2.0 (Google/GitHub)        | ⛔      | —                                                  | —                                                              | **Out of scope** — email/password only by design |
| 3.6 | RBAC roles (CREATOR, FAN, ADMIN) | 🟡     | `prisma/schema.prisma` Role enum                   | Register as CREATOR vs FAN → dashboard link visibility differs | Role in JWT payload                            |
| 3.7 | RBAC enforcement on routes       | 🟡     | `RolesGuard` on `GET /users/creators` (ADMIN only) | Marketplace/transaction routes have **no** auth guards         | See [RBAC.md](./RBAC.md)                       |
| 3.8 | Gateway JWT validation           | ❌      | Gateway proxies all traffic                        | Call `POST /api/marketplace/products` without token → succeeds | Any client can hit write APIs                  |
| 3.9 | Per-user cart isolation          | ✅      | `apps/web-client/src/stores/cartStore.ts`          | Login as user A, add item, logout, login as B → separate cart  | Fixed from shared cart bug                     |


---



## 4. Marketplace service


| #   | Feature                               | Status | Evidence                                        | How to verify                       | Notes                                                |
| --- | ------------------------------------- | ------ | ----------------------------------------------- | ----------------------------------- | ---------------------------------------------------- |
| 4.1 | Create product listing                | ✅      | `POST /products`                                | Creator Dashboard → publish listing | No creator-only guard on API                         |
| 4.2 | List published products               | ✅      | `GET /products` with `isPublished: true` filter | Marketplace page loads cards        | —                                                    |
| 4.3 | Search & filter (type, category, tag) | ✅      | `ProductQueryDto`, `MarketplacePage.tsx`        | Use search bar and type filter      | —                                                    |
| 4.4 | Product detail by ID                  | ✅      | `GET /products/:id`                             | —                                   | Cached in Redis                                      |
| 4.5 | Update / delete product               | ✅      | `PUT`, `DELETE` endpoints                       | —                                   | No ownership check                                   |
| 4.6 | Categories CRUD                       | ✅      | `categories.controller.ts`                      | —                                   | —                                                    |
| 4.7 | Tags CRUD                             | ✅      | `tags.controller.ts`                            | —                                   | —                                                    |
| 4.8 | Creator owns only their listings      | ❌      | —                                               | —                                   | `creatorId` stored but not enforced on update/delete |


---



## 5. Image processor


| #   | Feature                                       | Status | Evidence                                                  | How to verify                                          | Notes                                   |
| --- | --------------------------------------------- | ------ | --------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| 5.1 | Watermark upload flow                         | ✅      | `image-processor/app.py`, `products.service.ts` watermark | Creator Dashboard upload → preview on marketplace card | —                                       |
| 5.2 | Serve watermarked files                       | ✅      | `GET /api/images/files/{filename}`                        | Image loads on `localhost:5173`                        | Gateway CORS/Helmet fixed               |
| 5.3 | Image optimization (resize/compress pipeline) | 🟡     | JPEG quality 85 in Flask                                  | —                                                      | Basic save only, no multi-size variants |
| 5.4 | Secure download of purchased full asset       | ❌      | —                                                         | —                                                      | Only preview watermark exists           |


---



## 6. Transaction service


| #   | Feature                                    | Status | Evidence                                    | How to verify                    | Notes                                       |
| --- | ------------------------------------------ | ------ | ------------------------------------------- | -------------------------------- | ------------------------------------------- |
| 6.1 | Cart checkout API                          | ✅      | `POST /checkout`                            | Cart → Complete Checkout         | —                                           |
| 6.2 | ACID order creation                        | ✅      | `checkout.service.ts` Prisma `$transaction` | —                                | —                                           |
| 6.3 | Double-purchase prevention                 | ✅      | `orderItem` check + `purchaseLock`          | Buy same product twice → 409     | Includes PENDING/PROCESSING/PAID            |
| 6.4 | Async payment processing                   | ✅      | BullMQ `payment-processing` queue           | Order status changes after ~1.5s | —                                           |
| 6.5 | Real payment gateway (Stripe/Midtrans)     | ❌      | `Payment.method = "SIMULATED"`              | —                                | `Math.random() > 0.05` success in processor |
| 6.6 | Payment webhooks                           | ❌      | —                                           | —                                | Planned via queue in ARCHITECTURE_GUIDE     |
| 6.7 | Order history by user                      | ✅      | `GET /orders?userId=`                       | Orders page lists invoices       | —                                           |
| 6.8 | Digital asset delivery (zip + secure link) | ❌      | Log only                                    | —                                | No download endpoint or email               |


---



## 7. Frontend (web-client)


| #    | Feature                      | Status | Evidence                              | How to verify                        | Notes                               |
| ---- | ---------------------------- | ------ | ------------------------------------- | ------------------------------------ | ----------------------------------- |
| 7.1  | Marketplace page             | ✅      | `MarketplacePage.tsx`                 | Browse, search, filter               | —                                   |
| 7.2  | Login / Register             | ✅      | `LoginPage.tsx`, `RegisterPage.tsx`   | —                                    | —                                   |
| 7.3  | Creator Dashboard            | ✅      | `CreatorDashboardPage.tsx`            | CREATOR role → publish + watermark   | UI only hides link for non-creators |
| 7.4  | Shopping cart                | ✅      | `CartPage.tsx`, `cartStore.ts`        | Add to cart → `/cart`                | —                                   |
| 7.5  | Checkout flow                | ✅      | `useCheckout` mutation                | Complete checkout → success screen   | —                                   |
| 7.6  | Orders page                  | 🟡     | `OrdersPage.tsx`                      | View order status                    | Still polls; target = one GET + SSE only |
| 7.7  | Zustand (auth + cart)        | ✅      | `authStore.ts`, `cartStore.ts`        | Persist across refresh               | —                                   |
| 7.8  | React Query server state     | ✅      | `useApi.ts` hooks                     | —                                    | —                                   |
| 7.9  | Formik + Yup forms           | ✅      | `FormEngine.tsx`                      | Login, register, checkout, dashboard | —                                   |
| 7.10 | Toast notifications          | ✅      | `react-hot-toast` via `notify` helper | —                                    | Wire to SSE events later            |
| 7.11 | SSE / live notifications     | ❌      | —                                     | —                                    | **Policy: SSE only, no polling**    |
| 7.12 | Block owned products in cart | ❌      | —                                     | Re-checkout owned item → 409 error   | UX gap, not prevention              |


---



## 8. ARCHITECTURE_GUIDE claims vs reality


| Claim in ARCHITECTURE_GUIDE       | Actual status                                      |
| --------------------------------- | -------------------------------------------------- |
| Email/password + JWT auth         | ✅ Primary auth method                            |
| RBAC                              | 🟡 Roles exist; minimal enforcement                |
| Redis catalog caching             | ✅                                                  |
| Redis BullMQ payment webhooks     | 🟡 Queue exists; payment is simulated, no webhooks |
| Async digital asset delivery      | ❌ Log message only                                 |
| Swagger auto-generated at gateway | 🟡 Static `swagger-spec.ts`, not live aggregation  |
| Service registry                  | ❌                                                  |


---



## Audit checklist (copy per sprint)

```
Sprint: ___________  Reviewer: ___________

[ ] 1. All containers healthy (`docker compose ps`)
[ ] 2. Register + login flow works
[ ] 3. Creator can publish + watermark
[ ] 4. Fan can browse, cart, checkout
[ ] 5. Order appears on Orders page with status update
[ ] 6. Redis has cache keys after browsing marketplace
[ ] 7. BullMQ job runs after checkout (transaction-service logs)
[ ] 8. Confirmed payment is simulated (not real gateway)
[ ] 9. Real-time: no `refetchInterval` / polling; SSE is the only live path (or still missing → flag as debt)
[ ] 10. Confirmed marketplace write APIs are unauthenticated
[ ] 11. Updated status table in this doc if anything changed
```

---



## When a feature moves from mock → real

Update the row:

1. Change **Status** column
2. Add **Evidence** (file paths + endpoint)
3. Add **How to verify** steps
4. Remove or shorten **Notes**
5. Update **Quick summary** table at top
6. Link PR / commit in your team changelog

Related docs: [CURRENT_STATE.md](./CURRENT_STATE.md) · [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md)