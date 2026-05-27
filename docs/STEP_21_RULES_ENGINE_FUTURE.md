# STEP 21 — Rules Engine Future

## Stato

Feature futura.

Non implementare nel MVP.

## Obiettivo

Creare in futuro un motore regole consultivo per generare alert e suggerimenti, senza eseguire azioni fisiche automatiche.

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
create_plant_event
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

## UI futura

Pagina:

```text
/settings/rules
```

Funzioni:

- lista regole;
- abilita/disabilita;
- visualizza ultima valutazione;
- storico valutazioni;
- test manuale regola.

## Priorità

V2/Future.

Prima devono essere stabili:

- dati sensori;
- system_alerts;
- system_events;
- target zone profiles.
