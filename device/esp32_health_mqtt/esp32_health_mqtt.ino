/*
 * ESP32-S3 + MAX30102 + 128x32 OLED I2C + Buzzer
 * + MQTT realtime
 * + Session history theo ngón tay (IR threshold)
 *
 * - HR: checkForBeat(IR) (heartRate.h)
 * - SpO2: Maxim algorithm (spo2_algorithm.h) buffer 100 mẫu
 * - I2C: SDA=8, SCL=9
 * - LEDC core 3.x: ledcAttach/ledcWriteTone
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <time.h>
#include <math.h>

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"

// ===================== WiFi + MQTT =====================
const char *WIFI_SSID = "12345678";
const char *WIFI_PASS = "123456788";

const char *MQTT_HOST = "172.20.10.8";
const int   MQTT_PORT = 1883;
const char *DEVICE_ID = "demoDevice01";

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// publish telemetry every 1s (backend downsample handles history)
static const uint32_t MQTT_PUBLISH_INTERVAL_MS = 1000;

// ===================== I2C + OLED =====================
#define I2C_SDA 8
#define I2C_SCL 9
#define SDA_MAX30205 2
#define SCL_MAX30205 1
#define ONE_WIRE_BUS 7

#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 32
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ===================== BUZZER =====================
#define BUZZER_PIN 3

// ===================== MAX30102 =====================
MAX30105 particleSensor;

// ===================== Temperature sensors =====================
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);

// ===== BPM averaging =====
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute = 0;
int beatAvg = 0;

// ===== SpO2 buffers =====
static const int SPO2_BUF_SIZE = 100;  // ~1s nếu sampleRate=100Hz
uint32_t irBuffer[SPO2_BUF_SIZE];
uint32_t redBuffer[SPO2_BUF_SIZE];
int spo2Index = 0;

int32_t spo2 = 0;
int8_t  spo2Valid = 0;
int32_t hrFromAlgo = 0;
int8_t  hrValid = 0;

float lastBodyTemp = 0.0f;
float lastAmbientTemp = 0.0f;
uint32_t lastTempSampleMs = 0;
uint32_t lastTempRequestMs = 0;

static const uint32_t TEMP_SAMPLE_INTERVAL_MS = 1000;
static const uint32_t DS18B20_CONVERSION_MS = 200;

// ====== MAX30205 calibration ======
const float CAL_R1 = -37.5f;
const float CAL_T1 = 28.0f;
const float CAL_R2 = -34.0f;
const float CAL_T2 = 34.0f;

// ===================== Finger detect / Session =====================
static const uint32_t IR_FINGER_THRESHOLD = 7000;

// Debounce để tránh chập chờn
static const uint32_t FINGER_ON_DEBOUNCE_MS  = 250;
static const uint32_t FINGER_OFF_DEBOUNCE_MS = 800;

// Lịch sử theo session
static const uint32_t HISTORY_SAMPLE_INTERVAL_MS = 1000;

// Mỗi point gồm: t(ms), hr, spo2, valid
static const int HISTORY_MAX = 900; // 15 phút @1s. Tăng/giảm tuỳ RAM.

struct HistoryPoint {
  uint32_t t_ms;
  uint16_t hr;
  uint8_t  spo2;
  uint8_t  spo2_ok;
};

struct Session {
  bool active = false;
  String sessionId = "";
  String startTs = "";
  String endTs = "";
  uint32_t startMs = 0;

  int count = 0;
  uint32_t beatsCount = 0;
  int hrMin = 999, hrMax = 0;
  int spo2Min = 999, spo2Max = 0;

  HistoryPoint points[HISTORY_MAX];
};

Session session;

bool fingerPresent = false;
uint32_t fingerStateChangedMs = 0;

uint32_t lastHistorySampleMs = 0;
uint32_t lastMqttPublishMs   = 0;

// ===================== BITMAPS (giữ nguyên) =====================
static const unsigned char PROGMEM logo2_bmp[] =
{ 0x03, 0xC0, 0xF0, 0x06, 0x71, 0x8C, 0x0C, 0x1B, 0x06, 0x18, 0x0E,  0x02, 0x10, 0x0C, 0x03, 0x10,
  0x04, 0x01, 0x10, 0x04, 0x01, 0x10, 0x40,  0x01, 0x10, 0x40, 0x01, 0x10, 0xC0, 0x03, 0x08, 0x88,
  0x02, 0x08, 0xB8, 0x04,  0xFF, 0x37, 0x08, 0x01, 0x30, 0x18, 0x01, 0x90, 0x30, 0x00, 0xC0, 0x60,
  0x00,  0x60, 0xC0, 0x00, 0x31, 0x80, 0x00, 0x1B, 0x00, 0x00, 0x0E, 0x00, 0x00, 0x04, 0x00 };

static const unsigned char PROGMEM logo3_bmp[] =
{ 0x01, 0xF0, 0x0F,  0x80, 0x06, 0x1C, 0x38, 0x60, 0x18, 0x06, 0x60, 0x18, 0x10, 0x01, 0x80, 0x08,
  0x20,  0x01, 0x80, 0x04, 0x40, 0x00, 0x00, 0x02, 0x40, 0x00, 0x00, 0x02, 0xC0, 0x00, 0x08,  0x03,
  0x80, 0x00, 0x08, 0x01, 0x80, 0x00, 0x18, 0x01, 0x80, 0x00, 0x1C, 0x01,  0x80, 0x00, 0x14, 0x00,
  0x80, 0x00, 0x14, 0x00, 0x80, 0x00, 0x14, 0x00, 0x40,  0x10, 0x12, 0x00, 0x40, 0x10, 0x12, 0x00,
  0x7E, 0x1F, 0x23, 0xFE, 0x03, 0x31,  0xA0, 0x04, 0x01, 0xA0, 0xA0, 0x0C, 0x00, 0xA0, 0xA0, 0x08,
  0x00, 0x60, 0xE0,  0x10, 0x00, 0x20, 0x60, 0x20, 0x06, 0x00, 0x40, 0x60, 0x03, 0x00, 0x40, 0xC0,
  0x01,  0x80, 0x01, 0x80, 0x00, 0xC0, 0x03, 0x00, 0x00, 0x60, 0x06, 0x00, 0x00, 0x30, 0x0C,  0x00,
  0x00, 0x08, 0x10, 0x00, 0x00, 0x06, 0x60, 0x00, 0x00, 0x03, 0xC0, 0x00,  0x00, 0x01, 0x80, 0x00  };

// ===================== Helpers =====================
void buzzerInit() {
  ledcAttach(BUZZER_PIN, 2000, 10);
  ledcWriteTone(BUZZER_PIN, 0);
}

void buzzerBeep(int freqHz, int ms) {
  ledcWriteTone(BUZZER_PIN, freqHz);
  delay(ms);
  ledcWriteTone(BUZZER_PIN, 0);
}

void showReadings(bool bigHeart) {
  display.clearDisplay();
  if (bigHeart) display.drawBitmap(0, 0, logo3_bmp, 32, 32, WHITE);
  else         display.drawBitmap(5, 5, logo2_bmp, 24, 21, WHITE);

  display.setTextColor(WHITE);

  // BPM
  display.setTextSize(2);
  display.setCursor(50, 0);
  display.print("BPM");
  display.setCursor(50, 18);
  display.print(beatAvg);

  // SpO2 góc phải
  display.setTextSize(1);
  display.setCursor(98, 0);
  display.print("O2");
  display.setCursor(98, 10);
  if (spo2Valid) {
    display.print((int)spo2);
    display.print("%");
  } else {
    display.print("--");
  }

  display.display();
}

void showNoFinger() {
  // reset hiển thị
  beatAvg = 0;
  spo2Valid = 0;
  spo2Index = 0;
  ledcWriteTone(BUZZER_PIN, 0);

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(25, 8);
  display.println("Please place");
  display.setCursor(25, 18);
  display.println("your finger");
  display.display();
}

float sanitizeFloat(float value, float fallback) {
  if (!isfinite(value) || isnan(value) || value <= -100.0f || value >= 150.0f) {
    return fallback;
  }
  return value;
}

float readMax30205RawC() {
  const uint8_t MAX30205_ADDR = 0x48;
  const uint8_t REG_TEMP = 0x00;

  Wire1.beginTransmission(MAX30205_ADDR);
  Wire1.write(REG_TEMP);
  if (Wire1.endTransmission(false) != 0) return NAN;

  Wire1.requestFrom(MAX30205_ADDR, (uint8_t)2);
  if (Wire1.available() < 2) return NAN;

  uint8_t msb = Wire1.read();
  uint8_t lsb = Wire1.read();
  int16_t raw = (int16_t)((msb << 8) | lsb);
  return raw * 0.00390625f;
}

float calibrateC(float r) {
  float a = (CAL_T2 - CAL_T1) / (CAL_R2 - CAL_R1);
  float b = CAL_T1 - a * CAL_R1;
  return a * r + b;
}

void updateTemperatures() {
  uint32_t now = millis();
  if (lastTempSampleMs != 0 && (now - lastTempSampleMs) < TEMP_SAMPLE_INTERVAL_MS) {
    return;
  }
  lastTempSampleMs = now;

  float bodyTemp = calibrateC(readMax30205RawC());
  lastBodyTemp = sanitizeFloat(bodyTemp, lastBodyTemp);

  if (lastTempRequestMs == 0) {
    ds18b20.requestTemperatures();
    lastTempRequestMs = now;
    return;
  }

  if (now - lastTempRequestMs >= DS18B20_CONVERSION_MS) {
    float ambientTemp = ds18b20.getTempCByIndex(0);
    lastAmbientTemp = sanitizeFloat(ambientTemp, lastAmbientTemp);
    ds18b20.requestTemperatures();
    lastTempRequestMs = now;
  }
}

// --- WiFi/MQTT ---
void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
  }
}

void ensureMQTT() {
  if (mqttClient.connected()) return;

  while (!mqttClient.connected()) {
    mqttClient.connect(DEVICE_ID);
    delay(300);
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

void publishJson(const char *topic, const char *payload) {
  ensureMQTT();
  mqttClient.publish(topic, payload);
}

void topicTelemetry(char *out, size_t n) {
  snprintf(out, n, "health/%s/telemetry", DEVICE_ID);
}
void topicSession(char *out, size_t n) {
  snprintf(out, n, "health/%s/session", DEVICE_ID);
}
void topicSessionHistory(char *out, size_t n) {
  snprintf(out, n, "health/%s/session/history", DEVICE_ID);
}

// --- Session control ---
String makeSessionId() {
  // sessionId: DEVICEID-epoch
  time_t now = time(nullptr);
  char buf[64];
  snprintf(buf, sizeof(buf), "%s-%lu", DEVICE_ID, (unsigned long)now);
  return String(buf);
}

void sessionStart() {
  session.active = true;
  session.sessionId = makeSessionId();
  session.startTs = isoTimestamp();
  session.endTs = "";
  session.startMs = millis();
  session.count = 0;
  session.beatsCount = 0;
  session.hrMin = 999; session.hrMax = 0;
  session.spo2Min = 999; session.spo2Max = 0;

  lastHistorySampleMs = 0;
  lastMqttPublishMs = 0;

  // reset avg buffer
  for (int i = 0; i < RATE_SIZE; i++) rates[i] = 0;
  rateSpot = 0;
  beatAvg = 0;
  lastBeat = millis();

  publishTelemetryRealtime();
  lastMqttPublishMs = millis();

  Serial.print("[SESSION START] ");
  Serial.println(session.sessionId);
}

void sessionStop(const char *reason) {
  if (!session.active) return;

  session.active = false;
  session.endTs = isoTimestamp();

  // publish summary
  char topic[128];
  topicSession(topic, sizeof(topic));

  // avg HR/SpO2 từ history
  float hrSum = 0, spo2Sum = 0;
  int hrCount = 0, spo2Count = 0;
  for (int i = 0; i < session.count; i++) {
    if (session.points[i].hr > 0) { hrSum += session.points[i].hr; hrCount++; }
    if (session.points[i].spo2_ok) { spo2Sum += session.points[i].spo2; spo2Count++; }
  }
  float hrAvg = (hrCount > 0) ? (hrSum / hrCount) : 0;
  float spo2Avg = (spo2Count > 0) ? (spo2Sum / spo2Count) : 0;

  char payload[384];
  snprintf(
    payload, sizeof(payload),
    "{\"sessionId\":\"%s\",\"startTs\":\"%s\",\"endTs\":\"%s\",\"reason\":\"%s\","
    "\"samples\":%d,\"beats\":%lu,"
    "\"hr\":{\"min\":%d,\"max\":%d,\"avg\":%.1f},"
    "\"spo2\":{\"min\":%d,\"max\":%d,\"avg\":%.1f}}",
    session.sessionId.c_str(),
    session.startTs.c_str(),
    session.endTs.c_str(),
    reason,
    session.count,
    (unsigned long)session.beatsCount,
    (session.hrMin == 999 ? 0 : session.hrMin), session.hrMax, hrAvg,
    (session.spo2Min == 999 ? 0 : session.spo2Min), session.spo2Max, spo2Avg
  );
  publishJson(topic, payload);

  // publish history theo chunk (mỗi chunk tối đa ~15 samples cho payload nhỏ)
  // format: {"sessionId":"...","chunk":0,"total":N,"data":[[t,hr,spo2,ok],...]}
  char topicH[128];
  topicSessionHistory(topicH, sizeof(topicH));

  const int CHUNK_SIZE = 15;
  int totalChunks = (session.count + CHUNK_SIZE - 1) / CHUNK_SIZE;

  for (int c = 0; c < totalChunks; c++) {
    int start = c * CHUNK_SIZE;
    int end = start + CHUNK_SIZE;
    if (end > session.count) end = session.count;

    // build json manually
    String s = "{";
    s += "\"sessionId\":\"" + session.sessionId + "\",";
    s += "\"chunk\":" + String(c) + ",";
    s += "\"total\":" + String(totalChunks) + ",";
    s += "\"data\":[";
    for (int i = start; i < end; i++) {
      auto &p = session.points[i];
      s += "[";
      s += String(p.t_ms) + ",";
      s += String(p.hr) + ",";
      s += String(p.spo2) + ",";
      s += String(p.spo2_ok ? 1 : 0);
      s += "]";
      if (i != end - 1) s += ",";
    }
    s += "]}";

    // PubSubClient publish với c_str()
    publishJson(topicH, s.c_str());
    delay(30); // nhẹ để broker đỡ nghẽn
  }

  // emit contact=false once so backend can close the session
  publishTelemetryRealtime();

  Serial.print("[SESSION STOP] ");
  Serial.print(session.sessionId);
  Serial.print(" reason=");
  Serial.print(reason);
  Serial.print(" samples=");
  Serial.println(session.count);
}

void sessionAddSample(uint16_t hr, uint8_t spo2v, uint8_t spo2ok) {
  if (!session.active) return;
  if (session.count >= HISTORY_MAX) return;

  uint32_t t = millis() - session.startMs;
  session.points[session.count++] = { t, hr, spo2v, spo2ok };

  if (hr > 0) {
    if ((int)hr < session.hrMin) session.hrMin = hr;
    if ((int)hr > session.hrMax) session.hrMax = hr;
  }
  if (spo2ok) {
    if ((int)spo2v < session.spo2Min) session.spo2Min = spo2v;
    if ((int)spo2v > session.spo2Max) session.spo2Max = spo2v;
  }
}

// telemetry payload
void publishTelemetryRealtime() {
  char topic[128];
  topicTelemetry(topic, sizeof(topic));

  String ts = isoTimestamp();
  updateTemperatures();

  // hr dùng beatAvg, spo2 dùng spo2 nếu valid
  float hrOut = (beatAvg > 0 ? (float)beatAvg : 0.0f);
  float spo2Out = (spo2Valid ? (float)spo2 : 0.0f);

  char payload[256];
  snprintf(
    payload, sizeof(payload),
    "{\"ts\":\"%s\",\"hr\":%.1f,\"spo2\":%.1f,\"bodyTemp\":%.2f,\"ambientTemp\":%.2f}",
    ts.c_str(),
    hrOut,
    spo2Out,
    sanitizeFloat(lastBodyTemp, 0.0f),
    sanitizeFloat(lastAmbientTemp, 0.0f)
  );

  publishJson(topic, payload);
}

// ===================== setup/loop =====================
void setup() {
  Serial.begin(115200);

  // I2C
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000);
  Wire1.begin(SDA_MAX30205, SCL_MAX30205);
  Wire1.setClock(100000);

  // OLED
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.display();
  delay(800);

  // Buzzer
  buzzerInit();

  // Temperature sensors
  ds18b20.begin();
  ds18b20.setResolution(10);
  ds18b20.setWaitForConversion(false);
  ds18b20.requestTemperatures();
  lastTempRequestMs = millis();

  // WiFi + NTP
  ensureWiFi();
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  // MQTT
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  ensureMQTT();

  // MAX30102
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.setCursor(0, 0);
    display.println("MAX30102 not found!");
    display.display();
    while (1) delay(10);
  }

  // setup sensor
  particleSensor.setup(60, 4, 2, 100, 411, 4096);
  particleSensor.setPulseAmplitudeRed(0x1F);
  particleSensor.setPulseAmplitudeIR(0x1F);

  spo2Index = 0;
  fingerPresent = false;
  fingerStateChangedMs = millis();

  showNoFinger();
}

void loop() {
  ensureWiFi();
  ensureMQTT();
  mqttClient.loop();

  // đọc FIFO
  particleSensor.check();

  while (particleSensor.available()) {
    uint32_t irValue  = particleSensor.getFIFOIR();
    uint32_t redValue = particleSensor.getFIFORed();
    uint32_t nowMs = millis();

    bool contact = (irValue >= IR_FINGER_THRESHOLD);
    if (!contact) {
      showNoFinger();
    } else {
      showReadings(false);
    }

    // ===== HR giữ nguyên logic gốc =====
    if (contact && checkForBeat((long)irValue)) {
      long delta = nowMs - lastBeat;
      lastBeat = nowMs;

      if (delta > 0) {
        beatsPerMinute = 60.0 / (delta / 1000.0);
        if (beatsPerMinute < 255 && beatsPerMinute > 20) {
          rates[rateSpot++] = (byte)beatsPerMinute;
          rateSpot %= RATE_SIZE;

          int sum = 0;
          for (byte i = 0; i < RATE_SIZE; i++) sum += rates[i];
          beatAvg = sum / RATE_SIZE;
        }
      }

      showReadings(true);
      buzzerBeep(1000, 80);
    }

    // ===== SpO2: buffer 100 mẫu rồi chạy thuật toán =====
    if (contact) {
      irBuffer[spo2Index]  = irValue;
      redBuffer[spo2Index] = redValue;
      spo2Index++;

      if (spo2Index >= SPO2_BUF_SIZE) {
        maxim_heart_rate_and_oxygen_saturation(
          irBuffer, SPO2_BUF_SIZE,
          redBuffer,
          &spo2, &spo2Valid,
          &hrFromAlgo, &hrValid
        );
        spo2Index = 0;

        Serial.print("SpO2=");
        Serial.print(spo2);
        Serial.print(" valid=");
        Serial.print(spo2Valid);
        Serial.print(" HRalgo=");
        Serial.print(hrFromAlgo);
        Serial.print(" valid=");
        Serial.println(hrValid);
      }
    } else {
      spo2Index = 0;
      spo2Valid = 0;
    }

    // ===== Publish MQTT telemetry mỗi 30s =====
    if (lastMqttPublishMs == 0 || (nowMs - lastMqttPublishMs >= MQTT_PUBLISH_INTERVAL_MS)) {
      lastMqttPublishMs = nowMs;
      publishTelemetryRealtime();
    }

    particleSensor.nextSample();
  }
}
