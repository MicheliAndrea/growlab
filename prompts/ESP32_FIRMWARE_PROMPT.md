# Prompt Codex — ESP32 Firmware

Implementa `firmware/esp32-growlab` con PlatformIO + Arduino.

Funzioni:

- Wi-Fi config iniziale hardcoded via env/header locale;
- MQTT connect;
- heartbeat;
- telemetry mock;
- config topic;
- command topic;
- OTA placeholder;
- moduli configurabili.

Regole:

- firmware unico;
- no pompa attiva;
- relay OFF al boot;
- ACK comandi;
- watchdog.
