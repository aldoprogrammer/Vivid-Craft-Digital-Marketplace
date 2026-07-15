# RBAC — Role-Based Access Control

Current implementation, gaps, and execute plan for full enforcement.

---

## Roles

| Role | Intended user | Registration |
|------|---------------|--------------|
| `FAN` | Buyer / collector | Default on register |
| `CREATOR` | Artist / publisher | Selected at register |
| `ADMIN` | Platform operator | Seed script or DB only (not in public UI) |

Defined in: `services/auth-service/prisma/schema.prisma`

---

## Current state

| Layer | Status | Detail |
|-------|--------|--------|
| Role in JWT payload | ✅ | `{ sub, email, role }` |
| `RolesGuard` + `@Roles()` decorator | ✅ | `auth-service` only |
| Routes protected | 🟡 | `GET /users/creators` → ADMIN only |
| Marketplace write APIs | ❌ | Open — no JWT required |
| Transaction APIs | ❌ | Open — `userId` passed in body/query |
| Gateway | ❌ | No auth middleware |
| Frontend UI gating | 🟡 | Dashboard link hidden for non-creators |

**Risk:** Anyone can call `POST /api/marketplace/products` or `POST /api/transactions/checkout` with arbitrary `userId`.

---

## Permission matrix (target)

| Resource / Action | FAN | CREATOR | ADMIN |
|-------------------|-----|---------|-------|
| Browse marketplace | ✅ | ✅ | ✅ |
| Add to cart / checkout | ✅ | ✅ | ✅ |
| View own orders | ✅ | ✅ | ✅ |
| Create product | ❌ | ✅ | ✅ |
| Update own product | ❌ | ✅ (owner) | ✅ |
| Delete own product | ❌ | ✅ (owner) | ✅ |
| Upload watermark | ❌ | ✅ (owner) | ✅ |
| List all users | ❌ | ❌ | ✅ |
| List creators | ❌ | ❌ | ✅ |
| Moderate any product | ❌ | ❌ | ✅ |
| View any order | ❌ | ❌ | ✅ |

---

## Phase 1 — Shared auth middleware

### Option A (recommended): Gateway JWT validation

- [ ] Add `services/api-gateway/src/middleware/jwt.middleware.ts`
- [ ] Verify JWT with shared `JWT_SECRET`
- [ ] Attach `req.user = { sub, email, role }` for downstream (custom header `X-User-Id`, `X-User-Role`)
- [ ] Public routes whitelist: `/api/auth/login`, `/api/auth/register`, `GET /api/marketplace/products`, `GET /api/images/files/*`

### Option B: Per-service guards

- [ ] Copy `JwtAuthGuard`, `RolesGuard`, decorators to each Nest service
- [ ] Validate JWT in each service independently

**Pick one** — avoid both to prevent drift.

---

## Phase 2 — Marketplace enforcement

| Endpoint | Guard |
|----------|-------|
| `POST /products` | JWT + `@Roles(CREATOR, ADMIN)` |
| `PUT /products/:id` | JWT + owner check (`creatorId === user.sub`) or ADMIN |
| `DELETE /products/:id` | JWT + owner or ADMIN |
| `POST /products/:id/watermark` | JWT + owner or ADMIN |
| `GET /products` | Public |
| `POST /categories`, `POST /tags` | ADMIN only (or CREATOR for tags — decide) |

### Owner check helper

```typescript
async assertProductOwner(productId: string, userId: string, role: Role) {
  if (role === Role.ADMIN) return;
  const product = await this.productsService.findById(productId);
  if (product.creatorId !== userId) throw new ForbiddenException();
}
```

---

## Phase 3 — Transaction enforcement

| Endpoint | Guard |
|----------|-------|
| `POST /checkout` | JWT — use `user.sub` from token, **ignore** body `userId` |
| `GET /orders` | JWT — return only orders where `userId === user.sub` (ADMIN: all) |

---

## Phase 4 — Frontend alignment

- [ ] Send JWT on all mutating requests (already via `apiClient`)
- [ ] Remove `userId` from checkout payload — backend derives from token
- [ ] Handle 403 with toast + redirect
- [ ] Admin panel (future): user list, order moderation

---

## Phase 5 — Admin bootstrap

- [ ] Seed script: `prisma/seed.ts` creates `admin@vividcraft.local` with ADMIN role
- [ ] Document credentials in README (dev only)

---

## Testing checklist

```
[ ] FAN cannot POST /products → 403
[ ] CREATOR can POST /products → 201
[ ] CREATOR cannot PUT another creator's product → 403
[ ] ADMIN can PUT any product → 200
[ ] Checkout with mismatched userId in body ignored; uses JWT sub
[ ] FAN cannot GET /users/creators → 403
[ ] ADMIN can GET /users/creators → 200
```

---

## Definition of done

- [ ] All write APIs require valid JWT
- [ ] Permission matrix fully enforced server-side
- [ ] FEATURE_IMPLEMENTATION_AUDIT rows 3.6, 3.7, 3.8 marked ✅
- [ ] No security-critical logic relies on frontend hiding alone
