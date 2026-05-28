# STEP 11 — Images Upload

## Obiettivo

Upload immagini da web app, anche da smartphone.

## Regole

- file su volume Docker dedicato
- metadata nel DB
- immagini NON nel DB
- associazione a pianta e zona
- gallery base
- AI non implementata ora

## Backend

- multipart upload
- validazione mime/size
- salvataggio path configurato
- metadata DB
- serve immagine in modo controllato

## Implementazione

Database:

- Aggiunta migrazione `database/migrations/000004_plant_image_zone_association.sql`.
- `plant_images` ora mantiene anche `zone_id` storico, derivato dalla zona corrente della pianta al momento dell'upload.
- Aggiunto indice `plant_images_zone_uploaded_idx`.
- Le immagini restano file su storage, non blob nel database.

Backend:

- `POST /api/plants/{id}/images` gestisce upload `multipart/form-data`.
- Validazione file:
  - file obbligatorio.
  - dimensione massima configurabile con `GROWLAB_IMAGE_UPLOAD_MAX_BYTES`.
  - MIME ammessi: JPEG, PNG, WebP.
- Salvataggio su filesystem sotto `GROWLAB_IMAGE_STORAGE_PATH`.
- Path salvato nel DB come path relativo.
- Metadata salvati in `plant_images`: plant, zone, filename, content type, size, checksum SHA-256, growth stage, tags e metadata JSON.
- Aggiunto `GET /api/plants/{id}/images` per gallery metadata.
- Aggiunto `GET /api/images/{id}/file` per servire il file in modo controllato.
- Il file viene rimosso se il salvataggio DB fallisce dopo la scrittura su disco.
- Aggiornato OpenAPI e client Orval.
- Aggiornato fetcher Orval per non forzare `Content-Type: application/json` quando il body e `FormData`.

Frontend:

- Aggiunto form upload immagine nel dettaglio pianta.
- File input ottimizzato per smartphone con `accept=image/*` e capture camera.
- Aggiunti campi `capturedAt`, `growthStage` e `tags`.
- Aggiunta gallery nel dettaglio pianta.
- Aggiornata pagina `/images` come gallery globale basata su metadata reali, non solo timeline.
- Le anteprime sono servite da `GET /api/images/{id}/file`.

## Esclusioni confermate

- Nessuna AI image analysis.
- Nessun upload verso storage esterno.
- Nessun blob immagine nel DB.
- Nessuna autenticazione.
- Nessun build globale.
