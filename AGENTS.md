# VividCraft — Agent Instructions

Before any UI or styling work, read:

- `docs/brand_guide/VividCraft-Brand-Guide-v1.0.md`
- `docs/brand_guide/VividCraft-Brand-Tokens-v1.0.json`
- `docs/brand_guide/VividCraft-Brand-Showcase-v1.0.html`

## Brand rules (mandatory)

- **Solid fills only** — no gradient colours anywhere
- **Colours:** primary `#321E48`, secondary `#43637E`, accent `#65DCD5`, accent-deep `#1E8E86`, highlight `#D9FFF4`, ink `#17131F`, surface `#211B2C`, nav `#2A1A3D`
- **Fonts:** Sora (headings), Plus Jakarta Sans (body), JetBrains Mono (code)
- **Proportions:** 50% neutral / 35% violet / 15% teal

## Architecture docs

| Doc | Purpose |
|-----|---------|
| `docs/FEATURE_IMPLEMENTATION_AUDIT.md` | Real vs mock feature status |
| `docs/REALTIME_EVENT_DRIVEN_STRATEGY.md` | SSE + Redis Pub/Sub (no HTTP polling) |
| `docs/RBAC.md` | JWT guards, role enforcement |
| `docs/SLA.md` | Health endpoints, monitoring |
| `docs/FEATURE_ROADMAP.md` | P0–P3 backlog |

## Out of scope

- OAuth / social login
- HTTP polling for live updates

## Stack

- Monorepo: NestJS microservices + React/Vite web client + Flask image processor
- Gateway: `services/api-gateway` (port 3000)
- Auth: email/password JWT only
