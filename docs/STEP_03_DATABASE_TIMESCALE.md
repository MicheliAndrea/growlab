# STEP 03 — Database + TimescaleDB

## Tecnologie

- PostgreSQL
- TimescaleDB
- goose
- pgx
- sqlc

## Tabelle

- grow_areas
- zones
- plant_families
- plant_categories
- plant_species
- plants
- plant_events
- plant_images
- devices
- device_modules
- sensors
- sensor_readings
- device_heartbeats
- lighting_systems
- lighting_events
- lighting_schedules
- firmware_versions
- ota_jobs
- irrigation_systems
- irrigation_events
- system_alerts

## Hypertables

- sensor_readings
- device_heartbeats

## STEP 03B collegato

Prima di procedere con STEP 04, lo schema viene esteso da:

```text
docs/STEP_03B_DATABASE_FEATURE_ENHANCEMENTS.md
database/migrations/000002_feature_enhancements.sql
```

STEP 03B aggiunge:

- system_events globale;
- system_alerts con stati `active`, `acknowledged`, `resolved`;
- profili target zona;
- stato salute manuale pianta;
- checklist manuali pianta;
- capability model device;
- calibrazioni sensori;
- profili luce;
- provisioning metadata;
- firmware channels;
- OTA dry-run metadata;
- metadata per photo timeline/growth tracking.

## Regole

- UUID primary key.
- Timestamp UTC.
- Immagini su volume, non DB.
- JSONB solo per metadata/config nello schema base; STEP 03B aggiunge JSONB pragmatici per target, calibrazioni, provisioning, dry-run e growth tracking.
- Non implementare AI table operativa per ora.
