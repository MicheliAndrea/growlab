# Implementation Status

## STEP 01 - Monorepo Setup

Completato.

- Creata la struttura monorepo base.
- Aggiunti placeholder `.gitkeep` per directory vuote.
- Aggiunti `Makefile`, `.env.example`, `.gitignore`, `README.md`.
- Impostato `openapi/growlab.openapi.yaml` come scheletro OpenAPI valido senza endpoint applicativi.

Comandi verificati:

```bash
find apps workers firmware packages database infrastructure openapi -maxdepth 3 -print
make --no-print-directory dev dev-web dev-api dev-worker build test lint docker-config openapi-generate sqlc migrate-up migrate-down
```

## STEP 02 - Infrastructure Docker

Completato.

- Aggiunto `infrastructure/docker/docker-compose.yml` per `app-01`.
- Definiti i servizi `growlab-web`, `growlab-api`, `growlab-worker`, `growlab-emqx`, `growlab-redis`, `growlab-ollama`.
- PostgreSQL/TimescaleDB resta esterno su `pg-01`.
- Definiti i volumi Docker richiesti.
- Redis e Ollama non espongono porte host.
- Ollama e presente con profilo Compose `ai`, quindi non parte nel profilo predefinito.
- Aggiunti Dockerfile placeholder per web, API e worker, da completare negli step applicativi dedicati.

Comandi verificati:

```bash
docker compose -f infrastructure/docker/docker-compose.yml config
docker compose --profile ai -f infrastructure/docker/docker-compose.yml config
docker compose --profile ai -f infrastructure/docker/docker-compose.yml config --services
docker compose --profile ai -f infrastructure/docker/docker-compose.yml config --volumes
```

## STEP 03 - Database + TimescaleDB

Completato.

- Aggiunta la migrazione goose iniziale `database/migrations/000001_init_schema.sql`.
- Definite tutte le tabelle richieste dallo step.
- Abilitate le extension `timescaledb` e `pgcrypto`.
- Create hypertable TimescaleDB per `sensor_readings` e `device_heartbeats`.
- Usati UUID e `timestamptz`; le immagini sono salvate come `storage_path`, non come blob nel DB.
- Usato JSONB solo per campi `metadata`, `config` e `calibration`.
- Aggiunte query sqlc minime in `database/queries`.
- Aggiunto `sqlc.yaml` con generazione Go `pgx/v5` verso `database/generated`.
- Collegati i target `make sqlc`, `make migrate-up` e `make migrate-down`.

Comandi verificati:

```bash
find database -maxdepth 4 -type f | sort
make --no-print-directory -n sqlc
make --no-print-directory -n migrate-up
make --no-print-directory -n migrate-down
rg -o "CREATE TABLE [a-z_]+" database/migrations/000001_init_schema.sql
rg -n "jsonb" database/migrations/000001_init_schema.sql
! rg -n "\\b(ai|ollama|analysis)\\b|ai_" database/migrations database/queries
```

Note:

- Le migrazioni reali richiedono il PostgreSQL/TimescaleDB esterno su `pg-01`.

## STEP 03B - Database Feature Enhancements

Completato.

- Aggiunto `docs/STEP_03B_DATABASE_FEATURE_ENHANCEMENTS.md`.
- Aggiunta la migrazione incrementale `database/migrations/000002_feature_enhancements.sql`.
- Integrate nello schema le feature attuali: `system_events`, stati alert `active/acknowledged/resolved`, `zone_profiles`, salute manuale pianta, `plant_tasks`, `device_capabilities`, `sensor_calibrations`, `lighting_profiles`, provisioning metadata, firmware channels, OTA dry-run e growth tracking immagini.
- Aggiornate le query sqlc minime in `database/queries/feature_enhancements.sql`.
- Aggiornata la query `ListOpenSystemAlerts` per usare `active`.
- Aggiunto modulo Go minimo con repository sopra interfaccia compatibile sqlc in `internal/repository`.
- Aggiunto fallback locale `tools/sqlc-lite` per validazione strutturale quando il binario `sqlc` non e installato.
- Aggiunto fallback locale `tools/goose-lite` per validazione strutturale quando il binario `goose` non e installato.
- Aggiornati `docs/STEP_03_DATABASE_TIMESCALE.md`, `docs/STEP_04_OPENAPI_CONTRACT.md` e `docs/STEP_19_FINAL_AUDIT.md`.

Feature lasciate solo documentate:

- rules engine completo;
- digital twin/layout visuale zone;
- kiosk mode UI;
- dashboard Grafana complete;
- QR provisioning completo;
- plant passport export;
- export JSON/CSV;
- AI plant health score;
- advanced image analysis.

Comandi verificati:

```bash
make sqlc
make migrate-up
make migrate-down
go test ./...
go build ./...
```

Note:

- Se `goose` e installato, `make migrate-up` applica le migrazioni al PostgreSQL/TimescaleDB esterno su `pg-01`.
- Il Makefile rileva anche binari installati con `go install` in `$HOME/go/bin`.

## STEP 04 - OpenAPI Contract

Completato.

- Aggiornato `openapi/growlab.openapi.yaml` come source of truth OpenAPI 3.0.3.
- Aggiunti gli endpoint minimi di STEP 04 per health, zone, piante, device, luci, firmware e irrigazione disabilitata.
- Integrati nel contratto i moduli STEP 03B: system events, system alerts, zone profiles, plant tasks, device capabilities, sensor calibrations, lighting profiles, firmware channels, OTA dry-run, provisioning metadata e growth tracking immagini.
- Aggiunte response standard `BadRequest` e `NotFound`.
- Definita `IrrigationDisabledResponse` con codice `IRRIGATION_DISABLED`.
- Aggiunto `orval.config.ts` per generare il client TypeScript in `packages/openapi-client`.
- Aggiunto `packages/openapi-client/package.json` e mutator fetch `packages/openapi-client/src/runtime/fetcher.ts`.
- Aggiunto workspace pnpm root e lockfile.
- Collegato `make openapi-generate` a validazione YAML e Orval.

Comandi verificati:

```bash
make openapi-generate
python3 - <<'PY'
import yaml
from pathlib import Path
spec = yaml.safe_load(Path('openapi/growlab.openapi.yaml').read_text())
print(spec['openapi'])
print(len(spec['paths']))
print(len(spec['components']['schemas']))
PY
python3 -c "import yaml; yaml.safe_load(open('openapi/growlab.openapi.yaml'))"
make sqlc
go test ./...
go build ./...
```

Note:

- Orval genera il client sotto `packages/openapi-client/src/generated`, ignorato da git come artifact generato.

## STEP 05 - Go API Foundation

Completato.

- Aggiunta foundation API Go + Gin in `apps/api`.
- Aggiunto entrypoint `apps/api/cmd/api/main.go`.
- Aggiunta configurazione env in `apps/api/internal/config`.
- Aggiunta connessione PostgreSQL via `pgxpool`.
- Aggiunta connessione Redis opzionale.
- Aggiunto router Gin con CORS locale, recovery, `GET /api/health` e `GET /metrics`.
- Aggiunto modello errore JSON standard.
- Aggiunte metriche Prometheus minime:
  - `growlab_api_requests_total`
  - `growlab_api_request_duration_seconds`
  - `growlab_api_errors_total`
  - `growlab_api_build_info`
- Aggiunto graceful shutdown con `slog`.
- Aggiornato `apps/api/Dockerfile` per buildare il binario API.
- Collegato `make dev-api` al server API.
- Lasciati `make build`, `make test` e `make lint` come target non pesanti per evitare compilazioni globali accidentali.

Verifiche leggere eseguite:

```bash
python3 - <<'PY'
# verifica struttura file STEP 05
PY
rg -n "GET\\(\"/api/health\"|GET\\(\"/metrics\"|cors\\.New|slog|signal\\.NotifyContext|OpenPostgres|OpenRedis|growlab_api_requests_total|growlab_api_request_duration_seconds|growlab_api_errors_total|growlab_api_build_info" apps/api
gofmt -w apps/api/cmd/api/main.go apps/api/internal/config/config.go apps/api/internal/database/postgres.go apps/api/internal/database/redis.go apps/api/internal/handlers/errors.go apps/api/internal/handlers/health.go apps/api/internal/http/router.go apps/api/internal/http/router_test.go apps/api/internal/metrics/metrics.go apps/api/internal/middleware/metrics.go
git diff --check
```

Note:

- Per scelta operativa non sono stati eseguiti `go build ./...`, `go test ./...`, `make build` o `make test`, per evitare compilazioni globali pesanti.
- Il modulo Go resta root-level (`go.mod` alla radice) invece di creare un modulo annidato in `apps/api`, cosi il monorepo mantiene un solo modulo Go fino a diversa decisione architetturale.
