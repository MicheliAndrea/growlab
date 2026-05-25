# 09 — ESP32 Firmware

## Obiettivo

Definire firmware unico e configurabile per ESP32.

## Stack

- PlatformIO;
- Arduino framework;
- ESP32 WROOM;
- PubSubClient o Async MQTT client;
- ArduinoJson;
- OTA update;
- Wi-Fi manager futuro.

## Principi

- Un solo firmware base.
- Moduli abilitabili via configurazione.
- Nessuna logica AI nel firmware.
- Nessuna automazione critica non autorizzata.
- Ogni comando deve essere confermato con ACK.
- Heartbeat periodico obbligatorio.

## Moduli configurabili

```json
{
  "modules": {
    "soilMoisture": true,
    "temperatureHumidity": true,
    "lightSensor": false,
    "relay": false,
    "pumpControl": false,
    "waterLevel": false,
    "ota": true
  }
}
```

## Ciclo di boot

1. Carica configurazione locale.
2. Connessione Wi-Fi.
3. Connessione MQTT.
4. Pubblica status online.
5. Sottoscrive topic config/command/ota.
6. Avvia loop sensori.
7. Pubblica heartbeat periodico.

## Configurazione device

Esempio:

```json
{
  "deviceId": "esp32-zone-a-01",
  "deviceName": "Zone A Sensor Node",
  "telemetryIntervalSeconds": 60,
  "heartbeatIntervalSeconds": 30,
  "modules": {
    "soilMoisture": true,
    "temperatureHumidity": true,
    "ota": true
  }
}
```

## Telemetria

Il firmware deve inviare valori normalizzati.

Per sensori analogici, inviare:

- valore raw;
- valore convertito;
- unità;
- eventuale calibrazione applicata.

## OTA

Il firmware deve:

- ricevere comando OTA via MQTT;
- scaricare firmware via HTTP;
- verificare checksum se implementato;
- installare update;
- pubblicare stato;
- riavviare;
- pubblicare nuova versione.

## Protezioni

- Watchdog.
- Timeout Wi-Fi.
- Reconnect MQTT.
- Nessuna pompa attiva al boot.
- Relay sempre OFF al boot.
- Ignorare comandi se modulo disabilitato.
- ACK per ogni comando ricevuto.

## Versioning

Usare semantic versioning:

```text
0.1.0
0.2.0
1.0.0
```

Ogni firmware deve comunicare la propria versione nel heartbeat.
