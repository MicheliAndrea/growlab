# GrowLab Backup & Restore

## Backup Scope

The STEP 17 backup scope covers:

- PostgreSQL/TimescaleDB logical dump.
- Image files volume `growlab_images`.
- Firmware files volume `growlab_firmware`.
- Docker Compose configuration.
- Local `.env` files when present.
- Git repository bundle.

The generic homelab monitoring repository is intentionally out of scope. Back up `/home/andrea/projects/homelab-monitoring` separately with the homelab infrastructure backups.

## Backup Command

```bash
make backup
```

Optional destination:

```bash
GROWLAB_BACKUP_ROOT=/srv/backups/growlab make backup
```

## Database Requirements

`pg_dump` must be installed on the host running the backup.

The script uses `DB_DSN` when set. Otherwise it builds a DSN from:

- `GROWLAB_DB_HOST`
- `GROWLAB_DB_PORT`
- `GROWLAB_DB_USER`
- `GROWLAB_DB_PASSWORD`
- `GROWLAB_DB_NAME`
- `GROWLAB_DB_SSLMODE`

## Volume Requirements

Docker must be installed and the named volumes must be visible locally:

- `growlab_images`
- `growlab_firmware`

If the app runs on `app-01`, run volume backups on `app-01`.

## Restore Command

Restore requires an explicit confirmation variable:

```bash
GROWLAB_RESTORE_CONFIRM=restore bash infrastructure/scripts/growlab_restore.sh /srv/backups/growlab/growlab-YYYYMMDDTHHMMSSZ
```

The restore script:

- restores the PostgreSQL custom dump with `pg_restore --clean --if-exists --no-owner`;
- recreates/restores `growlab_images`;
- recreates/restores `growlab_firmware`.

Stop app services before restore.

## Validation

```bash
bash -n infrastructure/scripts/growlab_backup.sh
bash -n infrastructure/scripts/growlab_restore.sh
```

## Notes

- Backup archives may contain secrets from `.env` files.
- Store backup output on encrypted storage or a restricted backup host.
- Rotate backups outside this MVP script.
