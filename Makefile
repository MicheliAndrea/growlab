.DEFAULT_GOAL := help

.PHONY: help dev dev-web dev-api dev-worker build test lint docker-config openapi-generate sqlc migrate-up migrate-down

ifneq (,$(wildcard .env))
include .env
export
endif

GOOSE ?= $(shell command -v goose 2>/dev/null || command -v $(HOME)/go/bin/goose 2>/dev/null || printf "goose")
GOOSE_DRIVER ?= postgres
GOOSE_DRIVER := $(or $(GOOSE_DRIVER),postgres)
GO ?= go
GO_TOOL_CACHE ?= /tmp/growlab-go-build
SQLC ?= $(shell command -v sqlc 2>/dev/null || command -v $(HOME)/go/bin/sqlc 2>/dev/null || printf "sqlc")
SQLC_CONFIG ?= sqlc.yaml
MIGRATIONS_DIR ?= database/migrations

GROWLAB_DB_HOST ?= pg-01
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
	@printf "%s\n" "  make openapi-generate"
	@printf "%s\n" "  make sqlc"
	@printf "%s\n" "  make migrate-up"
	@printf "%s\n" "  make migrate-down"

dev:
	@printf "%s\n" "App dev commands will be wired in later steps."

dev-web:
	@printf "%s\n" "Web app dev command will be wired in STEP 08."

dev-api:
	@printf "%s\n" "Go API dev command will be wired in STEP 05."

dev-worker:
	@printf "%s\n" "Go worker dev command will be wired in STEP 07."

build:
	@printf "%s\n" "Build commands will be wired in later steps."

test:
	@printf "%s\n" "Tests will be wired in later steps."

lint:
	@printf "%s\n" "Lint commands will be wired in later steps."

docker-config:
	docker compose -f infrastructure/docker/docker-compose.yml config

openapi-generate:
	@printf "%s\n" "Orval generation will be added after the OpenAPI contract."

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
