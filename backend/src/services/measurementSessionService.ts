import { MeasurementSession } from '../models/MeasurementSession.js';
import type { IMeasurement } from '../models/Measurement.js';

type MetricKey = 'hr' | 'spo2' | 'bodyTemp' | 'ambientTemp';

interface MetricStats {
  sum: number;
  count: number;
}

interface ActiveSession {
  deviceId: string;
  startedAt: Date;
  lastTs: Date;
  metrics: Record<MetricKey, MetricStats>;
  sampleCount: number;
}

const activeSessions = new Map<string, ActiveSession>();

const initMetrics = () => ({
  hr: { sum: 0, count: 0 },
  spo2: { sum: 0, count: 0 },
  bodyTemp: { sum: 0, count: 0 },
  ambientTemp: { sum: 0, count: 0 }
});

const addMetric = (session: ActiveSession, key: MetricKey, value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return;
  }
  session.metrics[key].sum += value;
  session.metrics[key].count += 1;
};

const computeAverage = (stats: MetricStats) => {
  if (stats.count === 0) return undefined;
  return Number((stats.sum / stats.count).toFixed(2));
};

export const trackMeasurementSession = async (measurement: IMeasurement) => {
  const contact = measurement.contact === true;
  const key = measurement.deviceId;
  const active = activeSessions.get(key);

  if (contact) {
    const session = active ?? {
      deviceId: key,
      startedAt: measurement.ts,
      lastTs: measurement.ts,
      metrics: initMetrics(),
      sampleCount: 0
    };

    session.lastTs = measurement.ts;
    addMetric(session, 'hr', measurement.hr);
    addMetric(session, 'spo2', measurement.spo2);
    addMetric(session, 'bodyTemp', measurement.bodyTemp);
    addMetric(session, 'ambientTemp', measurement.ambientTemp);
    session.sampleCount += 1;

    activeSessions.set(key, session);
    return null;
  }

  if (!contact && active) {
    activeSessions.delete(key);
    if (active.sampleCount === 0) {
      return null;
    }

    const endedAt = measurement.ts;
    const durationSec = Math.max(
      1,
      Math.round((endedAt.getTime() - active.startedAt.getTime()) / 1000)
    );

    const created = await MeasurementSession.create({
      deviceId: active.deviceId,
      startedAt: active.startedAt,
      endedAt,
      durationSec,
      avgHr: computeAverage(active.metrics.hr),
      avgSpo2: computeAverage(active.metrics.spo2),
      avgBodyTemp: computeAverage(active.metrics.bodyTemp),
      avgAmbientTemp: computeAverage(active.metrics.ambientTemp),
      sampleCount: active.sampleCount
    });

    return created;
  }

  return null;
};

export const getMeasurementSessions = async (filter: {
  deviceId: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) => {
  const query: Record<string, unknown> = { deviceId: filter.deviceId };
  const rangeFilters: Record<string, unknown>[] = [];
  if (filter.from) {
    rangeFilters.push({ endedAt: { $gte: filter.from } });
  }
  if (filter.to) {
    rangeFilters.push({ startedAt: { $lte: filter.to } });
  }
  if (rangeFilters.length > 0) {
    query.$and = rangeFilters;
  }

  const limit = Math.min(filter.limit ?? 200, 1000);
  return MeasurementSession.find(query).sort({ startedAt: -1 }).limit(limit).lean();
};

export const createMeasurementSession = async (payload: {
  deviceId: string;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
  avgHr?: number;
  avgSpo2?: number;
  avgBodyTemp?: number;
  avgAmbientTemp?: number;
  sampleCount: number;
}) => {
  return MeasurementSession.create(payload);
};
