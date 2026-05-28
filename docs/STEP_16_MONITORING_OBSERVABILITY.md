# STEP 16 - Monitoring & Observability

## Stato

Completato e poi rifinito come integrazione esterna.

## Decisione aggiornata

Il monitoring non vive dentro questo repository.

GrowLab espone metriche, log containerizzabili e dati applicativi interrogabili; lo stack Grafana/Prometheus/Loki/Alloy vive in una repository separata:

```text
/home/andrea/projects/homelab-monitoring
```

Questa scelta rende il monitoring generico per tutto l'homelab, non accoppiato al ciclo di sviluppo GrowLab.

## VM dedicata

`mon-01`

## Stack nella repo monitoring

- Grafana
- Prometheus
- Loki
- Grafana Alloy
- cAdvisor opzionale
- Redis exporter opzionale

## Integrazione GrowLab

GrowLab resta responsabile di:

- `growlab-api /metrics`
- `growlab-worker /metrics`
- container logs leggibili da Alloy
- PostgreSQL/TimescaleDB come datasource Grafana
- nomi host coerenti con DNS interno OPNsense

La repo `homelab-monitoring` resta responsabile di:

- Docker Compose monitoring;
- configurazioni Prometheus;
- file service discovery;
- configurazione Loki;
- configurazione Alloy;
- provisioning Grafana datasource e dashboard;
- documentazione per aggiungere altri servizi homelab.

## Target Prometheus previsti

- `growlab-api` su `app-01:8080/metrics`
- `growlab-worker` su `app-01:9091/metrics`
- `prometheus` locale su `mon-01`
- target opzionali per EMQX, Redis exporter e cAdvisor

## Cosa NON monitorare ora

- VM Proxmox
- node exporter sulle VM
- Alertmanager completo

## Data split

- dati piante/sensori: TimescaleDB
- metriche app/container: Prometheus
- log: Loki
- Grafana legge Prometheus, Loki e PostgreSQL/TimescaleDB

## File in GrowLab

- `docs/MONITORING_INTEGRATION.md`
- endpoint `/metrics` di API e worker gia implementati negli step applicativi

Non esistono piu file applicativi in `infrastructure/monitoring`.

## Validazione monitoring

La validazione dello stack monitoring va eseguita nella repo dedicata:

```bash
cd /home/andrea/projects/homelab-monitoring
docker compose --env-file .env.example -f docker-compose.yml config
```

## Riferimenti tecnici

- Grafana Alloy Docker logs: https://grafana.com/docs/alloy/latest/monitor/monitor-docker-containers/
- `loki.source.docker`: https://grafana.com/docs/grafana-cloud/send-data/alloy/reference/components/loki/loki.source.docker/
- Prometheus configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
