# STEP 01 — Monorepo Setup

## Obiettivo

Creare la struttura repository base.

## Struttura target

```text
growlab/
├── apps/
│   ├── web/
│   └── api/
├── workers/
│   └── growlab-worker/
├── firmware/
│   └── esp32-growlab/
├── packages/
│   ├── contracts/
│   └── openapi-client/
├── database/
│   ├── migrations/
│   ├── queries/
│   └── generated/
├── infrastructure/
│   ├── docker/
│   ├── mqtt/
│   └── scripts/
├── docs/
├── prompts/
├── openapi/
│   └── growlab.openapi.yaml
├── Makefile
├── .env.example
├── .gitignore
└── README.md
```

## Makefile root

Richiesti:

```bash
make dev
make dev-web
make dev-api
make dev-worker
make build
make test
make lint
make docker-config
make openapi-generate
make sqlc
make migrate-up
make migrate-down
```

Non implementare feature applicative in questo step.
