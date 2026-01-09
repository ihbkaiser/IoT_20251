import { Router } from 'express';
import { z } from 'zod';
import {
  login,
  me,
  register,
  requestPasswordReset,
  resetPassword
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const resetRequestSchema = z.object({
  email: z.string().email()
});

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6)
});

router.post('/register', validateBody(authSchema), asyncHandler(register));
router.post('/login', validateBody(authSchema), asyncHandler(login));
router.post('/forgot-password', validateBody(resetRequestSchema), asyncHandler(requestPasswordReset));
router.post('/reset-password', validateBody(resetSchema), asyncHandler(resetPassword));
router.get('/me', authenticate, asyncHandler(me));

export default router;
