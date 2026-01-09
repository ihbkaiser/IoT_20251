import mqtt from 'mqtt';
import { z } from 'zod';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { Device } from '../models/Device.js';
import { createMeasurement } from './measurementService.js';
import { bufferMeasurement } from './measurementDownsampleService.js';
import { evaluateRules } from './alertService.js';
import { log } from '../utils/logger.js';

const telemetrySchema = z.object({
  ts: z.string().datetime(),
  hr: z.number(),
  spo2: z.number(),
  bodyTemp: z.number(),
  ambientTemp: z.number(),
  contact: z.boolean().optional()
});

const parseTopic = (topic: string) => {
  const match = topic.match(/^health\/([^/]+)\/telemetry$/);
  return match?.[1];
};

export const startMqttIngest = (io: Server) => {
  const client = mqtt.connect(env.MQTT_URL);

  client.on('connect', () => {
    log.info(`MQTT connected ${env.MQTT_URL}`);
    client.subscribe('health/+/telemetry');
  });

  client.on('message', async (topic, payload) => {
    const deviceId = parseTopic(topic);
    if (!deviceId) {
      return;
    }

    let parsed: z.infer<typeof telemetrySchema>;
    try {
      parsed = telemetrySchema.parse(JSON.parse(payload.toString()));
    } catch (error) {
      log.error('Invalid telemetry payload', { topic, error });
      return;
    }

    const ts = new Date(parsed.ts);
    const measurement = {
      deviceId,
      ts,
      hr: parsed.hr,
      spo2: parsed.spo2,
      bodyTemp: parsed.bodyTemp,
      ambientTemp: parsed.ambientTemp,
      contact: parsed.contact,
      raw: parsed
    };

    try {
      const device = await Device.findOneAndUpdate(
        { deviceId },
        {
          $set: { lastSeenAt: ts, isOnline: true },
          $setOnInsert: { name: `Device ${deviceId}`, ownerUserId: null }
        },
        { new: true, upsert: true }
      );

      const rooms: string[] = ['admins'];
      if (device?.ownerUserId) {
        rooms.push(`user:${device.ownerUserId.toString()}`);
      }
      rooms.forEach((room) => io.to(room).emit('telemetry', { deviceId, measurement }));

      if (device) {
        const events = await evaluateRules(device, measurement);
        for (const event of events) {
          rooms.forEach((room) => io.to(room).emit('alert', { deviceId, event }));
        }
      }

      const intervalMs = Math.max(env.MEASUREMENT_DOWNSAMPLE_SEC, 0) * 1000;
      const toStore = bufferMeasurement(measurement, intervalMs);
      if (toStore) {
        await createMeasurement(toStore);
      }
    } catch (error) {
      log.error('Failed to process telemetry', error);
    }
  });

  client.on('error', (error) => {
    log.error('MQTT error', error);
  });

  return client;
};
