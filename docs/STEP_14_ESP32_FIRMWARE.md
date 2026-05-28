# STEP 14 — ESP32 Firmware

## Stato

Completato.

## Stack

- PlatformIO
- Arduino framework
- MQTT
- ArduinoJson
- OTA placeholder

## Funzioni

- Wi-Fi
- MQTT
- heartbeat
- telemetry mock
- config topic
- command topic
- OTA placeholder
- relay/pompa OFF al boot

## File

- `firmware/esp32-growlab/platformio.ini`
- `firmware/esp32-growlab/include/growlab_config.example.h`
- `firmware/esp32-growlab/src/main.cpp`
- `firmware/esp32-growlab/README.md`

## MQTT

Topic pubblicati dal firmware:

- `growlab/devices/{device_uid}/heartbeat`
- `growlab/devices/{device_uid}/telemetry`
- `growlab/devices/{device_uid}/status`
- `growlab/devices/{device_uid}/ota/status`

Topic sottoscritti dal firmware:

- `growlab/devices/{device_uid}/config`
- `growlab/devices/{device_uid}/command`
- `growlab/devices/{device_uid}/ota/command`

## Payload compatibili con worker

Heartbeat:

- `status`
- `ipAddress`
- `rssiDbm`
- `uptimeSeconds`
- `firmwareVersion`
- `metadata`

Telemetry mock:

- `readings[]`
- `sensorKey`
- `value`
- `unit`
- `metadata`

OTA status:

- `jobId`
- `status`
- `firmwareVersionId`
- `deviceFirmwareVersion`
- `errorMessage`
- `metadata`

## Sicurezza MVP

- Relay e pompa vengono portati a OFF subito in `setup()`, prima di Wi-Fi e MQTT.
- Il command handler accetta solo:
  - `status`
  - `all_off`
  - `relay_off`
  - `pump_off`
  - `restart`
- Non sono implementati comandi ON per pompa o relay.
- Non viene attivata irrigazione.

## OTA

- `growlab/devices/{device_uid}/ota/command` accetta il payload preparato dallo STEP 13.
- Il firmware pubblica stato OTA su `ota/status`.
- L'installazione firmware automatica e intenzionalmente disabilitata: il comando OTA termina come placeholder con status `failed` e messaggio esplicito.

## Config locale

Il file `include/growlab_local_config.h` e ignorato da git. Per configurare una board:

```bash
cp include/growlab_config.example.h include/growlab_local_config.h
```

Poi modificare UID device, Wi-Fi, MQTT e pin locali.
