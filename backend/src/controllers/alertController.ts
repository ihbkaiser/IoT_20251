import { Request, Response } from 'express';
import { AlertRule } from '../models/AlertRule.js';
import { AlertEvent } from '../models/AlertEvent.js';

const canAccessRule = (req: Request, userId: string) => {
  if (req.user?.role === 'admin') return true;
  return req.user?.id === userId;
};

export const listRules = async (req: Request, res: Response) => {
  const query = req.user?.role === 'admin' ? {} : { userId: req.user?.id };
  const rules = await AlertRule.find(query).lean();
  return res.json(rules);
};

export const createRule = async (req: Request, res: Response) => {
  const body = req.body as {
    deviceId?: string | null;
    enabled?: boolean;
    metric: 'hr' | 'spo2' | 'bodyTemp' | 'ambientTemp';
    operator: '<' | '>' | '<=' | '>=';
    threshold: number;
    durationSec?: number;
    cooldownSec?: number;
  };

  const rule = await AlertRule.create({
    userId: req.user?.id,
    deviceId: body.deviceId ?? null,
    enabled: body.enabled ?? true,
    metric: body.metric,
    operator: body.operator,
    threshold: body.threshold,
    durationSec: body.durationSec ?? 0,
    cooldownSec: body.cooldownSec ?? 0
  });

  return res.status(201).json(rule);
};

export const updateRule = async (req: Request, res: Response) => {
  const rule = await AlertRule.findById(req.params.id);
  if (!rule) {
    return res.status(404).json({ message: 'Rule not found' });
  }

  if (!canAccessRule(req, rule.userId.toString())) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  Object.assign(rule, req.body);
  await rule.save();
  return res.json(rule);
};

export const deleteRule = async (req: Request, res: Response) => {
  const rule = await AlertRule.findById(req.params.id);
  if (!rule) {
    return res.status(404).json({ message: 'Rule not found' });
  }

  if (!canAccessRule(req, rule.userId.toString())) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await rule.deleteOne();
  return res.status(204).send();
};

export const listEvents = async (req: Request, res: Response) => {
  const { deviceId, from, to } = req.query as {
    deviceId?: string;
    from?: string;
    to?: string;
  };

  const query: Record<string, unknown> = {};
  if (deviceId) {
    query.deviceId = deviceId;
  }

  if (from || to) {
    query.ts = {};
    if (from) {
      (query.ts as Record<string, unknown>).$gte = new Date(from);
    }
    if (to) {
      (query.ts as Record<string, unknown>).$lte = new Date(to);
    }
  }

  if (req.user?.role !== 'admin') {
    query.userId = req.user?.id;
  }

  const events = await AlertEvent.find(query).sort({ ts: -1 }).limit(200).lean();
  return res.json(events);
};

export const acknowledgeEvent = async (req: Request, res: Response) => {
  const event = await AlertEvent.findById(req.params.id);
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  if (req.user?.role !== 'admin' && event.userId.toString() !== req.user?.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  event.acknowledged = true;
  await event.save();
  return res.json(event);
};
