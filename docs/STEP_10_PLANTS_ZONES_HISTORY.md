# STEP 10 — Plants, Zones, History

## Backend

- CRUD zones
- CRUD plants
- plant events
- plant wiki base
- endpoints timeline

## Frontend

- lista zone
- dettaglio zona
- lista piante
- dettaglio pianta
- timeline
- form create/edit
- empty states

## Implementazione

Backend:

- Confermati CRUD zones.
- Confermati CRUD plants.
- Aggiunti endpoint plant events:
  - `GET /api/plants/{id}/events`
  - `POST /api/plants/{id}/events`
- Aggiunta creazione evento manuale in `plant_events`.
- La creazione pianta registra anche lo stato salute iniziale in `plant_status_history`.
- L'update pianta registra una voce in `plant_status_history` quando cambia `currentHealthStatus`.
- Aggiornato OpenAPI con `PlantEvent` e `PlantEventCreateRequest`.
- Aggiornata query sqlc `CreatePlantEvent`.

Frontend:

- `/zones` ora contiene azioni per aprire, modificare e creare zone.
- Aggiunte pagine:
  - `/zones/new`
  - `/zones/{id}`
  - `/zones/{id}/edit`
  - `/plants/new`
  - `/plants/{id}`
  - `/plants/{id}/edit`
- Aggiunti form create/edit per zone e piante.
- Aggiunto dettaglio zona con proprietà, target profiles e piante assegnate.
- Aggiunto dettaglio pianta con proprietà, timeline, eventi manuali, checklist e form evento.
- Aggiunta sezione Plant Wiki base nella lista piante con conteggi famiglie, categorie e specie.
- Mantenuti stati loading/error/empty.

## Esclusioni confermate

- Nessun upload immagini reale.
- Nessuna AI.
- Nessuna irrigazione attiva.
- Nessuna autenticazione.
- Nessun build globale.
