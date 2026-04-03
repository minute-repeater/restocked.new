import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, users, eq } from '@covet/db';
import { config } from '../config.js';

export interface AuthenticatedRequest extends Request {
  userId: string;
  isAdmin?: boolean;
}

interface JwtPayload {
  userId: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    (req as AuthenticatedRequest).userId = payload.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Requires the authenticated user to be an admin.
 * Must be chained AFTER authenticate middleware.
 * Checks the DB on each request so admin grants take effect immediately.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { userId } = req as AuthenticatedRequest;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  (req as AuthenticatedRequest).isAdmin = true;
  next();
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });
}
