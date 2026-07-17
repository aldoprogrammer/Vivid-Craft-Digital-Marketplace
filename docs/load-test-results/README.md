# Load test results

Store dated k6 (or other) runs here.

## Scripts

| Script | Purpose |
|--------|---------|
| [`tests/load/marketplace-browse.js`](../../tests/load/marketplace-browse.js) | Browse catalog (default 100 VUs / 5m when configured) |
| [`tests/synthetic/checkout-flow.js`](../../tests/synthetic/checkout-flow.js) | Node synthetic: health + login + products |

## How to run

```bash
# App must be up
npm run dev:detached

# Synthetic (Node 20+)
node tests/synthetic/checkout-flow.js

# k6 (install https://k6.io)
k6 run tests/load/marketplace-browse.js
```

## Results log

| Date | Scenario | Tool | Notes |
|------|----------|------|-------|
| 2026-07-17 | Scripts + observability stack landed | — | No production load run in CI; execute locally and paste summary below |

### Template

```
Date:
Command:
P95 marketplace products:
Errors:
Pass/Fail vs SLA (cached <100ms / cold <400ms):
```
