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

- Valutare URL query per condividere viste filtrate se serve passare link operativi tra macchine/browser.
- Usare `make seed-demo` per caricare dati locali demo/test manuali quando serve.
- Valutare test API mirati per handler critici senza lanciare build globale.
- Valutare simulazione lighting piu precisa se servono curve e transizioni reali.
- Valutare preset/template digital twin se si vogliono layout riusabili tra zone simili.

## Guardrail da mantenere

- Nessuna auth finche non viene progettata esplicitamente.
- Nessuna irrigazione attiva.
- Nessun comando pompa.
- Nessuna automazione AI.
- Nessun endpoint AI.
- Nessun monitoring generico dentro il repository GrowLab.
