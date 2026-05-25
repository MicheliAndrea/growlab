# Scripts

Reserved scripts:

- `apply-db-migrations.sh`
- `backup-db.sh`
- `backup-images.sh`
- `backup-config.sh`
- `restore-db.sh`

Keep `.env` backups outside the repository.

Apply the initial schema:

```bash
GROWLAB_DB_PASSWORD=change-me ./infrastructure/scripts/apply-db-migrations.sh
```
