# STEP 21 — Rules Engine Future

## Stato

Scheduler consultivo implementato.

Il rules engine automatico e presente come scheduler opt-in. Restano esclusi AI e azioni fisiche.

## Obiettivo

Gestire un motore regole consultivo per generare alert e suggerimenti, senza eseguire azioni fisiche automatiche.

## Principio fondamentale

Il rules engine può:

- creare alert;
- suggerire controlli;
- evidenziare anomalie;
- classificare severità.

Il rules engine non può:

- attivare pompe;
- spegnere o accendere luci senza conferma;
- modificare configurazioni critiche;
- eseguire azioni suggerite dall’AI.

## Esempi regole

```text
SE device offline > 10 minuti
ALLORA crea alert critical

SE temperatura zona > target_max
ALLORA crea alert warning

SE soil_moisture < soglia
ALLORA suggerisci controllo manuale substrato

SE Shelly non raggiungibile
ALLORA crea alert warning

SE OTA fallisce
ALLORA crea alert critical
```

## Struttura implementata nel MVP

```text
automation_rules
automation_rule_evaluations
```

Il modello usa JSONB per `condition_config`, `action_config`, contesto valutazione e risultato. Questo evita di bloccare ora una DSL troppo rigida.

Endpoint implementati:

```text
GET /api/automation/rules
POST /api/automation/rules
GET /api/automation/context
POST /api/automation/scheduler/run
GET /api/automation/rules/{id}/evaluations
POST /api/automation/rules/{id}/evaluate
```

La UI e nella pagina:

```text
/operations
```

Lo scheduler runtime e controllato da env:

```text
GROWLAB_RULES_SCHEDULER_ENABLED=false
GROWLAB_RULES_SCHEDULER_TICK=30s
GROWLAB_RULES_SCHEDULER_BATCH_LIMIT=25
```

Campi scheduler su `automation_rules`:

```text
trigger_mode
schedule_interval_seconds
scheduler_commit
cooldown_seconds
next_run_at
last_scheduler_run_at
scheduler_status
scheduler_error
```

Il context automatico include contatori sistema, health piante, alert attivi e ultime letture per tipo sensore.

## Struttura futura suggerita

```text
rules
rule_conditions
rule_actions
rule_evaluations
```

## Tipi azione permessi nel primo rules engine

```text
create_alert
create_system_event
show_dashboard_suggestion
```

## Tipi azione vietati inizialmente

```text
turn_on_pump
turn_off_pump
change_lighting
run_ota
change_device_config
```

## UI MVP

Funzioni implementate:

- lista regole;
- creazione regola;
- trigger manuale o schedulato;
- intervallo schedulazione;
- cooldown anti-ripetizione;
- commit automatico limitato alle azioni sicure;
- visualizza ultima valutazione;
- storico valutazioni;
- test manuale regola;
- commit esplicito delle sole azioni sicure.

## Priorità

Implementato come MVP avanzato.

Restano future:

- DSL regole piu tipizzata;
- editor visuale condizioni/azioni;
- scheduler distribuito con lock cross-process dedicato;
- policy/rate limit piu fine per alert ripetuti;
- integrazione AI, se progettata esplicitamente.
