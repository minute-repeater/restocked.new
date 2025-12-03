import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../utils/jwtUtils.js";
import { createErrorResponse } from "../utils/errors.js";
import { UserRepository } from "../../db/repositories/userRepository.js";

/**
 * Extend Express Request to include user information
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string; // UUID
        plan: 'free' | 'pro';
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    plan: 'free' | 'pro';
  };
}

const userRepo = new UserRepository();

/**
 * Middleware to require authentication via JWT token
 * Reads Authorization: Bearer <token> header
 * Verifies token and loads user data including plan
 * Injects req.user = { id: userId, plan: 'free' | 'pro' }
 * Returns 401 on failure
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json(
        createErrorResponse("UNAUTHORIZED", "Authorization header required")
      );
      return;
    }

    // Check if it's a Bearer token
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      res.status(401).json(
        createErrorResponse(
          "UNAUTHORIZED",
          "Authorization header must be in format: Bearer <token>"
        )
      );
      return;
    }

    const token = parts[1];

    // Verify token
    try {
      const payload = verifyToken(token);
      
      // Load user data including plan
      const user = await userRepo.findById(payload.userId);
      if (!user) {
        res.status(401).json(
          createErrorResponse("UNAUTHORIZED", "User not found")
        );
        return;
      }

      // Inject user data into request
      req.user = {
        id: user.id,
        plan: user.plan,
      };
      next();
    } catch (error: any) {
      res.status(401).json(
        createErrorResponse("UNAUTHORIZED", error.message || "Invalid token")
      );
      return;
    }
  } catch (error: any) {
    res.status(401).json(
      createErrorResponse("UNAUTHORIZED", error.message || "Authentication failed")
    );
  }
}

