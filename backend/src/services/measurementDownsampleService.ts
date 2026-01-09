import type { MeasurementPayload } from './measurementService.js';

type MetricKey = 'hr' | 'spo2' | 'bodyTemp' | 'ambientTemp';

const METRICS: MetricKey[] = ['hr', 'spo2', 'bodyTemp', 'ambientTemp'];

interface Bucket {
  startTs: Date;
  lastTs: Date;
  sums: Record<MetricKey, number>;
  counts: Record<MetricKey, number>;
  totalSamples: number;
}

const buckets = new Map<string, Bucket>();

const initBucket = (measurement: MeasurementPayload): Bucket => ({
  startTs: measurement.ts,
  lastTs: measurement.ts,
  sums: { hr: 0, spo2: 0, bodyTemp: 0, ambientTemp: 0 },
  counts: { hr: 0, spo2: 0, bodyTemp: 0, ambientTemp: 0 },
  totalSamples: 0
});

const addMetric = (bucket: Bucket, key: MetricKey, value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  bucket.sums[key] += value;
  bucket.counts[key] += 1;
};

const addSample = (bucket: Bucket, measurement: MeasurementPayload) => {
  bucket.lastTs = measurement.ts;
  bucket.totalSamples += 1;
  addMetric(bucket, 'hr', measurement.hr);
  addMetric(bucket, 'spo2', measurement.spo2);
  addMetric(bucket, 'bodyTemp', measurement.bodyTemp);
  addMetric(bucket, 'ambientTemp', measurement.ambientTemp);
};

const buildAggregatedMeasurement = (deviceId: string, bucket: Bucket): MeasurementPayload => {
  const averages: Partial<Record<MetricKey, number>> = {};
  for (const key of METRICS) {
    if (bucket.counts[key] > 0) {
      averages[key] = bucket.sums[key] / bucket.counts[key];
    }
  }

  return {
    deviceId,
    ts: bucket.lastTs,
    hr: averages.hr,
    spo2: averages.spo2,
    bodyTemp: averages.bodyTemp,
    ambientTemp: averages.ambientTemp,
    raw: {
      aggregated: true,
      sampleCount: bucket.totalSamples,
      windowStart: bucket.startTs,
      windowEnd: bucket.lastTs
    }
  };
};

export const bufferMeasurement = (
  measurement: MeasurementPayload,
  intervalMs: number
): MeasurementPayload | null => {
  if (intervalMs <= 0) {
    return measurement;
  }

  const key = measurement.deviceId;
  const bucket = buckets.get(key);

  if (!bucket) {
    const nextBucket = initBucket(measurement);
    addSample(nextBucket, measurement);
    buckets.set(key, nextBucket);
    return null;
  }

  const elapsed = measurement.ts.getTime() - bucket.startTs.getTime();
  if (elapsed >= intervalMs) {
    const aggregated = buildAggregatedMeasurement(key, bucket);
    const nextBucket = initBucket(measurement);
    addSample(nextBucket, measurement);
    buckets.set(key, nextBucket);
    return aggregated;
  }

  addSample(bucket, measurement);
  return null;
};
