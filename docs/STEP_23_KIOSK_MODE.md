# STEP 23 — Kiosk Mode

## Stato

Feature V2.

## Obiettivo

Creare una vista dedicata per tablet, monitor o dashboard sempre aperta.

Route suggerita:

```text
/kiosk
```

## Contenuti

La kiosk dashboard deve mostrare:

- ora/data;
- stato zone;
- stato luci;
- temperatura/umidità se disponibili;
- device online/offline;
- alert attivi;
- ultime immagini;
- ultimi eventi;
- stato API/worker.

## Design

- fullscreen;
- dark mode;
- leggibile da distanza;
- auto-refresh via polling;
- nessuna interazione complessa;
- componenti grandi;
- layout responsive.

## Aggiornamento dati

MVP:

```text
polling TanStack Query
```

Futuro:

```text
SSE o WebSocket
```

## Sicurezza

La kiosk page non deve esporre funzioni pericolose.

Azioni disabilitate:

- OTA;
- irrigazione;
- modifica configurazioni;
- cancellazioni.

Azioni eventualmente ammesse:

- acknowledge alert;
- link a dettaglio zona;
- link a dettaglio pianta.

## Priorità

Media.

Molto utile quando il sistema inizia a raccogliere dati reali.
