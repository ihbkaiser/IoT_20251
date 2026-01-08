import { Request, Response } from 'express';
import { Device } from '../models/Device.js';

const canAccess = (req: Request, deviceOwnerId?: string | null) => {
  if (req.user?.role === 'admin') return true;
  if (!deviceOwnerId || !req.user) return false;
  return deviceOwnerId.toString() === req.user.id;
};

export const listDevices = async (req: Request, res: Response) => {
  const query = req.user?.role === 'admin' ? {} : { ownerUserId: req.user?.id };
  const devices = await Device.find(query).lean();
  return res.json(devices);
};

export const createDevice = async (req: Request, res: Response) => {
  const { deviceId, name, ownerUserId } = req.body as {
    deviceId: string;
    name: string;
    ownerUserId: string;
  };

  const existing = await Device.findOne({ deviceId });
  if (existing) {
    return res.status(409).json({ message: 'Device already exists' });
  }

  const device = await Device.create({ deviceId, name, ownerUserId, isOnline: false });
  return res.status(201).json(device);
};

export const getDevice = async (req: Request, res: Response) => {
  const device = await Device.findOne({ deviceId: req.params.deviceId }).lean();
  if (!device) {
    return res.status(404).json({ message: 'Device not found' });
  }

  if (!canAccess(req, device.ownerUserId?.toString())) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  return res.json(device);
};

export const updateDevice = async (req: Request, res: Response) => {
  const device = await Device.findOne({ deviceId: req.params.deviceId });
  if (!device) {
    return res.status(404).json({ message: 'Device not found' });
  }

  if (!canAccess(req, device.ownerUserId?.toString())) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  device.name = (req.body as { name: string }).name;
  await device.save();
  return res.json(device);
};
