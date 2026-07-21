# VividCraft Operations Runbook

Local/dev incident response for the VividCraft marketplace. Severity guide:

- **SEV-1** — Customer-facing outage (checkout down, gateway down, data loss risk).
- **SEV-2** — Degraded but usable (elevated errors, slow responses, one dependency flapping).

## Quick reference

| What | Where |
|------|-------|
| Metrics | Prometheus http://localhost:9090 |
| Dashboards | Grafana http://localhost:3005 (admin/admin) |
| Alerts | Alertmanager http://localhost:9093 |
| Alert emails | Mailpit http://localhost:8025 |
| Logs | Grafana → Loki datasource, query `{project="vividcraft"}` |
| Service registry | Consul http://localhost:8500 |

Health endpoints per service: `/health/live`, `/health/ready`, `/health` (alias of ready).

## Restart commands

```bash
# Bring up app + observability together
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d

# Restart a single service (env vars unchanged)
docker compose restart transaction-service

# Recreate after .env / payment key changes (reloads compose environment)
docker compose up -d transaction-service api-gateway

# Tail logs
docker compose logs -f transaction-service

# Reload Prometheus config after edits
curl -X POST http://localhost:9090/-/reload

# Full teardown (keeps volumes)
docker compose -f docker-compose.yml -f docker-compose.observability.yml down
```

---

## SEV-2: HTTP 429 (rate limited)

**Symptoms:** Clients receive `429 Too many requests`; `HighHttp5xxRate` may be quiet since 429 is 4xx.

1. Confirm source: `docker compose logs -f api-gateway` and Grafana request-rate panel by `route`.
2. Check limiter config in `services/api-gateway/src/index.ts` (`RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_MS`).
3. Dev default: `RATE_LIMIT_MAX_REQUESTS=0` in `services/api-gateway/.env.example` — recreate gateway: `docker compose up -d api-gateway`.
4. If legitimate traffic spike in prod: raise `RATE_LIMIT_MAX_REQUESTS` and recreate gateway.
5. Health/metrics/SSE paths are excluded — verify no new hot path needs exclusion.

## SEV-2: SSE notification disconnects

**Symptoms:** Users stop receiving live notifications; `/api/transactions/notifications/stream` reconnect loops.

1. Confirm transaction-service is up: `curl -s http://localhost:3003/health/ready | jq`.
2. Check Redis (SSE is backed by Redis pub/sub): `docker compose exec redis redis-cli ping`.
3. Verify gateway is not buffering the stream — proxy sets `x-accel-buffering: no`; check `services/api-gateway/src/index.ts`.
4. Restart transaction-service: `docker compose restart transaction-service`.
5. Watch reconnections in `docker compose logs -f transaction-service` and Grafana route `/notifications/stream`.

## SEV-1: Payment stuck / checkout not completing

**Symptoms:** Orders remain pending; delivery queue not draining; buyers not receiving assets.

1. Check transaction-service readiness: `curl -s http://localhost:3003/health/ready | jq`.
2. Confirm routes mapped in logs: `/checkout/:orderId/confirm`, `/resume`, `/abandon`.
3. If route missing after code deploy: `docker compose up -d transaction-service` (watch mode may not reload).
4. Local return from Stripe/Xendit without webhook: user lands on `/orders?paid=1` → frontend calls `POST /checkout/:orderId/confirm`.
5. Unpaid order stuck: **Complete payment** on My Orders → `POST /checkout/:orderId/resume`.
6. Verify Postgres + Redis; inspect Stripe/Xendit webhook logs.
7. BullMQ simulated path only when no provider keys configured.
8. Escalate if payment captured but goods undelivered.

## Stripe sandbox verification

1. Put `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in root `.env` (compose passes to transaction-service).
2. Run:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/transactions/webhooks/stripe
   ```
3. Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.
4. Recreate: `docker compose up -d transaction-service`.
5. Complete checkout with:
   ```text
   Card: 4242 4242 4242 4242
   Expiry: any future date
   CVC: any 3 digits
   Postal code: any valid value
   ```
6. Verify:
   - Stripe CLI receives `checkout.session.completed`
   - Webhook returns 2xx
   - Order becomes **PAID**
   - Delivery appears in **Library**
   - Notification arrives
   - Receipt appears in Mailpit

Never commit `.env`, `sk_test_...`, `whsec_...`, or Xendit secrets.

## Xendit sandbox verification

1. Set `XENDIT_SECRET_KEY` + `XENDIT_WEBHOOK_TOKEN` in root `.env`.
2. `docker compose up -d transaction-service`
3. Checkout → select **Xendit** → pay test invoice.
4. Verify order **PAID** via webhook or `POST /checkout/:orderId/confirm`.

## Automated tests

```bash
npm run test:unit          # gateway + scan + vitest
npm run test:e2e           # Playwright smoke (stack must be up)
```

See `.cursor/skills/automation-testing/SKILL.md` for agent workflow.

## SEV-1: Redis down

**Symptoms:** `RedisDown` alert; SSE, caching, queues, idempotency all failing. Marketplace/transaction `ready` return 503.

1. Confirm: `docker compose exec redis redis-cli ping` (expect `PONG`) or check `redis_up` in Prometheus.
2. Restart: `docker compose restart redis`.
3. Verify dependents recover: readiness of marketplace-service and transaction-service returns 200.
4. If data volume corrupt: inspect `docker compose logs redis`; last resort `docker compose down redis && docker volume rm <redis_data> && docker compose up -d redis` (accepts cache/queue loss).
5. Re-run synthetic check: `node tests/synthetic/checkout-flow.js`.

## SEV-1: A service target is DOWN (TargetDown / SyntheticProbeFailing)

1. Identify service from alert labels; hit its readiness probe directly (`/health/ready`).
2. `docker compose logs -f <service>` for crash/stack traces.
3. `docker compose restart <service>`; confirm Consul re-registers (http://localhost:8500).
4. If dependency-related, follow the matching dependency runbook above.
