# GrowLab Infrastructure

Infrastructure files for local deployment.

- `docker/docker-compose.yml`: app-01 Docker Compose stack
- `docker/docker-compose.app-01-infra.yml`: app-01 MQTT/Redis-only stack for local app development
- `docker/docker-compose.local-app.yml`: local app stack that reuses remote PostgreSQL/MQTT/Redis
- `docker/.env.example`: deploy-time environment template
- `docker/.env.app-01-infra.example`: app-01 MQTT/Redis environment template
- `docker/.env.local-app.example`: optional local override template
- `mqtt/`: reserved for EMQX configuration
- `nginx/`: reserved for future LAN reverse proxy configuration
- `scripts/`: reserved for backup and restore scripts
