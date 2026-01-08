import mongoose, { Schema, Document, Types } from 'mongoose';

export type MetricKey = 'hr' | 'spo2' | 'bodyTemp' | 'ambientTemp';
export type Operator = '<' | '>' | '<=' | '>=';

export interface IAlertRule extends Document {
  userId: Types.ObjectId;
  deviceId?: string | null;
  enabled: boolean;
  metric: MetricKey;
  operator: Operator;
  threshold: number;
  durationSec: number;
  cooldownSec: number;
  createdAt: Date;
}

const AlertRuleSchema = new Schema<IAlertRule>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceId: { type: String, default: null, index: true },
    enabled: { type: Boolean, default: true },
    metric: { type: String, enum: ['hr', 'spo2', 'bodyTemp', 'ambientTemp'], required: true },
    operator: { type: String, enum: ['<', '>', '<=', '>='], required: true },
    threshold: { type: Number, required: true },
    durationSec: { type: Number, default: 0 },
    cooldownSec: { type: Number, default: 0 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AlertRule = mongoose.model<IAlertRule>('AlertRule', AlertRuleSchema);
