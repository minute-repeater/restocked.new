import type { Request, Response, NextFunction } from "express";
import { getUpgradeRequiredError, ENABLE_TEST_PLANS } from "../utils/planLimits.js";
import type { AuthenticatedRequest } from "./requireAuth.js";
import { logger } from "../utils/logger.js";

/**
 * Middleware to require Pro plan
 * Must be used after requireAuth middleware
 */
export function requirePro(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!ENABLE_TEST_PLANS) {
    // If test plans disabled, allow access
    next();
    return;
  }

  if (!req.user) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
    return;
  }

  if (req.user.plan !== 'pro') {
    logger.info({ userId: req.user.id }, "Free user attempted to access Pro feature");
    res.status(403).json(getUpgradeRequiredError());
    return;
  }

  next();
}

