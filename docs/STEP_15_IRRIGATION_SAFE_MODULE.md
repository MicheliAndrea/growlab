# STEP 15 — Irrigation Safe Module

## Stato

Completato.

## Feature flags

```env
GROWLAB_FEATURE_IRRIGATION_MANUAL=false
GROWLAB_FEATURE_IRRIGATION_AUTOMATION=false
```

## Regole

- Nessun comando pompa attivo.
- UI read-only o disabled.
- API manual-run restituisce `IRRIGATION_DISABLED`.
- Nessuna automazione.

## Backend

- Le feature flags sono lette dalla configurazione API:
  - `GROWLAB_FEATURE_IRRIGATION_MANUAL`
  - `GROWLAB_FEATURE_IRRIGATION_AUTOMATION`
- Lo stato effettivo resta safe anche se esistono righe DB:
  - `manualRunEnabled = false`
  - `automationEnabled = false`
  - `pumpCommandsEnabled = false`
  - `automationCommandsEnabled = false`
- `GET /api/irrigation` lista i sistemi in modalita read-only e forza `enabled=false`, `automationEnabled=false` nella risposta.
- `GET /api/irrigation/safety` espone lo stato safety runtime.
- `POST /api/irrigation/{id}/manual-run` restituisce sempre:

```json
{
  "code": "IRRIGATION_DISABLED",
  "message": "manual irrigation is disabled"
}
```

## Frontend

- Aggiunta pagina `/irrigation`.
- Aggiunta voce navigation `Irrigation`.
- UI read-only:
  - card safety
  - feature flags
  - sistemi configurati
  - pulsante manual run visibile ma disabilitato

## Non implementato

- Nessun comando ON pompa/relay.
- Nessun publish MQTT per irrigazione.
- Nessuna automazione.
- Nessun calendario watering.
- Nessun collegamento a ESP32 per attuazione.
