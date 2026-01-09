import mongoose, { Schema, Document } from 'mongoose';

export interface IMeasurementSession extends Document {
  deviceId: string;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
  avgHr?: number;
  avgSpo2?: number;
  avgBodyTemp?: number;
  avgAmbientTemp?: number;
  sampleCount: number;
  createdAt: Date;
}

const MeasurementSessionSchema = new Schema<IMeasurementSession>(
  {
    deviceId: { type: String, required: true, index: true },
    startedAt: { type: Date, required: true, index: true },
    endedAt: { type: Date, required: true },
    durationSec: { type: Number, required: true },
    avgHr: { type: Number },
    avgSpo2: { type: Number },
    avgBodyTemp: { type: Number },
    avgAmbientTemp: { type: Number },
    sampleCount: { type: Number, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const MeasurementSession = mongoose.model<IMeasurementSession>(
  'MeasurementSession',
  MeasurementSessionSchema
);
