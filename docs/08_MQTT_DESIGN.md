# 08 — MQTT Design

## Broker

Default: EMQX.

Alternativa: Mosquitto.

## Principi

- Topic prevedibili.
- Payload JSON.
- Ogni messaggio deve includere `deviceId`.
- Usare timestamp UTC.
- Validare lato Worker.
- Non fidarsi dei payload device.
- MQTT non anonimo in configurazione reale.

## Topic

### Telemetry

```text
growlab/devices/{deviceId}/telemetry
```

### Status

```text
growlab/devices/{deviceId}/status
```

### Heartbeat

```text
growlab/devices/{deviceId}/heartbeat
```

### Config

```text
growlab/devices/{deviceId}/config
growlab/devices/{deviceId}/config/ack
```

### Commands

```text
growlab/devices/{deviceId}/command
growlab/devices/{deviceId}/command/ack
```

### OTA

```text
growlab/devices/{deviceId}/ota
growlab/devices/{deviceId}/ota/status
```

## Telemetry payload

```json
{
  "deviceId": "esp32-zone-a-01",
  "timestamp": "2026-05-25T15:00:00Z",
  "readings": [
    {
      "sensorType": "soil_moisture",
      "value": 43.2,
      "unit": "%"
    },
    {
      "sensorType": "temperature",
      "value": 24.8,
      "unit": "C"
    }
  ],
  "wifiRssi": -58,
  "uptimeSeconds": 123456
}
```

## Heartbeat payload

```json
{
  "deviceId": "esp32-zone-a-01",
  "timestamp": "2026-05-25T15:00:00Z",
  "firmwareVersion": "0.1.0",
  "configVersion": 3,
  "freeHeap": 153424,
  "wifiRssi": -58,
  "ipAddress": "192.168.1.80"
}
```

## Command payload

```json
{
  "commandId": "cmd-uuid",
  "type": "set_config",
  "createdAt": "2026-05-25T15:00:00Z",
  "payload": {
    "telemetryIntervalSeconds": 60
  }
}
```

## OTA command payload

```json
{
  "jobId": "ota-job-uuid",
  "firmwareVersion": "0.2.0",
  "url": "http://growlab-api.local/firmware/file.bin",
  "checksum": "sha256..."
}
```

## QoS

- Telemetry: QoS 0 or 1.
- Commands: QoS 1.
- OTA: QoS 1.
- Retained config messages: valutare sì.
- Retained telemetry: no.

## Sicurezza

- Username/password per device.
- Credenziali diverse da dashboard.
- Accesso solo LAN.
- Nessuna porta MQTT esposta su internet.
