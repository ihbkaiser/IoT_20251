import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { log } from '../utils/logger.js';

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Validation error', issues: err.issues });
  }

  if (err instanceof Error) {
    log.error(err.message, err);
    return res.status(500).json({ message: err.message });
  }

  log.error('Unknown error', err);
  return res.status(500).json({ message: 'Internal server error' });
};
