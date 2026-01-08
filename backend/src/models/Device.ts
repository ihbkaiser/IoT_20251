import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDevice extends Document {
  deviceId: string;
  name: string;
  ownerUserId?: Types.ObjectId | null;
  lastSeenAt?: Date | null;
  isOnline: boolean;
}

const DeviceSchema = new Schema<IDevice>(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    lastSeenAt: { type: Date, default: null },
    isOnline: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Device = mongoose.model<IDevice>('Device', DeviceSchema);
