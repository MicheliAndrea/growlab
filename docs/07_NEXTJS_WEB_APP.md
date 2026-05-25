# 07 — Next.js Web App

## Obiettivo

Definire la web app GrowLab.

## Stack

- Next.js App Router;
- TypeScript;
- TailwindCSS;
- shadcn/ui;
- TanStack Query;
- React Hook Form;
- Zod;
- Recharts;
- dark mode.

## Pagine principali

```text
/dashboard
/plants
/plants/[id]
/zones
/zones/[id]
/devices
/devices/[id]
/lighting
/ai-analysis
/wiki
/firmware
/settings
/system
```

## Dashboard

Mostrare:

- stato zone;
- piante recenti;
- dispositivi online/offline;
- temperatura/umidità se disponibili;
- stato luce;
- ultime immagini;
- ultime analisi AI;
- alert;
- stato servizi.

## Plants

Funzioni:

- lista piante;
- card pianta;
- ricerca;
- filtro per zona;
- dettaglio pianta;
- timeline;
- gallery;
- upload immagine da telefono;
- note;
- analisi AI collegate.

## Zones

Funzioni:

- lista zone;
- dettaglio zona;
- piante associate;
- sensori associati;
- luce associata;
- eventi recenti;
- configurazioni target.

## Devices

Funzioni:

- lista device;
- stato online/offline;
- ultimo heartbeat;
- firmware version;
- config;
- sensori;
- telemetria recente;
- pulsante OTA futuro.

## Lighting

Funzioni:

- stato Shelly Dimmer 2;
- ON/OFF;
- slider intensità;
- schedulazioni;
- storico eventi;
- profili zona.

## AI Analysis

Funzioni:

- elenco analisi;
- dettaglio analisi;
- osservazioni;
- suggerimenti;
- confidence;
- immagine collegata;
- storico per pianta.

## Wiki

Funzioni:

- famiglie;
- categorie;
- specie;
- profili pianta;
- problemi comuni;
- condizioni ideali;
- collegamento a piante reali.

## UI principles

- mobile-first;
- layout pulito;
- card moderne;
- dark mode;
- icone semplici;
- grafici leggibili;
- empty states curati;
- error states chiari;
- loading skeleton.

## Componenti consigliati

```text
components/
├── layout/
├── dashboard/
├── plants/
├── zones/
├── devices/
├── lighting/
├── ai/
├── wiki/
├── forms/
└── charts/
```

## API client

Creare un client centralizzato:

```text
lib/api-client.ts
```

Tutte le chiamate devono passare da lì o da hooks dedicati.

## Upload immagini

Da mobile deve essere semplice:

- selezione file;
- anteprima;
- compressione opzionale futura;
- upload multipart;
- stato upload;
- pulsante avvia analisi.

## No auth iniziale

Non implementare login nella prima versione, ma strutturare il layout in modo che una futura auth sia integrabile.
