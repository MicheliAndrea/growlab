# 18 — Development Tasks for Codex

## Obiettivo

Lista task ordinata per generare il progetto con Codex.

## Task 1 — Bootstrap monorepo

Generare struttura:

```text
apps/web
apps/api
apps/worker
apps/ai-service
firmware/esp32-growlab
infrastructure/docker
database
docs
prompts
```

Aggiungere:

- `.gitignore`;
- `.editorconfig`;
- `README.md`;
- `.env.example`.

## Task 2 — Docker Compose

Generare compose con:

- growlab-web;
- growlab-api;
- growlab-worker;
- growlab-ai;
- growlab-ollama;
- growlab-emqx;
- growlab-redis;
- volumi;
- network;
- healthchecks.

## Task 3 — .NET solution

Creare soluzione:

```text
GrowLab.sln
GrowLab.Api
GrowLab.Application
GrowLab.Domain
GrowLab.Infrastructure
GrowLab.Worker
GrowLab.Contracts
```

## Task 4 — EF Core model

Creare entità principali:

- GrowArea;
- Zone;
- Plant;
- PlantSpecies;
- PlantFamily;
- PlantCategory;
- PlantEvent;
- PlantImage;
- AiAnalysis;
- Device;
- Sensor;
- SensorReading;
- LightingSystem;
- LightingEvent;
- FirmwareVersion;
- OtaJob;
- IrrigationSystem.

## Task 5 — API endpoints MVP

Implementare:

- zones;
- plants;
- wiki;
- images;
- devices;
- lighting;
- health.

## Task 6 — Worker MQTT

Implementare:

- MQTT connection;
- telemetry subscription;
- heartbeat subscription;
- payload validation;
- DB save.

## Task 7 — Next.js UI

Creare:

- layout;
- dashboard;
- plants;
- zones;
- devices;
- lighting;
- wiki;
- image upload.

## Task 8 — AI service

Creare FastAPI con:

- `/health`;
- `/models`;
- `/analyze-plant-image`;
- chiamata Ollama;
- output JSON validato.

## Task 9 — Firmware ESP32

Creare PlatformIO project con:

- Wi-Fi;
- MQTT;
- heartbeat;
- telemetry mock;
- config;
- OTA placeholder.

## Task 10 — Shelly Dimmer 2

Implementare provider:

- GetState;
- TurnOn;
- TurnOff;
- SetBrightness;
- error handling;
- event logging.

## Task 11 — OTA

Predisporre:

- firmware upload;
- OTA job;
- MQTT command;
- status tracking.

## Task 12 — Documentation sync

Aggiornare README e docs dopo ogni modulo.
