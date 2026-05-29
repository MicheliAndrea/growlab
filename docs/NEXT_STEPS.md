# Next Steps

## Prima di deploy reale

- Creare un commit/checkpoint dello stato attuale.
- Applicare le migrazioni su `db-host` con `.env` reale.
- Verificare che `app-host`, `db-host` e `monitoring-host` risolvano dal DNS interno OPNsense.
- Preparare la repo `homelab-monitoring` sul nodo monitoring.

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

- Versionare e deployare la repo `homelab-monitoring`.
- Configurare `.env` reale su `monitoring-host`.
- Aggiornare `prometheus/file_sd/*.yml` con host DNS reali.
- Valutare Alloy remoto su `app-host` per leggere i log container GrowLab.

## Evoluzioni applicative

- Rendere piu robuste le schermate operative frontend con stati vuoti e filtri.
- Aggiungere seed dati locali per demo e test manuali.
- Valutare test API mirati per handler critici senza lanciare build globale.
- Valutare simulazione lighting piu precisa se servono curve e transizioni reali.
- Raffinare kiosk con metriche ambientali se il backend espone letture live per zona.
- Valutare un vero editor grafico per il digital twin se serviranno coordinate persistenti piu ricche.

## Guardrail da mantenere

- Nessuna auth finche non viene progettata esplicitamente.
- Nessuna irrigazione attiva.
- Nessun comando pompa.
- Nessuna automazione AI.
- Nessun endpoint AI.
- Nessun monitoring generico dentro il repository GrowLab.
