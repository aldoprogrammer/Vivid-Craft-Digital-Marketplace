---
name: automation-testing
description: >-
  Writes and runs unit and E2E tests for VividCraft (Vitest, node:assert, Playwright).
  Use when adding features, fixing bugs, or when the user asks for tests, test coverage,
  automation testing, unit tests, or E2E tests.
---

# VividCraft Automation Testing

## When to test

| Change type | Required test |
|-------------|---------------|
| Pure logic (`lib/`, utils, filters, money, guards) | **Unit** — colocate `*.test.ts` next to source |
| API gateway middleware / public routes | **Unit** — `services/api-gateway/src/**/*.test.ts` |
| NestJS service business rules | **Unit** — prefer testing pure helpers; integration only when needed |
| Page flows (checkout, orders, cart, auth) | **E2E** — `tests/e2e/*.spec.ts` |
| Payment / checkout / order status | **Unit + E2E** |

## Commands (run from repo root)

```bash
npm run test:unit          # gateway JWT + marketplace scan + web-client Vitest
npm run test:web           # web-client unit only
npm run test:e2e           # Playwright (Docker stack must be up)
npm run test:e2e:ui        # Playwright UI mode
npm run test               # unit + e2e
npm run synthetic          # legacy HTTP checkout smoke script
```

## Unit test rules

1. **File naming:** `feature.test.ts` beside `feature.ts` (web-client) or same folder (services).
2. **Web-client stack:** Vitest + `@/` path alias. No DOM unless testing a component.
3. **Services stack:** `node:assert/strict` + `ts-node --transpile-only` (gateway pattern) OR Vitest if already configured.
4. **Test real behavior** — payment filters, order dedup, currency conversion, JWT public routes, cart rules.
5. **Do not** test trivial getters, one-line wrappers, or framework internals.
6. **After every logic fix**, add a regression test for the bug scenario.

### Web-client unit example

```typescript
import { describe, it, expect } from 'vitest';
import { filterDisplayOrders } from './orders';

describe('filterDisplayOrders', () => {
  it('hides duplicate cancelled orders when active orders exist', () => {
    const orders = [
      { id: '1', status: 'PAID', /* ... */ },
      { id: '2', status: 'FAILED', /* ... */ },
    ];
    expect(filterDisplayOrders(orders, false)).toHaveLength(1);
  });
});
```

### Gateway unit example

```typescript
import assert from 'node:assert/strict';
import { isPublicRoute } from './jwt.middleware';
assert.equal(isPublicRoute('POST', '/api/transactions/webhooks/stripe'), true);
```

## E2E test rules

1. **Location:** `tests/e2e/*.spec.ts`
2. **Stack:** Playwright, base URL `http://localhost:5173`, API `http://localhost:3000`
3. **Prerequisite:** `docker compose up -d` (web-client + api-gateway at minimum)
4. **Prefer role/text selectors** over CSS classes.
5. **Auth flows:** use a dedicated test user from seed/env; never hardcode production credentials.
6. **Payment E2E:** mock or use Stripe test mode; assert order status UI, not live charge.
7. **Keep specs independent** — each test sets up its own state or uses fresh account.

### E2E example

```typescript
import { test, expect } from '@playwright/test';

test('marketplace loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Browse|Marketplace|listings/i).first()).toBeVisible();
});
```

## Agent workflow after code changes

1. Identify affected logic or flow.
2. Add or update unit test(s) first when fixing a bug (regression).
3. Add E2E if user-visible flow changed.
4. Run `npm run test:unit` — must pass before finishing.
5. Run `npm run test:e2e` when Docker is available; report skip reason if not.
6. Do not delete failing tests to make CI green — fix the code.

## Critical domains (always cover when touched)

- Checkout: provider selection, pending order session, abandon vs confirm
- Orders: display filter, status labels, paid return (`?paid=1`)
- Cart: auth gate, owned-product removal
- Gateway JWT: public vs protected routes
- Purchases: owned IDs (PAID only, not PENDING)

## Additional resources

- Command matrix and CI notes: [reference.md](reference.md)
