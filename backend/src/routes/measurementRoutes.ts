import { Router } from 'express';
import { z } from 'zod';
import {
  createMeasurementSessionRecord,
  latestMeasurement,
  listMeasurements,
  listMeasurementSessions
} from '../controllers/measurementController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const listSchema = z.object({
  deviceId: z.string().min(1),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.string().optional()
});

const latestSchema = z.object({
  deviceId: z.string().min(1)
});

const sessionQuerySchema = z.object({
  deviceId: z.string().min(1),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.string().optional()
});

const sessionCreateSchema = z.object({
  deviceId: z.string().min(1),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  avgHr: z.number().optional(),
  avgSpo2: z.number().optional(),
  avgBodyTemp: z.number().optional(),
  avgAmbientTemp: z.number().optional(),
  sampleCount: z.number().int().min(1)
});

router.use(authenticate);

router.get('/', validateQuery(listSchema), asyncHandler(listMeasurements));
router.get('/sessions', validateQuery(sessionQuerySchema), asyncHandler(listMeasurementSessions));
router.post(
  '/sessions',
  validateBody(sessionCreateSchema),
  asyncHandler(createMeasurementSessionRecord)
);
router.get('/latest', validateQuery(latestSchema), asyncHandler(latestMeasurement));

export default router;
