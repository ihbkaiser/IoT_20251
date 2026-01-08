import { Router } from 'express';
import { z } from 'zod';
import { createDevice, getDevice, listDevices, updateDevice } from '../controllers/deviceController.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const createSchema = z.object({
  deviceId: z.string().min(1),
  name: z.string().min(1),
  ownerUserId: z.string().min(1)
});

const updateSchema = z.object({
  name: z.string().min(1)
});

router.use(authenticate);

router.get('/', asyncHandler(listDevices));
router.post('/', requireAdmin, validateBody(createSchema), asyncHandler(createDevice));
router.get('/:deviceId', asyncHandler(getDevice));
router.patch('/:deviceId', validateBody(updateSchema), asyncHandler(updateDevice));

export default router;
