import { Measurement } from '../models/Measurement.js';

interface MeasurementPayload {
  deviceId: string;
  ts: Date;
  hr?: number;
  spo2?: number;
  bodyTemp?: number;
  ambientTemp?: number;
  raw?: Record<string, unknown>;
}

export const createMeasurement = async (payload: MeasurementPayload) => {
  return Measurement.create(payload);
};

export const getMeasurements = async (filter: {
  deviceId: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) => {
  const query: Record<string, unknown> = { deviceId: filter.deviceId };
  if (filter.from || filter.to) {
    query.ts = {};
    if (filter.from) {
      (query.ts as Record<string, unknown>).$gte = filter.from;
    }
    if (filter.to) {
      (query.ts as Record<string, unknown>).$lte = filter.to;
    }
  }

  const limit = Math.min(filter.limit ?? 200, 1000);
  return Measurement.find(query).sort({ ts: -1 }).limit(limit).lean();
};

export const getLatestMeasurement = async (deviceId: string) => {
  return Measurement.findOne({ deviceId }).sort({ ts: -1 }).lean();
};
