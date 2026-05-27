# STEP 15 — Irrigation Safe Module

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
