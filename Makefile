.DEFAULT_GOAL := help

.PHONY: help dev dev-web dev-api dev-worker build test lint docker-config openapi-generate sqlc migrate-up migrate-down

ifneq (,$(wildcard .env))
include .env
export
endif

GOOSE ?= goose
GOOSE_DRIVER ?= postgres
SQLC ?= sqlc
SQLC_CONFIG ?= sqlc.yaml
MIGRATIONS_DIR ?= database/migrations

GROWLAB_DB_HOST ?= pg-01
GROWLAB_DB_PORT ?= 5432
GROWLAB_DB_NAME ?= growlab
GROWLAB_DB_USER ?= growlab
GROWLAB_DB_PASSWORD ?= change-me
GROWLAB_DB_SSLMODE ?= disable
DB_DSN ?= postgres://$(GROWLAB_DB_USER):$(GROWLAB_DB_PASSWORD)@$(GROWLAB_DB_HOST):$(GROWLAB_DB_PORT)/$(GROWLAB_DB_NAME)?sslmode=$(GROWLAB_DB_SSLMODE)

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
	$(SQLC) generate -f $(SQLC_CONFIG)

migrate-up:
	$(GOOSE) -dir $(MIGRATIONS_DIR) $(GOOSE_DRIVER) "$(DB_DSN)" up

migrate-down:
	$(GOOSE) -dir $(MIGRATIONS_DIR) $(GOOSE_DRIVER) "$(DB_DSN)" down
