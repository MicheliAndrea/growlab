# STEP 07 — Go Worker MQTT

## Obiettivo

Implementare worker Go separato.

## Topic

- growlab/devices/+/telemetry
- growlab/devices/+/heartbeat
- growlab/devices/+/status
- growlab/devices/+/ota/status

## Funzioni

- connessione EMQX
- parsing JSON
- validazione payload
- salvataggio sensor_readings
- salvataggio device_heartbeats
- aggiornamento devices.last_seen_at
- logging errori senza crash
- graceful shutdown
- GET /metrics su porta dedicata

## Implementazione

- Entrypoint worker in `workers/growlab-worker/cmd/worker/main.go`.
- Config env in `workers/growlab-worker/internal/config`.
- Client MQTT Paho in `workers/growlab-worker/internal/mqtt`.
- Processor payload in `workers/growlab-worker/internal/processor`.
- Store PostgreSQL pgx in `workers/growlab-worker/internal/store`.
- Metrics Prometheus dedicate in `workers/growlab-worker/internal/metrics`.
- Dockerfile worker aggiornato per produrre `growlab-worker`.
- `make dev-worker` punta al comando worker.

## Payload supportati

Telemetry:

```json
{
  "recordedAt": "2026-05-27T10:00:00Z",
  "readings": [
    { "sensorKey": "air_temperature", "value": 23.4, "unit": "celsius" }
  ],
  "metadata": {}
}
```

Forma compatta supportata:

```json
{
  "recordedAt": "2026-05-27T10:00:00Z",
  "values": {
    "air_temperature": 23.4,
    "humidity": 61
  }
}
```

Heartbeat:

```json
{
  "observedAt": "2026-05-27T10:00:00Z",
  "status": "online",
  "ipAddress": "192.168.1.20",
  "rssiDbm": -62,
  "uptimeSeconds": 1200,
  "firmwareVersion": "1.0.0"
}
```

Status:

```json
{
  "observedAt": "2026-05-27T10:00:00Z",
  "status": "online",
  "firmwareVersion": "1.0.0"
}
```

OTA status:

```json
{
  "observedAt": "2026-05-27T10:00:00Z",
  "jobId": "00000000-0000-0000-0000-000000000000",
  "status": "completed",
  "metadata": {}
}
```

## Database

- Aggiunta migrazione `database/migrations/000003_worker_mqtt_ingestion.sql`.
- Aggiunto `devices.last_seen_at`.
- Estese query sqlc telemetry per insert readings, insert heartbeats, touch device last seen e OTA status.

## Esclusioni confermate

- Nessuna irrigazione attiva.
- Nessuna AI.
- Nessuna autenticazione.
- Nessun frontend.
