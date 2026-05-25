# 06 — .NET Worker Service

## Obiettivo

Definire il servizio background GrowLab Worker.

## Responsabilità

Il Worker gestisce attività non interattive:

- MQTT subscriber;
- process telemetria ESP32;
- heartbeat device;
- stato online/offline;
- job schedulati;
- alert;
- OTA orchestration;
- sincronizzazione stato Shelly;
- predisposizione automazioni future.

## Struttura

```text
apps/worker/
├── GrowLab.Worker
├── Services/
│   ├── MqttBackgroundService
│   ├── TelemetryProcessor
│   ├── DeviceHeartbeatMonitor
│   ├── OtaJobProcessor
│   ├── LightingSyncJob
│   └── AlertProcessor
└── appsettings.json
```

## MQTT listener

Il worker deve sottoscrivere:

```text
growlab/devices/+/telemetry
growlab/devices/+/status
growlab/devices/+/heartbeat
growlab/devices/+/ota/status
```

## Processing telemetria

Quando arriva telemetria:

1. validare payload;
2. identificare device;
3. identificare sensori;
4. salvare su TimescaleDB;
5. aggiornare `last_seen_at`;
6. creare eventuali alert;
7. pubblicare aggiornamento real-time futuro.

## Heartbeat

Regola:

- se device non comunica da X minuti, stato `offline`;
- se ricomincia a comunicare, stato `online`;
- ogni cambio stato genera evento.

## OTA job processor

Flusso:

1. legge OTA job pending;
2. verifica device online;
3. pubblica comando MQTT;
4. attende stato;
5. aggiorna job;
6. logga errori.

## Lighting sync

Il Worker può interrogare periodicamente Shelly Dimmer 2 per aggiornare:

- stato ON/OFF;
- brightness;
- availability.

## Automazioni

Le automazioni critiche devono essere disabilitate inizialmente.

Il Worker può contenere codice predisposto, ma deve rispettare feature flag:

```text
IrrigationAutomation = false
AiCanExecuteActions = false
```

## Error handling

- Retry controllato.
- Logging strutturato.
- Dead-letter log per payload MQTT invalidi.
- Nessun crash globale per singolo messaggio non valido.
