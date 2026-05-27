# STEP 05 — Go API Foundation

## Obiettivo

Creare API Go + Gin compilabile.

## Struttura

```text
apps/api/
├── cmd/api/main.go
├── internal/config
├── internal/http
├── internal/handlers
├── internal/middleware
├── internal/services
├── internal/repositories
├── internal/database
├── internal/shelly
├── internal/storage
├── internal/metrics
└── go.mod
```

## Funzioni

- Gin server
- config env
- slog
- graceful shutdown
- pgx connection
- Redis connection opzionale
- GET /api/health
- GET /metrics
- CORS locale
- error model standard

## Metrics minime

- request count
- request duration
- error count
- build info
