# Codex Master Prompt — GrowLab Hybrid Edition

Devi creare GrowLab usando documentazione step-by-step.

## Stack obbligatorio

- Backend API: Go + Gin
- Worker: Go separato
- Frontend: Next.js App Router + TypeScript
- UI: shadcn/ui + TailwindCSS
- API: REST + OpenAPI
- TS client: Orval
- Package manager frontend: pnpm
- DB: PostgreSQL + TimescaleDB esterno su pg-01
- DB access: pgx + sqlc
- Migrazioni: goose
- MQTT: EMQX
- Cache: Redis
- Lighting: Shelly Dimmer 2 local HTTP API
- Firmware: ESP32 PlatformIO + Arduino
- Deploy: Docker Compose su app-01
- Monitoring: mon-01 con Grafana, Prometheus, Loki, Alloy

## Regole

- Procedi uno step alla volta.
- Non implementare AI ora.
- Non implementare autenticazione.
- Non attivare irrigazione.
- Non usare GORM.
- Non usare tRPC.
- Non usare GraphQL.
- Non usare backend Next.js per business logic.
- Non salvare immagini nel DB.
- Non containerizzare PostgreSQL principale.
- Esporre /metrics su API e Worker.
- Frontend usa solo OpenAPI generated client.
- Realtime MVP con polling.
- Notifiche MVP solo web.

## Primo compito

Leggi:

1. docs/STEP_00_PROJECT_OVERVIEW.md
2. docs/DECISIONS.md
3. docs/STEP_01_MONOREPO_SETUP.md

Poi implementa solo STEP 01.
