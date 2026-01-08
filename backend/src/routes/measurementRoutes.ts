import { Router } from 'express';
import { z } from 'zod';
import { latestMeasurement, listMeasurements } from '../controllers/measurementController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateQuery } from '../middlewares/validate.js';
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

router.use(authenticate);

router.get('/', validateQuery(listSchema), asyncHandler(listMeasurements));
router.get('/latest', validateQuery(latestSchema), asyncHandler(latestMeasurement));

export default router;
