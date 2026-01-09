import dotenv from 'dotenv';

dotenv.config();

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: toNumber(process.env.PORT, 4000),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://mongo:27017/health_iot',
  MQTT_URL: process.env.MQTT_URL || 'mqtt://mosquitto:1883',
  JWT_SECRET: process.env.JWT_SECRET || 'change_me',
  OFFLINE_TIMEOUT_SEC: toNumber(process.env.OFFLINE_TIMEOUT_SEC, 60),
  ALERT_CHECK_INTERVAL_MS: toNumber(process.env.ALERT_CHECK_INTERVAL_MS, 5000),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  RESET_TOKEN_TTL_MIN: toNumber(process.env.RESET_TOKEN_TTL_MIN, 30),
  MEASUREMENT_DOWNSAMPLE_SEC: toNumber(process.env.MEASUREMENT_DOWNSAMPLE_SEC, 30)
};
