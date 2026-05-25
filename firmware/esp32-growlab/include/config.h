#pragma once

#include <Arduino.h>

struct GrowLabModules {
  bool soilMoisture = true;
  bool temperatureHumidity = true;
  bool lightSensor = false;
  bool relay = false;
  bool pumpControl = false;
  bool waterLevel = false;
  bool ota = true;
};

struct GrowLabConfig {
  String deviceId;
  String deviceName;
  uint32_t telemetryIntervalSeconds = 60;
  uint32_t heartbeatIntervalSeconds = 30;
  uint32_t configVersion = 1;
  GrowLabModules modules;
};
