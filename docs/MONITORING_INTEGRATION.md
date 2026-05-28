# GrowLab Monitoring Integration

## Scope

GrowLab non contiene lo stack monitoring.

La configurazione generica per homelab vive nella repo:

```text
/home/andrea/projects/homelab-monitoring
```

Questo repository deve solo esporre superfici monitorabili e documentare come agganciarle.

## Host DNS

Usare nomi stabili nel DNS interno OPNsense:

- `app-01.lab.lan` o alias equivalente per GrowLab app stack
- `pg-01.lab.lan` o alias equivalente per PostgreSQL/TimescaleDB
- `mon-01.lab.lan` o alias equivalente per monitoring

Se in rete si preferiscono nomi brevi (`app-01`, `pg-01`, `mon-01`), mantenerli coerenti tra `.env`, Prometheus file service discovery e documentazione operativa.

## Endpoint GrowLab

Endpoint da configurare in Prometheus nella repo monitoring:

```text
http://app-01:8080/metrics
http://app-01:9091/metrics
```

Default:

- API: `growlab-api`, porta `8080`, path `/metrics`
- Worker: `growlab-worker`, porta `9091`, path `/metrics`

## Logs

Per log container locali alla VM applicativa, eseguire un Alloy agent sulla VM `app-01` e inviare verso Loki:

```text
http://mon-01:3100/loki/api/v1/push
```

La configurazione Alloy non e versionata in questo repository.

## Grafana Datasource

La dashboard GrowLab puo usare:

- Prometheus per metriche API/worker/container;
- Loki per log;
- PostgreSQL/TimescaleDB per dati applicativi.

Le credenziali PostgreSQL devono stare nella `.env` della repo monitoring, non in documenti versionati.

## Cosa resta fuori da GrowLab

- Docker Compose monitoring;
- configurazioni Prometheus/Loki/Alloy;
- provisioning Grafana;
- dashboard homelab generiche;
- monitoraggio VM/Proxmox;
- Alertmanager.
