# GrowLab ESP32 Firmware

PlatformIO firmware scaffold for a single configurable ESP32 build.

Implemented:

- Wi-Fi connection from local `include/secrets.h`
- MQTT connection
- heartbeat topic
- telemetry mock topic
- config, command, and OTA subscriptions
- ACK responses
- physical actuator commands rejected by default

Setup:

1. Copy `include/secrets.example.h` to `include/secrets.h`.
2. Fill local Wi-Fi and MQTT values.
3. Run `pio run` from this directory.

Irrigation and relay commands are intentionally disabled in the MVP firmware.
