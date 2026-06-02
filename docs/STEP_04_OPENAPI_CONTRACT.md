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
- POST /api/zones/{id}/profiles/{profileId}/activate
- GET/POST /api/plants
- GET/PUT/DELETE /api/plants/{id}
- GET /api/plants/{id}/timeline
- POST /api/plants/{id}/images
- PATCH /api/images/{id}
- GET/POST /api/plants/{id}/tasks
- PATCH /api/plants/{id}/tasks/{taskId}
- GET /api/wiki/plant-families
- GET /api/wiki/plant-categories
- GET /api/wiki/plant-species
- GET/POST /api/system/events
- GET/POST /api/system/alerts
- POST /api/system/alerts/{id}/acknowledge
- POST /api/system/alerts/{id}/resolve
- GET/POST /api/automation/rules
- GET /api/automation/rules/{id}/evaluations
- POST /api/automation/rules/{id}/evaluate
- GET /api/devices
- GET /api/devices/{id}
- GET/POST /api/devices/{id}/capabilities
- PATCH /api/devices/{id}/capabilities/{capabilityId}
- GET /api/devices/{id}/provisioning
- PATCH /api/devices/{id}/provisioning/{provisioningId}
- GET /api/telemetry/latest
- GET /api/sensors/{id}/readings
- GET/POST /api/sensors/{id}/calibrations
- PATCH /api/sensors/{id}/calibrations/{calibrationId}
- GET /api/lighting
- GET/POST /api/lighting/profiles
- POST /api/lighting/profiles/{id}/default
- POST /api/lighting/{id}/on
- POST /api/lighting/{id}/off
- POST /api/lighting/{id}/brightness
- GET/POST /api/firmware
- GET /api/firmware/channels
- POST /api/firmware/channels/{id}/default
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

- rules engine completo con scheduler automatico;
- kiosk mode UI;
- digital twin visuale;
- dashboard Grafana complete;
- QR provisioning completo;
- export JSON/CSV;
- AI plant health score;
- advanced image analysis.
