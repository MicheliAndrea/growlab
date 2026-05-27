# STEP 25 — Device Provisioning

## Stato

Feature V2.

## Obiettivo

Semplificare aggiunta di nuovi ESP32.

## Flusso futuro

1. Utente crea nuovo device dalla web app.
2. Sceglie:
   - nome;
   - zona;
   - moduli sensori;
   - intervallo telemetria;
   - intervallo heartbeat;
   - supporto OTA.
3. Il sistema genera configurazione.
4. L’utente copia config o scarica file.
5. Futuro: QR code provisioning.

## Config generata

Esempio:

```json
{
  "deviceId": "esp32-zone-a-01",
  "deviceName": "Zone A Sensor Node",
  "mqttHost": "app-01",
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

Il QR code può contenere:

- device id;
- MQTT host;
- MQTT port;
- base topic;
- config token futuro;
- moduli abilitati.

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

## Sicurezza futura

- token provisioning temporaneo;
- credenziali MQTT per device;
- rotazione credenziali;
- revoca device.

## Priorità

Alta, quando inizieranno ad aumentare gli ESP32.
