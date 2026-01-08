import { Router } from 'express';
import { z } from 'zod';
import { login, me, register } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

router.post('/register', validateBody(authSchema), asyncHandler(register));
router.post('/login', validateBody(authSchema), asyncHandler(login));
router.get('/me', authenticate, asyncHandler(me));

export default router;
