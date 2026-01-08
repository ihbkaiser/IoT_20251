import { Device } from '../models/Device.js';
import { env } from '../config/env.js';

export const markOfflineDevices = async () => {
  const cutoff = new Date(Date.now() - env.OFFLINE_TIMEOUT_SEC * 1000);
  await Device.updateMany(
    { lastSeenAt: { $lt: cutoff }, isOnline: true },
    { $set: { isOnline: false } }
  );
};
