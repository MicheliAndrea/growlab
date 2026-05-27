# STEP 22 — Sensor Calibration

## Stato

Feature V2.

## Obiettivo

Aggiungere una procedura guidata per calibrare sensori, soprattutto sensori analogici di umidità terreno.

## Perché è importante

I sensori analogici economici non hanno valori assoluti affidabili.

Serve calibrazione per convertire:

```text
raw analog value -> percentuale utile
```

## Wizard umidità terreno

### Step 1 — Sensore asciutto

L’utente mette il sensore in aria o in substrato completamente asciutto.

Il sistema legge valore raw.

### Step 2 — Sensore bagnato

L’utente mette il sensore in acqua o substrato saturo.

Il sistema legge valore raw.

### Step 3 — Calcolo curva

Il sistema calcola:

```text
dry_value
wet_value
conversion formula
```

### Step 4 — Salvataggio

La calibrazione viene salvata associata al sensore.

## Campi futuri suggeriti

Nel campo `sensors.calibration` JSONB:

```json
{
  "type": "linear",
  "dryRaw": 3200,
  "wetRaw": 1200,
  "minPercent": 0,
  "maxPercent": 100,
  "inverted": true
}
```

## UI futura

Pagina:

```text
/devices/{id}/sensors/{sensorId}/calibration
```

Funzioni:

- start calibration;
- live raw value;
- salva dry;
- salva wet;
- test conversione;
- reset calibrazione.

## Regole

- Non usare calibrazione non confermata.
- Mantenere raw value nei metadata.
- Mostrare sempre ultimo valore raw per debug.
- Permettere reset calibrazione.
