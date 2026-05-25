# 03 — Infrastructure: Proxmox + Docker

## Ambiente target

GrowLab gira su Proxmox VE con almeno due VM esistenti:

```text
pg-01
└── PostgreSQL + TimescaleDB

app-01
└── Docker host
```

## Strategia iniziale

La prima versione deve girare su `app-01` tramite Docker Compose.

```text
app-01
├── growlab-web
├── growlab-api
├── growlab-worker
├── growlab-ai
├── ollama
├── emqx
├── redis
└── growlab-images-volume
```

Il database resta su `pg-01`.

## Docker network

Usare una rete dedicata:

```yaml
networks:
  growlab_net:
    name: growlab_net
```

## Volumi

Volumi consigliati:

```yaml
volumes:
  growlab_images:
  growlab_ollama:
  growlab_emqx_data:
  growlab_emqx_log:
  growlab_redis:
```

## Porte consigliate

| Servizio | Porta interna | Porta host | Note |
|---|---:|---:|---|
| Web App | 3000 | 3000 | LAN/VPN |
| API | 8080 | 8080 | LAN/VPN |
| AI Service | 8000 | 8000 | solo rete interna preferibile |
| EMQX MQTT | 1883 | 1883 | LAN only |
| EMQX Dashboard | 18083 | 18083 | LAN only |
| Redis | 6379 | non esporre | interno |
| Ollama | 11434 | non esporre | interno |

## Compose base atteso

Codex deve generare un `docker-compose.yml` con:

- servizi nominati;
- healthchecks;
- restart policy;
- `.env`;
- network dedicato;
- volumi persistenti;
- dipendenze esplicite.

## Connessione a pg-01

La stringa di connessione deve stare in `.env`.

Esempio:

```env
POSTGRES_HOST=pg-01
POSTGRES_PORT=5432
POSTGRES_DB=growlab
POSTGRES_USER=growlab
POSTGRES_PASSWORD=change-me
```

## Backup

Backup minimi richiesti:

- dump PostgreSQL;
- backup volume immagini;
- backup configurazione Docker;
- backup firmware caricati;
- backup `.env` fuori repository.

## Evoluzione futura

In futuro si potrà dividere:

```text
pg-01      database
app-01     web/api/worker
iot-01     mqtt
ai-01      ollama/ai-service
mon-01     prometheus/grafana/loki
storage-01 immagini/minio
```
