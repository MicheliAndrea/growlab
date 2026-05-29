# STEP 25 — Device Provisioning

## Stato

Implementata nella forma minimale create/claim.

## Obiettivo

Semplificare aggiunta di nuovi ESP32.

## Flusso attuale

1. Utente seleziona un device esistente.
2. Definisce `provisioningConfig`, metadata ed eventuale scadenza.
3. Il backend genera un token una sola volta e salva solo l'hash.
4. L'interfaccia mostra claim URL, token, QR code e configurazione.
5. Il token può essere marcato come claimed via endpoint dedicato.

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

Il claim URL attuale può contenere:

- token di claim;
- endpoint di claim;
- eventuali parametri di bootstrap.

La web app genera anche un QR SVG scansionabile dal claim URL.

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

Alta, ma il flusso base e già operativo.
