# STEP 18 - AI Future Module

## Stato

Completato come guardrail e documentazione futura.

AI/Ollama resta futura e non e implementata nel MVP.

## Decisione

La predisposizione infrastrutturale puo esistere, ma nessuna funzione AI deve essere attiva senza uno step dedicato successivo.

Stato attuale:

- `GROWLAB_FEATURE_AI=false` negli env example.
- `growlab-ollama` e dietro Compose profile `ai`.
- Ollama non pubblica porte host.
- Non esistono endpoint OpenAPI AI.
- Non esistono handler API AI.
- Non esistono tabelle operative AI.
- Nessuna automazione usa output AI.

## Architettura futura

```text
Next.js
  |
  v
Go API
  |
  v
Ollama interno LAN/VPN
```

## Modelli previsti

- `qwen2.5vl:7b`
- fallback `qwen2.5vl:3b`

## Regole future

- AI solo consultiva.
- Nessuna azione automatica.
- Nessun controllo irrigazione.
- Nessun controllo luce.
- Nessun publish MQTT.
- Nessun comando OTA.
- Output sempre con confidence.
- Output sempre revisionabile manualmente.
- Salvataggio solo come osservazione storica della pianta.

## Possibili output futuri

- osservazione salute pianta;
- spiegazione testuale;
- confidence score;
- riferimenti a immagine/sensori usati;
- raccomandazioni manuali non eseguibili;
- stato review umano.

## Cosa NON implementare ora

- endpoint `/api/ai`;
- analisi immagini;
- plant health score automatico;
- rules engine con AI;
- automazioni basate su AI;
- provisioning modelli Ollama;
- UI AI.

## Verifiche leggere

```bash
! rg -n "/api/ai|ai/" openapi apps/api apps/web
! rg -n "CREATE TABLE .*ai|ai_" database/migrations database/queries
make docker-config
make security-check
git diff --check
```
