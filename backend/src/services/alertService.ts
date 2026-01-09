import { AlertEvent, IAlertEvent } from '../models/AlertEvent.js';
import { AlertRule, IAlertRule, MetricKey } from '../models/AlertRule.js';
import type { IDevice } from '../models/Device.js';
import { isThresholdBreached } from './alertEvaluator.js';
import type { HydratedDocument } from 'mongoose';

interface RuleState {
  breachStart?: number;
  lastTriggered?: number;
}

interface MeasurementLike {
  deviceId: string;
  ts: Date;
  hr?: number;
  spo2?: number;
  bodyTemp?: number;
  ambientTemp?: number;
}

const ruleState = new Map<string, RuleState>();

const getMetricValue = (measurement: MeasurementLike, metric: MetricKey) => {
  return measurement[metric];
};

const makeStateKey = (ruleId: string, deviceId: string) => `${ruleId}:${deviceId}`;

export const findRulesForDevice = async (device: IDevice) => {
  if (!device.ownerUserId) {
    return [] as IAlertRule[];
  }

  return AlertRule.find({
    userId: device.ownerUserId,
    enabled: true,
    $or: [{ deviceId: null }, { deviceId: device.deviceId }]
  });
};

export const evaluateRules = async (device: IDevice, measurement: MeasurementLike) => {
  const rules = await findRulesForDevice(device);
  const events: HydratedDocument<IAlertEvent>[] = [];
  const now = new Date(measurement.ts).getTime();

  for (const rule of rules) {
    const value = getMetricValue(measurement, rule.metric);
    if (typeof value !== 'number') {
      continue;
    }

    const key = makeStateKey(rule._id.toString(), device.deviceId);
    const state = ruleState.get(key) || {};
    const breached = isThresholdBreached(value, rule.operator, rule.threshold);

    if (!breached) {
      state.breachStart = undefined;
      ruleState.set(key, state);
      continue;
    }

    if (!state.breachStart) {
      state.breachStart = now;
    }

    const durationMs = Math.max(rule.durationSec, 0) * 1000;
    const cooldownMs = Math.max(rule.cooldownSec, 0) * 1000;

    if (now - (state.breachStart ?? now) >= durationMs) {
      if (!state.lastTriggered || now - state.lastTriggered >= cooldownMs) {
        const message = `Rule triggered: ${rule.metric} ${rule.operator} ${rule.threshold}`;
        const event = await AlertEvent.create({
          userId: rule.userId,
          deviceId: device.deviceId,
          ruleId: rule._id,
          ts: measurement.ts,
          metric: rule.metric,
          value,
          threshold: rule.threshold,
          message,
          acknowledged: false
        });
        events.push(event);
        state.lastTriggered = now;
      }
    }

    ruleState.set(key, state);
  }

  return events;
};
