# Codex Master Prompt — GrowLab

Devi implementare il progetto **GrowLab** seguendo tutta la documentazione nella cartella `docs`.

## Contesto

GrowLab è una piattaforma self-hosted per home lab per gestione piante, zone, ESP32, MQTT, Shelly Dimmer 2, upload immagini, analisi AI locale con Ollama e predisposizione OTA/irrigazione.

## Vincoli obbligatori

- Monorepo.
- Frontend Next.js App Router + TypeScript + TailwindCSS + shadcn/ui.
- Backend .NET 10 Web API.
- Worker .NET 10.
- AI service Python FastAPI.
- Database PostgreSQL + TimescaleDB su host esterno `pg-01`.
- Runtime Docker Compose su `app-01`.
- MQTT con EMQX.
- Storage immagini su volume Docker.
- Firmware ESP32 unico con PlatformIO + Arduino.
- AI solo consultiva.
- Irrigazione predisposta ma disabilitata.
- Nessuna autenticazione nella prima versione.
- Accesso solo LAN/VPN.
- Nessun secret hardcoded.

## Prima di scrivere codice

Leggi in ordine:

1. `docs/00_PROJECT_GUIDELINES.md`
2. `docs/01_ARCHITECTURE_OVERVIEW.md`
3. `docs/02_MONOREPO_STRUCTURE.md`
4. `docs/18_DEVELOPMENT_TASKS.md`

## Output atteso

Genera codice incrementale, pulito e commentato dove serve.

Ogni modulo deve essere funzionante o avere placeholder espliciti.

## Regole

- Non implementare irrigazione attiva.
- Non permettere all’AI di eseguire comandi.
- Non usare servizi cloud obbligatori.
- Non salvare immagini in database.
- Non introdurre auth nella prima versione, ma non impedire futura auth.
- Usare environment variables.
- Aggiornare README quando aggiungi moduli.
