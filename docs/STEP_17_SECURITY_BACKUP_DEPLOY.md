# STEP 17 — Security, Backup, Deploy

## Stato

Completato.

## Sicurezza

- no auth iniziale
- solo LAN/VPN
- no secret hardcoded
- .env fuori Git
- Redis non esposto
- Ollama non esposto pubblicamente
- MQTT non esposto internet
- CORS limitato

## Backup

- PostgreSQL dump
- volume immagini
- volume firmware
- configurazioni docker
- .env
- repository Git
- monitoring homelab escluso dal backup GrowLab

## Deploy

- app-host: web/api/worker/emqx/redis/ollama
- db-host: PostgreSQL/TimescaleDB
- monitoring-host: monitoring stack esterno in repo homelab dedicata

## File aggiunti

- `docs/SECURITY_BASELINE.md`
- `docs/BACKUP_RESTORE.md`
- `docs/DEPLOYMENT_RUNBOOK.md`
- `infrastructure/scripts/growlab_backup.sh`
- `infrastructure/scripts/growlab_restore.sh`
- `infrastructure/scripts/security_check.sh`

## Hardening Compose

- `growlab-web`, `growlab-api`, `growlab-worker` metrics, MQTT ed EMQX dashboard usano `GROWLAB_LAN_BIND`.
- Default `GROWLAB_LAN_BIND=127.0.0.1`.
- Redis non espone porte.
- Ollama non espone porte ed e dietro profile `ai`.
- CORS configurabile tramite `GROWLAB_CORS_ORIGINS`.

## Backup

`make backup` esegue `infrastructure/scripts/growlab_backup.sh`.

Il backup include:

- dump PostgreSQL custom, se `pg_dump` e disponibile;
- volume `growlab_images`;
- volume `growlab_firmware`;
- configurazioni Docker;
- `.env` locali se presenti;
- bundle Git e status repository.

La repo homelab monitoring viene salvata con backup separato.

## Restore

Restore protetto da conferma esplicita:

```bash
GROWLAB_RESTORE_CONFIRM=restore bash infrastructure/scripts/growlab_restore.sh /path/to/backup
```

## Verifica sicurezza

```bash
make security-check
```

Controlla:

- `.env` ignorato da git;
- Redis e Ollama senza porte pubblicate;
- API/web/worker metrics/MQTT su `GROWLAB_LAN_BIND`;
- CORS env cablato.
