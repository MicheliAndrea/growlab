# 19 — Environment Variables

## API

```env
ASPNETCORE_ENVIRONMENT=Development
GROWLAB_PERSISTENCE=Postgres
GROWLAB_DB_HOST=pg-01
GROWLAB_DB_PORT=5432
GROWLAB_DB_NAME=growlab
GROWLAB_DB_USER=growlab
GROWLAB_DB_PASSWORD=change-me
GROWLAB_REDIS_CONNECTION=growlab-redis:6379
GROWLAB_MQTT_HOST=growlab-emqx
GROWLAB_MQTT_PORT=1883
GROWLAB_MQTT_USERNAME=growlab
GROWLAB_MQTT_PASSWORD=change-me
GROWLAB_AI_SERVICE_URL=http://growlab-ai:8000
GROWLAB_IMAGE_STORAGE_PATH=/data/images
GROWLAB_FEATURE_AUTH=false
GROWLAB_FEATURE_IRRIGATION_MANUAL=false
GROWLAB_FEATURE_IRRIGATION_AUTOMATION=false
```

## Web

```env
GROWLAB_WEB_API_BASE_URL=http://growlab-api:8080
NEXT_PUBLIC_API_BASE_URL=http://app-01:8080
```

`GROWLAB_WEB_API_BASE_URL` is used by the Next.js server inside Docker. `NEXT_PUBLIC_API_BASE_URL` stays browser-facing.

## Local App Docker Compose

`infrastructure/docker/docker-compose.local-app.yml` starts only app services locally and expects DB/MQTT/Redis to be reachable remotely.

```env
GROWLAB_LOCAL_DB_HOST=pg-01
GROWLAB_LOCAL_DB_PORT=5432
GROWLAB_LOCAL_MQTT_HOST=app-01
GROWLAB_LOCAL_MQTT_PORT=1883
GROWLAB_LOCAL_REDIS_CONNECTION=app-01:6379
GROWLAB_LOCAL_WEB_API_BASE_URL=http://growlab-api:8080
GROWLAB_LOCAL_PUBLIC_API_BASE_URL=http://localhost:8080
```

## AI Service

```env
OLLAMA_BASE_URL=http://growlab-ollama:11434
GROWLAB_AI_DEFAULT_MODEL=qwen2.5vl:7b
GROWLAB_AI_FALLBACK_MODEL=qwen2.5vl:3b
GROWLAB_IMAGE_STORAGE_PATH=/data/images
```

## Worker

```env
GROWLAB_MQTT_HOST=growlab-emqx
GROWLAB_MQTT_PORT=1883
GROWLAB_MQTT_USERNAME=growlab
GROWLAB_MQTT_PASSWORD=change-me
```

## Regole

- Non committare `.env`.
- Committare solo `.env.example`.
- Usare password diverse in produzione.
