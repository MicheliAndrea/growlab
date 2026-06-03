# STEP 25 — Device Provisioning

## Stato

Implementata con create, QR claim web, preview, revoke ed expire.

## Obiettivo

Semplificare aggiunta di nuovi ESP32.

## Flusso attuale

1. Utente seleziona un device esistente.
2. Definisce `provisioningConfig`, metadata ed eventuale scadenza.
3. Il backend genera un token una sola volta e salva solo l'hash.
4. L'interfaccia mostra claim URL, token, QR code e configurazione.
5. Il QR punta alla web app `/provisioning/claim?token=...`.
6. La pagina claim mostra preview sicura e conferma il claim.
7. Il token può essere revocato, marcato expired o claimed via endpoint dedicati.

## Config generata

Esempio:

```json
{
  "deviceId": "esp32-zone-a-01",
  "deviceName": "Zone A Sensor Node",
  "mqttHost": "app-host",
  "mqttPort": 1883,
  "baseTopic": "growlab/devices/esp32-zone-a-01",
  "telemetryIntervalSeconds": 60,
  "heartbeatIntervalSeconds": 30,
  "modules": {
    "temperatureHumidity": true,
    "soilMoisture": true,
    "ota": true,
    "pumpControl": false
  }
}
```

## QR code provisioning

Il claim URL contiene:

- token di claim;
- pagina web di claim;
- eventuali parametri di bootstrap futuri.

La web app genera un QR SVG scansionabile dal claim URL. Il backend espone:

```text
GET /api/provisioning/claim?token=...
POST /api/provisioning/claim
```

La preview non espone `token_hash`. Il claim salva audit metadata:

```text
claim_attempts
last_claim_attempt_at
claimed_metadata
```

## Device capability model

Ogni device deve dichiarare cosa supporta:

```json
{
  "sensors": ["temperature", "humidity", "soil_moisture"],
  "actuators": [],
  "supportsOta": true,
  "supportsConfig": true
}
```

## Sicurezza

- token provisioning temporaneo;
- rotazione credenziali;
- revoca device.

## Priorità

Implementato come MVP avanzato.

Restano future:

- enrollment diretto da firmware ESP32;
- rotazione automatica credenziali MQTT per device;
- QR fisici stampabili in batch;
- policy di revoca automatica piu rigida.
