#include <Arduino.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>

#include "config.h"
#include "secrets.h"

#ifndef GROWLAB_FIRMWARE_VERSION
#define GROWLAB_FIRMWARE_VERSION "0.1.0"
#endif

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
GrowLabConfig config;

unsigned long lastTelemetryMs = 0;
unsigned long lastHeartbeatMs = 0;

String topic(const String& suffix) {
  return "growlab/devices/" + config.deviceId + "/" + suffix;
}

void publishJson(const String& topicName, JsonDocument& doc) {
  String payload;
  serializeJson(doc, payload);
  mqtt.publish(topicName.c_str(), payload.c_str());
}

void publishStatus(const char* status) {
  JsonDocument doc;
  doc["deviceId"] = config.deviceId;
  doc["status"] = status;
  doc["firmwareVersion"] = GROWLAB_FIRMWARE_VERSION;
  publishJson(topic("status"), doc);
}

void publishHeartbeat() {
  JsonDocument doc;
  doc["deviceId"] = config.deviceId;
  doc["timestamp"] = "";
  doc["firmwareVersion"] = GROWLAB_FIRMWARE_VERSION;
  doc["configVersion"] = config.configVersion;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["wifiRssi"] = WiFi.RSSI();
  doc["ipAddress"] = WiFi.localIP().toString();
  publishJson(topic("heartbeat"), doc);
}

void publishTelemetry() {
  JsonDocument doc;
  doc["deviceId"] = config.deviceId;
  doc["timestamp"] = "";
  JsonArray readings = doc["readings"].to<JsonArray>();

  if (config.modules.soilMoisture) {
    JsonObject soil = readings.add<JsonObject>();
    soil["sensorType"] = "soil_moisture";
    soil["value"] = 42.0;
    soil["unit"] = "%";
  }

  if (config.modules.temperatureHumidity) {
    JsonObject temp = readings.add<JsonObject>();
    temp["sensorType"] = "temperature";
    temp["value"] = 24.5;
    temp["unit"] = "C";
  }

  doc["wifiRssi"] = WiFi.RSSI();
  doc["uptimeSeconds"] = millis() / 1000;
  publishJson(topic("telemetry"), doc);
}

void publishAck(const char* ackTopic, const char* commandId, const char* status, const char* message) {
  JsonDocument doc;
  doc["deviceId"] = config.deviceId;
  doc["commandId"] = commandId;
  doc["status"] = status;
  doc["message"] = message;
  publishJson(topic(ackTopic), doc);
}

void handleConfig(JsonDocument& doc) {
  if (doc["telemetryIntervalSeconds"].is<uint32_t>()) {
    config.telemetryIntervalSeconds = doc["telemetryIntervalSeconds"];
  }
  if (doc["heartbeatIntervalSeconds"].is<uint32_t>()) {
    config.heartbeatIntervalSeconds = doc["heartbeatIntervalSeconds"];
  }
  config.configVersion += 1;
  publishAck("config/ack", doc["commandId"] | "config", "accepted", "Configuration applied");
}

void handleCommand(JsonDocument& doc) {
  const char* commandId = doc["commandId"] | "unknown";
  const char* type = doc["type"] | "";

  if (strcmp(type, "pump_on") == 0 || strcmp(type, "relay_on") == 0) {
    publishAck("command/ack", commandId, "rejected", "Physical actuator commands are disabled in MVP firmware");
    return;
  }

  publishAck("command/ack", commandId, "ignored", "Command type not implemented in MVP firmware");
}

void handleOta(JsonDocument& doc) {
  if (!config.modules.ota) {
    publishAck("ota/status", doc["jobId"] | "unknown", "rejected", "OTA module disabled");
    return;
  }

  publishAck("ota/status", doc["jobId"] | "unknown", "placeholder", "OTA command received; download/install implementation pending");
}

void onMqttMessage(char* rawTopic, byte* payload, unsigned int length) {
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  if (error) {
    return;
  }

  String incoming = rawTopic;
  if (incoming.endsWith("/config")) {
    handleConfig(doc);
  } else if (incoming.endsWith("/command")) {
    handleCommand(doc);
  } else if (incoming.endsWith("/ota")) {
    handleOta(doc);
  }
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(GROWLAB_WIFI_SSID, GROWLAB_WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void connectMqtt() {
  mqtt.setServer(GROWLAB_MQTT_HOST, GROWLAB_MQTT_PORT);
  mqtt.setCallback(onMqttMessage);

  while (!mqtt.connected()) {
    mqtt.connect(config.deviceId.c_str(), GROWLAB_MQTT_USERNAME, GROWLAB_MQTT_PASSWORD);
    delay(1000);
  }

  publishStatus("online");
  mqtt.subscribe(topic("config").c_str(), 1);
  mqtt.subscribe(topic("command").c_str(), 1);
  mqtt.subscribe(topic("ota").c_str(), 1);
}

void setup() {
  Serial.begin(115200);
  config.deviceId = GROWLAB_DEVICE_ID;
  config.deviceName = GROWLAB_DEVICE_NAME;

  connectWifi();
  connectMqtt();
  publishHeartbeat();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }
  if (!mqtt.connected()) {
    connectMqtt();
  }

  mqtt.loop();
  unsigned long now = millis();

  if (now - lastHeartbeatMs > config.heartbeatIntervalSeconds * 1000UL) {
    publishHeartbeat();
    lastHeartbeatMs = now;
  }

  if (now - lastTelemetryMs > config.telemetryIntervalSeconds * 1000UL) {
    publishTelemetry();
    lastTelemetryMs = now;
  }
}
