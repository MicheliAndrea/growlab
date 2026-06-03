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

- Aggiunto `infrastructure/docker/docker-compose.yml` per `app-host`.
- Definiti i servizi `growlab-web`, `growlab-api`, `growlab-worker`, `growlab-emqx`, `growlab-redis`, `growlab-ollama`.
- PostgreSQL/TimescaleDB resta esterno su `db-host`.
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

- Le migrazioni reali richiedono il PostgreSQL/TimescaleDB esterno su `db-host`.

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
- digital twin geometrico completo e layout visuale zone persistente;
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

- Se `goose` e installato, `make migrate-up` applica le migrazioni al PostgreSQL/TimescaleDB esterno su `db-host`.
- Il Makefile rileva anche binari installati con `go install` in `$HOME/go/bin`.

## STEP 04 - OpenAPI Contract

Completato.

- Aggiornato `openapi/growlab.openapi.yaml` come source of truth OpenAPI 3.0.3.
- Aggiunti gli endpoint minimi di STEP 04 per health, zone, piante, device, luci, firmware e irrigazione disabilitata.
- Integrati nel contratto i moduli STEP 03B: system events, system alerts, zone profiles create/list/activate, plant tasks create/list/update status, device capabilities create/list/update enabled, sensor calibrations create/list/update status, lighting profiles create/list/set default, firmware channels con default configurabile, OTA dry-run, provisioning metadata con revoke/expire manuale e growth tracking immagini create/update.
- Aggiunti i contratti telemetry per `GET /api/telemetry/latest` e `GET /api/sensors/{id}/readings`.
- Aggiunti i contratti rules engine MVP per regole manuali, valutazioni e storico.
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

## STEP 06 - Go API Domain

Completato.

- Collegato il domain handler all'entrypoint API.
- Aggiunto repository DB minimale in `apps/api/internal/repositories`, con normalizzazione record verso JSON e campi camelCase.
- Aggiunto service domain in `apps/api/internal/services/domain.go`.
- Aggiunti handler sottili in `apps/api/internal/handlers/domain.go`.
- Registrate le rotte domain in `apps/api/internal/http/router.go`.
- Coperti i moduli principali: zone, zone profiles create/list/activate, piante, plant timeline, Plant Wiki, immagini metadata create/update, plant tasks create/list/update status, system events, system alerts, rules engine MVP, device capabilities create/list/update enabled, provisioning metadata con revoke/expire manuale, sensor calibrations create/list/update status, lighting systems/profiles create/list/set default, firmware metadata con channel default configurabile, OTA metadata e irrigation disabled.
- Allineato OpenAPI con le rotte Plant Wiki e con `growAreaId` obbligatorio per le zone, coerente con il vincolo DB.
- Il provisioning device espone create/claim flow, con token mostrato solo in risposta di creazione e mai persistito in chiaro.
- Il modulo irrigazione continua a non avviare nulla: `POST /api/irrigation/{id}/manual-run` ritorna `IRRIGATION_DISABLED`.

Verifiche leggere eseguite:

```bash
gofmt -w apps/api/cmd/api/main.go apps/api/internal/repositories/repository.go apps/api/internal/services/domain.go apps/api/internal/handlers/domain.go apps/api/internal/http/router.go
python3 -c "import yaml; yaml.safe_load(open('openapi/growlab.openapi.yaml')); print('openapi yaml ok')"
make openapi-generate
git diff --check
```

Note:

- Per scelta operativa non sono stati eseguiti `go build ./...`, `go test ./...`, `make build` o `make test`.

## STEP 07 - Go Worker MQTT

Completato.

- Aggiunto worker Go separato in `workers/growlab-worker`.
- Aggiunto entrypoint `workers/growlab-worker/cmd/worker/main.go`.
- Aggiunti package worker per config, metrics, MQTT client, processor payload e store PostgreSQL.
- Il worker si connette a EMQX via Paho MQTT e sottoscrive:
  - `growlab/devices/+/telemetry`
  - `growlab/devices/+/heartbeat`
  - `growlab/devices/+/status`
  - `growlab/devices/+/ota/status`
- Implementato parsing JSON e validazione payload.
- Implementato salvataggio `sensor_readings`.
- Implementato salvataggio `device_heartbeats`.
- Aggiunta migrazione `database/migrations/000003_worker_mqtt_ingestion.sql` per `devices.last_seen_at`.
- Implementato aggiornamento `devices.last_seen_at`, `devices.status` e `devices.firmware_version` dai messaggi MQTT.
- Implementato aggiornamento metadata/stato OTA job da topic `ota/status`.
- Aggiunti endpoint API `GET /api/telemetry/latest` e `GET /api/sensors/{id}/readings` per leggere ultime letture e storico sensore a finestra limitata.
- Aggiunte metriche Prometheus worker:
  - `growlab_worker_mqtt_messages_total`
  - `growlab_worker_mqtt_errors_total`
  - `growlab_worker_mqtt_processing_duration_seconds`
  - `growlab_worker_build_info`
- Aggiornato `workers/growlab-worker/Dockerfile`.
- Collegato `make dev-worker` al comando worker.
- Aggiornato OpenAPI `Device` con `lastSeenAt`.

Verifiche leggere eseguite:

```bash
gofmt -w workers/growlab-worker/cmd/worker/main.go workers/growlab-worker/internal/config/config.go workers/growlab-worker/internal/metrics/metrics.go workers/growlab-worker/internal/mqtt/client.go workers/growlab-worker/internal/processor/processor.go workers/growlab-worker/internal/store/store.go
make sqlc
GOPROXY=off GOCACHE=/tmp/growlab-go-build go list ./workers/growlab-worker/...
make openapi-generate
```

Note:

- Per scelta operativa non sono stati eseguiti `go build ./...`, `go test ./...`, `make build` o `make test`.
- `go mod tidy` e stato eseguito solo per riallineare `go.mod`/`go.sum` alla nuova dipendenza MQTT.

## STEP 08 - Next.js Foundation

Completato.

- Creata app Next.js App Router in `apps/web`.
- Configurati TypeScript strict, TailwindCSS, PostCSS, ESLint flat config e Next standalone output.
- Aggiunto `components.json` per shadcn/ui.
- Aggiunti componenti UI locali shadcn-style: button, card, badge, input, label e chart wrapper.
- Aggiunto provider TanStack Query in `apps/web/app/providers.tsx`.
- Aggiunta predisposizione React Hook Form + Zod con schema base in `apps/web/lib/forms.ts`.
- Aggiunta predisposizione Recharts con `MiniLineChart`.
- Aggiunto import del client Orval in `apps/web/lib/api.ts`.
- Aggiornato runtime fetcher Orval per la firma generata da Orval.
- Aggiunta predisposizione WASM in `apps/web/lib/wasm`.
- Aggiornato `apps/web/Dockerfile` con build standalone.
- Collegato `make dev-web` a `pnpm --filter @growlab/web dev`.
- Aggiornato workspace pnpm e lockfile con le dipendenze web.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web package.json packages/openapi-client/src/runtime/fetcher.ts pnpm-workspace.yaml
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
pnpm --filter @growlab/web exec eslint .
pnpm --dir apps/web exec next dev --hostname 127.0.0.1 --port 3000
curl -I http://127.0.0.1:3000
```

Note:

- Per scelta operativa non sono stati eseguiti `pnpm --filter @growlab/web build`, `make build` o build globali.
- Il dev server avviato per la verifica STEP 08 e stato fermato prima dello STEP 09.

## STEP 09 - Next.js Dashboard UI

Completato.

- Aggiunta dashboard condivisa per `/` e `/dashboard`.
- Aggiornato `AppShell` con navigazione reale desktop/mobile verso tutte le pagine STEP 09.
- Aggiunte pagine operative:
  - `/plants`
  - `/zones`
  - `/devices`
  - `/lighting`
  - `/images`
  - `/firmware`
  - `/settings`
- Aggiunto layer query TanStack in `apps/web/lib/queries.ts` sopra il client OpenAPI/Orval.
- Aggiunto polling frontend:
  - 30 secondi per health, zone, piante, device, luci, firmware e timeline.
  - 15 secondi per alert attivi.
- Aggiunti componenti dashboard riusabili per header, metriche, pannelli, righe, badge, stati loading/error/empty.
- Implementato Alert MVP nella dashboard web con acknowledge/resolve.
- Aggiunti grafici dashboard Recharts per carico operativo, distribuzione risorse, alert, salute piante, stato device e severita eventi.
- Aggiunta sezione dashboard `Latest telemetry` basata su `GET /api/telemetry/latest`.
- Aggiunto grafico `Telemetry coverage` per copertura sensori per tipo.
- Aggiunto storico letture nel pannello `Sensor calibration`, basato su `GET /api/sensors/{id}/readings`.
- Aggiunto pannello rules engine nella console `Operations` con creazione regola, valutazione manuale, dry-run predefinito e storico valutazioni.
- Aggiunta form `Add capability` nella pagina `Devices` per creare manualmente capability device con config e metadata JSON.
- Aggiunto toggle manuale `Enable/Disable` sulle capability device, tramite `PATCH /api/devices/{id}/capabilities/{capabilityId}`.
- Aggiunti controlli checklist nel dettaglio pianta per marcare task come `done`, riaprire in `todo`, `skipped` o `cancelled`.
- Aggiunto bottone `Activate` sui target profile della zona; l'attivazione usa transazione e mantiene un solo profilo attivo per zona.
- Aggiunto `Set default` sui lighting profiles; il cambio default usa transazione e mantiene un solo default per zona senza inviare comandi Shelly.
- Aggiunti `Confirm`, `Retire` e `Reopen` sulle sensor calibrations; `confirmed` valorizza `confirmed_at`, `draft` lo azzera e `retired` preserva lo storico.
- Rivisto design system generale con token CSS light/dark e variabili chart.
- Aggiunto selettore tema `Light / Dark / System`, persistito in `localStorage`.
- Allineato il runtime fetcher Orval al default API locale `http://localhost:8080` quando `NEXT_PUBLIC_API_BASE_URL` non e impostata.

Verifiche leggere eseguite:

```bash
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
pnpm --filter @growlab/web exec eslint .
pnpm exec prettier --write apps/web/app apps/web/components apps/web/lib packages/openapi-client/src/runtime/fetcher.ts
git diff --check
```

Note:

- Per scelta operativa non sono stati eseguiti `pnpm --filter @growlab/web build`, `make build` o build globali.
- Il dev server Next.js non e stato riavviato dopo lo stop richiesto.

## STEP 10 - Plants, Zones, History

Completato.

- Confermati CRUD zones e plants gia esposti dallo STEP 06.
- Aggiunti endpoint plant events:
  - `GET /api/plants/{id}/events`
  - `POST /api/plants/{id}/events`
- Aggiornato OpenAPI con `PlantEvent` e `PlantEventCreateRequest`.
- Aggiornata query sqlc `CreatePlantEvent`.
- La creazione pianta registra lo stato salute iniziale in `plant_status_history`.
- L'update pianta registra una voce history quando cambia `currentHealthStatus`.
- Aggiunte pagine frontend:
  - `/zones/new`
  - `/zones/{id}`
  - `/zones/{id}/edit`
  - `/plants/new`
  - `/plants/{id}`
  - `/plants/{id}/edit`
- Aggiornate liste `/zones` e `/plants` con azioni create/open/edit.
- Aggiunti form create/edit per zone e piante.
- Aggiunto dettaglio zona con target profiles e piante assegnate.
- Aggiunto dettaglio pianta con timeline, eventi manuali, checklist e form evento.
- Aggiunto anche il form manuale per creare task di checklist direttamente dal dettaglio pianta.
- Aggiunta sezione Plant Wiki base nella lista piante.

## STEP 03B - Zone Profiles UI

Implementato il create flow minimale per i target profiles di zona.

- Aggiunto `createZoneProfileEntry` nei query helpers.
- Aggiunto il form `ZoneProfileForm` nel dettaglio zona.
- Il dettaglio zona ora permette di creare un target profile con `name`, `isActive`, `targetConfig` e `metadata`.
- Le liste restano lette dal backend e si aggiornano dopo la creazione.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/components/zones/zone-detail.tsx apps/web/components/zones/zone-profile-form.tsx apps/web/lib/queries.ts docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
git diff --check
```

## STEP 03B - Zone Layout Preview

Aggiunta una preview persistente del layout zona nel dettaglio zona.

- Aggiunti `ZoneLayoutPreview` e `ZoneLayoutEditor` sotto `apps/web/components/zones/`.
- Il layout può essere salvato in `zone.metadata.layout` e poi riutilizzato dalla preview.
- La preview combina piante assegnate e layout persistente, con fallback sintetico se il layout non esiste.
- Il pannello mostra anche un riepilogo dei target leggibili dal JSON del profilo attivo.
- Questo è un editor 2D a griglia con drag/drop e dimensioni rows/columns; non usa ancora coordinate libere o una canvas geometrica completa.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/components/zones/zone-detail.tsx apps/web/components/zones/zone-layout-preview.tsx apps/web/components/zones/zone-layout-editor.tsx docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
git diff --check
```

## STEP 03B - System Operations UI

Implementata una pagina operativa dedicata per eventi e alert di sistema.

- Aggiunto `createSystemAlertEntry`, `createSystemEventEntry`, `acknowledgeSystemAlertEntry` e `resolveSystemAlertEntry` nei query helpers.
- Aggiunta la pagina `/operations`.
- La pagina permette di creare alert manuali, creare eventi manuali, vedere gli alert attivi e gestirli con acknowledge/resolve.
- La pagina mostra anche gli eventi recenti in stream separato dal dashboard principale.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/components/operations/operations-console.tsx apps/web/app/operations/page.tsx apps/web/components/layout/app-shell.tsx apps/web/lib/queries.ts docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
git diff --check
```

## STEP 03B - Lighting Profiles UI

Implementato il create flow minimale per i lighting profiles.

- Aggiunto `createLightingProfileEntry` nei query helpers.
- Aggiunto il form `LightingProfileForm` nella pagina `Lighting`.
- La pagina permette di scegliere zona, sistema luce opzionale, timezone e step JSON.
- La lista profili mostra anche il flag `default` oltre allo stato `enabled`.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/app/lighting/page.tsx apps/web/components/lighting/lighting-profile-form.tsx apps/web/lib/queries.ts docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
git diff --check
```

## STEP 23 - Kiosk Mode

Implementata una pagina read-only dedicata al display sempre aperto.

- Aggiunta la route `/kiosk`.
- Aggiunto `Kiosk` alla navigazione principale.
- La pagina mostra ora/data, stato API, zone, piante, device online/offline, telemetria live, alert attivi, ultimi eventi e ultime immagini.
- Nessuna azione pericolosa esposta nella vista kiosk.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/components/kiosk/kiosk-view.tsx apps/web/app/kiosk/page.tsx apps/web/components/layout/app-shell.tsx docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
git diff --check
```

## STEP 10 / STEP 03B - Plant Photo Timeline

Implementata una timeline fotografica leggibile sopra i metadata immagine già esistenti.

- Aggiunto `PlantPhotoTimeline`.
- La timeline è visibile nel dettaglio pianta e nella pagina immagini.
- Le immagini sono ordinate per data di acquisizione/upload.
- Sono esposti growth stage, tag e indicazione di growth tracking quando presente.
- Aggiunto editor manuale nella pagina immagini per aggiornare growth stage, tag e `growth_tracking` JSON.
- Aggiunto `PATCH /api/images/{id}` per aggiornare metadata immagine senza modificare il file.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/components/images/plant-photo-timeline.tsx apps/web/components/plants/plant-detail.tsx apps/web/app/images/page.tsx docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
git diff --check
```

## STEP 25 - Device Provisioning

Implementato il create/claim/revoke/expire flow minimo per il provisioning dei device.

- Aggiunto `DeviceProvisioningPanel` nella pagina `Devices`.
- La vista permette di selezionare o cercare un device, generare un provisioning token, copiare il claim URL, visualizzare il QR code e marcare una richiesta come claimed.
- Aggiunti `Revoke` e `Mark expired` per chiudere manualmente provisioning pendenti tramite `PATCH /api/devices/{id}/provisioning/{provisioningId}`.
- Il token non viene salvato in chiaro nel database: resta solo l'hash, mentre il token viene restituito una sola volta in risposta alla creazione.
- La UI continua a mostrare provisioning status, expiry, claimed-at, config JSON e metadata.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/components/devices/device-provisioning-panel.tsx apps/web/app/devices/page.tsx apps/web/lib/queries.ts docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
git diff --check
```

## STEP 03B - Device Detail UI

Implementata una pagina dettaglio device per capacità e snapshot runtime.

- Aggiunta la route `/devices/{id}`.
- Aggiunto il link `Open` nella fleet list.
- La pagina mostra proprietà device, config grezza, capabilities e provisioning snapshot.
- Il capability model diventa leggibile in un punto unico, senza assumere un claim flow non esposto dal backend.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/components/devices/device-detail.tsx apps/web/app/devices/[id]/page.tsx apps/web/app/devices/page.tsx apps/web/lib/queries.ts docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
git diff --check
```

Verifiche leggere eseguite:

```bash
gofmt -w apps/api/internal/http/router.go apps/api/internal/handlers/domain.go apps/api/internal/services/domain.go
python3 -c "import yaml; yaml.safe_load(open('openapi/growlab.openapi.yaml')); print('openapi yaml ok')"
make sqlc
make openapi-generate
pnpm exec prettier --write apps/web/app apps/web/components apps/web/lib packages/openapi-client/src/generated
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
pnpm --filter @growlab/web exec eslint .
GOCACHE=/tmp/growlab-go-build go list ./apps/api/...
git diff --check
```

Note:

- Per scelta operativa non sono stati eseguiti `go build ./...`, `go test ./...`, `pnpm build`, `make build` o build globali.
- Il dev server Next.js non e stato riavviato.

## STEP 11 - Images Upload

Completato.

- Aggiunta migrazione `database/migrations/000004_plant_image_zone_association.sql`.
- `plant_images` ora mantiene `zone_id` storico, backfillato dalla zona corrente della pianta.
- Aggiunto indice `plant_images_zone_uploaded_idx`.
- Implementato upload multipart reale in `POST /api/plants/{id}/images`.
- Validati MIME e dimensione file:
  - JPEG
  - PNG
  - WebP
  - limite default `15 MiB`, configurabile con `GROWLAB_IMAGE_UPLOAD_MAX_BYTES`.
- Salvati file su filesystem sotto `GROWLAB_IMAGE_STORAGE_PATH`.
- Salvati nel DB solo metadata, path relativo e checksum SHA-256.
- Aggiunto `GET /api/plants/{id}/images` per metadata gallery.
- Aggiunto `GET /api/images/{id}/file` per servire file immagine in modo controllato.
- Aggiornato OpenAPI e rigenerato client Orval.
- Aggiornato fetcher Orval per supportare `FormData` senza forzare header JSON.
- Aggiunto form upload immagine nel dettaglio pianta.
- Aggiunta gallery nel dettaglio pianta.
- Aggiornata pagina `/images` come gallery globale.
- Aggiornati `.env.example` e Docker Compose con `GROWLAB_IMAGE_UPLOAD_MAX_BYTES`.

Verifiche leggere eseguite:

```bash
gofmt -w apps/api/cmd/api/main.go apps/api/internal/config/config.go apps/api/internal/handlers/domain.go apps/api/internal/http/router.go apps/api/internal/services/domain.go
python3 -c "import yaml; yaml.safe_load(open('openapi/growlab.openapi.yaml')); print('openapi yaml ok')"
make sqlc
make openapi-generate
pnpm exec prettier --write apps/web/app apps/web/components apps/web/lib packages/openapi-client/src/runtime/fetcher.ts packages/openapi-client/src/generated infrastructure/docker/docker-compose.yml
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
pnpm --filter @growlab/web exec eslint .
GOCACHE=/tmp/growlab-go-build go list ./apps/api/...
git diff --check
```

Note:

- Per scelta operativa non sono stati eseguiti `go build ./...`, `go test ./...`, `pnpm build`, `make build` o build globali.
- Il dev server Next.js non e stato riavviato.
- `prettier` non e stato applicato a `.env.example` perche non ha parser inferibile.

## STEP 12 - Shelly Dimmer 2 Lighting

Completato.

- Aggiunto package Go `apps/api/internal/shelly`.
- Implementate funzioni Shelly:
  - `GetState`
  - `TurnOn`
  - `TurnOff`
  - `SetBrightness`
- Client HTTP con timeout configurabile tramite `GROWLAB_SHELLY_TIMEOUT`.
- I comandi usano endpoint locale Shelly Dimmer 2 `/light/0`.
- Aggiunti endpoint API:
  - `GET /api/lighting/{id}/state`
  - `GET /api/lighting/{id}/events`
  - `POST /api/lighting/{id}/on`
  - `POST /api/lighting/{id}/off`
  - `POST /api/lighting/{id}/brightness`
- I comandi ON/OFF/brightness chiamano Shelly solo per sistemi `provider = 'shelly'` con `endpoint_url` configurato.
- Ogni comando registra una riga in `lighting_events`.
- I fallimenti comando/stato registrano eventi `*_failed` quando possibile.
- Aggiornato OpenAPI con `LightingState`, `LightingEvent` e `endpointUrl` su `LightingSystem`.
- Aggiunta query sqlc `ListLightingEvents`.
- Aggiornata pagina `/lighting` con card stato, pulsanti ON/OFF, slider brightness, polling e storico eventi.
- Aggiornati `.env.example` e Docker Compose con `GROWLAB_SHELLY_TIMEOUT`.

Verifiche leggere eseguite:

```bash
gofmt -w apps/api/cmd/api/main.go apps/api/internal/config/config.go apps/api/internal/shelly/client.go apps/api/internal/services/domain.go apps/api/internal/handlers/domain.go apps/api/internal/http/router.go
python3 -c "import yaml; yaml.safe_load(open('openapi/growlab.openapi.yaml')); print('openapi yaml ok')"
make sqlc
make openapi-generate
pnpm exec prettier --write apps/web/app/lighting/page.tsx apps/web/components/lighting/lighting-control-card.tsx apps/web/lib/queries.ts packages/openapi-client/src/generated infrastructure/docker/docker-compose.yml
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
pnpm --filter @growlab/web exec eslint .
GOCACHE=/tmp/growlab-go-build go list ./apps/api/...
git diff --check
```

Note:

- Per scelta operativa non sono stati eseguiti `go build ./...`, `go test ./...`, `pnpm build`, `make build` o build globali.
- Il dev server Next.js non e stato riavviato.
- `prettier` non e stato applicato a `.env.example` perche non ha parser inferibile.

## STEP 13 - OTA Firmware

Completato.

- Implementato upload multipart reale in `POST /api/firmware`.
- Salvati artefatti firmware su filesystem sotto `GROWLAB_FIRMWARE_STORAGE_PATH`.
- Aggiunto limite upload `GROWLAB_FIRMWARE_UPLOAD_MAX_BYTES`, default `32 MiB`.
- Salvati in `firmware_versions` path relativo, SHA-256, size, channel e metadata upload.
- Il `channelId` omesso usa il firmware channel default configurabile.
- Aggiunto `POST /api/firmware/channels/{id}/default` con UI manuale sulla pagina `/firmware`.
- Aggiunto `GET /api/firmware/{id}/file` per servire artefatti firmware da path controllato.
- Aggiunto `GET /api/devices/{id}/ota` per lista OTA job del device.
- `POST /api/devices/{id}/ota/dry-run` ora produce report minimo di compatibilita device/firmware.
- `POST /api/devices/{id}/ota` crea job `pending` e prepara `metadata.mqttCommand`.
- Il comando MQTT preparato include topic `growlab/devices/{device_uid}/ota/command` e payload con job, firmware, download URL, checksum e size.
- Nessun publish MQTT automatico e nessun update firmware automatico.
- Il worker continua a gestire lo stato OTA da `growlab/devices/+/ota/status`.
- Aggiornato OpenAPI e rigenerato client Orval.
- Aggiornata pagina `/firmware` con form upload, download artefatto, dry-run manuale con metadata, report compatibilita leggibile, creazione job e lista status OTA.
- Aggiornati `.env.example` e Docker Compose con `GROWLAB_FIRMWARE_UPLOAD_MAX_BYTES`.

Verifiche leggere eseguite:

```bash
gofmt -w apps/api/cmd/api/main.go apps/api/internal/config/config.go apps/api/internal/handlers/domain.go apps/api/internal/http/router.go apps/api/internal/services/domain.go
make openapi-generate
make sqlc
python3 -c "import yaml; yaml.safe_load(open('openapi/growlab.openapi.yaml')); print('openapi yaml ok')"
pnpm exec prettier --write openapi/growlab.openapi.yaml apps/web/app/firmware/page.tsx apps/web/components/firmware/firmware-upload-form.tsx apps/web/components/firmware/ota-control-panel.tsx apps/web/lib/api.ts apps/web/lib/queries.ts packages/openapi-client/src/runtime/fetcher.ts infrastructure/docker/docker-compose.yml docs/STEP_13_OTA_FIRMWARE.md docs/IMPLEMENTATION_STATUS.md docs/STEP_19_FINAL_AUDIT.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
pnpm --filter @growlab/web exec eslint .
GOCACHE=/tmp/growlab-go-build go list ./apps/api/...
GOCACHE=/tmp/growlab-go-build go list ./workers/growlab-worker/...
docker compose -f infrastructure/docker/docker-compose.yml config
git diff --check
```

Note:

- Per scelta operativa non vengono eseguiti `go build ./...`, `go test ./...`, `pnpm build`, `make build` o build globali.
- Il dev server Next.js non e stato riavviato.
- `prettier` non e stato applicato a `.env.example` perche non ha parser inferibile.

## STEP 14 - ESP32 Firmware

Completato.

- Aggiunto progetto PlatformIO in `firmware/esp32-growlab`.
- Configurato stack Arduino ESP32 con librerie:
  - `PubSubClient`
  - `ArduinoJson`
- Aggiunto config example `include/growlab_config.example.h`.
- Aggiunto supporto a config locale ignorata da git: `include/growlab_local_config.h`.
- Implementata connessione Wi-Fi con retry.
- Implementata connessione MQTT con retry, will status e subscribe ai topic controllo.
- Pubblicati topic compatibili con il worker:
  - `growlab/devices/{device_uid}/heartbeat`
  - `growlab/devices/{device_uid}/telemetry`
  - `growlab/devices/{device_uid}/status`
  - `growlab/devices/{device_uid}/ota/status`
- Sottoscritti topic:
  - `growlab/devices/{device_uid}/config`
  - `growlab/devices/{device_uid}/command`
  - `growlab/devices/{device_uid}/ota/command`
- Implementato heartbeat con IP, RSSI, uptime e firmware version.
- Implementata telemetry mock con letture `mock_temperature`, `mock_humidity`, `mock_soil_moisture`.
- Implementato config topic per intervalli heartbeat/telemetry e toggle telemetry mock.
- Implementato command topic solo per comandi safe:
  - `status`
  - `all_off`
  - `relay_off`
  - `pump_off`
  - `restart`
- Relay e pompa vengono portati a OFF subito al boot, prima di Wi-Fi/MQTT.
- Non sono implementati comandi ON per pompa/relay.
- Implementato placeholder OTA: riceve `ota_update`, pubblica status OTA e fallisce esplicitamente senza installare firmware.
- Aggiunto README firmware con topic, setup e note safety.

Verifiche leggere eseguite:

```bash
python3 -c "import configparser; p='firmware/esp32-growlab/platformio.ini'; c=configparser.ConfigParser(interpolation=None); c.read(p); assert c.has_section('env:esp32dev'); print('platformio ini ok')"
python3 -c "from pathlib import Path; p=Path('firmware/esp32-growlab/src/main.cpp'); s=p.read_text(); assert 'growlab/devices/' in s and 'ota/status' in s and 'setSafeOutputsOff();' in s; print('esp32 firmware static checks ok')"
pnpm exec prettier --write docs/STEP_14_ESP32_FIRMWARE.md docs/IMPLEMENTATION_STATUS.md docs/STEP_19_FINAL_AUDIT.md firmware/esp32-growlab/README.md
git diff --check
```

Note:

- Non e stato eseguito `pio run` per evitare download/build PlatformIO non richiesti.
- Per scelta operativa non vengono eseguiti `go build ./...`, `go test ./...`, `pnpm build`, `make build` o build globali.
- Il dev server Next.js non e stato riavviato.

## STEP 15 - Irrigation Safe Module

Completato.

- Aggiunta lettura config API per:
  - `GROWLAB_FEATURE_IRRIGATION_MANUAL`
  - `GROWLAB_FEATURE_IRRIGATION_AUTOMATION`
- Aggiunta safety config nel domain service.
- `GET /api/irrigation` forza risposta read-only:
  - `enabled=false`
  - `automationEnabled=false`
  - metadata con safe mode e feature flags configurate
- Aggiunto `GET /api/irrigation/safety`.
- `POST /api/irrigation/{id}/manual-run` continua a restituire sempre `IRRIGATION_DISABLED`.
- Nessun comando pompa attivo.
- Nessuna automazione.
- Nessun publish MQTT di irrigazione.
- Aggiornato OpenAPI e rigenerato client Orval.
- Aggiunta pagina frontend `/irrigation`.
- Aggiunta voce navigation `Irrigation`.
- UI irrigazione read-only con controlli manual run disabilitati.

Verifiche leggere eseguite:

```bash
gofmt -w apps/api/cmd/api/main.go apps/api/internal/config/config.go apps/api/internal/handlers/domain.go apps/api/internal/http/router.go apps/api/internal/services/domain.go
make openapi-generate
python3 -c "import yaml; yaml.safe_load(open('openapi/growlab.openapi.yaml')); print('openapi yaml ok')"
pnpm exec prettier --write openapi/growlab.openapi.yaml apps/web/app/irrigation/page.tsx apps/web/components/layout/app-shell.tsx apps/web/lib/queries.ts docs/STEP_15_IRRIGATION_SAFE_MODULE.md docs/IMPLEMENTATION_STATUS.md docs/STEP_19_FINAL_AUDIT.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
pnpm --filter @growlab/web exec eslint .
GOCACHE=/tmp/growlab-go-build go list ./apps/api/...
git diff --check
```

Note:

- Per scelta operativa non vengono eseguiti `go build ./...`, `go test ./...`, `pnpm build`, `make build` o build globali.
- Il dev server Next.js non e stato riavviato.

## STEP 16 - Monitoring & Observability

Completato e rifinito come integrazione esterna.

- Il monitoring generico homelab e stato spostato fuori dal repository GrowLab.
- Creata repo dedicata:
  - `homelab-monitoring`
- La repo homelab monitoring contiene:
  - Docker Compose monitoring;
  - Grafana;
  - Prometheus;
  - Loki;
  - Grafana Alloy;
  - cAdvisor opzionale con profile `container-metrics`;
  - Redis exporter opzionale con profile `redis-exporter`;
  - Prometheus file service discovery;
  - provisioning Grafana datasource;
  - dashboard GrowLab applicativa;
  - guida per aggiungere altri servizi homelab.
- GrowLab mantiene solo l'integrazione:
  - endpoint API `/metrics`;
  - endpoint worker `/metrics`;
  - `docs/MONITORING_INTEGRATION.md`;
  - riferimenti operativi per datasource TimescaleDB/PostgreSQL.
- Rimosso il target Makefile `make monitoring-config`.
- Rimosse le configurazioni `infrastructure/monitoring` dal repository GrowLab.
- Rimosso il backup della configurazione monitoring dallo script backup GrowLab.
- Non sono stati introdotti node exporter, Proxmox monitoring o Alertmanager.

Verifiche leggere eseguite:

```bash
cd homelab-monitoring
docker compose --env-file .env.example -f docker-compose.yml config
docker compose --env-file .env.example -f docker-compose.yml --profile redis-exporter --profile container-metrics config
pnpm exec prettier --write docs/STEP_16_MONITORING_OBSERVABILITY.md docs/MONITORING_INTEGRATION.md docs/IMPLEMENTATION_STATUS.md docs/STEP_19_FINAL_AUDIT.md
git diff --check
```

Note:

- Non sono stati avviati container monitoring.
- Per scelta operativa non vengono eseguiti `go build ./...`, `go test ./...`, `pnpm build`, `make build` o build globali.
- Il dev server Next.js non e stato riavviato.

## STEP 17 - Security, Backup, Deploy

Completato.

- Aggiunta security baseline in `docs/SECURITY_BASELINE.md`.
- Aggiunto runbook deploy in `docs/DEPLOYMENT_RUNBOOK.md`.
- Aggiunta guida backup/restore in `docs/BACKUP_RESTORE.md`.
- Hardening Docker Compose app:
  - web bind su `GROWLAB_LAN_BIND`;
  - API bind su `GROWLAB_LAN_BIND`;
  - worker metrics bind su `GROWLAB_LAN_BIND`;
  - MQTT/EMQX dashboard gia su `GROWLAB_LAN_BIND`;
  - Redis senza porte pubblicate;
  - Ollama senza porte pubblicate e dietro profile `ai`;
  - `GROWLAB_CORS_ORIGINS` cablato sull'API.
- Aggiunto `GROWLAB_CORS_ORIGINS` in `.env.example` e `infrastructure/.env.example`.
- Isolato `make docker-config` dalla `.env` locale: usa `infrastructure/.env.example`.
- Aggiunti script:
  - `infrastructure/scripts/growlab_backup.sh`;
  - `infrastructure/scripts/growlab_restore.sh`;
  - `infrastructure/scripts/security_check.sh`.
- Aggiunti target Makefile:
  - `make security-check`;
  - `make backup`.
- Backup previsto:
  - dump PostgreSQL custom con `pg_dump`;
  - volume `growlab_images`;
  - volume `growlab_firmware`;
  - configurazione Docker GrowLab;
  - `.env` locali se presenti;
  - Git bundle e status.
- La repo homelab monitoring viene salvata separatamente dai backup GrowLab.
- Restore protetto da `GROWLAB_RESTORE_CONFIRM=restore`.
- Nessuna auth introdotta.
- Nessun cambio stack.

Verifiche leggere eseguite:

```bash
bash -n infrastructure/scripts/growlab_backup.sh
bash -n infrastructure/scripts/growlab_restore.sh
bash -n infrastructure/scripts/security_check.sh
pnpm exec prettier --write docs/STEP_17_SECURITY_BACKUP_DEPLOY.md docs/SECURITY_BASELINE.md docs/BACKUP_RESTORE.md docs/DEPLOYMENT_RUNBOOK.md infrastructure/docker/docker-compose.yml
make docker-config
make security-check
git diff --check
```

Note:

- Non sono stati eseguiti backup o restore.
- Non sono stati avviati container.
- Per scelta operativa non vengono eseguiti `go build ./...`, `go test ./...`, `pnpm build`, `make build` o build globali.
- Il dev server Next.js non e stato riavviato.

## STEP 22 - Sensor Calibration

Implementato in forma manuale nel frontend.

- Aggiunta la query client `fetchSensorCalibrations`.
- Aggiunta la query client `fetchSensorReadings` per storico 24h del sensore.
- Aggiunto il mutator client `createSensorCalibrationEntry`.
- Aggiunta la sezione `Sensor calibration` nella pagina `Devices`.
- La pagina permette di caricare un sensor ID, creare una calibrazione manuale, visualizzare le calibrazioni recenti e leggere lo storico telemetria recente con mini chart.
- La procedura guidata completa resta documentata come evoluzione futura.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/components/devices/sensor-calibration-panel.tsx apps/web/app/devices/page.tsx apps/web/lib/queries.ts docs/STEP_22_SENSOR_CALIBRATION.md docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
make security-check
git diff --check
```

## Demo seed data

Implementato seed dati demo opzionale e idempotente.

- Aggiunto `database/seeds/demo.sql`.
- Aggiunto target `make seed-demo`.
- Il seed inserisce grow area, zone, Plant Wiki base, piante, task, immagini metadata, device, sensori, telemetry recente, heartbeat, capability, calibrazioni, zone profiles, lighting profile, system alert/event, firmware metadata, OTA dry-run, provisioning metadata e una regola demo manuale.
- Il seed non fa parte delle migrazioni e non viene applicato automaticamente.
- Alcune immagini/firmware demo puntano a path fittizi e sono marcati con `metadata.fileMissing=true`, quindi servono per testare UI e metadata, non download reali.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write README.md docs/NEXT_STEPS.md docs/IMPLEMENTATION_STATUS.md
git diff --check -- README.md Makefile database/seeds/demo.sql docs/NEXT_STEPS.md docs/IMPLEMENTATION_STATUS.md
```

## Database operator helpers

Implementati target Makefile leggeri per ispezionare il database reale senza applicare migrazioni.

- `make db-config` stampa host, porta, database, utente, sslmode e sorgente DSN con password redatta.
- `make db-check` usa `psql` per una query read-only su database, utente, indirizzo server e stato SSL.
- Il runbook deploy ora chiede `db-config` e `db-check` prima di `make migrate-up`.

Verifiche leggere eseguite:

```bash
make help
make db-config
pnpm exec prettier --write README.md docs/DEPLOYMENT_RUNBOOK.md docs/IMPLEMENTATION_STATUS.md
git diff --check -- Makefile README.md docs/DEPLOYMENT_RUNBOOK.md docs/IMPLEMENTATION_STATUS.md
```

## Frontend List Filters

Rafforzate le liste operative principali con filtri locali e export coerente con i risultati visibili.

- Aggiunto componente condiviso `ListFilterBar` con ricerca testuale e select native coerenti con il design system.
- Aggiunti filtri su `/plants` per testo, stato record e salute manuale.
- Aggiunti filtri su `/zones` per testo e tipo ambiente.
- Aggiunti filtri su `/devices` per testo, stato e tipo device.
- Aggiunti filtri su `/operations` per alert/eventi tramite testo e severita.
- Aggiunti filtri su `/images` per testo, pianta e growth stage.
- Aggiunti filtri su `/firmware` per testo, tipo device e channel.
- Gli export JSON/CSV di plants, zones, devices, images e firmware usano ora le righe filtrate.
- I pannelli target profiles e capabilities seguono rispettivamente le zone e i device visibili.
- Gallery, metadata editor e photo timeline seguono lo stesso filtro immagini.
- La registry firmware mostra il nome del channel quando disponibile invece dell'UUID.
- I filtri sono persistiti in `localStorage` con namespace `growlab:*`.
- Ogni filter bar persistente espone `Reset` quando ci sono filtri attivi.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/app/plants/page.tsx apps/web/app/zones/page.tsx apps/web/app/devices/page.tsx apps/web/app/images/page.tsx apps/web/app/firmware/page.tsx apps/web/components/operations/operations-console.tsx apps/web/components/dashboard/list-filters.tsx apps/web/lib/persistent-state.ts docs/NEXT_STEPS.md docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
git diff --check -- apps/web/app/plants/page.tsx apps/web/app/zones/page.tsx apps/web/app/devices/page.tsx apps/web/app/images/page.tsx apps/web/app/firmware/page.tsx apps/web/components/operations/operations-console.tsx apps/web/components/dashboard/list-filters.tsx apps/web/lib/persistent-state.ts docs/NEXT_STEPS.md docs/IMPLEMENTATION_STATUS.md
```

## Rules Scheduler, Digital Twin, QR Provisioning

Implementata la tranche avanzata richiesta su automazione consultiva, editor spaziale zona e provisioning QR.

- Aggiunta migrazione `database/migrations/000007_automation_scheduler_qr_provisioning.sql`.
- `automation_rules` ora supporta `trigger_mode`, `schedule_interval_seconds`, `scheduler_commit`, `cooldown_seconds`, `next_run_at`, `last_scheduler_run_at`, `scheduler_status` e `scheduler_error`.
- Aggiunto scheduler API opt-in con `GROWLAB_RULES_SCHEDULER_ENABLED=false` di default.
- Lo scheduler valuta solo regole `scheduled` dovute e rispetta cooldown e batch limit.
- Le azioni automatiche restano limitate a `create_alert`, `create_system_event` e `show_dashboard_suggestion`.
- Aggiunto context automatico rules engine con conteggi sistema, health piante, alert attivi e ultime letture per tipo sensore.
- Aggiunti endpoint `GET /api/automation/context` e `POST /api/automation/scheduler/run`.
- La console `/operations` permette di creare regole manuali o schedulate, configurare interval/cooldown/commit sicuro, vedere context automatico e lanciare un run delle regole dovute.
- Aggiunto digital twin avanzato in `zone.metadata.digitalTwin` con canvas a coordinate libere, tipi elemento, layer, dimensioni, rotazione, colore, note e associazione pianta opzionale.
- Il dettaglio zona mostra preview digital twin ed editor dedicato senza introdurre nuove tabelle.
- Il provisioning QR ora genera claim URL verso `/provisioning/claim?token=...` usando `GROWLAB_PUBLIC_WEB_URL`.
- Aggiunta pagina web claim QR con preview sicura e conferma claim.
- Aggiunto `GET /api/provisioning/claim?token=...` per preview senza esporre `token_hash`.
- Il claim provisioning traccia `claim_attempts`, `last_claim_attempt_at` e `claimed_metadata`.

Verifiche leggere eseguite:

```bash
make openapi-generate
make sqlc
GOCACHE=/tmp/growlab-go-build go list ./apps/api/...
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
```

## STEP 22 - Sensor Calibration Wizard

Aggiunta una procedura guidata minima dentro il pannello calibrazioni.

- Inserite letture `dry`, `wet` e `current`.
- Il pulsante di wizard compone un payload `dry-wet-linear`.
- Il form manuale resta disponibile come fallback.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/components/devices/sensor-calibration-panel.tsx docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
git diff --check
```

## STEP 12 / STEP 24 - Lighting Simulation

Aggiunta una preview visuale 24h alle lighting profile.

- La form `LightingProfileForm` mostra una simulazione delle 24 ore.
- Le barre sono calcolate dagli step JSON salvati.
- La lettura serve da check rapido prima del salvataggio.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/components/lighting/lighting-profile-form.tsx docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
git diff --check
```

## STEP 20 - Export and Plant Passport

Implementati export JSON/CSV e passport pianta lato frontend.

- Aggiunto un helper di export client-side riutilizzabile.
- Aggiunti export JSON/CSV su plants, zones, devices, images e firmware.
- Aggiunto export `plant passport` dal dettaglio pianta.
- Gli export sono read-only e non richiedono nuovi endpoint.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/lib/export.ts apps/web/components/dashboard/export-button.tsx apps/web/app/plants/page.tsx apps/web/app/zones/page.tsx apps/web/app/devices/page.tsx apps/web/app/images/page.tsx apps/web/app/firmware/page.tsx apps/web/components/plants/plant-detail.tsx docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
git diff --check
```

## STEP 21 - Rules Engine MVP

Implementato un rules engine consultivo e manuale.

- Aggiunta migrazione `database/migrations/000005_rules_engine_mvp.sql` con `automation_rules` e `automation_rule_evaluations`.
- Aggiunte query sqlc minime in `database/queries/rules.sql`.
- Aggiunti endpoint API per lista/creazione regole, valutazione manuale e storico valutazioni.
- La valutazione supporta condizioni JSON con `fact`, `operator`, `value`, gruppi `all`/`any` e contesto runtime fornito dalla UI/API.
- Le azioni consentite sono solo `create_alert`, `create_system_event` e `show_dashboard_suggestion`.
- Il frontend espone creazione regola, dry-run predefinito, commit esplicito delle sole azioni sicure e storico valutazioni nella console `Operations`.
- Non sono stati introdotti scheduler automatici, AI, comandi pompe, comandi irrigazione o modifiche lighting automatiche.

Verifiche leggere eseguite:

```bash
make openapi-generate
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
GOCACHE=/tmp/growlab-go-build go list ./apps/api/...
git diff --check -- apps/api apps/web openapi docs packages database package.json pnpm-lock.yaml
```

## STEP 25 - Device Provisioning

Implementato il create/claim flow minimo per il provisioning dei device.

- Aggiunto `DeviceProvisioningPanel` nella pagina `Devices`.
- La vista permette di selezionare o cercare un device, generare un provisioning token, copiare il claim URL, visualizzare il QR code e marcare una richiesta come claimed.
- Il token non viene salvato in chiaro nel database: resta solo l'hash, mentre il token viene restituito una sola volta in risposta alla creazione.
- La UI continua a mostrare provisioning status, expiry, claimed-at, config JSON e metadata.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/components/devices/device-provisioning-panel.tsx apps/web/app/devices/page.tsx apps/web/lib/queries.ts docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
git diff --check
```

## STEP 03B - Device Detail UI

Implementata una pagina dettaglio device per capacità e snapshot runtime.

- Aggiunta la route `/devices/{id}`.
- Aggiunto il link `Open` nella fleet list.
- La pagina mostra proprietà device, config grezza, capabilities e provisioning snapshot.
- Il capability model diventa leggibile in un punto unico, senza assumere un claim flow non esposto dal backend.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/components/devices/device-detail.tsx apps/web/app/devices/[id]/page.tsx apps/web/app/devices/page.tsx apps/web/lib/queries.ts docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
git diff --check
```

## STEP 18 - AI Future Module

Completato come guardrail e documentazione futura.

- Aggiornato `docs/STEP_18_AI_FUTURE_MODULE.md`.
- AI/Ollama resta futura e non implementata nel MVP.
- `GROWLAB_FEATURE_AI=false` resta il default negli env example.
- `growlab-ollama` resta dietro Compose profile `ai`.
- Ollama non pubblica porte host.
- Nessun endpoint OpenAPI AI introdotto.
- Nessun handler API AI introdotto.
- Nessuna UI AI introdotta.
- Nessuna tabella operativa AI introdotta.
- Nessuna automazione usa output AI.
- Aggiornata la security baseline con guardrail AI/Ollama.

Verifiche leggere eseguite:

```bash
! rg -n "/api/ai|ai/" openapi apps/api apps/web
! rg -n "CREATE TABLE .*ai|ai_" database/migrations database/queries
make docker-config
make security-check
git diff --check
```

Note:

- Non sono stati avviati container.
- Per scelta operativa non vengono eseguiti `go build ./...`, `go test ./...`, `pnpm build`, `make build` o build globali.
- Il dev server Next.js non e stato riavviato.

## STEP 19 - Final Audit

Completato con verifiche leggere.

- Aggiornato `docs/STEP_19_FINAL_AUDIT.md`.
- Aggiunto `docs/NEXT_STEPS.md`.
- Il final audit ora include anche i guardrail STEP 18.
- I next step separano deploy GrowLab, monitoring homelab esterno e future feature non operative.
- Eseguiti generator/check leggeri senza build pesanti.
- `make migrate-up` non e stato eseguito per non applicare modifiche al database esterno `db-host`.

Verifiche leggere eseguite:

```bash
make sqlc
make openapi-generate
python3 -c "import yaml; yaml.safe_load(open('openapi/growlab.openapi.yaml', encoding='utf-8')); print('openapi yaml ok')"
make docker-config
make security-check
bash -n infrastructure/scripts/growlab_backup.sh
bash -n infrastructure/scripts/growlab_restore.sh
rg -n -- "-- \\+goose (Up|Down)" database/migrations
rg -n -- "-- name:" database/queries
! rg -n "/api/ai|ai/" openapi apps/api apps/web
! rg -n "CREATE TABLE .*ai|ai_" database/migrations database/queries
git diff --check
```

Note:

- Non sono stati avviati container.
- Per scelta operativa non vengono eseguiti `go build ./...`, `go test ./...`, `pnpm build`, `make build` o build globali.
- Il dev server Next.js non e stato riavviato.

## STEP 22 - Sensor Calibration

Implementato in forma manuale nel frontend.

- Aggiunta la query client `fetchSensorCalibrations`.
- Aggiunta la query client `fetchSensorReadings` per storico 24h del sensore.
- Aggiunto il mutator client `createSensorCalibrationEntry`.
- Aggiunta la sezione `Sensor calibration` nella pagina `Devices`.
- La pagina permette di caricare un sensor ID, creare una calibrazione manuale, visualizzare le calibrazioni recenti e leggere lo storico telemetria recente con mini chart.
- La procedura guidata completa resta documentata come evoluzione futura.

Verifiche leggere eseguite:

```bash
pnpm exec prettier --write apps/web/components/devices/sensor-calibration-panel.tsx apps/web/app/devices/page.tsx apps/web/lib/queries.ts docs/STEP_22_SENSOR_CALIBRATION.md docs/IMPLEMENTATION_STATUS.md
pnpm --filter @growlab/web exec tsc --noEmit --pretty false
make security-check
git diff --check
```
