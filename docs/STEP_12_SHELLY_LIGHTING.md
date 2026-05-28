# STEP 12 — Shelly Dimmer 2 Lighting

## Backend Go

Package `internal/shelly`.

Funzioni:

- GetState
- TurnOn
- TurnOff
- SetBrightness

## UI

- card stato luce
- ON/OFF
- slider brightness
- polling stato
- storico eventi

## Regole

- HTTP API locale.
- Timeout.
- Log eventi.
- Nessuna automazione AI.
- Nessuna esposizione internet.

## Implementazione

Backend:

- Aggiunto package `apps/api/internal/shelly`.
- Implementate funzioni:
  - `GetState`
  - `TurnOn`
  - `TurnOff`
  - `SetBrightness`
- Client HTTP con timeout configurabile tramite `GROWLAB_SHELLY_TIMEOUT`.
- Target Shelly Dimmer 2 Gen1 via endpoint locale `/light/0`.
- Aggiunti endpoint API:
  - `GET /api/lighting/{id}/state`
  - `GET /api/lighting/{id}/events`
  - `POST /api/lighting/{id}/on`
  - `POST /api/lighting/{id}/off`
  - `POST /api/lighting/{id}/brightness`
- I comandi ON/OFF/brightness chiamano la HTTP API Shelly locale quando `lighting_systems.provider = 'shelly'` e `endpoint_url` e configurato.
- Ogni comando registra una riga in `lighting_events`.
- I fallimenti comando/stato registrano evento `*_failed` quando possibile.
- Aggiornati OpenAPI e client Orval con:
  - `LightingState`
  - `LightingEvent`
  - `endpointUrl` su `LightingSystem`
- Aggiunta query sqlc `ListLightingEvents`.

Frontend:

- Aggiornata pagina `/lighting`.
- Aggiunte card Shelly con:
  - stato ON/OFF con polling.
  - pulsanti ON/OFF.
  - slider brightness.
  - comando Set brightness.
  - storico eventi recente.
- Polling stato ogni 10 secondi.
- Polling storico eventi ogni 15 secondi.

## Esclusioni confermate

- Nessuna automazione AI.
- Nessuna esposizione internet.
- Nessuna schedulazione automatica eseguita.
- Nessuna modifica al modulo irrigazione.
- Nessun build globale.
