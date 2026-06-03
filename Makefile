.DEFAULT_GOAL := help

.PHONY: help dev dev-web dev-api dev-worker build test lint docker-config security-check backup openapi-generate sqlc migrate-up migrate-down db-config db-check seed-demo

ifneq (,$(wildcard .env))
include .env
export
endif

GOOSE ?= $(shell command -v goose 2>/dev/null || command -v $(HOME)/go/bin/goose 2>/dev/null || printf "goose")
GOOSE_DRIVER ?= postgres
GOOSE_DRIVER := $(or $(GOOSE_DRIVER),postgres)
GO ?= go
GO_TOOL_CACHE ?= /tmp/growlab-go-build
PNPM ?= pnpm
SQLC ?= $(shell command -v sqlc 2>/dev/null || command -v $(HOME)/go/bin/sqlc 2>/dev/null || printf "sqlc")
SQLC_CONFIG ?= sqlc.yaml
PSQL ?= $(shell command -v psql 2>/dev/null || printf "psql")
MIGRATIONS_DIR ?= database/migrations
DEMO_SEED ?= database/seeds/demo.sql
OPENAPI_SPEC ?= openapi/growlab.openapi.yaml

GROWLAB_DB_HOST ?= db-host
GROWLAB_DB_PORT ?= 5432
GROWLAB_DB_NAME ?= growlab
GROWLAB_DB_USER ?= growlab
GROWLAB_DB_PASSWORD ?= change-me
GROWLAB_DB_SSLMODE ?= disable
DB_DSN ?= host=$(GROWLAB_DB_HOST) port=$(GROWLAB_DB_PORT) user=$(GROWLAB_DB_USER) password=$(GROWLAB_DB_PASSWORD) dbname=$(GROWLAB_DB_NAME) sslmode=$(GROWLAB_DB_SSLMODE)

help:
	@printf "%s\n" "GrowLab scaffold"
	@printf "%s\n" ""
	@printf "%s\n" "Available targets:"
	@printf "%s\n" "  make dev"
	@printf "%s\n" "  make dev-web"
	@printf "%s\n" "  make dev-api"
	@printf "%s\n" "  make dev-worker"
	@printf "%s\n" "  make build"
	@printf "%s\n" "  make test"
	@printf "%s\n" "  make lint"
	@printf "%s\n" "  make docker-config"
	@printf "%s\n" "  make security-check"
	@printf "%s\n" "  make backup"
	@printf "%s\n" "  make openapi-generate"
	@printf "%s\n" "  make sqlc"
	@printf "%s\n" "  make migrate-up"
	@printf "%s\n" "  make migrate-down"
	@printf "%s\n" "  make db-config"
	@printf "%s\n" "  make db-check"
	@printf "%s\n" "  make seed-demo"

dev:
	@printf "%s\n" "App dev commands will be wired in later steps."

dev-web:
	$(PNPM) --filter @growlab/web dev

dev-api:
	$(GO) run ./apps/api/cmd/api

dev-worker:
	$(GO) run ./workers/growlab-worker/cmd/worker

build:
	@printf "%s\n" "Build is intentionally manual. Run a targeted go build only when explicitly needed."

test:
	@printf "%s\n" "Tests are intentionally manual. Run targeted go test packages only when explicitly needed."

lint:
	@printf "%s\n" "Lint command will be wired after tool choice; no global compile is run here."

docker-config:
	env -i PATH="$$PATH" HOME="$$HOME" docker compose --env-file infrastructure/.env.example -f infrastructure/docker/docker-compose.yml config

security-check:
	bash infrastructure/scripts/security_check.sh

backup:
	bash infrastructure/scripts/growlab_backup.sh

openapi-generate:
	@python3 -c 'import yaml; yaml.safe_load(open("$(OPENAPI_SPEC)", encoding="utf-8"))'
	@if command -v $(PNPM) >/dev/null 2>&1; then \
		$(PNPM) --filter @growlab/openapi-client generate; \
	else \
		printf "%s\n" "pnpm not found; OpenAPI YAML validated, Orval generation skipped."; \
	fi

sqlc:
	@if command -v $(SQLC) >/dev/null 2>&1; then \
		$(SQLC) generate -f $(SQLC_CONFIG); \
	else \
		GOCACHE=$(GO_TOOL_CACHE) $(GO) run ./tools/sqlc-lite; \
	fi

migrate-up:
	@if command -v $(GOOSE) >/dev/null 2>&1; then \
		GOOSE_DRIVER="$(GOOSE_DRIVER)" GOOSE_DBSTRING="$(DB_DSN)" GOOSE_MIGRATION_DIR="$(MIGRATIONS_DIR)" $(GOOSE) up; \
	else \
		GOCACHE=$(GO_TOOL_CACHE) $(GO) run ./tools/goose-lite up $(MIGRATIONS_DIR); \
	fi

migrate-down:
	@if command -v $(GOOSE) >/dev/null 2>&1; then \
		GOOSE_DRIVER="$(GOOSE_DRIVER)" GOOSE_DBSTRING="$(DB_DSN)" GOOSE_MIGRATION_DIR="$(MIGRATIONS_DIR)" $(GOOSE) down; \
	else \
		GOCACHE=$(GO_TOOL_CACHE) $(GO) run ./tools/goose-lite down $(MIGRATIONS_DIR); \
	fi

db-config:
	@printf "%s\n" "GrowLab database configuration"
	@printf "%s\n" "  host: $(GROWLAB_DB_HOST)"
	@printf "%s\n" "  port: $(GROWLAB_DB_PORT)"
	@printf "%s\n" "  dbname: $(GROWLAB_DB_NAME)"
	@printf "%s\n" "  user: $(GROWLAB_DB_USER)"
	@printf "%s\n" "  password: ***"
	@printf "%s\n" "  sslmode: $(GROWLAB_DB_SSLMODE)"
	@printf "%s\n" "  dsn source: $(origin DB_DSN)"

db-check:
	@if command -v $(PSQL) >/dev/null 2>&1; then \
		$(PSQL) "$(DB_DSN)" -v ON_ERROR_STOP=1 \
			-c "SELECT current_database() AS database, current_user AS username, inet_server_addr() AS server_addr, inet_server_port() AS server_port;" \
			-c "SELECT ssl, version AS ssl_version, cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid();"; \
	else \
		printf "%s\n" "psql not found; install PostgreSQL client tools to check the database connection."; \
		exit 1; \
	fi

seed-demo:
	@if command -v $(PSQL) >/dev/null 2>&1; then \
		$(PSQL) "$(DB_DSN)" -v ON_ERROR_STOP=1 -f "$(DEMO_SEED)"; \
	else \
		printf "%s\n" "psql not found; install PostgreSQL client tools to run demo seeds."; \
		exit 1; \
	fi
