# Prompt Codex — Docker Compose

Implementa `infrastructure/docker/docker-compose.yml`.

Servizi:

- growlab-web;
- growlab-api;
- growlab-worker;
- growlab-ai;
- growlab-ollama;
- growlab-emqx;
- growlab-redis.

Aggiungi:

- network dedicato;
- volumi;
- healthcheck;
- `.env.example`;
- restart policy.

Database PostgreSQL resta esterno su `pg-01`.
