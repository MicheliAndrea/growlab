# GrowLab

GrowLab is a self-hosted home lab platform for plants, grow zones, ESP32 telemetry, MQTT, Shelly Dimmer 2 lighting, image uploads, local AI analysis through Ollama, and future OTA/irrigation modules.

This repository is structured as a monorepo and keeps the first version LAN/VPN only, local-first, and safe-by-default.

## Structure

```text
apps/
  web/          Next.js App Router frontend
  api/          .NET 10 API solution projects
  worker/       .NET 10 background worker
  ai-service/   FastAPI wrapper for Ollama
firmware/
  esp32-growlab/ PlatformIO ESP32 firmware
packages/
  contracts/    Shared .NET DTO and MQTT contracts
  shared/       Reserved shared assets
infrastructure/
  docker/       Docker Compose stack for app-01
database/
  migrations/   PostgreSQL/TimescaleDB schema
docs/           Project documentation
prompts/        Operational prompts
```

## Current State

Implemented scaffold:

- .NET 10 solution with API, Application, Domain, Infrastructure, Worker, and Contracts projects.
- API endpoint surface for health, zones, plants, wiki, images, devices, lighting, firmware/OTA, and irrigation guards.
- In-memory API services for the first runnable slice.
- SQL migration for the documented PostgreSQL and TimescaleDB schema.
- Next.js frontend pages for dashboard, plants, zones, devices, lighting, AI analysis, wiki, firmware, settings, and system.
- FastAPI AI service that calls Ollama and validates advisory JSON output.
- PlatformIO ESP32 firmware scaffold with Wi-Fi, MQTT, heartbeat, telemetry mock, ACK handling, and OTA placeholder.
- Docker Compose stack for web, API, worker, AI service, Ollama, EMQX, Redis, volumes, network, and healthchecks.

Explicit placeholders:

- EF Core/PostgreSQL persistence is represented by SQL migration and will replace the in-memory API store.
- Worker MQTT client and database writes are not wired yet.
- OTA file download and firmware installation flow are placeholders.
- Irrigation control is disabled and actuator commands are not implemented.

## Local Development

API:

```bash
dotnet run --project apps/api/GrowLab.Api/GrowLab.Api.csproj
```

In `Development` the API defaults to `Persistence=Memory` so it can run without `pg-01`. For real PostgreSQL persistence, set:

```bash
GROWLAB_PERSISTENCE=Postgres
```

Web:

```bash
cd apps/web
npm install
npm run dev
```

AI service:

```bash
cd apps/ai-service
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Firmware:

```bash
cd firmware/esp32-growlab
cp include/secrets.example.h include/secrets.h
pio run
```

Docker Compose su `app-01`:

```bash
cd infrastructure/docker
cp .env.example .env
docker compose up -d
```

Docker Compose locale con infrastruttura remota:

```bash
docker compose \
  --env-file infrastructure/docker/.env \
  -f infrastructure/docker/docker-compose.local-app.yml \
  up -d --build
```

Questo avvia localmente web, API, worker, AI service e Ollama. Non avvia PostgreSQL, EMQX/MQTT o Redis: l'API e il worker puntano ai servizi remoti configurati nelle variabili `GROWLAB_LOCAL_DB_*`, `GROWLAB_LOCAL_MQTT_*` e `GROWLAB_LOCAL_REDIS_CONNECTION`. I default sono `pg-01` per PostgreSQL e `app-01` per MQTT/Redis.

Before using Postgres persistence, apply the schema to `pg-01`:

```bash
GROWLAB_DB_PASSWORD=change-me ./infrastructure/scripts/apply-db-migrations.sh
```

## Safety Rules

- No public internet exposure by default.
- No hardcoded production secrets.
- Images are stored on disk/volume, not in PostgreSQL.
- AI is advisory only and cannot execute actions.
- Irrigation manual control and automation are disabled by default.
- Physical commands are logged through the API boundary.
