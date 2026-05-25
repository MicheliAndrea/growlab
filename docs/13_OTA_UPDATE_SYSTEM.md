# 13 — OTA Update System

## Obiettivo

Permettere aggiornamenti firmware ESP32 dalla web app.

## Stato

Modulo previsto architetturalmente.

Implementazione dopo IoT base.

## Componenti

- firmware upload API;
- storage firmware;
- tabella firmware_versions;
- tabella ota_jobs;
- comando MQTT OTA;
- endpoint download firmware;
- stato OTA dal device.

## Flusso

```text
Upload firmware
   |
   v
API salva file + checksum
   |
   v
Utente seleziona device
   |
   v
Crea OTA job
   |
   v
Worker pubblica comando MQTT
   |
   v
ESP32 scarica firmware
   |
   v
ESP32 aggiorna e riavvia
   |
   v
ESP32 invia status
   |
   v
Worker aggiorna job
```

## Stati OTA

```text
pending
sent
downloading
installing
rebooting
completed
failed
cancelled
```

## Regole

- OTA solo se device online.
- Firmware compatibile con device type.
- Checksum richiesto.
- Timeout richiesto.
- Log dettagliato.
- No update automatici senza conferma.

## Endpoint

```http
POST /api/firmware
GET /api/firmware
POST /api/devices/{deviceId}/ota
GET /api/ota-jobs/{id}
GET /api/firmware/{id}/download
```

## Firmware versioning

Usare semantic versioning.

Canali:

- dev;
- beta;
- stable.

## Sicurezza

- Endpoint firmware accessibile solo da LAN.
- URL firmato o token futuro.
- Nessun firmware da sorgenti esterne non verificate.
