# STEP 24 — Grafana Dashboards

## Stato

Feature V2/Future, collegata a STEP 16 Monitoring.

## Obiettivo

Definire dashboard Grafana utili per GrowLab.

## Fonti dati

### Prometheus

Per:

- metriche API;
- metriche Worker;
- metriche container;
- metriche EMQX se disponibili;
- metriche Redis se configurate.

### Loki

Per:

- log API;
- log Worker;
- log container;
- log errori MQTT;
- log errori Shelly;
- log OTA.

### PostgreSQL/TimescaleDB

Per:

- dati sensori;
- storico device heartbeat;
- eventi luce;
- eventi sistema;
- dati zona/pianta.

## Dashboard consigliate

### 1. GrowLab API Overview

Pannelli:

- request rate;
- error rate;
- latency p95;
- endpoint più lenti;
- ultimi errori Loki.

### 2. GrowLab Worker Overview

Pannelli:

- messaggi MQTT processati;
- errori payload;
- heartbeat ricevuti;
- device offline;
- durata job;
- OTA jobs futuri.

### 3. IoT Devices

Pannelli:

- device online/offline;
- RSSI;
- uptime;
- firmware version;
- ultimi heartbeat.

### 4. Plant Environment

Pannelli:

- temperatura per zona;
- umidità per zona;
- umidità terreno;
- valori fuori target;
- trend 24h/7d.

### 5. Lighting

Pannelli:

- stato luce;
- brightness nel tempo;
- eventi ON/OFF;
- errori Shelly.

### 6. Alerts & Events

Pannelli:

- alert attivi;
- alert per severità;
- eventi recenti;
- errori applicativi.

## Regole

- Non monitorare VM nel primo setup.
- Grafana può leggere TimescaleDB per dati botanici.
- Prometheus resta per metriche infrastruttura/app.
- Loki resta per log.
