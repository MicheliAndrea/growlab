# 17 — Roadmap

## Fase 1 — Foundation

- creare monorepo;
- configurare Docker Compose;
- configurare API;
- configurare Worker;
- configurare Web App;
- configurare AI Service;
- collegare PostgreSQL;
- collegare Redis;
- avviare EMQX;
- healthchecks.

## Fase 2 — Data model

- migrazioni EF Core;
- tabelle piante;
- tabelle zone;
- tabelle device;
- tabelle wiki;
- tabelle immagini;
- hypertable TimescaleDB.

## Fase 3 — Web App base

- layout;
- dashboard;
- CRUD zone;
- CRUD piante;
- timeline;
- wiki base.

## Fase 4 — IoT base

- firmware ESP32;
- MQTT connect;
- heartbeat;
- telemetria;
- salvataggio letture;
- dashboard device.

## Fase 5 — Shelly lighting

- configurazione Shelly;
- stato luce;
- ON/OFF;
- dimmer;
- eventi;
- schedule base.

## Fase 6 — Images + AI

- upload immagini;
- salvataggio volume;
- AI service;
- Ollama;
- analisi;
- timeline AI.

## Fase 7 — OTA

- upload firmware;
- OTA jobs;
- comando MQTT;
- stato OTA;
- log.

## Fase 8 — Irrigation safe mode

- modello dati;
- UI disabilitata;
- controllo manuale protetto futuro;
- nessuna automazione iniziale.

## Fase 9 — Open source readiness

- pulizia repo;
- README;
- licenza;
- `.env.example`;
- guide setup;
- sample data.
