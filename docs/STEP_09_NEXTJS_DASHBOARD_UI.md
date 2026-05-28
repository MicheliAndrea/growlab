# STEP 09 — Next.js Dashboard UI

## Pagine

- /
- /dashboard
- /plants
- /zones
- /devices
- /lighting
- /images
- /firmware
- /settings

## Design

- moderno
- responsive
- dark mode
- card-based
- mobile-first
- shadcn/ui
- stati vuoti curati
- polling con TanStack Query

## Alert MVP

Solo alert web dashboard.

## Implementazione

- Aggiunta dashboard condivisa per `/` e `/dashboard`.
- Aggiunta navigazione reale desktop/mobile in `AppShell`.
- Aggiunte pagine:
  - `/plants`
  - `/zones`
  - `/devices`
  - `/lighting`
  - `/images`
  - `/firmware`
  - `/settings`
- Aggiunto layer query frontend in `apps/web/lib/queries.ts`.
- Usato TanStack Query con polling:
  - 30 secondi per risorse operative.
  - 15 secondi per alert attivi in dashboard.
- Aggiunti stati loading/error/empty coerenti.
- Aggiunte azioni web dashboard per acknowledge/resolve alert.
- Aggiunti grafici dashboard Recharts:
  - area chart per carico operativo.
  - bar chart per distribuzione risorse.
  - donut chart per alert, salute piante e stato device.
  - bar chart per severita eventi.
- Aggiunto design system light/dark esplicito con token CSS condivisi.
- Aggiunto selettore tema `Light / Dark / System` persistito in `localStorage`.
- Aggiornato runtime fetcher Orval con default API locale `http://localhost:8080`.

## Esclusioni confermate

- Nessuna nuova API backend.
- Nessuna autenticazione.
- Nessuna AI.
- Nessuna irrigazione attiva.
- Nessun kiosk mode.
- Nessuna dashboard Grafana.
- Nessun build frontend eseguito.
