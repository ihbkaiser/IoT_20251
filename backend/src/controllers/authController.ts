import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { hashPassword, signToken, verifyPassword } from '../services/authService.js';

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
