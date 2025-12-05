import { type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "./requireAuth.js";
import { UserRepository } from "../../db/repositories/userRepository.js";
import { createErrorResponse, ErrorCodes } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

/**
 * Middleware to require admin role
 * Must be used after requireAuth middleware
 * Checks that req.user.id has role = 'admin'
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // First ensure user is authenticated
    if (!req.user || !req.user.id) {
      res.status(401).json(
        createErrorResponse("UNAUTHORIZED", "Authentication required")
      );
      return;
    }

    // Check if user is admin
    const userRepo = new UserRepository();
    const user = await userRepo.findById(req.user.id);

    if (!user) {
      res.status(401).json(
        createErrorResponse("UNAUTHORIZED", "User not found")
      );
      return;
    }

    // Dev mode override: allow if config.enableDevAdmin is true
    const { config } = await import("../../config.js");
    if (config.enableDevAdmin) {
      logger.debug({ userId: req.user.id }, "Dev mode override enabled for admin access");
      next();
      return;
    }

    // Note: We need to add role to the user repository response
    // For now, let's query directly
    const { query } = await import("../../db/client.js");
    const result = await query<{ role: string }>(
      "SELECT role FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0 || result.rows[0].role !== "admin") {
      res.status(403).json(
        createErrorResponse(
          ErrorCodes.FORBIDDEN,
          "Admin access required"
        )
      );
      return;
    }

    next();
  } catch (error: any) {
    res.status(500).json(
      createErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        "Error checking admin status",
        { message: error.message }
      )
    );
  }
}

/**
 * Middleware chain: requireAuth then requireAdmin
 * Use this for admin-only routes
 */
export function requireAuthAndAdmin() {
  return [requireAuth, requireAdmin];
}

