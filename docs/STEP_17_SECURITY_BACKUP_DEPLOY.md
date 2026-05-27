# STEP 17 — Security, Backup, Deploy

## Sicurezza

- no auth iniziale
- solo LAN/VPN
- no secret hardcoded
- .env fuori Git
- Redis non esposto
- Ollama non esposto pubblicamente
- MQTT non esposto internet
- CORS limitato

## Backup

- PostgreSQL dump
- volume immagini
- volume firmware
- configurazioni docker
- .env
- repository Git

## Deploy

- app-01: web/api/worker/emqx/redis/ollama
- pg-01: PostgreSQL/TimescaleDB
- mon-01: monitoring stack
