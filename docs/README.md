# VividCraft Docs

Planning, audit, and execution guides for the platform.

---

## Start here

| Doc | When to use |
|-----|-------------|
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
| [brand_guide/](./brand_guide/) | Colours, typography, tokens, visual showcase |

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
