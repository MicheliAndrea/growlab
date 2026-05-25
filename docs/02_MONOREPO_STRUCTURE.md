# 02 — Monorepo Structure

## Obiettivo

Definire la struttura del repository GrowLab.

## Struttura obbligatoria

```text
growlab/
├── apps/
│   ├── web/
│   ├── api/
│   ├── worker/
│   └── ai-service/
│
├── firmware/
│   └── esp32-growlab/
│
├── packages/
│   ├── contracts/
│   └── shared/
│
├── infrastructure/
│   ├── docker/
│   ├── mqtt/
│   ├── nginx/
│   └── scripts/
│
├── database/
│   ├── migrations/
│   ├── seed/
│   └── diagrams/
│
├── docs/
├── prompts/
├── README.md
├── .gitignore
├── .editorconfig
└── LICENSE
```

## apps/web

Contiene la web app Next.js.

Deve includere:

- App Router;
- TypeScript;
- TailwindCSS;
- shadcn/ui;
- componenti riutilizzabili;
- API client verso backend;
- pagine dashboard, piante, zone, dispositivi, luci, AI, wiki, settings.

## apps/api

Contiene la .NET 10 Web API.

Deve includere:

- Clean Architecture pragmatica;
- Domain;
- Application;
- Infrastructure;
- API endpoints;
- EF Core;
- servizi applicativi;
- validazione;
- logging;
- OpenAPI.

## apps/worker

Contiene il .NET 10 Worker Service.

Deve includere:

- MQTT subscriber;
- job scheduler;
- processor telemetria;
- OTA job handler;
- device heartbeat monitor;
- alert generator.

## apps/ai-service

Contiene il wrapper Python/FastAPI per Ollama.

Deve includere:

- endpoint analisi immagine;
- prompt template;
- validazione output JSON;
- gestione timeout;
- healthcheck;
- configurazione modello AI.

## firmware/esp32-growlab

Contiene firmware unico ESP32.

Deve includere:

- PlatformIO;
- Arduino framework;
- Wi-Fi;
- MQTT;
- OTA;
- configurazione remota;
- moduli sensori;
- heartbeat.

## packages/contracts

Contiene contratti condivisi.

Esempi:

- MQTT payload schema;
- DTO TypeScript;
- JSON schema;
- OpenAPI generated client;
- enum condivisi.

## infrastructure/docker

Contiene:

- `docker-compose.yml`;
- `docker-compose.override.yml`;
- `.env.example`;
- volumi;
- network;
- healthchecks.

## Regole

- Codice e documentazione devono restare separati.
- Nessun secret deve essere committato.
- Ogni servizio deve avere README locale.
- Ogni servizio deve avere Dockerfile quando necessario.
- I nomi devono usare prefisso `growlab-`.
