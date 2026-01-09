import { Request, Response } from 'express';
import { Device } from '../models/Device.js';
import { getLatestMeasurement, getMeasurements } from '../services/measurementService.js';
import {
  createMeasurementSession,
  getMeasurementSessions
} from '../services/measurementSessionService.js';

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

export const createMeasurementSessionRecord = async (req: Request, res: Response) => {
  const body = req.body as {
    deviceId: string;
    startedAt: string;
    endedAt: string;
    avgHr?: number;
    avgSpo2?: number;
    avgBodyTemp?: number;
    avgAmbientTemp?: number;
    sampleCount: number;
  };

  const access = await assertDeviceAccess(req, body.deviceId);
  if (!access.allowed) {
    return res.status(access.status).json({ message: access.message });
  }

  const startedAt = new Date(body.startedAt);
  const endedAt = new Date(body.endedAt);
  const durationSec = Math.max(
    1,
    Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
  );

  const created = await createMeasurementSession({
    deviceId: body.deviceId,
    startedAt,
    endedAt,
    durationSec,
    avgHr: body.avgHr,
    avgSpo2: body.avgSpo2,
    avgBodyTemp: body.avgBodyTemp,
    avgAmbientTemp: body.avgAmbientTemp,
    sampleCount: body.sampleCount
  });

  return res.status(201).json(created);
};
