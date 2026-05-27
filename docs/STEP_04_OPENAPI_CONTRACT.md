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
- GET/POST /api/plants
- GET/PUT/DELETE /api/plants/{id}
- GET /api/plants/{id}/timeline
- POST /api/plants/{id}/images
- GET /api/devices
- GET /api/devices/{id}
- GET /api/lighting
- POST /api/lighting/{id}/on
- POST /api/lighting/{id}/off
- POST /api/lighting/{id}/brightness
- GET/POST /api/firmware
- POST /api/devices/{id}/ota
- GET /api/irrigation
- POST /api/irrigation/{id}/manual-run, deve restituire IRRIGATION_DISABLED
