# GrowLab Deployment Runbook

## Topology

- `app-host`: `growlab-web`, `growlab-api`, `growlab-worker`, EMQX, Redis, optional Ollama.
- `db-host`: PostgreSQL/TimescaleDB.
- `monitoring-host`: Grafana, Prometheus, Loki, Alloy from the separate homelab monitoring repository.

## Security Baseline

- MVP has no authentication. Expose services only on LAN/VPN.
- Keep `.env` files out of git.
- Set `GROWLAB_LAN_BIND` to a LAN/VPN interface, or keep `127.0.0.1` for local-only access.
- Redis has no published port.
- Ollama has no published port and is behind the disabled `ai` profile.
- MQTT and EMQX dashboard bind through `GROWLAB_LAN_BIND`.
- API, web and worker metrics bind through `GROWLAB_LAN_BIND`.
- Keep `GROWLAB_CORS_ORIGINS` restricted to the actual web origins.

## app-host Deploy

1. Clone repository.
2. Create env file:

```bash
cp infrastructure/.env.example .env
```

3. Set real values in `.env`, especially:

- `GROWLAB_DB_PASSWORD`
- `GROWLAB_DB_SSLMODE`
- `GROWLAB_MQTT_PASSWORD`
- `GROWLAB_EMQX_DASHBOARD_PASSWORD`
- `GROWLAB_LAN_BIND`
- `GROWLAB_CORS_ORIGINS`

4. Validate config:

```bash
make docker-config
make security-check
```

5. Start app stack:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

## db-host Database

- PostgreSQL/TimescaleDB is external to the app compose.
- Inspect the configured target before applying changes.

```bash
make db-config
```

- Check read-only connectivity and SSL details.

```bash
make db-check
```

- Run goose migrations from the app repository with the real database `.env`.

```bash
make migrate-up
```

## monitoring-host Monitoring

Monitoring is managed outside this repository:

```text
homelab-monitoring
```

GrowLab integration points for that repo:

- API metrics: `app-host:8080/metrics`
- worker metrics: `app-host:9091/metrics`
- optional PostgreSQL/TimescaleDB Grafana datasource
- optional Alloy agent on `app-host` for Docker logs

Validate and start monitoring from the monitoring repository:

```bash
cd homelab-monitoring
docker compose --env-file .env.example -f docker-compose.yml config
docker compose --env-file .env -f docker-compose.yml up -d
```

## Backups

Run from a host with access to:

- `db-host`
- Docker volumes for `growlab_images` and `growlab_firmware`
- the GrowLab repository

```bash
make backup
```

The backup includes:

- PostgreSQL custom dump, when `pg_dump` is installed.
- `growlab_images` volume archive, when Docker volume exists.
- `growlab_firmware` volume archive, when Docker volume exists.
- Docker config.
- `.env` files if present.
- Git bundle and git status.

The external homelab monitoring repository is backed up separately.

## Restore

Restore is intentionally guarded:

```bash
GROWLAB_RESTORE_CONFIRM=restore bash infrastructure/scripts/growlab_restore.sh /path/to/growlab-backup
```

This can replace database content and volume content. Stop application services before restoring.

## Verification

Lightweight checks:

```bash
make docker-config
make security-check
bash -n infrastructure/scripts/growlab_backup.sh
bash -n infrastructure/scripts/growlab_restore.sh
```

Heavy build/test commands remain manual and require explicit approval.
