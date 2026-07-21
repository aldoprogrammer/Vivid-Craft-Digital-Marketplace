# VividCraft Docs

Planning, audit, and execution guides for the platform.

---

## Start here

| Doc | When to use |
|-----|-------------|
| **[preview/PLATFORM_PREVIEW.md](./preview/PLATFORM_PREVIEW.md)** | **UI & infra screenshots** — portfolio / reviewer preview |
| **[FEATURE_IMPLEMENTATION_AUDIT.md](./FEATURE_IMPLEMENTATION_AUDIT.md)** | Check what is **real** vs **mock** — run before every sprint review |
| [CURRENT_STATE.md](./CURRENT_STATE.md) | Quick snapshot of Redis, queues, SSE, RBAC today |
| [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md) | Prioritized backlog (P0 → P3) |

---

## Deep-dive / execute plans

| Doc | Topic |
|-----|-------|
| [REALTIME_EVENT_DRIVEN_STRATEGY.md](./REALTIME_EVENT_DRIVEN_STRATEGY.md) | Redis Pub/Sub + SSE only (no polling) |
| [RBAC.md](./RBAC.md) | Roles, permission matrix, API enforcement |
| [SLA.md](./SLA.md) | Uptime, latency targets, monitoring setup |
| [RUNBOOK.md](./RUNBOOK.md) | Incidents: 429, payments, Redis, Stripe/Xendit |
| [brand_guide/](./brand_guide/) | Colours, typography, tokens, visual showcase |

## Testing

| Resource | Purpose |
|----------|---------|
| [../.cursor/skills/automation-testing/SKILL.md](../.cursor/skills/automation-testing/SKILL.md) | Agent workflow for unit + E2E |
| `npm run test:unit` | Vitest + gateway assert tests |
| `npm run test:e2e` | Playwright smoke against local Docker |

---

## Recommended workflow

1. Read **FEATURE_IMPLEMENTATION_AUDIT** → know what is already real
2. Pick next item from **FEATURE_ROADMAP**
3. Follow the linked execute doc (RBAC / Realtime / SLA)
4. Re-run audit checklist and update status tables

---

## Related repo docs

- [README.md](../README.md) — setup & Docker commands
- [ARCHITECTURE_GUIDE.md](../ARCHITECTURE_GUIDE.md) — original high-level spec
