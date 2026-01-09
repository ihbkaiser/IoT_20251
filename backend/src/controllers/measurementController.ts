import { Request, Response } from 'express';
import { Device } from '../models/Device.js';
import { getLatestMeasurement, getMeasurements } from '../services/measurementService.js';
import { getMeasurementSessions } from '../services/measurementSessionService.js';

const assertDeviceAccess = async (req: Request, deviceId: string) => {
  const device = await Device.findOne({ deviceId }).lean();
  if (!device) {
    return { allowed: false, status: 404, message: 'Device not found' } as const;
  }

  if (req.user?.role !== 'admin' && device.ownerUserId?.toString() !== req.user?.id) {
    return { allowed: false, status: 403, message: 'Forbidden' } as const;
  }

  return { allowed: true } as const;
};

export const listMeasurements = async (req: Request, res: Response) => {
  const { deviceId, from, to, limit } = req.query as {
    deviceId: string;
    from?: string;
    to?: string;
    limit?: string;
  };

  const access = await assertDeviceAccess(req, deviceId);
  if (!access.allowed) {
    return res.status(access.status).json({ message: access.message });
  }

  const results = await getMeasurements({
    deviceId,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    limit: limit ? Number(limit) : undefined
  });

  return res.json(results);
};

export const latestMeasurement = async (req: Request, res: Response) => {
  const { deviceId } = req.query as { deviceId: string };

  const access = await assertDeviceAccess(req, deviceId);
  if (!access.allowed) {
    return res.status(access.status).json({ message: access.message });
  }

  const measurement = await getLatestMeasurement(deviceId);
  return res.json(measurement);
};

export const listMeasurementSessions = async (req: Request, res: Response) => {
  const { deviceId, from, to, limit } = req.query as {
    deviceId: string;
    from?: string;
    to?: string;
    limit?: string;
  };

  const access = await assertDeviceAccess(req, deviceId);
  if (!access.allowed) {
    return res.status(access.status).json({ message: access.message });
  }

  const sessions = await getMeasurementSessions({
    deviceId,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    limit: limit ? Number(limit) : undefined
  });

  return res.json(sessions);
};
