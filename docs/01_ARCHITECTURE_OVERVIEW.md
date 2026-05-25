# 01 — Architecture Overview

## Obiettivo

Questo documento descrive l’architettura logica di GrowLab.

GrowLab deve essere composto da moduli indipendenti, containerizzati e comunicanti tramite API, MQTT e database.

## Componenti principali

```text
Client Web / Smartphone
        |
        v
Next.js Web App
        |
        v
.NET 10 API
        |------------------- PostgreSQL + TimescaleDB
        |------------------- Redis
        |------------------- Docker Volume Images
        |------------------- AI Service / Ollama
        |------------------- Shelly Dimmer 2 Local API
        |
        v
.NET 10 Worker
        |
        v
EMQX MQTT Broker
        |
        v
ESP32 Devices
```

## Responsabilità dei componenti

### Next.js Web App

- dashboard;
- gestione piante;
- gestione zone;
- upload immagini;
- visualizzazione storico;
- controllo luce;
- configurazione dispositivi;
- consultazione analisi AI;
- preparazione futura OTA e irrigazione.

### .NET 10 API

- espone REST API;
- valida input;
- implementa logica di dominio;
- comunica con PostgreSQL;
- coordina storage immagini;
- richiama AI service;
- controlla Shelly Dimmer 2;
- espone endpoint per configurazioni dispositivo e OTA.

### .NET 10 Worker

- ascolta MQTT;
- processa telemetria;
- salva misurazioni temporali;
- aggiorna stato dispositivi;
- gestisce heartbeat;
- esegue job schedulati;
- gestisce notifiche interne;
- predispone OTA;
- mantiene disabilitate le automazioni rischiose.

### AI Service

- riceve richieste di analisi immagine;
- legge immagine da volume;
- chiama Ollama;
- usa un modello vision configurabile;
- restituisce JSON strutturato;
- non esegue azioni automatiche.

### MQTT Broker

- gestisce comunicazione con ESP32;
- usa topic standardizzati;
- richiede autenticazione in configurazione non-dev;
- non deve essere esposto su internet.

### ESP32 Firmware

- firmware unico e configurabile;
- invia telemetria;
- riceve configurazione;
- supporta OTA;
- invia heartbeat;
- supporta moduli abilitabili/disabilitabili.

## Regole architetturali

1. Nessun servizio deve dipendere direttamente dal frontend.
2. Le automazioni fisiche devono passare dal backend/worker.
3. L’AI non deve mai comandare dispositivi.
4. Le configurazioni devono essere tramite environment variables.
5. Ogni evento importante deve essere tracciato.
6. L’irrigazione deve essere safe-by-default.
7. L’app deve funzionare in LAN/VPN senza cloud obbligatorio.

## Flussi principali

### Upload foto e analisi AI

```text
User -> Web App -> API -> Volume immagini -> AI Service -> Ollama -> API -> DB -> Timeline pianta
```

### Telemetria ESP32

```text
ESP32 -> MQTT -> Worker -> PostgreSQL/TimescaleDB -> API -> Web App
```

### Controllo Shelly Dimmer 2

```text
Web App -> API -> ShellyService -> Shelly Dimmer 2 HTTP API -> DB event log
```

### OTA firmware

```text
Web App -> API -> firmware storage -> OTA job -> MQTT command -> ESP32 -> status -> Worker -> DB
```
