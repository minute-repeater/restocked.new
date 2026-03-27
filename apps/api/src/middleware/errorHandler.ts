import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createLogger } from '@covet/shared/logger';
import { config } from '../config.js';

const log = createLogger('api:error');

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log all errors
  if (err instanceof AppError && err.statusCode < 500) {
    log.warn({ statusCode: err.statusCode, path: req.path }, err.message);
  } else {
    log.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  }

  // Handle known error types
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Unknown error - don't leak details in production
  res.status(500).json({
    error: config.env === 'production' ? 'Internal server error' : err.message,
  });
}
