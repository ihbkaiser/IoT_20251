import { Request, Response } from 'express';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import {
  createResetToken,
  hashPassword,
  hashResetToken,
  signToken,
  verifyPassword
} from '../services/authService.js';

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash, role: 'user' });

  return res.status(201).json({ id: user._id, email: user.email, role: user.role });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user);
  return res.json({ token });
};

export const me = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  return res.json({ id: req.user.id, email: req.user.email, role: req.user.role });
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  const user = await User.findOne({ email });

  if (!user) {
    return res.json({ message: 'If the email exists, a reset link has been sent.' });
  }

  const { token, tokenHash, expiresAt } = createResetToken();
  user.resetTokenHash = tokenHash;
  user.resetTokenExpiresAt = expiresAt;
  await user.save();

  const response: { message: string; resetToken?: string; expiresAt?: Date } = {
    message: 'If the email exists, a reset link has been sent.'
  };

  if (env.NODE_ENV !== 'production') {
    response.resetToken = token;
    response.expiresAt = expiresAt;
  }

  return res.json(response);
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body as { token: string; password: string };
  const tokenHash = hashResetToken(token);

  const user = await User.findOne({
    resetTokenHash: tokenHash,
    resetTokenExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    return res.status(400).json({ message: 'Reset token is invalid or expired' });
  }

  user.passwordHash = await hashPassword(password);
  user.resetTokenHash = undefined;
  user.resetTokenExpiresAt = undefined;
  await user.save();

  return res.json({ message: 'Password reset successful' });
};
