# GrowLab ESP32 Firmware

PlatformIO firmware MVP for STEP 14.

## Setup

Create a local config file that is ignored by git:

```bash
cp include/growlab_config.example.h include/growlab_local_config.h
```

Then set:

- `GROWLAB_DEVICE_UID` to the `devices.device_uid` value registered in GrowLab.
- Wi-Fi SSID/password.
- MQTT host, port and credentials.
- Relay/pump pins and active levels for the specific board.

## MQTT topics

Published by the device:

- `growlab/devices/{device_uid}/heartbeat`
- `growlab/devices/{device_uid}/telemetry`
- `growlab/devices/{device_uid}/status`
- `growlab/devices/{device_uid}/ota/status`

Subscribed by the device:

- `growlab/devices/{device_uid}/config`
- `growlab/devices/{device_uid}/command`
- `growlab/devices/{device_uid}/ota/command`

## Safety

The relay and pump pins are set to OFF before Wi-Fi and MQTT are initialized.
The MVP command handler accepts OFF/status/restart commands only. It does not
turn the pump or relay ON.

## OTA

OTA command handling is a placeholder. The firmware publishes OTA status for
the received job, but automatic firmware installation is intentionally disabled.
