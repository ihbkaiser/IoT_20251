import mongoose, { Schema, Document, Types } from 'mongoose';
import type { MetricKey } from './AlertRule.js';

export interface IAlertEvent extends Document {
  userId: Types.ObjectId;
  deviceId: string;
  ruleId: Types.ObjectId;
  ts: Date;
  metric: MetricKey;
  value: number;
  threshold: number;
  message: string;
  acknowledged: boolean;
  createdAt: Date;
}

const AlertEventSchema = new Schema<IAlertEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceId: { type: String, required: true, index: true },
    ruleId: { type: Schema.Types.ObjectId, ref: 'AlertRule', required: true },
    ts: { type: Date, required: true },
    metric: { type: String, enum: ['hr', 'spo2', 'bodyTemp', 'ambientTemp'], required: true },
    value: { type: Number, required: true },
    threshold: { type: Number, required: true },
    message: { type: String, required: true },
    acknowledged: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AlertEvent = mongoose.model<IAlertEvent>('AlertEvent', AlertEventSchema);
