# STEP 16 — Monitoring & Observability

## VM dedicata

`mon-01`

## Stack

- Grafana
- Prometheus
- Loki
- Grafana Alloy

## Cosa monitorare nel primo setup

- growlab-api /metrics
- growlab-worker /metrics
- container applicativi dove possibile
- EMQX exporter/metrics se disponibile
- Redis exporter opzionale
- log container tramite Alloy -> Loki

## Cosa NON monitorare ora

- VM Proxmox
- node exporter sulle VM

## Data split

- dati piante/sensori: TimescaleDB
- metriche app/container: Prometheus
- log: Loki
- Grafana legge sia Prometheus sia PostgreSQL/TimescaleDB
