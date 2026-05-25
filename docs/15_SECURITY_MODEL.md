# 15 — Security Model

## Stato iniziale

GrowLab non implementa autenticazione nella prima versione.

Motivo:

- uso personale;
- accesso solo LAN/VPN;
- riduzione complessità MVP.

## Vincoli obbligatori

- Non esporre su internet.
- Nessuna credenziale hardcoded.
- `.env` escluso da Git.
- `.env.example` senza password reali.
- MQTT con credenziali in ambiente reale.
- Redis non esposto pubblicamente.
- Ollama non esposto pubblicamente.
- API accessibile solo LAN/VPN.

## Predisposizione auth futura

Il codice deve permettere futura introduzione di:

- login locale;
- Auth.js;
- Keycloak;
- reverse proxy auth;
- ruoli admin/viewer.

## Device security

Ogni ESP32 deve avere:

- device UID;
- secret/token futuro;
- topic namespaced;
- accesso MQTT limitabile.

## Irrigazione

Modulo più critico.

Regole:

- disabilitata di default;
- kill switch;
- max runtime;
- log;
- nessuna azione AI.

## AI

- AI non affidabile come sorgente operativa;
- suggerimenti non vincolanti;
- confidence obbligatoria;
- human review richiesta.

## Backup

Proteggere:

- dump DB;
- immagini;
- firmware;
- configurazioni;
- `.env`.

## Open source

Prima di pubblicare:

- rimuovere IP personali;
- rimuovere password;
- sostituire hostname reali;
- usare `.env.example`;
- documentare setup generico.
