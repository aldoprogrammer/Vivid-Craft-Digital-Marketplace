# Testing Reference

## Layout

```
apps/web-client/src/lib/orders.test.ts     # Vitest unit
services/api-gateway/src/middleware/jwt.middleware.test.ts
services/marketplace-service/src/redis/redis.scan.test.ts
tests/e2e/playwright.config.ts
tests/e2e/smoke.spec.ts
tests/synthetic/checkout-flow.js           # legacy HTTP smoke
```

## Environment

| Service | URL |
|---------|-----|
| Web client | http://localhost:5173 |
| API gateway | http://localhost:3000 |
| Auth | http://localhost:3001 |
| Marketplace | http://localhost:3002 |
| Transactions | http://localhost:3003 |

## Playwright first-time setup

```bash
npm install
npx playwright install chromium
```

## Vitest (web-client only)

```bash
cd apps/web-client && npm run test
cd apps/web-client && npm run test:watch
```

## Debugging failed E2E

1. `docker compose ps` — all services Up
2. `curl http://localhost:3000/health/ready`
3. `npm run test:e2e:ui` — step through in browser
4. Check gateway logs for 429 rate limit (dev: `RATE_LIMIT_MAX_REQUESTS=0`)

## CI suggestion (not wired yet)

```yaml
- run: npm run test:unit
- run: docker compose up -d
- run: npm run test:e2e
```
