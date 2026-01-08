#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

// ====== WiFi + MQTT ======
const char *WIFI_SSID = "YOUR_WIFI";
const char *WIFI_PASS = "YOUR_PASS";

const char *MQTT_HOST = "192.168.1.100"; // IP of your MQTT broker (server running docker)
const int MQTT_PORT = 1883;
const char *DEVICE_ID = "demoDevice01";

// ====== Pins ======
#define SDA_MAX30102 8
#define SCL_MAX30102 9
#define SDA_MAX30205 2
#define SCL_MAX30205 1
#define ONE_WIRE_BUS 7

// ====== MAX30205 calibration (from your code) ======
const float CAL_R1 = -37.5;
const float CAL_T1 = 28.0;
const float CAL_R2 = -34.0;
const float CAL_T2 = 34.0;

// ====== MAX30102 setup (single sensor) ======

#define PUBLISH_INTERVAL_MS 15000

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);

MAX30105 max30102;

#if !defined(Wire1)
TwoWire Wire1 = TwoWire(1);
#endif

bool maxAvailable = false;
float lastHr = 0.0f;
float lastSpo2 = 0.0f;
float lastBodyTemp = 0.0f;
float lastAmbientTemp = 0.0f;
unsigned long lastPublish = 0;

bool initMax30102() {
  if (!max30102.begin(Wire1, I2C_SPEED_FAST)) {
    return false;
  }

  byte ledBrightness = 0x1F;
  byte sampleAverage = 4;
  byte ledMode = 2;      // Red + IR
  int sampleRate = 100;  // 100 samples per second
  int pulseWidth = 411;
  int adcRange = 4096;

  max30102.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
  max30102.setPulseAmplitudeRed(0x1F);
  max30102.setPulseAmplitudeIR(0x1F);
  max30102.setPulseAmplitudeGreen(0);
  max30102.clearFIFO();
  return true;
}

float readMax30205RawC() {
  const uint8_t MAX30205_ADDR = 0x48;
  const uint8_t REG_TEMP = 0x00;

  Wire.beginTransmission(MAX30205_ADDR);
  Wire.write(REG_TEMP);
  if (Wire.endTransmission(false) != 0) return NAN;

  Wire.requestFrom(MAX30205_ADDR, (uint8_t)2);
  if (Wire.available() < 2) return NAN;

  uint8_t msb = Wire.read();
  uint8_t lsb = Wire.read();
  int16_t raw = (int16_t)((msb << 8) | lsb);
  return raw * 0.00390625f;
}

float calibrateC(float r) {
  float a = (CAL_T2 - CAL_T1) / (CAL_R2 - CAL_R1);
  float b = CAL_T1 - a * CAL_R1;
  return a * r + b;
}

bool readMax30102(float &hr, float &spo2) {
  max30102.clearFIFO();

  const int bufferLength = 100;
  uint32_t irBuffer[bufferLength];
  uint32_t redBuffer[bufferLength];

  for (int i = 0; i < bufferLength; i++) {
    while (!max30102.available()) {
      max30102.check();
      delay(1);
    }
    redBuffer[i] = max30102.getRed();
    irBuffer[i] = max30102.getIR();
    max30102.nextSample();
  }

  int32_t spo2Raw = 0;
  int8_t spo2Valid = 0;
  int32_t hrRaw = 0;
  int8_t hrValid = 0;

  maxim_heart_rate_and_oxygen_saturation(
    irBuffer,
    bufferLength,
    redBuffer,
    &spo2Raw,
    &spo2Valid,
    &hrRaw,
    &hrValid
  );

  if (!hrValid || !spo2Valid || hrRaw <= 0 || spo2Raw <= 0) {
    return false;
  }

  hr = (float)hrRaw;
  spo2 = (float)spo2Raw;
  return true;
}

float readAmbientTemp() {
  ds18b20.requestTemperatures();
  return ds18b20.getTempCByIndex(0);
}

float sanitize(float value, float fallback) {
  if (isnan(value) || !isfinite(value)) return fallback;
  return value;
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void ensureMQTT() {
  if (mqttClient.connected()) return;
  while (!mqttClient.connected()) {
    mqttClient.connect(DEVICE_ID);
    delay(500);
  }
}

String isoTimestamp() {
  time_t now = time(nullptr);
  struct tm tm;
  gmtime_r(&now, &tm);
  char buffer[32];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S.000Z", &tm);
  return String(buffer);
}

void publishTelemetry() {
  float bodyRaw = readMax30205RawC();
  float bodyTemp = calibrateC(bodyRaw);
  float ambientTemp = readAmbientTemp();

  float hrSum = 0.0f;
  float spo2Sum = 0.0f;
  int validCount = 0;

  if (maxAvailable) {
    float hr = 0.0f;
    float spo2 = 0.0f;
    if (readMax30102(hr, spo2)) {
      hrSum += hr;
      spo2Sum += spo2;
      validCount++;
    }
  }

  if (validCount > 0) {
    lastHr = hrSum / validCount;
    lastSpo2 = spo2Sum / validCount;
  }

  lastBodyTemp = sanitize(bodyTemp, lastBodyTemp);
  lastAmbientTemp = sanitize(ambientTemp, lastAmbientTemp);

  char payload[256];
  String ts = isoTimestamp();
  snprintf(
    payload,
    sizeof(payload),
    "{\"ts\":\"%s\",\"hr\":%.1f,\"spo2\":%.1f,\"bodyTemp\":%.2f,\"ambientTemp\":%.2f}",
    ts.c_str(),
    sanitize(lastHr, 0.0f),
    sanitize(lastSpo2, 0.0f),
    sanitize(lastBodyTemp, 0.0f),
    sanitize(lastAmbientTemp, 0.0f)
  );

  char topic[128];
  snprintf(topic, sizeof(topic), "health/%s/telemetry", DEVICE_ID);
  mqttClient.publish(topic, payload);
}

void setup() {
  Serial.begin(115200);

  ensureWiFi();
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  Wire.begin(SDA_MAX30205, SCL_MAX30205);
  Wire.setClock(100000);

  Wire1.begin(SDA_MAX30102, SCL_MAX30102);
  Wire1.setClock(400000);

  ds18b20.begin();

  maxAvailable = initMax30102();

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  ensureMQTT();
}

void loop() {
  ensureWiFi();
  ensureMQTT();
  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastPublish >= PUBLISH_INTERVAL_MS) {
    lastPublish = now;
    publishTelemetry();
  }
}
