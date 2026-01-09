import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { IUser } from '../models/User.js';

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = (password: string, passwordHash: string) => {
  return bcrypt.compare(password, passwordHash);
};

export const signToken = (user: IUser) => {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const createResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + env.RESET_TOKEN_TTL_MIN * 60 * 1000);
  return { token, tokenHash, expiresAt };
};

export const hashResetToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
