# STEP 13 — OTA Firmware

## Stato

Completato.

## Funzioni implementate

- upload firmware
- storage firmware volume
- firmware_versions
- ota_jobs
- comando MQTT predisposto
- stato OTA da worker
- nessun update automatico

## Backend

- `POST /api/firmware` accetta `multipart/form-data` con:
  - `file`
  - `deviceType`
  - `version`
  - `channelId` opzionale
  - `metadata` JSON opzionale
- Se `channelId` non viene passato, l'API usa il firmware channel marcato come default.
- `POST /api/firmware/channels/{id}/default` rende un canale il default unico.
- I file firmware sono salvati sotto `GROWLAB_FIRMWARE_STORAGE_PATH`.
- Il limite upload default e `32 MiB`, configurabile con `GROWLAB_FIRMWARE_UPLOAD_MAX_BYTES`.
- `firmware_versions` conserva:
  - `device_type`
  - `version`
  - `channel_id`
  - `storage_path`
  - `checksum_sha256`
  - `size_bytes`
  - metadata upload
- `GET /api/firmware/{id}/file` serve l'artefatto da path relativo controllato.
- `GET /api/devices/{id}/ota` lista gli OTA job del device.
- `POST /api/devices/{id}/ota/dry-run` crea un dry-run con report minimo:
  - device selezionato
  - firmware selezionato
  - match `device_type`
  - conferma manuale richiesta
- `POST /api/devices/{id}/ota` crea un job `pending` e aggiunge in `metadata.mqttCommand`:
  - topic `growlab/devices/{device_uid}/ota/command`
  - payload con `jobId`, `firmwareVersionId`, `version`, `deviceType`, `downloadUrl`, `checksumSha256`, `sizeBytes`
- Il comando MQTT e solo predisposto nei metadata. L'API non pubblica automaticamente e non forza update firmware.
- Lo stato OTA resta aggiornabile dal worker tramite topic `growlab/devices/+/ota/status`.

## Frontend

- Pagina `/firmware` aggiornata con:
  - form upload firmware
  - lista versioni con link file
  - canali firmware con cambio default manuale
  - selezione device/firmware per dry-run e creazione job OTA
  - lista job OTA con status e topic MQTT preparato

## Non implementato ora

- Publish MQTT automatico.
- Rollout automatico.
- Firma firmware.
- Policy avanzate per canale/versione.
- Auth/autorizzazioni.
- UI di provisioning QR.
