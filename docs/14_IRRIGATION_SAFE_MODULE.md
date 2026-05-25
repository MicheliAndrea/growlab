# 14 — Irrigation Safe Module

## Obiettivo

Predisporre il modulo irrigazione, mantenendolo inizialmente disabilitato.

## Stato iniziale

```json
{
  "irrigationManualControl": false,
  "irrigationAutomation": false
}
```

## Perché disabilitato

L’irrigazione può causare:

- allagamenti;
- danni a pompe;
- danni elettrici;
- eccesso acqua;
- danni alle piante.

Per questo deve essere safe-by-default.

## MVP disabilitato

Nella prima versione:

- creare modello dati;
- mostrare UI read-only;
- nessun comando pompa;
- nessuna automazione.

## Fase manuale protetta futura

Requisiti minimi:

- feature flag attivo;
- conferma utente;
- durata massima;
- log evento;
- stop manuale;
- blocco se device offline;
- blocco se configurazione incompleta.

## Fase automatica futura

Requisiti:

- sensore umidità affidabile;
- calibrazione;
- soglie;
- cooldown;
- massimo volume/durata giornaliera;
- finestra oraria;
- livello acqua;
- kill switch globale;
- simulazione prima dell’attivazione.

## API

Endpoint predisposti:

```http
GET /api/zones/{zoneId}/irrigation
POST /api/irrigation/{id}/manual-run
POST /api/irrigation/{id}/stop
```

Se feature flag disabilitato:

```json
{
  "error": "IRRIGATION_DISABLED",
  "message": "Irrigation control is disabled by feature flag."
}
```

## Regole Codex

Codex non deve implementare automazioni attive nella prima versione.
