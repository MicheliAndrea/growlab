# Next Steps

## Prima di deploy reale

- Creare un commit/checkpoint dello stato attuale.
- Applicare le migrazioni su `pg-01` con `.env` reale.
- Verificare che `app-01`, `pg-01` e `mon-01` risolvano dal DNS interno OPNsense.
- Preparare la repo `/home/andrea/projects/homelab-monitoring` su `mon-01`.

## Verifiche leggere consigliate

```bash
make sqlc
make openapi-generate
make docker-config
make security-check
bash -n infrastructure/scripts/growlab_backup.sh
bash -n infrastructure/scripts/growlab_restore.sh
git diff --check
```

I comandi pesanti restano manuali:

```bash
go test ./...
go build ./...
pnpm build
make build
make test
```

## Monitoring homelab

- Versionare e deployare `/home/andrea/projects/homelab-monitoring`.
- Configurare `.env` reale su `mon-01`.
- Aggiornare `prometheus/file_sd/*.yml` con host DNS reali.
- Valutare Alloy remoto su `app-01` per leggere i log container GrowLab.

## Evoluzioni applicative

- Rendere piu robuste le schermate operative frontend con stati vuoti e filtri.
- Aggiungere seed dati locali per demo e test manuali.
- Valutare test API mirati per handler critici senza lanciare build globale.
- Preparare export/plant passport solo come step futuro separato.

## Guardrail da mantenere

- Nessuna auth finche non viene progettata esplicitamente.
- Nessuna irrigazione attiva.
- Nessun comando pompa.
- Nessuna automazione AI.
- Nessun endpoint AI.
- Nessun monitoring generico dentro il repository GrowLab.
