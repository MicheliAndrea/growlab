# STEP 03B - Database Feature Enhancements

## Obiettivo

Integrare nel database le feature roadmap che diventano parte del progetto attuale, senza implementare ancora frontend, handler API completi, rules engine, kiosk, AI, autenticazione o irrigazione attiva.

Questo step estende STEP 03 con una migrazione incrementale goose. La migrazione iniziale `000001_init_schema.sql` resta invariata.

## Documenti considerati

- `docs/STEP_20_FEATURE_BACKLOG.md`
- `docs/STEP_21_RULES_ENGINE_FUTURE.md`
- `docs/STEP_22_SENSOR_CALIBRATION.md`
- `docs/STEP_23_KIOSK_MODE.md`
- `docs/STEP_24_GRAFANA_DASHBOARDS.md`
- `docs/STEP_25_DEVICE_PROVISIONING.md`

## Feature integrate ora

### MVP

- `system_events`: timeline globale consultabile del sistema.
- `system_alerts`: stato normalizzato `active`, `acknowledged`, `resolved`.
- `zone_profiles`: target ambientali per zona con `target_config` JSONB.
- `plants.current_health_status` e `plant_status_history`: salute manuale pianta.
- `device_capabilities`: capacita dichiarate dai device ESP32.
- `plant_tasks`: checklist manuali per pianta.

### V2 pronta a schema

- `sensor_calibrations`: storico calibrazioni sensori, lasciando `sensors.calibration` come snapshot attivo.
- `lighting_profiles` e `lighting_profile_steps`: profili luce estendibili.
- `device_provisioning_configs`: metadata per provisioning device, senza QR completo.
- `firmware_channels`: canali `dev`, `beta`, `stable`.
- `ota_dry_runs`: metadata e report per dry-run OTA.
- `plant_images.growth_stage`, `plant_images.growth_tracking`, `plant_image_tags`: base per timeline foto e growth tracking.

## Feature lasciate solo documentate

- Rules engine completo.
- Digital twin geometrico completo e layout visuale zone persistente.
- Kiosk mode UI.
- Dashboard Grafana complete.
- QR provisioning completo.
- Plant passport export.
- Export JSON/CSV.
- AI plant health score.
- Advanced image analysis.

## Migrazione

File:

```text
database/migrations/000002_feature_enhancements.sql
```

Regole:

- Non modifica distruttivamente la migrazione STEP 03.
- Non aggiunge tabelle AI operative.
- Non abilita irrigazione.
- Non introduce autenticazione.
- Mantiene immagini e firmware su volume: nel DB restano solo path e metadata.
- Usa JSONB solo per configurazioni, metadata e report estendibili.

## Query sqlc minime

File:

```text
database/queries/feature_enhancements.sql
```

Copertura minima:

- create/list `system_events`
- create/list/update `system_alerts`
- create/list `zone_profiles`
- create/list `plant_tasks`
- create/list `device_capabilities`
- create/list `sensor_calibrations`
- create/list `lighting_profiles`
- create/list `lighting_profile_steps`

## Go repository minimo

File:

```text
internal/repository
```

Il repository espone wrapper sottili sopra un'interfaccia compatibile con i metodi sqlc. Non contiene business logic e non implementa handler API.

## Verifiche richieste

```bash
make sqlc
make migrate-up
go test ./...
go build ./...
```

In ambiente locale `make migrate-up` richiede PostgreSQL/TimescaleDB esterno raggiungibile su `db-host`.
