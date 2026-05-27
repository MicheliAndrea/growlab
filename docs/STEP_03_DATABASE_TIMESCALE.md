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

## Regole

- UUID primary key.
- Timestamp UTC.
- Immagini su volume, non DB.
- JSONB solo per metadata/config.
- Non implementare AI table operativa per ora.
