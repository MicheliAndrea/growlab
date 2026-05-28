#include <Arduino.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <math.h>

#if __has_include("growlab_local_config.h")
#include "growlab_local_config.h"
#else
#include "growlab_config.example.h"
#endif

namespace {

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

uint32_t heartbeatIntervalMs = GROWLAB_HEARTBEAT_INTERVAL_MS;
uint32_t telemetryIntervalMs = GROWLAB_TELEMETRY_INTERVAL_MS;
uint32_t lastHeartbeatAt = 0;
uint32_t lastTelemetryAt = 0;
uint32_t lastWifiAttemptAt = 0;
uint32_t lastMqttAttemptAt = 0;
bool mockTelemetryEnabled = true;

String deviceBaseTopic() {
  return String("growlab/devices/") + GROWLAB_DEVICE_UID;
}

String topic(const char *suffix) {
  return deviceBaseTopic() + "/" + suffix;
}

void writeOutputOff(uint8_t pin, uint8_t activeLevel) {
  digitalWrite(pin, activeLevel == HIGH ? LOW : HIGH);
}

void setSafeOutputsOff() {
  writeOutputOff(GROWLAB_RELAY_PIN, GROWLAB_RELAY_ACTIVE_LEVEL);
  writeOutputOff(GROWLAB_PUMP_PIN, GROWLAB_PUMP_ACTIVE_LEVEL);
}

void configureSafeOutputs() {
  pinMode(GROWLAB_RELAY_PIN, OUTPUT);
  pinMode(GROWLAB_PUMP_PIN, OUTPUT);
  setSafeOutputsOff();
}

template <typename TDocument>
bool publishJson(const String &targetTopic, TDocument &doc, bool retained = false) {
  String payload;
  serializeJson(doc, payload);
  return mqttClient.publish(targetTopic.c_str(), payload.c_str(), retained);
}

void publishStatus(const char *status, const char *message = nullptr) {
  StaticJsonDocument<384> doc;
  doc["status"] = status;
  doc["firmwareVersion"] = GROWLAB_FIRMWARE_VERSION;

  JsonObject metadata = doc["metadata"].to<JsonObject>();
  metadata["uptimeSeconds"] = millis() / 1000;
  metadata["wifiRssiDbm"] = WiFi.isConnected() ? WiFi.RSSI() : 0;
  metadata["relaySafeOff"] = true;
  metadata["pumpSafeOff"] = true;
  if (message != nullptr && message[0] != '\0') {
    metadata["message"] = message;
  }

  publishJson(topic("status"), doc, false);
}

void publishHeartbeat() {
  StaticJsonDocument<512> doc;
  doc["status"] = WiFi.isConnected() ? "online" : "offline";
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["rssiDbm"] = WiFi.RSSI();
  doc["uptimeSeconds"] = millis() / 1000;
  doc["firmwareVersion"] = GROWLAB_FIRMWARE_VERSION;

  JsonObject metadata = doc["metadata"].to<JsonObject>();
  metadata["heapFree"] = ESP.getFreeHeap();
  metadata["mockTelemetryEnabled"] = mockTelemetryEnabled;
  metadata["relaySafeOff"] = true;
  metadata["pumpSafeOff"] = true;

  publishJson(topic("heartbeat"), doc, false);
}

void publishTelemetry() {
  if (!mockTelemetryEnabled) {
    return;
  }

  const float phase = static_cast<float>(millis()) / 60000.0F;
  const float temperature = 22.0F + sinf(phase) * 2.0F;
  const float humidity = 56.0F + cosf(phase * 0.7F) * 7.0F;
  const float moisture = 42.0F + sinf(phase * 0.4F) * 5.0F;

  StaticJsonDocument<768> doc;
  JsonArray readings = doc["readings"].to<JsonArray>();

  JsonObject temperatureReading = readings.add<JsonObject>();
  temperatureReading["sensorKey"] = "mock_temperature";
  temperatureReading["value"] = temperature;
  temperatureReading["unit"] = "celsius";

  JsonObject humidityReading = readings.add<JsonObject>();
  humidityReading["sensorKey"] = "mock_humidity";
  humidityReading["value"] = humidity;
  humidityReading["unit"] = "percent";

  JsonObject moistureReading = readings.add<JsonObject>();
  moistureReading["sensorKey"] = "mock_soil_moisture";
  moistureReading["value"] = moisture;
  moistureReading["unit"] = "percent";

  JsonObject metadata = doc["metadata"].to<JsonObject>();
  metadata["source"] = "esp32_mock";
  metadata["firmwareVersion"] = GROWLAB_FIRMWARE_VERSION;

  publishJson(topic("telemetry"), doc, false);
}

void publishOtaStatus(const char *jobId, const char *firmwareVersionId, const char *status, const char *errorMessage, JsonObjectConst command) {
  StaticJsonDocument<768> doc;
  doc["jobId"] = jobId;
  doc["status"] = status;
  doc["firmwareVersionId"] = firmwareVersionId;
  doc["deviceFirmwareVersion"] = GROWLAB_FIRMWARE_VERSION;
  if (errorMessage != nullptr && errorMessage[0] != '\0') {
    doc["errorMessage"] = errorMessage;
  }

  JsonObject metadata = doc["metadata"].to<JsonObject>();
  metadata["otaPlaceholder"] = true;
  metadata["automaticInstallDisabled"] = true;
  if (command["downloadUrl"].is<const char *>()) {
    metadata["downloadUrl"] = command["downloadUrl"].as<const char *>();
  }
  if (command["checksumSha256"].is<const char *>()) {
    metadata["checksumSha256"] = command["checksumSha256"].as<const char *>();
  }

  publishJson(topic("ota/status"), doc, false);
}

void handleConfig(JsonObjectConst config) {
  if (config["heartbeatIntervalMs"].is<uint32_t>()) {
    heartbeatIntervalMs = constrain(config["heartbeatIntervalMs"].as<uint32_t>(), 5000UL, 3600000UL);
  }
  if (config["telemetryIntervalMs"].is<uint32_t>()) {
    telemetryIntervalMs = constrain(config["telemetryIntervalMs"].as<uint32_t>(), 5000UL, 3600000UL);
  }
  if (config["mockTelemetryEnabled"].is<bool>()) {
    mockTelemetryEnabled = config["mockTelemetryEnabled"].as<bool>();
  }
  publishStatus("online", "config_applied");
}

void handleCommand(JsonObjectConst command) {
  const char *action = command["action"] | "";

  if (strcmp(action, "status") == 0) {
    publishStatus("online", "status_requested");
    publishHeartbeat();
    return;
  }

  if (strcmp(action, "all_off") == 0 || strcmp(action, "relay_off") == 0 || strcmp(action, "pump_off") == 0) {
    setSafeOutputsOff();
    publishStatus("online", "safe_outputs_off");
    return;
  }

  if (strcmp(action, "restart") == 0) {
    setSafeOutputsOff();
    publishStatus("restarting", "restart_requested");
    delay(250);
    ESP.restart();
    return;
  }

  publishStatus("error", "unsupported_command");
}

void handleOtaCommand(JsonObjectConst command) {
  const char *action = command["action"] | "";
  const char *jobId = command["jobId"] | "";
  const char *firmwareVersionId = command["firmwareVersionId"] | "";

  if (strcmp(action, "ota_update") != 0 || jobId[0] == '\0') {
    publishStatus("error", "invalid_ota_command");
    return;
  }

  publishOtaStatus(jobId, firmwareVersionId, "running", nullptr, command);
  delay(100);
  publishOtaStatus(jobId, firmwareVersionId, "failed", "ota placeholder only; firmware install disabled in MVP", command);
}

void onMqttMessage(char *rawTopic, uint8_t *payload, unsigned int length) {
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  if (error) {
    publishStatus("error", "invalid_json");
    return;
  }

  const String receivedTopic(rawTopic);
  if (receivedTopic.endsWith("/config")) {
    handleConfig(doc.as<JsonObjectConst>());
    return;
  }
  if (receivedTopic.endsWith("/ota/command")) {
    handleOtaCommand(doc.as<JsonObjectConst>());
    return;
  }
  if (receivedTopic.endsWith("/command")) {
    handleCommand(doc.as<JsonObjectConst>());
    return;
  }
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  const uint32_t now = millis();
  if (now - lastWifiAttemptAt < GROWLAB_WIFI_RETRY_INTERVAL_MS) {
    return;
  }
  lastWifiAttemptAt = now;

  WiFi.mode(WIFI_STA);
  WiFi.begin(GROWLAB_WIFI_SSID, GROWLAB_WIFI_PASSWORD);
}

void subscribeControlTopics() {
  mqttClient.subscribe(topic("config").c_str(), 1);
  mqttClient.subscribe(topic("command").c_str(), 1);
  mqttClient.subscribe(topic("ota/command").c_str(), 1);
}

void connectMqtt() {
  if (WiFi.status() != WL_CONNECTED || mqttClient.connected()) {
    return;
  }

  const uint32_t now = millis();
  if (now - lastMqttAttemptAt < GROWLAB_MQTT_RETRY_INTERVAL_MS) {
    return;
  }
  lastMqttAttemptAt = now;

  const String clientId = String(GROWLAB_DEVICE_UID) + "-" + String(static_cast<uint32_t>(ESP.getEfuseMac()), HEX);
  StaticJsonDocument<192> willDoc;
  willDoc["status"] = "offline";
  willDoc["firmwareVersion"] = GROWLAB_FIRMWARE_VERSION;
  String willPayload;
  serializeJson(willDoc, willPayload);

  const bool connected = mqttClient.connect(
      clientId.c_str(),
      GROWLAB_MQTT_USERNAME,
      GROWLAB_MQTT_PASSWORD,
      topic("status").c_str(),
      1,
      true,
      willPayload.c_str());

  if (!connected) {
    return;
  }

  subscribeControlTopics();
  publishStatus("online", "mqtt_connected");
  publishHeartbeat();
}

void publishScheduledMessages() {
  if (!mqttClient.connected()) {
    return;
  }

  const uint32_t now = millis();
  if (now - lastHeartbeatAt >= heartbeatIntervalMs) {
    lastHeartbeatAt = now;
    publishHeartbeat();
  }
  if (now - lastTelemetryAt >= telemetryIntervalMs) {
    lastTelemetryAt = now;
    publishTelemetry();
  }
}

} // namespace

void setup() {
  Serial.begin(115200);
  configureSafeOutputs();

  mqttClient.setServer(GROWLAB_MQTT_HOST, GROWLAB_MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);

  connectWifi();
}

void loop() {
  connectWifi();
  connectMqtt();
  mqttClient.loop();
  publishScheduledMessages();
  delay(10);
}
