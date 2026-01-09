export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export interface Device {
  deviceId: string;
  name: string;
  isOnline: boolean;
  lastSeenAt?: string;
  ownerUserId?: string | null;
}

export interface Measurement {
  _id?: string;
  deviceId: string;
  ts: string;
  hr?: number;
  spo2?: number;
  bodyTemp?: number;
  ambientTemp?: number;
  contact?: boolean;
}

export interface MeasurementSession {
  _id?: string;
  deviceId: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  avgHr?: number;
  avgSpo2?: number;
  avgBodyTemp?: number;
  avgAmbientTemp?: number;
  sampleCount: number;
}

export interface AlertRule {
  _id?: string;
  deviceId?: string | null;
  enabled: boolean;
  metric: 'hr' | 'spo2' | 'bodyTemp' | 'ambientTemp';
  operator: '<' | '>' | '<=' | '>=';
  threshold: number;
  durationSec: number;
  cooldownSec: number;
}

export interface AlertEvent {
  _id?: string;
  deviceId: string;
  ruleId: string;
  ts: string;
  metric: AlertRule['metric'];
  value: number;
  threshold: number;
  message: string;
  acknowledged: boolean;
}
