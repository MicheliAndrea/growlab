# GrowLab

GrowLab e una piattaforma locale per home lab dedicata a piante, zone, sensori IoT, controllo luci, storico dati, firmware ESP32 e predisposizione futura per AI e irrigazione.

Questo repository e impostato come monorepo. Lo STEP 01 crea solo la struttura base, senza feature applicative.

## Stack previsto

- Backend API: Go + Gin
- Worker: Go separato
- Frontend: Next.js App Router + TypeScript
- UI: shadcn/ui + TailwindCSS
- API: REST + OpenAPI
- Client TypeScript: Orval
- Database: PostgreSQL + TimescaleDB esterno su `pg-01`
- DB access: pgx + sqlc
- Migrazioni: goose
- MQTT: EMQX
- Cache: Redis
- Lighting: Shelly Dimmer 2 local HTTP API
- Firmware: ESP32 PlatformIO + Arduino
- Deploy: Docker Compose su `app-01`
- Monitoring: repo homelab separata su `mon-01` con Grafana, Prometheus, Loki e Alloy

## Struttura

```text
apps/
  web/
  api/
workers/
  growlab-worker/
firmware/
  esp32-growlab/
packages/
  contracts/
  openapi-client/
database/
  migrations/
  queries/
  generated/
infrastructure/
  docker/
  mqtt/
  scripts/
docs/
prompts/
openapi/
  growlab.openapi.yaml
```

## Comandi root

```bash
make dev
make dev-web
make dev-api
make dev-worker
make build
make test
make lint
make docker-config
make security-check
make backup
make openapi-generate
make sqlc
make migrate-up
make migrate-down
```

I target sono placeholder nello STEP 01 e verranno collegati agli strumenti reali negli step successivi.
