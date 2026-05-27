# STEP 20 — Feature Backlog

## Obiettivo

Raccogliere le feature future di GrowLab senza implementarle subito.

Questo documento serve a mantenere una roadmap ordinata, evitando che Codex implementi funzionalità avanzate prima che la base sia stabile.

## Regole

- Non implementare codice in questo step.
- Non modificare lo schema database esistente.
- Non creare nuove migrazioni.
- Non attivare AI.
- Non attivare irrigazione.
- Non introdurre autenticazione.
- Non modificare lo stack principale.

---

# Classificazione feature

## MVP

Feature utili già nella prima versione stabile.

### 1. System events globale

Creare una timeline globale del sistema.

Esempi:

- Shelly Dimmer 2 non raggiungibile;
- ESP32 offline;
- immagine caricata;
- firmware OTA programmato;
- upload fallito;
- sensore fuori range;
- worker MQTT riconnesso;
- schedulazione luce applicata.

Entità futura suggerita:

```text
system_events
```

Campi suggeriti:

```text
id
event_type
severity
source
zone_id
plant_id
device_id
message
metadata
created_at
```

Priorità: alta.

---

### 2. System alerts

Sistema di alert visuali in dashboard.

Stati:

```text
active
acknowledged
resolved
```

Esempi:

- device offline da più di X minuti;
- sensore non invia dati;
- temperatura fuori range;
- umidità fuori range;
- Shelly non raggiungibile;
- OTA fallito;
- errore worker MQTT.

Priorità: alta.

---

### 3. Zone target profiles

Ogni zona dovrebbe avere target ambientali.

Esempio:

```text
Zona Tropicale
- temperatura: 22-27 °C
- umidità: 55-75%
- luce: 60-80%
- fotoperiodo: 12h
```

Questi target permettono di generare alert e confrontare i valori reali con quelli ideali.

Priorità: alta.

---

### 4. Manual plant health status

Prima dell’AI, lo stato salute pianta deve essere gestibile manualmente.

Stati suggeriti:

```text
healthy
watch
stressed
critical
dormant
dead
```

Ogni cambio stato deve generare un evento nella timeline pianta.

Priorità: alta.

---

### 5. Device capability model

Ogni device ESP32 deve dichiarare capacità e moduli.

Esempio:

```json
{
  "sensors": ["temperature", "humidity", "soil_moisture"],
  "actuators": [],
  "supportsOta": true,
  "supportsConfig": true
}
```

Serve per evitare che il backend assuma che tutti i device siano uguali.

Priorità: alta.

---

### 6. Plant tasks / manual checklist

Checklist manuale per ogni pianta.

Esempi:

- controlla foglie;
- controlla substrato;
- ruota vaso;
- controlla parassiti;
- pulisci foglie;
- verifica livello acqua;
- scatta foto aggiornamento.

Priorità: media.

---

## V2

Feature da implementare dopo MVP stabile.

### 7. Sensor calibration wizard

Procedura guidata per calibrare sensori, soprattutto umidità terreno.

Esempio:

```text
Step 1: lettura sensore asciutto
Step 2: lettura sensore bagnato
Step 3: calcolo curva
Step 4: salvataggio calibrazione
```

Priorità: alta per utilizzo IoT reale.

---

### 8. Lighting profiles

Profili luce associabili a zone.

Esempio:

```text
Profilo Tropicale
08:00 -> ON 30%
09:00 -> 70%
20:00 -> 40%
21:00 -> OFF
```

Priorità: alta.

---

### 9. Lighting schedule simulation

Prima di salvare una schedule luce, mostrare grafico 24h dell’intensità.

Priorità: media.

---

### 10. Plant photo timeline / timelapse

Le foto caricate possono generare una timeline fotografica.

Funzioni future:

- confronto prima/dopo;
- slider immagini;
- timelapse;
- filtro per foto di crescita.

Priorità: media.

---

### 11. Kiosk mode

Pagina dedicata per tablet/monitor.

Route suggerita:

```text
/kiosk
```

Mostra:

- stato zone;
- luci;
- temperatura/umidità;
- alert;
- device online/offline;
- ultime foto.

Priorità: media.

---

### 12. Device provisioning

Procedura guidata per aggiungere nuovi ESP32.

Output:

- device id;
- configurazione MQTT;
- topic;
- moduli abilitati;
- intervalli telemetria;
- QR code futuro.

Priorità: alta.

---

## Future

### 13. Rules engine consultivo

Motore regole solo per alert/suggerimenti.

Esempio:

```text
SE temperatura > 30°C
ALLORA crea alert warning
```

Nessuna azione fisica nella prima versione.

Priorità: media.

---

### 14. Digital twin / visual zone layout

Rappresentazione visuale della growbox/zona.

Esempio:

```text
[Pianta A] [Pianta B]
[ESP32]    [Luce]
```

Inizialmente solo visuale.

Priorità: bassa/media.

---

### 15. Plant passport

Scheda esportabile per ogni pianta.

Include:

- nome;
- specie;
- zona;
- foto principali;
- storico eventi;
- condizioni ideali;
- note.

Priorità: bassa/media.

---

### 16. Export JSON/CSV

Esportazione:

- storico pianta;
- dati sensori;
- eventi;
- immagini metadata.

Priorità: media.

---

### 17. Firmware channels

Canali firmware:

```text
dev
beta
stable
```

Ogni device può essere associato a un canale.

Priorità: media.

---

### 18. OTA dry-run

Prima di OTA:

- controlla device online;
- controlla versione corrente;
- controlla compatibilità;
- controlla checksum;
- mostra riepilogo;
- richiede conferma.

Priorità: alta quando OTA sarà attivo.

---

## Experimental

### 19. AI plant health score

Score futuro 0-100 basato su:

- stato manuale;
- alert recenti;
- immagini;
- dati sensori;
- note;
- storico.

AI non implementata ora.

---

### 20. Advanced image analysis

Analisi futura:

- confronto immagini;
- segmentazione foglie;
- anomalie colore;
- crescita nel tempo;
- classificazione problemi.

AI non implementata ora.
