# STEP 04 — OpenAPI Contract

## Obiettivo

Creare `openapi/growlab.openapi.yaml` come source of truth.

## Regole

- OpenAPI manuale.
- Orval genera client TypeScript.
- Frontend usa solo client generato.
- Go API deve rispettare il contratto.
- Niente tRPC.
- Niente GraphQL.

## Endpoint minimi

- GET /api/health
- GET/POST /api/zones
- GET/PUT/DELETE /api/zones/{id}
- GET/POST /api/zones/{id}/profiles
- GET/POST /api/plants
- GET/PUT/DELETE /api/plants/{id}
- GET /api/plants/{id}/timeline
- POST /api/plants/{id}/images
- GET/POST /api/plants/{id}/tasks
- GET/POST /api/system/events
- GET/POST /api/system/alerts
- POST /api/system/alerts/{id}/acknowledge
- POST /api/system/alerts/{id}/resolve
- GET /api/devices
- GET /api/devices/{id}
- GET /api/devices/{id}/capabilities
- GET /api/devices/{id}/provisioning
- GET /api/lighting
- GET/POST /api/lighting/profiles
- POST /api/lighting/{id}/on
- POST /api/lighting/{id}/off
- POST /api/lighting/{id}/brightness
- GET/POST /api/firmware
- POST /api/devices/{id}/ota
- POST /api/devices/{id}/ota/dry-run
- GET /api/irrigation
- POST /api/irrigation/{id}/manual-run, deve restituire IRRIGATION_DISABLED

## Nota STEP 03B

STEP 04 deve includere nel contratto OpenAPI i moduli dati introdotti da STEP 03B:

- system events;
- system alerts active/acknowledged/resolved;
- zone profiles;
- manual plant health status e plant tasks;
- device capabilities;
- sensor calibrations;
- lighting profiles;
- firmware channels;
- OTA dry-run;
- device provisioning metadata;
- plant photo timeline/growth tracking metadata.

Restano fuori dal contratto operativo per ora:

- rules engine completo;
- kiosk mode UI;
- digital twin visuale;
- dashboard Grafana complete;
- QR provisioning completo;
- export JSON/CSV;
- AI plant health score;
- advanced image analysis.
