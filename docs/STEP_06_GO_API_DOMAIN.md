# STEP 06 — Go API Domain

## Obiettivo

Implementare moduli API principali.

## Moduli

- Zones
- Plants
- Plant Timeline
- Plant Wiki
- Devices
- Images metadata
- Lighting systems
- Firmware metadata
- Irrigation disabled module
- System alerts

## Regole

- Handler sottili.
- Services per logica.
- Repositories per DB.
- OpenAPI rispettato.
- Nessuna auth.
- Nessuna AI tecnica.
- Nessun comando irrigazione attivo.

## Implementazione

- Entry point collegato al domain handler in `apps/api/cmd/api/main.go`.
- Repository DB minimale in `apps/api/internal/repositories`, con output JSON-friendly e campi snake_case convertiti in camelCase.
- Service domain in `apps/api/internal/services/domain.go`.
- Handler sottili in `apps/api/internal/handlers/domain.go`.
- Rotte domain registrate in `apps/api/internal/http/router.go`.

## Moduli coperti

- Zones: list, create, get, update, delete.
- Zone profiles: list, create.
- Plants: list, create, get, update, delete.
- Plant timeline: eventi, immagini, task e stato salute manuale.
- Plant image metadata: insert metadata, growth tracking e tag manuali; nessun blob nel DB.
- Plant tasks: list, create.
- Plant Wiki: families, categories, species.
- System events: list, create.
- System alerts: list, create, acknowledge, resolve.
- Devices: list, get, capabilities, provisioning metadata senza esporre token hash.
- Sensor calibrations: list, create.
- Lighting: systems, profiles con steps, comandi on/off/brightness registrati come eventi.
- Firmware: versions, channels, OTA job metadata e OTA dry-run metadata.
- Irrigation: list sistemi; manual-run ritorna `IRRIGATION_DISABLED`.

## Esclusioni confermate

- Nessuna autenticazione.
- Nessun frontend.
- Nessun rules engine.
- Nessuna AI tecnica.
- Nessuna irrigazione attiva.
