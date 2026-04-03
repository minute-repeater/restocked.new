import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

// Mock config before importing auth middleware
vi.mock('../config.js', () => ({
  config: {
    env: 'test',
    port: 3000,
    databaseUrl: 'postgres://test',
    jwtSecret: 'test-secret-that-is-at-least-32-characters-long',
    frontendUrl: 'http://localhost:5173',
  },
}));

// Mock DB (required by requireAdmin middleware)
vi.mock('@covet/db', () => ({
  db: { query: { users: { findFirst: vi.fn() } } },
  users: {},
  eq: vi.fn(),
}));

import { authenticate, generateToken } from '../middleware/auth.js';

describe('generateToken', () => {
  it('generates a valid JWT token', () => {
    const token = generateToken('user-123');
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('embeds userId in the token payload', () => {
    const token = generateToken('user-123');
    const decoded = jwt.verify(token, 'test-secret-that-is-at-least-32-characters-long') as {
      userId: string;
    };
    expect(decoded.userId).toBe('user-123');
  });

  it('generates different tokens for different users', () => {
    const token1 = generateToken('user-1');
    const token2 = generateToken('user-2');
    expect(token1).not.toBe(token2);
  });
});

describe('authenticate middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it('returns 401 when no authorization header is present', () => {
    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Missing or invalid authorization header',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header is not Bearer', () => {
    mockReq.headers = { authorization: 'Basic abc123' };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid token', () => {
    mockReq.headers = { authorization: 'Bearer invalid-token' };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 for expired token', () => {
    const expiredToken = jwt.sign(
      { userId: 'user-123' },
      'test-secret-that-is-at-least-32-characters-long',
      { expiresIn: '-1s' }
    );
    mockReq.headers = { authorization: `Bearer ${expiredToken}` };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('calls next() with valid token and sets userId', () => {
    const validToken = generateToken('user-456');
    mockReq.headers = { authorization: `Bearer ${validToken}` };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect((mockReq as any).userId).toBe('user-456');
  });

  it('rejects token signed with wrong secret', () => {
    const badToken = jwt.sign({ userId: 'user-123' }, 'wrong-secret-key-that-is-long-enough');
    mockReq.headers = { authorization: `Bearer ${badToken}` };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
