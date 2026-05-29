# STEP 02 — Infrastructure Docker

## Obiettivo

Preparare Docker Compose per `app-host`.

## Servizi

- growlab-web
- growlab-api
- growlab-worker
- growlab-emqx
- growlab-redis
- growlab-ollama, presente ma non usato finché AI è disabilitata

## PostgreSQL

PostgreSQL/TimescaleDB resta esterno su `db-host`.

## Volumi

- growlab_images
- growlab_firmware
- growlab_redis
- growlab_emqx_data
- growlab_emqx_log
- growlab_ollama

## Porte

- web: 3000
- api: 8080
- api metrics: /metrics
- worker metrics: 9091
- MQTT: 1883 LAN only
- EMQX dashboard: 18083 LAN only
- Redis: interno
- Ollama: interno

## Output

- `infrastructure/docker/docker-compose.yml`
- `apps/web/Dockerfile`
- `apps/api/Dockerfile`
- `workers/growlab-worker/Dockerfile`
