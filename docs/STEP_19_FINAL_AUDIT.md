# STEP 19 — Final Audit

## Stato

Completato con verifiche leggere.

## Checklist

Comandi pesanti solo con consenso esplicito dell'utente:

- go test ./...
- go build ./...
- pnpm build
- make build
- make test

Verifiche leggere standard:

- make docker-config
- OpenAPI valido
- Orval client generato
- sqlc genera correttamente
- goose migrations applicabili
- STEP 03B applicato dopo STEP 03 e prima di STEP 04
- system_alerts usa solo stati active/acknowledged/resolved
- system_events presente come timeline globale
- STEP 06 espone handler sottili, service e repository per i moduli domain principali
- provisioning device non espone token_hash
- Plant Wiki coperta nel contratto OpenAPI e nelle rotte API
- STEP 07 worker MQTT sottoscrive telemetry/heartbeat/status/ota status
- devices.last_seen_at presente e aggiornato dal worker
- STEP 08 Next.js App Router foundation presente con Tailwind, shadcn config e client Orval
- STEP 09 dashboard UI presente su `/` e `/dashboard`
- STEP 09 pagine operative presenti per plants/zones/devices/lighting/images/firmware/settings
- STEP 09 alert MVP limitato alla web dashboard
- STEP 09 polling frontend implementato con TanStack Query
- STEP 09 grafici dashboard implementati con Recharts
- STEP 09 light/dark/system mode implementato senza introdurre nuovo stack
- STEP 10 plant events esposti in API e OpenAPI
- STEP 10 plant_status_history popolato su create/update plant health
- STEP 10 pagine dettaglio e form create/edit presenti per plants/zones
- STEP 10 Plant Wiki base visibile nel frontend
- STEP 11 upload immagini usa multipart con validazione MIME/size
- STEP 11 immagini salvate su filesystem, non nel DB
- STEP 11 plant_images mantiene associazione plant e zone
- STEP 11 file immagini serviti da endpoint controllato
- STEP 11 gallery base presente nel frontend
- STEP 12 package internal/shelly presente
- STEP 12 Shelly Dimmer 2 usa HTTP API locale con timeout
- STEP 12 comandi lighting ON/OFF/brightness registrano lighting_events
- STEP 12 UI lighting espone stato, ON/OFF, brightness slider e storico eventi
- STEP 13 firmware upload usa multipart e salva artefatti su volume
- STEP 13 firmware file endpoint serve solo path relativi controllati
- STEP 13 OTA job crea metadata.mqttCommand senza publish automatico
- STEP 13 OTA dry-run verifica compatibilita minima device/firmware
- STEP 13 worker OTA status resta su topic growlab/devices/+/ota/status
- STEP 13 UI firmware espone upload, dry-run manuale, creazione job e status
- STEP 14 progetto PlatformIO ESP32 presente
- STEP 14 firmware pubblica heartbeat/telemetry/status/ota status compatibili con worker
- STEP 14 firmware sottoscrive config/command/ota command
- STEP 14 relay e pompa OFF al boot
- STEP 14 command handler non implementa accensioni pompa/relay
- STEP 14 OTA resta placeholder senza install automatico
- STEP 15 irrigation feature flags lette da config API
- STEP 15 API irrigation espone safety status
- STEP 15 list irrigation forza stato read-only/disabled
- STEP 15 manual-run restituisce sempre IRRIGATION_DISABLED
- STEP 15 UI irrigation read-only con controlli disabilitati
- STEP 16 monitoring spostato in repo homelab dedicata
- STEP 16 Prometheus scrape API/worker predisposto
- STEP 16 Loki e Alloy per Docker logs predisposti
- STEP 16 Grafana datasource Prometheus/Loki/Timescale provisionati
- STEP 16 dashboard MVP provisionata
- STEP 16 node exporter e Proxmox monitoring non introdotti
- STEP 17 no auth introdotta
- STEP 17 app compose usa GROWLAB_LAN_BIND per web/api/worker metrics/MQTT
- STEP 17 Redis e Ollama senza porte pubblicate
- STEP 17 CORS limitato tramite GROWLAB_CORS_ORIGINS
- STEP 17 backup/restore script presenti
- STEP 17 deploy runbook presente
- STEP 17 security-check presente
- STEP 18 AI resta futura e disabilitata
- STEP 18 Ollama resta dietro profile Compose `ai`
- STEP 18 nessun endpoint OpenAPI/API AI introdotto
- feature non operative restano solo documentate
- Docker Compose valido
- nessun secret hardcoded
- AI non implementata
- irrigazione disabilitata
- auth non implementata
- metrics API/worker esposte

## Output

- docs/IMPLEMENTATION_STATUS.md
- docs/NEXT_STEPS.md

## Verifiche eseguite

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

## Note operative

- `make migrate-up` non e stato eseguito durante l'audit per non applicare modifiche al database esterno `pg-01`.
- `go test ./...`, `go build ./...`, `pnpm build`, `make build` e `make test` restano esclusi senza consenso esplicito.
- Non sono stati avviati container o dev server.
