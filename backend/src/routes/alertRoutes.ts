import { Router } from 'express';
import { z } from 'zod';
import {
  acknowledgeEvent,
  createRule,
  deleteRule,
  listEvents,
  listRules,
  updateRule
} from '../controllers/alertController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const ruleSchema = z.object({
  deviceId: z.string().optional().nullable(),
  enabled: z.boolean().optional(),
  metric: z.enum(['hr', 'spo2', 'bodyTemp', 'ambientTemp']),
  operator: z.enum(['<', '>', '<=', '>=']),
  threshold: z.number(),
  durationSec: z.number().optional(),
  cooldownSec: z.number().optional()
});

const updateSchema = ruleSchema.partial();

router.use(authenticate);

router.get('/rules', asyncHandler(listRules));
router.post('/rules', validateBody(ruleSchema), asyncHandler(createRule));
router.patch('/rules/:id', validateBody(updateSchema), asyncHandler(updateRule));
router.delete('/rules/:id', asyncHandler(deleteRule));

router.get('/events', asyncHandler(listEvents));
router.patch('/events/:id/ack', asyncHandler(acknowledgeEvent));

export default router;
