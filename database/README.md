# GrowLab Database

`migrations/001_initial_schema.sql` defines the initial PostgreSQL and TimescaleDB schema.

It creates relational tables for plants, zones, wiki, devices, images, AI analyses, lighting, firmware, OTA, irrigation placeholders, and system settings. It also creates TimescaleDB hypertables for:

- `sensor_readings`
- `device_heartbeats`

Images and firmware binaries are stored on Docker volumes. The database stores metadata only.

Apply locally or from `app-01`:

```bash
GROWLAB_DB_PASSWORD=change-me ./infrastructure/scripts/apply-db-migrations.sh
```
