import mongoose, { Schema, Document } from 'mongoose';

export interface IMeasurement extends Document {
  deviceId: string;
  ts: Date;
  hr?: number;
  spo2?: number;
  bodyTemp?: number;
  ambientTemp?: number;
  contact?: boolean;
  raw?: Record<string, unknown>;
  createdAt: Date;
}

const MeasurementSchema = new Schema<IMeasurement>(
  {
    deviceId: { type: String, required: true, index: true },
    ts: { type: Date, required: true, index: true },
    hr: { type: Number },
    spo2: { type: Number },
    bodyTemp: { type: Number },
    ambientTemp: { type: Number },
    contact: { type: Boolean },
    raw: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Measurement = mongoose.model<IMeasurement>('Measurement', MeasurementSchema);
