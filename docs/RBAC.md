# RBAC — Role-Based Access Control

Current implementation and enforcement model.

---

## Roles

| Role | Intended user | Registration |
|------|---------------|--------------|
| `FAN` | Buyer / collector | Default on register |
| `CREATOR` | Artist / publisher | Selected at register |
| `ADMIN` | Platform operator | Seed only (`admin@vividcraft.local`) — not public register |

---

## Current state (2026-07-21)

| Layer | Status | Detail |
|-------|--------|--------|
| Role in JWT payload | ✅ | `{ sub, email, role }` |
| Per-service `JwtAuthGuard` + `RolesGuard` | ✅ | auth, marketplace, transaction |
| Marketplace write APIs | ✅ | JWT + role + ownership |
| Transaction APIs | ✅ | JWT; checkout uses `user.sub` |
| Gateway JWT pre-check | ✅ | `services/api-gateway/src/middleware/jwt.middleware.ts` |
| Spoofable identity headers stripped | ✅ | Client `x-user-*` removed; set only after verify |
| Frontend UI gating | ✅ | Role links + 403 toast in `apiClient` |
| Admin seed | ✅ | `prisma/seed.ts` |

**Model:** Option B (per-service JWT) **plus** gateway defense-in-depth. Services remain the trust anchor; gateway rejects unauthenticated protected routes early.

---

## Permission matrix

| Resource / Action | FAN | CREATOR | ADMIN |
|-------------------|-----|---------|-------|
| Browse marketplace | ✅ | ✅ | ✅ |
| Add to cart / checkout | ✅ | ✅ | ✅ |
| View own orders | ✅ | ✅ | ✅ |
| Create product | ❌ | ✅ | ✅ |
| Update own product | ❌ | ✅ (owner) | ✅ |
| Delete own product | ❌ | ✅ (owner) | ✅ |
| Upload watermark / asset | ❌ | ✅ (owner) | ✅ |
| Favorite products | ✅ | ❌ | ❌ |
| List all users / creators | ❌ | ❌ | ✅ |
| Admin dashboard | ❌ | ❌ | ✅ |
| Replay payment DLQ | ❌ | ❌ | ✅ |

---

## Gateway public whitelist (method-aware)

Public without Bearer token:

- `POST /api/auth/login|register|refresh`
- `GET /api/marketplace/products` (+ public product detail, creator listings, user favorites)
- `GET /api/marketplace/categories|tags`
- `GET /api/users/:id/public`
- `GET /api/images/files/*`
- `GET /api/transactions/notifications/stream` (JWT in query — EventSource)
- `GET /api/transactions/reviews/product/:id`
- `GET /api/transactions/profile/:id/{library,top-products,sales-count}`
- `POST /api/transactions/webhooks/stripe`
- `POST /api/transactions/webhooks/xendit`
- `/health*`, `/metrics`, `/api/docs*`

Protected examples (401 without token at gateway):

- `POST /api/marketplace/products`
- `GET /api/marketplace/products/mine`
- `GET /api/marketplace/products/favorites/mine`
- `GET /api/transactions/orders`
- `GET /api/transactions/notifications`

---

## Frontend

- JWT on mutating requests via `apiClient`
- Checkout `userId` ignored; backend uses JWT `sub`
- **403** → single toast: “You do not have permission…”

---

## Admin bootstrap

```bash
# in auth-service
npm run prisma:seed
# admin@vividcraft.local / AdminPass123!
```

---

## Verification

```
[x] Unauth POST /api/marketplace/products → 401 (gateway)
[x] FAN cannot POST /products → 403 (service)
[x] CREATOR can POST /products → 201
[x] CREATOR cannot PUT another creator's product → 403
[x] Checkout uses JWT sub
[x] ADMIN seed + /admin dashboard
[x] Gateway JWT unit tests: npm test in api-gateway
```

Related: [FEATURE_IMPLEMENTATION_AUDIT.md](./FEATURE_IMPLEMENTATION_AUDIT.md) · [RUNBOOK.md](./RUNBOOK.md)
