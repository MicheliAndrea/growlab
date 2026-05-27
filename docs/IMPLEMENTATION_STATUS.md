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

- `sqlc` e `goose` non sono installati in questo ambiente, quindi non sono stati eseguiti realmente.
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
- In questo ambiente `goose` non e installato, quindi `make migrate-up` ha eseguito solo la validazione strutturale locale delle migrazioni.
