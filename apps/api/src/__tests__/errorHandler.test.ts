import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

// Mock config
vi.mock('../config.js', () => ({
  config: {
    env: 'test',
    port: 3000,
    databaseUrl: 'postgres://test',
    jwtSecret: 'test-secret-that-is-at-least-32-characters-long',
    frontendUrl: 'http://localhost:5173',
  },
}));

// Mock logger
vi.mock('@restocked/shared/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { errorHandler, AppError } from '../middleware/errorHandler.js';

describe('errorHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it('handles AppError with correct status code', () => {
    const error = new AppError(403, 'Forbidden');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Forbidden' });
  });

  it('handles AppError 404', () => {
    const error = new AppError(404, 'Not found');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not found' });
  });

  it('handles ZodError with 400 and validation details', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });

    let zodError: ZodError;
    try {
      schema.parse({ email: 'invalid', password: 'short' });
    } catch (e) {
      zodError = e as ZodError;
    }

    errorHandler(zodError!, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    const jsonCall = (mockRes.json as any).mock.calls[0][0];
    expect(jsonCall.error).toBe('Validation error');
    expect(jsonCall.details).toBeInstanceOf(Array);
    expect(jsonCall.details.length).toBeGreaterThan(0);
    expect(jsonCall.details[0]).toHaveProperty('path');
    expect(jsonCall.details[0]).toHaveProperty('message');
  });

  it('handles unknown errors with 500 in test/dev mode', () => {
    const error = new Error('Something broke');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    // In non-production mode, error message is exposed
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Something broke' });
  });
});

describe('AppError', () => {
  it('extends Error', () => {
    const err = new AppError(400, 'Bad request');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('stores statusCode and message', () => {
    const err = new AppError(422, 'Invalid input');
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe('Invalid input');
    expect(err.name).toBe('AppError');
  });
});
