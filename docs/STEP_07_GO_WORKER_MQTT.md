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
