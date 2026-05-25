# 16 — Deployment Guide

## Target

Deploy su:

```text
pg-01: PostgreSQL + TimescaleDB
app-01: Docker Compose
```

## Prerequisiti

Su `app-01`:

- Docker;
- Docker Compose plugin;
- accesso rete a `pg-01`;
- spazio disco per immagini;
- accesso LAN a Shelly Dimmer 2;
- accesso LAN a ESP32.

Su `pg-01`:

- PostgreSQL;
- TimescaleDB;
- database `growlab`;
- utente `growlab`.

## Cartella consigliata

```bash
sudo mkdir -p /srv/growlab
sudo mkdir -p /srv/growlab/storage/images
sudo mkdir -p /srv/growlab/firmware
sudo chown -R $USER:$USER /srv/growlab
```

## Deploy

```bash
cd /srv/growlab
git clone <repo> .
GROWLAB_DB_PASSWORD=change-me ./infrastructure/scripts/apply-db-migrations.sh
cd infrastructure/docker
cp .env.example .env
nano .env
docker compose up -d
```

## Verifiche

```bash
docker compose ps
docker compose logs -f growlab-api
docker compose logs -f growlab-worker
docker compose logs -f growlab-web
```

## Healthcheck

Verificare:

```http
GET http://app-01:8080/health
GET http://app-01:3000
GET http://app-01:18083
```

## Ollama

Scaricare modello:

```bash
docker exec -it growlab-ollama ollama pull qwen2.5vl:7b
```

Fallback:

```bash
docker exec -it growlab-ollama ollama pull qwen2.5vl:3b
```

## Backup

Script futuri:

```text
scripts/backup-db.sh
scripts/backup-images.sh
scripts/backup-config.sh
scripts/restore-db.sh
```

## Aggiornamento

```bash
git pull
docker compose build
docker compose up -d
```
